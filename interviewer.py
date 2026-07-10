"""Isolated AI Interviewer module for VERTEX AI OS."""

import json
import logging
import random
import re

from flask import Blueprint, jsonify, render_template, request

from ai_response_utils import parse_ai_json
from chatbot import GROQ_MODEL, create_groq_client, should_use_groq


interviewer_bp = Blueprint("interviewer", __name__)
logger = logging.getLogger(__name__)

DOMAINS = [
    "Python", "JavaScript", "Flask", "HTML/CSS", "AWS", "Cloud", "DevOps",
    "Docker", "Kubernetes", "Terraform", "Linux", "Networking", "Cybersecurity",
    "AI", "Machine Learning", "Data Science", "SRE", "Behavioral interviews"
]
DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"]
MODES = ["Practice", "Timed", "Rapid Fire", "Technical Deep Dive", "Behavioral", "Mixed Interview"]

LOCAL_QUESTIONS = {
    domain: [
        f"What are the most important fundamentals of {domain} for this role?",
        f"Describe a project where you used {domain} and explain the tradeoffs.",
        f"What common mistake should engineers avoid when working with {domain}?",
        f"How would you debug a production issue related to {domain}?",
        f"Explain {domain} to a beginner, then give one advanced detail."
    ]
    for domain in DOMAINS
}


def extract_json(content):
    parsed = parse_ai_json(content, "interview response")
    if not isinstance(parsed, dict):
        raise ValueError("Interview JSON must be an object")
    return parsed


def local_question(domain, used=None):
    options = LOCAL_QUESTIONS.get(domain, LOCAL_QUESTIONS["Python"])
    used = set(used or [])
    available = [question for question in options if question not in used] or options
    return random.choice(available)


def local_evaluation(answer, question):
    words = len(str(answer or "").split())
    score = 3 if words < 12 else 6 if words < 40 else 8
    follow_up = "Can you give a concrete project example and explain what you would improve next?"
    return {
        "score": score,
        "strengths": ["Clear effort", "Relevant direction"] if words >= 12 else ["You started the answer"],
        "missing_points": ["Add specific examples", "Mention tradeoffs", "Explain verification steps"],
        "improved_answer": f"A strong answer to '{question}' should define the concept, give a practical example, discuss tradeoffs, and explain how you would validate the result.",
        "sample_answer": f"A strong answer to '{question}' should define the concept, give a practical example, discuss tradeoffs, and explain how you would validate the result.",
        "next_question": follow_up,
        "follow_up": follow_up
    }


def validate_evaluation(value, session=None):
    if not isinstance(value, dict):
        raise ValueError("Interview evaluation must be an object")
    score = value.get("score", 0)
    try:
        score = max(0, min(10, int(float(score))))
    except (TypeError, ValueError):
        score = 0
    strengths = value.get("strengths") if isinstance(value.get("strengths"), list) else []
    missing = value.get("missing_points") if isinstance(value.get("missing_points"), list) else []
    next_question = str(value.get("next_question") or value.get("follow_up") or "").strip()
    if not next_question and session:
        next_question = local_question(session.get("domain", "Python"), session.get("asked", []))
    improved = str(value.get("improved_answer") or value.get("sample_answer") or "").strip()
    return {
        "score": score,
        "strengths": [str(item) for item in strengths] or ["Relevant answer direction"],
        "missing_points": [str(item) for item in missing] or ["Add a concrete example"],
        "improved_answer": improved or "Add context, an example, tradeoffs, and verification steps.",
        "sample_answer": improved or "Add context, an example, tradeoffs, and verification steps.",
        "next_question": next_question or "What tradeoff would you consider next?",
        "follow_up": next_question or "What tradeoff would you consider next?",
    }


@interviewer_bp.route("/interviewer")
def interviewer_page():
    return render_template("interviewer.html", domains=DOMAINS, difficulties=DIFFICULTIES, modes=MODES)


@interviewer_bp.route("/api/interview/start", methods=["POST"])
def interview_start_api():
    data = request.get_json(silent=True) or {}
    domain = data.get("domain", "Python")
    total = min(max(int(data.get("total_questions", 5) or 5), 1), 20)
    session = {
        "id": f"interview-{random.randint(10000, 99999)}",
        "domain": domain,
        "difficulty": data.get("difficulty", "Beginner"),
        "mode": data.get("mode", "Practice"),
        "role": data.get("role", "Software Engineer"),
        "total_questions": total,
        "asked": [],
        "scores": []
    }
    question = local_question(domain)
    session["asked"].append(question)
    return jsonify({"source": "local", "session": session, "question": question})


@interviewer_bp.route("/api/interview/question", methods=["POST"])
def interview_question_api():
    data = request.get_json(silent=True) or {}
    session = data.get("session", {}) if isinstance(data.get("session"), dict) else {}
    domain = session.get("domain", data.get("domain", "Python"))
    question = local_question(domain, session.get("asked", []))
    session.setdefault("asked", []).append(question)
    return jsonify({"source": "local", "session": session, "question": question})


@interviewer_bp.route("/api/interview/evaluate", methods=["POST"])
def interview_evaluate_api():
    data = request.get_json(silent=True) or {}
    question = str(data.get("question", ""))
    answer = str(data.get("answer", ""))
    session = data.get("session", {}) if isinstance(data.get("session"), dict) else {}
    if should_use_groq():
        try:
            client = create_groq_client()
            parsed = None
            last_error = None
            for attempt in range(2):
                response = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": "Evaluate mock interview answers fairly and educationally. Return only JSON with score, strengths, missing_points, improved_answer, next_question. Do not claim certainty for subjective answers."},
                        {"role": "user", "content": json.dumps({"question": question, "answer": answer, "session": session, "retry": attempt == 1})}
                    ],
                    temperature=0.35 if attempt == 0 else 0.2,
                    max_tokens=1200
                )
                try:
                    parsed = validate_evaluation(extract_json(response.choices[0].message.content), session)
                    break
                except Exception as error:
                    last_error = error
            if parsed is None:
                raise last_error or ValueError("Interview evaluation failed")
            parsed["source"] = "groq"
            logger.info("INTERVIEWER_GROQ_USED question_length=%s answer_length=%s", len(question), len(answer))
            return jsonify(parsed)
        except Exception as error:
            local = validate_evaluation(local_evaluation(answer, question), session)
            local["source"] = "local"
            local["error"] = str(error)
            return jsonify(local)
    local = validate_evaluation(local_evaluation(answer, question), session)
    local["source"] = "local"
    local["error"] = "Groq is unavailable"
    return jsonify(local)


@interviewer_bp.route("/api/interview/summary", methods=["POST"])
def interview_summary_api():
    data = request.get_json(silent=True) or {}
    evaluations = data.get("evaluations", [])
    if not isinstance(evaluations, list):
        evaluations = []
    scores = [float(item.get("score", 0)) for item in evaluations if isinstance(item, dict)]
    average = round(sum(scores) / len(scores), 1) if scores else 0
    return jsonify({
        "source": "local",
        "average_score": average,
        "total_questions": len(evaluations),
        "topic_performance": {"overall": average},
        "strengths": ["Good consistency", "Keep practicing with specific examples"] if average >= 6 else ["You completed the practice session"],
        "next_steps": ["Review missing points", "Retry incorrect questions", "Practice one project-based answer per topic"],
        "report": f"Interview complete. Average score: {average}/10. Use the missing points to improve the next attempt."
    })
