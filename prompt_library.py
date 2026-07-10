"""Isolated Prompt Library module for VERTEX AI OS."""

import json
import re

from flask import Blueprint, jsonify, render_template, request

from chatbot import GROQ_MODEL, create_groq_client, should_use_groq


prompt_library_bp = Blueprint("prompt_library", __name__)

PROMPT_CATEGORIES = [
    "Programming", "AI", "AWS", "Cloud", "DevOps", "Linux", "Cybersecurity",
    "Resume", "Interview", "Learning", "Startup", "Marketing", "Writing",
    "UI/UX", "Website Builder", "Image Generation", "Productivity"
]

VARIABLES = ["{{role}}", "{{topic}}", "{{experience_level}}", "{{technology}}", "{{output_format}}"]


def build_seed_prompts():
    prompts = []
    templates = [
        "Act as a {role} and create a clear {output_format} about {topic} for a {experience_level} learner using {technology}.",
        "Review this {technology} work for {topic}, then give risks, improvements, and a concise action plan.",
        "Create a step-by-step checklist for {topic} with examples, common mistakes, and verification steps.",
        "Explain {topic} in simple language, then provide an intermediate version and an expert summary.",
        "Generate a production-ready plan for {topic}, including tools, architecture, tests, and rollout notes.",
        "Turn my rough notes about {topic} into a polished {output_format} with headings and next actions."
    ]
    for category in PROMPT_CATEGORIES:
        for index, template in enumerate(templates, start=1):
            prompts.append({
                "id": f"{category.lower().replace('/', '-').replace(' ', '-')}-{index}",
                "title": f"{category} Prompt {index}",
                "category": category,
                "tags": [category.lower().replace("/", "-"), "vertex", "template"],
                "prompt": template,
                "popularity": 100 - index,
                "featured": index <= 2,
                "created_at": f"2026-07-{index:02d}",
                "variables": VARIABLES
            })
    return prompts


SEED_PROMPTS = build_seed_prompts()


def improve_locally(prompt):
    topic = str(prompt or "make a website").strip()
    return (
        "Act as a senior AI product designer and full-stack engineer. "
        f"Create a detailed, professional solution for: {topic}. "
        "Include target audience, goals, constraints, information architecture, visual style, core features, "
        "accessibility requirements, responsive behavior, data/API needs, edge cases, and acceptance criteria. "
        "Return the answer as a structured implementation brief with clear sections and practical next steps."
    )


def extract_text(content):
    text = str(content or "").strip()
    fence = re.search(r"```(?:text|markdown)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL)
    return fence.group(1).strip() if fence else text


@prompt_library_bp.route("/prompt-library")
def prompt_library_page():
    return render_template("prompt_library.html", categories=PROMPT_CATEGORIES)


@prompt_library_bp.route("/api/prompts")
def prompts_api():
    return jsonify({
        "source": "local",
        "categories": PROMPT_CATEGORIES,
        "variables": VARIABLES,
        "prompts": SEED_PROMPTS
    })


@prompt_library_bp.route("/api/prompts/generate", methods=["POST"])
def prompts_generate_api():
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    if should_use_groq():
        try:
            client = create_groq_client()
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "Improve rough prompts into safe, specific, professional prompts. Return only the improved prompt."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.45,
                max_tokens=900
            )
            return jsonify({"source": "groq", "prompt": extract_text(response.choices[0].message.content)})
        except Exception as error:
            return jsonify({"source": "local", "prompt": improve_locally(prompt), "error": str(error)})
    return jsonify({"source": "local", "prompt": improve_locally(prompt), "error": "Groq is unavailable"})
