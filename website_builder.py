"""Isolated AI Website Builder module for VERTEX AI OS."""

import json
import re

from flask import Blueprint, jsonify, render_template, request

from chatbot import GROQ_MODEL, create_groq_client, should_use_groq


website_builder_bp = Blueprint("website_builder", __name__)

WEBSITE_THEMES = {"modern", "minimal", "startup", "portfolio", "dark", "glassmorphism"}


def normalize_website_theme(theme):
    """Return a supported website builder theme."""
    clean_theme = str(theme or "").strip().lower()
    return clean_theme if clean_theme in WEBSITE_THEMES else "modern"


def extract_json_from_ai_response(content):
    """Pull a JSON object out of a model response safely."""
    text = str(content or "").strip()
    if not text:
        raise ValueError("Website generator response was empty")

    fence_match = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL)
    if fence_match:
        text = fence_match.group(1).strip()

    decoder = json.JSONDecoder()
    try:
        parsed, _ = decoder.raw_decode(text)
        return parsed
    except json.JSONDecodeError:
        pass

    for match in re.finditer(r"\{", text):
        try:
            parsed, _ = decoder.raw_decode(text[match.start():])
            return parsed
        except json.JSONDecodeError:
            continue

    raise ValueError("No valid JSON object found in website generator response")


def infer_website_type(prompt):
    """Infer a simple site category from the user's plain-English request."""
    text = str(prompt or "").lower()
    if "restaurant" in text or "cafe" in text or "food" in text:
        return "restaurant"
    if "portfolio" in text or "personal" in text or "resume" in text:
        return "portfolio"
    if "blog" in text or "writer" in text or "articles" in text:
        return "blog"
    if "startup" in text or "saas" in text or "landing" in text or "product" in text:
        return "startup"
    return "website"


def title_from_prompt(prompt, site_type):
    """Create a clean brand title without asking the model."""
    text = re.sub(
        r"\b(build|create|make|design|website|site|landing page|for|a|an|the)\b",
        " ",
        str(prompt or ""),
        flags=re.IGNORECASE
    )
    words = re.findall(r"[A-Za-z0-9]+", text)
    if words:
        return " ".join(words[:4]).title()

    fallback_titles = {
        "restaurant": "Aurora Table",
        "portfolio": "Creative Portfolio",
        "blog": "Signal Journal",
        "startup": "Nova AI",
        "website": "Vertex Site"
    }
    return fallback_titles.get(site_type, "Vertex Site")


