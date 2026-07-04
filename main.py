import json
import logging
import os
import random
import time
from functools import lru_cache
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, url_for

load_dotenv()
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)

from chatbot import (
    GROQ_MODEL,
    create_groq_client,
    get_ai_diagnostics,
    get_ai_status,
    get_vertex_response,
    should_use_groq
)

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
NASA_APOD_URL = "https://api.nasa.gov/planetary/apod"
ISS_API_URL = "http://api.open-notify.org/iss-now.json"
APOD_CACHE_SECONDS = 60 * 60

# This list stores the most recent chat messages while Flask is running.
# It resets when the app is restarted, which is fine for a beginner project.
CHAT_HISTORY = []
MAX_HISTORY_MESSAGES = 20

# This dictionary remembers the latest NASA APOD answer for one hour.
# It helps the app avoid asking NASA for the same data again and again.
APOD_CACHE = {
    "saved_at": 0,
    "data": None
}

MISSION_COMMANDER_PROFILE = {
    "role": "Mission Commander",
    "name": "Rounak Singh",
    "subtitle": "Space Explorer • AI Innovator • Future Scientist",
    "status": "ONLINE",
    "mission_day": "001",
    "class_name": "VII-E",
    "school": "Delhi World Public School",
    "location": "Greater Noida, India",
    "age": "Class 7 Student",
    "mission_status": {
        "status": "ONLINE",
        "clearance": "LEVEL 7",
        "agency": "ISRO",
        "mission": "Exploring the Universe using AI and Curiosity"
    },
    "mission_log": (
        "Hello!\n\n"
        "I'm Rounak Singh, a Class 7 student who loves space and technology.\n\n"
        "I created VERTEX (Space Assistant) to make learning about the universe fun and interactive.\n\n"
        "My goal is to inspire students to explore science, ask questions, and dream big.\n\n"
        "Every great mission starts with curiosity."
    ),
    "interests": [
        {"icon": "🚀", "title": "Space"},
        {"icon": "🤖", "title": "Artificial Intelligence"},
        {"icon": "💻", "title": "Coding"},
        {"icon": "🦾", "title": "Robotics"}
    ],
    "skills": [
        {"name": "Python", "value": 92},
        {"name": "HTML", "value": 96},
        {"name": "CSS", "value": 94},
        {"name": "JavaScript", "value": 90},
        {"name": "Flask", "value": 88}
    ],
    "favorites": [
        {"label": "Favorite Planet", "value": "Mars"},
        {"label": "Favorite Mission", "value": "Chandrayaan-3"},
        {"label": "Favorite Agency", "value": "ISRO"},
        {"label": "Favorite Rocket", "value": "LVM3"},
        {"label": "Favorite Telescope", "value": "James Webb Space Telescope"}
    ],
    "dream_careers": [
        {"title": "AI Engineer", "description": "Design intelligent systems that help people learn faster."},
        {"title": "ISRO Scientist", "description": "Build missions that explore the Moon, Mars, and beyond."},
        {"title": "Aerospace Engineer", "description": "Create rockets and spacecraft that can travel safely."},
        {"title": "Space Technology Innovator", "description": "Build tools for the next generation of explorers."}
    ],
    "achievements": [
        "Built VERTEX",
        "NASA API Integration",
        "ISRO Dashboard",
        "Mission Control",
        "Space Quiz Academy",
        "300+ Questions",
        "Groq AI",
        "Render Deployment"
    ],
    "mission_stats": [
        {"label": "Lines of Code", "value": 6800, "suffix": "+"},
        {"label": "Features", "value": 18, "suffix": "+"},
        {"label": "Quiz Questions", "value": 300, "suffix": "+"},
        {"label": "APIs Integrated", "value": 8, "suffix": "+"},
        {"label": "AI Models", "value": 1, "suffix": "+"},
        {"label": "Current Version", "value": 3, "suffix": ".0"}
    ],
    "timeline": [
        {"year": "2024", "title": "Started learning programming.", "detail": "Built a foundation with Python, HTML, CSS, and simple projects."},
        {"year": "2024", "title": "Built first websites.", "detail": "Learned how to create interactive pages and connect them with data."},
        {"year": "2025", "title": "Started AI projects.", "detail": "Explored APIs, local knowledge bases, and smarter experiences."},
        {"year": "2025", "title": "Built VERTEX Space Assistant.", "detail": "Created a space learning dashboard with chatbot, quiz, and mission control."},
        {"year": "Future", "title": "Dreaming of joining ISRO.", "detail": "Continuing to study science, code, and space technology."}
    ],
    "contact": [
        {"label": "GitHub", "value": "github.com/rounak-project", "href": "https://github.com/rounak-project"},
        {"label": "Email", "value": "rounak@example.com", "href": "mailto:rounak@example.com"},
        {"label": "LinkedIn", "value": "Coming Soon", "href": "#"},
        {"label": "Portfolio", "value": "Coming Soon", "href": "#"}
    ],
    "mission_image": "images/about/rounak-astronaut.png"
}


