import json
import logging
import os
import random
import re
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
from website_builder import website_builder_bp

app = Flask(__name__)
app.register_blueprint(website_builder_bp)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
APOD_CACHE_SECONDS = 60 * 60

# This list stores the most recent chat messages while Flask is running.
# It resets when the app is restarted, which is fine for a beginner project.
CHAT_HISTORY = []
MAX_HISTORY_MESSAGES = 20

# This dictionary remembers the latest compatibility card for one hour.
APOD_CACHE = {
    "saved_at": 0,
    "data": None
}

MISSION_COMMANDER_PROFILE = {
    "role": "AI Engineer",
    "name": "Rounak Singh",
    "full_name": "Rounak Singh",
    "subtitle": "AI Builder • Frontend Creator • Future Technology Founder",
    "status": "ONLINE",
    "mission_day": "001",
    "class_name": "7 E",
    "school": "Delhi World Public School",
    "location": "Greater Noida, India",
    "age": "Class 7 Student",
    "project": "VERTEX AI OS",
    "flag": "🇮🇳",
    "mission_status": {
        "status": "ONLINE",
        "clearance": "LEVEL 7",
        "agency": "VERTEX LABS",
        "mission": "Building premium AI software for learning, coding, and productivity",
        "chandrayaan_card": "VERTEX AI OS Profile"
    },
    "mission_log": (
        "Hello! I'm Rounak, a Class 7 student who loves artificial intelligence, coding, robotics, "
        "and futuristic products. I created VERTEX AI OS to make advanced technology feel clear, "
        "interactive, and inspiring. My goal is to become an AI engineer and build tools that help people learn faster."
    ),
    "interests": [
        {"icon": "AI", "title": "Artificial Intelligence"},
        {"icon": "CD", "title": "Coding"},
        {"icon": "RB", "title": "Robotics"},
        {"icon": "UX", "title": "Product Design"}
    ],
    "skills": [
        {"name": "Python", "value": 92},
        {"name": "HTML", "value": 96},
        {"name": "CSS", "value": 94},
        {"name": "JavaScript", "value": 90},
        {"name": "Flask", "value": 88}
    ],
    "favorites": [
        {"label": "Favorite AI Area", "value": "Generative AI"},
        {"label": "Favorite Language", "value": "Python"},
        {"label": "Favorite Tool", "value": "GitHub"},
        {"label": "Favorite Platform", "value": "Linux"},
        {"label": "Favorite Product Style", "value": "Apple-grade minimal UI"}
    ],
    "dream_careers": [
        {"title": "AI Engineer", "description": "Build intelligent systems that help people learn faster."},
        {"title": "Full Stack Engineer", "description": "Create polished software from frontend to backend."},
        {"title": "Robotics Engineer", "description": "Build machines that can sense, plan, and act."},
        {"title": "Startup Founder", "description": "Build useful technology products for the world."}
    ],
    "achievements": [
        "Built VERTEX",
        "AI OS Dashboard",
        "Groq Integration",
        "Voice Assistant",
        "AI Academy",
        "Local Knowledge Base",
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
        {"year": "2025", "title": "Built VERTEX AI OS.", "detail": "Created an AI learning dashboard with chatbot, academy, models, companies, tools, and voice mode."},
        {"year": "Future", "title": "Dreaming of becoming an AI engineer.", "detail": "Continuing to study code, product design, robotics, and advanced AI."}
    ],
    "contact": [
        {"label": "Email", "value": "rounak.singh1711@gmail.com", "href": "mailto:rounak.singh1711@gmail.com"},
        {"label": "GitHub", "value": "https://github.com/rounak-project", "href": "https://github.com/rounak-project"},
        {"label": "Project", "value": "VERTEX AI OS", "href": "/#dashboard"},
        {"label": "LinkedIn", "value": "Coming Soon", "href": "#"},
        {"label": "Portfolio", "value": "Coming Soon", "href": "#"}
    ],
    "mission_image": "images/apod-backup.svg"
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


def get_sky_explorer_data():
    """Load the local AI ecosystem companion data for the legacy explorer page."""
    return load_json_file_or_default(
        "sky_explorer.json",
        {"featured_objects": [], "control_actions": []}
    )


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


def extract_json_from_groq_response(content):
    """Pull a JSON object or array out of a Groq response safely."""
    text = str(content or "").strip()
    if not text:
        raise ValueError("Groq quiz response was empty")

    # Groq often wraps JSON in markdown fences or adds an explanation above it.
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    decoder = json.JSONDecoder()

    # First try the cleaned text directly.
    for candidate in (text,):
        try:
            parsed, _ = decoder.raw_decode(candidate)
            return parsed
        except json.JSONDecodeError:
            pass

    # If the text has extra prose, scan for the first plausible JSON start.
    for match in re.finditer(r"[\{\[]", text):
        candidate = text[match.start():]
        try:
            parsed, _ = decoder.raw_decode(candidate)
            return parsed
        except json.JSONDecodeError:
            continue

    raise ValueError("No valid JSON object found in Groq response")


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
                        "You create beginner-friendly educational AI and technology quiz questions. "
                        "Return only valid JSON with a top-level questions array. Each question "
                        "must include id, category, type, difficulty, question, choices, answer, "
                        "explanation, fact, and points. Use simple language for students. "
                        "Topics must stay within AI, programming, cloud, DevOps, cybersecurity, robotics, or data science."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"Generate {limit} {difficulty or 'mixed'} AI and technology quiz questions about "
                        f"{topic or 'general artificial intelligence and programming'}. Use multiple_choice questions."
                    )
                }
            ],
            temperature=0.5,
            max_tokens=2200
        )
        content = response.choices[0].message.content
        parsed = extract_json_from_groq_response(content)

        if isinstance(parsed, list):
            return parsed[:limit]

        if isinstance(parsed, dict):
            questions = parsed.get("questions", [])
            if isinstance(questions, list):
                return questions[:limit]

        raise ValueError("Groq quiz response did not contain a questions array")
    except Exception as error:
        app.logger.warning(
            "AI quiz generation failed; using local quiz questions. error=%s",
            error
        )
        return None


