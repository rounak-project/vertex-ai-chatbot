"""Isolated AI Roadmaps module for VERTEX AI OS."""

import json
import logging
import re

from flask import Blueprint, jsonify, render_template, request

from ai_response_utils import parse_ai_json
from chatbot import GROQ_MODEL, create_groq_client, should_use_groq


roadmaps_bp = Blueprint("roadmaps", __name__)
logger = logging.getLogger(__name__)

ROLES = [
    "AI Engineer", "Machine Learning Engineer", "Python Developer", "Frontend Developer",
    "Backend Developer", "Full-Stack Developer", "DevOps Engineer", "Cloud Engineer",
    "AWS Engineer", "Site Reliability Engineer", "Cybersecurity Engineer", "Data Scientist",
    "Data Engineer", "Mobile Developer"
]

BASE_STAGES = {
    "DevOps Engineer": ["Linux fundamentals", "Networking", "Git", "Scripting", "Docker", "CI/CD", "Kubernetes", "Terraform", "Cloud", "Monitoring and SRE"],
    "AI Engineer": ["Python", "Math for AI", "Data handling", "Machine learning", "Deep learning", "LLMs", "Prompt engineering", "RAG", "MLOps", "AI product deployment"],
    "Machine Learning Engineer": ["Python", "Statistics", "Data cleaning", "Model training", "Evaluation", "Feature engineering", "Deep learning", "Experiment tracking", "Deployment", "Monitoring"],
    "Python Developer": ["Python basics", "Functions", "OOP", "Files", "APIs", "Flask", "Testing", "Databases", "Packaging", "Deployment"],
    "Frontend Developer": ["HTML", "CSS", "JavaScript", "Responsive design", "Accessibility", "React basics", "State management", "APIs", "Testing", "Performance"],
    "Backend Developer": ["HTTP", "APIs", "Databases", "Authentication", "Caching", "Queues", "Testing", "Docker", "Observability", "Deployment"],
    "Full-Stack Developer": ["Frontend foundations", "Backend foundations", "Databases", "Auth", "APIs", "Testing", "Cloud deployment", "CI/CD", "Performance", "Product polish"],
    "Cloud Engineer": ["Linux", "Networking", "IAM", "Compute", "Storage", "Databases", "Containers", "IaC", "Monitoring", "Cost optimization"],
    "AWS Engineer": ["IAM", "EC2", "S3", "VPC", "RDS", "Lambda", "ECS", "CloudFormation", "CloudWatch", "Security"],
    "Site Reliability Engineer": ["Linux", "Networking", "Scripting", "SLIs/SLOs", "Monitoring", "Incident response", "Kubernetes", "Automation", "Capacity", "Reliability design"],
    "Cybersecurity Engineer": ["Networking", "Linux", "Web security", "Threat modeling", "SIEM", "IAM", "Cloud security", "Incident response", "Secure coding", "Compliance"],
    "Data Scientist": ["Python", "Statistics", "Pandas", "Visualization", "Machine learning", "Experiments", "SQL", "Communication", "Dashboards", "Deployment"],
    "Data Engineer": ["SQL", "Python", "Data modeling", "ETL", "Warehouses", "Spark", "Orchestration", "Cloud data", "Quality", "Governance"],
    "Mobile Developer": ["Programming basics", "UI fundamentals", "Platform SDK", "State", "APIs", "Storage", "Testing", "Performance", "Publishing", "Analytics"]
}


def make_roadmap(role):
    stages = BASE_STAGES.get(role, BASE_STAGES["AI Engineer"])
    return {
        "id": role.lower().replace(" ", "-"),
        "title": role,
        "tracks": ["Beginner", "Intermediate", "Advanced"],
        "difficulty": "Beginner to Advanced",
        "suggested_next_step": stages[0],
        "stages": [
            {
                "id": f"{role.lower().replace(' ', '-')}-{index}",
                "title": skill,
                "prerequisites": stages[max(0, index - 2):index - 1],
                "learning_goals": [f"Understand {skill}", f"Use {skill} in a practical project"],
                "recommended_projects": [f"Build a {skill} mini project", f"Document a real {skill} workflow"],
                "practice_tasks": [f"Complete three focused exercises for {skill}", f"Explain {skill} in your own words"],
                "useful_tools": ["VS Code", "GitHub", "Linux terminal", "Documentation"],
                "difficulty": "Beginner" if index <= 3 else "Intermediate" if index <= 7 else "Advanced",
                "checklist": ["Learn concepts", "Practice hands-on", "Build project", "Review and document"]
            }
            for index, skill in enumerate(stages, start=1)
        ]
    }


ROADMAPS = [make_roadmap(role) for role in ROLES]


def extract_json(content):
    parsed = parse_ai_json(content, "roadmap response")
    if not isinstance(parsed, dict):
        raise ValueError("Roadmap JSON must be an object")
    return parsed


