"""Generates the downloadable PDF resume for the portfolio site.

Run:  python3 tools/make_resume.py
Output: assets/resume/Tabe-Miracle-Fiagmenyi-Resume.pdf
"""
from __future__ import annotations

import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Flowable,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "assets",
    "resume",
    "Tabe-Miracle-Fiagmenyi-Resume.pdf",
)

INK = colors.HexColor("#0E1420")
MUTED = colors.HexColor("#5A6478")
ACCENT = colors.HexColor("#3F6FE0")
ACCENT_2 = colors.HexColor("#00C2A8")
RULE = colors.HexColor("#D8DEE9")

NAME = "TABE MIRACLE FIAGMENYI"
ROLE = "Full-Stack & Applied AI Engineer"
CONTACT = [
    "Buea, Cameroon",
    "(+237) 680-553-744",
    "tabe7143@gmail.com",
    "linkedin.com/in/tabe-miracle-fiagmenyi",
    "github.com/dontman-tech",
]

SUMMARY = (
    "Computer engineering student and full-stack developer who ships complete products end to end "
    "\u2014 Python and TypeScript services, React/Next.js and React Native front ends, and "
    "voice/vision pipelines running on-device. Comfortable taking an idea from a blank repo to a "
    "working MVP under hackathon deadlines, and I care about the unglamorous parts: graceful "
    "degradation, offline paths, and interfaces a first-time user understands without a manual."
)

EXPERIENCE = [
    (
        "Front-End Developer Intern",
        "CIRCO Orange Internship (Ignite Circle) \u00b7 Buea, Cameroon",
        "July 2026 \u00b7 Remote / Collaborative",
        [
            "Collaborated on front-end features using modern web frameworks, improving overall site "
            "performance and UI responsiveness.",
            "Built the Next.js 16 / React 19 / Tailwind 4 client for a multi-contributor product, "
            "landing a green-theme design system with reusable components.",
            "Worked to a shared AGENTS.md and branching convention inside a distributed team; reviewed "
            "and integrated peers' work rather than working in isolation.",
        ],
    ),
    (
        "Freelance & Open Source",
        "Selected client and community work",
        "2024 \u2014 Present",
        [
            "NESAC Password Strength Checker \u2014 Flask + vanilla JS tool that scores passwords, "
            "explains the weakness in plain language, and suggests a stronger passphrase.",
            "Air Canvas \u2014 MediaPipe/OpenCV gesture drawing app with a five-gesture mode system "
            "and sub-frame latency tuning.",
        ],
    ),
]

AWARDS = [
    (
        "3rd Place \u2014 Orange Code for Change Hackathon",
        "Buea, Cameroon",
        [
            "Co-developed Re-kollect, a functional MVP built within 12 hours alongside a team of 4.",
            "Integrated frontend and backend workflows using JavaScript, React, Node.js and Python.",
        ],
    ),
    (
        "4th Place Finalist \u2014 Prometheus AI Hackathon",
        "Buea, Cameroon",
        [
            "Architected and deployed Lumina, an AI-driven platform created in 15 hours with a "
            "3-person team.",
            "Connected Supabase and the DeepSeek API to process dynamic user requests under tight "
            "time constraints.",
        ],
    ),
]

PROJECTS = [
    (
        "ARIA \u2014 Voice AI Assistant",
        "Python \u00b7 Kotlin \u00b7 PWA \u00b7 Flask",
        "Voice-first assistant with a modular skill router (regex + keyword confidence scoring), "
        "long-term memory, and an Android bridge server that exposes wifi, flashlight, alarms and "
        "screenshots to the host. Graceful degradation throughout: no microphone falls back to text, "
        "no API key falls back to a deterministic offline mode.",
    ),
    (
        "Re-kollect \u2014 Waste Collection Marketplace",
        "Flutter \u00b7 Dart \u00b7 Firebase \u00b7 OSM",
        "Two-sided marketplace connecting waste generators to independent collectors. Role-based "
        "phone auth, Firestore-backed request lifecycle, map pinning with Nominatim geocoding, "
        "real-time collector dashboard, FCM topic fan-out, and native dialer hand-off.",
    ),
    (
        "Lumina \u2014 AI-Driven Platform",
        "Supabase \u00b7 DeepSeek API \u00b7 JavaScript",
        "AI-driven platform built for the Prometheus AI Hackathon in 15 hours with a three-person "
        "team. Supabase and the DeepSeek API are wired together to process dynamic user requests "
        "under tight time constraints.",
    ),
    (
        "Ignite Circle \u2014 Front End",
        "Next.js 16 \u00b7 React 19 \u00b7 Tailwind 4 \u00b7 Zustand",
        "Multi-contributor Next.js client built on a shared component library and Zustand state "
        "model, delivered inside a distributed team to a common design language.",
    ),
    (
        "Pulse Fit \u2014 Cross-Platform Fitness Tracker",
        "React Native \u00b7 Expo \u00b7 Reanimated \u00b7 HealthKit",
        "Workout plans, guided live sessions and animated progress rings with bidirectional Apple "
        "HealthKit / Google Fit sync, plus a simulated data fallback so every screen stays usable "
        "without native modules.",
    ),
    (
        "Air Canvas \u2014 Gesture Drawing",
        "Python \u00b7 MediaPipe \u00b7 OpenCV",
        "Draw in the air with hand gestures. A five-state mode machine (draw / hover / erase / "
        "palette / clear) driven purely by finger counts and pinch detection, tuned for real-time "
        "tracking on commodity webcams.",
    ),
    (
        "NESAC \u2014 Password Strength Checker",
        "Python \u00b7 Flask \u00b7 JavaScript",
        "Web application that helps users create strong passwords and test the strength of their "
        "current ones, explaining each weakness in plain language and suggesting a stronger "
        "passphrase.",
    ),
]