def add_to_chat_history(speaker, message):
    """Add one message to memory and keep only the last 20 messages."""
    CHAT_HISTORY.append({"speaker": speaker, "message": message})

    if len(CHAT_HISTORY) > MAX_HISTORY_MESSAGES:
        del CHAT_HISTORY[0]


def get_backup_apod():
    """Return a local AI insight card for the legacy APOD endpoint."""
    return {
        "title": "VERTEX Intelligence View",
        "date": "Local AI OS signal",
        "explanation": (
            "VERTEX AI OS is focused on artificial intelligence, programming, cloud, "
            "cybersecurity, robotics, and emerging technologies."
        ),
        "image_url": url_for("static", filename="images/apod-backup.svg"),
        "source": "local-backup"
    }


def get_nasa_apod():
    """Return a cached AI insight through the legacy APOD-compatible endpoint."""
    current_time = time.time()
    cached_data = APOD_CACHE["data"]

    if cached_data and current_time - APOD_CACHE["saved_at"] < APOD_CACHE_SECONDS:
        return cached_data

    apod_data = get_backup_apod()
    APOD_CACHE["saved_at"] = current_time
    APOD_CACHE["data"] = apod_data
    return apod_data


def get_backup_iss_location():
    """Return demo runtime telemetry for the legacy tracker endpoint."""
    return {
        "latitude": "local",
        "longitude": "runtime",
        "altitude": "Flask",
        "speed": "Ready",
        "last_updated": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
        "source": "demo-fallback"
    }


def get_iss_location():
    """Return runtime telemetry through the legacy tracker endpoint."""
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
    """Compatibility API route for an AI insight card."""
    return jsonify(get_nasa_apod())


@app.route("/api/space-news")
def space_news():
    """Compatibility API route for local AI news cards."""
    return jsonify(load_json_file_or_default("space_news.json", []))


@app.route("/api/planets")
def planets():
    """Compatibility API route for local AI model cards."""
    return jsonify(load_json_file_or_default("planets.json", []))


@app.route("/api/sky-explorer-data")
def sky_explorer_data():
    """Compatibility API route for AI landscape companion data."""
    return jsonify(get_sky_explorer_data())


@app.route("/api/agencies")
def agencies():
    """API route for local AI company dashboard cards."""
    return jsonify(load_json_file_or_default("agencies.json", []))


@app.route("/api/iss")
def iss_tracker():
    """Compatibility API route for runtime telemetry."""
    return jsonify(get_iss_location())


@app.route("/api/launches")
def launches():
    """Compatibility API route for local AI trend cards."""
    return jsonify(load_json_file_or_default("launches.json", []))


@app.route("/mission-commander")
@app.route("/about")
def mission_commander():
    """Render the futuristic creator profile."""
    return render_template(
        "about.html",
        profile=MISSION_COMMANDER_PROFILE,
        repo_code_lines=get_repo_code_lines(),
        about_css="",
        about_js=""
    )


@app.route("/sky-explorer")
def sky_explorer():
    """Render the AI landscape explorer page."""
    return render_template(
        "sky_explorer.html",
        sky_explorer_css="",
        sky_explorer_js=""
    )


@app.route("/api/quiz-database")
def quiz_database():
    """API route for the local AI Academy database."""
    return jsonify(get_quiz_database())


@app.route("/api/quiz-generate", methods=["GET", "POST"])
def quiz_generate():
    """Generate a quiz with Groq when available, otherwise use local questions."""
    if request.method == "GET":
        data = request.args
    else:
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
