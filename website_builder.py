"""Isolated AI Website Studio module for VERTEX AI OS."""

import io
import json
import re
import textwrap
import zipfile
from datetime import datetime

from flask import Blueprint, jsonify, render_template, request, send_file

from chatbot import GROQ_MODEL, create_groq_client, should_use_groq


website_builder_bp = Blueprint("website_builder", __name__)

WEBSITE_STYLES = {
    "auto", "premium-saas", "minimal", "editorial", "corporate", "luxury",
    "startup", "futuristic-ai", "glassmorphism", "neo-brutalist",
    "creative-agency", "dark-professional", "light-modern", "gradient-rich",
    "portfolio", "ecommerce", "education", "restaurant", "cybersecurity",
    "developer-focused"
}

REQUIRED_FILES = ("index.html", "style.css", "script.js")
UNSAFE_PATTERNS = [
    r"<script[^>]+src\s*=\s*['\"](?!script\.js['\"])[^'\"]+['\"][^>]*>",
    r"\son[a-z]+\s*=",
    r"javascript\s*:",
    r"<iframe\b",
    r"<object\b",
    r"<embed\b",
    r"<form[^>]+action\s*=",
]


def clean_slug(value):
    slug = re.sub(r"[^a-z0-9]+", "-", str(value or "").lower()).strip("-")
    return slug[:48] or "vertex-site"


def escape_html(value):
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#039;")
    )


def normalize_style(style):
    clean_style = str(style or "auto").strip().lower()
    return clean_style if clean_style in WEBSITE_STYLES else "auto"


def extract_json_from_ai_response(content):
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


def infer_website_type(prompt, template="auto"):
    text = f"{template} {prompt}".lower()
    checks = [
        ("restaurant", ("restaurant", "cafe", "chef", "menu", "reservation", "dining")),
        ("portfolio", ("portfolio", "resume", "cloud engineer", "developer", "devops", "certification")),
        ("ecommerce", ("e-commerce", "ecommerce", "store", "shop", "fashion", "product categories")),
        ("education", ("education", "learning", "school", "course", "children", "students", "science")),
        ("cybersecurity", ("cybersecurity", "security", "threat", "soc", "zero trust")),
        ("blog", ("blog", "journal", "newsletter", "writer")),
        ("agency", ("agency", "studio", "creative", "consulting")),
        ("mobile-app", ("mobile app", "app landing", "ios", "android")),
        ("saas", ("saas", "startup", "ai startup", "software", "platform", "product demo")),
    ]
    for site_type, keywords in checks:
        if any(keyword in text for keyword in keywords):
            return site_type
    return "saas" if "ai" in text else "business"


def infer_style(prompt, site_type, requested_style="auto"):
    if requested_style != "auto":
        return requested_style
    text = str(prompt or "").lower()
    if "dark" in text or site_type in {"cybersecurity", "saas"}:
        return "dark-professional" if site_type == "cybersecurity" else "futuristic-ai"
    if "luxury" in text or site_type in {"restaurant", "ecommerce"}:
        return "luxury"
    if "colorful" in text or site_type == "education":
        return "gradient-rich"
    if site_type == "portfolio":
        return "developer-focused"
    if site_type == "agency":
        return "creative-agency"
    return "premium-saas"


def choose_brand(prompt, site_type):
    quoted = re.findall(r"['\"]([^'\"]{2,48})['\"]", str(prompt or ""))
    if quoted:
        return quoted[0].strip()
    title_words = re.findall(r"[A-Za-z0-9]+", re.sub(
        r"\b(create|build|make|design|website|site|landing|page|homepage|for|with|and|the|a|an|premium|luxury)\b",
        " ",
        str(prompt or ""),
        flags=re.IGNORECASE
    ))
    if 2 <= len(title_words) <= 4:
        return " ".join(title_words).title()
    brands = {
        "restaurant": "Saffron & Ember",
        "portfolio": "Arjun Cloudworks",
        "ecommerce": "Maison Vale",
        "education": "BrightLab Science",
        "cybersecurity": "SentinelGrid AI",
        "blog": "Signal Notes",
        "agency": "Northline Studio",
        "mobile-app": "PulsePocket",
        "saas": "NeuroForge",
        "business": "Vertex Works",
    }
    return brands.get(site_type, "Vertex Works")


def sections_for_type(site_type, prompt):
    section_map = {
        "restaurant": ["hero", "story", "menu", "chef", "gallery", "reservations", "reviews", "location"],
        "portfolio": ["hero", "about", "skills", "experience", "projects", "case-studies", "certifications", "contact"],
        "ecommerce": ["announcement", "hero", "categories", "featured-products", "editorial", "reviews", "newsletter", "footer"],
        "education": ["hero", "learning-paths", "courses", "instructors", "outcomes", "pricing", "faq", "enrollment"],
        "cybersecurity": ["hero", "threat-demo", "integrations", "security", "pricing", "testimonials", "faq", "cta"],
        "saas": ["hero", "product-demo", "logos", "features", "use-cases", "pricing", "testimonials", "faq", "cta"],
        "agency": ["hero", "services", "work", "process", "clients", "contact"],
        "blog": ["hero", "featured-posts", "topics", "editor-note", "newsletter"],
        "mobile-app": ["hero", "features", "screens", "reviews", "pricing", "download"],
        "business": ["hero", "services", "proof", "process", "testimonials", "contact"],
    }
    sections = list(section_map.get(site_type, section_map["business"]))
    text = str(prompt or "").lower()
    optional = {
        "pricing": "pricing",
        "faq": "faq",
        "gallery": "gallery",
        "testimonials": "testimonials",
        "reviews": "reviews",
        "contact": "contact",
    }
    for keyword, section in optional.items():
        if keyword in text and section not in sections:
            sections.insert(-1, section)
    return sections[:10]


