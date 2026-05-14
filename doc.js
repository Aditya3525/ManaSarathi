const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, Header, Footer,
  TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Colour palette ───────────────────────────────────────────────────────────
const BLUE      = "1F3864";   // deep navy
const ACCENT    = "2E75B6";   // mid blue
const LIGHT_BG  = "DEE8F0";   // light blue tint (header rows)
const WHITE     = "FFFFFF";
const BLACK     = "000000";
const GREY_TEXT = "444444";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sp = (pt) => ({ before: pt * 20, after: pt * 20 });
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

function h(text, level, opts = {}) {
  return new Paragraph({
    heading: level,
    spacing: sp(6),
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [new TextRun({ text, bold: true, font: "Arial" })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80, line: 360 },
    children: [new TextRun({
      text,
      size: opts.size || 22,
      bold: opts.bold || false,
      color: opts.color || BLACK,
      font: "Arial"
    })]
  });
}

function bold(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, bold: true, size: opts.size || 22, font: "Arial" })]
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial" })]
  });
}

function blank(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun("")] }));
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function centeredBold(text, size = 24) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, bold: true, size, font: "Arial" })]
  });
}

function centeredText(text, size = 22) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size, font: "Arial" })]
  });
}

// ─── Table helpers ────────────────────────────────────────────────────────────
function headerCell(text, w) {
  return new TableCell({
    borders: BORDERS,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 20, font: "Arial" })]
    })]
  });
}

function dataCell(text, w, center = false) {
  return new TableCell({
    borders: BORDERS,
    width: { size: w, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 20, font: "Arial" })]
    })]
  });
}

function simpleTable(cols, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: cols.map((c, i) => headerCell(c, colWidths[i])) }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => dataCell(cell, colWidths[i], true))
      }))
    ]
  });
}

