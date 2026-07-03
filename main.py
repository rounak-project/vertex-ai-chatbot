import json
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, url_for

from chatbot import get_vertex_response


load_dotenv()

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
NASA_APOD_URL = "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY"
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


def load_json_file(file_name):
    """Load a JSON file from the data folder."""
    file_path = DATA_DIR / file_name

    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


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
        response = requests.get(NASA_APOD_URL, timeout=8)
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
    except requests.RequestException:
        return get_backup_apod()


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


@app.route("/api/nasa/apod")
def nasa_apod():
    """API route for the NASA Astronomy Picture of the Day card."""
    return jsonify(get_nasa_apod())


@app.route("/api/space-news")
def space_news():
    """API route for local demo space news cards."""
    return jsonify(load_json_file("space_news.json"))


@app.route("/api/planets")
def planets():
    """API route for local planet information cards."""
    return jsonify(load_json_file("planets.json"))


@app.route("/api/agencies")
def agencies():
    """API route for local space agency dashboard cards."""
    return jsonify(load_json_file("agencies.json"))


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