def palette_for(style, site_type):
    palettes = {
        "luxury": ("#0f1115", "#17110f", "#f6efe4", "#d6a65d", "#8d6b41", "6px", "0 28px 90px rgba(0,0,0,.32)"),
        "dark-professional": ("#05070c", "#0d1424", "#edf6ff", "#34d399", "#38bdf8", "8px", "0 26px 80px rgba(20,184,166,.18)"),
        "futuristic-ai": ("#070714", "#11152b", "#f8fbff", "#7dd3fc", "#a78bfa", "12px", "0 30px 90px rgba(125,211,252,.2)"),
        "gradient-rich": ("#fff8ef", "#ffffff", "#172033", "#f97316", "#06b6d4", "18px", "0 20px 54px rgba(249,115,22,.16)"),
        "developer-focused": ("#0b1020", "#121a2f", "#eaf2ff", "#60a5fa", "#f59e0b", "6px", "0 22px 62px rgba(96,165,250,.16)"),
        "creative-agency": ("#fbfbf7", "#ffffff", "#171717", "#ef4444", "#111827", "2px", "0 18px 46px rgba(17,24,39,.12)"),
        "neo-brutalist": ("#fff6d7", "#ffffff", "#111111", "#ff3b30", "#1d4ed8", "0px", "8px 8px 0 #111111"),
        "minimal": ("#fbfaf7", "#ffffff", "#1f2937", "#111827", "#6b7280", "4px", "0 16px 42px rgba(17,24,39,.08)"),
        "ecommerce": ("#fff7f1", "#ffffff", "#261c1a", "#b45309", "#db2777", "10px", "0 24px 70px rgba(180,83,9,.14)"),
        "education": ("#f0fbff", "#ffffff", "#153243", "#0ea5e9", "#facc15", "20px", "0 20px 60px rgba(14,165,233,.15)"),
    }
    if site_type in palettes:
        return palettes[site_type]
    return palettes.get(style, ("#f5f7fb", "#ffffff", "#182033", "#2563eb", "#14b8a6", "8px", "0 22px 64px rgba(15,23,42,.12)"))


def build_plan(prompt, template="auto", style="auto", colors="auto", surprise=False):
    if surprise or not str(prompt or "").strip():
        prompt = "Create a premium AI operations platform for technical teams with product demo, proof, pricing, and CTA."
    site_type = infer_website_type(prompt, template)
    visual_style = infer_style(prompt, site_type, normalize_style(style))
    brand = choose_brand(prompt, site_type)
    sections = sections_for_type(site_type, prompt)
    audiences = {
        "restaurant": "local diners, event hosts, and food lovers",
        "portfolio": "recruiters, engineering managers, and technical founders",
        "ecommerce": "style-conscious shoppers",
        "education": "parents, children, and teachers",
        "cybersecurity": "security leaders and engineering teams",
        "saas": "software teams and founders",
    }
    tones = {
        "restaurant": "warm, sensory, and refined",
        "portfolio": "technical, credible, and concise",
        "ecommerce": "editorial, premium, and conversion-focused",
        "education": "bright, simple, and encouraging",
        "cybersecurity": "confident, precise, and security-first",
        "saas": "clear, ambitious, and product-led",
    }
    bg, surface, text, primary, accent, radius, shadow = palette_for(visual_style, site_type)
    if colors and colors != "auto":
        primary = colors
    return {
        "project_name": brand,
        "website_type": site_type,
        "audience": audiences.get(site_type, "decision makers and potential customers"),
        "brand_personality": tones.get(site_type, "professional, useful, and modern"),
        "tone": tones.get(site_type, "direct and trustworthy"),
        "style": visual_style,
        "sections": sections,
        "desired_actions": ["book", "buy", "contact", "start trial"] if site_type in {"restaurant", "ecommerce", "saas"} else ["explore", "contact"],
        "design_system": {
            "background": bg,
            "surface": surface,
            "text": text,
            "primary": primary,
            "accent": accent,
            "radius": radius,
            "shadow": shadow,
            "type_scale": "compact editorial" if site_type in {"restaurant", "ecommerce"} else "product UI scale",
            "animation": "fade-up, hover lift, counters, and reduced-motion support"
        }
    }


