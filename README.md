# VERTEX - Space AI Assistant

VERTEX is a futuristic space-themed AI chatbot and dashboard built as a Class 7 school project.

It is powered by Python, Flask, HTML, CSS, JavaScript, NASA data, local JSON files, and optional Groq AI support.

## Screenshots

Add final screenshots before submission:

- Home and chat screen
- Mission Control screen
- NASA Picture of the Day screen
- Space Quiz screen
- Presentation Mode screen

Suggested screenshot names:

- `screenshots/home-chat.png`
- `screenshots/mission-control.png`
- `screenshots/nasa-apod.png`
- `screenshots/space-quiz.png`
- `screenshots/presentation-mode.png`

## Main Features

- Space chatbot with a beginner-friendly local JSON brain
- Optional Groq AI support for extra questions
- AI status indicator: Local Brain Active, Groq AI Active, or Offline Demo Mode
- NASA Astronomy Picture of the Day with backup image
- Mission Control with ISS tracker and launch dashboard
- Planet Explorer cards
- Space Agency cards
- Voice input using the browser Web Speech API
- Text-to-speech using browser SpeechSynthesis
- Futuristic VERTEX avatar with thinking animation
- Typing animation for VERTEX replies
- Optional sound effects with mute button
- Theme switcher: Deep Space, Blue Neon, and Mars Red
- Space Quiz game with score and restart
- Presentation Mode for teacher demo
- Final Project Summary section

## Tech Stack

- Python
- Flask
- HTML
- CSS
- JavaScript
- JSON
- NASA APOD API
- ISS location API
- Optional Groq API
- Browser Web Speech and SpeechSynthesis APIs

## How To Run Locally

Open a terminal in the project folder:

```bash
cd /home/rounak/vertex-ai-chatbot
python3 -m venv --clear .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Then open:

```text
http://127.0.0.1:5000
```

If port `5000` is busy, run Flask on port `5001`:

```bash
flask --app main run --host 127.0.0.1 --port 5001
```

## Optional Groq AI Setup

VERTEX works without Groq because the local brain runs first.

To enable optional real AI:

1. Copy `.env.example` to `.env`.
2. Add your Groq API key.
3. Keep `.env` private. It is ignored by Git.

Example:

```env
GROQ_API_KEY=your_groq_api_key_here
AI_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
```

How the chatbot chooses answers:

1. First it checks `data/space_knowledge.json`.
2. If a local answer is found, it uses that answer.
3. If no local answer is found and `GROQ_API_KEY` exists, it asks Groq.
4. If no key exists, it shows a friendly fallback answer.

## API Endpoints

| Endpoint | Method | What it does |
| --- | --- | --- |
| `/` | GET | Opens the VERTEX dashboard |
| `/chat` | POST | Sends a user message to the chatbot brain |
| `/api/ai-status` | GET | Shows current AI mode |
| `/api/nasa/apod` | GET | Gets NASA Picture of the Day or backup image |
| `/api/iss` | GET | Gets ISS location or demo fallback |
| `/api/launches` | GET | Gets local rocket launch data |
| `/api/space-news` | GET | Gets local space news |
| `/api/planets` | GET | Gets planet cards |
| `/api/agencies` | GET | Gets space agency cards |

## Demo Explanation

For the school demo:

1. Start on the home section and introduce VERTEX.
2. Show the AI status indicator.
3. Ask VERTEX a space question.
4. Show NASA Picture of the Day.
5. Show Mission Control with ISS and launch cards.
6. Show Planet Explorer and Space Agencies.
7. Play the Space Quiz.
8. Turn on Presentation Mode.
9. Explain the Project Summary section.

Use `DEMO_SCRIPT.md` for a 2-3 minute speaking script.

## 6-Day Roadmap

| Day | Work completed |
| --- | --- |
| Day 1 | Project setup, Flask app, first page |
| Day 2 | Local chatbot brain and JSON knowledge base |
| Day 3 | NASA API, dashboard cards, planets, news, agencies |
| Day 4 | Mission Control, ISS tracker, launches, voice input, speech output |
| Day 5 | Futuristic UI, avatar, typing animation, sounds, themes, quiz, presentation mode |
| Day 6 | Optional Groq AI, AI status, final docs, checklist, demo script, final polish |

## Project Structure

```text
vertex-ai-chatbot/
├── chatbot.py
├── main.py
├── data/
│   ├── agencies.json
│   ├── launches.json
│   ├── planets.json
│   ├── space_facts.json
│   ├── space_knowledge.json
│   └── space_news.json
├── static/
│   ├── images/
│   │   └── apod-backup.svg
│   ├── script.js
│   └── style.css
├── templates/
│   └── index.html
├── DEMO_SCRIPT.md
├── DEPLOYMENT.md
├── FINAL_CHECKLIST.md
├── requirements.txt
└── README.md
```

## Final Testing

Run:

```bash
python3 -m py_compile main.py chatbot.py
node --check static/script.js
git diff --check
python main.py
```

Then test the checklist in `FINAL_CHECKLIST.md`.

## Future Improvements

- Add screenshots to the README.
- Add a simple map for ISS position.
- Add Mars rover photos from NASA.
- Add saved chat history.
- Add more quiz questions.
- Add real space news from a news API.
- Deploy the app online after local testing.

## School Project Note

VERTEX is made for learning and demonstration. The code is intentionally simple, commented, and beginner-friendly so a student can explain how it works.
