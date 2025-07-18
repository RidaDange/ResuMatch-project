import json
import boto3

textract = boto3.client('textract')
comprehend = boto3.client('comprehend')

def lambda_handler(event, context):
    print("🔍 EVENT RECEIVED:", json.dumps(event))

    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
                "Access-Control-Allow-Headers": "Content-Type"
            }
        }

    try:
        raw_body = event.get("body")
        if not raw_body:
            raise ValueError("❌ No body received")

        print("📦 Raw body:", raw_body)

        try:
            body = json.loads(raw_body)
        except json.JSONDecodeError as err:
            raise ValueError(f"❌ Invalid JSON body: {err}")

        print("✅ Parsed body:", body)

        bucket = body.get("bucket")
        file_name = body.get("fileName")

        print(f"📁 Bucket: {bucket}")
        print(f"📄 File name: {file_name}")

        if not bucket or not file_name:
            raise ValueError("❌ Missing required fields: 'bucket' or 'file'")

        # TEXTRACT
        print("🧠 Running Textract...")
        if not file_name.lower().endswith(".pdf"):
            raise ValueError("Textract only supports PDF files for detect_document_text")

        response = textract.detect_document_text(
            Document={'S3Object': {'Bucket': bucket, 'Name': file_name}}
        )

        print("✅ Textract response received")

        text_blocks = [item["Text"] for item in response.get("Blocks", []) if item["BlockType"] == "LINE"]
        full_text = " ".join(text_blocks)
        print(f"📝 Extracted Text Sample: {full_text[:200]}...")

        # COMPREHEND
        print("🔍 Running Comprehend for sentiment...")
        tone_result = comprehend.detect_sentiment(Text=full_text, LanguageCode='en')
        print("✅ Comprehend response:", json.dumps(tone_result))

        sentiment = tone_result.get('Sentiment', 'NEUTRAL')

        keywords = ['Python', 'AWS', 'React', 'SQL', 'JavaScript']
        ats_score = sum(word in full_text for word in keywords) / len(keywords) * 100
        print(f"📊 ATS Score: {ats_score}%")

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({
                "ats_score": f"{int(ats_score)}%",
                "sentiment": sentiment,
                "strengths": ["Clear formatting", "Action verbs", "Quantified achievements"],
                "suggestions": ["Add relevant keywords", "Include metrics", "Condense long descriptions"],
                "jobs": ["Frontend Developer at XYZ", "UI/UX Intern at Creatify", "Junior Web Designer at PixelSoft"]
            })
        }

    except Exception as e:
        print("❌ ERROR in analysis Lambda:", str(e))
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "OPTIONS,POST",
                "Access-Control-Allow-Headers": "Content-Type"
            },
            "body": json.dumps({"error": str(e)})
        }