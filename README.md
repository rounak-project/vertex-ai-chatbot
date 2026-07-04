# VERTEX AI Chatbot

VERTEX is a beginner-friendly, space-themed chatbot demo built with Python and Flask.

It can answer simple questions about:

- Sun
- Moon
- Earth
- Mars
- Jupiter
- ISRO
- NASA
- SpaceX
- Black holes
- International Space Station (ISS)
- Space quiz questions

This is a school demo project, not a production app.

## Install

Open a terminal in the project folder:

```bash
cd vertex-ai-chatbot
python3 -m venv --clear .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

Then open:

```text
http://127.0.0.1:5000
```

## How It Works

- `main.py` runs the Flask web app.
- `chatbot.py` loads the JSON knowledge base and searches for answers.
- `templates/index.html` shows the chatbot page.
- `static/style.css` makes the space-themed design.
- `static/script.js` sends messages to Flask.
- `data/space_knowledge.json` stores the chatbot answers.
- `/chat` is a POST API route. It receives a message and returns a JSON response.
- `/api/nasa/apod` loads NASA's Astronomy Picture of the Day and uses a local backup if NASA is unavailable.
- `/api/space-news`, `/api/planets`, and `/api/agencies` load local demo dashboard data.
- `/api/iss` loads the current ISS location or local demo fallback data.
- `/api/launches` loads local demo rocket launch data.

## Day 2 Completed Features

- Added the VERTEX chatbot brain in `chatbot.py`.
- Added a JSON knowledge base with beginner-friendly space facts.
- Added answers about the Sun, Moon, Earth, Mars, Jupiter, NASA, ISRO, SpaceX, black holes, and the ISS.
- Added a `/chat` API endpoint that returns chatbot responses.
- Added a welcome message, sample question buttons, and a thinking message.
- Added simple in-memory chat history for the last 20 messages.

## Day 3 Completed Features

- Added NASA Astronomy Picture of the Day integration.
- Added a one-hour NASA APOD cache so the app does not call NASA too often.
- Added a local backup image for offline or API-error situations.
- Added local demo space news cards.
- Added planet explorer cards for all eight planets.
- Added a space agency dashboard for NASA, ISRO, SpaceX, ESA, and JAXA.
- Added a futuristic dashboard layout with sidebar navigation.
- Added loading messages for NASA data, news, planets, and agencies.
- Added friendly error handling so the app still works without internet.

## Day 4 Completed Features

- Added Mission Control with an ISS tracker card and rocket launch dashboard.
- Added `GET /api/iss` with live ISS data and demo fallback data.
- Added `GET /api/launches` using `data/launches.json`.
- Added planet search so cards filter while typing.
- Added a microphone button for browser voice input.
- Added speaker buttons for VERTEX replies using browser text-to-speech.
- Added more chatbot answers for ISS location, launches, Chandrayaan, Artemis, Gaganyaan, satellites, and space stations.
- Added Mission Control refresh button and last-updated text.

## Day 5 Completed Features

- Added a glowing VERTEX AI avatar in the chat area.
- Added a typing animation for VERTEX replies.
- Added optional sound effects for message sent, VERTEX reply, and button clicks.
- Added a mute/unmute button that saves the sound choice in `localStorage`.
- Added a theme switcher with Deep Space, Blue Neon, and Mars Red themes.
- Added a Space Quiz game with 5 multiple-choice questions, score, answers, and restart.
- Expanded the About Vertex section with project details, technologies, roadmap, and school note.
- Added Presentation Mode for a cleaner teacher demo screen.
- Improved mobile, tablet, and small laptop layout rules.

## Mission Control

Mission Control is a dashboard section inside the main page.

- The ISS card asks Flask for `/api/iss`.
- Flask tries a simple public ISS API first.
- If the live API fails, Flask returns friendly demo fallback data.
- The rocket launch list asks Flask for `/api/launches`.
- Launch data is local, so it works even without internet.

## Voice And Speech Notes

- Voice input uses the browser Web Speech API.
- Text-to-speech uses the browser SpeechSynthesis API.
- These features depend on the browser, so they may not work everywhere.
- If voice input is not supported, VERTEX shows a friendly message and typing still works.

## Theme Switcher

The theme switcher is in the sidebar.

- Deep Space is the default theme.
- Blue Neon gives the dashboard a brighter AI assistant look.
- Mars Red gives the dashboard a red planet style.
- The selected theme is saved in the browser with `localStorage`, so it stays selected after refresh.
- The colors are controlled with CSS variables in `static/style.css`.

## Space Quiz

The Space Quiz section has 5 beginner-friendly space questions.

- Each question has multiple-choice buttons.
- VERTEX shows the correct answer after each question.
- The score updates as the student plays.
- The Restart Quiz button starts the quiz again from question 1.

## Presentation Mode

Presentation Mode is useful when showing the project to a teacher.

- It shows a large title: `VERTEX – Space AI Assistant`.
- It hides extra controls and some dashboard sections.
- It keeps the main demo sections clean and easy to explain.
- The Exit Presentation Mode button returns to the normal dashboard.

## API Endpoints

| Endpoint | What it does |
| --- | --- |
| `POST /chat` | Sends a message to the VERTEX chatbot brain. |
| `GET /api/nasa/apod` | Gets NASA's Astronomy Picture of the Day or a local backup. |
| `GET /api/space-news` | Gets local demo space news. |
| `GET /api/planets` | Gets local planet card data. |
| `GET /api/agencies` | Gets local space agency card data. |
| `GET /api/iss` | Gets live ISS position or demo fallback data. |
| `GET /api/launches` | Gets local demo rocket launch data. |

## Architecture Diagram

```text
Browser
  |
  | fetch()
  v
Flask app in main.py
  |
  |-- /chat -----------------> chatbot.py
  |                              |
  |                              v
  |                         data/space_knowledge.json
  |
  |-- /api/nasa/apod -------> NASA API or local backup image
  |
  |-- /api/iss -------------> ISS API or demo fallback data
  |
  |-- /api/launches --------> data/launches.json
  |
  |-- /api/space-news ------> data/space_news.json
  |
  |-- /api/planets ---------> data/planets.json
  |
  |-- /api/agencies --------> data/agencies.json
```

## Screenshots

Add screenshots here after the school demo screen is ready:

- Chat section screenshot
- NASA Picture of the Day screenshot
- Planet Explorer screenshot
- Space Agencies screenshot

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
├── requirements.txt
└── README.md
```

## Future Features

- Save chat history in a database.
- Add real space news from a news API.
- Add more NASA data, like Mars rover photos.
- Add better AI answers later.
- Add a simple map for ISS position.

## Current Project Status

- Day 1: Project setup complete.
- Day 2: Chatbot brain complete.
- Day 3: NASA API and space dashboard complete.
- Day 4: Mission Control, ISS tracker, launches, voice input, and text-to-speech complete.
- Day 5: Futuristic assistant experience complete.
- Day 6: Final polish, screenshots, and school presentation preparation next.

## 6-Day Roadmap

### Day 1

Set up the project folder, Flask app, and first chatbot page.

### Day 2

Add more space facts and improve chatbot replies.

### Day 3

Add NASA APOD, demo dashboard data, cards, and sidebar navigation.

### Day 4

Add Mission Control, ISS tracker, launch dashboard, planet search, voice input, and speech output.

### Day 5

Add futuristic assistant features: avatar, typing effect, sound effects, themes, quiz, About section, presentation mode, and better mobile layout.

### Day 6

Final testing, screenshots, and school demo preparation.

## GitHub Push Commands

If this project is not connected to GitHub yet, create a new GitHub repository named `vertex-ai-chatbot`, then run:

```bash
git remote add origin https://github.com/rounak-project/vertex-ai-chatbot.git
git branch -M main
git push -u origin main
```
