# VERTEX - Space AI Assistant

VERTEX is a futuristic space-themed AI chatbot and dashboard built as a Class 7 school project.

It is powered by Python, Flask, HTML, CSS, JavaScript, NASA data, local JSON files, and optional Groq AI support.

## Screenshots

Add final screenshots before submission:

- Home and chat screen
- Mission Control screen
- NASA Picture of the Day screen
- Space Quiz screen
- Mission Commander profile screen
- Presentation Mode screen

Suggested screenshot names:

- `screenshots/home-chat.png`
- `screenshots/mission-control.png`
- `screenshots/nasa-apod.png`
- `screenshots/space-quiz.png`
- `screenshots/mission-commander.png`
- `screenshots/presentation-mode.png`

## Main Features

- Space chatbot with a beginner-friendly local JSON brain
- Optional Groq AI support for extra questions when a real API key is available
- AI status indicator and `/admin/ai-test` diagnostics page
- NASA Astronomy Picture of the Day with backup image
- Mission Control with ISS tracker and launch dashboard
- Planet Explorer cards
- Space Agency cards
- Voice input using the browser Web Speech API
- Text-to-speech using browser SpeechSynthesis
- Better voice selection with a Stop Speaking button
- Futuristic VERTEX avatar with thinking animation
- Typing animation for VERTEX replies
- Markdown-style chat replies with links, lists, code blocks, tables, and images
- Optional sound effects with mute button
- Theme switcher: Deep Space, Blue Neon, and Mars Red
- Space Quiz Academy with categories, modes, timers, badges, leaderboard, review, and certificate
- Futuristic Mission Commander profile for the creator of VERTEX
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
3. If no local answer is found, `AI_PROVIDER=groq`, and a real `GROQ_API_KEY` exists, it asks Groq.
4. If Groq is missing, rejected, rate limited, timed out, or unreachable, it shows: `I'm currently offline, but here's what I know.`

Never commit a real Groq key. Add it locally in `.env` or in the Render environment variable dashboard.

## AI Flow

```text
User question
  |
  v
Local JSON brain in data/space_knowledge.json
  |
  |-- answer found --> return local answer
  |
  v
No local answer
  |
  |-- AI_PROVIDER=groq and GROQ_API_KEY exists --> ask Groq AI
  |
  v
No key, timeout, rate limit, bad model, or internet issue
  |
  v
Friendly offline fallback
```

The Groq prompt tells VERTEX to behave like a NASA assistant, ISRO assistant, space teacher, and friendly AI. Answers should stay space-related, be safe, be easy for Class 7, and avoid guessing.

The local knowledge base contains 100+ beginner-friendly topics, including planets, stars, galaxies, nebulae, constellations, exoplanets, black holes, dark matter, dark energy, asteroids, comets, meteors, meteorites, the ISS, rockets, Apollo, Artemis, Voyager, Hubble, James Webb, Chandrayaan, Mangalyaan, Gaganyaan, Aditya-L1, PSLV, GSLV, Falcon 9, Starship, Blue Origin, ESA, JAXA, Roscosmos, SpaceX, NASA, and ISRO.

## AI Health Checks

Open:

```text
/api/ai-status
```

Online example:

```json
{
  "provider": "groq",
  "connected": true,
  "api_key_loaded": true,
  "mode": "online"
}
```

Offline example:

```json
{
  "provider": "local",
  "connected": false,
  "api_key_loaded": false,
  "mode": "offline"
}
```

For a browser diagnostics page, open:

```text
/admin/ai-test
```

It shows API key loaded, Groq connected, AI provider, last AI response, response time, and local knowledge count. The app logs useful diagnostics such as provider, model, key status, response time, and friendly error reason, but it never logs the API key value.

## API Endpoints

| Endpoint | Method | What it does |
| --- | --- | --- |
| `/` | GET | Opens the VERTEX dashboard |
| `/admin/ai-test` | GET | Opens the AI diagnostics page |
| `/chat` | POST | Sends a user message to the chatbot brain |
| `/api/ai-status` | GET | Shows current AI mode |
| `/api/ai-test` | GET | Shows detailed AI diagnostics |
| `/api/nasa/apod` | GET | Gets NASA Picture of the Day or backup image |
| `/api/iss` | GET | Gets ISS location or demo fallback |
| `/api/launches` | GET | Gets local rocket launch data |
| `/api/space-news` | GET | Gets local space news |
| `/api/planets` | GET | Gets planet cards |
| `/api/agencies` | GET | Gets space agency cards |
| `/api/quiz-database` | GET | Loads the local Space Quiz Academy database |
| `/api/quiz-generate` | POST | Generates quiz questions with Groq or falls back to local questions |
| `/mission-commander` | GET | Opens the futuristic Mission Commander profile |

## Architecture

```text
Browser UI
  |
  | fetch()
  v
Flask app in main.py
  |
  |-- /chat -----------------> chatbot.py
  |                              |
  |                              |-- local JSON brain first
  |                              |-- optional Groq AI second
  |                              |-- friendly offline fallback
  |
  |-- /api/ai-status -------> chatbot.py diagnostics
  |-- /admin/ai-test -------> admin diagnostics page
  |-- /api/nasa/apod -------> NASA API or local backup image
  |-- /api/iss -------------> ISS API or demo fallback data
  |-- /api/launches --------> data/launches.json
  |-- /api/space-news ------> data/space_news.json
  |-- /api/planets ---------> data/planets.json
  |-- /api/agencies --------> data/agencies.json
  |-- /api/quiz-database ---> data/quiz_database.json
  |-- /api/quiz-generate ---> optional Groq or local quiz fallback
```

