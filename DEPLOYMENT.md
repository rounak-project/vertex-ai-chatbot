# VERTEX Deployment Notes

VERTEX can be shown locally or deployed online. Do not deploy until the project is tested locally first.

## Option 1: Run Locally

This is the easiest option for a school demo.

```bash
python3 -m venv --clear .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Open:

```text
http://127.0.0.1:5000
```

## Option 2: Render

Render can host Flask apps online.

1. Push the project to GitHub.
2. Create a new Web Service on Render.
3. Connect the GitHub repository.
4. Set the build command:

```bash
pip install -r requirements.txt
```

5. Set the start command:

```bash
gunicorn main:app
```

6. Add environment variables like `GROQ_API_KEY` only in Render settings.

## Option 3: PythonAnywhere

PythonAnywhere is beginner-friendly for Python projects.

1. Upload or clone the GitHub project.
2. Create a virtual environment.
3. Install `requirements.txt`.
4. Create a Flask web app.
5. Point the WSGI file to `main.py` and `app`.
6. Add secret API keys in the PythonAnywhere environment, not in GitHub.

## Option 4: Replit

Replit is useful for simple classroom demos.

1. Import the GitHub repository into Replit.
2. Install the packages from `requirements.txt`.
3. Add secrets like `GROQ_API_KEY` in Replit Secrets.
4. Run the Flask app.

## Important Notes

- Never upload `.env` to GitHub.
- Keep `GROQ_API_KEY` private.
- If the online AI does not work, VERTEX still works with the local brain.
- Test the app before presenting it to the teacher.
