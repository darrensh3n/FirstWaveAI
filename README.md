# FirstWaveAI - Emergency Dispatch Assistant

---

## 🎥 Demo

<!-- Add demo link here -->
[Demo Video](https://youtu.be/tViIWf1pbC8)

## 🏆 Devpost

<!-- Add devpost link here -->
[View on Devpost](https://devpost.com/software/firstwaveai?ref_content=my-projects-tab&ref_feature=my_projects)

---

## 💡 Inspiration

📞 Over 240 million emergency calls are made in the United States each year (National Emergency Number Association), putting extreme pressure on dispatchers in life-or-death situations. In those critical first moments, key details can be missed, delayed, or misunderstood when callers are panicking.

FirstWaveAI was built to rethink the emergency intake process. I created an AI-powered call assistant that speaks directly with callers, asks clarifying questions, and structures critical information in real time. The system then visualizes the situation on a live map, identifies nearby resources, and generates an AI-assisted dispatch recommendation, all while keeping a human dispatcher in full control with an approval override. 🚑

---

## 🚨 What it does

FirstWaveAI is a real-time emergency dispatch assistant that combines speech recognition, multi-agent AI, and interactive visualization to help dispatchers work faster and more accurately.

---

## 🚀 Key Features

### 🎙️ Voice-First Interface
Callers speak naturally using the Web Speech API, while the system transcribes the conversation in real time and keeps a full transcript.

### 🧠 Multi-Agent AI Pipeline
Six specialized agents, orchestrated with LangGraph, work together to analyze the call:

- **Extraction Agent** – Captures key details (location, injuries, hazards, people count)
- **Triage Agent** – Assigns priority levels (P1–P4)
- **Next-Question Agent** – Suggests clarifying follow-ups
- **Dispatch Planner** – Recommends EMS, Fire, or Police
- **Resource Locator** – Finds nearest available units with ETAs
- **Safety Guardrail** – Ensures ethical recommendations

### 🖥️ Interactive Dashboard
A three-column interface shows:

- Live chat transcript
- AI-generated emergency summary
- Dispatch recommendations with approve/cancel controls

### 🗺️ Resource Mapping
An interactive Leaflet map displays nearby hospitals, fire stations, police, and pharmacies with distances and travel times.

---

## 🛠️ Tech Stack

### Backend
- **Python 3.12** with **FastAPI** and **Uvicorn**
- **LangGraph** – Multi-agent workflow orchestration
- **Groq** (`openai/gpt-oss-120b`) – LLM inference
- **Fish Audio API** – Text-to-speech
- **Server-Sent Events (SSE)** – Real-time streaming updates
- **boto3** – Reads API keys from AWS SSM Parameter Store

### Frontend
- **Next.js 16** (App Router) with **React 19** and **TypeScript**
- **Tailwind CSS 4** and **shadcn/ui**
- **Leaflet + OpenStreetMap** – Interactive mapping
- **Web Speech API** – Speech recognition and transcription

### Infrastructure
- **Docker / Docker Compose** – Runs the backend, frontend, and LocalStack together
- **LocalStack** – Local AWS emulation (S3, DynamoDB, IAM, Lambda, SSM, EC2, CloudWatch Logs)
- **Terraform** – Infrastructure as code, split into `compute`, `iam`, `networking`, and `storage` modules, with remote state in S3
- **GitHub Actions** – Terraform format, validate, and plan checks against LocalStack on every PR

---

## 🎮 Quick Start

### Prerequisites
- **Docker** with Docker Compose
- **Terraform** 1.x
- **LocalStack auth token** – free account at [app.localstack.cloud](https://app.localstack.cloud)
- **Groq API key** – free at [console.groq.com](https://console.groq.com)
- **Fish Audio API key** – optional, for text-to-speech

### 1. Clone the repository
```bash
git clone https://github.com/darrensh3n/FirstWaveAI.git
cd FirstWaveAI
```

### 2. Configure environment files
```bash
# Root .env: LocalStack auth token (gitignored)
echo "LOCALSTACK_AUTH_TOKEN=your-localstack-token" > .env

# backend/.env is loaded by Docker Compose and must exist
cp backend/.env.example backend/.env

# API keys, which Terraform writes into SSM Parameter Store
cp infra/terraform.tfvars.example infra/terraform.tfvars
# Edit infra/terraform.tfvars and set groq_api_key (Fish Audio values are optional)
```

### 3. Start LocalStack
```bash
docker compose up -d localstack
```

### 4. Provision infrastructure
```bash
# One-time: create the S3 bucket that holds Terraform state
cd infra-bootstrap
terraform init
terraform apply

# Create the app's resources, including the SSM parameters the backend reads
cd ../infra
terraform init
terraform apply
cd ..
```

### 5. Start the app
```bash
docker compose up -d --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8000 |
| LocalStack | http://localhost:4566 |

View logs with `docker compose logs -f` and stop everything with `docker compose down`.

---

## 🔬 Use Cases

This platform serves multiple emergency response applications:

- **Emergency Call Triage**: Real-time analysis and prioritization of emergency calls
- **Dispatcher Assistance**: AI-powered support for human dispatchers
- **Resource Optimization**: Intelligent matching of emergencies with nearby resources
- **Response Time Improvement**: Faster information extraction and dispatch recommendations


---

## 📄 License

This project is licensed under the MIT License.