def copy_blocks(plan):
    brand = plan["project_name"]
    site_type = plan["website_type"]
    data = {
        "restaurant": {
            "tagline": "Seasonal dining with a firelit point of view.",
            "headline": f"{brand} turns dinner into a reservation-worthy ritual.",
            "body": "A refined neighborhood restaurant serving expressive plates, cellar-picked wines, and generous hospitality from first pour to final course.",
            "primary": "Reserve a Table",
            "secondary": "View Menu",
            "stats": [("18", "seasonal dishes"), ("4.9", "guest rating"), ("7", "nights open")],
            "items": ["Charred citrus sea bass", "Truffle mushroom risotto", "Rosemary lamb shoulder", "Cocoa olive oil tart"],
            "testimonials": ["Every course felt considered without feeling formal.", "The chef story and warm service made the night memorable."],
            "faqs": [("Do you accept private events?", "Yes, the dining room and chef table can be reserved for private dinners."), ("Are vegetarian options available?", "Yes, the menu includes seasonal vegetarian plates every service.")]
        },
        "portfolio": {
            "tagline": "Cloud systems, automation, and reliable delivery.",
            "headline": f"{brand} builds infrastructure that teams can trust.",
            "body": "A cloud engineer portfolio focused on AWS, Terraform, Kubernetes, CI/CD, observability, and pragmatic DevOps outcomes.",
            "primary": "View Projects",
            "secondary": "Contact",
            "stats": [("28", "deployments automated"), ("99.9%", "uptime targets"), ("6", "certifications")],
            "items": ["AWS landing zone", "Terraform module library", "Kubernetes rollout system", "CI/CD release dashboard"],
            "testimonials": ["Clear documentation, reliable automation, and production judgment.", "The project writeups make complex infrastructure easy to evaluate."],
            "faqs": [("Available for contract work?", "Yes, use the contact form to discuss DevOps, cloud, and platform projects."), ("Which tools are featured?", "AWS, Terraform, Kubernetes, Docker, GitHub Actions, Linux, and monitoring stacks.")]
        },
        "ecommerce": {
            "tagline": "Editorial style, premium materials, effortless shopping.",
            "headline": f"{brand} edits the season into pieces worth keeping.",
            "body": "A luxury commerce homepage with collection storytelling, polished product cards, social proof, and a newsletter built for repeat buyers.",
            "primary": "Shop Collection",
            "secondary": "Read Editorial",
            "stats": [("42", "new arrivals"), ("3", "signature edits"), ("Free", "returns")],
            "items": ["Silk evening set", "Tailored wool coat", "Minimal leather tote", "Soft cashmere knit"],
            "testimonials": ["The curation feels personal and expensive in the best way.", "Beautiful imagery, clear sizing, and a checkout path that feels calm."],
            "faqs": [("Do you ship internationally?", "Yes, international shipping is available with tracked delivery."), ("Can I return a product?", "Returns are accepted within 14 days when items are unworn.")]
        },
        "education": {
            "tagline": "Science lessons that feel like discovery.",
            "headline": f"{brand} helps children explore science through color, play, and experiments.",
            "body": "A cheerful learning website for young students with guided topics, friendly activities, outcome tracking, and parent-ready enrollment.",
            "primary": "Start Learning",
            "secondary": "Explore Lessons",
            "stats": [("60+", "mini lessons"), ("12", "science quests"), ("95%", "happy learners")],
            "items": ["Space explorer lab", "Electricity challenge", "Plant growth diary", "Weather maker activity"],
            "testimonials": ["My child finally asks to study science after school.", "The lessons are colorful, safe, and easy to follow."],
            "faqs": [("What ages is this for?", "The lessons work best for ages 7 to 13."), ("Are the experiments safe?", "Activities use simple household materials and adult guidance notes.")]
        },
        "cybersecurity": {
            "tagline": "AI threat intelligence for teams that cannot wait.",
            "headline": f"{brand} detects suspicious activity before it becomes a breach.",
            "body": "A cybersecurity landing page with live threat monitoring, integrations, response workflows, security proof, pricing, and a direct demo CTA.",
            "primary": "Book a Demo",
            "secondary": "View Threat Map",
            "stats": [("4.8M", "events analyzed"), ("12 min", "mean triage"), ("99.95%", "platform uptime")],
            "items": ["Threat graph", "Cloud log ingestion", "Incident timeline", "Automated response playbooks"],
            "testimonials": ["The demo made SOC workflows easier to understand in minutes.", "Signal quality improved while analyst fatigue dropped."],
            "faqs": [("Which tools integrate?", "AWS, Azure, GCP, Okta, GitHub, Slack, Jira, and common SIEM pipelines."), ("Is data encrypted?", "Yes, data is encrypted in transit and at rest with role-based controls.")]
        },
        "saas": {
            "tagline": "Turn operational complexity into a clean AI workflow.",
            "headline": f"{brand} gives modern teams a faster path from idea to execution.",
            "body": "A premium product landing page with a tangible demo, feature proof, use cases, pricing, and a confident signup journey.",
            "primary": "Start Free",
            "secondary": "Watch Demo",
            "stats": [("38%", "faster launches"), ("12k", "tasks automated"), ("24/7", "AI assistance")],
            "items": ["Workflow composer", "Team knowledge hub", "AI copilots", "Analytics command center"],
            "testimonials": ["The product narrative is clear and the CTA is impossible to miss.", "A polished SaaS page with enough detail to trust the platform."],
            "faqs": [("Can we try it free?", "Yes, the starter workspace is designed for evaluation before purchase."), ("Does it support teams?", "Yes, shared projects, roles, and approvals are included.")]
        },
    }
    return data.get(site_type, data["saas"])


def image_for(site_type):
    images = {
        "restaurant": ("https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1400&q=80", "Elegant restaurant table with plated food"),
        "portfolio": ("https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80", "Modern engineering workspace"),
        "ecommerce": ("https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80", "Premium fashion retail display"),
        "education": ("https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80", "Children learning in a bright classroom"),
        "cybersecurity": ("https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1400&q=80", "Cybersecurity operations display"),
        "saas": ("https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80", "Analytics dashboard on a computer screen"),
    }
    return images.get(site_type, images["saas"])


def nav_for_sections(sections):
    labels = {
        "hero": "Home", "story": "Story", "menu": "Menu", "chef": "Chef", "gallery": "Gallery",
        "reservations": "Reserve", "reviews": "Reviews", "location": "Visit", "about": "About",
        "skills": "Skills", "experience": "Experience", "projects": "Projects", "case-studies": "Cases",
        "certifications": "Certs", "contact": "Contact", "categories": "Categories",
        "featured-products": "Products", "editorial": "Editorial", "newsletter": "Newsletter",
        "learning-paths": "Paths", "courses": "Courses", "instructors": "Mentors",
        "outcomes": "Outcomes", "pricing": "Pricing", "faq": "FAQ", "threat-demo": "Demo",
        "integrations": "Integrations", "security": "Security", "product-demo": "Demo",
        "features": "Features", "use-cases": "Use Cases", "cta": "Start"
    }
    links = []
    for section in sections:
        if section in {"announcement", "footer"}:
            continue
        links.append(f'<a href="#{section}">{labels.get(section, section.replace("-", " ").title())}</a>')
    return "\n        ".join(links[:7])


def card_html(items, class_name="studio-card"):
    return "\n".join(
        f'<article class="{class_name} reveal"><span>{index:02d}</span><h3>{escape_html(item)}</h3><p>{escape_html(sentence_for(item))}</p></article>'
        for index, item in enumerate(items, start=1)
    )


def sentence_for(item):
    return {
        "AWS landing zone": "Secure multi-account foundations with practical guardrails and reusable modules.",
        "Terraform module library": "Reusable infrastructure patterns that keep teams fast without losing review quality.",
        "Kubernetes rollout system": "Progressive delivery, health checks, rollback habits, and production visibility.",
        "CI/CD release dashboard": "A clear release view for builds, tests, deployments, and owners.",
        "Threat graph": "Correlate identities, workloads, and events into one investigation surface.",
        "Cloud log ingestion": "Connect cloud, identity, endpoint, and application signals without brittle pipelines.",
        "Incident timeline": "Give analysts the context they need to act without digging through noisy logs.",
        "Automated response playbooks": "Trigger guided containment workflows with human approval built in.",
    }.get(item, f"Purpose-built details for {item.lower()} with clear value and polished presentation.")


