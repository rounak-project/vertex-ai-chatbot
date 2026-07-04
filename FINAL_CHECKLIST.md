# VERTEX Final Testing Checklist

Use this checklist before the school demo.

- [ ] App opens at `http://127.0.0.1:5000`
- [ ] If port `5000` is busy, app opens at `http://127.0.0.1:5001`
- [ ] Chat works with a local question like "Tell me about Mars"
- [ ] Chat answers "What are exoplanets?"
- [ ] Chat answers "What are constellations?"
- [ ] Unknown questions try Groq when `GROQ_API_KEY` is set
- [ ] NASA image section works or shows the backup image
- [ ] ISS tracker works or shows demo fallback data
- [ ] Launch dashboard shows rocket launch cards
- [ ] Planet cards load correctly
- [ ] Space agencies load correctly
- [ ] Space Quiz works and calculates score
- [ ] Theme switcher works
- [ ] Theme choice saves after refresh
- [ ] Presentation mode turns on and off
- [ ] Voice input button does not break the app
- [ ] Speak button reads VERTEX replies when the browser supports it
- [ ] Stop Speaking button stops the voice
- [ ] AI status shows Local Brain Active, Groq AI Active, or Offline Demo Mode
- [ ] Render files exist: `render.yaml`, `Procfile`, and `runtime.txt`
- [ ] Render start command is `gunicorn main:app`
- [ ] Screenshot placeholders are replaced or screenshots are ready to add later
- [ ] `.env` is not committed to GitHub
- [ ] `python3 -m py_compile main.py chatbot.py` passes
- [ ] `node --check static/script.js` passes
- [ ] `git diff --check` passes
- [ ] GitHub push complete