STACK = [
    ("Languages", "Python, JavaScript, Kotlin, Node.js, Dart, SQL"),
    ("Front end", "React 19, Next.js 16, React Native, Expo, Tailwind 4, HTML/CSS"),
    ("Back end & data", "Flask, FastAPI, Node, Supabase, Firebase (Auth/Firestore/FCM), SQLite, REST"),
    ("AI & vision", "DeepSeek API, OpenAI, Claude, Ollama, prompt engineering, MediaPipe, OpenCV"),
    ("Tooling & cloud", "Git, Docker, Linux, Vercel, CI via GitHub Actions"),
    ("Soft skills", "Public speaking, teamwork, problem solving, bilingual (English & French)"),
]

EDUCATION = [
    "Bachelor of Engineering (B.Eng.) in Computer Engineering \u2014 University of Buea, Faculty of "
    "Engineering and Technology (FET), Buea, Cameroon.",
]

COMMUNITY = [
    "Active Member, Cybersecurity Club \u2014 University of Buea. Core digital security fundamentals, "
    "vulnerability awareness and web protective practices.",
    "Workshop Participant, Renewable Energy Summit 2026 \u2014 technical sessions organised by the "
    "University of Buea Renewable Energy Club at FET.",
    "Social Impact Volunteer, MIMIO NGO \u2014 local community outreach initiatives and event "
    "organisation support.",
    "Open-source and community builds published at github.com/dontman-tech.",
]


class HRule(Flowable):
    def __init__(self, width, color=RULE, thickness=0.6, space_before=0, space_after=0):
        super().__init__()
        self.width = width
        self.color = color
        self.thickness = thickness
        self.space_before = space_before
        self.space_after = space_after

    def wrap(self, availWidth, availHeight):
        return (self.width, self.thickness + self.space_before + self.space_after)

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        y = self.space_after
        self.canv.line(0, y, self.width, y)


def build_styles():
    ss = getSampleStyleSheet()
    return {
        "name": ParagraphStyle(
            "name", parent=ss["Title"], fontName="Helvetica-Bold", fontSize=22,
            leading=24, textColor=INK, spaceAfter=0, alignment=TA_LEFT,
        ),
        "role": ParagraphStyle(
            "role", fontName="Helvetica", fontSize=11.4, leading=15,
            textColor=ACCENT, spaceBefore=3,
        ),
        "contact": ParagraphStyle(
            "contact", fontName="Helvetica", fontSize=8.9, leading=13.4, textColor=MUTED,
        ),
        "h2": ParagraphStyle(
            "h2", fontName="Helvetica-Bold", fontSize=9.1, leading=11,
            textColor=INK, spaceBefore=0, spaceAfter=0,
        ),
        "body": ParagraphStyle(
            "body", fontName="Helvetica", fontSize=9.1, leading=13.6, textColor=INK,
        ),
        "muted": ParagraphStyle(
            "muted", fontName="Helvetica", fontSize=9.1, leading=13.6, textColor=MUTED,
        ),
        "bullet": ParagraphStyle(
            "bullet", fontName="Helvetica", fontSize=9.1, leading=13.4, textColor=INK,
            leftIndent=9, bulletIndent=1.5, spaceAfter=2.4,
        ),
        "jobtitle": ParagraphStyle(
            "jobtitle", fontName="Helvetica-Bold", fontSize=10.6, leading=13, textColor=INK,
        ),
        "jobmeta": ParagraphStyle(
            "jobmeta", fontName="Helvetica", fontSize=8.6, leading=11.6, textColor=MUTED,
        ),
        "projtitle": ParagraphStyle(
            "projtitle", fontName="Helvetica-Bold", fontSize=9.8, leading=12, textColor=INK,
        ),
        "projstack": ParagraphStyle(
            "projstack", fontName="Helvetica-Oblique", fontSize=8.2, leading=11, textColor=ACCENT_2,
        ),
        "label": ParagraphStyle(
            "label", fontName="Helvetica-Bold", fontSize=8.3, leading=11.6, textColor=MUTED,
        ),
        "value": ParagraphStyle(
            "value", fontName="Helvetica", fontSize=8.9, leading=12.4, textColor=INK,
        ),
    }