def load_json_file(file_name):
    """Load a JSON file from the data folder."""
    file_path = DATA_DIR / file_name

    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_json_file_or_default(file_name, default_value):
    """Load local JSON safely so one bad file does not crash the demo."""
    try:
        return load_json_file(file_name)
    except (OSError, json.JSONDecodeError):
        return default_value


@lru_cache(maxsize=1)
def get_repo_code_lines():
    """Count the approximate code size for the mission commander profile."""
    total_lines = 0
    for path in BASE_DIR.rglob("*"):
        if not path.is_file():
            continue

        if ".git" in path.parts or "node_modules" in path.parts:
            continue

        if path.suffix.lower() not in {".py", ".js", ".html", ".css", ".json", ".md"}:
            continue

        try:
            with path.open("r", encoding="utf-8") as file:
                total_lines += sum(1 for _ in file)
        except (OSError, UnicodeDecodeError):
            continue

    return total_lines


def get_quiz_database():
    """Load the large local quiz database."""
    return load_json_file_or_default("quiz_database.json", {"categories": [], "questions": []})


def get_local_quiz_questions(topic="", difficulty="", limit=10):
    """Pick local quiz questions when AI generation is unavailable."""
    quiz_database = get_quiz_database()
    all_questions = quiz_database.get("questions", [])
    questions = all_questions
    topic_text = str(topic or "").lower().strip()
    difficulty_text = str(difficulty or "").lower().strip()

    if topic_text:
        questions = [
            question for question in questions
            if topic_text in question.get("category", "").lower()
            or topic_text in question.get("topic", "").lower()
            or topic_text in question.get("question", "").lower()
        ]

    if difficulty_text:
        questions = [
            question for question in questions
            if question.get("difficulty", "").lower() == difficulty_text
        ]

    # Backfill from nearby local questions so the AI fallback still gives a full quiz.
    fallback_questions = [
        question for question in all_questions
        if question not in questions
        and (
            not difficulty_text
            or question.get("difficulty", "").lower() == difficulty_text
            or topic_text in question.get("category", "").lower()
            or topic_text in question.get("topic", "").lower()
        )
    ]
    combined_questions = questions + fallback_questions

    if len(combined_questions) < limit:
        combined_questions += [
            question for question in all_questions
            if question not in combined_questions
        ]

    return random.sample(combined_questions, min(limit, len(combined_questions)))


def generate_ai_quiz_questions(topic, difficulty, limit):
    """Ask Groq for quiz questions and return None if anything goes wrong."""
    if not should_use_groq():
        return None

    try:
        client = create_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You create beginner-friendly educational space quiz questions. "
                        "Return only valid JSON with a top-level questions array. Each question "
                        "must include id, category, type, difficulty, question, choices, answer, "
                        "explanation, fact, and points. Use simple language for students."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Generate {limit} {difficulty or 'mixed'} space quiz questions about "
                        f"{topic or 'general space knowledge'}. Use multiple_choice questions."
                    )
                }
            ],
            temperature=0.5,
            max_tokens=2200
        )
        content = response.choices[0].message.content.strip()
        parsed = json.loads(content)
        return parsed.get("questions", [])[:limit]
    except Exception:
        app.logger.exception("AI quiz generation failed; using local quiz questions.")
        return None


def add_to_chat_history(speaker, message):
    """Add one message to memory and keep only the last 20 messages."""
    CHAT_HISTORY.append({"speaker": speaker, "message": message})

    if len(CHAT_HISTORY) > MAX_HISTORY_MESSAGES:
        del CHAT_HISTORY[0]


def get_backup_apod():
    """Return a local APOD-style card when NASA is unavailable."""
    return {
        "title": "VERTEX Backup Space View",
        "date": "Local demo image",
        "explanation": (
            "NASA data is not available right now, so VERTEX is showing a "
            "local backup space image. The rest of the dashboard still works."
        ),
        "image_url": url_for("static", filename="images/apod-backup.svg"),
        "source": "local-backup"
    }


