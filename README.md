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

### 🎙️ **Voice-First Interface**
- Callers can speak naturally using the Web Speech API, while the system transcribes the conversation in real time and maintains a full transcript.

### 🧠 **Multi-Agent AI Pipeline (LangGraph + LLaMA 3.3 70B)**
Six specialized AI agents work together to analyze the call:

- **📝 Extraction Agent** – Captures key details (location, injuries, hazards, people count)
- **🚦 Triage Agent** – Assigns priority levels (P1–P4)
- **❓ Next-Question Agent** – Suggests clarifying follow-ups
- **🚓 Dispatch Planner** – Recommends EMS, Fire, or Police
- **🗺️ Resource Locator** – Finds nearest available units with ETAs
- **🛡️ Safety Guardrail** – Ensures ethical recommendations

### 🖥️ **Interactive Dashboard**
A clean three-column interface shows:

- Live chat transcript 💬
- AI-generated emergency summary 📝
- Dispatch recommendations with approve/cancel controls ✅❌

### 🗺️ **Resource Mapping**
An interactive Leaflet map displays nearby hospitals, fire stations, police, and pharmacies with distances and travel times.

---

## 🛠️ Tech Stack

### **Backend (AI & Data Processing)**
- **Python 3.13+** - Core programming language
- **FastAPI** - Modern, high-performance web framework
- **LangGraph** - Multi-agent AI workflow orchestration
- **Groq + LLaMA 3.3 70B** - High-performance LLM inference
- **Fish Audio API** - Text-to-speech synthesis
- **Server-Sent Events (SSE)** - Real-time streaming updates
- **Uvicorn** - ASGI server for production deployment

### **Frontend (Visualization & UI)**
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React features
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first styling with custom emergency theme
- **shadcn/ui** - High-quality component library
- **Leaflet + OpenStreetMap** - Interactive mapping
- **Web Speech API** - Real-time speech recognition and transcription

---

## 🎮 Quick Start

### Prerequisites
- **Python 3.13+**
- **Node.js 18+**
- **npm/yarn**
- **Groq API Key** (for LLaMA 3.3 70B - get free at [console.groq.com](https://console.groq.com))
- **Fish Audio API Key** (for text-to-speech - optional)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/firstwave.git
cd firstwave
```

### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys:
# - GROQ_API_KEY=your-groq-api-key-here
# - FISH_AUDIO_API_KEY=your-fish-audio-api-key-here (optional)
# - FISH_AUDIO_VOICE_ID=optional_voice_id (optional)

# Start the backend server
python main.py
```
Backend will be running at `http://localhost:8000`

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
Frontend will be running at `http://localhost:3000`

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