## Space Quiz Academy

The old five-question quiz is now a full educational quiz platform. It loads local questions first from:

```text
data/quiz_database.json
```

The database contains 15 categories and 300 questions. Categories include Solar System, Stars, Galaxies, Space Missions, Rockets, Astronauts, Space Agencies, Moon, Mars, Satellites, Black Holes, Exoplanets, Earth, Sun, and General Space Knowledge.

Question types:

- Multiple Choice
- True / False
- Image Quiz
- Guess the Planet
- Guess the Space Agency
- Fill in the Blank
- Match the Following
- Rapid Fire
- Timed Quiz
- Random Quiz

Quiz modes:

- Practice Mode: no required timer.
- Challenge Mode: 30-second timer by default.
- Exam Mode: 20 questions.
- Adventure Mode: unlocks categories one by one as quizzes are completed.
- Daily Quiz: 5 random questions.

Scoring:

- Easy: 10 points
- Medium: 20 points
- Hard: 30 points
- Expert: 50 points
- Speed bonus: extra points when enough time remains
- Perfect streak bonus: extra points for every third correct answer in a row
- Daily bonus: extra points in Daily Quiz mode

The quiz stores progress in browser `localStorage`, so it works without a database account. It tracks questions answered, correct percentage, incorrect percentage, favorite category, completed categories, unlocked badges, top 10 leaderboard scores, player name, highest score, and total quizzes completed.

Achievements include Space Cadet, Mission Specialist, Planet Explorer, Galaxy Explorer, Junior Astronaut, Space Scientist, Quiz Champion, and Space Master.

Review Mode shows every question, the student's answer, the correct answer, explanation, and fun fact. If the final score is 80% or higher, VERTEX creates a printable Space Explorer Certificate with the player name, score, date, category, and VERTEX logo.

AI question generation is optional. The buttons for Generate New Quiz, Generate 10 Questions, Generate Hard Quiz, Generate NASA Quiz, Generate Mars Quiz, and Generate Astronomy Quiz call `/api/quiz-generate`. If Groq is connected, VERTEX asks Groq for new questions. If Groq is missing or unavailable, the route returns local questions from `quiz_database.json`.

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

## Render Deployment

This repository is prepared for Render with:

- `render.yaml`
- `Procfile`
- `runtime.txt`
- `gunicorn` in `requirements.txt`

Render setup:

1. Connect the GitHub repository to Render.
2. Create a Python Web Service.
3. Use build command:

```bash
pip install -r requirements.txt
```

4. Use start command:

```bash
gunicorn main:app
```

5. Add environment variables in Render:

```env
GROQ_API_KEY=your_real_groq_key
AI_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
FLASK_ENV=production
```

6. Deploy and open the Render URL.
7. Test `/api/ai-status`, `/admin/ai-test`, and ask a question like "What are exoplanets?"

The public Render URL will be available after the service is created in the Render dashboard.

The repository deployment files are:

- `render.yaml`: Python web service, `pip install -r requirements.txt`, `gunicorn main:app`, `AI_PROVIDER=groq`, `GROQ_MODEL=llama-3.1-8b-instant`, `FLASK_ENV=production`, and secret `GROQ_API_KEY`.
- `Procfile`: `web: gunicorn main:app`
- `runtime.txt`: Python 3.11.9
- `requirements.txt`: includes Flask, gunicorn, groq, python-dotenv, and requests.

The Mission Commander profile uses:

- `templates/about.html`
- `static/about.css`
- `static/about.js`
- `static/images/about/rounak-astronaut.png`

## Troubleshooting Groq

If `/api/ai-status` says `api_key_loaded: false`:

- Add `GROQ_API_KEY` in Render Dashboard -> Service -> Environment.
- Make sure the value is the real key, not `your_groq_api_key_here`.
- Redeploy or restart the Render service after saving the variable.

If Groq returns 401:

- The key is missing, copied incorrectly, revoked, or belongs to the wrong account.

If Groq returns 403:

- The account or key does not have permission for the requested model.

If Groq returns 429:

- The Groq account is rate limited. Wait and try again.

If Groq times out or shows a network error:

- The app could not reach Groq from the server at that moment. The local knowledge base still works.

If the model is invalid:

- Set `GROQ_MODEL=llama-3.1-8b-instant` in Render and redeploy.

If Render still behaves like no key exists:

- Check the variable name exactly: `GROQ_API_KEY`.
- Check that it is added to the correct Render service.
- Open `/admin/ai-test` and inspect API key loaded, Groq connected, response time, and last error.
- Read Render logs. VERTEX logs key status as `missing`, `placeholder`, or `loaded`, but never prints the key.

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
│   ├── quiz_database.json
│   ├── space_facts.json
│   ├── space_knowledge.json
│   └── space_news.json
├── static/
│   ├── about.css
│   ├── about.js
│   ├── images/
│   │   └── apod-backup.svg
│   │   └── about/
│   │       └── rounak-astronaut.png
│   ├── script.js
│   └── style.css
├── templates/
│   ├── ai_test.html
│   ├── about.html
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
- Deploy the app online on Render.
- Add automated browser tests with Playwright.

## School Project Note

VERTEX is made for learning and demonstration. The code is intentionally simple, commented, and beginner-friendly so a student can explain how it works.
