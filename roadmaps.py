"""Isolated AI Roadmaps module for VERTEX AI OS."""

import json
import re

from flask import Blueprint, jsonify, render_template, request

from chatbot import GROQ_MODEL, create_groq_client, should_use_groq


roadmaps_bp = Blueprint("roadmaps", __name__)

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
    text = str(content or "").strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    decoder = json.JSONDecoder()
    for start in [0] + [m.start() for m in re.finditer(r"\{", text)]:
        try:
            parsed, _ = decoder.raw_decode(text[start:])
            return parsed
        except json.JSONDecodeError:
            continue
    raise ValueError("No valid roadmap JSON found")


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
        stage.setdefault("skills", [])
        stage.setdefault("checklist", [])
    value.setdefault("id", "custom-roadmap")
    value.setdefault("title", "Custom Roadmap")
    value.setdefault("difficulty", "Mixed")
    value.setdefault("suggested_next_step", stages[0].get("title", "Start learning"))
    return value


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
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "Return only valid JSON for a learning roadmap with title, difficulty, suggested_next_step, and stages. Each stage must include title, prerequisites, learning_goals, recommended_projects, practice_tasks, useful_tools, difficulty, and checklist."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.4,
                max_tokens=2600
            )
            return jsonify({"source": "groq", "roadmap": validate_roadmap(extract_json(response.choices[0].message.content))})
        except Exception as error:
            return jsonify({"source": "local", "roadmap": ROADMAPS[0], "error": str(error)})
    return jsonify({"source": "local", "roadmap": ROADMAPS[0], "error": "Groq is unavailable"})
