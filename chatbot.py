"""Chatbot brain for VERTEX AI OS.

This file keeps assistant policy, local knowledge lookup, and optional Groq
support separate from Flask.
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
    "I'm VERTEX AI OS and specialize in AI and technology topics. Could you rephrase your "
    "question or ask about AI, programming, cloud, DevOps, cybersecurity, robotics, "
    "software engineering, or emerging technologies?"
)
EMPTY_REPLY = "Please type an AI or technology question for VERTEX."
OUT_OF_SCOPE_REPLY = (
    "I'm designed as an AI and Technology specialist assistant. I can help with AI, programming, "
    "cloud computing, software engineering, robotics, cybersecurity, data science, APIs, DevOps, "
    "Linux, open source, productivity tools, and emerging technologies."
)
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
    """Load technology facts from the JSON knowledge base file."""
    with KNOWLEDGE_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


TECH_KNOWLEDGE = load_knowledge_base()

IN_SCOPE_KEYWORDS = {
    "ai", "artificial intelligence", "generative ai", "llm", "large language model", "model",
    "machine learning", "deep learning", "neural", "prompt", "openai", "anthropic", "claude",
    "gemini", "grok", "llama", "deepseek", "qwen", "mistral", "hugging face", "python",
    "javascript", "typescript", "flask", "react", "next.js", "node", "api", "software",
    "programming", "coding", "debug", "git", "github", "linux", "terminal", "cloud", "aws",
    "azure", "gcp", "docker", "kubernetes", "devops", "ci/cd", "cybersecurity", "security",
    "data science", "database", "sql", "robotics", "computer vision", "hardware", "startup",
    "open source", "productivity", "web development", "mobile development", "app", "code",
    "technology", "computer", "computers", "internet", "server", "backend", "frontend"
}

OUT_OF_SCOPE_KEYWORDS = {
    "sports", "cricket", "football", "basketball", "politics", "election", "religion",
    "movie", "movies", "celebrity", "celebrities", "astrology", "horoscope", "geography",
    "capital of", "medical advice", "doctor", "medicine", "legal advice", "lawyer",
    "relationship", "dating", "personal life"
}

DETAILED_MODE_TRIGGERS = {
    "explain in detail", "tell me more", "detailed explanation", "deep dive",
    "elaborate", "advanced explanation", "full explanation", "teach me",
    "explain step by step"
}


def wants_detailed_answer(user_message):
    """Return True when the user explicitly asks for a longer lesson."""
    message = str(user_message or "").lower()
    return (
        any(trigger in message for trigger in DETAILED_MODE_TRIGGERS)
        or ("explain" in message and "in detail" in message)
        or ("explain" in message and "step by step" in message)
    )


def wants_comparison(user_message):
    """Return True when a compact comparison table is the clearest format."""
    message = str(user_message or "").lower()
    return any(word in message for word in {"compare", "comparison", "versus", " vs "})


def wants_code_example(user_message):
    """Return True when the user asks for source code or an implementation example."""
    message = str(user_message or "").lower()
    return any(word in message for word in {"write", "code", "example", "snippet", "implement"})


def get_local_intent_answer(user_message):
    """Handle common structured requests without requiring online AI."""
    message = str(user_message or "").lower()

    if wants_comparison(user_message) and "gpt" in message and "claude" in message:
        return (
            "| Area | GPT | Claude |\n"
            "| --- | --- | --- |\n"
            "| Strength | Strong reasoning, coding, tool use, and multimodal workflows | Strong writing, analysis, coding help, and long-context work |\n"
            "| Best for | Building AI apps, coding, automation, and product workflows | Research, writing, document analysis, and careful explanations |\n"
            "| Style | Direct and flexible | Careful and structured |"
        )

    if wants_code_example(user_message) and "flask" in message and "api" in message:
        return (
            "Here is a simple Flask API example:\n\n"
            "```python\n"
            "from flask import Flask, jsonify\n\n"
            "app = Flask(__name__)\n\n"
            "@app.get('/api/health')\n"
            "def health():\n"
            "    return jsonify({'status': 'ok'})\n\n"
            "if __name__ == '__main__':\n"
            "    app.run(debug=True)\n"
            "```"
        )

    if wants_detailed_answer(user_message) and "kubernetes" in message:
        return (
            "# Kubernetes Overview\n\n"
            "Kubernetes is a container orchestration platform for running apps across many servers.\n\n"
            "- It schedules containers onto machines.\n"
            "- It restarts failed containers automatically.\n"
            "- It scales apps up or down.\n"
            "- It exposes services through stable networking.\n\n"
            "Example workflow:\n\n"
            "1. Build a Docker image.\n"
            "2. Push it to a registry.\n"
            "3. Deploy it with Kubernetes.\n"
            "4. Scale and monitor the app."
        )

    if wants_detailed_answer(user_message) and "docker" in message:
        return (
            "# Docker Overview\n\n"
            "Docker packages apps and their dependencies into portable containers.\n\n"
            "- Images are the app blueprint.\n"
            "- Containers are running image instances.\n"
            "- Volumes store persistent data.\n"
            "- Networks let containers communicate.\n\n"
            "```bash\n"
            "docker build -t my-app .\n"
            "docker run -p 5000:5000 my-app\n"
            "```"
        )

    return None


def get_local_knowledge_count():
    """Return the number of local knowledge topics loaded from JSON."""
    return sum(len(category) for category in TECH_KNOWLEDGE.values())


def is_in_scope(user_message):
    """Return True when a message belongs to VERTEX AI OS technology scope."""
    message = str(user_message or "").lower().strip()
    if not message:
        return True
    if any(keyword in message for keyword in IN_SCOPE_KEYWORDS):
        return True
    if any(keyword in message for keyword in OUT_OF_SCOPE_KEYWORDS):
        return False
    if message in {"hi", "hello", "hey", "help", "what can you do", "who are you"}:
        return True
    return False


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

    for category in TECH_KNOWLEDGE.values():
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
    """Ask Groq for a concise technology-specialist answer.

    The import stays inside this function so the app can still run without the
    Groq package installed. Return None when Groq cannot provide a valid answer
    so the caller can use the local fallback.
    """
    started_at = time.perf_counter()

    if get_configured_provider() != "groq":
        message = "AI_PROVIDER is set to local, so Groq was not used."
        update_last_ai_result("groq", "", started_at, message)
        logger.info("GROQ_FAILURE question=%r reason=%s", user_message, message)
        return None

    if not has_groq_key():
        key_status = mask_key_status()
        message = "GROQ_API_KEY is missing in Render." if key_status == "missing" else "GROQ_API_KEY is still a placeholder."
        update_last_ai_result("groq", "", started_at, message)
        logger.info("GROQ_FAILURE question=%r reason=%s", user_message, message)
        logger.warning("Groq skipped key_status=%s provider=%s", key_status, get_configured_provider())
        return None

    try:
        client = create_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are VERTEX AI OS, a premium AI and technology specialist assistant. "
                        "Only answer questions about artificial intelligence, generative AI, large language models, "
                        "programming, software engineering, cloud computing, DevOps, Linux, cybersecurity, "
                        "machine learning, data science, robotics, computer vision, startups, APIs, web development, "
                        "mobile development, hardware, productivity tools, open source projects, and emerging technologies. "
                        "If the question is outside that scope, politely redirect with this exact idea: "
                        "I'm designed as an AI and Technology specialist assistant. "
                        "Default to 2 to 5 short lines with concise, direct answers and minimal explanation. "
                        "Only provide a detailed, sectioned answer when the user explicitly asks for detail, a deep dive, "
                        "step-by-step teaching, or an advanced/full explanation. "
                        "Use markdown only when it improves clarity: tables for comparisons, bullets for lists, "
                        "numbered lists for steps, and fenced code blocks for code. Avoid guessing."
                    )
                },
                {
                    "role": "user",
                    "content": user_message
                }
            ],
            temperature=0.4,
            max_tokens=800
        )

        answer = response.choices[0].message.content.strip()
        if not answer:
            raise ValueError("Groq returned an empty answer")

        update_last_ai_result("groq", answer, started_at)
        logger.info("GROQ_USED question=%r", user_message)
        logger.info(
            "Groq answer succeeded provider=%s model=%s response_time_ms=%s",
            get_configured_provider(),
            GROQ_MODEL,
            LAST_AI_RESULT["response_time_ms"]
        )
        return answer
    except Exception as error:
        message = groq_error_message(error)
        update_last_ai_result("groq", "", started_at, message)
        logger.info("GROQ_FAILURE question=%r reason=%s", user_message, message)
        logger.exception(
            "Groq answer failed provider=%s model=%s key_status=%s user_message_length=%s friendly_error=%s",
            get_configured_provider(),
            GROQ_MODEL,
            mask_key_status(),
            len(str(user_message or "")),
            message
        )
        return None


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
                "Groq is the primary AI engine. Local technology knowledge is used only as fallback."
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
            "Groq is selected, but no API key is set. VERTEX is using the local technology brain."
            if provider == "groq" else
            "AI_PROVIDER is local. VERTEX is using the JSON technology knowledge brain."
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
    """Return a Groq answer first, then local fallback, then a rephrase prompt."""
    clean_message = str(user_message or "").strip()

    if not clean_message:
        return EMPTY_REPLY

    if not is_in_scope(clean_message):
        update_last_ai_result("policy", OUT_OF_SCOPE_REPLY, time.perf_counter())
        return OUT_OF_SCOPE_REPLY

    local_intent_answer = get_local_intent_answer(clean_message)
    if local_intent_answer:
        update_last_ai_result("local", local_intent_answer, time.perf_counter())
        logger.info("LOCAL_INTENT_USED question=%r", clean_message)
        return local_intent_answer

    if should_use_groq():
        groq_answer = ask_groq_ai(clean_message)
        if groq_answer:
            return groq_answer
    else:
        logger.info(
            "GROQ_FAILURE question=%r reason=%s key_status=%s",
            clean_message,
            "Groq is not available",
            mask_key_status()
        )

    local_answer = find_local_answer(clean_message)
    if local_answer:
        update_last_ai_result("local", local_answer, time.perf_counter())
        logger.info("LOCAL_FALLBACK_USED question=%r", clean_message)
        return local_answer

    started_at = time.perf_counter()
    update_last_ai_result("local", UNKNOWN_REPLY, started_at, "no Groq or local answer")
    return UNKNOWN_REPLY
