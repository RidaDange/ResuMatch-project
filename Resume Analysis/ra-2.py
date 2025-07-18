import json
import boto3
import pdfplumber
import spacy
from sentence_transformers import SentenceTransformer, util
import tempfile

s3 = boto3.client("s3")
nlp = spacy.load("en_core_web_sm")
model = SentenceTransformer("all-MiniLM-L6-v2")  # Efficient and light

def analyze_text(text):
    doc = nlp(text)

    # Tone and language quality
    avg_sentence_length = sum(len(sent.text.split()) for sent in doc.sents) / len(list(doc.sents))
    num_passive = sum(1 for token in doc if token.dep_ == "auxpass")
    tone = "Professional" if num_passive < 5 else "Passive"

    # Keyword/skills extraction
    skills = set()
    for chunk in doc.noun_chunks:
        if chunk.root.pos_ in ["NOUN", "PROPN"] and len(chunk.text) > 2:
            skills.add(chunk.text.lower())

    # Dummy strengths (could be enhanced)
    strengths = []
    if "python" in skills: strengths.append("Proficient in Python")
    if "project" in text.lower(): strengths.append("Project experience")
    if avg_sentence_length < 20: strengths.append("Concise writing")

    # Suggestions
    suggestions = []
    if avg_sentence_length > 30:
        suggestions.append("Shorten sentences for better readability.")
    if num_passive > 5:
        suggestions.append("Reduce passive voice usage.")

    return {
        "ats_score": round(min(len(skills), 20) * 5, 1),  # crude scoring
        "tone": tone,
        "strengths": strengths,
        "suggestions": suggestions,
        "job_recommendations": ["Software Engineer", "Frontend Developer", "Python Developer"]  # Placeholder
    }

def lambda_handler(event, context):
    print("🚀 Event:", json.dumps(event))
    try:
        body = json.loads(event['body'])
        bucket = body.get("bucket")
        key = body.get("key")

        if not bucket or not key:
            raise ValueError("Missing 'bucket' or 'key' in request body")

        with tempfile.NamedTemporaryFile() as tmp:
            s3.download_file(bucket, key, tmp.name)
            with pdfplumber.open(tmp.name) as pdf:
                all_text = "\n".join(page.extract_text() or "" for page in pdf.pages)

        print("✅ Extracted text length:", len(all_text))

        analysis = analyze_text(all_text)

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST,OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps(analysis)
        }

    except Exception as e:
        print("❌ Error:", str(e))
        import traceback
        print(traceback.format_exc())
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }