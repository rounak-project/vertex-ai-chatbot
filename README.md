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

## Day 2 Completed Features

- Added the VERTEX chatbot brain in `chatbot.py`.
- Added a JSON knowledge base with beginner-friendly space facts.
- Added answers about the Sun, Moon, Earth, Mars, Jupiter, NASA, ISRO, SpaceX, black holes, and the ISS.
- Added a `/chat` API endpoint that returns chatbot responses.
- Added a welcome message, sample question buttons, and a thinking message.
- Added simple in-memory chat history for the last 20 messages.

## Project Structure

```text
vertex-ai-chatbot/
├── chatbot.py
├── main.py
├── data/
│   ├── space_facts.json
│   └── space_knowledge.json
├── static/
│   ├── script.js
│   └── style.css
├── templates/
│   └── index.html
├── requirements.txt
└── README.md
```

## Future Features

- Add NASA API picture of the day.
- Add more planets and space facts.
- Add voice input.
- Add quiz mode.
- Add user chat history.
- Add better AI answers later.

## 6-Day Roadmap

### Day 1

Set up the project folder, Flask app, and first chatbot page.

### Day 2

Add more space facts and improve chatbot replies.

### Day 3

Improve the design with better colors, icons, and mobile layout.

### Day 4

Add NASA API integration placeholder and learn how API keys work.

### Day 5

Test the app, fix bugs, and update the README.

### Day 6

Push the project to GitHub and prepare the school demo.

## GitHub Push Commands

If this project is not connected to GitHub yet, create a new GitHub repository named `vertex-ai-chatbot`, then run:

```bash
git remote add origin https://github.com/rounak-project/vertex-ai-chatbot.git
git branch -M main
git push -u origin main
```