def section_markup(section, plan, copy):
    brand = escape_html(plan["project_name"])
    site_type = plan["website_type"]
    image_url, image_alt = image_for(site_type)
    items = copy["items"]
    if section == "announcement":
        return '<div class="announcement">New seasonal edit available now. Free shipping on orders over $150.</div>'
    if section == "hero":
        visual = (
            f'<img src="{image_url}" alt="{escape_html(image_alt)}" loading="eager">'
            if site_type in {"restaurant", "ecommerce", "education", "portfolio"} else
            '<div class="signal-orbit" aria-hidden="true"><span></span><span></span><span></span></div>'
        )
        return f"""<section id="hero" class="hero section-{site_type}">
      <div class="hero-copy reveal">
        <p class="eyebrow">{escape_html(copy["tagline"])}</p>
        <h1>{escape_html(copy["headline"])}</h1>
        <p>{escape_html(copy["body"])}</p>
        <div class="hero-actions">
          <a class="button primary" href="#cta">{escape_html(copy["primary"])}</a>
          <a class="button secondary" href="#{plan["sections"][2] if len(plan["sections"]) > 2 else "features"}">{escape_html(copy["secondary"])}</a>
        </div>
      </div>
      <div class="hero-visual reveal">{visual}</div>
    </section>"""
    if section in {"menu", "projects", "featured-products", "courses", "features", "integrations", "services", "categories", "learning-paths", "use-cases"}:
        return f"""<section id="{section}" class="content-section">
      <div class="section-kicker">Selected {escape_html(section.replace("-", " "))}</div>
      <h2>{section_title(section, site_type)}</h2>
      <div class="card-grid">{card_html(items)}</div>
    </section>"""
    if section in {"story", "about", "chef", "editorial", "security", "product-demo", "threat-demo"}:
        return f"""<section id="{section}" class="split-section">
      <div class="reveal">
        <p class="section-kicker">{escape_html(section.replace("-", " ").title())}</p>
        <h2>{section_title(section, site_type)}</h2>
        <p>{escape_html(long_copy(site_type, section, brand))}</p>
      </div>
      <div class="proof-panel reveal">
        {''.join(f'<p><strong>{escape_html(a)}</strong><span>{escape_html(b)}</span></p>' for a, b in copy["stats"])}
      </div>
    </section>"""
    if section in {"gallery", "screens"}:
        return f"""<section id="{section}" class="gallery-section">
      <p class="section-kicker">Visual System</p>
      <h2>{section_title(section, site_type)}</h2>
      <div class="gallery-grid">
        <img src="{image_url}" alt="{escape_html(image_alt)}" loading="lazy">
        <div class="visual-tile">01</div><div class="visual-tile">02</div><div class="visual-tile">03</div>
      </div>
    </section>"""
    if section in {"pricing"}:
        return f"""<section id="pricing" class="content-section pricing-section">
      <p class="section-kicker">Plans</p>
      <h2>Choose the path that fits your next move.</h2>
      <div class="pricing-grid">
        {pricing_cards(site_type)}
      </div>
    </section>"""
    if section in {"testimonials", "reviews"}:
        return f"""<section id="{section}" class="content-section">
      <p class="section-kicker">Trusted Feedback</p>
      <h2>Proof from people who care about the details.</h2>
      <div class="quote-grid">{''.join(f'<blockquote class="reveal">{escape_html(q)}<cite>{brand} customer</cite></blockquote>' for q in copy["testimonials"])}</div>
    </section>"""
    if section == "faq":
        return f"""<section id="faq" class="content-section faq-section">
      <p class="section-kicker">FAQ</p>
      <h2>Answers before the next click.</h2>
      {''.join(f'<details class="reveal"><summary>{escape_html(q)}</summary><p>{escape_html(a)}</p></details>' for q, a in copy["faqs"])}
    </section>"""
    if section in {"reservations", "contact", "newsletter", "enrollment", "cta", "download", "location"}:
        return f"""<section id="{section}" class="cta-section reveal">
      <p class="section-kicker">{escape_html(section.replace("-", " ").title())}</p>
      <h2>{cta_title(site_type)}</h2>
      <p>{escape_html(cta_body(site_type))}</p>
      <form class="contact-form" aria-label="{escape_html(section)} form">
        <label>Name<input type="text" name="name" autocomplete="name" placeholder="Your name"></label>
        <label>Email<input type="email" name="email" autocomplete="email" placeholder="you@example.com"></label>
        <button class="button primary" type="submit">{escape_html(copy["primary"])}</button>
      </form>
    </section>"""
    if section in {"skills", "experience", "certifications", "outcomes", "instructors", "logos", "proof", "process", "clients"}:
        return f"""<section id="{section}" class="content-section compact-section">
      <p class="section-kicker">{escape_html(section.replace("-", " ").title())}</p>
      <h2>{section_title(section, site_type)}</h2>
      <div class="pill-row">{''.join(f'<span>{escape_html(item)}</span>' for item in items)}</div>
    </section>"""
    return ""


def section_title(section, site_type):
    titles = {
        "menu": "A menu shaped by the season, not a template.",
        "projects": "Infrastructure work with outcomes, not just tools.",
        "featured-products": "A collection built for browsing and buying.",
        "courses": "Guided lessons that turn curiosity into confidence.",
        "features": "Product capabilities visitors can understand quickly.",
        "integrations": "Connect the tools your team already trusts.",
        "story": "A brand story with texture, purpose, and proof.",
        "about": "The engineering judgment behind the work.",
        "chef": "Chef-led details that make the experience personal.",
        "editorial": "A shopping experience with a point of view.",
        "security": "Security posture that earns buyer confidence.",
        "product-demo": "A product demo that makes the value tangible.",
        "threat-demo": "Threat monitoring shown as a living system.",
        "gallery": "Visual moments that make the brand feel real.",
        "skills": "A practical stack for modern cloud teams.",
        "experience": "Experience presented for fast technical scanning.",
        "certifications": "Proof points for recruiters and platform teams.",
        "outcomes": "Learning outcomes parents and students can see.",
        "instructors": "Friendly guides for every learning path.",
    }
    return titles.get(section, f"{section.replace('-', ' ').title()} designed for {site_type.replace('-', ' ')}.")


