from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

from chatbot import get_vertex_response


load_dotenv()

app = Flask(__name__)

# This list stores the most recent chat messages while Flask is running.
# It resets when the app is restarted, which is fine for a beginner project.
CHAT_HISTORY = []
MAX_HISTORY_MESSAGES = 20


def add_to_chat_history(speaker, message):
    """Add one message to memory and keep only the last 20 messages."""
    CHAT_HISTORY.append({"speaker": speaker, "message": message})

    if len(CHAT_HISTORY) > MAX_HISTORY_MESSAGES:
        del CHAT_HISTORY[0]


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


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