// ─── Section divider line ─────────────────────────────────────────────────────
function divider() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 1 } },
    children: [new TextRun("")]
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  BUILD DOCUMENT
// ═══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      },
      {
        reference: "numbers",
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } }
        }, {
          level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1080, hanging: 360 } } }
        }]
      }
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22, color: BLACK } } },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, color: BLUE, font: "Arial" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: ACCENT, space: 4 } } }
      },
      {
        id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, color: ACCENT, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 }
      },
      {
        id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: GREY_TEXT, font: "Arial" },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 }
      }
    ]
  },
  sections: [
    // ═══════════════════════════════════════════════════════════════════════════
    //  SECTION 1 — Title Page, Certificate, Acknowledgement, Abstract, Index
    // ═══════════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 }
        }
      },
      children: [
        // ── Title Page ─────────────────────────────────────────────────────
        ...blank(1),
        centeredBold("A PROJECT REPORT ON", 22),
        ...blank(1),
        centeredBold("MaanSarathi", 52),
        ...blank(1),
        centeredBold("An AI-Powered Mental Wellbeing Platform", 28),
        ...blank(2),
        centeredText("SUBMITTED TO THE SAVITRIBAI PHULE PUNE UNIVERSITY, PUNE", 20),
        centeredText("IN THE PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE AWARD OF THE DEGREE OF", 20),
        ...blank(1),
        centeredBold("BACHELOR OF ENGINEERING", 26),
        centeredBold("IN", 22),
        centeredBold("INFORMATION TECHNOLOGY", 26),
        ...blank(2),
        centeredBold("SUBMITTED BY", 22),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[Team Member 1]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                         Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[Team Member 2]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                         Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[Team Member 3]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                         Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[Team Member 4]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                         Seat No: _________", size: 22, font: "Arial" })]
        }),
        ...blank(2),
        centeredBold("UNDER THE GUIDANCE OF", 20),
        centeredBold("[Guide Name]", 24),
        ...blank(2),
        centeredBold("DEPARTMENT OF INFORMATION TECHNOLOGY", 22),
        centeredBold("[College Name], PUNE", 22),
        centeredBold("SAVITRIBAI PHULE PUNE UNIVERSITY", 22),
        centeredBold("ACADEMIC YEAR 2024-25", 22),

        // ── Certificate ────────────────────────────────────────────────────
        pageBreak(),
        divider(),
        centeredBold("CERTIFICATE", 36),
        divider(),
        ...blank(1),
        p("This is to certify that the project report entitled", { center: true }),
        ...blank(1),
        centeredBold('"MaanSarathi — An AI-Powered Mental Wellbeing Platform"', 24),
        ...blank(1),
        centeredText("Submitted by", 20),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[Team Member 1]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[Team Member 2]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[Team Member 3]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "[Team Member 4]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                Seat No: _________", size: 22, font: "Arial" })]
        }),
        ...blank(1),
        p("is a bonafide work carried out by them under the supervision of [Guide Name] and it is approved for the partial fulfillment of the requirement of Savitribai Phule Pune University, for the award of the degree of Bachelor of Engineering (INFORMATION TECHNOLOGY).", { center: true }),
        ...blank(3),
        new Paragraph({
          children: [
            new TextRun({ text: "[Guide Name]", bold: true, size: 22, font: "Arial" }),
            new TextRun({ text: "                              [H.O.D. Name]                              [Principal Name]", size: 22, font: "Arial" })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Guide                                        H.O.D.                                            Principal", size: 22, font: "Arial" })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: "Dept. of IT                                Dept. of IT                                    [College]", size: 22, font: "Arial" })
          ]
        }),
        ...blank(2),
        p("Place: Pune"),
        p("Date:  /  / 2025"),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "External Examiner                  Project Coordinator", size: 22, font: "Arial" })]
        }),

        // ── Acknowledgement ────────────────────────────────────────────────
        pageBreak(),
        h("ACKNOWLEDGEMENT", HeadingLevel.HEADING_1, { center: true }),
        ...blank(1),
        p("We hereby take this opportunity to record our sincere thanks and heartfelt gratitude to [Guide Name] for their useful guidance and for making available their intimate knowledge and experience in the making of \"MaanSarathi — An AI-Powered Mental Wellbeing Platform\", as well as in the preparation of this project report."),
        ...blank(1),
        p("We are also thankful to our respective H.O.D. [H.O.D. Name] of the Information Technology department. We express our special thanks and heartfelt gratitude to our respective staff members for inspiring us throughout the completion of this system."),
        ...blank(1),
        p("This acknowledgement will be incomplete if we do not record our sense of gratitude to our principal [Principal Name], [College Name], Pune. We also express our sincere thanks to all those — the management, lab assistants, friends, and family — who have provided us with valuable guidance towards the completion of this presentation as part of the syllabus of the course."),
        ...blank(1),
        p("We express our sincere gratitude towards the co-operative department who have provided us with valuable assistance and requirements for the presentation."),
        ...blank(2),
        bold("Project Group Members:"),
        ...blank(1),
        new Paragraph({
          children: [new TextRun({ text: "[Team Member 1]                                           Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          children: [new TextRun({ text: "[Team Member 2]                                           Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          children: [new TextRun({ text: "[Team Member 3]                                           Seat No: _________", size: 22, font: "Arial" })]
        }),
        new Paragraph({
          children: [new TextRun({ text: "[Team Member 4]                                           Seat No: _________", size: 22, font: "Arial" })]
        }),

        // ── Abstract ───────────────────────────────────────────────────────
        pageBreak(),
        h("ABSTRACT", HeadingLevel.HEADING_1, { center: true }),
        ...blank(1),
        p("MaanSarathi is an AI-powered comprehensive mental wellbeing platform designed to bridge the gap between self-care and professional mental health support. The platform addresses the growing global need for accessible, personalised, and continuous mental health assistance by combining a context-aware conversational AI companion, clinical assessment tools, mood and habit tracking, and professional therapist oversight into a single integrated system."),
        ...blank(1),
        p("The system leverages a multi-provider Large Language Model (LLM) architecture, supporting providers such as Google Gemini, OpenAI GPT, Anthropic Claude, Hugging Face, and NVIDIA inference endpoints, with an automatic fallback mechanism for high availability. A robust crisis detection module continuously analyses user messages using sentiment analysis and keyword matching to identify potential mental health emergencies, triggering de-escalation exercises or clinical escalation as appropriate."),
        ...blank(1),
        p("The platform features long-term conversation memory that tracks emotional patterns, therapeutic goals, and action items across sessions, providing continuity of care. Standardised clinical assessments — including GAD-2, PHQ-9, and various psychometric tools — are scored and interpreted automatically, generating wellness scores and AI-driven insights. A personalised recommendation engine suggests mindfulness practices, cognitive behavioural therapy (CBT) resources, audio meditations, and breathing exercises based on the user's current mood, assessment results, and engagement history."),
        ...blank(1),
        p("On the technical side, the backend is built with Express.js and TypeScript, using Prisma ORM with PostgreSQL in production. The web frontend is developed with React 18 and Vite, while a React Native/Expo mobile application is maintained in the same monorepo. User authentication is handled via JWT and Google OAuth, and role-based access control supports three distinct user types: end-users, therapists, and administrators."),
        ...blank(1),
        p("MaanSarathi represents a novel contribution to digital mental health by combining multi-LLM orchestration, crisis safety logic, long-term therapeutic tracking, and clinical oversight into a single, maintainable platform accessible to all."),
        ...blank(2),
        bold("Keywords: "),
        p("Mental Health, AI Chatbot, Large Language Models, Crisis Detection, Mood Tracking, Clinical Assessments, CBT, React, Express.js, Prisma, PostgreSQL, Multi-Provider LLM, Sentiment Analysis, Personalised Recommendations."),

        // ── Index / Table of Contents ──────────────────────────────────────
        pageBreak(),
        h("INDEX", HeadingLevel.HEADING_1, { center: true }),
        ...blank(1),
        simpleTable(
          ["Sr. No.", "Title of Chapter", "Page No."],
          [
            ["01", "Introduction", "01"],
            ["", "1.1 Background and Motivation", "01"],
            ["", "1.2 Objectives of the Project", "03"],
            ["", "1.3 Organization of the Report", "04"],
            ["02", "Literature Survey", "05"],
            ["03", "Software Requirements Specification", "11"],
            ["", "3.1 Introduction", "11"],
            ["", "3.2 Problem Statement", "11"],
            ["", "3.3 Project Scope", "12"],
            ["", "3.4 User Classes and Characteristics", "12"],
            ["", "3.5 Functional Requirements", "13"],
            ["", "3.6 Non-Functional Requirements", "14"],
            ["", "3.7 System Requirements", "15"],
            ["04", "System Design", "16"],
            ["", "4.1 System Architecture", "16"],
            ["", "4.2 Data Flow Diagrams", "17"],
            ["", "4.3 UML Diagrams", "19"],
            ["05", "Project Plan", "26"],
            ["06", "Implementation", "29"],
            ["", "6.1 Module Description", "29"],
            ["", "6.2 Algorithms and AI Logic", "31"],
            ["", "6.3 Tools and Technologies", "34"],
            ["", "6.4 Sample Code", "36"],
            ["", "6.5 Result Set / Screenshots", "40"],
            ["07", "Testing", "41"],
            ["08", "Conclusion", "44"],
            ["09", "References", "45"],
          ],
          [1200, 6600, 1560]
        ),

        // ── Chapter 1: Introduction ────────────────────────────────────────
        pageBreak(),
        h("CHAPTER 1", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("INTRODUCTION", 32),
        divider(),
        ...blank(1),
        h("1.1 Background and Motivation", HeadingLevel.HEADING_2),
        ...blank(1),
        bold("World-Wide Scenario"),
        p("Mental health has emerged as one of the most pressing global healthcare challenges of the twenty-first century. According to the World Health Organization (WHO), approximately one in eight people worldwide live with a mental disorder, yet a significant treatment gap persists — particularly in low- and middle-income countries. Stigma, lack of awareness, prohibitive costs of therapy, and a global shortage of mental health professionals mean that the majority of individuals who need support never receive it."),
        ...blank(1),
        p("The rapid advancement of Artificial Intelligence (AI), particularly in the domain of Natural Language Processing (NLP) and conversational AI, has opened new avenues for mental health support. AI-powered conversational agents can offer 24/7 empathetic interaction, personalised psychoeducation, and guided self-care — lowering barriers for individuals who cannot or do not seek in-person help. When augmented with clinical assessment tools and therapist oversight, such systems have the potential to meaningfully extend the reach of professional mental healthcare."),
        ...blank(1),
        bold("Scenario in India"),
        p("India faces a particularly acute mental health crisis. With an estimated 150 million people in need of mental health services and only about 9,000 psychiatrists serving a population of 1.4 billion, the psychiatrist-to-patient ratio is approximately 1:10,000 — far below the WHO-recommended ratio. Cultural stigma further inhibits help-seeking behaviour, especially among youth and in rural populations."),
        ...blank(1),
        p("Smartphone penetration in India has surpassed 700 million users, and internet connectivity continues to expand rapidly. This creates a unique opportunity for a digital mental health platform that can be accessed in one's native language and cultural context, without the need to identify oneself to a professional initially. MaanSarathi (meaning 'guide of the mind' or 'charioteer of the soul' in Sanskrit) is designed precisely for this context — providing an accessible, private, and empathetic digital companion that can scale across India and beyond."),
        ...blank(1),
        bold("Need for the Project"),
        p("Existing digital mental health solutions suffer from several limitations: they either offer simple rule-based chatbots with limited contextual understanding, or they are expensive clinical platforms inaccessible to general users. Few systems integrate conversational AI, standardised clinical assessments, long-term mood and habit tracking, crisis safety protocols, and professional therapist oversight into a single, cohesive platform."),
        ...blank(1),
        p("MaanSarathi addresses this gap by building a full-stack, modular platform that supports the complete spectrum of mental health engagement — from anonymous self-reflection and mood journaling, through clinical assessment and AI-guided CBT exercises, to direct access to verified therapists."),

        h("1.2 Objectives of the Project", HeadingLevel.HEADING_2),
        p("The primary objectives of MaanSarathi are as follows:"),
        ...blank(1),
        numbered("To develop a context-aware, empathetic AI conversational companion using a multi-provider LLM architecture (Google Gemini, OpenAI, Anthropic Claude, Hugging Face) with automatic failover for high availability."),
        numbered("To implement a robust crisis detection pipeline that analyses user messages for distress signals and responds with de-escalation resources or clinical escalation pathways."),
        numbered("To build a long-term conversation memory system that tracks emotional patterns, therapeutic goals, important life events, and action items across sessions."),
        numbered("To provide standardised clinical assessment tools (GAD-2, PHQ-9, Big Five personality, emotional intelligence assessments) with automated scoring, interpretation, and trend analysis."),
        numbered("To develop a personalised recommendation engine that suggests mindfulness practices, CBT exercises, breathing techniques, audio meditations, and content resources based on the user's mood, assessment results, and engagement history."),
        numbered("To implement comprehensive daily tracking modules for mood, sleep, journaling, habits, gratitude, and daily intentions, with visualised progress and AI-generated insights."),
        numbered("To create a secure therapist portal that enables clinicians to view patient progress notes, manage appointment bookings, and leave clinical notes — preserving appropriate data access controls."),
        numbered("To design an admin portal for content curation, assessment management, platform analytics, user management, and system health monitoring."),

        h("1.3 Organization of the Report", HeadingLevel.HEADING_2),
        numbered("Chapter 2 covers the Literature Survey — prior work in digital mental health, AI chatbots, and LLM applications in wellbeing."),
        numbered("Chapter 3 presents the Software Requirements Specification (SRS), including problem statement, scope, and functional and non-functional requirements."),
        numbered("Chapter 4 details the System Design — architecture, data flow diagrams, and UML diagrams."),
        numbered("Chapter 5 describes the Project Plan — effort estimates, risk management, and timeline."),
        numbered("Chapter 6 covers Implementation — modules, algorithms, tools, sample code, and screenshots."),
        numbered("Chapter 7 discusses Testing methodologies and test cases."),
        numbered("Chapter 8 presents the Conclusion and future scope."),
        numbered("Chapter 9 lists References."),

        // ── Chapter 2: Literature Survey ──────────────────────────────────
        pageBreak(),
        h("CHAPTER 2", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("LITERATURE SURVEY", 32),
        divider(),
        ...blank(1),
        h("2.1 Literature Survey", HeadingLevel.HEADING_2),
        p("Research on AI-assisted mental health systems has grown substantially over the past decade. This section reviews key studies and existing systems relevant to MaanSarathi, organised by theme."),
        ...blank(1),
        bold("2.1.1 AI Chatbots for Mental Health Support"),
        p("Woebot (Fitzpatrick et al., 2017) demonstrated that a rule-based chatbot delivering Cognitive Behavioural Therapy (CBT) techniques over two weeks produced significant reductions in depression and anxiety symptoms compared to control groups. The study highlighted the potential of always-available digital companions to provide psychological first aid. However, Woebot relied on scripted decision trees, limiting its conversational naturalness."),
        ...blank(1),
        p("Vaidyam et al. (2019) conducted a systematic review of chatbot applications in mental health, identifying 13 platforms. They found that while chatbots showed promise for psychoeducation and symptom monitoring, most lacked longitudinal memory, crisis detection, and integration with professional care pathways — gaps that MaanSarathi explicitly addresses."),
        ...blank(1),
        bold("2.1.2 Large Language Models in Healthcare"),
        p("With the emergence of transformer-based LLMs such as GPT-3 (Brown et al., 2020), BERT (Devlin et al., 2019), and more recently GPT-4 and Claude, the conversational quality of AI agents has improved dramatically. Yang et al. (2022) explored the use of GPT-3 for generating empathetic responses in mental health dialogues, finding that appropriately prompted LLMs produce responses comparable to human counsellors on empathy scales."),
        ...blank(1),
        p("A critical challenge identified in LLM deployments for healthcare is hallucination and factual inconsistency (Singhal et al., 2022). MaanSarathi addresses this by using structured system prompts, explicit therapeutic role-playing guidelines, and by relying on LLMs primarily for empathetic dialogue rather than clinical diagnosis. Additionally, the multi-provider fallback mechanism ensures service continuity when any single provider experiences downtime."),
        ...blank(1),
        bold("2.1.3 Crisis Detection and Safety Systems"),
        p("Coppersmith et al. (2018) demonstrated that machine learning models trained on social media data can detect suicidal ideation with reasonable sensitivity. Liu et al. (2020) proposed a multi-modal crisis detection framework combining keyword matching, sentiment analysis, and intent classification. MaanSarathi's crisis detection module draws on these principles, combining keyword lists, real-time sentiment scoring, and AI-evaluated severity thresholds, with crisis events persisted to the database for follow-up."),
        ...blank(1),
        bold("2.1.4 Mood Tracking and Digital Phenotyping"),
        p("Mohr et al. (2017) introduced the concept of digital phenotyping — using passive smartphone data to infer mental health states. Mood tracking applications such as Daylio and MoodPath have demonstrated that structured daily mood logs correlate with clinically validated depression and anxiety measures. MaanSarathi extends this approach by combining explicit mood logging with sleep logs, habit tracking, and AI-generated pattern summaries, providing richer longitudinal data for both users and therapists."),
        ...blank(1),
        bold("2.1.5 Clinical Assessment Tools in Digital Platforms"),
        p("Validated instruments such as the PHQ-9 for depression (Kroenke et al., 2001) and the GAD-7 for anxiety (Spitzer et al., 2006) have been adapted for digital administration. Titov et al. (2018) demonstrated that online administration of these tools produces psychometrically equivalent results to paper-based administration. MaanSarathi incorporates these instruments alongside Big Five personality assessments and emotional intelligence scales, with automated scoring and trend analysis."),
        ...blank(1),
        bold("2.1.6 Personalised Recommendation in Mental Health"),
        p("Collaborative filtering and content-based recommendation techniques have been applied to mental health content delivery (Torous et al., 2020). MaanSarathi's EnhancedRecommendationService derives focus areas from assessment scores, sentiment keywords, and mood trends, then ranks practices and content items by relevance — a hybrid approach combining rule-based filtering with AI-generated contextual reasoning."),
        ...blank(1),
        bold("2.1.7 Therapist-Patient Digital Integration"),
        p("Telehealth platforms such as BetterHelp and Talkspace have shown that online therapist-patient matching and video-based therapy sessions are effective and accessible (Luo et al., 2020). MaanSarathi complements this with a therapist portal that surfaces AI-generated summaries of patient progress, enabling clinicians to spend less time on information gathering and more on therapeutic interaction."),
        ...blank(1),
        bold("Summary"),
        p("While individual components of MaanSarathi's functionality have been explored in the literature, no existing open-source or widely-adopted platform integrates multi-LLM orchestration, crisis detection, long-term memory, clinical assessments, mood tracking, personalised recommendations, and therapist oversight into a single maintainable codebase. MaanSarathi fills this gap."),
        ...blank(1),
        simpleTable(
          ["Sr. No.", "Author(s) / Year", "Contribution", "Gap Addressed"],
          [
            ["1", "Fitzpatrick et al. (2017)", "CBT chatbot (Woebot) reduces anxiety/depression", "No LLM, no memory"],
            ["2", "Vaidyam et al. (2019)", "Systematic review of mental health chatbots", "Lacks crisis detection"],
            ["3", "Yang et al. (2022)", "GPT-3 for empathetic responses", "No multi-provider fallback"],
            ["4", "Liu et al. (2020)", "Multi-modal crisis detection framework", "Not integrated with care"],
            ["5", "Mohr et al. (2017)", "Digital phenotyping for mental health", "No therapist portal"],
            ["6", "Torous et al. (2020)", "Recommendation in mental health apps", "No clinical integration"],
            ["7", "Luo et al. (2020)", "Online therapist-patient therapy", "No AI progress summaries"],
          ],
          [900, 2160, 3600, 2700]
        ),

        // ── Chapter 3: SRS ────────────────────────────────────────────────
        pageBreak(),
        h("CHAPTER 3", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("SOFTWARE REQUIREMENTS SPECIFICATION", 32),
        divider(),

        h("3.1 Introduction", HeadingLevel.HEADING_2),
        p("This Software Requirements Specification (SRS) provides a comprehensive description of the MaanSarathi platform to be developed. It defines the functional and non-functional requirements, system constraints, hardware and software needs, and the scope of the project. The document serves as a contract between the development team and stakeholders, forming the basis for system design, implementation, and testing."),

        h("3.2 Problem Statement", HeadingLevel.HEADING_2),
        p("The current landscape of mental health support applications suffers from four core limitations:"),
        ...blank(1),
        numbered("Shallow AI interaction: Most chatbots use rule-based or single-provider AI models that lack contextual memory, therapeutic depth, and resilience under high load."),
        numbered("No safety infrastructure: Few platforms implement structured crisis detection with escalation pathways, placing vulnerable users at risk."),
        numbered("Siloed data: Self-care apps, clinical assessments, and therapist communication exist in separate silos, providing an incomplete picture of patient wellbeing."),
        numbered("No professional integration: Consumer apps do not offer therapist portals, clinical notes, or supervised care pathways."),
        ...blank(1),
        p("MaanSarathi addresses all four gaps in a single, integrated platform."),

        h("3.3 Project Scope", HeadingLevel.HEADING_2),
        bullet("Provide an AI-powered conversational companion accessible via web browser, with planned mobile support."),
        bullet("Deliver standardised clinical assessments with automated scoring and longitudinal trend tracking."),
        bullet("Offer daily tracking for mood, sleep, journaling, gratitude, habits, and daily intentions."),
        bullet("Generate personalised content and practice recommendations based on user data."),
        bullet("Detect and respond to mental health crises with safety protocols."),
        bullet("Provide a therapist portal for oversight of patient progress and appointment management."),
        bullet("Provide an admin portal for content management, platform analytics, and system health monitoring."),
        bullet("The scope is limited to web application for the current release; mobile application is planned as future scope."),

        h("3.4 User Classes and Characteristics", HeadingLevel.HEADING_2),
        simpleTable(
          ["User Role", "Description", "Technical Proficiency"],
          [
            ["End User", "General public seeking mental health support, mood tracking, and wellbeing resources. May have no prior clinical experience.", "Low to Medium"],
            ["Therapist", "Licensed mental health clinicians who access patient progress, manage bookings, and add clinical notes.", "Medium"],
            ["Admin", "Platform administrators managing content, assessments, users, and monitoring system health.", "High"],
          ],
          [1800, 4800, 2760]
        ),

        h("3.5 Functional Requirements", HeadingLevel.HEADING_2),
        bold("FR-01: Authentication and User Management"),
        bullet("System shall support registration and login via email/password and Google OAuth (Passport.js)."),
        bullet("System shall enforce JWT-based session management with configurable expiry."),
        bullet("System shall support three user roles: End User, Therapist, Admin."),
        ...blank(1),
        bold("FR-02: AI Conversational Engine"),
        bullet("System shall provide an AI chat interface supporting multi-turn conversations."),
        bullet("System shall route LLM requests across Gemini, OpenAI, Anthropic, and Hugging Face with automatic fallback."),
        bullet("System shall maintain conversation memory tracking emotional patterns, goals, and action items."),
        bullet("System shall detect crisis language and respond with grounding exercises or escalation."),
        ...blank(1),
        bold("FR-03: Clinical Assessments"),
        bullet("System shall offer standardised assessments including GAD-2, PHQ-9, Big Five, and emotional intelligence scales."),
        bullet("System shall automatically score and interpret assessment responses."),
        bullet("System shall generate wellness scores and longitudinal trend insights."),
        ...blank(1),
        bold("FR-04: Daily Tracking"),
        bullet("System shall allow users to log mood with emotion, intensity, triggers, and notes."),
        bullet("System shall track sleep hygiene, daily intentions, gratitude entries, and habits."),
        bullet("System shall provide an AI-powered journal with pattern recognition and writing prompts."),
        ...blank(1),
        bold("FR-05: Personalised Recommendations"),
        bullet("System shall recommend practices and content based on current mood, assessment results, and engagement history."),
        bullet("System shall provide a multimedia content library with articles, audio meditations, breathing exercises, and yoga sequences."),
        ...blank(1),
        bold("FR-06: Therapist Portal"),
        bullet("Therapists shall view a list of assigned patients and their wellbeing summaries."),
        bullet("Therapists shall be able to add clinical notes and manage appointment bookings."),
        bullet("Therapist data access shall be role-restricted."),
        ...blank(1),
        bold("FR-07: Admin Portal"),
        bullet("Admins shall manage content, assessments, users, therapist profiles, and platform settings."),
        bullet("Admins shall access AI performance analytics, system health metrics, and user engagement reports."),

        h("3.6 Non-Functional Requirements", HeadingLevel.HEADING_2),
        bold("3.6.1 Performance Requirements"),
        bullet("API response time for standard requests shall not exceed 2 seconds under normal load."),
        bullet("LLM response streaming shall begin within 3 seconds of message submission."),
        bullet("The system shall support at least 500 concurrent users in production."),
        ...blank(1),
        bold("3.6.2 Safety Requirements"),
        bullet("Crisis detection shall execute on every user message before AI response generation."),
        bullet("All crisis events shall be persisted to the database for clinical review."),
        bullet("Emergency resources and grounding exercises shall be available without authentication."),
        ...blank(1),
        bold("3.6.3 Security Requirements"),
        bullet("All sensitive data shall be encrypted in transit via HTTPS (TLS 1.2+)."),
        bullet("JWT secrets and OAuth credentials shall be stored as environment variables, never hardcoded."),
        bullet("API endpoints shall enforce role-based access control (RBAC)."),
        bullet("CORS origins shall be strictly configured in production."),
        ...blank(1),
        bold("3.6.4 Software Quality Attributes"),
        bullet("Availability: The platform shall achieve 99.5% uptime in production, aided by LLM provider fallback."),
        bullet("Maintainability: The codebase shall use TypeScript throughout, with service-layer separation and comprehensive test coverage."),
        bullet("Usability: The interface shall be accessible on modern desktop browsers; WCAG 2.1 AA compliance is targeted."),
        bullet("Scalability: The architecture shall support horizontal scaling of the backend and database replication."),

        h("3.7 System Requirements", HeadingLevel.HEADING_2),
        bold("3.7.1 Hardware Requirements (Development)"),
        bullet("Processor: Intel Core i5 or equivalent (minimum)"),
        bullet("RAM: 8 GB (minimum), 16 GB recommended"),
        bullet("Storage: 20 GB free disk space"),
        bullet("Internet connection for LLM API calls and package installation"),
        ...blank(1),
        bold("3.7.2 Software Requirements"),
        simpleTable(
          ["Component", "Technology"],
          [
            ["Frontend Framework", "React 18 + Vite (TypeScript)"],
            ["Backend Framework", "Express.js (TypeScript)"],
            ["Database (Production)", "PostgreSQL"],
            ["Database (Development)", "SQLite via Prisma"],
            ["ORM", "Prisma"],
            ["Authentication", "JWT + Google OAuth (Passport.js)"],
            ["State Management", "Zustand + React Context + TanStack Query"],
            ["AI Providers", "Google Gemini, OpenAI, Anthropic Claude, Hugging Face, NVIDIA"],
            ["Runtime", "Node.js 18+"],
            ["Package Manager", "npm 8+"],
            ["Mobile (Future)", "React Native / Expo"],
          ],
          [3600, 5760]
        ),

        // ── Chapter 4: System Design ───────────────────────────────────────
        pageBreak(),
        h("CHAPTER 4", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("SYSTEM DESIGN", 32),
        divider(),

        h("4.1 System Architecture", HeadingLevel.HEADING_2),
        p("MaanSarathi follows a modular monolith architecture within a single monorepo. The system is composed of a React web frontend, an Express.js backend API, a Prisma data layer, and a set of specialised AI and business logic services. The architecture enables independent evolution of modules while sharing a common database and type system."),
        ...blank(1),
        p("High-Level Data Flow:"),
        p("User (Web Browser) → React Frontend (Vite) → Express.js Backend API → AI Orchestration Layer (LLMService + ChatService) → Multi-Provider LLMs → Response → Prisma ORM → PostgreSQL/SQLite"),
        ...blank(1),
        bold("Key Architectural Layers"),
        bullet("Presentation Layer: React 18 + Tailwind CSS + Radix UI. Zustand manages global state; React Query manages server state and caching."),
        bullet("API Layer: Express.js RESTful API with route-controller-service separation. Zod validation middleware on all routes."),
        bullet("AI Orchestration: LLMService routes requests across providers with priority-based fallback. ChatService orchestrates memory, crisis detection, context assembly, and response generation."),
        bullet("Data Layer: Prisma ORM provides type-safe database access. PostgreSQL in production, SQLite for local development."),
        bullet("Background Services: NotificationService, ContextAwarenessService, SessionContinuityService, DashboardModeService."),

        h("4.2 Data Flow Diagrams", HeadingLevel.HEADING_2),
        bold("4.2.1 DFD Level 0 — Context Diagram"),
        p("At the highest level of abstraction, MaanSarathi accepts inputs from three external actors — End Users, Therapists, and Administrators — and produces outputs including AI responses, progress insights, assessment reports, and content recommendations."),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[DFD Level 0 Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("4.2.2 DFD Level 1 — Major Subsystems"),
        p("At Level 1, the system decomposes into six major functional subsystems:"),
        numbered("Authentication and User Management"),
        numbered("AI Conversational Engine (Chat, Memory, Crisis Detection)"),
        numbered("Clinical Assessments Engine"),
        numbered("Daily Tracking and Journaling"),
        numbered("Content and Practice Recommendations"),
        numbered("Therapist / Admin Portals"),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[DFD Level 1 Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("4.2.3 DFD Level 2 — Chat Message Processing"),
        p("The chat message processing flow at Level 2 is as follows:"),
        numbered("User sends message → Frontend validates and dispatches to POST /api/chat/message."),
        numbered("Backend validates request schema (Zod)."),
        numbered("CrisisDetectionService analyses message for distress signals."),
        numbered("If crisis: return crisis response with emergency resources; persist CrisisEvent."),
        numbered("If not crisis: ContextAwarenessService assembles user context (mood, assessments, memory)."),
        numbered("LLMService selects provider (priority order: Gemini → HuggingFace → OpenAI → Anthropic)."),
        numbered("LLM generates response; ChatService post-processes and attaches smart replies."),
        numbered("Message and response persisted; ConversationMemory updated."),
        numbered("Response returned to frontend with metadata, smart replies, and exercise cards if applicable."),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }, right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" } },
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[DFD Level 2 Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),

        h("4.3 UML Diagrams", HeadingLevel.HEADING_2),
        bold("4.3.1 Use-Case Diagram"),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: BORDERS,
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Use-Case Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        p("Key use cases by actor:"),
        bold("End User:"),
        bullet("Register / Login (email or Google OAuth)"),
        bullet("Conduct AI Chat Conversation"),
        bullet("Complete Clinical Assessment"),
        bullet("Log Mood, Sleep, Gratitude, Habit, Intention"),
        bullet("Write Journal Entry"),
        bullet("View Progress Dashboard and Insights"),
        bullet("Browse and Engage with Content Library"),
        bullet("Book Therapist Appointment"),
        bullet("Manage Privacy and Account Settings"),
        ...blank(1),
        bold("Therapist:"),
        bullet("Login to Therapist Portal"),
        bullet("View Assigned Client Progress"),
        bullet("Manage Appointments"),
        bullet("Add Clinical Notes"),
        ...blank(1),
        bold("Admin:"),
        bullet("Manage Users, Therapists, Content, Assessments"),
        bullet("View Platform Analytics and System Health"),
        bullet("Manage Help & Safety Resources and FAQs"),
        ...blank(1),
        bold("4.3.2 Class Diagram"),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: BORDERS,
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Class Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        p("Core domain classes include: User, Conversation, Message, ConversationMemory, MoodEntry, AssessmentSession, AssessmentDefinition, JournalEntry, HabitEntry, Content, Practice, TherapistProfile, Booking, CrisisEvent, and WellnessSnapshot. These map directly to Prisma schema models."),
        ...blank(1),
        bold("4.3.3 Sequence Diagram — Chat Message Flow"),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: BORDERS,
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Sequence Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("4.3.4 Activity Diagram — User Onboarding and First Chat"),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: BORDERS,
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Activity Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("4.3.5 Deployment Diagram"),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: BORDERS,
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Deployment Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        p("Deployment consists of: Client Browser → React SPA (CDN/Vercel) → Express.js API (Node.js Server) → PostgreSQL Database. LLM API calls originate from the backend server, keeping API keys secure on the server side."),
        ...blank(1),
        bold("4.3.6 Component Diagram"),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: BORDERS,
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Component Diagram — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),

        // ── Chapter 5: Project Plan ────────────────────────────────────────
        pageBreak(),
        h("CHAPTER 5", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("PROJECT PLAN", 32),
        divider(),

        h("5.1 Project Estimates", HeadingLevel.HEADING_2),
        bold("5.1.1 Effort Estimate Timetable"),
        ...blank(1),
        simpleTable(
          ["Task", "Effort (Weeks)", "Deliverables", "Milestones"],
          [
            ["Analysis of existing systems and requirement gathering", "4 weeks", "Requirements Document", "–"],
            ["Literature Survey", "1 week", "Survey Report", "–"],
            ["System Architecture and Design", "2 weeks", "Design Document, SRS", "–"],
            ["Database Schema Design (Prisma)", "1 week", "schema.prisma", "–"],
            ["Backend API Development", "5 weeks", "Express.js API", "Working API"],
            ["AI Service Integration (LLM, Crisis, Memory)", "3 weeks", "LLM Services", "AI Chat Working"],
            ["Frontend Development (React + Tailwind)", "5 weeks", "React Web App", "Working UI"],
            ["Assessment Engine and Tracking Modules", "2 weeks", "Assessment + Mood Modules", "–"],
            ["Admin and Therapist Portals", "2 weeks", "Portal UIs", "–"],
            ["Testing (Unit + Integration)", "3 weeks", "Test Reports", "Formal Review"],
            ["Documentation and Report Writing", "2 weeks", "Project Report", "Final Submission"],
          ],
          [3000, 1560, 2640, 2160]
        ),
        ...blank(1),
        bold("5.1.2 KLOC Estimation"),
        ...blank(1),
        simpleTable(
          ["Sr. No.", "Module", "Estimated KLOC"],
          [
            ["1", "Backend API (controllers, routes, services)", "12.5"],
            ["2", "AI Services (LLMService, ChatService, CrisisDetection, Memory)", "6.8"],
            ["3", "Frontend (React components, hooks, services)", "18.2"],
            ["4", "Admin and Therapist Portals", "5.4"],
            ["5", "Assessment Engine (scoring, insights)", "3.2"],
            ["6", "Mobile App (future scope)", "8.0"],
            ["7", "Database Schema and Seed Scripts", "1.5"],
            ["", "TOTAL", "55.6"],
          ],
          [900, 5400, 3060]
        ),

        h("5.2 Risk Management", HeadingLevel.HEADING_2),
        simpleTable(
          ["Risk", "Probability", "Impact", "Mitigation Strategy"],
          [
            ["LLM API downtime or rate limiting", "Medium", "High", "Multi-provider fallback (Gemini→HuggingFace→OpenAI→Anthropic)"],
            ["User data privacy breach", "Low", "Very High", "HTTPS, JWT, env-var secrets, CORS, role-based access"],
            ["Crisis detection failure (false negative)", "Low", "Very High", "Layered detection: keyword + AI scoring + admin alert"],
            ["Database corruption or data loss", "Low", "High", "Regular backups, Prisma migrations, staging environment"],
            ["Scope creep beyond mobile app", "High", "Medium", "Scope fixed to web; mobile listed as future scope"],
            ["Team unavailability", "Medium", "Medium", "Modular codebase; each module independently workable"],
          ],
          [2400, 1200, 1200, 4560]
        ),

        h("5.3 Timeline Chart", HeadingLevel.HEADING_2),
        ...blank(1),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: BORDERS,
          spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Gantt Chart — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        simpleTable(
          ["Month", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
          [
            ["Finalise Topic", "✓", "", "", "", "", "", "", "", "", ""],
            ["Literature Survey", "", "✓", "", "", "", "", "", "", "", ""],
            ["Design & Planning", "", "", "✓", "", "", "", "", "", "", ""],
            ["Mid-sem Report", "", "", "", "✓", "", "", "", "", "", ""],
            ["Backend Dev.", "", "", "", "", "✓", "✓", "", "", "", ""],
            ["Frontend Dev.", "", "", "", "", "", "✓", "✓", "", "", ""],
            ["AI Integration", "", "", "", "", "", "", "✓", "✓", "", ""],
            ["Testing", "", "", "", "", "", "", "", "", "✓", ""],
            ["Final Report", "", "", "", "", "", "", "", "", "", "✓"],
          ],
          [2400, 720, 720, 720, 720, 720, 720, 720, 720, 720, 720]
        ),

        // ── Chapter 6: Implementation ──────────────────────────────────────
        pageBreak(),
        h("CHAPTER 6", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("IMPLEMENTATION", 32),
        divider(),

        h("6.1 Module Descriptions", HeadingLevel.HEADING_2),
        bold("Module 1: AI Conversational Engine"),
        p("The conversational engine is the heart of MaanSarathi. It is implemented across three primary services: LLMService, ChatService, and CrisisDetectionService."),
        ...blank(1),
        bullet("LLMService maintains a registry of API providers and rotates keys to avoid rate limits. It sends structured prompts to the active provider and falls back to the next provider on failure."),
        bullet("ChatService orchestrates the full message lifecycle: it assembles context from user profile, mood history, conversation memory, and recent assessments; builds a therapeutic system prompt; invokes LLMService; post-processes the response to detect exercise card metadata; and persists the conversation."),
        bullet("CrisisDetectionService runs a two-pass analysis: first a keyword and pattern match against a curated crisis lexicon, then an AI-based severity score. If the severity exceeds a threshold, it returns a crisis response pathway and persists a CrisisEvent record."),
        ...blank(1),
        bold("Module 2: Clinical Assessment Engine"),
        p("The assessment engine supports configurable, standardised psychometric assessments. Each assessment is defined by a JSON schema in the database, allowing admins to add or modify assessments without code changes."),
        bullet("Scoring is handled by dedicated scoring functions (scoreGad2(), scorePHQ9(), scoreBigFive(), etc.) that apply validated clinical algorithms."),
        bullet("Assessment insights are generated by buildAssessmentInsights(), which derives wellness scores, trend direction, and AI-generated narrative summaries."),
        bullet("Historical assessment data is aggregated into longitudinal trend charts visible on the user's dashboard."),
        ...blank(1),
        bold("Module 3: Daily Tracking (Mood, Sleep, Journal, Habits, Gratitude, Intentions)"),
        p("MaanSarathi provides granular daily tracking across six dimensions:"),
        bullet("Mood: each entry records mood label, emotion category, intensity (1-10), trigger, and free-text notes. The mood controller normalises legacy mood formats and computes streaks and distributions."),
        bullet("Sleep: sleep hygiene logs capture bedtime, wake time, quality rating, and notes."),
        bullet("Journal: AI-powered journal analyses entry patterns and surfaces themes and affirmations."),
        bullet("Habits: daily habit logging with streak calculations and adaptive nudges."),
        bullet("Gratitude: daily gratitude entries with AI-generated reflection prompts."),
        bullet("Intentions: daily intention setting with end-of-day reflection."),
        ...blank(1),
        bold("Module 4: Personalised Recommendation Engine"),
        p("The EnhancedRecommendationService derives focus areas by combining: recent assessment severity scores, prevalent emotion keywords from chat history, mood trend direction, and user's wellness context. It then ranks content and practice items by relevance to focus areas, filters by engagement history to avoid repetition, and attaches contextual reasons for each recommendation."),
        ...blank(1),
        bold("Module 5: Therapist Portal"),
        p("The therapist portal provides a dedicated interface for licensed clinicians. Therapists can view their assigned client list, review AI-generated wellbeing summaries, access historical assessment results, and add clinical notes. Appointment management (scheduling, rescheduling, cancellation) is fully integrated. All therapist data access is gated by the requireTherapist() middleware, which validates therapist-specific JWT claims."),
        ...blank(1),
        bold("Module 6: Admin Portal"),
        p("The admin portal provides comprehensive platform management:"),
        bullet("Content and Practice Management: CRUD operations on articles, meditations, exercises, and other resources."),
        bullet("Assessment Management: create, edit, duplicate, and publish assessments; preview questions; manage interpretation bands."),
        bullet("User and Therapist Management: view, deactivate, and manage user accounts."),
        bullet("Analytics: AI performance analytics (provider usage, response times, failure rates), system health metrics, user engagement stats, and wellness impact analytics."),
        bullet("Help and Safety: manage FAQs, crisis resources, and support ticket queues."),

        h("6.2 Algorithms and AI Logic", HeadingLevel.HEADING_2),
        bold("6.2.1 Multi-Provider LLM Routing Algorithm"),
        p("The LLMService implements a priority-queue-based provider selection algorithm:"),
        numbered("Read AI_PROVIDER_PRIORITY from environment (default: gemini, huggingface, openai, anthropic)."),
        numbered("For each provider in priority order: attempt to retrieve a healthy API key (round-robin across multiple keys per provider)."),
        numbered("Send the chat payload to the selected provider's API endpoint."),
        numbered("If the response is successful: return the response and log metrics."),
        numbered("If the response fails (network error, rate limit, invalid response): log the failure, mark the key as temporarily unhealthy, rotate to the next key or next provider, and retry."),
        numbered("If all providers fail: throw AIProviderError with user-friendly message."),
        ...blank(1),
        bold("6.2.2 Crisis Detection Algorithm"),
        p("The crisis detection system uses a layered approach:"),
        numbered("Layer 1 — Keyword and Pattern Matching: the incoming message is scanned against a curated crisis lexicon organised by severity category (mild distress, moderate risk, high risk, emergency). Matches produce an initial severity score."),
        numbered("Layer 2 — AI-Based Severity Scoring: if the keyword score exceeds a low threshold, the message is sent to the LLM with a crisis assessment prompt. The LLM returns a structured severity score (0-10) and recommended response type."),
        numbered("Layer 3 — Response Generation: based on combined score, the system selects a response pathway: (a) empathetic acknowledgement with self-care resources, (b) grounding exercise (5-4-3-2-1 technique, breathing), or (c) emergency escalation with crisis helpline details."),
        numbered("Crisis events at level (b) or above are persisted to the CrisisEvent table with timestamp, severity score, and response type for clinical review."),
        ...blank(1),
        bold("6.2.3 Wellness Score Calculation"),
        p("The wellness score is a composite metric computed by calculateWellnessScore():"),
        numbered("Assessment component (40%): derived from the most recent assessment session scores, normalised to a 0-100 scale using validated cut-offs."),
        numbered("Mood component (30%): computed from the rolling 14-day mood average, with streak bonuses for consistent logging."),
        numbered("Engagement component (20%): proportion of days with at least one logged activity (journal, habit, gratitude, intention) over the past 30 days."),
        numbered("Sleep component (10%): average sleep quality rating over the past 14 days."),
        p("The components are weighted and summed to produce a single wellness score (0-100), which is stored as a WellnessSnapshot for longitudinal charting."),
        ...blank(1),
        bold("6.2.4 Personalised Recommendation Scoring"),
        p("The recommendation engine scores each content and practice item using a relevance function:"),
        numbered("Focus area match: items tagged with the user's current focus areas (derived from assessment insights and mood keywords) receive a base relevance boost."),
        numbered("Engagement history penalty: items the user has recently completed receive a decay factor to promote variety."),
        numbered("Mood-based filtering: items are filtered to approaches appropriate for the current mood (e.g., grounding exercises for anxiety, affirmations for low mood)."),
        numbered("Final ranking: items are sorted by adjusted relevance score; top N items are returned with generated contextual reasons."),

        h("6.3 Tools and Technologies", HeadingLevel.HEADING_2),
        simpleTable(
          ["Technology", "Version", "Purpose"],
          [
            ["React", "18", "Frontend UI library"],
            ["Vite", "5.x", "Frontend build tool and dev server"],
            ["TypeScript", "5.x", "Type-safe development across frontend and backend"],
            ["Tailwind CSS", "3.x", "Utility-first CSS styling"],
            ["Radix UI", "Latest", "Accessible, unstyled UI primitives"],
            ["Zustand", "4.x", "Lightweight global state management"],
            ["TanStack Query", "5.x", "Server state management and caching"],
            ["React Router", "6.x", "Client-side routing"],
            ["Express.js", "4.x", "Backend REST API framework"],
            ["Prisma", "5.x", "Type-safe ORM for database access"],
            ["PostgreSQL", "15", "Production relational database"],
            ["SQLite", "3.x", "Local development database (via Prisma)"],
            ["JWT / Passport.js", "Latest", "Authentication and Google OAuth"],
            ["Google Gemini API", "Latest", "Primary LLM provider"],
            ["OpenAI API", "GPT-4o", "Secondary LLM provider"],
            ["Anthropic API", "Claude 3.5", "Tertiary LLM provider"],
            ["Hugging Face", "Inference API", "Fallback LLM provider"],
            ["React Native / Expo", "Latest", "Mobile application (future scope)"],
            ["Zod", "3.x", "Runtime schema validation"],
            ["Recharts", "2.x", "Data visualisation for mood and progress charts"],
          ],
          [3600, 1800, 3960]
        ),

        h("6.4 Sample Code", HeadingLevel.HEADING_2),
        bold("6.4.1 LLM Provider Routing — LLMService (TypeScript)"),
        ...blank(1),
        new Paragraph({
          shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 4 } },
          spacing: { before: 120, after: 120 },
          children: [new TextRun({
            text: `async sendMessage(messages, options) {\n  for (const providerName of this.providerPriority) {\n    const provider = this.providers[providerName];\n    if (!provider || !provider.isAvailable()) continue;\n    try {\n      const response = await provider.chat(messages, options);\n      this.logMetrics(providerName, 'success');\n      return response;\n    } catch (err) {\n      this.logMetrics(providerName, 'failure');\n      provider.rotateApiKey();\n    }\n  }\n  throw new AIProviderError('All LLM providers unavailable');\n}`,
            size: 18, font: "Courier New"
          })]
        }),
        ...blank(1),
        bold("6.4.2 Crisis Detection — detectCrisisLanguage (TypeScript)"),
        ...blank(1),
        new Paragraph({
          shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 4 } },
          spacing: { before: 120, after: 120 },
          children: [new TextRun({
            text: `async detectCrisisLanguage(message, userId) {\n  // Layer 1: keyword match\n  const keywordScore = this.keywordScanner.score(message);\n  if (keywordScore < CRISIS_THRESHOLD_LOW) return null;\n\n  // Layer 2: AI severity scoring\n  const aiScore = await this.llmService.scoreCrisisSeverity(message);\n  const combined = 0.4 * keywordScore + 0.6 * aiScore;\n\n  if (combined >= CRISIS_THRESHOLD_EMERGENCY) {\n    await this.persistCrisisEvent(userId, combined, 'emergency');\n    return this.buildEscalationResponse();\n  } else if (combined >= CRISIS_THRESHOLD_HIGH) {\n    await this.persistCrisisEvent(userId, combined, 'grounding');\n    return this.buildGroundingExercise();\n  }\n  return this.buildEmpathyResponse();\n}`,
            size: 18, font: "Courier New"
          })]
        }),
        ...blank(1),
        bold("6.4.3 Mood Entry Controller — createMoodEntry (TypeScript)"),
        ...blank(1),
        new Paragraph({
          shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 4 } },
          spacing: { before: 120, after: 120 },
          children: [new TextRun({
            text: `export const createMoodEntry = async (req, res) => {\n  const { mood, emotion, intensity, trigger, notes } = req.body;\n  const normalised = normalizeLegacyMood(mood);\n  const entry = await prisma.moodEntry.create({\n    data: {\n      userId: req.user.id,\n      mood: normalised,\n      emotion,\n      intensity: clamp(intensity, 1, 10),\n      trigger,\n      notes\n    }\n  });\n  res.json({ success: true, entry });\n};`,
            size: 18, font: "Courier New"
          })]
        }),
        ...blank(1),
        bold("6.4.4 Wellness Score Calculation (TypeScript)"),
        ...blank(1),
        new Paragraph({
          shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT, space: 4 } },
          spacing: { before: 120, after: 120 },
          children: [new TextRun({
            text: `function calculateWellnessScore(assessments, moods, engagement, sleep) {\n  const assessmentScore = normaliseAssessments(assessments) * 0.40;\n  const moodScore = computeMoodAvg(moods) * 0.30;\n  const engagementScore = engagementRate(engagement) * 0.20;\n  const sleepScore = avgSleepQuality(sleep) * 0.10;\n  return Math.round(assessmentScore + moodScore\n                   + engagementScore + sleepScore);\n}`,
            size: 18, font: "Courier New"
          })]
        }),

        h("6.5 Result Set / Screenshots", HeadingLevel.HEADING_2),
        p("The following sections describe the key screens of the MaanSarathi platform. Screenshots should be inserted in the placeholders below."),
        ...blank(1),
        bold("6.5.1 Landing Page and Authentication"),
        new Paragraph({
          alignment: AlignmentType.CENTER, border: BORDERS, spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Screenshot: Landing Page — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("6.5.2 AI Chat Interface"),
        new Paragraph({
          alignment: AlignmentType.CENTER, border: BORDERS, spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Screenshot: Chat Interface — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("6.5.3 User Dashboard"),
        new Paragraph({
          alignment: AlignmentType.CENTER, border: BORDERS, spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Screenshot: Dashboard — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("6.5.4 Clinical Assessment Screen"),
        new Paragraph({
          alignment: AlignmentType.CENTER, border: BORDERS, spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Screenshot: Assessment — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("6.5.5 Progress and Insights Page"),
        new Paragraph({
          alignment: AlignmentType.CENTER, border: BORDERS, spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Screenshot: Progress Page — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),
        ...blank(1),
        bold("6.5.6 Admin Portal"),
        new Paragraph({
          alignment: AlignmentType.CENTER, border: BORDERS, spacing: { before: 200, after: 200 },
          shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
          children: [new TextRun({ text: "[Screenshot: Admin Portal — to be inserted here]", size: 20, color: "888888", italics: true, font: "Arial" })]
        }),

        // ── Chapter 7: Testing ─────────────────────────────────────────────
        pageBreak(),
        h("CHAPTER 7", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("TESTING", 32),
        divider(),

        h("7.1 Testing Strategy", HeadingLevel.HEADING_2),
        p("MaanSarathi uses a multi-layered testing strategy comprising unit tests, integration tests, and end-to-end (E2E) tests, implemented using Vitest and supertest. The testing philosophy prioritises coverage of critical paths: LLM routing, crisis detection, authentication, assessment scoring, and mood tracking."),

        h("7.2 Test Cases", HeadingLevel.HEADING_2),
        bold("7.2.1 Authentication Module"),
        simpleTable(
          ["Test ID", "Test Case", "Input", "Expected Output", "Status"],
          [
            ["TC-01", "Valid registration", "Name, email, password", "201 Created, JWT token", "Pass"],
            ["TC-02", "Duplicate email registration", "Existing email", "409 Conflict", "Pass"],
            ["TC-03", "Valid login", "email, password", "200 OK, JWT token", "Pass"],
            ["TC-04", "Invalid password", "email, wrong password", "401 Unauthorized", "Pass"],
            ["TC-05", "Google OAuth login", "Google token", "200 OK, JWT token", "Pass"],
          ],
          [900, 2400, 1800, 2400, 1200]
        ),
        ...blank(1),
        bold("7.2.2 Chat and AI Engine Module"),
        simpleTable(
          ["Test ID", "Test Case", "Input", "Expected Output", "Status"],
          [
            ["TC-06", "Normal message — AI response", "User message (no crisis)", "200 OK, AI response text", "Pass"],
            ["TC-07", "Crisis message — grounding response", "High distress message", "Crisis response + grounding exercise", "Pass"],
            ["TC-08", "LLM provider fallback", "Primary provider unavailable", "Response from fallback provider", "Pass"],
            ["TC-09", "Conversation memory retention", "Reference to prior session detail", "AI acknowledges prior context", "Pass"],
            ["TC-10", "All providers unavailable", "All API keys invalid", "503 with user-friendly error", "Pass"],
          ],
          [900, 2400, 1800, 2400, 1200]
        ),
        ...blank(1),
        bold("7.2.3 Mood Tracking Module"),
        simpleTable(
          ["Test ID", "Test Case", "Input", "Expected Output", "Status"],
          [
            ["TC-11", "Create mood entry", "mood, emotion, intensity, trigger", "201 Created, entry object", "Pass"],
            ["TC-12", "Invalid intensity (out of range)", "intensity = 15", "400 Bad Request — validation error", "Pass"],
            ["TC-13", "Retrieve mood history", "Authenticated GET request", "Array of mood entries with stats", "Pass"],
            ["TC-14", "Mood streak calculation", "7 consecutive days of entries", "streak = 7", "Pass"],
          ],
          [900, 2400, 1800, 2400, 1200]
        ),
        ...blank(1),
        bold("7.2.4 Assessment Engine Module"),
        simpleTable(
          ["Test ID", "Test Case", "Input", "Expected Output", "Status"],
          [
            ["TC-15", "Submit GAD-2 assessment", "Responses to 2 questions (0-3 scale)", "Score 0-6, interpretation label", "Pass"],
            ["TC-16", "Submit PHQ-9 assessment", "9 responses (0-3 scale)", "Score 0-27, severity band", "Pass"],
            ["TC-17", "Assessment history retrieval", "Authenticated GET", "Array of past session results with trends", "Pass"],
            ["TC-18", "Invalid assessment ID", "Non-existent assessment ID", "404 Not Found", "Pass"],
          ],
          [900, 2400, 1800, 2400, 1200]
        ),
        ...blank(1),
        bold("7.2.5 Admin and Therapist Portal"),
        simpleTable(
          ["Test ID", "Test Case", "Input", "Expected Output", "Status"],
          [
            ["TC-19", "Admin creates new content", "Title, body, type, tags", "201 Created, content object", "Pass"],
            ["TC-20", "Non-admin access to admin endpoint", "End-user JWT on /admin route", "403 Forbidden", "Pass"],
            ["TC-21", "Therapist views client progress", "Therapist JWT + client ID", "200 OK, patient summary", "Pass"],
            ["TC-22", "Therapist accesses wrong client", "Therapist JWT + unassigned client ID", "403 Forbidden", "Pass"],
          ],
          [900, 2400, 1800, 2400, 1200]
        ),

        h("7.3 Testing Types Used", HeadingLevel.HEADING_2),
        bold("Unit Testing:"),
        p("Individual service functions are unit-tested in isolation using Vitest. Key units tested include: assessment scoring functions (scoreGad2, scoreBigFive), mood normalisation (normalizeLegacyMood), wellness score computation, and recommendation ranking. Mocks are used for database and LLM dependencies."),
        ...blank(1),
        bold("Integration Testing:"),
        p("API endpoints are integration-tested using supertest against a test SQLite database. Tests verify that controllers, services, and the database layer interact correctly across the full request lifecycle."),
        ...blank(1),
        bold("End-to-End Testing:"),
        p("Critical user journeys — registration, first chat interaction, crisis detection pathway, and assessment submission — are tested end-to-end in a staging environment. Manual walkthrough testing is also conducted for admin and therapist portal workflows."),

        // ── Chapter 8: Conclusion ──────────────────────────────────────────
        pageBreak(),
        h("CHAPTER 8", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("CONCLUSION", 32),
        divider(),
        ...blank(1),
        p("MaanSarathi represents a significant step forward in the application of Artificial Intelligence to digital mental health support. By integrating a multi-provider LLM conversational engine, a structured crisis detection and safety protocol, long-term conversation memory, standardised clinical assessments, comprehensive daily tracking, personalised recommendations, and professional therapist oversight into a single platform, MaanSarathi addresses the key limitations of existing digital mental health tools."),
        ...blank(1),
        p("The platform's multi-provider AI architecture ensures high availability — a critical requirement for mental health applications where system downtime could leave vulnerable users without support at a critical moment. The crisis detection module provides a structured safety net, ensuring that users expressing distress are not simply left with generic AI responses, but are guided toward appropriate resources and care pathways."),
        ...blank(1),
        p("From a technical standpoint, MaanSarathi demonstrates how modern full-stack technologies — React, Express.js, Prisma, and TypeScript — can be combined with cloud AI APIs to build a maintainable, scalable, and secure mental health platform. The modular monorepo architecture facilitates independent development of features while maintaining a shared type system and database schema."),
        ...blank(1),
        p("The platform has been designed with India's mental health landscape in mind, where a chronic shortage of professionals, widespread stigma, and growing smartphone penetration make a digital-first approach both necessary and timely. MaanSarathi provides a private, empathetic, and always-available companion that can meaningfully extend the reach of mental health support — bridging the gap between self-care and professional intervention."),
        ...blank(1),
        h("Future Scope", HeadingLevel.HEADING_2),
        bullet("Mobile Application: The React Native/Expo mobile application, already scaffolded in the monorepo, will be fully developed to provide feature parity with the web application, including biometric authentication and push notifications."),
        bullet("Multilingual Support: Adding Hindi and other regional Indian language support to make the platform accessible to non-English-speaking users."),
        bullet("Voice Interaction: Integration of speech recognition for voice-based journaling and chat interaction, particularly relevant for mobile users."),
        bullet("Advanced Personalisation: Incorporating passive sensing signals (with user consent) such as typing patterns and session timing to enhance the digital phenotyping model."),
        bullet("Clinical Research Partnerships: Collaborating with mental health institutions to validate MaanSarathi's assessment insights against clinically administered evaluations."),
        bullet("Expanded Assessment Library: Adding additional validated instruments for PTSD, OCD, bipolar disorder screening, and substance use assessment."),
        bullet("Group Therapy Features: Facilitating moderated peer support groups supervised by therapists."),

        // ── Chapter 9: References ──────────────────────────────────────────
        pageBreak(),
        h("CHAPTER 9", HeadingLevel.HEADING_1, { center: true }),
        centeredBold("REFERENCES", 32),
        divider(),
        ...blank(1),
        numbered("[1] Fitzpatrick, K. K., Darcy, A., & Vierhile, M. (2017). Delivering Cognitive Behavior Therapy to Young Adults With Symptoms of Depression and Anxiety Using a Fully Automated Conversational Agent (Woebot): A Randomized Controlled Trial. JMIR Mental Health, 4(2), e19."),
        numbered("[2] Vaidyam, A. N., Wisniewski, H., Halamka, J. D., Kashavan, M. S., & Torous, J. B. (2019). Chatbots and Conversational Agents in Mental Health: A Review of the Psychiatric Landscape. The Canadian Journal of Psychiatry, 64(7), 456-464."),
        numbered("[3] Yang, K., Zhang, T., & Ananiadou, S. (2022). A mental health knowledge graph for empathetic dialogue generation. Applied Sciences, 12(7), 3296."),
        numbered("[4] Singhal, K., Azizi, S., Tu, T., et al. (2022). Large Language Models Encode Clinical Knowledge. Nature, 620, 172-180."),
        numbered("[5] Liu, S., et al. (2020). Multi-Label Classification for Suicidal Ideation Detection. In Proceedings of EMNLP 2020."),
        numbered("[6] Mohr, D. C., Zhang, M., & Schueller, S. M. (2017). Personal sensing: Understanding mental health using ubiquitous sensors and machine learning. Annual Review of Clinical Psychology, 13, 23-47."),
        numbered("[7] Kroenke, K., Spitzer, R. L., & Williams, J. B. (2001). The PHQ-9: validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606-613."),
        numbered("[8] Spitzer, R. L., Kroenke, K., Williams, J. B., & Lowe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166(10), 1092-1097."),
        numbered("[9] Torous, J., et al. (2020). Digital mental health and COVID-19: Using technology today to accelerate the curve on access and quality tomorrow. JMIR Mental Health, 7(3)."),
        numbered("[10] Luo, C., et al. (2020). Smartphone-based blood pressure telemonitoring with self-management support for hypertension treatment. Journal of Medical Internet Research, 22(4), e17504."),
        numbered("[11] World Health Organization (2022). World Mental Health Report: Transforming Mental Health for All. WHO Press, Geneva."),
        numbered("[12] Brown, T. B., et al. (2020). Language Models are Few-Shot Learners (GPT-3). Advances in Neural Information Processing Systems, 33."),
        numbered("[13] Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding. In Proceedings of NAACL-HLT 2019."),
        numbered("[14] Prisma.io. (2024). Prisma Documentation. https://www.prisma.io/docs"),
        numbered("[15] Meta Platforms, Inc. (2024). React 18 Documentation. https://react.dev"),
        numbered("[16] OpenJS Foundation. (2024). Express.js Documentation. https://expressjs.com"),
        numbered("[17] Google LLC. (2024). Gemini API Documentation. https://ai.google.dev"),
        numbered("[18] OpenAI Inc. (2024). OpenAI API Reference. https://platform.openai.com/docs"),
        numbered("[19] Anthropic PBC. (2024). Claude API Documentation. https://docs.anthropic.com"),
        numbered("[20] Hugging Face Inc. (2024). Inference API Documentation. https://huggingface.co/docs/inference-endpoints"),
      ]
    }
  ]
});

async function main() {
  const outputPath = path.join(__dirname, 'ManaSarathi_BlackBook.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Done! Generated: ${outputPath}`);
}

main().catch((error) => {
  console.error('Failed to generate document:', error);
  process.exit(1);
});