"""Simple chatbot brain for the VERTEX space chatbot.

This file keeps the space-answer logic separate from Flask. That makes the
project easier to understand because the web app and the chatbot brain each
have their own job.
"""

import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_FILE = BASE_DIR / "data" / "space_knowledge.json"
UNKNOWN_REPLY = "I am still learning about space. Please ask me another space question."
EMPTY_REPLY = "Please type a space question for VERTEX."


def load_knowledge_base():
    """Load space facts from the JSON knowledge base file."""
    with KNOWLEDGE_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


SPACE_KNOWLEDGE = load_knowledge_base()


def get_vertex_response(user_message):
    """Find the best VERTEX answer for a user message.

    The search is beginner friendly on purpose. It checks whether any keyword
    from the JSON file appears in the student's question.
    """
    message = user_message.lower().strip()

    if not message:
        return EMPTY_REPLY

    for category in SPACE_KNOWLEDGE.values():
        for topic in category:
            keywords = topic["keywords"]

            if any(keyword in message for keyword in keywords):
                return topic["answer"]

    return UNKNOWN_REPLY
