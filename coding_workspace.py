"""Isolated AI Coding Workspace module for VERTEX AI OS."""

import io
import json
import re
import textwrap
import zipfile

from flask import Blueprint, jsonify, render_template, request, send_file

from chatbot import GROQ_MODEL, create_groq_client, should_use_groq


coding_workspace_bp = Blueprint("coding_workspace", __name__)

SUPPORTED_LANGUAGES = {
    "python", "javascript", "typescript", "html", "css", "java", "c", "cpp",
    "go", "rust", "bash", "sql", "yaml", "json", "dockerfile", "terraform",
    "kubernetes", "github-actions"
}

STARTER_EXAMPLES = {
    "flask-rest-api": {
        "name": "Flask REST API",
        "language": "python",
        "files": {
            "app.py": textwrap.dedent("""\
                from flask import Flask, jsonify, request

                app = Flask(__name__)
                tasks = [{"id": 1, "title": "Learn VERTEX", "done": False}]

                @app.get("/api/tasks")
                def list_tasks():
                    return jsonify({"tasks": tasks})

                @app.post("/api/tasks")
                def create_task():
                    data = request.get_json(silent=True) or {}
                    task = {"id": len(tasks) + 1, "title": data.get("title", "Untitled"), "done": False}
                    tasks.append(task)
                    return jsonify(task), 201

                if __name__ == "__main__":
                    app.run(debug=True)
            """),
            "README.md": "# Flask REST API\n\nA small JSON API with list and create endpoints.\n"
        }
    },
    "responsive-html-game": {
        "name": "Responsive HTML Game",
        "language": "html",
        "files": {
            "index.html": "<main><h1>Reaction Timer</h1><button id=\"target\">Tap when ready</button><p id=\"score\">Waiting...</p></main><script src=\"script.js\"></script>",
            "style.css": "body{display:grid;place-items:center;min-height:100vh;font-family:system-ui;background:#08111f;color:white}button{font-size:1.2rem;padding:1rem 1.4rem;border:0;border-radius:8px;background:#38bdf8;color:#06111f;font-weight:800}",
            "script.js": "const b=document.querySelector('#target'),s=document.querySelector('#score');let start=Date.now();b.onclick=()=>{s.textContent=`Reaction: ${Date.now()-start}ms`;start=Date.now();};"
        }
    },
    "dockerfile": {
        "name": "Dockerfile",
        "language": "dockerfile",
        "files": {
            "Dockerfile": "FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\nCOPY . .\nCMD [\"python\", \"app.py\"]\n",
            "requirements.txt": "flask==3.0.3\n"
        }
    },
    "kubernetes-deployment": {
        "name": "Kubernetes Deployment",
        "language": "kubernetes",
        "files": {
            "deployment.yaml": "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: vertex-api\nspec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: vertex-api\n  template:\n    metadata:\n      labels:\n        app: vertex-api\n    spec:\n      containers:\n        - name: api\n          image: ghcr.io/example/vertex-api:latest\n          ports:\n            - containerPort: 5000\n",
            "service.yaml": "apiVersion: v1\nkind: Service\nmetadata:\n  name: vertex-api\nspec:\n  selector:\n    app: vertex-api\n  ports:\n    - port: 80\n      targetPort: 5000\n"
        }
    },
    "terraform-aws": {
        "name": "Terraform AWS Setup",
        "language": "terraform",
        "files": {
            "main.tf": "terraform {\n  required_providers {\n    aws = { source = \"hashicorp/aws\", version = \"~> 5.0\" }\n  }\n}\n\nprovider \"aws\" { region = var.region }\n\nresource \"aws_s3_bucket\" \"site\" {\n  bucket = var.bucket_name\n}\n",
            "variables.tf": "variable \"region\" { default = \"us-east-1\" }\nvariable \"bucket_name\" { type = string }\n"
        }
    },
    "github-actions": {
        "name": "GitHub Actions Pipeline",
        "language": "yaml",
        "files": {
            ".github/workflows/ci.yml": "name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-python@v5\n        with:\n          python-version: '3.12'\n      - run: python -m py_compile main.py\n"
        }
    }
}


def clean_language(value):
    language = str(value or "python").strip().lower()
    return language if language in SUPPORTED_LANGUAGES else "python"


def extract_json(content):
    text = str(content or "").strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    decoder = json.JSONDecoder()
    try:
        parsed, _ = decoder.raw_decode(text)
        return parsed
    except json.JSONDecodeError:
        pass
    for match in re.finditer(r"[\{\[]", text):
        try:
            parsed, _ = decoder.raw_decode(text[match.start():])
            return parsed
        except json.JSONDecodeError:
            continue
    raise ValueError("AI response did not contain valid JSON")