def section(title, width, st):
    return [
        Spacer(1, 9),
        Paragraph(title.upper(), st["h2"]),
        Spacer(1, 2.6),
        HRule(width, color=ACCENT, thickness=1.1),
        Spacer(1, 5.5),
    ]


def on_page(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(ACCENT)
    canvas.rect(0, h - 6, w, 6, stroke=0, fill=1)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.4)
    canvas.drawString(doc.leftMargin, 11 * mm, NAME + " \u2014 " + ROLE)
    canvas.drawRightString(w - doc.rightMargin, 11 * mm, "Page %d" % canvas.getPageNumber())
    canvas.setStrokeColor(RULE)
    canvas.setLineWidth(0.5)
    canvas.line(doc.leftMargin, 13.6 * mm, w - doc.rightMargin, 13.6 * mm)
    canvas.restoreState()


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    doc = BaseDocTemplate(
        OUT,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=13 * mm,
        bottomMargin=17 * mm,
        title="%s \u2014 %s" % (NAME, ROLE),
        author=NAME,
        subject="Resume",
    )
    frame = Frame(
        doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="body",
        leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
    )
    doc.addPageTemplates([PageTemplate(id="main", frames=[frame], onPage=on_page)])

    st = build_styles()
    W = doc.width
    story = []

    story.append(Paragraph(NAME, st["name"]))
    story.append(Paragraph(ROLE, st["role"]))
    story.append(Spacer(1, 4))
    story.append(Paragraph(" &nbsp;\u00b7&nbsp; ".join(CONTACT), st["contact"]))
    story.append(Spacer(1, 5))
    story.append(HRule(W, color=RULE, thickness=0.6))

    story += section("Profile", W, st)
    story.append(Paragraph(SUMMARY, st["body"]))

    story += section("Experience", W, st)
    for title, org, when, bullets in EXPERIENCE:
        story.append(Paragraph(title, st["jobtitle"]))
        story.append(Paragraph("%s<br/>%s" % (org, when), st["jobmeta"]))
        story.append(Spacer(1, 3))
        for b in bullets:
            story.append(Paragraph(b, st["bullet"], bulletText="\u2022"))
        story.append(Spacer(1, 6))

    story += section("Hackathons & Awards", W, st)
    for title, when, bullets in AWARDS:
        story.append(Paragraph(title, st["jobtitle"]))
        story.append(Paragraph(when, st["jobmeta"]))
        story.append(Spacer(1, 3))
        for b in bullets:
            story.append(Paragraph(b, st["bullet"], bulletText="\u2022"))
        story.append(Spacer(1, 6))

    story += section("Selected Projects", W, st)
    for title, stack, desc in PROJECTS:
        story.append(Paragraph(title, st["projtitle"]))
        story.append(Paragraph(stack, st["projstack"]))
        story.append(Spacer(1, 1.6))
        story.append(Paragraph(desc, st["muted"]))
        story.append(Spacer(1, 5.5))

    story += section("Technical Toolkit", W, st)
    rows = [
        [Paragraph(k, st["label"]), Paragraph(v, st["value"])] for k, v in STACK
    ]
    table = Table(rows, colWidths=[30 * mm, W - 30 * mm])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 1.8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8),
            ]
        )
    )
    story.append(table)

    story += section("Education", W, st)
    for b in EDUCATION:
        story.append(Paragraph(b, st["bullet"], bulletText="\u2022"))

    story += section("Community & Leadership", W, st)
    for b in COMMUNITY:
        story.append(Paragraph(b, st["bullet"], bulletText="\u2022"))

    doc.build(story)
    print("wrote", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
