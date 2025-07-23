import json
import boto3
import time
import traceback
import re

textract = boto3.client('textract')
comprehend = boto3.client('comprehend')
s3 = boto3.client('s3')

def lambda_handler(event, context):
    print("🔍 EVENT RECEIVED:", json.dumps(event))

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors_headers()}

    try:
        raw_body = event.get("body")
        if not raw_body:
            raise ValueError("❌ No body received")

        body = json.loads(raw_body)
        bucket = body.get("bucket")
        base_file_name = body.get("fileName")
        file_name = base_file_name
        jd_text = body.get("jd_text", "").strip().lower()

        if not bucket or not file_name:
            raise ValueError("❌ Missing 'bucket' or 'fileName'")

        print(f"📁 Bucket: {bucket}")
        print(f"📄 File: {file_name}")

        ext = file_name.lower().split('.')[-1]
        full_text = ""

        if ext in ['jpg', 'jpeg', 'png']:
            print("🖼 Using detect_document_text for image")
            response = textract.detect_document_text(
                Document={'S3Object': {'Bucket': bucket, 'Name': file_name}}
            )
            blocks = response.get("Blocks", [])
            full_text = " ".join([b["Text"] for b in blocks if b["BlockType"] == "LINE"])

        elif ext == 'pdf':
            try:
                print("📄 Trying detect_document_text on PDF")
                response = textract.detect_document_text(
                    Document={'S3Object': {'Bucket': bucket, 'Name': file_name}}
                )
                blocks = response.get("Blocks", [])
                full_text = " ".join([b["Text"] for b in blocks if b["BlockType"] == "LINE"])
            except Exception as fallback_error:
                print("⚠️ Fallback to async start_document_text_detection")
                job = textract.start_document_text_detection(
                    DocumentLocation={'S3Object': {'Bucket': bucket, 'Name': file_name}}
                )
                job_id = job["JobId"]
                print(f"🆔 Job ID: {job_id}")

                for _ in range(30):
                    time.sleep(3)
                    result = textract.get_document_text_detection(JobId=job_id)
                    status = result["JobStatus"]
                    print(f"⏳ Status: {status}")
                    if status in ["SUCCEEDED", "FAILED"]:
                        break
                else:
                    raise TimeoutError("Textract async job timed out")

                if result["JobStatus"] != "SUCCEEDED":
                    raise RuntimeError(f"Textract job failed: {result['JobStatus']}")

                blocks = result.get("Blocks", [])
                full_text = " ".join([b["Text"] for b in blocks if b["BlockType"] == "LINE"])
        else:
            raise ValueError("❌ Unsupported file type")

        if not full_text.strip():
            raise ValueError("❌ No text extracted")

        strengths = analyze_resume_strengths(full_text)
        suggestions = generate_suggestions(full_text)
        jobs = recommend_jobs(full_text, jd_text)
        ats_score, score_breakdown = calculate_ats_score(full_text, jd_text)

        sentiment = "NEUTRAL"
        try:
            comprehend_result = comprehend.detect_sentiment(Text=full_text[:4500], LanguageCode="en")
            sentiment = comprehend_result.get("Sentiment", "NEUTRAL").upper()
        except Exception as e:
            print("⚠️ Sentiment analysis failed:", str(e))

        report_data = {
            "ats_score": f"{int(ats_score)}%",
            "sentiment": sentiment,
            "strengths": strengths,
            "suggestions": suggestions,
            "jobs": jobs,
            "score_breakdown": score_breakdown
        }

        s3.put_object(
            Bucket=bucket,
            Key=f"resumes-reports/{base_file_name}.json",
            Body=json.dumps(report_data),
            ContentType="application/json"
        )

        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps(report_data)
        }

    except Exception as e:
        print("❌ ERROR in Lambda:", str(e))
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": str(e)})
        }