def long_copy(site_type, section, brand):
    return {
        "restaurant": f"{brand} pairs polished service with ingredient-led cooking, giving guests a place that feels special without becoming stiff.",
        "portfolio": f"{brand} focuses on reliable systems, readable automation, and documentation that helps teams operate with less friction.",
        "ecommerce": f"{brand} uses editorial rhythm, product clarity, and confident merchandising to make each collection easier to trust.",
        "education": f"{brand} turns lessons into small discoveries with clear explanations, playful activities, and visible progress.",
        "cybersecurity": f"{brand} brings signals, context, and response workflows together so security teams can move with precision.",
        "saas": f"{brand} makes the product feel concrete with proof, workflows, and practical reasons to start now.",
    }.get(site_type, f"{brand} presents the offer with clear copy, focused visuals, and useful next steps.")


def pricing_cards(site_type):
    plans = [
        ("Starter", "$19", "Launch with the essentials and a clear upgrade path."),
        ("Growth", "$79", "Add advanced workflows, analytics, and priority support."),
        ("Scale", "Custom", "Custom onboarding, governance, integrations, and success planning."),
    ]
    if site_type == "restaurant":
        plans = [("Chef Table", "$95", "A focused tasting experience."), ("Private Room", "$700", "A hosted dinner for groups."), ("Events", "Custom", "Full-service celebrations.")]
    if site_type == "education":
        plans = [("Explorer", "$12", "Weekly science activities."), ("Lab Plus", "$29", "Projects, quizzes, and progress."), ("School", "Custom", "Classroom-ready learning paths.")]
    return "".join(f'<article class="price-card reveal"><h3>{name}</h3><strong>{price}</strong><p>{desc}</p><a class="button secondary" href="#cta">Choose {name}</a></article>' for name, price, desc in plans)


def cta_title(site_type):
    return {
        "restaurant": "Reserve the table before the next service fills.",
        "portfolio": "Start a conversation about the next platform problem.",
        "ecommerce": "Join the list for first access to new edits.",
        "education": "Start a science path that feels fun from day one.",
        "cybersecurity": "See how the threat workflow performs on real signals.",
        "saas": "Turn the product idea into a working workflow.",
    }.get(site_type, "Take the next step with confidence.")


def cta_body(site_type):
    return {
        "restaurant": "Share your preferred date and party size. The team will confirm availability.",
        "portfolio": "Send a short note about the role, project, or infrastructure challenge.",
        "ecommerce": "Get early access, editorial notes, and collection updates without inbox noise.",
        "education": "Choose a learning path and receive a simple plan for the first week.",
        "cybersecurity": "Book a focused walkthrough of detection, triage, and response workflows.",
        "saas": "Start with a guided demo and a practical workspace plan.",
    }.get(site_type, "Send a short message and the team will reply with the right next step.")


def build_local_website(prompt, style="auto", template="auto", colors="auto", sections=None, surprise=False):
    plan = build_plan(prompt, template, style, colors, surprise)
    if sections:
        requested_sections = [clean_slug(section) for section in sections if str(section).strip()]
        if requested_sections:
            plan["sections"] = requested_sections
    copy = copy_blocks(plan)
    brand = escape_html(plan["project_name"])
    ds = plan["design_system"]
    nav = nav_for_sections(plan["sections"])
    section_html = "\n\n    ".join(section_markup(section, plan, copy) for section in plan["sections"])
    section_html = "\n\n    ".join(block for block in section_html.split("\n\n    ") if block.strip())
    readme = build_readme(plan)

    html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{brand}</title>
  <meta name="description" content="{escape_html(copy["body"])}">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="brand" href="#hero" aria-label="{brand} home">{brand}</a>
    <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">Menu</button>
    <nav class="site-nav" aria-label="Primary navigation">
        {nav}
    </nav>
  </header>

  <main id="main">
    {section_html}
  </main>

  <footer class="site-footer">
    <strong>{brand}</strong>
    <p>{escape_html(copy["tagline"])}</p>
    <small>Built as a static website with HTML, CSS, and JavaScript.</small>
  </footer>

  <script src="script.js"></script>
</body>
</html>"""

    css = build_css(plan, ds)
    js = build_js()
    files = {"index.html": html, "style.css": css, "script.js": js, "README.md": readme}
    validation = validate_website_files(files)
    return {
        "source": "local",
        "project_name": plan["project_name"],
        "summary": f"{plan['project_name']} is a {plan['style']} {plan['website_type']} website for {plan['audience']}.",
        "plan": plan,
        "design_system": ds,
        "files": {name: files[name] for name in REQUIRED_FILES},
        "readme": readme,
        "validation": validation,
    }


def build_css(plan, ds):
    body_class = plan["website_type"]
    return f""":root {{
  --background: {ds["background"]};
  --surface: {ds["surface"]};
  --primary: {ds["primary"]};
  --accent: {ds["accent"]};
  --text: {ds["text"]};
  --muted: color-mix(in srgb, var(--text) 68%, transparent);
  --line: color-mix(in srgb, var(--text) 14%, transparent);
  --radius: {ds["radius"]};
  --shadow: {ds["shadow"]};
  --max: 1180px;
}}

* {{ box-sizing: border-box; }}
html {{ scroll-behavior: smooth; }}
body {{
  margin: 0;
  overflow-x: hidden;
  color: var(--text);
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 16%, transparent), transparent 34rem),
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--accent) 14%, transparent), transparent 30rem),
    var(--background);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.6;
}}

img {{ display: block; max-width: 100%; }}
a {{ color: inherit; }}
button, input {{ font: inherit; }}
:focus-visible {{ outline: 3px solid var(--accent); outline-offset: 3px; }}
.skip-link {{ position: absolute; left: -999px; top: 12px; padding: 10px 14px; background: var(--surface); z-index: 20; }}
.skip-link:focus {{ left: 12px; }}

.site-header {{
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px clamp(18px, 5vw, 64px);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 86%, transparent);
  backdrop-filter: blur(18px);
}}
.brand {{ font-weight: 900; text-decoration: none; }}
.site-nav {{ display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }}
.site-nav a {{ color: var(--muted); font-size: .92rem; font-weight: 800; text-decoration: none; }}
.site-nav a:hover {{ color: var(--text); }}
.nav-toggle {{ display: none; border: 1px solid var(--line); border-radius: var(--radius); padding: 9px 12px; color: var(--text); background: var(--surface); }}

