# Vertex AI Chrome/Edge Extension

Use Vertex AI directly on any webpage with a floating assistant, page-aware tools, safe browser actions, notes, translation, and read-aloud.

## What It Does

- Works on normal websites through Manifest V3 and `<all_urls>`.
- Injects a draggable, resizable, minimizable Vertex floating assistant.
- Reads page content only after you ask Vertex to analyze the page.
- Skips password, payment, file, and sensitive form fields.
- Supports Groq directly from extension settings without hardcoded secrets.
- Can optionally call the existing Vertex Flask `/chat` endpoint.
- Uses `Alt+V` to open or close the panel.

## Files

```text
browser-extension/
  manifest.json
  background.js
  content.js
  content.css
  popup.html
  popup.js
  popup.css
  options.html
  options.js
  options.css
  icons/
  README.md
```

## Local App Setup

From the project root:

```bash
cd /home/rounak/vertex-ai-chatbot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

The local Vertex app runs at:

```text
http://127.0.0.1:5000
```

## Install the Extension Locally

1. Open Chrome or Edge.
2. Go to `chrome://extensions` or `edge://extensions`.
3. Enable `Developer mode`.
4. Click `Load unpacked`.
5. Select:

```text
/home/rounak/vertex-ai-chatbot/browser-extension
```

6. Pin the Vertex AI extension.
7. Click the extension icon and open `Settings`.
8. Add your Groq API key.
9. Keep the model as `llama-3.1-8b-instant` unless you want another Groq model.
10. For local app testing, set Vertex app URL to:

```text
http://127.0.0.1:5000
```

Direct Groq mode is recommended for full extension page-aware tools. The optional Vertex endpoint mode calls the app's `/chat` endpoint.

## Test Checklist

After loading the extension:

1. Open `https://www.google.com`.
2. Press `Alt+V` and confirm the Vertex button/panel opens.
3. Search Google from Vertex: `Search Google for black holes`.
4. Open YouTube from Vertex: `Open YouTube`.
5. Open a Wikipedia article and click `Summary`.
6. Select text on any article and click `Selected Text`.
7. Click `ELI12`, `Notes`, `Quiz`, and `Key Points`.
8. Click `Read Aloud` on a readable page.
9. Try `Translate` after selecting text.
10. Clear the API key in Settings and verify the setup state appears.

## Privacy Notes

Vertex does not silently collect webpage data. The content script gathers page title, URL, selected text, headings, and visible readable text only when you click a page-aware action or send a message from the panel.

Saved notes are stored in Chrome local extension storage on your device.

## No Build Required

This extension is plain Manifest V3 JavaScript, HTML, and CSS. There are no extension dependencies and no extension build step.