def validate_roadmap(value):
    if not isinstance(value, dict):
        raise ValueError("Roadmap must be an object")
    stages = value.get("stages")
    if not isinstance(stages, list) or not stages:
        raise ValueError("Roadmap stages are missing")
    for index, stage in enumerate(stages):
        if not isinstance(stage, dict):
            raise ValueError("Invalid stage")
        stage.setdefault("id", f"custom-{index + 1}")
        stage.setdefault("title", f"Stage {index + 1}")
        stage.setdefault("skills", stage.get("learning_goals", []))
        stage.setdefault("projects", stage.get("recommended_projects", []))
        stage.setdefault("duration", "2-4 weeks")
        stage.setdefault("learning_goals", stage.get("skills", []))
        stage.setdefault("recommended_projects", stage.get("projects", []))
        stage.setdefault("practice_tasks", stage.get("practice_tasks", [f"Practice {stage['title']} with a small build"]))
        stage.setdefault("useful_tools", stage.get("useful_tools", ["Documentation", "GitHub", "VS Code"]))
        stage.setdefault("checklist", [])
    value.setdefault("id", "custom-roadmap")
    value.setdefault("title", "Custom Roadmap")
    value.setdefault("description", f"A practical roadmap for {value['title']}.")
    value.setdefault("difficulty", "Mixed")
    value.setdefault("suggested_next_step", stages[0].get("title", "Start learning"))
    return value


def infer_role_from_prompt(prompt):
    text = str(prompt or "").lower()
    for role in ROLES:
        if role.lower() in text:
            return role
    if "devops" in text:
        return "DevOps Engineer"
    if "cyber" in text or "security" in text:
        return "Cybersecurity Engineer"
    if "frontend" in text:
        return "Frontend Developer"
    if "backend" in text:
        return "Backend Developer"
    if "cloud" in text or "aws" in text:
        return "Cloud Engineer"
    if "data" in text:
        return "Data Scientist"
    if "python" in text:
        return "Python Developer"
    return "AI Engineer"


def generate_roadmap_fallback(prompt):
    role = infer_role_from_prompt(prompt)
    roadmap = json.loads(json.dumps(make_roadmap(role)))
    roadmap["id"] = f"custom-{role.lower().replace(' ', '-')}"
    roadmap["title"] = f"{role} Roadmap"
    roadmap["description"] = f"A prompt-specific learning path for: {prompt or role}."
    for index, stage in enumerate(roadmap["stages"], start=1):
        stage["skills"] = stage.get("learning_goals", [])
        stage["projects"] = stage.get("recommended_projects", [])
        stage["duration"] = "1 week" if index <= 3 else "2 weeks" if index <= 7 else "3 weeks"
    return validate_roadmap(roadmap)


def roadmap_response(source, roadmap, error=None):
    payload = {"source": source, "roadmap": roadmap, **roadmap}
    if error:
        payload["error"] = error
    return payload


@roadmaps_bp.route("/roadmaps")
def roadmaps_page():
    return render_template("roadmaps.html", roles=ROLES)


@roadmaps_bp.route("/api/roadmaps")
def roadmaps_api():
    return jsonify({"source": "local", "roadmaps": ROADMAPS})


@roadmaps_bp.route("/api/roadmaps/generate", methods=["POST"])
def roadmaps_generate_api():
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    if should_use_groq():
        try:
            client = create_groq_client()
            parsed = None
            last_error = None
            for attempt in range(2):
                response = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=[
                        {"role": "system", "content": "Return only valid JSON for one learning roadmap with title, description, difficulty, suggested_next_step, and stages. Each stage must include title, skills, projects, duration, prerequisites, learning_goals, recommended_projects, practice_tasks, useful_tools, difficulty, and checklist. No markdown."},
                        {"role": "user", "content": prompt if attempt == 0 else f"STRICT JSON ONLY. Roadmap prompt: {prompt}"}
                    ],
                    temperature=0.4 if attempt == 0 else 0.2,
                    max_tokens=2600
                )
                try:
                    parsed = validate_roadmap(extract_json(response.choices[0].message.content))
                    break
                except Exception as error:
                    last_error = error
            if parsed is None:
                raise last_error or ValueError("Roadmap generation failed")
            logger.info("ROADMAP_GROQ_USED prompt_length=%s", len(prompt))
            return jsonify(roadmap_response("groq", parsed))
        except Exception as error:
            logger.info("ROADMAP_FALLBACK_USED prompt_length=%s error=%s", len(prompt), error)
            return jsonify(roadmap_response("local", generate_roadmap_fallback(prompt), str(error)))
    logger.info("ROADMAP_FALLBACK_USED prompt_length=%s error=Groq unavailable", len(prompt))
    return jsonify(roadmap_response("local", generate_roadmap_fallback(prompt), "Groq is unavailable"))
