# VERTEX AI OS

VERTEX AI OS is a premium AI and technology operating system built with Python, Flask, HTML, CSS, JavaScript, local JSON knowledge, browser voice APIs, and optional Groq AI support.

Tagline: **The Intelligence Operating System**

## Scope

VERTEX only answers technology questions:

- Artificial intelligence and generative AI
- Large language models
- Programming and software engineering
- Cloud computing, DevOps, Linux, Docker, Kubernetes
- Cybersecurity and safe security learning
- Machine learning, data science, robotics, computer vision
- APIs, web development, mobile development, hardware
- Startups, productivity tools, open source, and emerging technologies

Out-of-scope questions are politely redirected to AI and technology topics.

## Features

- Premium dark AI OS dashboard
- VERTEX Chat with markdown, code blocks, tables, streaming-style typing, and optional Groq
- Voice assistant with microphone permission handling, completed-answer speech, and waveform state
- AI News signal feed
- AI Models index covering GPT, Claude, Gemini, Grok, Llama, DeepSeek, Qwen, Mistral, Phi, and Command R
- AI Companies directory
- AI Tools directory
- AI Trends radar
- AI Landscape ecosystem map
- AI Academy quiz with categories, filters, scoring, leaderboard, review, and certificate
- AI Engineer creator profile for Rounak Singh

## Run Locally

```bash
cd /home/rounak/vertex-ai-chatbot
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Open:

```text
http://127.0.0.1:5000
```

If `python` is not available globally, use:

```bash
.venv/bin/python main.py
```

## Optional Groq Setup

Copy `.env.example` to `.env` and add:

```env
GROQ_API_KEY=your_groq_api_key_here
AI_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
```

VERTEX checks the local technology knowledge base first. Groq is used only when local knowledge does not answer the technology question and a usable API key is configured.

## Important Routes

| Route | Purpose |
| --- | --- |
| `/` | VERTEX AI OS dashboard |
| `/chat` | Chat API |
| `/api/ai-status` | Runtime AI status |
| `/api/ai-test` | AI diagnostics JSON |
| `/admin/ai-test` | AI diagnostics page |
| `/api/space-news` | Compatibility route returning AI news |
| `/api/planets` | Compatibility route returning AI models |
| `/api/agencies` | AI companies |
| `/api/launches` | AI trends |
| `/api/quiz-database` | AI Academy database |
| `/api/quiz-generate` | Optional Groq quiz generation |
| `/about` | Creator profile |
| `/sky-explorer` | Compatibility route for AI Landscape |

## Verify

```bash
python3 -m py_compile main.py chatbot.py
node --check static/script.js
git diff --check
```

In this environment, `.venv/bin/python -m py_compile main.py chatbot.py` also works.

## Deploy on Vercel

VERTEX exports `app` from `main.py`, which is a supported Flask entrypoint on Vercel. The included `vercel.json` configures that Flask app as a Vercel Function.

Set these environment variables in Vercel Project Settings:

```env
GROQ_API_KEY=your_real_groq_key
AI_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
FLASK_ENV=production
```

Then deploy from GitHub or with:

```bash
vercel deploy
```