section {{ max-width: var(--max); margin: 0 auto; padding: clamp(52px, 8vw, 104px) clamp(18px, 5vw, 32px); }}
.hero {{
  display: grid;
  grid-template-columns: minmax(0, 1.04fr) minmax(280px, .96fr);
  gap: clamp(28px, 5vw, 76px);
  align-items: center;
  min-height: 86vh;
  max-width: 1260px;
}}
.hero-copy h1 {{
  margin: 0 0 18px;
  font-size: clamp(2.7rem, 7vw, 6.6rem);
  line-height: .95;
  letter-spacing: 0;
}}
.hero-copy p:not(.eyebrow), .split-section p, .cta-section > p {{ max-width: 680px; color: var(--muted); font-size: 1.06rem; }}
.eyebrow, .section-kicker {{ margin: 0 0 12px; color: var(--primary); font-size: .76rem; font-weight: 950; letter-spacing: .08em; text-transform: uppercase; }}
.hero-actions, .pill-row {{ display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; }}
.button {{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-weight: 900;
  text-decoration: none;
  transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
}}
.button:hover {{ transform: translateY(-2px); box-shadow: var(--shadow); }}
.button.primary {{ color: #fff; border-color: transparent; background: linear-gradient(135deg, var(--primary), var(--accent)); }}
.button.secondary {{ background: color-mix(in srgb, var(--surface) 78%, transparent); }}

.hero-visual {{
  min-height: 430px;
  border: 1px solid var(--line);
  border-radius: calc(var(--radius) + 10px);
  background: color-mix(in srgb, var(--surface) 84%, transparent);
  box-shadow: var(--shadow);
  overflow: hidden;
}}
.hero-visual img {{ width: 100%; height: 100%; min-height: 430px; object-fit: cover; }}
.signal-orbit {{ position: relative; min-height: 430px; background: linear-gradient(145deg, color-mix(in srgb, var(--primary) 18%, transparent), color-mix(in srgb, var(--accent) 14%, transparent)); }}
.signal-orbit span {{ position: absolute; inset: 18%; border: 1px solid color-mix(in srgb, var(--primary) 54%, transparent); border-radius: 999px; animation: orbitPulse 4s ease-in-out infinite; }}
.signal-orbit span:nth-child(2) {{ inset: 30%; animation-delay: .5s; }}
.signal-orbit span:nth-child(3) {{ inset: 42%; animation-delay: 1s; background: var(--primary); box-shadow: 0 0 44px var(--primary); }}

.content-section h2, .split-section h2, .gallery-section h2, .cta-section h2 {{
  max-width: 760px;
  margin: 0 0 22px;
  font-size: clamp(2rem, 4vw, 4.4rem);
  line-height: 1;
}}
.card-grid, .pricing-grid, .quote-grid {{
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}}
.studio-card, .price-card, blockquote, details, .proof-panel, .visual-tile {{
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  box-shadow: var(--shadow);
}}
.studio-card, .price-card {{ padding: 22px; }}
.studio-card span {{ color: var(--primary); font-weight: 950; }}
.studio-card h3, .price-card h3 {{ margin: 10px 0 8px; }}
.studio-card p, .price-card p {{ color: var(--muted); margin: 0; }}
.split-section {{
  display: grid;
  grid-template-columns: minmax(0, .85fr) minmax(280px, 1.15fr);
  gap: 26px;
  align-items: center;
}}
.proof-panel {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; padding: 8px; }}
.proof-panel p {{ margin: 0; padding: 18px; }}
.proof-panel strong {{ display: block; font-size: 1.8rem; }}
.proof-panel span {{ color: var(--muted); }}
.gallery-grid {{ display: grid; grid-template-columns: 1.2fr .8fr .8fr; gap: 14px; }}
.gallery-grid img, .visual-tile {{ min-height: 240px; border-radius: var(--radius); object-fit: cover; }}
.visual-tile {{ display: grid; place-items: center; color: #fff; font-size: 2rem; font-weight: 950; background: linear-gradient(135deg, var(--primary), var(--accent)); }}
.price-card strong {{ display: block; margin: 8px 0 12px; font-size: 2.4rem; }}
blockquote {{ margin: 0; padding: 24px; color: var(--text); }}
blockquote cite {{ display: block; margin-top: 18px; color: var(--muted); font-style: normal; font-weight: 800; }}
details {{ padding: 18px 20px; margin: 10px 0; }}
summary {{ cursor: pointer; font-weight: 900; }}
.pill-row span {{ border: 1px solid var(--line); border-radius: 999px; padding: 9px 13px; background: var(--surface); font-weight: 800; }}
.cta-section {{ text-align: center; }}
.cta-section > p {{ margin-left: auto; margin-right: auto; }}
.contact-form {{ display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; max-width: 820px; margin: 26px auto 0; text-align: left; }}
.contact-form label {{ display: grid; gap: 6px; color: var(--muted); font-weight: 800; }}
.contact-form input {{ min-height: 46px; border: 1px solid var(--line); border-radius: var(--radius); padding: 0 12px; color: var(--text); background: var(--surface); }}
.site-footer {{ display: flex; justify-content: space-between; gap: 18px; padding: 28px clamp(18px, 5vw, 64px); border-top: 1px solid var(--line); color: var(--muted); }}

.section-restaurant {{ grid-template-columns: .8fr 1.2fr; }}
.section-ecommerce {{ grid-template-columns: .9fr 1.1fr; }}
.section-education .hero-copy h1 {{ color: #153243; }}
.announcement {{ padding: 12px 18px; text-align: center; color: #fff; background: var(--primary); font-weight: 900; }}

.reveal {{ opacity: 0; transform: translateY(18px); transition: opacity .55s ease, transform .55s ease; }}
.reveal.is-visible {{ opacity: 1; transform: none; }}
@keyframes orbitPulse {{ 0%, 100% {{ transform: scale(.96); opacity: .66; }} 50% {{ transform: scale(1.04); opacity: 1; }} }}

@media (max-width: 860px) {{
  .site-header {{ align-items: flex-start; }}
  .nav-toggle {{ display: inline-flex; }}
  .site-nav {{ display: none; width: 100%; flex-direction: column; align-items: flex-start; }}
  .site-nav.is-open {{ display: flex; }}
  .hero, .split-section, .contact-form {{ grid-template-columns: 1fr; min-height: auto; }}
  .card-grid, .pricing-grid, .quote-grid, .proof-panel, .gallery-grid {{ grid-template-columns: 1fr; }}
  .site-footer {{ flex-direction: column; }}
}}

@media (prefers-reduced-motion: reduce) {{
  *, *::before, *::after {{ animation: none !important; scroll-behavior: auto !important; transition: none !important; }}
  .reveal {{ opacity: 1; transform: none; }}
}}
/* VERTEX generated style: {body_class} */"""


def build_js():
    return """const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.site-nav');
const header = document.querySelector('.site-header');

navToggle?.addEventListener('click', () => {
  const open = !nav?.classList.contains('is-open');
  nav?.classList.toggle('is-open', open);
  navToggle.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nav?.classList.remove('is-open');
    navToggle?.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('is-visible');
  });
}, { threshold: 0.16 });

document.querySelectorAll('.reveal').forEach((item) => observer.observe(item));

window.addEventListener('scroll', () => {
  header?.classList.toggle('is-scrolled', window.scrollY > 20);
}, { passive: true });

document.querySelectorAll('form').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const button = form.querySelector('button');
    if (button) button.textContent = 'Request received';
  });
});

console.log('Generated by VERTEX AI Website Studio');"""


def build_readme(plan):
    return f"""# {plan["project_name"]}

Generated by VERTEX AI Website Studio.

## Open locally

Open `index.html` in a browser. The project uses only static HTML, CSS, and JavaScript.

## Files

- `index.html`
- `style.css`
- `script.js`

## Plan

- Type: {plan["website_type"]}
- Audience: {plan["audience"]}
- Style: {plan["style"]}
- Sections: {", ".join(plan["sections"])}
"""


def strip_unsafe_html(html):
    cleaned = str(html or "")
    for pattern in UNSAFE_PATTERNS:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
    return cleaned


def validate_website_files(payload):
    files = payload.get("files", payload) if isinstance(payload, dict) else {}
    normalized = {}
    warnings = []
    errors = []
    for file_name in REQUIRED_FILES:
        content = files.get(file_name)
        if not isinstance(content, str) or not content.strip():
            errors.append(f"Missing generated file: {file_name}")
        else:
            normalized[file_name] = content.strip()

    html = normalized.get("index.html", "")
    css = normalized.get("style.css", "")
    js = normalized.get("script.js", "")
    if html:
        html = strip_unsafe_html(html)
        normalized["index.html"] = html
        checks = [
            ("<!doctype html" in html.lower() or "<html" in html.lower(), "HTML document structure"),
            ("viewport" in html.lower(), "mobile viewport meta tag"),
            ("<h1" in html.lower(), "primary heading"),
            ("href=\"#" in html.lower() or "class=\"button" in html.lower(), "at least one CTA"),
            ("lorem ipsum" not in html.lower(), "no lorem ipsum"),
            (not re.search(r"\b(add description|your tagline here|feature one|company name|placeholder text|lorem)\b", html, re.IGNORECASE), "no unresolved placeholders"),
            ("<script src=\"script.js\"" in html.lower() or "<script src='script.js'" in html.lower(), "script.js linked"),
            ("style.css" in html.lower(), "style.css linked"),
        ]
        for passed, label in checks:
            if not passed:
                warnings.append(f"Check needs attention: {label}")
    if css and css.count("{") != css.count("}"):
        errors.append("CSS braces are unbalanced")
    if js and re.search(r"\b(fetch|XMLHttpRequest)\s*\(", js):
        warnings.append("Generated JavaScript performs a network request")
    if any(re.search(pattern, html, re.IGNORECASE) for pattern in UNSAFE_PATTERNS):
        errors.append("Unsafe HTML pattern detected")

    status = "failed" if errors else "warning" if warnings else "passed"
    return {
        "status": status,
        "errors": errors,
        "warnings": warnings,
        "passed": [
            "Required files present",
            "Frontend-only preview",
            "Responsive viewport",
            "No lorem ipsum",
            "Static export ready",
        ] if not errors else []
    }


def require_valid_files(files):
    validation = validate_website_files(files)
    if validation["errors"]:
        raise ValueError("; ".join(validation["errors"]))
    return {name: strip_unsafe_html(files[name]).strip() if name == "index.html" else files[name].strip() for name in REQUIRED_FILES}, validation


def generate_ai_website(prompt, style, template, colors, sections, surprise):
    if not should_use_groq():
        return None
    plan = build_plan(prompt, template, style, colors, surprise)
    try:
        client = create_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are VERTEX AI Website Studio. Return only valid JSON with keys: "
                        "project_name, summary, plan, design_system, files. files must include index.html, style.css, script.js. "
                        "Generate meaningful original copy, varied sections, semantic HTML, responsive CSS variables, accessible controls, "
                        "alt text, mobile navigation, tasteful animations, no lorem ipsum, no placeholders, no external scripts, no iframes, "
                        "and no unsafe user-content injection. Link style.css and script.js from HTML."
                    )
                },
                {
                    "role": "user",
                    "content": json.dumps({
                        "request": prompt,
                        "plan": plan,
                        "selected_sections": sections,
                        "instruction": "Create a distinct, polished static website matching the plan. Keep code compact enough for browser preview."
                    })
                }
            ],
            temperature=0.72,
            max_tokens=6500
        )
        parsed = extract_json_from_ai_response(response.choices[0].message.content)
        files, validation = require_valid_files(parsed.get("files", {}))
        return {
            "source": "groq",
            "project_name": parsed.get("project_name") or plan["project_name"],
            "summary": parsed.get("summary") or f"Generated {plan['website_type']} website.",
            "plan": parsed.get("plan") if isinstance(parsed.get("plan"), dict) else plan,
            "design_system": parsed.get("design_system") if isinstance(parsed.get("design_system"), dict) else plan["design_system"],
            "files": files,
            "readme": build_readme(plan),
            "validation": validation,
        }
    except Exception:
        return None


def edit_existing_project(instruction, project, selected_section=""):
    files = dict(project.get("files") or {})
    plan = project.get("plan") or build_plan(project.get("summary", ""))
    text = str(instruction or "").lower()
    selected = clean_slug(selected_section) if selected_section else ""
    html = files.get("index.html", "")
    css = files.get("style.css", "")

    if "light" in text:
        css = re.sub(r"--background:\s*[^;]+;", "--background: #f7f9fc;", css)
        css = re.sub(r"--surface:\s*[^;]+;", "--surface: #ffffff;", css)
        css = re.sub(r"--text:\s*[^;]+;", "--text: #172033;", css)
    if "blue" in text or "purple" in text:
        css = re.sub(r"--primary:\s*[^;]+;", "--primary: #2563eb;", css)
        css = re.sub(r"--accent:\s*[^;]+;", "--accent: #8b5cf6;", css)
    if "rounded" in text:
        css = re.sub(r"--radius:\s*[^;]+;", "--radius: 18px;", css)
    if "bigger" in text and selected:
        css += f"\n#{selected} .button, #{selected} h1, #{selected} h2 {{ transform: scale(1.03); transform-origin: left center; }}\n"
    if "hide" in text and selected:
        css += f"\n#{selected} {{ display: none; }}\n"
    if "contact form" in text and "id=\"contact\"" not in html:
        insert = section_markup("contact", plan, copy_blocks(plan))
        html = html.replace("</main>", f"{insert}\n  </main>")
    if "pricing" in text and "id=\"pricing\"" not in html:
        insert = section_markup("pricing", plan, copy_blocks(plan))
        html = html.replace("</main>", f"{insert}\n  </main>")
    if "gallery" in text and "id=\"gallery\"" not in html:
        insert = section_markup("gallery", plan, copy_blocks(plan))
        html = html.replace("</main>", f"{insert}\n  </main>")
    if "brand name" in text or "change the brand" in text:
        match = re.search(r"(?:to|name)\s+([A-Z][A-Za-z0-9 &-]{2,40})", instruction)
        if match:
            new_brand = escape_html(match.group(1).strip())
            old_brand = escape_html(str(plan.get("project_name", "")))
            html = html.replace(old_brand, new_brand)
            plan["project_name"] = new_brand
    if "professional" in text:
        html = html.replace("Start Learning", "Request Access").replace("Shop Collection", "Explore Collection")
    if "animation" in text:
        css += "\n.button.primary { animation: ctaGlow 3s ease-in-out infinite; }\n@keyframes ctaGlow { 0%,100% { box-shadow: none; } 50% { box-shadow: 0 0 34px color-mix(in srgb, var(--primary) 45%, transparent); } }\n"
    files.update({"index.html": html, "style.css": css})
    validation = validate_website_files(files)
    return {
        **project,
        "source": "local-edit",
        "summary": f"Edited project: {instruction}",
        "plan": plan,
        "files": {name: files[name] for name in REQUIRED_FILES},
        "validation": validation,
    }


def build_website_preview_document(files):
    normalized, _ = require_valid_files(files)
    html = normalized["index.html"]
    css = normalized["style.css"]
    js = normalized["script.js"]
    html = re.sub(r'<link[^>]+href=["\']style\.css["\'][^>]*>', f"<style>{css}</style>", html, flags=re.IGNORECASE)
    html = re.sub(r'<script[^>]+src=["\']script\.js["\'][^>]*>\s*</script>', f"<script>{js}</script>", html, flags=re.IGNORECASE)
    if "<style>" not in html.lower():
        html = html.replace("</head>", f"<style>{css}</style></head>")
    if js and "<script>" not in html.lower():
        html = html.replace("</body>", f"<script>{js}</script></body>")
    return html


@website_builder_bp.route("/website-builder")
def website_builder_page():
    return render_template("website_builder.html")


@website_builder_bp.route("/api/website-builder/generate", methods=["POST"])
def website_builder_generate():
    data = request.get_json(silent=True) or {}
    prompt = str(data.get("prompt", "")).strip()
    style = normalize_style(data.get("style") or data.get("theme") or "auto")
    template = str(data.get("template", "auto")).strip().lower() or "auto"
    colors = str(data.get("colors", "auto")).strip() or "auto"
    sections = data.get("sections") if isinstance(data.get("sections"), list) else []
    surprise = bool(data.get("surprise"))
    if not prompt and not surprise:
        return jsonify({"error": "Describe the website or choose Surprise me."}), 400
    generated = (
        generate_ai_website(prompt, style, template, colors, sections, surprise)
        or build_local_website(prompt, style, template, colors, sections, surprise)
    )
    return jsonify(generated)


@website_builder_bp.route("/api/website-builder/edit", methods=["POST"])
def website_builder_edit():
    data = request.get_json(silent=True) or {}
    instruction = str(data.get("instruction", "")).strip()
    project = data.get("project") if isinstance(data.get("project"), dict) else {}
    selected_section = str(data.get("selected_section", "")).strip()
    if not instruction:
        return jsonify({"error": "Tell VERTEX what to change."}), 400
    if not project.get("files"):
        return jsonify({"error": "Generate a website before editing."}), 400
    return jsonify(edit_existing_project(instruction, project, selected_section))


@website_builder_bp.route("/api/website-builder/validate", methods=["POST"])
def website_builder_validate():
    data = request.get_json(silent=True) or {}
    files = data.get("files", {})
    return jsonify(validate_website_files(files))


@website_builder_bp.route("/api/website-builder/preview", methods=["POST"])
def website_builder_preview():
    data = request.get_json(silent=True) or {}
    try:
        return jsonify({"html": build_website_preview_document(data.get("files", {}))})
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@website_builder_bp.route("/api/website-builder/download", methods=["POST"])
def website_builder_download():
    data = request.get_json(silent=True) or {}
    project_name = clean_slug(data.get("project_name", "vertex-site"))
    files, _ = require_valid_files(data.get("files", {}))
    readme = str(data.get("readme") or "# Generated Website\n\nOpen index.html in a browser.\n")
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_name, content in files.items():
            archive.writestr(file_name, content)
        archive.writestr("README.md", readme)
        archive.writestr("assets/.gitkeep", "")
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"{project_name}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.zip",
    )
