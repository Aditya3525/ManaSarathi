const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak, ImageRun,
  PageBorderDisplay, PageBorderOffsetFrom
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Diagrams ─────────────────────────────────────────────────────────────────
const IMG_W = 590, IMG_H = 414;   // 1316:924 aspect, fits inside equal margins

function img(n, caption) {
  const diagramsDir = path.join(__dirname, 'diagrams');
  const imagePath = path.join(diagramsDir, `${n}.jpeg`);
  const hasImage = fs.existsSync(imagePath);

  if (!hasImage) {
    return [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        border: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
        },
        shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        spacing: { before: 120, after: 60 },
        children: [
          new TextRun({ text: `[Missing diagram: ${n}.jpeg]`, size: 20, italics: true, font: 'Times New Roman', color: '666666' }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: caption, size: 20, bold: true, font: 'Times New Roman' })],
      }),
    ];
  }

  const buf = fs.readFileSync(imagePath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({ data: buf, transformation: { width: IMG_W, height: IMG_H }, type: 'jpg' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: caption, size: 20, bold: true, font: 'Times New Roman' })]
    })
  ];
}

// ─── Borders & constants ──────────────────────────────────────────────────────
const CELL_B = { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' };
const BORDERS = { top: CELL_B, bottom: CELL_B, left: CELL_B, right: CELL_B };
const NO_B = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_B, bottom: NO_B, left: NO_B, right: NO_B };

// Page border definition (used on every section)
function pageBorderProp() {
  return {
    pageBorderTop:    { style: BorderStyle.SINGLE, size: 18, space: 24 },
    pageBorderBottom: { style: BorderStyle.SINGLE, size: 18, space: 24 },
    pageBorderLeft:   { style: BorderStyle.SINGLE, size: 18, space: 24 },
    pageBorderRight:  { style: BorderStyle.SINGLE, size: 18, space: 24 },
    display:    PageBorderDisplay.ALL_PAGES,
    offsetFrom: PageBorderOffsetFrom.PAGE
  };
}

// Standard page properties — EQUAL margins so content is truly centred
function pageProps() {
  return {
    size: { width: 11906, height: 16838 },          // A4
    margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    borders: pageBorderProp()
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function blank(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')] }));
}
function pgBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}
function rule() {   // horizontal rule line (like the "———" in reference)
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 1 } },
    spacing: { before: 0, after: 160 },
    children: [new TextRun('')]
  });
}

// Centred plain text
function ctr(text, sz = 24, bold = false, italic = false) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: sz, bold, font: 'Times New Roman', italics: italic })]
  });
}

// Body paragraph (justified)
function par(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80, line: 360 },
    indent: opts.indent ? { left: 360 } : {},
    children: [new TextRun({
      text, size: opts.sz || 24, bold: opts.bold || false,
      font: 'Times New Roman', italics: opts.italic || false
    })]
  });
}

// Sub-heading (left, bold)
function sh(text, sz = 24) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: sz, font: 'Times New Roman' })]
  });
}

// Bullet (indented dash)
function bul(text) {
  return new Paragraph({
    indent: { left: 540, hanging: 180 },
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: '-  ', size: 22, font: 'Times New Roman' }),
      new TextRun({ text, size: 22, font: 'Times New Roman' })
    ]
  });
}

// Numbered item
function num(n, text) {
  return new Paragraph({
    indent: { left: 540, hanging: 360 },
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: `${n})   ${text}`, size: 24, font: 'Times New Roman' })]
  });
}

// Chapter page block (matches reference: large centered number + title + rule)
function chap(num, title) {
  return [
    ...blank(3),
    ctr(`CHAPTER ${num}`, 56, true),
    ...blank(1),
    ctr(title, 36, true),
    rule(),
  ];
}

// Table helpers
function hc(text, w) {
  return new TableCell({
    borders: BORDERS,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: 'D9D9D9', type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 22, font: 'Times New Roman' })] })]
  });
}
function dc(text, w, center = false) {
  return new TableCell({
    borders: BORDERS,
    width: { size: w, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({ alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 22, font: 'Times New Roman' })] })]
  });
}
function mkT(cols, rows, widths) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: cols.map((c, i) => hc(c, widths[i])) }),
      ...rows.map(r => new TableRow({ children: r.map((c, i) => dc(c, widths[i], true)) }))
    ]
  });
}

// Code block
function code(lines) {
  return lines.map(l => new Paragraph({
    indent: { left: 720 },
    spacing: { before: 0, after: 0 },
    children: [new TextRun({ text: l, size: 18, font: 'Courier New' })]
  }));
}

// ══════════════════════════════════════════════════════════════════════════════
// Name/Seat row — exactly like reference: name left-aligned, seat no right
// Uses a no-border table to align them like the reference PDF
// ══════════════════════════════════════════════════════════════════════════════
function memberRow(name, seat = '__________') {
  return new Table({
    width: { size: 8640, type: WidthType.DXA },
    columnWidths: [4320, 4320],
    rows: [new TableRow({ children: [
      new TableCell({ borders: NO_BORDERS, width: { size: 4320, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 0, right: 0 },
        children: [new Paragraph({ alignment: AlignmentType.LEFT,
          children: [new TextRun({ text: name, bold: true, size: 22, font: 'Times New Roman' })] })]
      }),
      new TableCell({ borders: NO_BORDERS, width: { size: 4320, type: WidthType.DXA },
        margins: { top: 40, bottom: 40, left: 0, right: 0 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `Seat No: ${seat}`, size: 22, font: 'Times New Roman' })] })]
      })
    ]})]
  });
}

// Helper: wrapper to centre a table on the page
function centreTable(tbl) { return tbl; }   // table inherits page centre via equal margins

