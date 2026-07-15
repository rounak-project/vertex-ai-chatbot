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

## Option 2: Vercel

Vercel can host this Flask app with the Python runtime. `main.py` already exports a Flask instance named `app`, and `vercel.json` configures the function duration.

1. Push the project to GitHub.
2. Import the GitHub repository into Vercel.
3. Keep the root directory as the repository root.
4. Vercel installs Python packages from `requirements.txt`.
5. Add environment variables in Vercel Project Settings:

```env
GROQ_API_KEY=your_real_groq_key
AI_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
FLASK_ENV=production
```

6. Deploy the project.
7. Verify `/api/ai-status` shows `"provider": "groq"`, `"api_key_loaded": true`, and `"mode": "online"` when the Groq key is configured.
8. Open `/admin/ai-test` to confirm API key loading, Groq connectivity, AI provider, last AI response, response time, and local knowledge count.

You can also deploy with the Vercel CLI:

```bash
vercel deploy
```

Vercel's Flask runtime expects the Flask `app` object at a supported entrypoint such as `main.py`, which this project uses.

## Option 3: Render

Render can host Flask apps online.

1. Push the project to GitHub.
2. Create a new Web Service on Render.
3. Connect the GitHub repository.
4. Choose Python 3 as the runtime.
5. Set the build command:

```bash
pip install -r requirements.txt
```

6. Set the start command:

```bash
gunicorn main:app
```

7. `gunicorn` is included in `requirements.txt` for Render.
8. Add environment variables only in Render settings:

```env
GROQ_API_KEY=your_real_groq_key
AI_PROVIDER=groq
GROQ_MODEL=llama-3.1-8b-instant
FLASK_ENV=production
```

9. Open the public Render URL.
10. Verify `/api/ai-status` shows `"provider": "groq"`, `"api_key_loaded": true`, and `"mode": "online"`.
11. Open `/admin/ai-test` to confirm API key loaded, Groq connected, AI provider, last AI response, response time, and local knowledge count.

This project also includes `render.yaml`, `Procfile`, and `runtime.txt` so it is ready for Render deployment.

## Option 4: PythonAnywhere

PythonAnywhere is beginner-friendly for Python projects.

1. Upload or clone the GitHub project.
2. Create a virtual environment.
3. Install `requirements.txt`.
4. Create a Flask web app.
5. Point the WSGI file to `main.py` and `app`.
6. Add secret API keys in the PythonAnywhere environment, not in GitHub.

## Option 5: Replit

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