def get_nasa_apod():
    """Fetch NASA's Astronomy Picture of the Day with a one-hour cache."""
    current_time = time.time()
    cached_data = APOD_CACHE["data"]

    if cached_data and current_time - APOD_CACHE["saved_at"] < APOD_CACHE_SECONDS:
        return cached_data

    try:
        nasa_api_key = os.getenv("NASA_API_KEY", "DEMO_KEY")
        response = requests.get(NASA_APOD_URL, params={"api_key": nasa_api_key}, timeout=8)
        response.raise_for_status()
        nasa_data = response.json()

        apod_data = {
            "title": nasa_data.get("title", "NASA Astronomy Picture of the Day"),
            "date": nasa_data.get("date", "Unknown date"),
            "explanation": nasa_data.get("explanation", "NASA shared a space image today."),
            "image_url": nasa_data.get("url", url_for("static", filename="images/apod-backup.svg")),
            "source": "nasa"
        }

        # APOD can sometimes be a video. For this beginner project, we use the
        # local backup image when NASA gives us something that is not an image.
        if nasa_data.get("media_type") != "image":
            apod_data["image_url"] = url_for("static", filename="images/apod-backup.svg")
            apod_data["source"] = "nasa-video-backup"

        APOD_CACHE["saved_at"] = current_time
        APOD_CACHE["data"] = apod_data
        return apod_data
    except (requests.RequestException, ValueError):
        return get_backup_apod()


def get_backup_iss_location():
    """Return demo ISS data when the live tracker is unavailable."""
    return {
        "latitude": "20.5937",
        "longitude": "78.9629",
        "altitude": "408 km",
        "speed": "27,600 km/h",
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "source": "demo-fallback"
    }


def get_iss_location():
    """Fetch the current ISS location or use simple fallback data."""
    try:
        response = requests.get(ISS_API_URL, timeout=6)
        response.raise_for_status()
        iss_data = response.json()
        position = iss_data.get("iss_position", {})

        if not position:
            return get_backup_iss_location()

        return {
            "latitude": position.get("latitude", "Unknown"),
            "longitude": position.get("longitude", "Unknown"),
            "altitude": "408 km",
            "speed": "27,600 km/h",
            "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            "source": "live"
        }
    except (requests.RequestException, ValueError):
        return get_backup_iss_location()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "")
    vertex_response = get_vertex_response(user_message)

    add_to_chat_history("user", user_message)
    add_to_chat_history("vertex", vertex_response)

    return jsonify({"response": vertex_response})


@app.route("/api/ai-status")
def ai_status():
    """API route that tells the frontend which VERTEX brain is active."""
    return jsonify(get_ai_status())


@app.route("/api/ai-test")
def ai_test_api():
    """API route with detailed AI diagnostics for the admin test page."""
    force = request.args.get("force", "").lower() in {"1", "true", "yes"}
    return jsonify(get_ai_diagnostics(force=force))


@app.route("/admin/ai-test")
def ai_test_page():
    """Admin page for checking Groq and local knowledge status."""
    return render_template("ai_test.html", diagnostics=get_ai_diagnostics(force=True))


@app.route("/api/nasa/apod")
def nasa_apod():
    """API route for the NASA Astronomy Picture of the Day card."""
    return jsonify(get_nasa_apod())


@app.route("/api/space-news")
def space_news():
    """API route for local demo space news cards."""
    return jsonify(load_json_file_or_default("space_news.json", []))


@app.route("/api/planets")
def planets():
    """API route for local planet information cards."""
    return jsonify(load_json_file_or_default("planets.json", []))


@app.route("/api/agencies")
def agencies():
    """API route for local space agency dashboard cards."""
    return jsonify(load_json_file_or_default("agencies.json", []))


@app.route("/api/iss")
def iss_tracker():
    """API route for the Mission Control ISS tracker card."""
    return jsonify(get_iss_location())


@app.route("/api/launches")
def launches():
    """API route for local demo rocket launch cards."""
    return jsonify(load_json_file_or_default("launches.json", []))


@app.route("/mission-commander")
@app.route("/about")
def mission_commander():
    """Render the futuristic Mission Commander profile."""
    return render_template(
        "about.html",
        profile=MISSION_COMMANDER_PROFILE,
        repo_code_lines=get_repo_code_lines(),
        about_css=url_for("static", filename="about.css"),
        about_js=url_for("static", filename="about.js")
    )


@app.route("/api/quiz-database")
def quiz_database():
    """API route for the local Space Quiz Academy database."""
    return jsonify(get_quiz_database())


@app.route("/api/quiz-generate", methods=["POST"])
def quiz_generate():
    """Generate a quiz with Groq when available, otherwise use local questions."""
    data = request.get_json(silent=True) or {}
    topic = data.get("topic", "")
    difficulty = data.get("difficulty", "")
    limit = min(int(data.get("limit", 10) or 10), 20)

    ai_questions = generate_ai_quiz_questions(topic, difficulty, limit)
    if ai_questions:
        return jsonify({"source": "groq", "questions": ai_questions})

    return jsonify({
        "source": "local",
        "questions": get_local_quiz_questions(topic=topic, difficulty=difficulty, limit=limit)
    })


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_ENV", "development") != "production"
    app.run(host="127.0.0.1", port=5000, debug=debug_mode)
