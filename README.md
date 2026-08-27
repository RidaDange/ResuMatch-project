# ResuMatch

## 📄 Resume Analysis and ATS Matching Application

ResuMatch is a cloud-based resume screening application designed to help job seekers analyze their resumes and understand how well they align with job requirements. The application uses AWS serverless services and AI-powered text analysis to process uploaded resumes and generate ATS-related insights.


## 🚀 Features

- User authentication and management
- Resume upload and secure storage
- Resume history
- Resume preview and download
- Resume deletion
- ATS-based resume analysis
- Resume keyword and content analysis
- Job Description (JD) matching
- Resume analysis and improvement insights
- Serverless backend architecture
- Cloud-based frontend hosting and CDN delivery

---

## 🏗️ Architecture

![ResuMatch Architecture Diagram](./ResuMatch%20architecture.jpg.jpeg)

---

## 🛠️ Technology Stack

### Frontend

- HTML5
- CSS3
- JavaScript

### AWS Services

- **Amazon S3** – Frontend hosting and resume storage
- **Amazon CloudFront** – Content Delivery Network (CDN)
- **AWS Cognito** – User authentication and management
- **Amazon API Gateway** – API request routing
- **AWS Lambda** – Serverless backend processing
- **Amazon DynamoDB** – User data storage
- **Amazon Textract** – Resume text extraction
- **Amazon Comprehend** – Resume text and keyword analysis
- **AWS IAM** – Roles and permissions management
- **Amazon CloudWatch** – Logging and backend debugging

### SDK

- Python
- Boto3

---

## 📂 Project Workflow

1. The user accesses the ResuMatch application through Amazon CloudFront.
2. CloudFront delivers the frontend hosted in Amazon S3.
3. Users can sign up and authenticate through AWS Cognito.
4. The user uploads a resume from the frontend.
5. API Gateway sends the request to AWS Lambda.
6. Lambda generates a presigned URL for secure resume upload.
7. The resume is uploaded to Amazon S3.
8. The resume analysis process is triggered.
9. Amazon Textract extracts text from the resume.
10. Amazon Comprehend analyzes the extracted content.
11. The application processes the analysis and generates ATS-related results.
12. The user can view resume history, preview, download, or delete uploaded resumes.

---

## 🔐 Security

ResuMatch uses AWS security services and mechanisms to protect application resources:

- AWS Cognito for user authentication
- IAM roles and policies for controlled AWS access
- S3 presigned URLs for secure file uploads
- API Gateway for controlled backend API access
- CloudFront for secure and efficient frontend delivery

---

## ☁️ AWS Lambda Functions

The application uses multiple Lambda functions for backend operations.

### Store User Function

Handles storing and managing user-related information.

### Resume Analysis Function

Processes uploaded resumes and performs resume analysis using AWS services.

### Resume Report Function

Handles the generation and retrieval of resume analysis reports.

### Get User Resumes From S3 Function

Fetches uploaded resumes from Amazon S3 and displays them in the user's resume history.

### Delete Resume Functionality

Removes uploaded resumes and associated analysis reports from S3.

---

## 📋 Supported Resume Formats

- PDF
- DOC
- DOCX
- JPG
- JPEG
- PNG

---

## 🎯 Project Goal

The goal of ResuMatch is to help job seekers better understand how their resumes align with job requirements and improve their resumes for Applicant Tracking Systems (ATS).

---

## 🔮 Future Enhancements

- Improved ATS scoring algorithms
- More detailed job description matching
- Resume improvement recommendations
- Support for additional resume formats
- Advanced user dashboards
- Role-based job recommendations
- Enhanced resume analytics
- Improved authentication and authorization controls

---

## 👨‍💻 Live demo

[ResuMatch](https://d1xf95v64u2r03.cloudfront.net/)