def get_site_copy(site_type, title):
    """Return section copy for the deterministic website generator."""
    copy_map = {
        "restaurant": {
            "headline": f"{title} serves memorable food with warm hospitality.",
            "subhead": "A refined dining experience with seasonal plates, crafted drinks, and easy reservations.",
            "primary": "Reserve a Table",
            "secondary": "View Menu",
            "features": [
                ("Seasonal Menu", "Fresh ingredients, balanced flavors, and chef-led specials."),
                ("Private Events", "Host birthdays, team dinners, and celebrations with a polished setup."),
                ("Fast Booking", "Clear hours, location details, and instant reservation calls to action.")
            ],
            "sections": [
                ("Signature Plates", "Small plates, mains, desserts, and drinks presented in a clean menu grid."),
                ("Atmosphere", "Comfortable seating, modern lighting, and friendly service from arrival to dessert."),
                ("Visit Us", "Open daily with convenient reservations and takeaway options.")
            ]
        },
        "portfolio": {
            "headline": f"{title} presents selected work with confidence.",
            "subhead": "A personal portfolio for projects, skills, achievements, and a direct contact path.",
            "primary": "View Projects",
            "secondary": "Contact Me",
            "features": [
                ("Featured Work", "Project cards with outcomes, tools, and concise case-study summaries."),
                ("Skills Snapshot", "A clear view of technical strengths, creative direction, and experience."),
                ("Contact Ready", "Simple calls to action for hiring, collaboration, and freelance work.")
            ],
            "sections": [
                ("Project Gallery", "Showcase apps, websites, experiments, and measurable results."),
                ("About", "Explain the builder's story, strengths, and what makes their work distinct."),
                ("Availability", "Make it easy for visitors to start a conversation.")
            ]
        },
        "blog": {
            "headline": f"{title} turns ideas into readable stories.",
            "subhead": "A clean blog homepage for essays, guides, tutorials, and curated recommendations.",
            "primary": "Read Latest",
            "secondary": "Browse Topics",
            "features": [
                ("Featured Posts", "Highlight the newest and most useful writing on the homepage."),
                ("Topic Filters", "Organize articles into clear collections visitors can scan quickly."),
                ("Newsletter CTA", "Invite readers to subscribe without interrupting the reading experience.")
            ],
            "sections": [
                ("Latest Articles", "Cards for insights, tutorials, and opinion pieces."),
                ("Popular Topics", "Reusable tags for research, design, technology, and personal notes."),
                ("Subscribe", "A focused signup block for repeat readers.")
            ]
        },
        "startup": {
            "headline": f"{title} helps teams launch smarter products faster.",
            "subhead": "A conversion-focused landing page with crisp positioning, proof, pricing, and signup actions.",
            "primary": "Start Free",
            "secondary": "See Demo",
            "features": [
                ("AI Workflow", "Automate repetitive tasks and keep teams focused on important decisions."),
                ("Fast Setup", "Go from idea to working system with clear onboarding and templates."),
                ("Trusted Metrics", "Showcase uptime, adoption, customer wins, and product velocity.")
            ],
            "sections": [
                ("How It Works", "Explain the product in three clear steps from input to result."),
                ("Benefits", "Reduce manual work, improve quality, and move faster with less friction."),
                ("Pricing", "Simple plans that make the next action obvious.")
            ]
        },
        "website": {
            "headline": f"{title} is built to look clear, modern, and ready to launch.",
            "subhead": "A responsive website with strong messaging, feature sections, and practical calls to action.",
            "primary": "Get Started",
            "secondary": "Explore",
            "features": [
                ("Responsive Layout", "Designed to work across mobile, tablet, and desktop screens."),
                ("Strong Sections", "Hero, benefits, content blocks, and contact areas in easy-to-scan cards."),
                ("Launch Ready", "Clean HTML, CSS, and JavaScript generated as separate files.")
            ],
            "sections": [
                ("Overview", "Introduce the purpose of the website in a direct, helpful way."),
                ("Highlights", "Show key features, services, or ideas in easy-to-scan cards."),
                ("Contact", "Give visitors a clear next step.")
            ]
        }
    }
    return copy_map.get(site_type, copy_map["website"])


def escape_html(value):
    """Escape text for generated static HTML."""
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#039;")
    )


