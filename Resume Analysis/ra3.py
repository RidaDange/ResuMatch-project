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
        file_name = body.get("fileName")

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
        jobs = recommend_jobs(full_text)
        ats_score = calculate_ats_score(full_text)

        # Sentiment Analysis
        sentiment = "NEUTRAL"
        try:
            comprehend_result = comprehend.detect_sentiment(Text=full_text[:4500], LanguageCode="en")
            sentiment = comprehend_result.get("Sentiment", "NEUTRAL").upper()
        except Exception as e:
            print("⚠️ Sentiment analysis failed:", str(e))

        s3.put_object(
            Bucket=bucket,
            Key=f"resumes-reports/{file_name}.json",
            Body=json.dumps({
                "ats_score": f"{int(ats_score)}%",
                "sentiment": sentiment,
                "strengths": strengths,
                "suggestions": suggestions,
                "jobs": jobs
            }),
            ContentType="application/json"
        )
        return {
            "statusCode": 200,
            "headers": cors_headers(),
            "body": json.dumps({
                "ats_score": f"{int(ats_score)}%",
                "sentiment": sentiment,
                "strengths": strengths,
                "suggestions": suggestions,
                "jobs": jobs
            })
        }

    except Exception as e:
        print("❌ ERROR in Lambda:", str(e))
        traceback.print_exc()
        return {
            "statusCode": 500,
            "headers": cors_headers(),
            "body": json.dumps({"error": str(e)})
        }

def calculate_ats_score(full_text):
    text = full_text.lower()

    role_keywords = [
        'frontend developer', 'backend developer', 'full stack developer', 'cloud engineer',
        'data analyst', 'data scientist', 'project manager', 'ui/ux designer',
        'product manager', 'marketing specialist', 'financial analyst', 'sales manager'
    ]
    matched_roles = [role for role in role_keywords if role in text]
    target_role = matched_roles[0] if matched_roles else None

    skills_map = {
        'frontend developer': ['react', 'javascript', 'html', 'css', 'figma', 'tailwind'],
        'backend developer': ['python', 'node.js', 'django', 'sql', 'api', 'express'],
        'cloud engineer': ['aws', 'docker', 'kubernetes', 'ec2', 'lambda', 'terraform'],
        'data scientist': ['python', 'machine learning', 'pandas', 'scikit-learn', 'tensorflow'],
        'project manager': ['project management', 'scrum', 'agile', 'jira'],
        'ui/ux designer': ['figma', 'adobe xd', 'ui', 'ux', 'wireframe', 'prototype'],
        'marketing specialist': ['seo', 'marketing', 'branding', 'social media'],
        'financial analyst': ['finance', 'excel', 'valuation', 'accounting', 'budgeting'],
        'sales manager': ['sales', 'crm', 'cold calling', 'lead generation']
    }

    certifications_keywords = [
        'aws certified', 'azure certified', 'pmp', 'scrum master', 'google ads', 'cfa', 'oracle certified'
    ]

    score = 0
    max_score = 100

    if target_role:
        expected_skills = skills_map.get(target_role, [])
        found_skills = [kw for kw in expected_skills if kw in text]
        score += (len(found_skills) / len(expected_skills)) * 40
    else:
        score += 10

    certs_found = [cert for cert in certifications_keywords if cert in text]
    score += min(len(certs_found) * 5, 15)

    for section in ['education', 'skills', 'experience']:
        if section in text:
            score += 5

    if re.search(r'\d+(\.\d+)?%', full_text):
        score += 5

    if any(verb in text for verb in ['developed', 'managed', 'led', 'designed']):
        score += 5

    if any(hobby in text for hobby in ['reading', 'traveling', 'music', 'sports']):
        score += 2

    if len(text.split()) < 150 or ('hobby' in text and len(set(text.split())) < 120):
        score -= 10

    score = max(30, min(score, 100))
    return score

def analyze_resume_strengths(text):
    action_verbs = ["developed", "managed", "led", "designed", "created", "built", "improved", "executed", "organized", "coordinated", "implemented", "optimized", "reduced", "delivered", "enhanced"]
    quantified_metrics = re.findall(r'\d+(\.\d+)?%', text)
    strengths = []

    if any(verb in text.lower() for verb in action_verbs):
        strengths.append("Clear use of action verbs.")
    if quantified_metrics:
        strengths.append("Quantified achievements present.")
    if re.search(r"(experience|skills|education)", text, re.IGNORECASE):
        strengths.append("Good structure with relevant sections.")

    return strengths

def generate_suggestions(text):
    suggestions = []
    text = text.lower()

    if not any(kw in text for kw in ['developed', 'managed', 'designed']):
        suggestions.append("Include action verbs to highlight achievements.")

    if not re.search(r'\d+(\.\d+)?%', text):
        suggestions.append("Add quantifiable results (e.g., 20% increase in sales).")

    if not any(kw in text for kw in ['education', 'experience', 'skills']):
        suggestions.append("Ensure your resume includes all major sections.")

    if any(hobby in text for hobby in ['travel', 'music', 'sports']) and not any(
        tech in text for tech in ['python', 'aws', 'sql', 'project']):
        suggestions.append("Add more technical or role-specific skills to support your profile.")

    if not any(cert in text for cert in ['certified', 'aws', 'pmp', 'scrum']):
        suggestions.append("Mention relevant certifications to strengthen credibility.")

    if not suggestions:
        suggestions.append("Resume looks solid! Consider tailoring it to specific job roles for better impact.")

    return suggestions

def recommend_jobs(text):
    text = text.lower()
    jobs = []

    skills = {
        "Frontend Developer": ['react', 'javascript', 'html', 'css', 'tailwind'],
        "Backend Developer": ['python', 'django', 'node.js', 'express', 'api'],
        "Cloud Engineer": ['aws', 'ec2', 's3', 'lambda', 'docker', 'kubernetes'],
        "Data Scientist": ['python', 'machine learning', 'pandas', 'tensorflow'],
        "Project Manager": ['scrum', 'agile', 'project management'],
        "UI/UX Designer": ['figma', 'ui', 'ux', 'wireframe'],
        "Marketing Specialist": ['seo', 'branding', 'marketing'],
        "Financial Analyst": ['finance', 'excel', 'accounting'],
        "Sales Manager": ['sales', 'lead generation', 'crm']
    }

    certifications = {
        "Cloud Engineer": ['aws certified', 'azure certified'],
        "Project Manager": ['pmp', 'scrum master'],
        "Marketing Specialist": ['google ads'],
        "Financial Analyst": ['cfa'],
    }

    for role, keywords in skills.items():
        if any(skill in text for skill in keywords):
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