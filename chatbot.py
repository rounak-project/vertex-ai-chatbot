"""Simple chatbot brain for the VERTEX space chatbot.

This file keeps the space-answer logic separate from Flask. That makes the
project easier to understand because the web app and the chatbot brain each
have their own job.
"""

import json
import logging
import os
import time
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
KNOWLEDGE_FILE = BASE_DIR / "data" / "space_knowledge.json"
UNKNOWN_REPLY = (
    "I'm currently offline, but here's what I know.\n\n"
    "Space is huge, and I can still answer many beginner topics from my local knowledge base. "
    "Try asking about planets, stars, galaxies, nebulae, constellations, exoplanets, black holes, "
    "dark matter, rockets, NASA, ISRO, SpaceX, Apollo, Artemis, Chandrayaan, Mangalyaan, Gaganyaan, "
    "Aditya-L1, the ISS, Hubble, James Webb, Voyager, asteroids, comets, meteors, or meteorites."
)
EMPTY_REPLY = "Please type a space question for VERTEX."
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_TIMEOUT_SECONDS = float(os.getenv("GROQ_TIMEOUT_SECONDS", "12"))
GROQ_STATUS_CACHE_SECONDS = 60
PLACEHOLDER_KEYS = {
    "your_groq_api_key_here",
    "your_real_groq_key",
    "replace_me",
    "changeme"
}

LAST_AI_RESULT = {
    "provider": "local",
    "response": "",
    "response_time_ms": None,
    "error": None,
    "updated_at": None
}

GROQ_STATUS_CACHE = {
    "checked_at": 0,
    "connected": False,
    "error": "not checked"
}


def load_knowledge_base():
    """Load space facts from the JSON knowledge base file."""
    with KNOWLEDGE_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


SPACE_KNOWLEDGE = load_knowledge_base()


def get_local_knowledge_count():
    """Return the number of local knowledge topics loaded from JSON."""
    return sum(len(category) for category in SPACE_KNOWLEDGE.values())


def get_configured_provider():
    """Return the requested AI provider from the environment."""
    provider = os.getenv("AI_PROVIDER", "groq").strip().lower()
    return provider or "groq"


def get_groq_api_key():
    """Return a usable Groq API key or an empty string."""
    api_key = os.getenv("GROQ_API_KEY", "").strip()

    if not api_key or api_key.lower() in PLACEHOLDER_KEYS:
        return ""

    return api_key


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
    return bool(get_groq_api_key())


def should_use_groq():
    """Return True when configuration allows Groq after local search fails."""
    provider = get_configured_provider()
    return provider == "groq" and has_groq_key()


def mask_key_status():
    """Give useful key diagnostics without exposing the secret."""
    raw_key = os.getenv("GROQ_API_KEY", "")
    stripped_key = raw_key.strip()

    if not stripped_key:
        return "missing"

    if stripped_key.lower() in PLACEHOLDER_KEYS:
        return "placeholder"

    return f"loaded ({len(stripped_key)} characters)"


def make_offline_reply(reason=None):
    """Return the friendly offline response with optional safe diagnostics."""
    if not reason:
        return UNKNOWN_REPLY

    return f"{UNKNOWN_REPLY}\n\nAI note: {reason}"


