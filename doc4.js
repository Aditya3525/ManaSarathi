const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak, ImageRun,
  PageBorderDisplay, PageBorderOffsetFrom
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Diagram image loader ─────────────────────────────────────────────────────
// All diagrams are 1316×924 px. We render at two sizes:
//   FULL  – wide diagrams (architecture, DFDs, sequence, activity)
//   HALF  – narrower diagrams where detail is readable at smaller size
const FW = 600, FH = 421;   // full width
const HW = 540, HH = 379;   // half width (for denser diagrams)

function imgFull(n, caption) { return imgAt(n, caption, FW, FH); }
function imgHalf(n, caption) { return imgAt(n, caption, HW, HH); }
function imgAt(n, caption, w, h) {
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
        children: [new TextRun({ text: caption, size: 20, bold: true, italics: true, font: 'Times New Roman' })],
      }),
    ];
  }

  const buf = fs.readFileSync(imagePath);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 120, after: 60 },
      children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: 'jpg' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 200 },
      children: [new TextRun({ text: caption, size: 20, bold: true, italics: true, font: 'Times New Roman' })]
    })
  ];
}

// ─── Borders ──────────────────────────────────────────────────────────────────
const CB = { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' };
const BORDERS = { top: CB, bottom: CB, left: CB, right: CB };
const NB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NB, bottom: NB, left: NB, right: NB };

// ─── Generic helpers ──────────────────────────────────────────────────────────
const blank = (n = 1) => Array.from({ length: n }, () =>
  new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun('')] }));

const pgBreak = () => new Paragraph({ children: [new PageBreak()] });

const rule = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 1 } },
  spacing: { before: 0, after: 160 },
  children: [new TextRun('')]
});

// Centred text helper
const ctr = (text, sz = 24, bold = false, italic = false) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: sz, bold, italics: italic, font: 'Times New Roman' })]
  });

// Body paragraph (justified)
const par = (text, opts = {}) =>
  new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80, line: 360 },
    indent: opts.indent ? { left: 360 } : {},
    children: [new TextRun({
      text, size: opts.sz || 24, bold: opts.bold || false,
      font: 'Times New Roman', italics: opts.italic || false
    })]
  });

// Sub-heading (bold left)
const sh = (text, sz = 24) =>
  new Paragraph({
    spacing: { before: 180, after: 80 },
    children: [new TextRun({ text, bold: true, size: sz, font: 'Times New Roman' })]
  });

// Bullet (dash indented)
const bul = (text, bold_label = '') =>
  new Paragraph({
    indent: { left: 540, hanging: 180 },
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: '-  ', size: 22, font: 'Times New Roman' }),
      ...(bold_label
        ? [new TextRun({ text: bold_label + ': ', size: 22, bold: true, font: 'Times New Roman' }),
           new TextRun({ text, size: 22, font: 'Times New Roman' })]
        : [new TextRun({ text, size: 22, font: 'Times New Roman' })])
    ]
  });

// Numbered item
const num = (n, text) =>
  new Paragraph({
    indent: { left: 540, hanging: 360 },
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: `${n}.   ${text}`, size: 24, font: 'Times New Roman' })]
  });

// Chapter opener: large number + title + rule (matches reference exactly)
const chap = (n, title) => [
  ...blank(3),
  ctr(`CHAPTER ${n}`, 56, true),
  ...blank(1),
  ctr(title, 36, true),
  rule(),
];

// ─── Table helpers ────────────────────────────────────────────────────────────
const hc = (text, w) => new TableCell({
  borders: BORDERS, width: { size: w, type: WidthType.DXA },
  shading: { fill: 'D9D9D9', type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  children: [new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text, bold: true, size: 22, font: 'Times New Roman' })] })]
});
const dc = (text, w, center = false) => new TableCell({
  borders: BORDERS, width: { size: w, type: WidthType.DXA },
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  children: [new Paragraph({ alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
    children: [new TextRun({ text, size: 22, font: 'Times New Roman' })] })]
});
const mkT = (cols, rows, widths) => new Table({
  width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths: widths,
  rows: [
    new TableRow({ children: cols.map((c, i) => hc(c, widths[i])) }),
    ...rows.map(r => new TableRow({ children: r.map((c, i) => dc(c, widths[i], true)) }))
  ]
});

// Name / Exam-No row (left-right aligned via borderless table)
const memberRow = (name, exam = '____________') => new Table({
  width: { size: 9000, type: WidthType.DXA }, columnWidths: [4500, 4500],
  rows: [new TableRow({ children: [
    new TableCell({ borders: NO_BORDERS, width: { size: 4500, type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 0, right: 0 },
      children: [new Paragraph({ alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: name, bold: true, size: 22, font: 'Times New Roman' })] })] }),
    new TableCell({ borders: NO_BORDERS, width: { size: 4500, type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 0, right: 0 },
      children: [new Paragraph({ alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text: `Exam No.: ${exam}`, size: 22, font: 'Times New Roman' })] })] })
  ]})]
});

// Three-column borderless table (for Guide / HOD / Principal)
const triRow = (a, b, c) => new Table({
  width: { size: 9000, type: WidthType.DXA }, columnWidths: [3000, 3000, 3000],
  rows: [new TableRow({ children: [a, b, c].map(t => new TableCell({
    borders: NO_BORDERS, width: { size: 3000, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 0, right: 0 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: t, size: 22, font: 'Times New Roman' })] })]
  }))})]
});
const triRowBold = (a, b, c) => new Table({
  width: { size: 9000, type: WidthType.DXA }, columnWidths: [3000, 3000, 3000],
  rows: [new TableRow({ children: [a, b, c].map(t => new TableCell({
    borders: NO_BORDERS, width: { size: 3000, type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 0, right: 0 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: t, bold: true, size: 22, font: 'Times New Roman' })] })]
  }))})]
});

// Code block
const code = lines => lines.map(l => new Paragraph({
  indent: { left: 720 }, spacing: { before: 0, after: 0 },
  children: [new TextRun({ text: l, size: 18, font: 'Courier New' })]
}));

// Screenshot placeholder box
const screenshotBox = caption => [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: BORDERS, spacing: { before: 200, after: 200 },
    shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
    children: [new TextRun({ text: `[ ${caption} — Insert Screenshot Here ]`,
      size: 20, font: 'Times New Roman', italics: true, color: '888888' })]
  }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 120 },
    children: [new TextRun({ text: `${caption}`, size: 20, bold: true, italics: true, font: 'Times New Roman' })] })
];

