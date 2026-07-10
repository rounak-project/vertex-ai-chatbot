# VERTEX Final Testing Checklist

Use this checklist before the school demo.

- [ ] App opens at `http://127.0.0.1:5000`
- [ ] If port `5000` is busy, app opens after changing the port in `main.py`
- [ ] Dashboard hero, sidebar navigation, and main sections render correctly
- [ ] Vertex Chat answers a local question like "What is generative AI?"
- [ ] Vertex Chat answers "Explain Python functions"
- [ ] Out-of-scope questions are politely redirected to AI and technology topics
- [ ] Unknown technology questions try Groq when `GROQ_API_KEY` is set
- [ ] `/api/ai-status` shows Local Brain Active, Groq AI Active, or Offline Demo Mode
- [ ] `/admin/ai-test` opens and shows provider, key status, model, and diagnostics
- [ ] AI News signal feed loads cards
- [ ] AI Models index loads cards
- [ ] AI Companies directory loads cards
- [ ] AI Trends radar loads cards
- [ ] AI Landscape explorer opens from `/sky-explorer`
- [ ] AI Academy quiz loads questions and calculates score
- [ ] Website Builder opens and can generate a local site plan
- [ ] Coding Workspace opens and can create/download starter files
- [ ] Prompt Library opens and can save/export prompts
- [ ] Roadmaps page opens and saves progress
- [ ] Whiteboard opens and renders a Mermaid diagram
- [ ] Interviewer opens and can export a report
- [ ] Theme switcher works
- [ ] Theme choice saves after refresh
- [ ] Presentation mode turns on and off
- [ ] Voice input button does not break the app
- [ ] Speak button reads VERTEX replies when the browser supports it
- [ ] Stop Speaking button stops the voice
- [ ] Render files exist: `render.yaml`, `Procfile`, and `runtime.txt`
- [ ] Render start command is `gunicorn main:app`
- [ ] `.env` is not committed to GitHub
- [ ] `python3 -m py_compile main.py chatbot.py` passes, or `.venv/bin/python -m py_compile main.py chatbot.py` passes
- [ ] `node --check static/script.js` passes
- [ ] `git diff --check` passes
- [ ] GitHub push complete