def calculate_ats_score(full_text, jd_text=""):
    resume_text = full_text.lower()
    jd_text = jd_text.lower()

    score = 0
    score_breakdown = {}

    resume_words = re.findall(r'\b\w+\b', resume_text)
    jd_words = re.findall(r'\b\w+\b', jd_text)

    resume_set = set(resume_words)
    jd_set = set(jd_words)

    # ==== JD Match (Max 35) ====
    important_keywords = [kw for kw in jd_set if kw in resume_set and len(kw) > 3]
    match_ratio = len(important_keywords) / len(jd_set) if jd_set else 0
    jd_score = min(match_ratio * 100, 35)
    score += jd_score
    score_breakdown["JD Match"] = round(jd_score)

    # ==== Skills Match (Max 25) ====
    hard_skills = ['python', 'sql', 'aws', 'excel', 'html', 'css', 'javascript', 'react', 'node', 'django', 'tensorflow']
    soft_skills = ['leadership', 'communication', 'teamwork', 'problem solving', 'adaptability', 'critical thinking']

    matched_hard = [skill for skill in hard_skills if skill in resume_set]
    matched_soft = [skill for skill in soft_skills if skill in resume_set]

    hard_score = min(len(matched_hard) * 2.5, 18)
    soft_score = min(len(matched_soft) * 1.2, 7)
    skills_score = hard_score + soft_score
    score += skills_score
    score_breakdown["Skills Match"] = round(skills_score)

    # ==== Certifications (Max 12) ====
    certifications = ['certified', 'aws', 'azure', 'pmp', 'scrum', 'google ads', 'cfa', 'ca']
    cert_score = min(len([c for c in certifications if c in resume_set]) * 2.5, 12)
    score += cert_score
    score_breakdown["Certifications"] = round(cert_score)

    # ==== Sections Present (Max 10) ====
    structure_sections = ['education', 'skills', 'experience', 'projects', 'summary', 'certifications']
    section_score = min(len([s for s in structure_sections if s in resume_text]) * 2, 10)
    score += section_score
    score_breakdown["Sections"] = round(section_score)

    # ==== Achievements (Max 10) ====
    quantified = bool(re.search(r'\d+(\.\d+)?[%+$]', resume_text))
    action_verbs = ['developed', 'managed', 'led', 'designed', 'created', 'implemented', 'executed']
    verbs = any(v in resume_text for v in action_verbs)
    achv_score = 5 if quantified else 0
    achv_score += 5 if verbs else 0
    score += achv_score
    score_breakdown["Achievements"] = achv_score

    # ==== Experience (Max 8) ====
    exp_years = re.findall(r'(\d+)\+?\s*(?:years|yrs)', resume_text)
    years = max([int(y) for y in exp_years if int(y) < 40], default=0)
    exp_score = min(years * 1.2, 8)
    score += exp_score
    score_breakdown["Experience"] = round(exp_score)

    # ==== Penalty (-5 max) ====
    penalty = 0
    if len(resume_words) < 150:
        penalty -= 1
    if 'lorem ipsum' in resume_text or 'dummy text' in resume_text:
        penalty -= 2
    score += penalty
    score_breakdown["Penalties"] = penalty

    # ==== Final Score: Forced Normalization between 60–90 ====
    raw_score = score
    
    # Map raw score (0–100) into 60–90 using linear scaling
    normalized_score = 60 + ((min(raw_score, 100) / 100) * 30)
    normalized_score = round(normalized_score)

    score_breakdown["Final"] = normalized_score

    return normalized_score, score_breakdown

def analyze_resume_strengths(text):
    action_verbs = ["developed", "managed", "led", "designed", "created", "built", "improved", "executed", "organized", "coordinated", "implemented", "optimized", "reduced", "delivered", "enhanced"]
    quantified_metrics = re.findall(r'\d+(\.\d+)?%', text)
    strengths = []

    if any(verb in text.lower() for verb in action_verbs):
        strengths.append("Clear use of action verbs.")
    if quantified_metrics:
        strengths.append("Quantified achievements present.")
    if re.search(r"(experience|skills|education|projects)", text, re.IGNORECASE):
        strengths.append("Good structure with relevant sections.")

    return strengths

def generate_suggestions(text):
    suggestions = []
    text = text.lower()

    if not any(kw in text for kw in ['developed', 'managed', 'designed']):
        suggestions.append("Include action verbs to highlight achievements.")

    if not re.search(r'\d+(\.\d+)?%', text):
        suggestions.append("Add quantifiable results (e.g., 20% increase in sales).")

    if not any(kw in text for kw in ['education', 'experience', 'skills', 'projects']):
        suggestions.append("Ensure your resume includes all major sections.")

    if any(hobby in text for hobby in ['travel', 'music', 'sports']) and not any(
        tech in text for tech in ['python', 'aws', 'sql', 'project', 'javascript', 'html', 'css']):
        suggestions.append("Add more technical or role-specific skills to support your profile.")

    if not any(cert in text for cert in ['certified', 'aws', 'pmp', 'scrum', 'google', 'cfa']):
        suggestions.append("Mention relevant certifications to strengthen credibility.")

    if len(text.split()) < 200:
        suggestions.append("Try to expand on your experiences and achievements with more detail.")

    if not suggestions:
        suggestions.append("Resume looks solid! Consider tailoring it to specific job roles for better impact.")

    return suggestions

def recommend_jobs(text, jd_text=""):
    text = text.lower()
    jd_text = jd_text.lower()
    jobs = []

    skills = {
        "Frontend Developer": ['react', 'javascript', 'html', 'css', 'tailwind'],
        "Backend Developer": ['python', 'django', 'node.js', 'express', 'api'],
        "Cloud Engineer": ['aws', 'ec2', 's3', 'lambda', 'docker', 'kubernetes'],
        "Data Scientist": ['python', 'machine learning', 'pandas', 'tensorflow', 'scikit-learn'],
        "Project Manager": ['scrum', 'agile', 'project management'],
        "UI/UX Designer": ['figma', 'ui', 'ux', 'wireframe', 'prototype'],
        "Marketing Specialist": ['seo', 'branding', 'marketing', 'google ads'],
        "Financial Analyst": ['finance', 'excel', 'accounting', 'valuation'],
        "Sales Manager": ['sales', 'lead generation', 'crm', 'pipeline']
    }

    certifications = {
        "Cloud Engineer": ['aws certified', 'azure certified'],
        "Project Manager": ['pmp', 'scrum master'],
        "Marketing Specialist": ['google ads', 'digital marketing'],
        "Financial Analyst": ['cfa', 'ca']
    }

    for role, keywords in skills.items():
        if any(skill in text for skill in keywords) or any(skill in jd_text for skill in keywords):
            jobs.append(role)

    for role, certs in certifications.items():
        if any(cert in text for cert in certs) and role not in jobs:
            jobs.append(role)

    if not jobs:
        jobs.append("Software Engineer")

    return jobs

def cors_headers():
    return {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
        "Access-Control-Allow-Headers": "Content-Type"
    }