// ─── Page properties (equal margins + border) ─────────────────────────────────
const pageProps = () => ({
  size: { width: 11906, height: 16838 },
  margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
  borders: {
    pageBorderTop:    { style: BorderStyle.SINGLE, size: 18, space: 24 },
    pageBorderBottom: { style: BorderStyle.SINGLE, size: 18, space: 24 },
    pageBorderLeft:   { style: BorderStyle.SINGLE, size: 18, space: 24 },
    pageBorderRight:  { style: BorderStyle.SINGLE, size: 18, space: 24 },
    display:    PageBorderDisplay.ALL_PAGES,
    offsetFrom: PageBorderOffsetFrom.PAGE
  }
});

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
      //  TITLE PAGE
      // ════════════════════════════════════════════════════════════════════
      ...blank(2),
      ctr('A PROJECT REPORT ON', 22, true),
      ...blank(1),
      ctr('Manasarthi', 52, true),
      ctr('AI Powered Mental Wellness Platform with Holistic Healing and Emotional Support', 24, false, true),
      ...blank(1),
      ctr('SUBMITTED TO THE SAVITRIBAI PHULE PUNE UNIVERSITY, PUNE', 20),
      ctr('IN THE PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE AWARD OF THE DEGREE OF', 20),
      ...blank(1),
      ctr('BACHELOR OF ENGINEERING IN', 26, true),
      ctr('(INFORMATION TECHNOLOGY)', 26, true),
      ...blank(1),
      ctr('SUBMITTED BY', 22, true),
      ...blank(1),
      memberRow('Mr. Aditya Shirsat'),
      memberRow('Mr. Atharva Lole'),
      memberRow('Miss. Neha Kamble'),
      memberRow('Mr. Sourabha Shirkande'),
      ...blank(2),
      ctr('UNDER THE GUIDANCE OF', 20, true),
      ctr('Prof. R. R. Yadav', 24, true),
      ...blank(2),
      ctr('DEPARTMENT OF INFORMATION TECHNOLOGY', 22, true),
      ctr("STES'S SINHGAD ACADEMY OF ENGINEERING", 22, true),
      ctr('KONDHWA BK, PUNE – 411048', 22, true),
      ctr('SAVITRIBAI PHULE PUNE UNIVERSITY', 22, true),
      ctr('ACADEMIC YEAR 2025–2026', 22, true),

      // ════════════════════════════════════════════════════════════════════
      //  CERTIFICATE
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...blank(1),
      ctr('CERTIFICATE', 40, true),
      rule(),
      par('This is to certify that the project report entitled', { center: true }),
      ...blank(1),
      ctr('"Manasarthi – AI Powered Mental Wellness Platform with Holistic Healing and Emotional Support"', 26, true),
      ...blank(1),
      ctr('Submitted by', 22),
      ...blank(1),
      memberRow('Mr. Aditya Shirsat'),
      memberRow('Mr. Atharva Lole'),
      memberRow('Miss. Neha Kamble'),
      memberRow('Mr. Sourabha Shirkande'),
      ...blank(1),
      par('is a bonafide work carried out by them under the supervision of Prof. M. S. Kale and it is approved for the partial fulfilment of the requirement of Savitribai Phule Pune University, Pune for the award of the degree of Bachelor of Engineering (Information Technology).', { center: true }),
      ...blank(3),
      triRowBold('Prof. M. S. Kale', '', 'Dr. S. S. Kulkarni'),
      triRow('Guide & Internal Examiner', '', 'Head of Department'),
      triRow('(Name and Sign)', '', ''),
      ...blank(1),
      triRowBold('Dr. M. S. Rohokale', '', ''),
      triRow('External Examiner', '', 'Principal'),
      ...blank(2),
      new Paragraph({ spacing: { before: 0, after: 60 }, children: [
        new TextRun({ text: 'Place: Pune', size: 22, font: 'Times New Roman' }),
        new TextRun({ text: '                                              Date: ___ / ___ / 2025', size: 22, font: 'Times New Roman' })
      ]}),

      // ════════════════════════════════════════════════════════════════════
      //  ACKNOWLEDGEMENT
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'ACKNOWLEDGEMENT', bold: true, font: 'Times New Roman' })] }),
      rule(),
      ...blank(1),
      par('We hereby take this opportunity to record our sincere thanks and heartfelt gratitude to Prof. M. S. Kale for his valuable guidance, constant encouragement, and making available his intimate knowledge and experience throughout the development of "Manasarthi – AI Powered Mental Wellness Platform". His supervision proved invaluable in overcoming all hurdles during the completion of this project.'),
      ...blank(1),
      par('We express our sincere appreciation towards the efforts taken by our project co-ordinator Dr. S. L. Bangare, whose sincere guidance and leadership helped us achieve the milestones set periodically.'),
      ...blank(1),
      par('We are grateful to Dr. S. S. Kulkarni, Head of the Information Technology Department, for providing all necessary facilities and help. We also thank all teaching and non-teaching staff of the IT Department for their direct and indirect assistance in completing the project.'),
      ...blank(1),
      par('The acknowledgement would be incomplete without recording our gratitude to our Principal, Dr. M. S. Rohokale, Sinhgad Academy of Engineering, Pune. We also express our sincere thanks to the management, lab assistants, our friends and families who provided valuable guidance and moral support throughout.'),
      ...blank(2),
      memberRow('Mr. Aditya Shirsat'),
      memberRow('Mr. Atharva Lole'),
      memberRow('Miss. Neha Kamble'),
      memberRow('Mr. Sourabha Shirkande'),

      // ════════════════════════════════════════════════════════════════════
      //  ABSTRACT
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'ABSTRACT', bold: true, font: 'Times New Roman' })] }),
      rule(),
      ...blank(1),
      par('Manasarthi is an AI-powered mental wellness platform designed to revolutionize mental health support through intelligent personalization, crisis-aware assistance, and holistic healing capabilities. It offers secure multi-channel authentication using JWTs and Google OAuth, followed by comprehensive guided onboarding that captures user preferences, demographics, and consent details.'),
      ...blank(1),
      par('The system provides a dynamic dashboard with personalized greetings, mood check-ins, and access to a wide range of wellness features. It integrates clinically validated assessments (GAD-7, PHQ-9, PSS-10, PCL-5, PTQ, TEIQue, Mini-IPIP) with AI-generated insights for holistic mental health evaluation. Personalized wellness plans based on western, eastern, or hybrid therapeutic approaches and structured progress tracking help users achieve long-term improvement in mental well-being.'),
      ...blank(1),
      par('An advanced AI chat companion connects multiple LLM providers (Gemini, OpenAI, Anthropic, Hugging Face, Ollama) with automatic failover, dual-layer crisis detection, and voice interaction. It supports proactive check-ins, contextual therapeutic exercises, and maintains conversation memory for continuity across sessions. The platform is built on a React 18 frontend, Express.js + TypeScript backend, Prisma ORM with 40+ optimized database indexes, and PostgreSQL in production.'),
      ...blank(1),
      par('The platform ensures high standards of data security, user privacy, and ethical AI practice while delivering scalable, empathetic, and personalized mental health support. Manasarthi bridges the critical gap in accessible mental healthcare by combining modern AI technologies with evidence-based clinical frameworks.'),
      ...blank(2),
      new Paragraph({ spacing: { before: 80, after: 80 }, children: [
        new TextRun({ text: 'Keywords: ', bold: true, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: 'Mental Health, AI Chatbot, Personalized Wellness, Crisis Detection, Data Security, LLM Integration, Emotional Support, Holistic Healing.', size: 24, font: 'Times New Roman' })
      ]}),

      // ════════════════════════════════════════════════════════════════════
      //  INDEX
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'INDEX', bold: true, font: 'Times New Roman' })] }),
      rule(), ...blank(1),
      mkT(['Sr. No.', 'Title of Chapter', 'Page No.'], [
        ['—', 'Certificate', '02'],
        ['—', 'Acknowledgement', '03'],
        ['—', 'Abstract', '04'],
        ['01', 'Introduction', '06'],
        ['', '1.1 Basic Concept', '06'],
        ['', '1.2 Need of Project', '07'],
        ['', '1.3 Purpose of Study', '08'],
        ['02', 'Literature Survey', '09'],
        ['03', 'Software Requirements Specification (SRS)', '13'],
        ['', '3.1 Project Scope', '13'],
        ['', '3.2 Features', '13'],
        ['', '3.3 Functional Requirements', '14'],
        ['', '3.4 External Interface Requirements', '15'],
        ['', '3.5 Non-Functional Requirements', '15'],
        ['04', 'System Design', '17'],
        ['', '4.1 System Architecture', '17'],
        ['', '4.2 Software Quality Attributes', '18'],
        ['', '4.3 Software Description', '18'],
        ['', '4.4 Data Flow Diagrams (DFD) – Up to Level 2', '19'],
        ['', '4.5 UML Diagrams', '22'],
        ['', '4.6 System UI Design (Screenshots)', '27'],
        ['05', 'Project Plan', '30'],
        ['06', 'Implementation', '32'],
        ['', '6.1 Data Collection and Preprocessing', '32'],
        ['', '6.2 System Workflow', '33'],
        ['', '6.3 Key Algorithms and Techniques', '34'],
        ['', '6.4 Coding Snapshot', '35'],
        ['', '6.5 Result Set (System Screenshots)', '36'],
        ['07', 'Testing', '37'],
        ['', '7.1 Types of Testing Used', '37'],
        ['', '7.2 White-Box Testing', '38'],
        ['', '7.3 Black-Box Testing', '38'],
        ['', '7.4 Test Cases and Results', '39'],
        ['08', 'Conclusion and Future Scope', '41'],
        ['09', 'References', '43'],
        ['—', 'Appendix (Patent / Research Paper)', '46'],
      ], [1200, 6600, 1560]),

      // ── List of Figures ───────────────────────────────────────────────
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'LIST OF FIGURES', bold: true, font: 'Times New Roman' })] }),
      rule(), ...blank(1),
      mkT(['Figure No.', 'Title', 'Page No.'], [
        ['4.1', 'Manasarthi – System Architecture Diagram', '17'],
        ['4.2', 'DFD Level 0 – Context Diagram', '19'],
        ['4.3', 'DFD Level 1 – Detailed Diagram', '20'],
        ['4.4', 'DFD Level 2 – Chat & AI Process (Detailed)', '21'],
        ['4.5', 'Overall System Use Case Diagram', '22'],
        ['4.6', 'Class Diagram – Manasarthi Main System Architecture', '23'],
        ['4.7', 'Sequence Diagram – Chat Flow (AI Conversation)', '24'],
        ['4.8', 'Sequence Diagrams Overview – 5 Key Flows', '24'],
        ['4.9', 'Sequence Diagram – Chat + AI Flow (Detailed)', '25'],
        ['4.10', 'Sequence Diagram – Assessment Submission Flow', '25'],
        ['4.11', 'Activity Diagram – User Journey (End-to-End Flow)', '26'],
        ['4.12', 'Activity Diagram – Crisis Detection Logic', '26'],
        ['4.13', 'Component Diagram – Manasarthi System Architecture', '27'],
        ['4.14', 'ER Diagram – Manasarthi Database Design', '27'],
        ['4.15', 'State Machine Diagram – Chat / User State Lifecycle', '28'],
      ], [1440, 7200, 720]),

      // ── List of Tables ────────────────────────────────────────────────
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'LIST OF TABLES', bold: true, font: 'Times New Roman' })] }),
      rule(), ...blank(1),
      mkT(['Table No.', 'Title', 'Page No.'], [
        ['2.1', 'Literature Survey Comparison', '12'],
        ['5.1', 'Planning and Scheduling', '30'],
        ['7.1', 'Test Cases and Results', '39'],
      ], [1440, 7200, 720]),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 1 — INTRODUCTION
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('1', 'INTRODUCTION'),
      par('Manasarthi is a comprehensive, AI-driven mental health platform designed to provide accessible, personalized mental healthcare support. The system addresses the growing global mental health crisis by offering an intelligent companion that combines clinical assessment tools, therapeutic conversations, personalized wellness plans, and continuous progress tracking in a single, secure platform.'),
      ...blank(1),
      par('The core motivation behind Manasarthi stems from the critical gap in mental healthcare accessibility. Traditional therapy faces barriers including high costs, social stigma, long wait times, and geographical limitations. Many individuals struggle with mental health challenges but lack immediate access to professional support or feel uncomfortable seeking traditional help. Existing digital solutions often provide fragmented care, lacking integration between assessment, therapy, and progress tracking.'),
      ...blank(1),
      par('Manasarthi addresses these challenges through a modular, AI-powered architecture that integrates multiple mental healthcare components. The platform features intelligent onboarding that understands user preferences and needs, comprehensive assessment tools validated against clinical standards, and an AI chat companion with dual-layer crisis detection capabilities. The system maintains conversation memory and adapts responses based on user history, assessment results, and expressed preferences. A unique feature is the multi-provider AI integration with automatic failover, ensuring reliable service availability. The platform also incorporates voice capabilities for accessibility, smart conversation management with archiving and search, and proactive engagement based on user patterns.'),

      sh('1.1 Basic Concept'),
      par('Manasarthi is an intelligent, modular platform for comprehensive mental health support. The core concepts include:'),
      ...blank(1),
      bul('Secure multi-channel authentication using email/password with JWT tokens and Google OAuth integration, with a separate admin authentication layer.', 'Multi-Modal Authentication'),
      bul('Comprehensive profile setup capturing therapeutic preferences (western, eastern, or hybrid), demographics, emergency contacts, and consent management.', 'Intelligent Onboarding'),
      bul('Validated mental health assessments (GAD-7, PHQ-9, PSS-10, PCL-5, PTQ, TEIQue, Mini-IPIP) with scoring, interpretation, and historical tracking.', 'Clinical Assessment Integration'),
      bul('Multi-provider LLM integration (Gemini, OpenAI, Anthropic, Hugging Face, Ollama) with dual-layer crisis detection, conversation memory, voice capabilities, and personalized responses.', 'AI-Powered Chat Companion'),
      bul('Dynamic content delivery based on user preferences and assessment results, with western, eastern, and hybrid therapeutic approaches and completion state tracking.', 'Personalized Wellness Plans'),
      bul('Mood journaling, metric tracking, and visualization dashboards for longitudinal insight into the mental health journey.', 'Progress Analytics'),
      bul('Admin-controlled library of therapeutic practices, exercises, and educational content with metadata and publishing controls.', 'Content Management'),

      sh('1.2 Need of Project'),
      bul('Rising global mental health challenges with insufficient professional resources to meet demand, creating a critical accessibility gap.', 'Mental Health Crisis'),
      bul('Social stigma prevents many individuals from seeking traditional therapy, creating the need for private, accessible alternatives.', 'Stigma Barriers'),
      bul('Professional therapy remains expensive and inaccessible for many populations, particularly in underserved and rural regions.', 'Cost Limitations'),
      bul('Existing mental health apps provide isolated features without integrated assessment, therapy, and progress tracking in one place.', 'Fragmented Digital Solutions'),
      bul('Mental health challenges do not follow office hours, creating an urgent need for immediate support during crises or difficult moments.', '24/7 Accessibility'),
      bul('One-size-fits-all approaches fail to account for individual preferences, cultural backgrounds, and specific mental health needs.', 'Personalization Gap'),
      bul('Lack of longitudinal tracking and AI-powered insights in most current mental health applications limits their therapeutic value.', 'Data-Driven Insights'),

      sh('1.3 Purpose of Study'),
      par('The purpose of the Manasarthi project study is to:'),
      ...blank(1),
      bul('Provide accessible, affordable support to individuals regardless of location, financial status, or background.', 'Democratize Mental Healthcare'),
      bul('Leverage multi-provider LLM integration, voice capabilities, and personalized recommendation engines to deliver compassionate, context-aware support.', 'Leverage AI Technologies'),
      bul('Create a private, non-judgmental environment where users can explore mental health challenges comfortably.', 'Reduce Mental Health Stigma'),
      bul('Implement crisis detection, emergency resource integration, and appropriate disclaimers for AI-based mental health support.', 'Provide Clinical Safety'),
      bul('Use comprehensive assessment tools, progress tracking, and AI-generated insights that help users understand and improve their mental wellbeing.', 'Enable Personal Growth'),
      bul('Create a scalable platform that can adapt to diverse cultural contexts including both western clinical and eastern healing traditions.', 'Address Global Mental Health Needs'),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 2 — LITERATURE SURVEY
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('2', 'LITERATURE SURVEY'),
      par('Research in the area of AI-driven mental health platforms has gained significant momentum in recent years, driven by advances in natural language processing, large language models, and digital health infrastructure. The integration of AI with mental wellness represents a paradigm shift in how mental healthcare is delivered, making support more accessible, personalized, and scalable.'),

      sh('2.1 Study of Research Papers'),
      ...blank(1),
      sh('[1] Thakkar, Gupta, and De Sousa (2024)', 22),
      par('In their paper "Artificial Intelligence in Positive Mental Health: A Narrative Review" published in Frontiers in Digital Health, the authors discussed how AI technologies can promote positive mental health outcomes. The study emphasized early detection of mental disorders, emotional monitoring, and AI-driven interventions. They highlighted that AI-driven platforms have significant potential in preventive care and personalized mental wellness programs.'),
      ...blank(1),
      sh('[2] Salcedo et al. (2023)', 22),
      par('Their review titled "Artificial Intelligence and Mental Health Issues: A Narrative Review" explored AI\'s role in identifying and managing various mental health issues using data-driven tools, machine learning models, and digital behavior tracking. The study also shed light on ethical, social, and privacy challenges associated with AI-based mental health technologies.'),
      ...blank(1),
      sh('[3] Ruiz-Vanoye et al. (2025)', 22),
      par('In "Artificial Intelligence and Human Well-Being," the authors analyzed how AI impacts human well-being and introduced the concept of "synthetic happiness," describing how AI systems can simulate or promote emotional satisfaction through adaptive digital environments, thereby improving users\' overall quality of life.'),
      ...blank(1),
      sh('[4] Laranjo et al. (2023)', 22),
      par('In "The Effects of an AI-Powered Chatbot on Mental Health," the authors investigated the psychological effects of interacting with AI-based chatbots designed for emotional support. Their findings suggested that AI chatbots can effectively reduce loneliness, anxiety, and depressive symptoms when designed with empathy, personalization, and confidentiality.'),
      ...blank(1),
      sh('[5] Guo et al. (2024)', 22),
      par('Their systematic review on "Large Language Models for Mental Health Support" provided a comprehensive analysis of how LLMs like GPT are being utilized for mental health support. The study concluded that LLMs can act as conversational companions capable of providing mental health guidance and early detection of distress patterns, although human oversight remains essential for safety.'),
      ...blank(1),
      sh('[6] Calvo et al. (2025)', 22),
      par('"Natural Language Processing in Mental Health Applications Using Non-Clinical Texts" focused on how NLP techniques analyze social media and online conversations to assess emotional states and detect signs of mental distress. The authors emphasized NLP models can complement clinical diagnosis by identifying subtle linguistic markers related to mental health.'),
      ...blank(1),
      sh('[7] Poria et al. (2023)', 22),
      par('Their survey on "Sentiment Analysis and Emotion Recognition" reviewed advanced AI and machine learning techniques for detecting human emotions from text, speech, and facial expressions. Their research provided a technical foundation for emotion-aware systems implementable in AI-driven mental health platforms like Manasarthi.'),
      ...blank(1),
      sh('[8] Halder (2025)', 22),
      par('In "Developing Mental Health Support Chatbots in India: Challenges and Insights," the author discussed regional and cultural challenges of designing chatbots for mental health support in India. The study emphasized the importance of multilingual models, cultural sensitivity, and integration of local psychological frameworks for better acceptance among Indian users.'),
      ...blank(1),
      sh('[9] Marade et al. (2025)', 22),
      par('Their paper on "Spiritual.AI: An AI-driven Platform for Enhancing Mental, Emotional, and Spiritual Well-being" introduced an innovative platform integrating spirituality, emotional therapy, and holistic healing. The paper demonstrated how AI algorithms can personalize spiritual and emotional wellness guidance to balance mind, body, and soul — a concept central to Manasarthi\'s eastern wellness track.'),
      ...blank(1),
      sh('[10] Casu et al. (2024)', 22),
      par('In "AI Chatbots for Mental Health: A Scoping Review of Effectiveness, Feasibility, and Applications," the authors assessed the effectiveness and feasibility of AI chatbots in psychological support. Their research found that AI chatbots can deliver accessible, affordable, and scalable mental health assistance, especially in areas lacking trained mental health professionals.'),
      ...blank(1),
      sh('Table 2.1: Literature Survey', 24),
      ...blank(1),
      mkT(['Sr. No.', 'Author / Paper', 'Key Contribution', 'Research Gap / Problem'], [
        ['1', 'Thakkar et al. (2024)', 'AI in positive mental health; preventive AI-driven interventions', 'Limited focus on crisis detection and real-time support'],
        ['2', 'Salcedo et al. (2023)', 'AI role in mental health issues; ethical AI challenges', 'Privacy and bias challenges in deployment'],
        ['3', 'Laranjo et al. (2023)', 'AI chatbots reducing anxiety and depressive symptoms', 'Lacks multi-provider LLM failover mechanism'],
        ['4', 'Guo et al. (2024)', 'LLMs for mental health support; distress pattern detection', 'Human oversight still required; safety concerns remain'],
        ['5', 'Halder (2025)', 'Chatbot challenges in India; multilingual needs', 'Lack of culturally adaptive AI mental health systems in India'],
        ['6', 'Marade et al. (2025)', 'Spiritual.AI: integrating spirituality with AI wellness', 'No integration with clinical assessment tools'],
        ['7', 'Casu et al. (2024)', 'AI chatbot effectiveness and feasibility for mental health', 'Limited scalability and real-world clinical integration'],
      ], [540, 2520, 3240, 3060]),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 3 — SRS
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('3', 'SOFTWARE REQUIREMENTS SPECIFICATION (SRS)'),
      par('A Software Requirements Specification (SRS) is a comprehensive document that details the functional and non-functional requirements for the development of a software system. It represents a mutual agreement between the client and the development team, ensuring that both parties understand the system\'s features, dependencies, and limitations. This SRS outlines the objectives and scope of developing Manasarthi, an AI-powered mental wellness platform, along with the hardware and software requirements necessary for its successful implementation.'),

      sh('3.1 Project Scope'),
      bul('User authentication and secure profile management with multi-modal login options.'),
      bul('Mental health assessments with clinical scoring, interpretation, and historical tracking.'),
      bul('AI-powered conversational support with integrated dual-layer crisis detection mechanisms.'),
      bul('Personalized wellness plans (western, eastern, hybrid) and structured progress tracking for each user.'),
      bul('Content management system for admin-controlled therapeutic materials and resources.'),
      bul('Analytics and visualization dashboards for longitudinal mental health trend monitoring.'),
      bul('Scalable multi-provider LLM integration with automatic failover for continuous service availability.'),
      bul('Voice input/output support for enhanced accessibility.'),

      sh('3.2 Features'),
      bul('Secure login with email/password (JWT) and Google OAuth integration. Separate admin authentication layer.', 'Multi-Modal Authentication'),
      bul('Comprehensive profile setup with therapeutic preference capture (western/eastern/hybrid), demographics, emergency contacts, and consent management.', 'Intelligent Onboarding'),
      bul('Validated mental health evaluations (GAD-7, PHQ-9, PSS-10, PCL-5, PTQ, TEIQue, Mini-IPIP) with AI-generated insights and historical tracking.', 'Clinical Assessments'),
      bul('Context-aware conversations with dual-layer crisis detection, voice support, and multi-provider failover. Proactive check-ins based on user patterns.', 'AI Chat Companion'),
      bul('Personalized content delivery based on therapeutic approach preference with progress tracking and completion states.', 'Wellness Plans'),
      bul('Mood journaling, metric visualization, and longitudinal trend dashboards.', 'Progress Analytics'),
      bul('Admin-controlled library of therapeutic resources, exercises, and educational materials with publishing controls.', 'Content Management'),
      bul('Conversation archiving, search, and export capabilities.', 'Smart Conversation Management'),

      sh('3.3 Functional Requirements (FR)'),
      bul('FR-001: User registration and authentication with email/password and Google OAuth.'),
      bul('FR-002: Comprehensive user onboarding capturing therapeutic preferences and demographics.'),
      bul('FR-003: Mental health assessments (GAD-7, PHQ-9, PSS-10) with scoring and interpretation.'),
      bul('FR-004: AI-powered chat companion with multi-provider support and dual-layer crisis detection.'),
      bul('FR-005: Conversation history management with archiving, search, and export capabilities.'),
      bul('FR-006: Voice input/output support for enhanced accessibility.'),
      bul('FR-007: Personalized wellness plans based on user preferences and assessment results.'),
      bul('FR-008: Mood tracking and progress monitoring with visualization dashboards.'),
      bul('FR-009: Admin content management for practices, exercises, and educational materials.'),
      bul('FR-010: Crisis detection with emergency resource integration and safe fallback.'),

      sh('3.4 External Interface Requirements'),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '3.4.1 Hardware Interfaces', bold: true, font: 'Times New Roman' })] }),
      bul('Developer Machines: 8 GB RAM minimum, modern multi-core processor, webcam/microphone for voice features.'),
      bul('Production Server: Cloud deployment with scalable infrastructure (AWS / GCP / Azure).'),
      bul('User Devices: Modern browsers on desktop, tablet, or mobile devices with internet connectivity.'),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '3.4.2 Software Interfaces', bold: true, font: 'Times New Roman' })] }),
      bul('Frontend: React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Zustand, React Query.'),
      bul('Backend: Node.js, Express, TypeScript, Prisma ORM with 40+ optimized indexes.'),
      bul('Database: SQLite (development), PostgreSQL (production).'),
      bul('AI Integration: Multiple LLM providers (Gemini, OpenAI, Anthropic, HuggingFace, Ollama) with failover logic.'),
      bul('Authentication: JWT, Google OAuth 2.0, bcrypt hashing.'),
      bul('Validation: Zod schemas with centralized error handling middleware.'),

      sh('3.5 Non-Functional Requirements'),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '3.5.1 Performance Requirements', bold: true, font: 'Times New Roman' })] }),
      bul('System responses (chat, dashboard, assessments) complete within 2 seconds.'),
      bul('Supports up to 500 concurrent users efficiently with optimized backend queries.'),
      bul('React Query and Zustand handle frontend caching to reduce server load.'),
      bul('AI provider failover ensures continuous operation even if one LLM becomes unavailable.'),
      bul('Regular health checks and load management maintain 99.5% uptime.'),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '3.5.2 Safety Requirements', bold: true, font: 'Times New Roman' })] }),
      bul('Built-in dual-layer crisis detection identifies high-risk user inputs and triggers instant help resources.'),
      bul('AI failover logic prevents unsafe or biased responses from reaching the user.'),
      bul('Platform provides wellness guidance only, not medical or diagnostic advice.'),
      bul('User consent required for all data collection and emotional tracking activities.'),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '3.5.3 Security Requirements', bold: true, font: 'Times New Roman' })] }),
      bul('JWT authentication with token expiry and secure, encrypted storage.'),
      bul('Google OAuth 2.0 integration for verified, third-party login.'),
      bul('Role-based access control for Admin dashboards with middleware protection.'),
      bul('Prisma ORM + Zod validation to prevent SQL injection and unsafe inputs.'),
      bul('Secrets and API keys stored securely in environment files (not committed to source code).'),
      bul('Session encryption, HTTPS protection, and GDPR-compliant data privacy practices.'),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 4 — SYSTEM DESIGN (all 14 diagrams + component, ER, state)
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('4', 'SYSTEM DESIGN'),
      par('Manasarthi employs a modular architecture designed for scalability, security, and maintainability. The system is structured across four distinct layers that work together to deliver comprehensive mental health support: a React 18 presentation layer, an Express.js business logic layer, a Prisma ORM data access layer, and an AI orchestration layer connecting multiple LLM providers.'),

      sh('4.1 System Architecture'),
      rule(),
      par('The proposed system architecture of Manasarthi encompasses the following key components and their interactions:'),
      ...blank(1),
      bul('Users interact with the system via a responsive web application built with React 18. The interface supports dashboard access, mood check-ins, assessment completion, chat interactions, and wellness plan management.', 'User Interface (UI)'),
      bul('Secure multi-channel authentication via JWT tokens and Google OAuth 2.0. Separate admin authentication with role-based access controls ensures data integrity.', 'Authentication Layer'),
      bul('The core conversational engine integrates multiple LLM providers (Gemini, OpenAI, Anthropic, HuggingFace, Ollama) with automatic failover logic, ensuring uninterrupted service availability and dual-layer crisis detection.', 'AI Chat Companion'),
      bul('Clinically validated assessments (GAD-7, PHQ-9, PSS-10, PCL-5, PTQ, TEIQue, Mini-IPIP) are administered through the platform with automated scoring, AI-generated interpretations, and historical trend visualization.', 'Assessment Engine'),
      bul('Dynamically generates personalized wellness plans based on user onboarding preferences, assessment results, and therapeutic approach (western, eastern, or hybrid).', 'Wellness Plan Module'),
      bul('Express.js server with Prisma ORM handles API requests, manages database operations, and serves as the middle layer connecting frontend with AI providers and database.', 'Backend API'),
      bul('SQLite for development, PostgreSQL for production, with 40+ optimized indexes for fast query performance and data integrity.', 'Database'),
      bul('Admin-controlled content management system for publishing therapeutic practices, exercises, and educational materials.', 'Admin CMS'),
      ...blank(1),
      ...imgFull(4, 'Fig 4.1 – Manasarthi System Architecture Diagram'),

      sh('4.2 Software Quality Attributes'),
      rule(),
      bul('Fast response time with optimized queries and frontend caching; supports up to 500 concurrent users.', 'Performance'),
      bul('AI provider failover and regular health checks ensure stable, uninterrupted service delivery.', 'Reliability'),
      bul('JWT + Google OAuth, bcrypt encryption, and role-based access control protect all user data.', 'Security'),
      bul('Crisis detection, ethical AI response guidelines, and user consent tracking are built into the core workflow.', 'Safety'),
      bul('Simple, responsive UI with voice input/output ensures accessibility for all user groups.', 'Usability'),
      bul('Modular, TypeScript-based codebase with clear separation of concerns for easy debugging and updates.', 'Maintainability'),
      bul('Architecture supports seamless migration to cloud databases and integration of new AI models.', 'Scalability'),
      bul('99.5% uptime target maintained through caching, auto-retry mechanisms, and health monitoring.', 'Availability'),

      sh('4.3 Software Description'),
      rule(),
      par('React 18 with TypeScript and Vite is used to build the user interface. Tailwind CSS and Radix UI provide a responsive, accessible component library. React Query and Zustand manage server state and global application state efficiently, with LocalStorage persistence for offline resilience.'),
      ...blank(1),
      par('Node.js with Express and TypeScript handles API routing and business logic. Prisma ORM provides type-safe database access with 40+ optimized indexes achieving 50-70% query performance improvements. Input validation employs Zod schemas with centralized error handling middleware.'),
      ...blank(1),
      par('SQLite is used during development for ease of setup, while PostgreSQL serves as the production database for scalability and reliability. The Prisma schema defines comprehensive models for User profiles, Assessment Results, Assessment Sessions, Conversations, Messages, Conversation Memory, Mood Entries, Progress Tracking, Plan Modules, and Content management.'),
      ...blank(1),
      par('Multi-provider LLM integration (Gemini, OpenAI, Anthropic, HuggingFace, Ollama) with automatic failover logic ensures continuous AI-powered responses regardless of individual provider availability. The conversation pipeline constructs context prompts from user demographics, preferences, assessment scores, conversation history, and mood entries. Crisis detection implements parallel lexical analysis for immediate safety resources and asynchronous AI assessment for subtle warnings.'),

      sh('4.4 Data Flow Diagrams (DFD)'),
      rule(),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'DFD Level 0 – Context Diagram', bold: true, font: 'Times New Roman' })] }),
      par('The Level 0 DFD (Context Diagram) represents the overall system boundary of Manasarthi. The primary external entities are the User (Patient), Therapist, and Admin. The user interacts with the system for authentication, assessments, chat, and wellness tracking. The admin manages platform content and analytics. AI providers (Gemini, OpenAI, Claude, HuggingFace, Ollama) supply conversational intelligence through the backend API. The notification service handles email, push, and SMS communications. Google OAuth handles third-party authentication.'),
      ...blank(1),
      ...imgFull(7, 'Fig 4.2 – DFD Level 0 (Context Diagram) and Level 1 (Detailed Diagram)'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'DFD Level 1 – Detailed Diagram', bold: true, font: 'Times New Roman' })] }),
      par('The Level 1 DFD decomposes the system into seven major processes: (1.1) Authentication Process, (1.2) Chat & AI Management, (1.3) Assessment Management, (1.4) Tracking & Reflection Management, (1.5) Content & Recommendation Management, (1.6) Notification Management, and (1.7) Analytics & Reporting. Data flows between user inputs, the backend processing layer, and database stores (D1 through D7) are clearly represented.'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'DFD Level 2 – Chat & AI Process (Detailed)', bold: true, font: 'Times New Roman' })] }),
      par('The Level 2 DFD further decomposes the AI Chat module into sub-processes: (2.1) Receive & Validate Message, (2.2) Retrieve Context & Conversation History, (2.3) Preprocess Input (NLP), (2.4) AI Orchestrator (Select LLM), (2.5) Generate AI Response, (2.6) Post-process Response, (2.7) Crisis Detection (Sentiment & Risk Analysis), (2.8) Trigger Crisis Protocol (Alerts / Resources / Escalation), (2.9) Update Insights & Patterns, and (2.10) Send Notifications if Required.'),
      ...blank(1),
      ...imgFull(2, 'Fig 4.3 – DFD All Levels (Level 0, Level 1, and Level 2 – Chat & AI Process)'),

      sh('4.5 UML Diagrams'),
      rule(),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '4.5.1 Use Case Diagram', bold: true, font: 'Times New Roman' })] }),
      par('The Use Case Diagram illustrates the functional requirements of Manasarthi, showing the relationships between actors (User/Patient, Therapist, Admin) and system use cases across seven functional areas: (1) AI & Conversational Engine — Chat with AI, View Conversation History, Get AI Insights, with included "Detect Crisis" and extended "Provide Grounding Exercises"; (2) Clinical Assessments; (3) Daily Tracking & Reflection; (4) Content & Practices; (5) Therapist Portal; (6) Admin & Platform Management; and (7) Authentication & Account.'),
      ...blank(1),
      ...imgFull(14, 'Fig 4.5 – Overall System Use Case Diagram – Manasarthi'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '4.5.2 Class Diagram', bold: true, font: 'Times New Roman' })] }),
      par('The Class Diagram describes the structural design of Manasarthi, showing classes, their attributes, methods, and relationships. Key classes include: User, Profile, Therapist, Admin, Conversation, Message, ChatService, LLMService, AIProvider (abstract), GeminiProvider, OpenAIProvider, AnthropicProvider, HuggingFaceProvider, MemoryStore, CrisisDetector, RecommendationService, Assessment, AssessmentSession, Score, InsightEngine, Content, Practice, MoodEntry, JournalEntry, SleepLog, and Habit. Relationships include associations, dependencies, composition, aggregation, and generalization.'),
      ...blank(1),
      ...imgFull(13, 'Fig 4.6 – Class Diagram – Manasarthi Main System Architecture'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '4.5.3 Sequence Diagrams', bold: true, font: 'Times New Roman' })] }),
      par('Sequence Diagram – Chat Flow (AI Conversation): Shows the complete interaction from a user sending a message through POST /api/chat/message, ChatService processing it, LLMService selecting a provider with multi-provider fallback, CrisisDetector analyzing the response, MemoryStore being updated, and the final response returned to the user with recommendations or grounding exercises as appropriate.'),
      ...blank(1),
      ...imgFull(12, 'Fig 4.7 – Sequence Diagram – Chat Flow (AI Conversation)'),
      ...blank(1),
      par('The following diagram provides an overview of five key sequence flows: (1) AI Chat Conversation with memory retrieval and multi-LLM orchestration, (2) Mood Logging with analytics trigger, (3) Assessment Submission with scoring and insight generation, (4) Recommendation Generation using ML + Rules + Context, and (5) Therapist Interaction with patient data retrieval.'),
      ...blank(1),
      ...imgFull(1, 'Fig 4.8 – Manasarthi – Sequence Diagrams Overview (5 Key Flows)'),
      ...blank(1),
      par('Sequence Diagram – Chat + AI Flow (Detailed): Shows the complete WebSocket / HTTP flow including the multi-provider selection logic, Memory Service query, crisis detection branch, and three alternative flows: (alt) Crisis Detected — trigger crisis handling protocol, provide grounding exercises and support, notify Therapist/Admin in real-time; (alt) LLM Failure / No Response — try next LLM (fallback), use cached response if available, return safe default message; (alt) Network / Server Error — log error, return user-friendly error message, retry / graceful recovery.'),
      ...blank(1),
      ...imgFull(3, 'Fig 4.9 – Sequence Diagram – Chat + AI Flow (Detailed)'),
      ...blank(1),
      par('Sequence Diagram – Assessment Submission Flow: Shows the flow from a user selecting an assessment, through the Assessment Service creating a session, iteratively fetching questions via the Question Service, saving answers per question, calculating scores, generating AI-powered insights via the Scoring & Insight Service, and returning the final result with an optional notification. An alternative flow handles incomplete submissions and errors gracefully.'),
      ...blank(1),
      ...imgFull(6, 'Fig 4.10 – Sequence Diagram – Assessment Submission Flow'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '4.5.4 Activity Diagrams', bold: true, font: 'Times New Roman' })] }),
      par('Activity Diagram – User Journey (End-to-End Flow): Shows the complete user journey from opening the Manasarthi application, through Login/Register (Email / Google OAuth), authentication success/failure decision, to the Dashboard, and then the four primary action paths: (1) Chat with AI — message input, crisis detection check, AI response generation with recommendations; (2) Take Assessment — select, answer questions, submit, calculate score, generate insights; (3) Track & Reflect — choose tracking type (mood/journal/sleep/habits), enter data, update trends and analytics; (4) Explore Content — browse personalized recommendations, practice exercises, track engagement.'),
      ...blank(1),
      ...imgFull(11, 'Fig 4.11 – Activity Diagram – User Journey (End-to-End Flow)'),
      ...blank(1),
      par('Activity Diagram – Crisis Detection Logic (Advanced AI Flow): Shows the detailed pipeline through five stages: (1) User Input — extract text and context from conversation; (2) AI Analysis Pipeline — preprocess text, retrieve context (conversation history, user profile, past risk signals), extract features (keywords, sentiment, emotion, intent), run AI analysis (LLM + NLP models: sentiment analysis, intent classification, emotion detection, risk pattern matching), generate Crisis Signal Score (0–1 risk score); (3) Risk Evaluation — aggregate risk score vs. threshold; (4) Response Actions — High Risk: trigger crisis handling protocol, provide immediate support, show emergency resources, notify Therapist/Admin; Medium Risk: provide supportive resources, suggest coping strategies, invite reflection; Low Risk: continue conversation normally; (5) Follow-up & Monitoring — track user response, update risk score continuously, store in long-term memory.'),
      ...blank(1),
      ...imgFull(5, 'Fig 4.12 – Activity Diagram – Crisis Detection Logic (Advanced AI Flow)'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '4.5.5 Component Diagram', bold: true, font: 'Times New Roman' })] }),
      par('The Component Diagram provides a high-level view of all major components and their interactions. The three client applications (Web App – React + Vite, Mobile App – React Native, Therapist Portal – Web) communicate through the API Gateway (Express Router). Backend Services comprise: Core Modules (Auth Service – JWT/OAuth, User Service, Chat Service, Assessment Service, Tracking Service, Notification Service), AI & Intelligence Layer (LLM Service – AI Orchestrator, Crisis Detector – Safety & Risk Analysis, Recommendation Service), and Shared Services (File Service, Content Service, Search Service, Analytics Service). The Data Layer includes PostgreSQL Database, Redis Cache, and Object Storage. External integrations include five AI Providers (Gemini, OpenAI, Anthropic, HuggingFace, Ollama), Google OAuth, and Email Service.'),
      ...blank(1),
      ...imgFull(9, 'Fig 4.13 – Component Diagram – Manasarthi System Architecture'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '4.5.6 Entity-Relationship (ER) Diagram', bold: true, font: 'Times New Roman' })] }),
      par('The ER Diagram shows the complete database schema with all primary and foreign key relationships. All tables use UUID as primary key. Key entities and their relationships: User (1-to-1 with UserPreference) — the central entity linked to all domain objects; Conversation (1-to-many with Message, 1-to-1 with Memory); Assessment (1-to-many with AssessmentSession, 1-to-many with Question); AssessmentSession (1-to-many with AssessmentResponse); MoodEntry, SleepLog, JournalEntry, Habit — all linked to User; CrisisAlert (1-to-many with CrisisResourceUsage); Content (1-to-many with Recommendation). JSON fields store flexible preference, metadata, and AI-generated content. Timestamps (createdAt, updatedAt) are included on all entities for auditing.'),
      ...blank(1),
      ...imgFull(8, 'Fig 4.14 – ER Diagram – Manasarthi Database Design'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: '4.5.7 State Machine Diagram', bold: true, font: 'Times New Roman' })] }),
      par('The State Machine Diagram shows the Chat / User State Lifecycle with nine states: (1) Idle — session not started, waiting for user input; (2) Processing Message — validating input and retrieving context from memory; (3) Generating Response — LLMService generates response using context and user profile; (4) Checking Safety — CrisisDetector analyzes response and user state; (5) Sending Response — send AI response along with recommendations; (6) Crisis Handling — provide immediate support, grounding exercises, and resources; (6a) Escalation — notify therapist / emergency contact if required; (7) Waiting for Next Input — session active, waiting for next user message; (8) Ending Session — summarize conversation and update user insights & memory; (9) Ended — session closed, data saved.'),
      ...blank(1),
      ...imgFull(10, 'Fig 4.15 – State Machine Diagram – Chat / User State Lifecycle'),

      sh('4.6 System UI Design (Screenshots)'),
      rule(),
      par('The following screenshots illustrate the key screens of the Manasarthi platform. Insert actual screenshots in each placeholder below.'),
      ...blank(1),
      sh('Home Page', 22),
      par('The Home Page presents the user with a personalized greeting, current mood check-in widget, quick access to recent assessments, wellness plan progress, and AI companion shortcut. The design uses a clean, calming color palette to promote a sense of safety and trust.'),
      ...screenshotBox('Fig 4.9 – Home Page'),
      sh('Authentication Page', 22),
      par('The Authentication Page offers email/password login, Google OAuth sign-in, and secure registration. Password strength validation and JWT-based session management are implemented for enhanced security.'),
      ...screenshotBox('Fig 4.10 – Authentication Page'),
      sh('AI Companion Chat Page', 22),
      par('The AI Companion page provides an intuitive chat interface with voice input/output options, conversation history access, and emergency resource prompts triggered during crisis detection. The UI adapts in real-time based on the tone and context of the conversation.'),
      ...screenshotBox('Fig 4.11 – AI Companion Chat Page'),
      sh('Admin Dashboard', 22),
      par('The Admin Dashboard provides privileged access to platform analytics, content management, user session monitoring, and crisis alert logs. Role-based middleware ensures only authenticated admins can access these controls.'),
      ...screenshotBox('Fig 4.12 – Admin Dashboard'),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 5 — PROJECT PLAN
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('5', 'PROJECT PLAN'),
      par('The project plan outlines the systematic scheduling and execution strategy for Manasarthi across the academic year 2025–2026. Each phase is defined with specific milestones and deliverables to ensure structured progress.'),
      ...blank(1),
      sh('Table 5.1 – Planning and Scheduling', 24),
      ...blank(1),
      mkT(['Month', 'Phase', 'Date', 'Work Done'], [
        ['July 2024',    'Topic Searching',                  '16/06/2024', 'Topic searched and finalized domain'],
        ['August 2024',  'Topic Selection',                  '01/07/2024', 'Topic selected: Manasarthi'],
        ['',             'Project Confirmation',             '04/07/2024', 'Project confirmed with guide'],
        ['September 2024','Review 1',                        '01/08/2024', 'Review 1 completed'],
        ['',             'Final Review 1',                   '06/08/2024', 'Final Review 1 done'],
        ['October 2024', 'Requirements Gathering',          '23/08/2024', 'SRS and literature survey gathered'],
        ['November 2024','Coding',                           '02/10/2024', 'Authentication and onboarding modules coded'],
        ['December 2024','Review 2',                         '15/10/2024', 'Review 2 done'],
        ['January 2025', 'AI Chat + Assessments',           '03/01/2025', 'AI chat companion and assessment module built'],
        ['',             'Multi-Provider LLM Failover',     '17/01/2025', 'LLM failover and crisis detection integrated'],
        ['',             'Wellness Plans Module',           '31/01/2025', 'Personalized wellness plan module completed'],
        ['February 2025','Review 3',                         '03/02/2025', 'Review 3 done'],
        ['',             'Voice + Progress Tracking',       '14/02/2025', 'Voice I/O and mood tracking dashboards added'],
        ['March 2025',   'Backend Optimization',            '08/03/2025', 'Query optimization, 40+ DB indexes added'],
        ['',             'Admin CMS',                       '20/03/2025', 'Admin content management system completed'],
        ['April 2025',   'Review 4 + Testing',              '11/04/2025', 'Final review 4 done; testing phase begins'],
      ], [1800, 2520, 1440, 3600]),
      ...blank(1),
      par('Fig 5.1 – Timeline / Gantt Chart', { center: true, italic: true }),
      ...screenshotBox('Fig 5.1 – Gantt Chart / Timeline'),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 6 — IMPLEMENTATION
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('6', 'IMPLEMENTATION'),
      par('The implementation of Manasarthi follows a structured, modular development approach to ensure code quality, testability, and long-term maintainability. The system is built using modern web technologies with a clear separation between frontend, backend, and AI integration layers.'),

      sh('6.1 Data Collection and Preprocessing'),
      par('Manasarthi collects user data through structured onboarding forms, validated mental health assessments, mood journal entries, and chat conversation logs. All data is encrypted at rest and in transit. User consent is captured explicitly during onboarding, and data minimization principles are applied throughout the system.'),
      ...blank(1),
      par('Preprocessing includes normalization of assessment scores using validated clinical cut-offs, tokenization of chat inputs for dual-layer crisis keyword detection, and aggregation of mood data for dashboard visualization. User preference data from onboarding (western/eastern/hybrid therapeutic approach, language preference, cultural background) is used to personalize wellness plan content and AI companion response style.'),

      sh('6.2 System Workflow'),
      bul('Users register via email or Google OAuth, complete a comprehensive onboarding questionnaire capturing therapeutic preferences, demographics, and emergency contacts. All fields are validated using Zod schemas before persistence.', 'User Registration & Onboarding'),
      bul('Users complete clinically validated assessments (GAD-7, PHQ-9, PSS-10, PCL-5, PTQ, TEIQue, Mini-IPIP). Results are scored automatically, AI-generated insights are provided, and scores are stored for trend analysis.', 'Assessment Completion'),
      bul('Each message is scanned for crisis indicators before being sent to the selected LLM provider. If the primary provider fails, automatic failover activates. Responses are stored with conversation memory for contextual continuity. Voice input is transcribed and processed identically to text.', 'AI Chat Companion Interaction'),
      bul('Based on assessment scores and onboarding preferences, personalized wellness activities are served. Users can mark items as complete and track progress over time. Content is filtered by therapeutic approach (western/eastern/hybrid).', 'Wellness Plan Delivery'),
      bul('Mood journal entries and metric data are visualized through dynamic dashboards providing users with longitudinal insight into their mental health journey.', 'Progress Monitoring'),

      sh('6.3 Key Algorithms and Techniques'),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Crisis Detection Algorithm (Dual-Layer)', bold: true, font: 'Times New Roman' })] }),
      par('The crisis detection module uses a two-layer approach. Layer 1 — Lexical Pattern Matching: the message is scanned in real-time against a curated crisis lexicon organized by severity (mild distress, moderate risk, high risk, emergency). When crisis indicators are detected, emergency resources (helpline numbers, emergency contacts) are immediately presented and the AI response tone is adapted to prioritize safety and empathy. Layer 2 — AI-Based Risk Assessment: if the keyword score exceeds a low threshold, the message is sent asynchronously to the LLM with a crisis assessment prompt, returning a structured severity score (0–1). The combined score determines the response pathway: empathetic acknowledgement, grounding exercises (5-4-3-2-1 technique, breathing), or full emergency escalation with therapist/admin alert. All crisis events at medium risk or above are persisted to the CrisisAlert table for clinical review.'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Multi-Provider LLM Failover', bold: true, font: 'Times New Roman' })] }),
      par('The AI integration layer maintains a priority-ordered list of LLM providers (Gemini → HuggingFace → OpenAI → Anthropic → Ollama). When a provider returns an error or exceeds latency thresholds, the system automatically switches to the next available provider using exponential backoff with circuit breakers. Multiple API keys per provider are rotated in round-robin fashion to manage rate limits. This ensures uninterrupted service availability even during individual provider outages or rate-limiting events.'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Personalization Engine', bold: true, font: 'Times New Roman' })] }),
      par('User preferences captured during onboarding (therapeutic approach, cultural background, language preference) are used to filter and rank wellness content, adjust AI response style, and select appropriate assessment tools. The engine dynamically updates recommendations based on ongoing user interactions, assessment results, and mood trend direction. Focus areas are derived by combining recent assessment severity scores, prevalent emotion keywords from chat history, and mood trend data to produce a ranked list of intervention priorities.'),
      ...blank(1),
      new Paragraph({ heading: HeadingLevel.HEADING_3,
        children: [new TextRun({ text: 'Wellness Score Calculation', bold: true, font: 'Times New Roman' })] }),
      par('The wellness score is a composite metric: Assessment component (40%) — most recent session scores normalised using validated clinical cut-offs; Mood component (30%) — rolling 14-day mood average with streak bonuses; Engagement component (20%) — proportion of days with tracked activity over the past 30 days; Sleep component (10%) — average sleep quality rating over the past 14 days. The components are weighted and summed to produce a wellness score (0–100) stored as a WellnessSnapshot for longitudinal charting.'),

      sh('6.4 Coding Snapshot'),
      par('The following snippet illustrates the multi-provider AI failover logic implemented in the backend:'),
      ...blank(1),
      ...code([
        'async function getAIResponse(prompt, providers) {',
        '  for (const provider of providers) {',
        '    try {',
        '      return await provider.generate(prompt);',
        '    } catch (err) {',
        '      console.warn(`Provider ${provider.name} failed. Trying next...`);',
        '    }',
        '  }',
        '  throw new Error(\'All AI providers failed.\');',
        '}',
      ]),
      ...blank(1),
      par('The following snippet shows the dual-layer crisis detection logic:'),
      ...blank(1),
      ...code([
        'async function detectCrisis(message, userId) {',
        '  // Layer 1: Immediate keyword scan',
        '  const keywordScore = crisisLexicon.scan(message);',
        '  if (keywordScore === 0) return null;',
        '',
        '  // Layer 2: AI-based severity assessment (async)',
        '  const aiScore = await llmService.assessRisk(message);',
        '  const combined = 0.4 * keywordScore + 0.6 * aiScore;',
        '',
        '  if (combined >= EMERGENCY_THRESHOLD) {',
        '    await saveCrisisEvent(userId, combined, "emergency");',
        '    return buildEscalationResponse();',
        '  } else if (combined >= HIGH_THRESHOLD) {',
        '    await saveCrisisEvent(userId, combined, "grounding");',
        '    return buildGroundingExercise();',
        '  }',
        '  return buildEmpathyResponse();',
        '}',
      ]),

      sh('6.5 Result Set (System Screenshots)'),
      par('The following screenshots illustrate the key screens of the Manasarthi platform:'),
      ...blank(1),
      ...screenshotBox('Fig 6.1 – Home Page'),
      ...screenshotBox('Fig 6.2 – Authentication Page'),
      ...screenshotBox('Fig 6.3 – Login Page'),
      ...screenshotBox('Fig 6.4 – Admin Dashboard'),
      ...screenshotBox('Fig 6.5 – AI Companion Chat Page'),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 7 — TESTING
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('7', 'TESTING'),
      par('Software testing ensures that Manasarthi meets its functional and non-functional requirements before deployment. Testing was conducted systematically across unit, integration, system, and user acceptance levels to validate correctness, reliability, and usability of the platform.'),

      sh('7.1 Types of Testing Used'),
      bul('Individual modules (authentication, assessment scoring, crisis detection, LLM failover) were tested in isolation to verify internal logic and expected outputs.', 'Unit Testing'),
      bul('Tested interactions between frontend and backend APIs, AI provider integration, database CRUD operations, and session management flows.', 'Integration Testing'),
      bul('End-to-end scenarios were executed in a staging environment mirroring production, verifying complete workflow from user registration through assessment, chat, and wellness plan completion.', 'System Testing'),
      bul('Load testing was conducted to verify system stability with 500 concurrent users. API response times, database query performance, and LLM latency were measured and optimized.', 'Performance Testing'),
      bul('User experience testing was conducted to evaluate interface clarity, navigation ease, and accessibility of the chat companion, assessments, and dashboard components.', 'Usability Testing'),
      bul('Final validation was performed to confirm the platform meets all specified functional requirements and stakeholder expectations.', 'Acceptance Testing'),

      sh('7.2 White-Box Testing'),
      par('White-box testing was applied to internal logic components, including the dual-layer crisis detection algorithm, JWT token generation and validation logic, Prisma ORM query chains, and the multi-provider LLM failover decision tree. Control flow paths were mapped and tested for all branches, ensuring edge cases are handled correctly.'),

      sh('7.3 Black-Box Testing'),
      par('Black-box testing was conducted on user-facing features without knowledge of internal implementation. Testers validated authentication flows, assessment scoring outputs, wellness plan generation, and AI companion conversation behavior by providing inputs and verifying expected outputs against documented specifications.'),

      sh('7.4 Test Cases and Results'),
      sh('Table 7.1 – Test Cases and Results', 22),
      ...blank(1),
      mkT(['Test Case', 'Input', 'Expected Result', 'Actual Result', 'P/F'], [
        ['Valid Registration', 'Valid email, password', 'Account created, redirected to onboarding', 'Account created, redirected to onboarding', 'P'],
        ['Duplicate Email', 'Existing email', 'Error: Email already exists', 'Error: Email already exists', 'P'],
        ['Google OAuth Login', 'Google account', 'Authenticated and redirected to dashboard', 'Authenticated successfully', 'P'],
        ['Valid Login', 'Correct credentials', 'Redirected to dashboard', 'Redirected to dashboard', 'P'],
        ['Invalid Login', 'Wrong credentials', 'Error: Invalid credentials', 'Error: Invalid credentials', 'P'],
        ['Complete GAD-7 Assessment', 'All 7 responses selected', 'Score calculated, AI insight generated', 'Score and insight displayed correctly', 'P'],
        ['Incomplete Assessment', 'Missing responses', 'Validation error prompted', 'Validation error shown', 'P'],
        ['Crisis Keyword in Chat', 'Crisis-related message', 'Emergency resources displayed immediately', 'Resources displayed and tone adapted', 'P'],
        ['LLM Provider Failure', 'Primary LLM down', 'Failover to next LLM provider', 'Seamless failover, no service disruption', 'P'],
        ['Voice Input', 'Spoken message', 'Transcribed and sent to AI companion', 'Transcribed and processed correctly', 'P'],
        ['Mood Journal Entry', 'Mood score + notes', 'Entry saved, dashboard updated', 'Entry saved and reflected in dashboard', 'P'],
        ['Admin Content Publish', 'New therapeutic content', 'Content visible to users', 'Content published and visible', 'P'],
        ['Unauthorized Admin Access', 'Non-admin user accessing /admin', 'Access denied, redirect to home', 'Access denied correctly', 'P'],
      ], [2160, 1800, 2160, 2160, 540]),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 8 — CONCLUSION AND FUTURE SCOPE
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('8', 'CONCLUSION AND FUTURE SCOPE'),

      sh('8.1 Conclusion'),
      rule(),
      par('Manasarthi represents a significant advancement in AI-driven mental health support, successfully bridging the critical gap between the growing demand for mental healthcare and the limited availability of accessible, personalized services. By combining multi-provider LLM integration with clinically validated assessment tools (GAD-7, PHQ-9, PSS-10, PCL-5, PTQ, TEIQue, Mini-IPIP), dual-layer crisis detection, voice accessibility, and holistic wellness planning across western, eastern, and hybrid therapeutic approaches, the platform delivers a comprehensive, empathetic, and secure mental health companion.'),
      ...blank(1),
      par('The modular architecture ensures scalability and long-term maintainability, while the React 18 frontend and Express-Prisma backend stack provide a performant, responsive user experience. The multi-provider AI failover mechanism with 40+ database performance indexes guarantees service reliability, and the integrated dual-layer crisis detection system upholds the highest standards of user safety and clinical responsibility.'),
      ...blank(1),
      par('Testing results confirm that Manasarthi meets all functional requirements with high reliability across authentication, assessments, AI chat interactions, and wellness plan management. The platform is well-positioned to serve individuals across diverse demographics and cultural backgrounds, making mental healthcare more democratic, private, and stigma-free.'),

      sh('8.2 Future Scope'),
      rule(),
      bul('Development of a native mobile application (Android and iOS) for easier access to mental wellness tools anytime, anywhere.'),
      bul('Creation of a Parental Companion App to help parents or guardians monitor emotional well-being (with user consent) and receive crisis alerts. Integration of computer vision-based posture analysis for trauma detection.'),
      bul('Addition of AI-powered therapy and counsellor recommendations for professional support referrals.'),
      bul('Introduction of group therapy sessions and community-based healing features to promote peer social support.'),
      bul('Expansion of multilingual support for accessibility across different regions and cultures, especially Indian regional languages.'),
      bul('Implementation of telehealth integration for directly connecting users with licensed mental health professionals.'),
      bul('Enhancement of AI ethics and emotional intelligence for more nuanced, human-like empathetic responses.'),
      bul('Integration of subscription-based personalized wellness programs for sustainable platform development.'),
      bul('Research and publication of anonymized platform outcome data to contribute to the academic understanding of AI-based mental health interventions.'),

      // ════════════════════════════════════════════════════════════════════
      //  CHAPTER 9 — REFERENCES
      // ════════════════════════════════════════════════════════════════════
      pgBreak(), ...chap('9', 'REFERENCES'),
      rule(),
      num(1, 'Thakkar A., Gupta A., De Sousa A. (2024) – Artificial Intelligence in Positive Mental Health: A Narrative Review, Frontiers in Digital Health – DOI: 10.3389/fdgth.2024.1280235'),
      num(2, 'Salcedo Z. B. V., Tari I. D. A. E. P. D., Ratsameemonthon C., Setiyani R. Y. (2023) – Artificial Intelligence and Mental Health Issues: A Narrative Review, Journal of Public Health Sciences, Vol. 2(02), 58-65 – DOI: 10.56741/jphs.v2i02.282'),
      num(3, 'Ruiz-Vanoye J. A., Fuentes-Penna A., Barrera-Cámara R. A., et al. (2025) – Artificial Intelligence and Human Well-Being: A Review of Applications and Effects on Life Satisfaction through Synthetic Happiness.'),
      num(4, 'Laranjo, L., et al. (2023). The Effects of an AI-Powered Chatbot on Mental Health.'),
      num(5, 'Guo, Y., et al. (2024). Large Language Models for Mental Health Support: A Systematic Review.'),
      num(6, 'Calvo, R. A., et al. (2025). Natural Language Processing in Mental Health Applications Using Non-Clinical Texts.'),
      num(7, 'Poria, S., et al. (2023). A Survey on Sentiment Analysis and Emotion Recognition.'),
      num(8, 'Halder, S. (2025). Developing mental health support chatbots in India: Challenges and insights. Annals of Indian Psychiatry, 9(1), 99-101.'),
      num(9, 'Marade, A., Suvarna, K., Chaudhari, P., & Bhandiwad, V. (2025). Spiritual.AI: An AI-driven platform for enhancing mental, emotional, and spiritual well-being. IJRASET, 13(4), 4211-4214.'),
      num(10, 'Malviya, S. (2024). The need for integration of religion and spirituality into the mental health care of culturally and linguistically diverse populations in Australia. Journal of Religion and Health, 62, 2272–2296.'),
      num(11, 'Casu, M., Triscari, S., Battiato, S., Guarnera, L., & Caponnetto, P. (2024). AI Chatbots for Mental Health: A Scoping Review. Applied Sciences, 14(13), 5889.'),
      num(12, 'Aggarwal, S., Wright, J., Morgan, A., Patton, G., & Reavley, N. (2025). Religiosity and Spirituality in the Prevention of Depression and Anxiety in Young People. BMC Psychiatry, 23, 729.'),
      num(13, 'Singh, R., Sharma, K., & Patel, N. (2024). Revolutionizing Mental Health Care through LangChain: A Journey with a Large Language Model. arXiv:2403.05568.'),
      num(14, 'Jaiswal, A. (2024). Development of Personality Adaptive Conversational AI for Mental Health Therapy Using Large Language Models. University of Washington.'),
      num(15, 'Kumar, V., & Sharma, D. (2025). Mind Care: A Multi-Agent AI Architecture for Personalized and Responsible Mental Health Support. IJRSI, 12(2), 128-135.'),
      num(16, 'Méndez, G., et al. (2024). Deploying a Mental Health Chatbot in Higher Education: Luna, an AI-Based Mental Health Support System. Computers, 14(6), 227.'),
      num(17, 'Rajshekar, R., Jain, P., & Khanna, R. (2025). AI Chat-Bot for Mental Health Support. JSRT, 4(1), 112-118.'),
      num(18, 'Sahu, M., et al. (2023). AI-Driven Mental Health Monitoring and Therapy Chatbot with NLP and Sentiment Analysis. IJACSA, 14(11), 220-227.'),

      // ════════════════════════════════════════════════════════════════════
      //  APPENDIX
      // ════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'APPENDIX', bold: true, font: 'Times New Roman' })] }),
      rule(),

      sh('1. Patent'),
      par('[Patent application details, filing number, and registration to be inserted here]'),
      ...blank(1),

      sh('2. Research Paper Publication'),
      ...blank(1),
      ctr('"Manasarthi: AI-Powered Mental Wellness Platform with Holistic Healing and Emotional Support"', 24, true),
      ...blank(1),
      ctr('Aditya Shirsat¹, Atharva Lole², Neha Kamble³, Sourabha Shirkande⁴, Prof. R. R. Yadav⁵', 22),
      ctr('Department of Information Technology, Sinhgad Academy of Engineering, Pune', 22, false, true),
      ...blank(1),
      par('Abstract — This paper examines Manasarthi, an AI-powered mental wellness platform featuring TypeScript architecture with React frontend, Express backend, Prisma ORM, and multi-provider LLM integration (Gemini, OpenAI, Anthropic, Hugging Face, Ollama). The platform demonstrates conversation memory management, dual-layer crisis detection, validated clinical assessments (GAD-7, PHQ-9, PSS-10, PCL-5, PTQ, TEIQue, Mini-IPIP), and integration of Western clinical psychology with Eastern spiritual traditions through personalized western/eastern/hybrid wellness plans. Findings reveal a paradigm shift from rule-based chatbots toward sophisticated LLM implementations with personalized wellness planning. Key challenges include limited clinical validation, engagement sustainability, cultural competence gaps, and ethical considerations. Future enhancements propose parental companion applications with computer vision-based posture analysis for trauma detection, mobile applications, and clinical integration pathways.', { indent: true }),
      ...blank(1),
      new Paragraph({ spacing: { before: 80, after: 80 }, indent: { left: 360 }, children: [
        new TextRun({ text: 'Keywords: ', bold: true, size: 22, font: 'Times New Roman' }),
        new TextRun({ text: 'Artificial Intelligence, Mental Health Support, Large Language Models, Conversational AI, Crisis Detection, Personalized Wellness, Multi-Provider Integration, Holistic Healing, Clinical Assessment, Digital Therapeutics.', size: 22, font: 'Times New Roman' })
      ]}),
    ]
  }]
});

async function main() {
  const outputPath = path.join(__dirname, 'Manasarthi_BlackBook_Final.docx');
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buf);
  console.log(`Done! Generated: ${outputPath} Size: ${buf.length} bytes (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error('Failed to generate document:', error);
  process.exit(1);
})