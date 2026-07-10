"""Isolated AI Whiteboard module for VERTEX AI OS."""

import re

from flask import Blueprint, jsonify, render_template, request

from chatbot import GROQ_MODEL, create_groq_client, should_use_groq


whiteboard_bp = Blueprint("whiteboard", __name__)

DIAGRAM_TYPES = [
    "Flowchart", "Sequence diagram", "Architecture diagram", "Mind map",
    "Class diagram", "Entity relationship diagram", "User journey", "CI/CD pipeline",
    "Cloud architecture", "Kubernetes architecture", "Network architecture",
    "AI workflow", "Machine learning pipeline"
]

UNSAFE_MERMAID = re.compile(r"<|script|javascript:|onclick|onerror", re.IGNORECASE)


def sanitize_mermaid(source):
    text = str(source or "").strip()
    if UNSAFE_MERMAID.search(text):
        raise ValueError("Unsafe Mermaid content was blocked")
    return text[:12000]


def local_diagram(prompt, diagram_type):
    text = f"{diagram_type} {prompt}".lower()
    if "sequence" in text:
        return "sequenceDiagram\n  participant User\n  participant VERTEX\n  participant AI\n  User->>VERTEX: Submit request\n  VERTEX->>AI: Generate answer\n  AI-->>VERTEX: Response\n  VERTEX-->>User: Explain result\n"
    if "mind" in text:
        return "mindmap\n  root((VERTEX Idea))\n    Goals\n    Users\n    Features\n    Data\n    Launch\n"
    if "class" in text:
        return "classDiagram\n  class User\n  class VertexModule\n  class ApiService\n  User --> VertexModule\n  VertexModule --> ApiService\n"
    if "entity" in text or "relationship" in text:
        return "erDiagram\n  USER ||--o{ SESSION : starts\n  SESSION ||--o{ ANSWER : contains\n  ROADMAP ||--o{ STAGE : includes\n"
    if "kubernetes" in text:
        return "flowchart LR\n  User --> Ingress\n  Ingress --> Service\n  Service --> PodA[App Pod]\n  Service --> PodB[App Pod]\n  PodA --> ConfigMap\n  PodB --> Secret\n"
    if "aws" in text or "cloud" in text:
        return "flowchart LR\n  User --> CDN[CloudFront]\n  CDN --> LB[Load Balancer]\n  LB --> Web[Web Tier]\n  Web --> API[API Tier]\n  API --> DB[(Database)]\n"
    return "flowchart TD\n  Idea[User idea] --> Plan[VERTEX plans diagram]\n  Plan --> Nodes[Create nodes]\n  Nodes --> Edges[Connect relationships]\n  Edges --> Review[Explain and refine]\n"


@whiteboard_bp.route("/whiteboard")
def whiteboard_page():
    return render_template("whiteboard.html", diagram_types=DIAGRAM_TYPES)


@whiteboard_bp.route("/api/whiteboard/generate", methods=["POST"])
def whiteboard_generate_api():
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    diagram_type = str(data.get("diagram_type", "Flowchart"))
    if should_use_groq():
        try:
            client = create_groq_client()
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "Create safe Mermaid diagram source only. Do not use HTML, scripts, links with javascript, or markdown fences."},
                    {"role": "user", "content": f"Diagram type: {diagram_type}\nPrompt: {prompt}"}
                ],
                temperature=0.25,
                max_tokens=1600
            )
            return jsonify({"source": "groq", "mermaid": sanitize_mermaid(response.choices[0].message.content)})
        except Exception as error:
            return jsonify({"source": "local", "mermaid": local_diagram(prompt, diagram_type), "error": str(error)})
    return jsonify({"source": "local", "mermaid": local_diagram(prompt, diagram_type), "error": "Groq is unavailable"})


@whiteboard_bp.route("/api/whiteboard/explain", methods=["POST"])
def whiteboard_explain_api():
    data = request.get_json(silent=True) or {}
    try:
        mermaid = sanitize_mermaid(data.get("mermaid", ""))
    except ValueError as error:
        return jsonify({"source": "local", "explanation": str(error)}), 400
    if should_use_groq():
        try:
            client = create_groq_client()
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=[
                    {"role": "system", "content": "Explain Mermaid diagrams clearly and safely."},
                    {"role": "user", "content": mermaid}
                ],
                temperature=0.3,
                max_tokens=900
            )
            return jsonify({"source": "groq", "explanation": response.choices[0].message.content})
        except Exception as error:
            return jsonify({"source": "local", "explanation": "This diagram shows the main components, their relationships, and the flow between them.", "error": str(error)})
    return jsonify({"source": "local", "explanation": "This diagram shows the main components, their relationships, and the flow between them.", "error": "Groq is unavailable"})