def groq_json(system_prompt, user_prompt, max_tokens=2600):
    if not should_use_groq():
        raise RuntimeError("Groq is not configured")
    client = create_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.35,
        max_tokens=max_tokens
    )
    return extract_json(response.choices[0].message.content)


def local_code_response(action, prompt, code, language, target_language=""):
    starter = STARTER_EXAMPLES["flask-rest-api"] if language == "python" else STARTER_EXAMPLES["responsive-html-game"]
    if action == "generate":
        return {
            "source": "local",
            "message": "Groq is unavailable, so VERTEX returned a safe local starter project.",
            "files": starter["files"],
            "explanation": "Use this as a starting point and customize it for your prompt.",
            "warnings": ["Backend execution is disabled for safety."]
        }
    if action == "tests":
        return {
            "source": "local",
            "message": "Local unit-test template generated.",
            "files": {"test_app.py": "def test_example():\n    assert True\n"},
            "explanation": "Replace the placeholder assertion with behavior-specific tests.",
            "warnings": []
        }
    if action == "convert":
        detail = f"Conversion from {language} to {target_language or 'the target language'} needs AI service for high quality output."
    elif action == "debug":
        detail = "Review stack traces from top to bottom, check the first project file mentioned, then verify inputs and missing imports."
    elif action == "refactor":
        detail = "Split long functions, improve names, remove duplication, and keep behavior covered by tests."
    elif action == "document":
        detail = "Document purpose, setup, usage, configuration, API routes, and examples."
    else:
        detail = "Read the code in small blocks, identify inputs, transformations, outputs, and side effects."
    return {
        "source": "local",
        "message": "Groq is unavailable; VERTEX used a safe local coding guide.",
        "files": {},
        "explanation": detail,
        "warnings": ["No arbitrary code was executed on the server."]
    }


def run_coding_action(action):
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    code = str(data.get("code", "")).strip()
    language = clean_language(data.get("language"))
    target_language = clean_language(data.get("target_language")) if data.get("target_language") else ""
    files = data.get("files", {})

    system_prompt = (
        "You are VERTEX AI Coding Workspace. Return only valid JSON with keys: "
        "source, message, files, explanation, warnings. files must be an object of filename to text. "
        "Do not include secrets, environment variables, dangerous commands, or instructions to execute untrusted code."
    )
    user_prompt = json.dumps({
        "action": action,
        "language": language,
        "target_language": target_language,
        "prompt": prompt,
        "code": code,
        "files": files
    })
    try:
        parsed = groq_json(system_prompt, user_prompt)
        return jsonify({
            "source": "groq",
            "message": parsed.get("message", "Generated by VERTEX."),
            "files": parsed.get("files", {}) if isinstance(parsed.get("files"), dict) else {},
            "explanation": parsed.get("explanation", ""),
            "warnings": parsed.get("warnings", [])
        })
    except Exception as error:
        response = local_code_response(action, prompt, code, language, target_language)
        response["error"] = str(error)
        return jsonify(response)


@coding_workspace_bp.route("/coding-workspace")
def coding_workspace_page():
    return render_template("coding_workspace.html", examples=STARTER_EXAMPLES)


@coding_workspace_bp.route("/api/coding/generate", methods=["POST"])
def coding_generate():
    return run_coding_action("generate")


@coding_workspace_bp.route("/api/coding/explain", methods=["POST"])
def coding_explain():
    return run_coding_action("explain")


@coding_workspace_bp.route("/api/coding/debug", methods=["POST"])
def coding_debug():
    return run_coding_action("debug")


@coding_workspace_bp.route("/api/coding/refactor", methods=["POST"])
def coding_refactor():
    return run_coding_action("refactor")


@coding_workspace_bp.route("/api/coding/tests", methods=["POST"])
def coding_tests():
    return run_coding_action("tests")


@coding_workspace_bp.route("/api/coding/convert", methods=["POST"])
def coding_convert():
    return run_coding_action("convert")


@coding_workspace_bp.route("/api/coding/document", methods=["POST"])
def coding_document():
    return run_coding_action("document")


@coding_workspace_bp.route("/api/coding/download", methods=["POST"])
def coding_download():
    data = request.get_json(silent=True) or {}
    files = data.get("files", {})
    if not isinstance(files, dict):
        files = {}
    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_name, content in files.items():
            safe_name = re.sub(r"(^/+|\.\.)", "", str(file_name or "file.txt"))[:120]
            archive.writestr(safe_name or "file.txt", str(content or ""))
    memory_file.seek(0)
    return send_file(memory_file, as_attachment=True, download_name="vertex-code-project.zip", mimetype="application/zip")