def build_local_website(prompt, theme):
    """Generate a complete static site locally when AI generation is unavailable."""
    site_type = infer_website_type(prompt)
    title = title_from_prompt(prompt, site_type)
    copy = get_site_copy(site_type, title)
    theme = normalize_website_theme(theme)
    theme_label = theme.replace("-", " ").title()

    feature_cards = "\n".join(
        f"""        <article class="feature-card">
          <span>{index:02d}</span>
          <h3>{escape_html(title_text)}</h3>
          <p>{escape_html(description)}</p>
        </article>"""
        for index, (title_text, description) in enumerate(copy["features"], start=1)
    )
    section_cards = "\n".join(
        f"""        <article>
          <h3>{escape_html(title_text)}</h3>
          <p>{escape_html(description)}</p>
        </article>"""
        for title_text, description in copy["sections"]
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{escape_html(title)}</title>
  <link rel="stylesheet" href="style.css">
</head>
<body class="theme-{theme}">
  <header class="site-header">
    <a class="brand" href="#home">{escape_html(title)}</a>
    <nav aria-label="Main navigation">
      <a href="#features">Features</a>
      <a href="#story">Story</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>

  <main id="home">
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">{escape_html(theme_label)} Website</p>
        <h1>{escape_html(copy["headline"])}</h1>
        <p>{escape_html(copy["subhead"])}</p>
        <div class="hero-actions">
          <a class="button primary" href="#contact">{escape_html(copy["primary"])}</a>
          <a class="button secondary" href="#features">{escape_html(copy["secondary"])}</a>
        </div>
      </div>
      <div class="hero-visual" aria-label="Generated website preview visual">
        <div class="metric-card">
          <strong>Launch</strong>
          <span>Ready</span>
        </div>
        <div class="metric-card">
          <strong>Style</strong>
          <span>{escape_html(theme_label)}</span>
        </div>
        <div class="metric-card wide">
          <strong>Prompt</strong>
          <span>{escape_html(str(prompt or "Custom website")[:90])}</span>
        </div>
      </div>
    </section>

    <section id="features" class="feature-grid">
{feature_cards}
    </section>

    <section id="story" class="content-band">
      <div>
        <p class="eyebrow">Built For Visitors</p>
        <h2>A complete one-page experience with useful sections.</h2>
      </div>
      <div class="story-grid">
{section_cards}
      </div>
    </section>

    <section id="contact" class="cta-section">
      <h2>Ready to move forward?</h2>
      <p>Use this generated foundation as a starting point, then customize the text, images, and links for the real project.</p>
      <a class="button primary" href="mailto:hello@example.com">Contact Now</a>
    </section>
  </main>

  <script src="script.js"></script>
</body>
</html>"""

    css = f""":root {{
  --bg: #f7f8fb;
  --surface: #ffffff;
  --text: #111827;
  --muted: #5b6472;
  --accent: #2563eb;
  --accent-strong: #111827;
  --line: rgba(17, 24, 39, 0.12);
  --shadow: 0 24px 70px rgba(17, 24, 39, 0.12);
}}

* {{ box-sizing: border-box; }}
html {{ scroll-behavior: smooth; }}
body {{
  margin: 0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
}}

body.theme-dark {{
  --bg: #070b12;
  --surface: #101826;
  --text: #f8fafc;
  --muted: #a7b0bf;
  --accent: #22d3ee;
  --accent-strong: #8b5cf6;
  --line: rgba(255, 255, 255, 0.14);
}}

body.theme-minimal {{
  --bg: #fbfaf7;
  --surface: #ffffff;
  --text: #18181b;
  --muted: #71717a;
  --accent: #18181b;
  --accent-strong: #52525b;
}}

body.theme-startup {{
  --accent: #4f46e5;
  --accent-strong: #06b6d4;
}}

body.theme-portfolio {{
  --accent: #db2777;
  --accent-strong: #7c3aed;
}}

body.theme-glassmorphism {{
  --bg: linear-gradient(135deg, #dff7ff, #f4e8ff 48%, #fff7df);
  --surface: rgba(255, 255, 255, 0.58);
  --line: rgba(255, 255, 255, 0.52);
}}

.site-header {{
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 18px clamp(18px, 5vw, 72px);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: blur(18px);
}}

.brand {{
  color: var(--text);
  font-weight: 800;
  text-decoration: none;
}}

nav {{
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
}}

nav a {{
  color: var(--muted);
  font-weight: 700;
  text-decoration: none;
}}

.hero {{
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
  gap: clamp(24px, 5vw, 70px);
  align-items: center;
  min-height: 82vh;
  padding: clamp(42px, 8vw, 96px) clamp(18px, 5vw, 72px);
}}

.eyebrow {{
  margin: 0 0 10px;
  color: var(--accent);
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}}

h1, h2, h3, p {{ margin-top: 0; }}
h1 {{
  max-width: 820px;
  margin-bottom: 18px;
  font-size: clamp(2.7rem, 7vw, 6.8rem);
  line-height: 0.95;
}}

.hero-copy > p:not(.eyebrow) {{
  max-width: 670px;
  color: var(--muted);
  font-size: 1.12rem;
}}

.hero-actions {{
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 28px;
}}

.button {{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  color: var(--text);
  font-weight: 800;
  text-decoration: none;
}}

.button.primary {{
  color: #ffffff;
  border-color: transparent;
  background: linear-gradient(135deg, var(--accent), var(--accent-strong));
}}

.hero-visual, .feature-card, .content-band, .cta-section {{
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}}

.hero-visual {{
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
  min-height: 420px;
  align-content: end;
}}

.metric-card {{
  min-height: 120px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 72%, var(--accent) 8%);
}}

.metric-card.wide {{ grid-column: 1 / -1; }}
.metric-card strong {{ display: block; font-size: 1.8rem; }}
.metric-card span {{ color: var(--muted); }}

.feature-grid {{
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  padding: 0 clamp(18px, 5vw, 72px) clamp(42px, 8vw, 96px);
}}

.feature-card {{
  padding: 24px;
}}

.feature-card span {{
  color: var(--accent);
  font-weight: 900;
}}

.content-band {{
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
  gap: 24px;
  margin: 0 clamp(18px, 5vw, 72px) clamp(42px, 8vw, 96px);
  padding: clamp(24px, 5vw, 46px);
}}

.story-grid {{
  display: grid;
  gap: 14px;
}}

.story-grid article {{
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
}}

.cta-section {{
  margin: 0 clamp(18px, 5vw, 72px) 56px;
  padding: clamp(28px, 6vw, 64px);
  text-align: center;
}}

@media (max-width: 820px) {{
  .site-header, .hero, .content-band {{
    grid-template-columns: 1fr;
  }}
  .site-header {{
    align-items: flex-start;
    flex-direction: column;
  }}
  .feature-grid, .hero-visual {{
    grid-template-columns: 1fr;
  }}
  .hero {{
    min-height: auto;
  }}
}}"""

    js = """const header = document.querySelector(".site-header");
const links = document.querySelectorAll('a[href^="#"]');

links.forEach((link) => {
  link.addEventListener("click", (event) => {
    const target = document.querySelector(link.getAttribute("href"));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

window.addEventListener("scroll", () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}, { passive: true });

console.log("Generated by VERTEX AI OS Website Builder");"""

    return {
        "source": "local",
        "site_type": site_type,
        "theme": theme,
        "files": {
            "index.html": html,
            "style.css": css,
            "script.js": js
        }
    }


def validate_website_files(parsed):
    """Validate model output for the website builder endpoint."""
    if not isinstance(parsed, dict):
        raise ValueError("Website generator did not return an object")
    files = parsed.get("files", parsed)
    if not isinstance(files, dict):
        raise ValueError("Website generator did not return files")

    normalized_files = {}
    for file_name in ("index.html", "style.css", "script.js"):
        content = files.get(file_name)
        if not isinstance(content, str) or not content.strip():
            raise ValueError(f"Missing generated file: {file_name}")
        normalized_files[file_name] = content.strip()

    return normalized_files


def generate_ai_website(prompt, theme):
    """Generate website files with Groq and return None on any failure."""
    if not should_use_groq():
        return None

    try:
        client = create_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are the VERTEX AI OS Website Builder. Generate complete static website code. "
                        "Return only valid JSON with this exact shape: "
                        "{\"files\":{\"index.html\":\"...\",\"style.css\":\"...\",\"script.js\":\"...\"}}. "
                        "Do not use markdown fences. Do not include external paid assets. "
                        "The HTML must link to style.css and script.js. "
                        "Make the site responsive, polished, accessible, and appropriate for the selected theme."
                    )
                },
                {
                    "role": "user",
                    "content": (
                        f"User request: {prompt}\n"
                        f"Theme: {theme}\n"
                        "Create a single-page website with a hero, navigation, content sections, call to action, "
                        "and small JavaScript interactions. Keep the code concise enough for browser preview."
                    )
                }
            ],
            temperature=0.65,
            max_tokens=5000
        )
        content = response.choices[0].message.content
        parsed = extract_json_from_ai_response(content)
        return {
            "source": "groq",
            "site_type": infer_website_type(prompt),
            "theme": theme,
            "files": validate_website_files(parsed)
        }
    except Exception:
        return None


def build_website_preview_document(files):
    """Combine generated files into a preview document for iframe srcdoc."""
    html = files.get("index.html", "")
    css = files.get("style.css", "")
    js = files.get("script.js", "")
    html = re.sub(
        r'<link[^>]+href=["\']style\.css["\'][^>]*>',
        f"<style>{css}</style>",
        html,
        flags=re.IGNORECASE
    )
    html = re.sub(
        r'<script[^>]+src=["\']script\.js["\'][^>]*>\s*</script>',
        f"<script>{js}</script>",
        html,
        flags=re.IGNORECASE
    )

    if "<style>" not in html.lower():
        html = html.replace("</head>", f"<style>{css}</style></head>")
    if js and "Generated by VERTEX" not in html:
        html = html.replace("</body>", f"<script>{js}</script></body>")
    return html


@website_builder_bp.route("/website-builder")
def website_builder_page():
    """Render the isolated AI Website Builder module."""
    return render_template("website_builder.html")


@website_builder_bp.route("/api/website-builder/generate", methods=["POST"])
def website_builder_generate():
    """Generate website files for the isolated Website Builder module."""
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    theme = normalize_website_theme(data.get("theme", "modern"))

    if not prompt:
        return jsonify({"error": "Please describe the website you want to build."}), 400

    generated = generate_ai_website(prompt, theme) or build_local_website(prompt, theme)
    return jsonify(generated)


@website_builder_bp.route("/api/website-builder/preview", methods=["POST"])
def website_builder_preview():
    """Return a composed HTML preview document for generated website files."""
    data = request.get_json(silent=True) or {}
    files = data.get("files", {})

    try:
        normalized_files = validate_website_files(files)
    except ValueError as error:
        return jsonify({"error": str(error)}), 400

    return jsonify({"html": build_website_preview_document(normalized_files)})