// ══════════════════════════════════════════════════════════════════════════════
//  DOCUMENT
// ══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  styles: {
    default: { document: { run: { font: 'Times New Roman', size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Times New Roman' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Times New Roman' },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Times New Roman' },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: { page: pageProps() },
    children: [

      // ════════════════════════════════════════════════════════════════════
      //  TITLE PAGE — matches reference exactly
      // ════════════════════════════════════════════════════════════════════
      ...blank(2),
      ctr('A PROJECT REPORT ON', 22, true),
      ...blank(1),
      ctr('MaanSarathi', 52, true),
      ctr('An AI-Powered  Comprehensive  Mental  Wellbeing  Platform', 24, false, true),
      ...blank(1),
      ctr('SUBMITTED TO THE SAVITRIBAI PHULE PUNE UNIVERSITY, PUNE', 20),
      ctr('IN THE PARTIAL  FULFILLMENT  OF THE REQUIREMENTS  FOR THE AWARD OF THE', 20),
      ctr('DEGREE OF', 20),
      ...blank(1),
      ctr('BACHELOR OF ENGINEERING', 26, true),
      ctr('IN', 24, true),
      ctr('(INFORMATION TECHNOLOGY)', 26, true),
      ...blank(1),
      ctr('SUBMITTED BY', 22, true),
      ...blank(1),
      memberRow('[Team Member 1]'),
      memberRow('[Team Member 2]'),
      memberRow('[Team Member 3]'),
      memberRow('[Team Member 4]'),
      ...blank(2),
      ctr('UNDER THE GUIDANCE OF', 20, true),
      ctr('[Guide Name]', 24, true),
      ...blank(2),
      ctr('DEPARTMENT OF INFORMATION TECHNOLOGY', 22, true),
      ctr('[College Name], PUNE', 22, true),
      ctr('SAVITRIBAI PHULE PUNE UNIVERSITY 2024-2025', 22, true),

      // ════════════════════════════════════════════════════════════════════
      //  CERTIFICATE
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...blank(2),
      ctr('CERTIFICATE', 40, true),
      rule(),
      ...blank(1),
      ctr('This is to certify that the project report entitled', 24),
      ...blank(1),
      ctr('"MaanSarathi — An AI-Powered Comprehensive Mental Wellbeing Platform"', 26, true),
      ...blank(1),
      ctr('Submitted by', 22),
      ...blank(1),
      memberRow('[Team Member 1]'),
      memberRow('[Team Member 2]'),
      memberRow('[Team Member 3]'),
      memberRow('[Team Member 4]'),
      ...blank(1),
      par('is a bonafide work carried out by them under the supervision of [Guide Name] and it is approved for the partial fulfillment of the requirement of Savitribai Phule Pune University, for the award of the degree of Bachelor of Engineering (INFORMATION TECHNOLOGY).', { center: true }),
      ...blank(3),
      // Guide / HOD / Principal row
      new Table({
        width: { size: 8640, type: WidthType.DXA },
        columnWidths: [2880, 2880, 2880],
        rows: [new TableRow({ children: [
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '[Guide Name]', bold: true, size: 22, font: 'Times New Roman' })] })] }),
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '[H.O.D. Name]', bold: true, size: 22, font: 'Times New Roman' })] })] }),
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '[Principal Name]', bold: true, size: 22, font: 'Times New Roman' })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Guide', size: 22, font: 'Times New Roman' })] })] }),
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'H.O.D.', size: 22, font: 'Times New Roman' })] })] }),
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Principal', size: 22, font: 'Times New Roman' })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Department of IT', size: 22, font: 'Times New Roman' })] })] }),
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Department of IT', size: 22, font: 'Times New Roman' })] })] }),
          new TableCell({ borders: NO_BORDERS, children: [new Paragraph({ alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '[College]', size: 22, font: 'Times New Roman' })] })] }),
        ]})]
      }),
      ...blank(2),
      new Paragraph({ children: [new TextRun({ text: 'Place: Pune', size: 22, font: 'Times New Roman' })] }),
      new Paragraph({ children: [new TextRun({ text: 'Date:   /   / 2025', size: 22, font: 'Times New Roman' })] }),

      // ════════════════════════════════════════════════════════════════════
      //  ACKNOWLEDGEMENT
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'ACKNOWLEDGEMENT', bold: true, font: 'Times New Roman' })] }),
      rule(),
      ...blank(1),
      par('We hereby take this opportunity to record our sincere thanks and heartfelt gratitude to [Guide Name] for their useful guidance and for making available their intimate knowledge and experience in the making of "MaanSarathi — An AI-Powered Comprehensive Mental Wellbeing Platform", as well as in the preparation of this project report.'),
      ...blank(1),
      par('We are also thankful to our respective H.O.D. [H.O.D. Name] of the Information Technology department. We express our special thanks and heartfelt gratitude to our respective staff members for inspiring us throughout the completion of this system.'),
      ...blank(1),
      par('This acknowledgement will be incomplete if we do not record our sense of gratitude to our Principal, [Principal Name], [College Name], Pune. We also express our sincere thanks to all — the management, lab assistants, friends, and family — who have provided valuable guidance towards the completion of this project.'),
      ...blank(1),
      par('We express our sincere gratitude towards the co-operative department who have provided us with valuable assistance and requirements for the presentation.'),
      ...blank(2),
      sh('Project Group Members:'),
      ...blank(1),
      memberRow('[Team Member 1]'),
      memberRow('[Team Member 2]'),
      memberRow('[Team Member 3]'),
      memberRow('[Team Member 4]'),

      // ════════════════════════════════════════════════════════════════════
      //  ABSTRACT
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'ABSTRACT', bold: true, font: 'Times New Roman' })] }),
      rule(),
      ...blank(1),
      par('MaanSarathi is an AI-powered comprehensive mental wellbeing platform designed to bridge the gap between self-care and professional mental health support. The platform integrates a context-aware conversational AI companion, standardised clinical assessment tools, daily mood and habit tracking, crisis detection, and professional therapist oversight into a single unified system — making mental health support accessible, personalised, and continuous.'),
      ...blank(1),
      par('The system employs a multi-provider Large Language Model (LLM) architecture, supporting Google Gemini, OpenAI GPT, Anthropic Claude, Hugging Face, and NVIDIA inference endpoints, with an automatic fallback mechanism for high availability. A crisis detection module continuously analyses user messages using sentiment analysis and keyword matching to identify potential mental health emergencies, triggering grounding exercises or clinical escalation as required.'),
      ...blank(1),
      par('Standardised clinical assessments — including GAD-2, PHQ-9, Big Five personality, and emotional intelligence tools — are scored and interpreted automatically, generating wellness scores and AI-driven insights. A personalised recommendation engine suggests mindfulness practices, CBT resources, audio meditations, and breathing exercises based on the user\'s current mood, assessment results, and engagement history. The backend is built with Express.js and TypeScript using Prisma ORM with PostgreSQL. The web frontend is developed in React 18 with Vite, and a React Native/Expo mobile application is maintained in the same monorepo.'),
      ...blank(2),
      new Paragraph({ spacing: { before: 80, after: 80 }, children: [
        new TextRun({ text: 'Keywords: ', bold: true, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: 'Mental Health, AI Chatbot, LLM, Crisis Detection, Mood Tracking, Clinical Assessments, CBT, React, Express.js, Prisma, PostgreSQL, Multi-Provider AI, Personalised Recommendations.', size: 24, font: 'Times New Roman' })
      ]}),

      // ════════════════════════════════════════════════════════════════════
      //  INDEX
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'INDEX', bold: true, font: 'Times New Roman' })] }),
      rule(),
      ...blank(1),
      mkT(['Sr. No.', 'Title of Chapter', 'Page No.'], [
        ['01', 'Introduction', '01'],
        ['', '1.1 Background and Motivation', '01'],
        ['', '1.2 Objectives', '03'],
        ['', '1.3 Organization of Report', '04'],
        ['02', 'Literature Survey', '05'],
        ['03', 'Software Requirements Specification', '11'],
        ['', '3.1 Introduction', '11'],
        ['', '3.2 Problem Statement', '12'],
        ['', '3.3 Project Scope', '12'],
        ['', '3.4 User Classes and Characteristics', '13'],
        ['', '3.5 Functional Requirements', '13'],
        ['', '3.6 Non-Functional Requirements', '15'],
        ['', '3.7 System Requirements', '16'],
        ['04', 'System Design', '17'],
        ['', '4.1 System Architecture', '17'],
        ['', '4.2 Data Flow Diagrams (DFD)', '18'],
        ['', '4.3 UML Diagrams', '20'],
        ['', '4.4 Component Diagram', '25'],
        ['', '4.5 ER Diagram', '26'],
        ['', '4.6 State Machine Diagram', '27'],
        ['05', 'Project Plan', '28'],
        ['06', 'Implementation', '32'],
        ['07', 'Testing', '43'],
        ['08', 'Conclusion', '47'],
        ['09', 'References', '48'],
      ], [1200, 6600, 1560]),

      // ── List of Figures ───────────────────────────────────────────────
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'LIST OF FIGURES', bold: true, font: 'Times New Roman' })] }),
      rule(), ...blank(1),
      mkT(['Figure No.', 'Title', 'Page No.'], [
        ['4.1', 'MaanSarathi – System Architecture Diagram', '17'],
        ['4.2', 'DFD Level 0 (Context) and Level 1 (Detailed)', '18'],
        ['4.3', 'DFD – All Levels (Level 0, 1 and Level 2 – Chat & AI Process)', '19'],
        ['4.4', 'Overall System Use Case Diagram', '20'],
        ['4.5', 'Class Diagram – MaanSarathi Main System Architecture', '21'],
        ['4.6', 'Sequence Diagram – Chat Flow (AI Conversation)', '22'],
        ['4.7', 'Sequence Diagrams Overview (5 Key Flows)', '23'],
        ['4.8', 'Sequence Diagram – Chat + AI Flow (Detailed)', '23'],
        ['4.9', 'Sequence Diagram – Assessment Submission Flow', '24'],
        ['4.10', 'Activity Diagram – User Journey (End-to-End Flow)', '25'],
        ['4.11', 'Activity Diagram – Crisis Detection Logic', '25'],
        ['4.12', 'Component Diagram – MaanSarathi System Architecture', '26'],
        ['4.13', 'ER Diagram – MaanSarathi Database Design', '26'],
        ['4.14', 'State Machine Diagram – Chat / User State Lifecycle', '27'],
      ], [1440, 7200, 720]),

      // ── List of Tables ────────────────────────────────────────────────
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'LIST OF TABLES', bold: true, font: 'Times New Roman' })] }),
      rule(), ...blank(1),
      mkT(['Table No.', 'Title', 'Page No.'], [
        ['2.1', 'Literature Survey Comparison', '09'],
        ['3.1', 'User Classes and Characteristics', '13'],
        ['3.2', 'Software Requirements', '16'],
        ['5.1', 'Effort Estimate Timetable', '28'],
        ['5.2', 'Project Schedule', '29'],
        ['5.3', 'KLOC Estimation', '30'],
        ['5.4', 'Risk Management', '30'],
        ['5.5', 'Timeline Chart', '31'],
        ['6.1', 'Tools and Technologies Used', '37'],
        ['7.1', 'Test Cases – Authentication', '43'],
        ['7.2', 'Test Cases – Chat and AI Engine', '44'],
        ['7.3', 'Test Cases – Mood Tracking', '44'],
        ['7.4', 'Test Cases – Assessment Engine', '45'],
        ['7.5', 'Test Cases – Admin and Therapist Portal', '45'],
      ], [1440, 7200, 720]),

      // ════════════════════════════════════════════════════════════════════
      //  CH 1 – INTRODUCTION
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('1', 'INTRODUCTION'),
      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '1.1 Background and Motivation', bold: true, font: 'Times New Roman' })] }),
      sh('World-Wide Scenario'),
      par('Mental health has emerged as one of the most pressing global healthcare challenges of the twenty-first century. According to the World Health Organization (WHO), approximately one in eight people worldwide live with a mental disorder, yet a vast treatment gap persists — particularly in low- and middle-income countries. Stigma, lack of awareness, prohibitive costs of therapy, and a global shortage of mental health professionals mean that the majority of individuals who need support never receive it.'),
      ...blank(1),
      par('The rapid advancement of Artificial Intelligence (AI), particularly in Natural Language Processing (NLP) and conversational AI, has opened new avenues for mental health support. AI-powered conversational agents can offer 24/7 empathetic interaction, personalised psychoeducation, and guided self-care — lowering barriers for individuals who cannot or do not seek in-person help.'),
      ...blank(1),
      sh('Scenario in India'),
      par('India faces a particularly acute mental health crisis. With an estimated 150 million people in need of mental health services and only approximately 9,000 psychiatrists, the psychiatrist-to-patient ratio is approximately 1:10,000 — far below the WHO-recommended ratio. Cultural stigma further inhibits help-seeking behaviour, especially among youth and rural populations.'),
      ...blank(1),
      par('Smartphone penetration in India has surpassed 700 million users, and internet connectivity continues to expand rapidly. This creates a unique opportunity for a digital mental health platform accessible in one\'s own context, without the need to initially identify oneself to a professional. MaanSarathi — meaning "guide of the mind" in Sanskrit — is designed precisely for this context.'),
      ...blank(1),
      sh('Need for the Project'),
      par('Existing digital mental health solutions either offer simple rule-based chatbots with limited contextual understanding, or are expensive clinical platforms inaccessible to general users. Few systems integrate conversational AI, standardised clinical assessments, long-term mood and habit tracking, crisis safety protocols, and professional therapist oversight into a single, cohesive platform. MaanSarathi addresses this gap.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '1.2 Objectives of the Project', bold: true, font: 'Times New Roman' })] }),
      par('The primary objectives of MaanSarathi are as follows:'), ...blank(1),
      num(1, 'To develop a context-aware, empathetic AI conversational companion using a multi-provider LLM architecture with automatic failover for high availability.'),
      num(2, 'To implement a robust crisis detection pipeline that analyses user messages for distress signals and responds with de-escalation resources or clinical escalation.'),
      num(3, 'To build a long-term conversation memory system that tracks emotional patterns, therapeutic goals, and action items across sessions.'),
      num(4, 'To provide standardised clinical assessment tools (GAD-2, PHQ-9, Big Five, EI assessments) with automated scoring, interpretation, and trend analysis.'),
      num(5, 'To develop a personalised recommendation engine suggesting mindfulness practices, CBT exercises, breathing techniques, and audio meditations.'),
      num(6, 'To implement daily tracking modules for mood, sleep, journaling, habits, gratitude, and daily intentions with visualised progress and AI-generated insights.'),
      num(7, 'To create a secure therapist portal enabling clinicians to view patient progress, manage bookings, and add clinical notes.'),
      num(8, 'To design an admin portal for content curation, assessment management, analytics, user management, and system health monitoring.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '1.3 Organization of the Report', bold: true, font: 'Times New Roman' })] }),
      num(1, 'Chapter 2 covers the Literature Survey — prior work in digital mental health, AI chatbots, and LLM applications.'),
      num(2, 'Chapter 3 presents the Software Requirements Specification (SRS).'),
      num(3, 'Chapter 4 details the System Design — architecture, DFDs, and UML diagrams.'),
      num(4, 'Chapter 5 describes the Project Plan — effort estimates, risk management, and timeline.'),
      num(5, 'Chapter 6 covers Implementation — modules, algorithms, tools, code, and screenshots.'),
      num(6, 'Chapter 7 discusses Testing and test cases.'),
      num(7, 'Chapter 8 presents the Conclusion and future scope.'),
      num(8, 'Chapter 9 lists References.'),

      // ════════════════════════════════════════════════════════════════════
      //  CH 2 – LITERATURE SURVEY
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('2', 'LITERATURE SURVEY'),
      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '2.1 Literature Survey', bold: true, font: 'Times New Roman' })] }),
      rule(),
      par('Research on AI-assisted mental health systems has grown substantially over the past decade. The following review organises key studies by theme, identifying the gaps that MaanSarathi addresses.'),
      ...blank(1),
      sh('2.1.1 AI Chatbots for Mental Health Support'),
      par('Fitzpatrick et al. (2017) demonstrated that Woebot, a rule-based chatbot delivering CBT techniques, produced significant reductions in depression and anxiety symptoms over two weeks. However, Woebot relied on scripted decision trees, limiting conversational naturalness. Vaidyam et al. (2019) reviewed 13 chatbot platforms, finding that most lacked longitudinal memory, crisis detection, and integration with professional care pathways — gaps MaanSarathi explicitly addresses.'),
      ...blank(1),
      sh('2.1.2 Large Language Models in Healthcare'),
      par('With transformer-based LLMs such as GPT-3 (Brown et al., 2020), GPT-4, and Claude, conversational quality has improved dramatically. Yang et al. (2022) found that appropriately prompted LLMs produce empathetic responses comparable to human counsellors. MaanSarathi addresses hallucination risks by using structured system prompts with explicit therapeutic role-playing guidelines and relying on LLMs for empathetic dialogue rather than clinical diagnosis.'),
      ...blank(1),
      sh('2.1.3 Crisis Detection and Safety Systems'),
      par('Coppersmith et al. (2018) demonstrated that ML models can detect suicidal ideation from text with reasonable sensitivity. Liu et al. (2020) proposed a multi-modal crisis detection framework combining keyword matching, sentiment analysis, and intent classification. MaanSarathi\'s crisis detection module draws on these principles with a layered approach: keyword matching, AI severity scoring, and structured escalation pathways.'),
      ...blank(1),
      sh('2.1.4 Mood Tracking and Digital Phenotyping'),
      par('Mohr et al. (2017) introduced the concept of digital phenotyping — using smartphone data to infer mental health states. MaanSarathi extends mood tracking by combining explicit mood logging with sleep logs, habit tracking, and AI-generated pattern summaries.'),
      ...blank(1),
      sh('2.1.5 Clinical Assessments in Digital Platforms'),
      par('Validated instruments such as PHQ-9 (Kroenke et al., 2001) and GAD-7 (Spitzer et al., 2006) have been successfully adapted for digital administration. Titov et al. (2018) demonstrated that online administration produces psychometrically equivalent results to paper-based administration.'),
      ...blank(1),
      sh('2.1.6 Personalised Recommendation in Mental Health'),
      par('Torous et al. (2020) applied collaborative filtering and content-based recommendation techniques to mental health content delivery. MaanSarathi\'s recommendation service derives focus areas from assessment scores, sentiment keywords, and mood trends, then ranks practices and content by relevance.'),
      ...blank(1),
      sh('2.1.7 Therapist-Patient Digital Integration'),
      par('Platforms such as BetterHelp and Talkspace have shown that online therapist-patient matching is effective (Luo et al., 2020). MaanSarathi complements this with a therapist portal surfacing AI-generated summaries of patient progress.'),
      ...blank(1),
      sh('Table 2.1: Literature Survey Comparison'),
      ...blank(1),
      mkT(['Sr.', 'Author(s) / Year', 'Contribution', 'Gap Addressed'], [
        ['1', 'Fitzpatrick et al. (2017)', 'CBT chatbot reduces anxiety and depression', 'No LLM, no memory'],
        ['2', 'Vaidyam et al. (2019)', 'Systematic review of mental health chatbots', 'Lacks crisis detection and professional integration'],
        ['3', 'Yang et al. (2022)', 'GPT-3 for empathetic responses', 'No multi-provider fallback'],
        ['4', 'Liu et al. (2020)', 'Multi-modal crisis detection framework', 'Not integrated with care pathways'],
        ['5', 'Mohr et al. (2017)', 'Digital phenotyping for mental health', 'No therapist portal'],
        ['6', 'Torous et al. (2020)', 'Recommendation for mental health apps', 'No clinical integration'],
        ['7', 'Luo et al. (2020)', 'Online therapist-patient therapy', 'No AI progress summaries'],
      ], [540, 2160, 3240, 3420]),

      // ════════════════════════════════════════════════════════════════════
      //  CH 3 – SRS
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('3', 'SOFTWARE REQUIREMENTS SPECIFICATION'),
      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.1 Introduction', bold: true, font: 'Times New Roman' })] }),
      rule(),
      par('This Software Requirements Specification (SRS) provides a comprehensive description of the MaanSarathi platform. It defines functional and non-functional requirements, system constraints, hardware and software needs, and the project scope. This document serves as the contract between the development team and stakeholders, forming the basis for system design, implementation, and testing.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.2 Problem Statement', bold: true, font: 'Times New Roman' })] }),
      par('The current landscape of mental health support applications suffers from four core limitations:'),
      ...blank(1),
      bul('Shallow AI interaction: Most chatbots use rule-based or single-provider AI models that lack contextual memory, therapeutic depth, and resilience under high load.'),
      bul('No safety infrastructure: Few platforms implement structured crisis detection with escalation pathways, placing vulnerable users at risk.'),
      bul('Siloed data: Self-care apps, clinical assessments, and therapist communication exist in separate silos, providing an incomplete picture of patient wellbeing.'),
      bul('No professional integration: Consumer apps do not offer therapist portals, clinical notes, or supervised care pathways.'),
      ...blank(1),
      par('MaanSarathi addresses all four gaps in a single integrated platform.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.3 Project Scope', bold: true, font: 'Times New Roman' })] }),
      bul('Provide an AI-powered conversational companion accessible via web browser, with planned mobile support.'),
      bul('Deliver standardised clinical assessments with automated scoring and longitudinal trend tracking.'),
      bul('Offer daily tracking for mood, sleep, journaling, gratitude, habits, and daily intentions.'),
      bul('Generate personalised content and practice recommendations based on user data.'),
      bul('Detect and respond to mental health crises with structured safety protocols.'),
      bul('Provide a therapist portal for patient oversight and appointment management.'),
      bul('Provide an admin portal for content management, analytics, and system health monitoring.'),
      bul('Scope is limited to the web application for the current release; mobile is planned as future scope.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.4 User Classes and Characteristics', bold: true, font: 'Times New Roman' })] }),
      mkT(['User Role', 'Description', 'Technical Proficiency'], [
        ['End User', 'General public seeking mental health support, mood tracking, and wellbeing resources. No prior clinical experience required.', 'Low to Medium'],
        ['Therapist', 'Licensed mental health clinicians who access patient progress, manage bookings, and add clinical notes.', 'Medium'],
        ['Admin', 'Platform administrators managing content, assessments, users, and monitoring system health.', 'High'],
      ], [1800, 5040, 2520]),
      ...blank(1),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.5 Functional Requirements', bold: true, font: 'Times New Roman' })] }),
      sh('FR-01: Authentication and User Management'),
      bul('System shall support registration and login via email/password and Google OAuth (Passport.js).'),
      bul('System shall enforce JWT-based session management with configurable expiry.'),
      bul('System shall support three user roles: End User, Therapist, Admin.'),
      ...blank(1),
      sh('FR-02: AI Conversational Engine'),
      bul('System shall provide an AI chat interface supporting multi-turn conversations.'),
      bul('System shall route LLM requests across Gemini, OpenAI, Anthropic, and Hugging Face with automatic fallback.'),
      bul('System shall maintain conversation memory tracking emotional patterns, goals, and action items.'),
      bul('System shall detect crisis language and respond with grounding exercises or escalation.'),
      ...blank(1),
      sh('FR-03: Clinical Assessments'),
      bul('System shall offer standardised assessments including GAD-2, PHQ-9, Big Five, and EI scales.'),
      bul('System shall automatically score and interpret assessment responses.'),
      bul('System shall generate wellness scores and longitudinal trend insights.'),
      ...blank(1),
      sh('FR-04: Daily Tracking'),
      bul('System shall allow users to log mood with emotion, intensity, triggers, and notes.'),
      bul('System shall track sleep hygiene, daily intentions, gratitude entries, and habits.'),
      bul('System shall provide an AI-powered journal with pattern recognition and writing prompts.'),
      ...blank(1),
      sh('FR-05: Personalised Recommendations'),
      bul('System shall recommend practices and content based on current mood, assessment results, and engagement history.'),
      bul('System shall provide a multimedia content library with articles, audio meditations, breathing exercises, and yoga sequences.'),
      ...blank(1),
      sh('FR-06: Therapist Portal'),
      bul('Therapists shall view a list of assigned patients and their wellbeing summaries.'),
      bul('Therapists shall be able to add clinical notes and manage appointment bookings.'),
      bul('Therapist data access shall be role-restricted via requireTherapist() middleware.'),
      ...blank(1),
      sh('FR-07: Admin Portal'),
      bul('Admins shall manage content, assessments, users, therapist profiles, and platform settings.'),
      bul('Admins shall access AI performance analytics, system health metrics, and user engagement reports.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.6 Non-Functional Requirements', bold: true, font: 'Times New Roman' })] }),
      sh('3.6.1 Performance Requirements'),
      bul('API response time for standard requests shall not exceed 2 seconds under normal load.'),
      bul('LLM response streaming shall begin within 3 seconds of message submission.'),
      bul('The system shall support at least 500 concurrent users in production.'),
      sh('3.6.2 Safety Requirements'),
      bul('Crisis detection shall execute on every user message before AI response generation.'),
      bul('All crisis events shall be persisted to the database for clinical review.'),
      sh('3.6.3 Security Requirements'),
      bul('All sensitive data shall be encrypted in transit via HTTPS (TLS 1.2+).'),
      bul('JWT secrets and OAuth credentials shall be stored as environment variables, never hardcoded.'),
      bul('API endpoints shall enforce role-based access control (RBAC).'),
      sh('3.6.4 Software Quality Attributes'),
      bul('Availability: 99.5% uptime aided by LLM provider fallback.'),
      bul('Maintainability: TypeScript throughout, service-layer separation, comprehensive test coverage.'),
      bul('Usability: accessible on modern desktop browsers; WCAG 2.1 AA compliance targeted.'),
      bul('Scalability: supports horizontal scaling of backend and database replication.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.7 System Requirements', bold: true, font: 'Times New Roman' })] }),
      sh('3.7.1 Hardware Requirements'),
      bul('Processor: Intel Core i5 or equivalent (minimum)'),
      bul('RAM: 8 GB (minimum), 16 GB recommended'),
      bul('Storage: 20 GB free disk space'),
      bul('Internet connection for LLM API calls and package installation'),
      ...blank(1),
      sh('3.7.2 Software Requirements'),
      mkT(['Component', 'Technology'], [
        ['Frontend Framework', 'React 18 + Vite (TypeScript)'],
        ['Backend Framework', 'Express.js (TypeScript)'],
        ['Database (Production)', 'PostgreSQL 15'],
        ['Database (Development)', 'SQLite via Prisma'],
        ['ORM', 'Prisma 5.x'],
        ['Authentication', 'JWT + Google OAuth (Passport.js)'],
        ['State Management', 'Zustand + React Context + TanStack Query'],
        ['AI Providers', 'Google Gemini, OpenAI GPT-4o, Anthropic Claude, Hugging Face, NVIDIA'],
        ['Runtime', 'Node.js 18+'],
        ['Styling', 'Tailwind CSS + Radix UI'],
        ['Mobile (Future Scope)', 'React Native / Expo'],
      ], [3600, 5760]),

      // ════════════════════════════════════════════════════════════════════
      //  CH 4 – SYSTEM DESIGN (all 14 diagrams)
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('4', 'SYSTEM DESIGN'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.1 System Architecture', bold: true, font: 'Times New Roman' })] }),
      rule(),
      par('MaanSarathi follows a modular monolith architecture within a single monorepo comprising a React web frontend, an Express.js backend API, a Prisma data layer, and specialised AI and business logic services.'),
      par('High-Level Flow: User (Web Browser) → React Frontend (Vite) → Express.js Backend API → AI Orchestration Layer (LLMService + ChatService) → Multi-Provider LLMs → Response → Prisma ORM → PostgreSQL / SQLite.'),
      ...blank(1),
      ...img(4, 'Figure 4.1: MaanSarathi – System Architecture Diagram'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.2 Data Flow Diagrams', bold: true, font: 'Times New Roman' })] }),
      rule(),
      sh('4.2.1 DFD Level 0 (Context Diagram) and Level 1 (Detailed Diagram)'),
      par('At the context level, MaanSarathi accepts inputs from three external actors — End Users, Therapists, and Administrators — and interacts with external AI Providers, a Notification Service, and a Google OAuth / JWT Authentication Service. At Level 1, the system decomposes into seven major functional modules: Authentication Process, Chat & AI Management, Assessment Management, Tracking & Reflection Management, Content & Recommendation Management, Notification Management, and Analytics & Reporting.'),
      ...blank(1),
      ...img(7, 'Figure 4.2: DFD Level 0 (Context Diagram) and Level 1 (Detailed Diagram)'),
      ...blank(1),
      sh('4.2.2 DFD – All Levels (Level 0, Level 1, Level 2 – Chat & AI Process)'),
      par('The comprehensive DFD shows all three levels. At Level 2, the Chat & AI processing flow is broken down into sub-processes: Receive & Validate Message, Retrieve Context & Conversation History, Preprocess Input (NLP), AI Orchestrator (Select LLM), Generate AI Response, Post-process Response, Crisis Detection, Trigger Crisis Protocol, and Update Insights & Patterns.'),
      ...blank(1),
      ...img(2, 'Figure 4.3: DFD – All Levels (Level 0, Level 1, and Level 2 – Chat & AI Process)'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.3 UML Diagrams', bold: true, font: 'Times New Roman' })] }),
      rule(),
      sh('4.3.1 Use Case Diagram'),
      par('The Overall System Use Case Diagram shows all actors — User, Therapist, and Admin — and their interactions across the six functional subsystems: AI & Conversational Engine, Clinical Assessments, Daily Tracking & Reflection, Content & Practices, Therapist Portal, and Admin & Platform Management, plus the Authentication & Account module.'),
      ...blank(1),
      ...img(14, 'Figure 4.4: Overall System Use Case Diagram – MaanSarathi'),

      sh('4.3.2 Class Diagram'),
      par('The Class Diagram describes the main domain classes — User, Profile, Conversation, Message, ChatService, LLMService, AIProvider (abstract), GeminiProvider, OpenAIProvider, AnthropicProvider, HuggingFaceProvider, MemoryStore, CrisisDetector, RecommendationService, Assessment, AssessmentSession, Score, InsightEngine, Content, Practice, MoodEntry, JournalEntry, SleepLog, Habit, Therapist, and Admin — with their attributes, methods, and relationships.'),
      ...blank(1),
      ...img(13, 'Figure 4.5: Class Diagram – MaanSarathi Main System Architecture'),

      sh('4.3.3 Sequence Diagrams'),
      par('Sequence Diagram – Chat Flow (AI Conversation): Shows the complete flow from a user sending a message through POST /api/chat/message, ChatService processing it, LLMService selecting a provider with fallback, CrisisDetector analyzing the response, ConversationMemory being updated, and the final response returned with recommendations or grounding exercises.'),
      ...blank(1),
      ...img(12, 'Figure 4.6: Sequence Diagram – Chat Flow (AI Conversation)'),
      ...blank(1),
      par('The following diagram provides an overview of five key sequence flows: (1) AI Chat Conversation, (2) Mood Logging, (3) Assessment Submission, (4) Recommendation Generation, and (5) Therapist Interaction.'),
      ...blank(1),
      ...img(1, 'Figure 4.7: MaanSarathi – Sequence Diagrams Overview (5 Key Flows)'),
      ...blank(1),
      par('Sequence Diagram – Chat + AI Flow (Detailed): Shows the detailed WebSocket / HTTP flow including alternative flows for crisis detection, LLM failure fallback, and network error recovery.'),
      ...blank(1),
      ...img(3, 'Figure 4.8: Sequence Diagram – Chat + AI Flow (Detailed)'),
      ...blank(1),
      par('Sequence Diagram – Assessment Submission Flow: Shows the flow from a user selecting an assessment, through the Assessment Service creating a session, iteratively fetching questions, saving answers, calculating scores, and returning AI-generated insights.'),
      ...blank(1),
      ...img(6, 'Figure 4.9: Sequence Diagram – Assessment Submission Flow'),

      sh('4.3.4 Activity Diagrams'),
      par('Activity Diagram – User Journey (End-to-End Flow): Shows the complete user journey from opening MaanSarathi through Login/Register, Dashboard, and four primary paths: Chat with AI, Take Assessment, Track & Reflect, and Explore Content — with the crisis detection branch in the chat path.'),
      ...blank(1),
      ...img(11, 'Figure 4.10: Activity Diagram – User Journey (End-to-End Flow)'),
      ...blank(1),
      par('Activity Diagram – Crisis Detection Logic: Shows the advanced AI flow through five stages: User Input, AI Analysis Pipeline (NLP preprocessing, context retrieval, feature extraction, LLM + NLP analysis, crisis score generation), Risk Evaluation, Response Actions (High / Medium / Low Risk pathways), and Follow-up & Monitoring.'),
      ...blank(1),
      ...img(5, 'Figure 4.11: Activity Diagram – Crisis Detection Logic'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.4 Component Diagram', bold: true, font: 'Times New Roman' })] }),
      rule(),
      par('The Component Diagram provides a high-level view of major components and their interactions. The three client applications communicate through the API Gateway to Backend Services: Core Modules (Auth, User, Chat, Assessment, Tracking, Notification), an AI & Intelligence Layer (LLM Service, Crisis Detector, Recommendation Service), Shared Services (File, Content, Search, Analytics), and a Data Layer (PostgreSQL, Redis, Object Storage).'),
      ...blank(1),
      ...img(9, 'Figure 4.12: Component Diagram – MaanSarathi System Architecture'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.5 Entity-Relationship (ER) Diagram', bold: true, font: 'Times New Roman' })] }),
      rule(),
      par('The ER Diagram shows the complete database schema with all primary and foreign key relationships. Key entities include: User, UserPreference, Therapist, Admin, Conversation, Message, Memory, Insight, Assessment, AssessmentSession, AssessmentResponse, Question, MoodEntry, SleepLog, JournalEntry, Habit, Content, Recommendation, CrisisAlert, and CrisisResourceUsage. All tables use UUID as primary key; JSON fields store flexible AI-generated and metadata content.'),
      ...blank(1),
      ...img(8, 'Figure 4.13: ER Diagram – MaanSarathi Database Design'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.6 State Machine Diagram', bold: true, font: 'Times New Roman' })] }),
      rule(),
      par('The State Machine Diagram shows the Chat / User State Lifecycle. The session begins in the Idle state → Processing Message (validate input, retrieve context) → Generating Response (LLMService with user context and profile) → Checking Safety (CrisisDetector). If no risk: Sending Response → Waiting for Next Input. If risk detected: Crisis Handling (grounding exercises, emergency resources) → Escalation (notify therapist/emergency if required). On timeout or user exit: Ending Session (summarise conversation, update insights) → Ended.'),
      ...blank(1),
      ...img(10, 'Figure 4.14: State Machine Diagram – Chat / User State Lifecycle'),

      // ════════════════════════════════════════════════════════════════════
      //  CH 5 – PROJECT PLAN
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('5', 'PROJECT PLAN'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '5.1 Project Estimates', bold: true, font: 'Times New Roman' })] }),
      rule(),
      sh('5.1.1 Effort Estimate Timetable'),
      ...blank(1),
      mkT(['Task', 'Effort', 'Deliverables', 'Milestones'], [
        ['Analysis of existing systems and requirement gathering', '4 weeks', 'Requirements Document', '–'],
        ['Literature Survey', '1 week', 'Survey Report', '–'],
        ['System Architecture and Design', '2 weeks', 'Design Document, SRS', '–'],
        ['Database Schema Design (Prisma)', '1 week', 'schema.prisma', '–'],
        ['Backend API Development', '5 weeks', 'Express.js API', 'Working API'],
        ['AI Service Integration', '3 weeks', 'LLM Services', 'AI Chat Working'],
        ['Frontend Development (React + Tailwind)', '5 weeks', 'React Web App', 'Working UI'],
        ['Assessment Engine and Tracking Modules', '2 weeks', 'Assessment + Mood', '–'],
        ['Admin and Therapist Portals', '2 weeks', 'Portal UIs', '–'],
        ['Testing (Unit + Integration)', '3 weeks', 'Test Reports', 'Formal Review'],
        ['Documentation and Report Writing', '2 weeks', 'Project Report', 'Final Submission'],
      ], [3240, 1080, 2520, 2520]),
      ...blank(1),
      sh('5.1.2 Project Schedule'),
      ...blank(1),
      mkT(['Month', 'Phase', 'Date', 'Work Done'], [
        ['July 2024', 'Topic Searching', '16/06/2024', 'Topic Searched'],
        ['August 2024', 'Topic Selection', '01/07/2024', 'Topic Selected'],
        ['', 'Project Confirmation', '04/07/2024', 'Project Confirmed'],
        ['September 2024', 'Review 1', '01/08/2024', 'Review 1 Done'],
        ['October 2024', 'Requirement Gathering', '23/08/2024', 'Requirements Gathered'],
        ['November 2024', 'Coding – Core Modules', '02/10/2024', 'Auth, Chat, Mood Modules Coded'],
        ['December 2024', 'Review 2', '15/10/2024', 'Review 2 Done'],
        ['January 2025', 'AI Integration & Portals', '03/01/2025', 'LLM Providers + Portals Built'],
        ['February 2025', 'Review 3', '03/02/2025', 'Review 3 Done'],
        ['', 'Crisis Detection + Mobile', '08/02/2025', 'Crisis Detection + React Native Scaffold'],
        ['March 2025', 'Optimisation & Testing', '08/03/2025', 'Performance, Security, Unit Tests'],
        ['April 2025', 'Review 4 / Final', '11/04/2025', 'Review 4 Done, Report Finalised'],
      ], [1800, 2520, 1440, 3600]),
      ...blank(1),
      sh('5.1.3 KLOC Estimation'),
      ...blank(1),
      mkT(['Sr. No.', 'Module', 'Estimated KLOC'], [
        ['1', 'Backend API (controllers, routes, services)', '12.5'],
        ['2', 'AI Services (LLMService, ChatService, CrisisDetection, Memory)', '6.8'],
        ['3', 'Frontend (React components, hooks, services)', '18.2'],
        ['4', 'Admin and Therapist Portals', '5.4'],
        ['5', 'Assessment Engine (scoring, insights)', '3.2'],
        ['6', 'Mobile App (future scope – React Native)', '8.0'],
        ['7', 'Database Schema and Seed Scripts', '1.5'],
        ['', 'TOTAL', '55.6'],
      ], [900, 6120, 2340]),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '5.2 Risk Management', bold: true, font: 'Times New Roman' })] }),
      rule(), ...blank(1),
      mkT(['Risk', 'Probability', 'Impact', 'Mitigation Strategy'], [
        ['LLM API downtime or rate limiting', 'Medium', 'High', 'Multi-provider fallback (Gemini→HuggingFace→OpenAI→Anthropic)'],
        ['User data privacy breach', 'Low', 'Very High', 'HTTPS, JWT, env-var secrets, CORS, role-based access control'],
        ['Crisis detection false negative', 'Low', 'Very High', 'Layered detection: keyword + AI scoring + admin alert'],
        ['Database corruption or data loss', 'Low', 'High', 'Regular backups, Prisma migrations, staging environment'],
        ['Scope creep beyond mobile app', 'High', 'Medium', 'Scope fixed to web; mobile listed as future scope'],
        ['Team member unavailability', 'Medium', 'Medium', 'Modular codebase; each module independently workable'],
      ], [2520, 1080, 1080, 4680]),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '5.3 Timeline Chart', bold: true, font: 'Times New Roman' })] }),
      rule(), ...blank(1),
      mkT(['Month', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'], [
        ['Finalise Topic', '✓', '', '', '', '', '', '', '', '', ''],
        ['Literature Survey', '', '✓', '', '', '', '', '', '', '', ''],
        ['Design & Planning', '', '', '✓', '', '', '', '', '', '', ''],
        ['Mid-sem Report', '', '', '', '✓', '', '', '', '', '', ''],
        ['Backend Development', '', '', '', '', '✓', '✓', '', '', '', ''],
        ['Frontend Development', '', '', '', '', '', '✓', '✓', '', '', ''],
        ['AI Integration', '', '', '', '', '', '', '✓', '✓', '', ''],
        ['Testing', '', '', '', '', '', '', '', '', '✓', ''],
        ['Final Report', '', '', '', '', '', '', '', '', '', '✓'],
      ], [2520, 630, 630, 630, 630, 630, 630, 630, 630, 630, 630]),

      // ════════════════════════════════════════════════════════════════════
      //  CH 6 – IMPLEMENTATION
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('6', 'IMPLEMENTATION'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.1 Module Descriptions', bold: true, font: 'Times New Roman' })] }),
      rule(),
      sh('Module 1: AI Conversational Engine'),
      par('The conversational engine is implemented across three primary services: LLMService, ChatService, and CrisisDetectionService.'),
      bul('LLMService maintains a registry of API providers, rotates keys to avoid rate limits, and selects the active provider using a priority queue with automatic fallback.'),
      bul('ChatService orchestrates the full message lifecycle: assembles context from user profile, mood history, conversation memory, and recent assessments; builds a therapeutic system prompt; invokes LLMService; post-processes the response to detect exercise card metadata; and persists the conversation.'),
      bul('CrisisDetectionService runs a two-pass analysis: keyword and pattern match against a curated crisis lexicon, followed by an AI-based severity score. If severity exceeds a threshold, it returns a crisis response pathway and persists a CrisisEvent record.'),
      ...blank(1),
      sh('Module 2: Clinical Assessment Engine'),
      par('The assessment engine supports configurable, standardised psychometric assessments defined by JSON schemas in the database. Scoring functions include scoreGad2(), scorePHQ9(), scoreBigFive(), scoreEq5(), and others applying validated clinical algorithms. Assessment insights are generated by buildAssessmentInsights() which derives wellness scores, trend direction, and AI-generated narrative summaries.'),
      ...blank(1),
      sh('Module 3: Daily Tracking'),
      bul('Mood: each entry records mood label, emotion category, intensity (1–10), trigger, and free-text notes.'),
      bul('Sleep: sleep hygiene logs capture bedtime, wake time, quality rating, and notes.'),
      bul('Journal: AI-powered journal analyses entry patterns and surfaces themes, affirmations, and writing prompts.'),
      bul('Habits: daily habit logging with streak calculations and adaptive nudges.'),
      bul('Gratitude and Intentions: daily gratitude entries and intention setting with AI-generated reflection prompts.'),
      ...blank(1),
      sh('Module 4: Personalised Recommendation Engine'),
      par('The EnhancedRecommendationService derives focus areas by combining recent assessment severity scores, prevalent emotion keywords from chat history, mood trend direction, and the user\'s wellness context. It ranks content and practice items by relevance, filters by engagement history to avoid repetition, and attaches contextual reasons for each recommendation.'),
      ...blank(1),
      sh('Module 5: Therapist Portal'),
      par('Therapists can view their assigned client list, review AI-generated wellbeing summaries, access historical assessment results, and add clinical notes. Appointment management is fully integrated. All access is gated by the requireTherapist() middleware.'),
      ...blank(1),
      sh('Module 6: Admin Portal'),
      bul('Content and Practice Management: CRUD operations on articles, meditations, exercises, and resources.'),
      bul('Assessment Management: create, edit, duplicate, and publish assessments; manage interpretation bands.'),
      bul('User and Therapist Management: view, deactivate, and manage user accounts.'),
      bul('Analytics: AI performance analytics, system health metrics, user engagement stats, and wellness impact analytics.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.2 Algorithms', bold: true, font: 'Times New Roman' })] }),
      rule(),
      sh('6.2.1 Multi-Provider LLM Routing Algorithm'),
      num(1, 'Read AI_PROVIDER_PRIORITY from environment (default: gemini, huggingface, openai, anthropic).'),
      num(2, 'For each provider in priority order: attempt to retrieve a healthy API key via round-robin rotation.'),
      num(3, 'Send the chat payload to the selected provider\'s API endpoint.'),
      num(4, 'If successful: return the response and log metrics.'),
      num(5, 'If failure: log, mark key as temporarily unhealthy, rotate to next key or next provider, retry.'),
      num(6, 'If all providers fail: throw AIProviderError with user-friendly message.'),
      ...blank(1),
      sh('6.2.2 Crisis Detection Algorithm'),
      num(1, 'Layer 1 — Keyword Matching: scan message against crisis lexicon organised by severity level.'),
      num(2, 'Layer 2 — AI Severity Scoring: if keyword score exceeds low threshold, send message to LLM for structured severity score (0–10).'),
      num(3, 'Layer 3 — Response Selection: (a) empathetic acknowledgement, (b) grounding exercise, or (c) emergency escalation with crisis helpline.'),
      num(4, 'Crisis events at level (b) or above persisted to CrisisEvent table for clinical review.'),
      ...blank(1),
      sh('6.2.3 Wellness Score Calculation'),
      num(1, 'Assessment component (40%): most recent session scores normalised to 0–100 using validated cut-offs.'),
      num(2, 'Mood component (30%): rolling 14-day mood average with streak bonuses for consistent logging.'),
      num(3, 'Engagement component (20%): proportion of days with at least one tracked activity over the past 30 days.'),
      num(4, 'Sleep component (10%): average sleep quality rating over the past 14 days.'),
      num(5, 'Components weighted and summed to produce wellness score (0–100), stored as WellnessSnapshot.'),
      ...blank(1),
      sh('6.2.4 Personalised Recommendation Scoring'),
      num(1, 'Focus area derivation: derived from assessment scores, mood keywords, and trend direction.'),
      num(2, 'Relevance boost: items tagged with user\'s focus areas receive a base relevance score.'),
      num(3, 'Engagement history penalty: recently completed items receive decay factor to promote variety.'),
      num(4, 'Mood-based filtering: items filtered to approaches appropriate for current mood.'),
      num(5, 'Final ranking: items sorted by adjusted relevance score; top N returned with generated reasons.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.3 Tools and Technologies Used', bold: true, font: 'Times New Roman' })] }),
      rule(), ...blank(1),
      mkT(['Technology', 'Version', 'Purpose'], [
        ['React', '18', 'Frontend UI library'],
        ['Vite', '5.x', 'Frontend build tool and dev server'],
        ['TypeScript', '5.x', 'Type-safe development across full stack'],
        ['Tailwind CSS', '3.x', 'Utility-first CSS styling'],
        ['Radix UI', 'Latest', 'Accessible, unstyled UI primitives'],
        ['Zustand', '4.x', 'Lightweight global state management'],
        ['TanStack Query', '5.x', 'Server state management and caching'],
        ['Express.js', '4.x', 'Backend REST API framework'],
        ['Prisma', '5.x', 'Type-safe ORM for database access'],
        ['PostgreSQL', '15', 'Production relational database'],
        ['SQLite', '3.x', 'Local development database (via Prisma)'],
        ['JWT / Passport.js', 'Latest', 'Authentication and Google OAuth'],
        ['Google Gemini API', 'Latest', 'Primary LLM provider'],
        ['OpenAI API', 'GPT-4o', 'Secondary LLM provider'],
        ['Anthropic API', 'Claude 3.5', 'Tertiary LLM provider'],
        ['Hugging Face', 'Inference API', 'Fallback LLM provider'],
        ['Zod', '3.x', 'Runtime schema validation middleware'],
        ['Recharts', '2.x', 'Data visualisation (mood and progress charts)'],
      ], [3240, 1440, 4680]),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.4 Sample Code', bold: true, font: 'Times New Roman' })] }),
      rule(),
      sh('6.4.1 LLMService – Multi-Provider Routing (TypeScript)'), ...blank(1),
      ...code([
        'async sendMessage(messages: ChatMessage[], options: LLMOptions) {',
        '  for (const providerName of this.providerPriority) {',
        '    const provider = this.providers[providerName];',
        '    if (!provider || !provider.isAvailable()) continue;',
        '    try {',
        '      const response = await provider.chat(messages, options);',
        '      this.logMetrics(providerName, "success");',
        '      return response;',
        '    } catch (err) {',
        '      this.logMetrics(providerName, "failure");',
        '      provider.rotateApiKey();',
        '    }',
        '  }',
        '  throw new AIProviderError("All LLM providers unavailable");',
        '}',
      ]),
      ...blank(1),
      sh('6.4.2 Crisis Detection – detectCrisisLanguage (TypeScript)'), ...blank(1),
      ...code([
        'async detectCrisisLanguage(message: string, userId: string) {',
        '  const keywordScore = this.keywordScanner.score(message);',
        '  if (keywordScore < CRISIS_THRESHOLD_LOW) return null;',
        '  const aiScore = await this.llmService.scoreCrisisSeverity(message);',
        '  const combined = 0.4 * keywordScore + 0.6 * aiScore;',
        '  if (combined >= CRISIS_THRESHOLD_EMERGENCY) {',
        '    await this.persistCrisisEvent(userId, combined, "emergency");',
        '    return this.buildEscalationResponse();',
        '  } else if (combined >= CRISIS_THRESHOLD_HIGH) {',
        '    await this.persistCrisisEvent(userId, combined, "grounding");',
        '    return this.buildGroundingExercise();',
        '  }',
        '  return this.buildEmpathyResponse();',
        '}',
      ]),
      ...blank(1),
      sh('6.4.3 Mood Controller – createMoodEntry (TypeScript)'), ...blank(1),
      ...code([
        'export const createMoodEntry = async (req: Request, res: Response) => {',
        '  const { mood, emotion, intensity, trigger, notes } = req.body;',
        '  const normalised = normalizeLegacyMood(mood);',
        '  const entry = await prisma.moodEntry.create({',
        '    data: {',
        '      userId: req.user.id,',
        '      mood: normalised,',
        '      emotion,',
        '      intensity: clamp(intensity, 1, 10),',
        '      trigger,',
        '      notes',
        '    }',
        '  });',
        '  res.json({ success: true, entry });',
        '};',
      ]),
      ...blank(1),
      sh('6.4.4 Wellness Score Calculation (TypeScript)'), ...blank(1),
      ...code([
        'function calculateWellnessScore(',
        '  assessments: AssessmentSession[],',
        '  moods: MoodEntry[],',
        '  engagement: EngagementData,',
        '  sleep: SleepLog[]',
        '): number {',
        '  const a = normaliseAssessments(assessments) * 0.40;',
        '  const m = computeMoodAvg(moods)        * 0.30;',
        '  const e = engagementRate(engagement)   * 0.20;',
        '  const s = avgSleepQuality(sleep)        * 0.10;',
        '  return Math.round(a + m + e + s);',
        '}',
      ]),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.5 Result Set / Screenshots', bold: true, font: 'Times New Roman' })] }),
      rule(),
      par('The following sections describe the key screens of the MaanSarathi platform. Screenshots should be inserted in the designated placeholders below.'),
      ...blank(1),
      sh('6.5.1 Landing Page and Authentication'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: BORDERS,
        spacing: { before: 200, after: 200 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Landing Page — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      sh('6.5.2 AI Chat Interface'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: BORDERS,
        spacing: { before: 200, after: 200 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: AI Chat Interface — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      sh('6.5.3 User Dashboard'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: BORDERS,
        spacing: { before: 200, after: 200 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Dashboard — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      sh('6.5.4 Clinical Assessment Screen'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: BORDERS,
        spacing: { before: 200, after: 200 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Assessment Screen — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      sh('6.5.5 Therapist Portal'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: BORDERS,
        spacing: { before: 200, after: 200 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Therapist Portal — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      sh('6.5.6 Admin Portal'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: BORDERS,
        spacing: { before: 200, after: 200 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Admin Portal — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),

      // ════════════════════════════════════════════════════════════════════
      //  CH 7 – TESTING
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('7', 'TESTING'),
      par('Software testing, depending on the testing method employed, can be implemented at any time in the development process. For MaanSarathi, a comprehensive multi-layered testing strategy is employed to ensure quality, security, and safety — particularly critical given the sensitive nature of the mental health domain.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Types of Testing Used', bold: true, font: 'Times New Roman' })] }),
      rule(),
      sh('Unit Testing'),
      par('Unit testing concentrates verification on the smallest element — the module. Individual service functions are unit-tested in isolation using Vitest. Key units tested include: assessment scoring functions (scoreGad2, scoreBigFive), mood normalisation (normalizeLegacyMood), wellness score computation, and recommendation ranking. Mocks are used for database and LLM dependencies.'),
      sh('Integration Testing'),
      par('Once all individual units have been tested, integration testing ensures no data is lost across interfaces. API endpoints are integration-tested using supertest against a test SQLite database, verifying that controllers, services, and the data layer interact correctly across the full request lifecycle.'),
      sh('System Testing'),
      par('Critical user journeys — registration, first chat interaction, crisis detection pathway, and assessment submission — are tested end-to-end in a staging environment.'),
      sh('White-Box Testing'),
      par('Applied to the LLM routing algorithm, crisis detection logic, assessment scoring algorithms, and wellness score calculation to verify internal program logic and data flows.'),
      sh('Black-Box Testing'),
      par('Applied to all API endpoints and user interface workflows to verify that defined inputs produce the expected outputs from a user perspective without knowledge of internal implementation.'),
      sh('Performance Testing'),
      par('Applied to LLM response times (< 3 seconds for streaming to begin), API response times (< 2 seconds standard), and concurrent user load testing.'),
      sh('Usability Testing'),
      par('Applied to the chat interface, dashboard, assessment flow, and therapist portal with representative user groups.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Test Cases – Test Results', bold: true, font: 'Times New Roman' })] }),
      rule(),
      sh('Table 7.1: Test Cases – Authentication Module'), ...blank(1),
      mkT(['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'], [
        ['Valid Registration', 'Name, email, password', 'Account created, JWT returned', 'Account created, redirect to dashboard', 'P'],
        ['Duplicate Email', 'Existing email', 'Error: "Email already registered"', 'Error: "Email already registered"', 'P'],
        ['Valid Login', 'Correct email/password', 'JWT token returned', 'Redirected to dashboard', 'P'],
        ['Invalid Password', 'Wrong credentials', 'Error: "Invalid credentials"', 'Error: "Invalid credentials"', 'P'],
        ['Google OAuth Login', 'Google token', 'JWT token returned', 'Logged in, redirect to dashboard', 'P'],
      ], [1800, 1800, 2160, 2160, 720]),
      ...blank(1),
      sh('Table 7.2: Test Cases – Chat and AI Engine'), ...blank(1),
      mkT(['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'], [
        ['Normal message', 'User message (no crisis)', 'AI response received', '200 OK, empathetic AI response', 'P'],
        ['Crisis message', 'High distress message', 'Crisis response + grounding exercise', 'Crisis response with emergency resources', 'P'],
        ['LLM provider fallback', 'Primary provider unavailable', 'Response from fallback provider', 'Response from backup LLM provider', 'P'],
        ['Memory retention', 'Reference to prior session detail', 'AI acknowledges prior context', 'AI references past conversation', 'P'],
        ['All providers unavailable', 'All API keys invalid', 'User-friendly error message', '503 with graceful error', 'P'],
      ], [1800, 1800, 2160, 2160, 720]),
      ...blank(1),
      sh('Table 7.3: Test Cases – Mood Tracking Module'), ...blank(1),
      mkT(['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'], [
        ['Create mood entry', 'mood, emotion, intensity=7, trigger', '201 Created, entry returned', 'Entry stored with all fields', 'P'],
        ['Invalid intensity', 'intensity=15', '400 Bad Request – validation error', 'Zod validation error: max 10', 'P'],
        ['Retrieve mood history', 'Authenticated GET', 'Array of mood entries with stats', 'Entries with distribution and streak', 'P'],
        ['Streak calculation', '7 consecutive days of entries', 'streak=7 in stats', 'Streak correctly calculated', 'P'],
      ], [1800, 1800, 2160, 2160, 720]),
      ...blank(1),
      sh('Table 7.4: Test Cases – Assessment Engine'), ...blank(1),
      mkT(['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'], [
        ['Submit GAD-2', '2 responses (0–3 scale)', 'Score 0–6, interpretation label', 'Score and severity label returned', 'P'],
        ['Submit PHQ-9', '9 responses (0–3 scale)', 'Score 0–27, severity band', 'Score with severity interpretation', 'P'],
        ['History retrieval', 'Authenticated GET', 'Past session results with trends', 'Historical sessions with trend data', 'P'],
        ['Invalid assessment ID', 'Non-existent ID', '404 Not Found', 'Error: Assessment not found', 'P'],
      ], [1800, 1800, 2160, 2160, 720]),
      ...blank(1),
      sh('Table 7.5: Test Cases – Admin and Therapist Portal'), ...blank(1),
      mkT(['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'], [
        ['Admin creates content', 'Title, body, type, tags', '201 Created, content object', 'Content stored and retrievable', 'P'],
        ['Non-admin on admin endpoint', 'End-user JWT on /admin', '403 Forbidden', 'Role-based access denied', 'P'],
        ['Therapist views client', 'Therapist JWT + client ID', '200 OK, patient summary', 'Patient wellbeing summary returned', 'P'],
        ['Wrong client access', 'Therapist JWT + unassigned ID', '403 Forbidden', 'Access denied – not assigned', 'P'],
      ], [1800, 1800, 2160, 2160, 720]),

      // ════════════════════════════════════════════════════════════════════
      //  CH 8 – CONCLUSION
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('8', 'CONCLUSION'),
      rule(),
      par('MaanSarathi represents a significant step forward in the application of Artificial Intelligence to digital mental health support. By integrating a multi-provider LLM conversational engine, a structured crisis detection and safety protocol, long-term conversation memory, standardised clinical assessments, comprehensive daily tracking, personalised recommendations, and professional therapist oversight into a single platform, MaanSarathi addresses the key limitations of existing digital mental health tools.'),
      ...blank(1),
      par('The platform\'s multi-provider AI architecture ensures high availability — a critical requirement for mental health applications where system downtime could leave vulnerable users without support at a critical moment. The crisis detection module provides a structured safety net, ensuring that users expressing distress are guided toward appropriate resources and care pathways rather than receiving generic AI responses.'),
      ...blank(1),
      par('From a technical standpoint, MaanSarathi demonstrates how modern full-stack technologies — React, Express.js, Prisma, and TypeScript — can be combined with cloud AI APIs to build a maintainable, scalable, and secure mental health platform. The platform has been designed with India\'s mental health landscape in mind, where a chronic shortage of professionals, widespread stigma, and growing smartphone penetration make a digital-first approach both necessary and timely.'),
      ...blank(1),
      sh('Future Scope'),
      bul('Mobile Application: The React Native/Expo mobile application, already scaffolded in the monorepo, will be fully developed with biometric authentication and push notifications.'),
      bul('Multilingual Support: Adding Hindi and other regional Indian language support.'),
      bul('Voice Interaction: Integration of speech recognition for voice-based journaling and chat.'),
      bul('Advanced Personalisation: Incorporating passive sensing signals (with user consent) to enhance the digital phenotyping model.'),
      bul('Clinical Research Partnerships: Collaborating with mental health institutions to validate MaanSarathi\'s insights against clinically administered evaluations.'),
      bul('Expanded Assessment Library: Adding validated instruments for PTSD, OCD, bipolar disorder, and substance use assessment.'),
      bul('Group Therapy Features: Facilitating moderated peer support groups supervised by therapists.'),

      // ════════════════════════════════════════════════════════════════════
      //  CH 9 – REFERENCES
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('9', 'REFERENCES'),
      rule(),
      num(1, 'Fitzpatrick, K. K., Darcy, A., & Vierhile, M. (2017). Delivering Cognitive Behavior Therapy to Young Adults With Symptoms of Depression and Anxiety Using a Fully Automated Conversational Agent (Woebot): A Randomized Controlled Trial. JMIR Mental Health, 4(2), e19.'),
      num(2, 'Vaidyam, A. N., Wisniewski, H., Halamka, J. D., Kashavan, M. S., & Torous, J. B. (2019). Chatbots and Conversational Agents in Mental Health: A Review of the Psychiatric Landscape. The Canadian Journal of Psychiatry, 64(7), 456–464.'),
      num(3, 'Yang, K., Zhang, T., & Ananiadou, S. (2022). A mental health knowledge graph for empathetic dialogue generation. Applied Sciences, 12(7), 3296.'),
      num(4, 'Singhal, K., Azizi, S., Tu, T., et al. (2022). Large Language Models Encode Clinical Knowledge. Nature, 620, 172–180.'),
      num(5, 'Liu, S., et al. (2020). Multi-Label Classification for Suicidal Ideation Detection. Proceedings of EMNLP 2020.'),
      num(6, 'Mohr, D. C., Zhang, M., & Schueller, S. M. (2017). Personal sensing: Understanding mental health using ubiquitous sensors and machine learning. Annual Review of Clinical Psychology, 13, 23–47.'),
      num(7, 'Kroenke, K., Spitzer, R. L., & Williams, J. B. (2001). The PHQ-9: validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606–613.'),
      num(8, 'Spitzer, R. L., Kroenke, K., Williams, J. B., & Lowe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166(10), 1092–1097.'),
      num(9, 'Torous, J., et al. (2020). Digital mental health and COVID-19. JMIR Mental Health, 7(3).'),
      num(10, 'Luo, C., et al. (2020). Smartphone-based blood pressure telemonitoring. Journal of Medical Internet Research, 22(4), e17504.'),
      num(11, 'World Health Organization. (2022). World Mental Health Report: Transforming Mental Health for All. WHO Press, Geneva.'),
      num(12, 'Brown, T. B., et al. (2020). Language Models are Few-Shot Learners (GPT-3). Advances in Neural Information Processing Systems, 33.'),
      num(13, 'Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of Deep Bidirectional Transformers. Proceedings of NAACL-HLT 2019.'),
      num(14, 'Titov, N., et al. (2018). ICBT in routine care. Internet Interventions, 13, 108–115.'),
      num(15, 'Coppersmith, G., et al. (2018). Natural Language Processing of Social Media as Screening for Suicide Risk. Biomedical Informatics Insights, 10.'),
      num(16, 'Prisma.io. (2024). Prisma Documentation. https://www.prisma.io/docs'),
      num(17, 'Meta Platforms, Inc. (2024). React 18 Documentation. https://react.dev'),
      num(18, 'OpenJS Foundation. (2024). Express.js Documentation. https://expressjs.com'),
      num(19, 'Google LLC. (2024). Gemini API Documentation. https://ai.google.dev'),
      num(20, 'OpenAI Inc. (2024). OpenAI API Reference. https://platform.openai.com/docs'),
      num(21, 'Anthropic PBC. (2024). Claude API Documentation. https://docs.anthropic.com'),
      num(22, 'Hugging Face Inc. (2024). Inference API Documentation. https://huggingface.co/docs/inference-endpoints'),
    ]
  }]
});

async function main() {
  const outputPath = path.join(__dirname, 'ManaSarathi_BlackBook_v3.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Done! Generated: ${outputPath} Size: ${buffer.length}`);
}

main().catch((error) => {
  console.error('Failed to generate document:', error);
  process.exit(1);
});
