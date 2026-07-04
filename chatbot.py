"""Simple chatbot brain for the VERTEX space chatbot.

This file keeps the space-answer logic separate from Flask. That makes the
project easier to understand because the web app and the chatbot brain each
have their own job.
"""

import json
import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_FILE = BASE_DIR / "data" / "space_knowledge.json"
UNKNOWN_REPLY = "I am still learning about space. Please ask me another space question."
EMPTY_REPLY = "Please type a space question for VERTEX."
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


def load_knowledge_base():
    """Load space facts from the JSON knowledge base file."""
    with KNOWLEDGE_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


SPACE_KNOWLEDGE = load_knowledge_base()


def find_local_answer(user_message):
    """Find the best local answer from the JSON knowledge base.

    The search is beginner friendly on purpose. It checks whether any keyword
    from the JSON file appears in the student's question.
    """
    message = str(user_message or "").lower().strip()

    if not message:
        return EMPTY_REPLY

    best_answer = None
    best_keyword_length = 0

    for category in SPACE_KNOWLEDGE.values():
        for topic in category:
            keywords = topic["keywords"]

            for keyword in keywords:
                if keyword in message and len(keyword) >= best_keyword_length:
                    best_answer = topic["answer"]
                    best_keyword_length = len(keyword)

    if best_answer:
        return best_answer

    return None


def has_groq_key():
    """Return True when the optional Groq AI key exists in the environment."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    return bool(api_key and api_key != "your_groq_api_key_here")


def ask_groq_ai(user_message):
    """Ask Groq for a short, safe, student-friendly space answer.

    The import stays inside this function so the app can still run without the
    Groq package installed. That keeps offline school demo mode reliable.
    """
    try:
        from groq import Groq

        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are VERTEX, a school-friendly space AI assistant. "
                        "Answer only in a safe, educational way. Keep answers "
                        "simple enough for a Class 7 student. Prefer space and "
                        "science topics. Use 5 to 8 short lines maximum."
                    )
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            temperature=0.4,
            max_tokens=220
        )

        return response.choices[0].message.content.strip()
    except Exception:
        # If the online AI fails, VERTEX falls back without crashing the demo.
        return UNKNOWN_REPLY


def get_ai_status():
    """Explain which VERTEX brain mode is currently available."""
    provider = os.getenv("AI_PROVIDER", "local").lower()

    if provider == "groq" and has_groq_key():
        return {
            "provider": "groq",
            "mode": "Groq AI Active",
            "message": "Local answers are checked first. Groq helps when VERTEX needs a real AI answer."
        }

    if provider == "groq":
        return {
            "provider": "local",
            "mode": "Offline Demo Mode",
            "message": "Groq is selected, but no API key is set. VERTEX is using the local brain."
        }

    return {
        "provider": "local",
        "mode": "Local Brain Active",
        "message": "VERTEX is using the beginner-friendly JSON knowledge brain."
    }


def get_vertex_response(user_message):
    """Return a local answer first, then optional Groq AI, then fallback."""
    clean_message = str(user_message or "").strip()

    if not clean_message:
        return EMPTY_REPLY

    local_answer = find_local_answer(clean_message)
    if local_answer:
        return local_answer

    if os.getenv("AI_PROVIDER", "local").lower() == "groq" and has_groq_key():
        return ask_groq_ai(clean_message)

    return UNKNOWN_REPLY