def update_last_ai_result(provider, response, started_at, error=None):
    """Store the latest AI answer for the admin test page."""
    LAST_AI_RESULT.update({
        "provider": provider,
        "response": response,
        "response_time_ms": round((time.perf_counter() - started_at) * 1000, 2),
        "error": error,
        "updated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    })


def groq_error_message(error):
    """Convert Groq/network errors into safe messages for students/admins."""
    status_code = getattr(error, "status_code", None)
    error_text = str(error).lower()

    if status_code == 401 or "401" in error_text or "invalid api key" in error_text:
        return "The Groq API key was rejected. Please check GROQ_API_KEY in Render."
    if status_code == 403 or "403" in error_text:
        return "Groq refused access for this key or model. Check account permissions."
    if status_code == 429 or "429" in error_text or "rate limit" in error_text:
        return "Groq is rate limited right now. Please wait a moment and try again."
    if "timeout" in error_text or "timed out" in error_text:
        return "Groq timed out before answering."
    if "connection" in error_text or "network" in error_text or "name resolution" in error_text:
        return "A network error stopped VERTEX from reaching Groq."
    if "model" in error_text and ("not found" in error_text or "does not exist" in error_text or "invalid" in error_text):
        return f"The configured Groq model '{GROQ_MODEL}' is invalid or unavailable."

    return "Groq is unavailable right now."


def create_groq_client():
    """Create the Groq SDK client with a validated API key."""
    from groq import Groq

    return Groq(api_key=get_groq_api_key(), timeout=GROQ_TIMEOUT_SECONDS)


def check_groq_connection(force=False):
    """Check Groq connectivity and cache the result briefly."""
    if not should_use_groq():
        reason = "missing API key" if get_configured_provider() == "groq" else "AI_PROVIDER is not groq"
        GROQ_STATUS_CACHE.update({
            "checked_at": time.time(),
            "connected": False,
            "error": reason
        })
        return GROQ_STATUS_CACHE

    now = time.time()
    if not force and now - GROQ_STATUS_CACHE["checked_at"] < GROQ_STATUS_CACHE_SECONDS:
        return GROQ_STATUS_CACHE

    try:
        client = create_groq_client()
        client.models.list()
        GROQ_STATUS_CACHE.update({
            "checked_at": now,
            "connected": True,
            "error": None
        })
        logger.info(
            "Groq connectivity check succeeded provider=%s model=%s key_status=%s",
            get_configured_provider(),
            GROQ_MODEL,
            mask_key_status()
        )
    except Exception as error:
        message = groq_error_message(error)
        GROQ_STATUS_CACHE.update({
            "checked_at": now,
            "connected": False,
            "error": message
        })
        logger.warning(
            "Groq connectivity check failed provider=%s model=%s key_status=%s error=%s",
            get_configured_provider(),
            GROQ_MODEL,
            mask_key_status(),
            message
        )

    return GROQ_STATUS_CACHE


def ask_groq_ai(user_message):
    """Ask Groq for a short, safe, student-friendly space answer.

    The import stays inside this function so the app can still run without the
    Groq package installed. That keeps offline school demo mode reliable.
    """
    started_at = time.perf_counter()

    if get_configured_provider() != "groq":
        message = "AI_PROVIDER is set to local, so Groq was not used."
        reply = make_offline_reply(message)
        update_last_ai_result("local", reply, started_at, message)
        return reply

    if not has_groq_key():
        key_status = mask_key_status()
        message = "GROQ_API_KEY is missing in Render." if key_status == "missing" else "GROQ_API_KEY is still a placeholder."
        reply = make_offline_reply(message)
        update_last_ai_result("local", reply, started_at, message)
        logger.warning("Groq skipped key_status=%s provider=%s", key_status, get_configured_provider())
        return reply

    try:
        client = create_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are VERTEX, a friendly space AI for a Class 7 school project. "
                        "Behave like a NASA assistant, ISRO assistant, space teacher, and "
                        "friendly AI helper. Answer only space, astronomy, rocket, satellite, "
                        "planet, and science-learning questions. Keep answers educational, "
                        "safe, and easy for Class 7. Use 5 to 8 short lines maximum. Include "
                        "one simple fun fact when useful. If you are unsure, say so clearly "
                        "instead of guessing. Do not invent missions, dates, or discoveries."
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

        answer = response.choices[0].message.content.strip()
        update_last_ai_result("groq", answer, started_at)
        logger.info(
            "Groq answer succeeded provider=%s model=%s response_time_ms=%s",
            get_configured_provider(),
            GROQ_MODEL,
            LAST_AI_RESULT["response_time_ms"]
        )
        return answer
    except Exception as error:
        message = groq_error_message(error)
        reply = make_offline_reply(message)
        update_last_ai_result("groq", reply, started_at, message)
        logger.exception(
            "Groq answer failed provider=%s model=%s key_status=%s user_message_length=%s friendly_error=%s",
            get_configured_provider(),
            GROQ_MODEL,
            mask_key_status(),
            len(str(user_message or "")),
            message
        )
        return reply


def get_ai_status():
    """Explain which VERTEX brain mode is currently available."""
    provider = get_configured_provider()
    api_key_loaded = has_groq_key()

    if provider == "groq" and api_key_loaded:
        groq_status = check_groq_connection()
        connected = bool(groq_status["connected"])
        return {
            "provider": "groq",
            "connected": connected,
            "api_key_loaded": True,
            "mode": "online" if connected else "offline",
            "message": (
                "Local answers are checked first. Groq helps when VERTEX needs a real AI answer."
                if connected else
                f"Groq is configured, but unavailable: {groq_status['error']}"
            ),
            "model": GROQ_MODEL,
            "key_status": mask_key_status(),
            "local_knowledge_count": get_local_knowledge_count()
        }

    return {
        "provider": "local",
        "connected": False,
        "api_key_loaded": api_key_loaded,
        "mode": "offline",
        "message": (
            "Groq is selected, but no API key is set. VERTEX is using the local brain."
            if provider == "groq" else
            "AI_PROVIDER is local. VERTEX is using the beginner-friendly JSON knowledge brain."
        ),
        "model": GROQ_MODEL,
        "key_status": mask_key_status(),
        "local_knowledge_count": get_local_knowledge_count()
    }


def get_ai_diagnostics(force=False):
    """Return admin diagnostics for the AI test page."""
    status = get_ai_status() if not force else None
    if force:
        check_groq_connection(force=True)
        status = get_ai_status()

    return {
        **status,
        "ai_provider": get_configured_provider(),
        "groq_connected": bool(status["provider"] == "groq" and status["connected"]),
        "last_ai_response": LAST_AI_RESULT["response"] or "No AI response has been recorded yet.",
        "last_ai_provider": LAST_AI_RESULT["provider"],
        "last_ai_error": LAST_AI_RESULT["error"],
        "response_time_ms": LAST_AI_RESULT["response_time_ms"],
        "last_updated_at": LAST_AI_RESULT["updated_at"]
    }


def get_vertex_response(user_message):
    """Return a local answer first, then optional Groq AI, then fallback."""
    clean_message = str(user_message or "").strip()

    if not clean_message:
        return EMPTY_REPLY

    local_answer = find_local_answer(clean_message)
    if local_answer:
        update_last_ai_result("local", local_answer, time.perf_counter())
        return local_answer

    # The local brain always gets first chance. If it does not know the answer,
    # VERTEX tries Groq only when the provider and key are both ready.
    if should_use_groq():
        return ask_groq_ai(clean_message)

    started_at = time.perf_counter()
    if get_configured_provider() == "groq":
        key_status = mask_key_status()
        reason = "GROQ_API_KEY is missing in Render." if key_status == "missing" else "GROQ_API_KEY is not usable."
    else:
        reason = "AI_PROVIDER is set to local."

    reply = make_offline_reply(reason)
    update_last_ai_result("local", reply, started_at, reason)
    logger.warning(
        "Groq unavailable after local miss provider=%s key_status=%s local_knowledge_count=%s",
        get_configured_provider(),
        mask_key_status(),
        get_local_knowledge_count()
    )
    return reply
