import json
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request


load_dotenv()

app = Flask(__name__)

BASE_DIR = Path(__file__).resolve().parent
FACTS_FILE = BASE_DIR / "data" / "space_facts.json"


def load_space_facts():
    with FACTS_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


SPACE_FACTS = load_space_facts()


def get_vertex_reply(user_message):
    message = user_message.lower().strip()

    if not message:
        return "Please type a space question for VERTEX."

    for topic, details in SPACE_FACTS.items():
        keywords = details["keywords"]
        if any(keyword in message for keyword in keywords):
            return details["answer"]

    if "nasa api" in message or "api" in message:
        return (
            "NASA API support is planned for a future update. "
            "Soon VERTEX can show real space pictures and data."
        )

    return (
        "I am still learning. Try asking about the Sun, Moon, Earth, Mars, "
        "Jupiter, ISRO, NASA, or SpaceX."
    )


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = data.get("message", "")
    reply = get_vertex_reply(user_message)
    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
