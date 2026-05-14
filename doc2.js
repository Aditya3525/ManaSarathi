const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, LevelFormat, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageBreak, Header, Footer, PageNumber,
  NumberFormat, ImageRun, TabStopType, TabStopPosition
} = require('docx');
const fs = require('fs');
const path = require('path');

// ─── Images ───────────────────────────────────────────────────────────────────
// 1316x924 px all → aspect = 924/1316 ≈ 0.7022
// Full-width at 620px wide → height = 435
const IMG_W = 620, IMG_H = 435;

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

// ─── Style constants ──────────────────────────────────────────────────────────
const BLUE = '1F3864';
const BLACK = '000000';

// ─── Helper builders ──────────────────────────────────────────────────────────
const BORDER_SINGLE = { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' };
const CELL_BORDERS = { top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// A blank paragraph
function blank(n = 1) {
  return Array.from({ length: n }, () => new Paragraph({ children: [new TextRun('')] }));
}

// Page break
function pgBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

// Divider rule (matches reference docx style "——————————————")
function dividerRule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000', space: 1 } },
    spacing: { before: 0, after: 160 },
    children: [new TextRun('')]
  });
}

// Chapter page - matches reference: big centered chapter number, then title, then rule
function chapterPage(num, title) {
  return [
    ...blank(3),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: `CHAPTER ${num}`, bold: true, size: 56, font: 'Times New Roman', color: BLACK })]
    }),
    ...blank(1),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 80 },
      children: [new TextRun({ text: title, bold: true, size: 36, font: 'Times New Roman', color: BLACK })]
    }),
    dividerRule(),
  ];
}

// Normal body paragraph (justified, Times New Roman 24)
function para(text, opts = {}) {
  return new Paragraph({
    alignment: opts.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: 80, after: 80, line: 360 },
    children: [new TextRun({
      text,
      size: opts.size || 24,
      bold: opts.bold || false,
      font: 'Times New Roman',
      color: BLACK,
      italics: opts.italic || false
    })]
  });
}

// Bold heading (section sub-heading)
function subHead(text, sz = 24) {
  return new Paragraph({
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, bold: true, size: sz, font: 'Times New Roman', color: BLACK })]
  });
}

// Indented bullet with tab (matches reference style)
function bul(text, level = 1) {
  const indent = level * 360;
  return new Paragraph({
    indent: { left: indent },
    spacing: { before: 60, after: 60 },
    children: [
      new TextRun({ text: '\t-\t', size: 22, font: 'Times New Roman' }),
      new TextRun({ text, size: 22, font: 'Times New Roman' })
    ]
  });
}

// Numbered list item
function num(n, text) {
  return new Paragraph({
    indent: { left: 360 },
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text: `${n})\t${text}`, size: 24, font: 'Times New Roman' })]
  });
}

// Figure caption below image
// Table cell
function hCell(text, w) {
  return new TableCell({
    borders: CELL_BORDERS,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: 'D9D9D9', type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, size: 22, font: 'Times New Roman' })]
    })]
  });
}
function dCell(text, w, center = false) {
  return new TableCell({
    borders: CELL_BORDERS,
    width: { size: w, type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 22, font: 'Times New Roman' })]
    })]
  });
}

function mkTable(cols, rows, widths) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: cols.map((c, i) => hCell(c, widths[i])) }),
      ...rows.map(r => new TableRow({ children: r.map((c, i) => dCell(c, widths[i], true)) }))
    ]
  });
}

// Code block (indented, Courier New)
function code(lines) {
  return lines.map(line =>
    new Paragraph({
      indent: { left: 720 },
      spacing: { before: 0, after: 0 },
      children: [new TextRun({ text: line, size: 18, font: 'Courier New' })]
    })
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
const doc = new Document({
  numbering: {
    config: [{
      reference: 'nums',
      levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
    }]
  },
  styles: {
    default: { document: { run: { font: 'Times New Roman', size: 24, color: BLACK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Times New Roman', color: BLACK },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Times New Roman', color: BLACK },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Times New Roman', color: BLACK },
        paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },   // A4
        margin: { top: 1440, right: 1080, bottom: 1440, left: 1800 }
      }
    },
    children: [

      // ══════════════════════════════════════════════════════════════════════
      //  TITLE PAGE
      // ══════════════════════════════════════════════════════════════════════
      ...blank(2),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: 'A PROJECT REPORT ON', size: 24, font: 'Times New Roman', bold: true })] }),
      ...blank(1),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: 'MaanSarathi', size: 56, bold: true, font: 'Times New Roman' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'An AI-Powered Comprehensive Mental Wellbeing Platform', size: 26, bold: true, font: 'Times New Roman' })] }),
      ...blank(1),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'SUBMITTED TO THE SAVITRIBAI PHULE PUNE UNIVERSITY, PUNE', size: 22, font: 'Times New Roman' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'IN THE PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE AWARD OF THE DEGREE OF', size: 22, font: 'Times New Roman' })] }),
      ...blank(1),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'BACHELOR OF ENGINEERING', size: 28, bold: true, font: 'Times New Roman' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'IN', size: 26, bold: true, font: 'Times New Roman' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: '(INFORMATION TECHNOLOGY)', size: 28, bold: true, font: 'Times New Roman' })] }),
      ...blank(1),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'SUBMITTED BY', size: 22, bold: true, font: 'Times New Roman' })] }),
      ...blank(1),
      ...['[Team Member 1]', '[Team Member 2]', '[Team Member 3]', '[Team Member 4]'].map((name, i) =>
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: name, bold: true, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: `\t\t\t\tSeat No: __________`, size: 22, font: 'Times New Roman' })
          ]
        })
      ),
      ...blank(2),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'UNDER THE GUIDANCE OF', size: 22, bold: true, font: 'Times New Roman' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 },
        children: [new TextRun({ text: '[Guide Name]', size: 26, bold: true, font: 'Times New Roman' })] }),
      ...blank(1),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'DEPARTMENT OF INFORMATION TECHNOLOGY', size: 22, bold: true, font: 'Times New Roman' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: "[College Name], PUNE", size: 22, bold: true, font: 'Times New Roman' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 },
        children: [new TextRun({ text: 'SAVITRIBAI PHULE PUNE UNIVERSITY 2024-2025', size: 22, bold: true, font: 'Times New Roman' })] }),

      // ══════════════════════════════════════════════════════════════════════
      //  CERTIFICATE
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...blank(2),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 160 },
        children: [new TextRun({ text: 'CERTIFICATE', size: 40, bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('This is to certify that the project report entitled', { center: true }),
      ...blank(1),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 60 },
        children: [new TextRun({ text: '"MaanSarathi — An AI-Powered Comprehensive Mental Wellbeing Platform"', size: 26, bold: true, font: 'Times New Roman' })] }),
      ...blank(1),
      para('Submitted by', { center: true }),
      ...blank(1),
      ...['[Team Member 1]', '[Team Member 2]', '[Team Member 3]', '[Team Member 4]'].map(name =>
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 40 },
          children: [
            new TextRun({ text: name, bold: true, size: 22, font: 'Times New Roman' }),
            new TextRun({ text: '\t\t\t\tSeat No: __________', size: 22, font: 'Times New Roman' })
          ]
        })
      ),
      ...blank(1),
      para('is a bonafide work carried out by them under the supervision of [Guide Name] and it is approved for the partial fulfillment of the requirement of Savitribai Phule Pune University, for the award of the degree of Bachelor of Engineering (INFORMATION TECHNOLOGY).', { center: true }),
      ...blank(3),
      new Paragraph({ spacing: { before: 0, after: 40 }, children: [
        new TextRun({ text: '[Guide Name]', bold: true, size: 22, font: 'Times New Roman' }),
        new TextRun({ text: '\t\t\t[H.O.D. Name]\t\t\t[Principal Name]', size: 22, font: 'Times New Roman' })
      ]}),
      new Paragraph({ spacing: { before: 0, after: 40 }, children: [
        new TextRun({ text: 'Guide\t\t\t\tH.O.D.\t\t\t\tPrincipal', size: 22, font: 'Times New Roman' })
      ]}),
      new Paragraph({ spacing: { before: 0, after: 40 }, children: [
        new TextRun({ text: 'Department of IT\t\t\tDepartment of IT\t\t[College]', size: 22, font: 'Times New Roman' })
      ]}),
      ...blank(2),
      new Paragraph({ spacing: { before: 0, after: 40 }, children: [new TextRun({ text: 'Place: Pune', size: 22, font: 'Times New Roman' })] }),
      new Paragraph({ spacing: { before: 0, after: 40 }, children: [new TextRun({ text: 'Date:   /   / 2025', size: 22, font: 'Times New Roman' })] }),
      new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before: 0, after: 40 }, children: [
        new TextRun({ text: 'External Examiner\t\t\tProject Coordinator', size: 22, font: 'Times New Roman' })
      ]}),

      // ══════════════════════════════════════════════════════════════════════
      //  ACKNOWLEDGEMENT
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'ACKNOWLEDGEMENT', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      ...blank(1),
      para('We hereby take this opportunity to record our sincere thanks and heartfelt gratitude to [Guide Name] for their useful guidance and for making available their intimate knowledge and experience in the making of "MaanSarathi — An AI-Powered Comprehensive Mental Wellbeing Platform", as well as in the preparation of this project report.'),
      ...blank(1),
      para('We are also thankful to our respective H.O.D. [H.O.D. Name] of the Information Technology department. We express our special thanks and heartfelt gratitude to our respective staff members for inspiring us throughout the completion of this system.'),
      ...blank(1),
      para('This acknowledgement will be incomplete if we do not record our sense of gratitude to our Principal, [Principal Name], [College Name], Pune. We also express our sincere thanks to all — the management, lab assistants, friends, and family — who have provided valuable guidance towards the completion of this project as part of the syllabus of the course.'),
      ...blank(1),
      para('We express our sincere gratitude towards the co-operative department who have provided us with valuable assistance and requirements for the presentation.'),
      ...blank(2),
      subHead('Project Group Members:'),
      ...blank(1),
      ...['[Team Member 1]', '[Team Member 2]', '[Team Member 3]', '[Team Member 4]'].map(name =>
        new Paragraph({ spacing: { before: 40, after: 40 }, children: [
          new TextRun({ text: name, bold: true, size: 22, font: 'Times New Roman' }),
          new TextRun({ text: '\t\t\t\tSeat No: __________', size: 22, font: 'Times New Roman' })
        ]})
      ),

      // ══════════════════════════════════════════════════════════════════════
      //  ABSTRACT
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'ABSTRACT', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      ...blank(1),
      para('MaanSarathi is an AI-powered comprehensive mental wellbeing platform designed to bridge the gap between self-care and professional mental health support. The platform integrates a context-aware conversational AI companion, standardised clinical assessment tools, daily mood and habit tracking, crisis detection, and professional therapist oversight into a single unified system — making mental health support accessible, personalised, and continuous.'),
      ...blank(1),
      para('The system employs a multi-provider Large Language Model (LLM) architecture, supporting Google Gemini, OpenAI GPT, Anthropic Claude, Hugging Face, and NVIDIA inference endpoints, with an automatic fallback mechanism for high availability. A crisis detection module continuously analyses user messages using sentiment analysis and keyword matching to identify potential mental health emergencies, triggering grounding exercises or clinical escalation as required.'),
      ...blank(1),
      para('Standardised clinical assessments — including GAD-2, PHQ-9, Big Five personality, and emotional intelligence tools — are scored and interpreted automatically, generating wellness scores and AI-driven insights. A personalised recommendation engine suggests mindfulness practices, CBT resources, audio meditations, and breathing exercises based on the user\'s current mood, assessment results, and engagement history. The backend is built with Express.js and TypeScript using Prisma ORM with PostgreSQL. The web frontend is developed in React 18 with Vite, and a React Native/Expo mobile application is maintained in the same monorepo. User authentication is handled via JWT and Google OAuth with role-based access control for end-users, therapists, and administrators.'),
      ...blank(2),
      new Paragraph({ spacing: { before: 80, after: 80 }, children: [
        new TextRun({ text: 'Keywords: ', bold: true, size: 24, font: 'Times New Roman' }),
        new TextRun({ text: 'Mental Health, AI Chatbot, Large Language Models, Crisis Detection, Mood Tracking, Clinical Assessments, CBT, React, Express.js, Prisma, PostgreSQL, Multi-Provider LLM, Sentiment Analysis, Personalised Recommendations.', size: 24, font: 'Times New Roman' })
      ]}),

      // ══════════════════════════════════════════════════════════════════════
      //  INDEX
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'INDEX', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      ...blank(1),
      mkTable(
        ['Sr. No.', 'Title of Chapter', 'Page No.'],
        [
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
          ['', '4.2 Data Flow Diagrams', '18'],
          ['', '4.3 UML Diagrams', '20'],
          ['', '4.4 ER Diagram', '25'],
          ['', '4.5 Component and State Diagrams', '26'],
          ['05', 'Project Plan', '28'],
          ['', '5.1 Project Estimates', '28'],
          ['', '5.2 Risk Management', '30'],
          ['', '5.3 Timeline Chart', '31'],
          ['06', 'Implementation', '32'],
          ['', '6.1 Module Descriptions', '32'],
          ['', '6.2 Algorithms', '35'],
          ['', '6.3 Tools and Technologies', '37'],
          ['', '6.4 Sample Code', '38'],
          ['', '6.5 Result Set / Screenshots', '42'],
          ['07', 'Testing', '43'],
          ['08', 'Conclusion', '47'],
          ['09', 'References', '48'],
        ],
        [1200, 6600, 1560]
      ),

      // ── Figures List ──────────────────────────────────────────────────────
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'FIGURES', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      ...blank(1),
      mkTable(
        ['Sr. No.', 'Title of Figure', 'Page No.'],
        [
          ['4.1', 'MaanSarathi – System Architecture Diagram', '17'],
          ['4.2', 'DFD Level 0 (Context Diagram) and Level 1', '18'],
          ['4.3', 'DFD – All Levels (Level 0, 1, 2 – Chat & AI Process)', '19'],
          ['4.4', 'Overall System Use Case Diagram', '20'],
          ['4.5', 'Class Diagram – MaanSarathi Main System Architecture', '21'],
          ['4.6', 'Sequence Diagram – Chat Flow (AI Conversation)', '22'],
          ['4.7', 'Sequence Diagrams – Chat, Mood Logging, Assessment, Recommendation, Therapist', '23'],
          ['4.8', 'Sequence Diagram – Chat + AI Flow (Detailed)', '23'],
          ['4.9', 'Sequence Diagram – Assessment Flow', '24'],
          ['4.10', 'Activity Diagram – User Journey (End-to-End Flow)', '25'],
          ['4.11', 'Activity Diagram – Crisis Detection Logic', '25'],
          ['4.12', 'Component Diagram – MaanSarathi System Architecture', '26'],
          ['4.13', 'ER Diagram – MaanSarathi Database Design', '26'],
          ['4.14', 'State Machine Diagram – Chat / User State Lifecycle', '27'],
          ['5.1', 'Timeline Chart', '31'],
        ],
        [1080, 7200, 1080]
      ),

      // ── Tables List ───────────────────────────────────────────────────────
      pgBreak(),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'TABLES', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      ...blank(1),
      mkTable(
        ['Sr. No.', 'Title of Table', 'Page No.'],
        [
          ['2.1', 'Literature Survey Comparison Table', '09'],
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
        ],
        [1080, 7200, 1080]
      ),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 1 – INTRODUCTION
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('1', 'INTRODUCTION'),
      ...blank(1),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '1.1 Background and Motivation', bold: true, font: 'Times New Roman' })] }),
      ...blank(1),
      subHead('World-Wide Scenario'),
      para('Mental health has emerged as one of the most pressing global healthcare challenges of the twenty-first century. According to the World Health Organization (WHO), approximately one in eight people worldwide live with a mental disorder, yet a vast treatment gap persists — particularly in low- and middle-income countries. Stigma, lack of awareness, prohibitive costs of therapy, and a global shortage of mental health professionals mean that the majority of individuals who need support never receive it.'),
      ...blank(1),
      para('The rapid advancement of Artificial Intelligence (AI), particularly in Natural Language Processing (NLP) and conversational AI, has opened new avenues for mental health support. AI-powered conversational agents can offer 24/7 empathetic interaction, personalised psychoeducation, and guided self-care — lowering barriers for individuals who cannot or do not seek in-person help. When augmented with clinical assessment tools and therapist oversight, such systems can meaningfully extend the reach of professional mental healthcare.'),
      ...blank(1),
      subHead('Scenario in India'),
      para('India faces a particularly acute mental health crisis. With an estimated 150 million people in need of mental health services and only approximately 9,000 psychiatrists, the psychiatrist-to-patient ratio is approximately 1:10,000 — far below the WHO-recommended ratio. Cultural stigma further inhibits help-seeking behaviour, especially among youth and rural populations.'),
      ...blank(1),
      para('Smartphone penetration in India has surpassed 700 million users, and internet connectivity continues to expand rapidly. This creates a unique opportunity for a digital mental health platform accessible in one\'s own context, without the need to initially identify oneself to a professional. MaanSarathi — meaning "guide of the mind" or "charioteer of the soul" in Sanskrit — is designed precisely for this context, providing an accessible, private, and empathetic digital companion that can scale across India and beyond.'),
      ...blank(1),
      subHead('Need for the Project'),
      para('Existing digital mental health solutions either offer simple rule-based chatbots with limited contextual understanding, or are expensive clinical platforms inaccessible to general users. Few systems integrate conversational AI, standardised clinical assessments, long-term mood and habit tracking, crisis safety protocols, and professional therapist oversight into a single, cohesive platform. MaanSarathi addresses this gap.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '1.2 Objectives of the Project', bold: true, font: 'Times New Roman' })] }),
      para('The primary objectives of MaanSarathi are as follows:'),
      ...blank(1),
      num(1, 'To develop a context-aware, empathetic AI conversational companion using a multi-provider LLM architecture with automatic failover for high availability.'),
      num(2, 'To implement a robust crisis detection pipeline that analyses user messages for distress signals and responds with de-escalation resources or clinical escalation.'),
      num(3, 'To build a long-term conversation memory system that tracks emotional patterns, therapeutic goals, and action items across sessions.'),
      num(4, 'To provide standardised clinical assessment tools (GAD-2, PHQ-9, Big Five, EI assessments) with automated scoring, interpretation, and trend analysis.'),
      num(5, 'To develop a personalised recommendation engine suggesting mindfulness practices, CBT exercises, breathing techniques, and audio meditations.'),
      num(6, 'To implement daily tracking modules for mood, sleep, journaling, habits, gratitude, and daily intentions with visualised progress and AI-generated insights.'),
      num(7, 'To create a secure therapist portal enabling clinicians to view patient progress, manage bookings, and add clinical notes.'),
      num(8, 'To design an admin portal for content curation, assessment management, platform analytics, user management, and system health monitoring.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '1.3 Organization of the Report', bold: true, font: 'Times New Roman' })] }),
      num(1, 'Chapter 2 covers the Literature Survey — prior work in digital mental health, AI chatbots, and LLM applications in wellbeing.'),
      num(2, 'Chapter 3 presents the Software Requirements Specification (SRS).'),
      num(3, 'Chapter 4 details the System Design — architecture, DFDs, and UML diagrams.'),
      num(4, 'Chapter 5 describes the Project Plan — effort estimates, risk management, and timeline.'),
      num(5, 'Chapter 6 covers Implementation — modules, algorithms, tools, code, and screenshots.'),
      num(6, 'Chapter 7 discusses Testing and test cases.'),
      num(7, 'Chapter 8 presents the Conclusion and future scope.'),
      num(8, 'Chapter 9 lists References.'),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 2 – LITERATURE SURVEY
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('2', 'LITERATURE SURVEY'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '2.1 Literature Survey', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('Research on AI-assisted mental health systems has grown substantially over the past decade. The following subsections review key studies and existing platforms organised by theme, identifying the gaps that MaanSarathi addresses.'),
      ...blank(1),
      subHead('2.1.1 AI Chatbots for Mental Health Support'),
      para('Fitzpatrick et al. (2017) demonstrated that Woebot, a rule-based chatbot delivering CBT techniques, produced significant reductions in depression and anxiety symptoms over two weeks. The study highlighted the potential of always-available digital companions. However, Woebot relied on scripted decision trees, limiting conversational naturalness. Vaidyam et al. (2019) reviewed 13 chatbot platforms, finding that most lacked longitudinal memory, crisis detection, and integration with professional care pathways — gaps MaanSarathi explicitly addresses.'),
      ...blank(1),
      subHead('2.1.2 Large Language Models in Healthcare'),
      para('With the emergence of transformer-based LLMs such as GPT-3 (Brown et al., 2020) and more recently GPT-4 and Claude, conversational quality has improved dramatically. Yang et al. (2022) found that appropriately prompted LLMs produce empathetic responses comparable to human counsellors. A critical challenge in LLM healthcare deployments is hallucination; MaanSarathi addresses this by using structured system prompts with explicit therapeutic role-playing guidelines and relying on LLMs primarily for empathetic dialogue rather than clinical diagnosis.'),
      ...blank(1),
      subHead('2.1.3 Crisis Detection and Safety Systems'),
      para('Coppersmith et al. (2018) demonstrated that ML models trained on social media data can detect suicidal ideation with reasonable sensitivity. Liu et al. (2020) proposed a multi-modal crisis detection framework combining keyword matching, sentiment analysis, and intent classification. MaanSarathi\'s crisis detection module draws on these principles with a layered approach: keyword matching, AI severity scoring, and structured escalation pathways.'),
      ...blank(1),
      subHead('2.1.4 Mood Tracking and Digital Phenotyping'),
      para('Mohr et al. (2017) introduced the concept of digital phenotyping — using smartphone data to infer mental health states. Mood tracking applications such as Daylio and MoodPath demonstrate that structured daily mood logs correlate with clinically validated depression and anxiety measures. MaanSarathi extends this by combining explicit mood logging with sleep logs, habit tracking, and AI-generated pattern summaries.'),
      ...blank(1),
      subHead('2.1.5 Clinical Assessments in Digital Platforms'),
      para('Validated instruments such as PHQ-9 (Kroenke et al., 2001) and GAD-7 (Spitzer et al., 2006) have been successfully adapted for digital administration. Titov et al. (2018) demonstrated that online administration produces psychometrically equivalent results to paper-based administration. MaanSarathi incorporates these alongside Big Five and emotional intelligence assessments.'),
      ...blank(1),
      subHead('2.1.6 Personalised Recommendation in Mental Health'),
      para('Collaborative filtering and content-based recommendation techniques have been applied to mental health content delivery (Torous et al., 2020). MaanSarathi\'s recommendation service derives focus areas from assessment scores, sentiment keywords, and mood trends, then ranks practices and content items by relevance.'),
      ...blank(1),
      subHead('2.1.7 Therapist-Patient Digital Integration'),
      para('Platforms such as BetterHelp and Talkspace have shown that online therapist-patient matching and therapy sessions are effective (Luo et al., 2020). MaanSarathi complements this with a therapist portal surfacing AI-generated summaries of patient progress, enabling clinicians to spend less time gathering information and more on therapeutic interaction.'),
      ...blank(1),
      subHead('Summary Table'),
      ...blank(1),
      mkTable(
        ['Sr. No.', 'Author(s) / Year', 'Contribution', 'Gap Addressed by MaanSarathi'],
        [
          ['1', 'Fitzpatrick et al. (2017)', 'CBT chatbot reduces anxiety and depression', 'No LLM, no memory'],
          ['2', 'Vaidyam et al. (2019)', 'Systematic review of mental health chatbots', 'Lacks crisis detection and professional integration'],
          ['3', 'Yang et al. (2022)', 'GPT-3 for empathetic mental health responses', 'No multi-provider fallback'],
          ['4', 'Liu et al. (2020)', 'Multi-modal crisis detection framework', 'Not integrated with care pathways'],
          ['5', 'Mohr et al. (2017)', 'Digital phenotyping for mental health', 'No therapist portal'],
          ['6', 'Torous et al. (2020)', 'Recommendation systems for mental health apps', 'No clinical integration'],
          ['7', 'Luo et al. (2020)', 'Online therapist-patient therapy', 'No AI-generated progress summaries'],
        ],
        [720, 2160, 3240, 3240]
      ),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 3 – SRS
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('3', 'SOFTWARE REQUIREMENTS SPECIFICATION'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.1 Introduction', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('This Software Requirements Specification (SRS) provides a comprehensive description of the MaanSarathi platform. It defines functional and non-functional requirements, system constraints, hardware and software needs, and the project scope. This document serves as the contract between the development team and stakeholders, forming the basis for system design, implementation, and testing.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.2 Problem Statement', bold: true, font: 'Times New Roman' })] }),
      para('The current landscape of mental health support applications suffers from four core limitations:'),
      ...blank(1),
      bul('Shallow AI interaction: Most chatbots use rule-based or single-provider AI models that lack contextual memory, therapeutic depth, and resilience under high load.'),
      bul('No safety infrastructure: Few platforms implement structured crisis detection with escalation pathways, placing vulnerable users at risk.'),
      bul('Siloed data: Self-care apps, clinical assessments, and therapist communication exist in separate silos, providing an incomplete picture of patient wellbeing.'),
      bul('No professional integration: Consumer apps do not offer therapist portals, clinical notes, or supervised care pathways.'),
      ...blank(1),
      para('MaanSarathi addresses all four gaps in a single integrated platform.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.3 Project Scope', bold: true, font: 'Times New Roman' })] }),
      bul('Provide an AI-powered conversational companion accessible via web browser, with planned mobile support.'),
      bul('Deliver standardised clinical assessments with automated scoring and longitudinal trend tracking.'),
      bul('Offer daily tracking for mood, sleep, journaling, gratitude, habits, and daily intentions.'),
      bul('Generate personalised content and practice recommendations based on user data.'),
      bul('Detect and respond to mental health crises with structured safety protocols.'),
      bul('Provide a therapist portal for oversight of patient progress and appointment management.'),
      bul('Provide an admin portal for content management, platform analytics, and system health monitoring.'),
      bul('Scope is limited to the web application for the current release; mobile is planned as future scope.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.4 User Classes and Characteristics', bold: true, font: 'Times New Roman' })] }),
      mkTable(
        ['User Role', 'Description', 'Technical Proficiency'],
        [
          ['End User', 'General public seeking mental health support, mood tracking, and wellbeing resources. No prior clinical experience required.', 'Low to Medium'],
          ['Therapist', 'Licensed mental health clinicians who access patient progress, manage bookings, and add clinical notes.', 'Medium'],
          ['Admin', 'Platform administrators managing content, assessments, users, and monitoring system health.', 'High'],
        ],
        [1800, 5400, 2160]
      ),
      ...blank(1),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.5 Functional Requirements', bold: true, font: 'Times New Roman' })] }),
      subHead('FR-01: Authentication and User Management'),
      bul('System shall support registration and login via email/password and Google OAuth (Passport.js).'),
      bul('System shall enforce JWT-based session management with configurable expiry.'),
      bul('System shall support three user roles: End User, Therapist, Admin.'),
      ...blank(1),
      subHead('FR-02: AI Conversational Engine'),
      bul('System shall provide an AI chat interface supporting multi-turn conversations.'),
      bul('System shall route LLM requests across Gemini, OpenAI, Anthropic, and Hugging Face with automatic fallback.'),
      bul('System shall maintain conversation memory tracking emotional patterns, goals, and action items.'),
      bul('System shall detect crisis language and respond with grounding exercises or escalation.'),
      ...blank(1),
      subHead('FR-03: Clinical Assessments'),
      bul('System shall offer standardised assessments including GAD-2, PHQ-9, Big Five, and EI scales.'),
      bul('System shall automatically score and interpret assessment responses.'),
      bul('System shall generate wellness scores and longitudinal trend insights.'),
      ...blank(1),
      subHead('FR-04: Daily Tracking'),
      bul('System shall allow users to log mood with emotion, intensity, triggers, and notes.'),
      bul('System shall track sleep hygiene, daily intentions, gratitude entries, and habits.'),
      bul('System shall provide an AI-powered journal with pattern recognition and writing prompts.'),
      ...blank(1),
      subHead('FR-05: Personalised Recommendations'),
      bul('System shall recommend practices and content based on current mood, assessment results, and engagement history.'),
      bul('System shall provide a multimedia content library with articles, audio meditations, breathing exercises, and yoga sequences.'),
      ...blank(1),
      subHead('FR-06: Therapist Portal'),
      bul('Therapists shall view a list of assigned patients and their wellbeing summaries.'),
      bul('Therapists shall be able to add clinical notes and manage appointment bookings.'),
      bul('Therapist data access shall be role-restricted via requireTherapist() middleware.'),
      ...blank(1),
      subHead('FR-07: Admin Portal'),
      bul('Admins shall manage content, assessments, users, therapist profiles, and platform settings.'),
      bul('Admins shall access AI performance analytics, system health metrics, and user engagement reports.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.6 Non-Functional Requirements', bold: true, font: 'Times New Roman' })] }),
      subHead('3.6.1 Performance Requirements'),
      bul('API response time for standard requests shall not exceed 2 seconds under normal load.'),
      bul('LLM response streaming shall begin within 3 seconds of message submission.'),
      bul('The system shall support at least 500 concurrent users in production.'),
      ...blank(1),
      subHead('3.6.2 Safety Requirements'),
      bul('Crisis detection shall execute on every user message before AI response generation.'),
      bul('All crisis events shall be persisted to the database for clinical review.'),
      bul('Emergency resources and grounding exercises shall be available without authentication.'),
      ...blank(1),
      subHead('3.6.3 Security Requirements'),
      bul('All sensitive data shall be encrypted in transit via HTTPS (TLS 1.2+).'),
      bul('JWT secrets and OAuth credentials shall be stored as environment variables, never hardcoded.'),
      bul('API endpoints shall enforce role-based access control (RBAC).'),
      bul('CORS origins shall be strictly configured in production.'),
      ...blank(1),
      subHead('3.6.4 Software Quality Attributes'),
      bul('Availability: The platform shall achieve 99.5% uptime, aided by LLM provider fallback.'),
      bul('Maintainability: The codebase shall use TypeScript throughout, with service-layer separation and comprehensive test coverage.'),
      bul('Usability: The interface shall be accessible on modern desktop browsers; WCAG 2.1 AA compliance is targeted.'),
      bul('Scalability: The architecture shall support horizontal scaling of the backend and database replication.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '3.7 System Requirements', bold: true, font: 'Times New Roman' })] }),
      subHead('3.7.1 Hardware Requirements'),
      bul('Processor: Intel Core i5 or equivalent (minimum)'),
      bul('RAM: 8 GB (minimum), 16 GB recommended'),
      bul('Storage: 20 GB free disk space'),
      bul('Internet connection for LLM API calls and package installation'),
      ...blank(1),
      subHead('3.7.2 Software Requirements'),
      mkTable(
        ['Component', 'Technology'],
        [
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
        ],
        [3600, 5760]
      ),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 4 – SYSTEM DESIGN  (with all 14 diagrams)
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('4', 'SYSTEM DESIGN'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.1 System Architecture', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('MaanSarathi follows a modular monolith architecture within a single monorepo. The system comprises a React web frontend, an Express.js backend API, a Prisma data layer, and specialised AI and business logic services. The architecture enables independent evolution of modules while sharing a common database and type system.'),
      ...blank(1),
      para('High-Level Flow: User (Web Browser) → React Frontend (Vite) → Express.js Backend API → AI Orchestration Layer (LLMService + ChatService) → Multi-Provider LLMs → Response → Prisma ORM → PostgreSQL/SQLite.'),
      ...blank(1),
      ...img(4, 'Figure 4.1: MaanSarathi – System Architecture Diagram'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.2 Data Flow Diagrams', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('The Data Flow Diagrams (DFDs) represent the flow of information within the MaanSarathi system at three levels of abstraction.'),
      ...blank(1),
      subHead('4.2.1 DFD Level 0 (Context Diagram) and Level 1 (Detailed Diagram)'),
      para('At the context level, MaanSarathi accepts inputs from three external actors — End Users (Patients), Therapists, and Administrators — and interacts with external AI Providers, a Notification Service, and a Google OAuth / JWT Authentication Service. At Level 1, the system decomposes into seven major functional modules: Authentication Process, Chat & AI Management, Assessment Management, Tracking & Reflection Management, Content & Recommendation Management, Notification Management, and Analytics & Reporting.'),
      ...blank(1),
      ...img(7, 'Figure 4.2: DFD Level 0 (Context Diagram) and Level 1 (Detailed Diagram)'),
      ...blank(1),
      subHead('4.2.2 DFD – All Levels (Level 0, Level 1, and Level 2 – Chat & AI Process Detail)'),
      para('The comprehensive DFD sheet shows all three levels together. At Level 2, the Chat & AI processing flow is broken down into nine sub-processes: Receive & Validate Message, Retrieve Context & Conversation History, Preprocess Input (NLP), AI Orchestrator (Select LLM), Generate AI Response, Post-process Response, Crisis Detection (Sentiment & Risk Analysis), Trigger Crisis Protocol, and Update Insights & Patterns.'),
      ...blank(1),
      ...img(2, 'Figure 4.3: DFD – All Levels (Level 0, Level 1, and Level 2 – Chat & AI Process)'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.3 UML Diagrams', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),

      subHead('4.3.1 Use Case Diagram'),
      para('The Overall System Use Case Diagram shows all actors — User (Patient), Therapist, and Admin — and their interactions with the six functional subsystems: AI & Conversational Engine, Clinical Assessments, Daily Tracking & Reflection, Content & Practices, Therapist Portal, and Admin & Platform Management, plus the Authentication & Account module.'),
      ...blank(1),
      ...img(14, 'Figure 4.4: Overall System Use Case Diagram – MaanSarathi'),

      subHead('4.3.2 Class Diagram'),
      para('The Class Diagram describes the main domain classes of MaanSarathi, their attributes, methods, and relationships. Core classes include: User, Profile, Conversation, Message, ChatService, LLMService, AIProvider (abstract), GeminiProvider, OpenAIProvider, AnthropicProvider, HuggingFaceProvider, MemoryStore, CrisisDetector, RecommendationService, Assessment, AssessmentSession, Score, InsightEngine, Content, Practice, MoodEntry, JournalEntry, SleepLog, Habit, Therapist, and Admin.'),
      ...blank(1),
      ...img(13, 'Figure 4.5: Class Diagram – MaanSarathi Main System Architecture'),

      subHead('4.3.3 Sequence Diagrams'),
      para('Sequence diagrams illustrate time-ordered interactions between objects for key scenarios.'),
      ...blank(1),
      para('Sequence Diagram – Chat Flow (AI Conversation): Shows the complete flow from a user sending a message through POST /api/chat/message, ChatService processing it, LLMService selecting a provider with fallback, CrisisDetector analyzing the response, ConversationMemory being updated, and the final response being returned with recommendations or grounding exercises.'),
      ...blank(1),
      ...img(12, 'Figure 4.6: Sequence Diagram – Chat Flow (AI Conversation)'),
      ...blank(1),
      para('The following diagram provides an overview of five key sequence flows: (1) AI Chat Conversation, (2) Mood Logging, (3) Assessment Submission, (4) Recommendation Generation, and (5) Therapist Interaction.'),
      ...blank(1),
      ...img(1, 'Figure 4.7: MaanSarathi – Sequence Diagrams Overview (5 Key Flows)'),
      ...blank(1),
      para('Sequence Diagram – Chat + AI Flow (Detailed): Shows the detailed WebSocket / HTTP flow from the user through the API Gateway, Chat Controller, ChatService, LLMService with multi-provider fallback (Gemini, OpenAI, Anthropic, HuggingFace, Ollama), Memory Service, PostgreSQL Database, and Insight & Analytics Service — including alternative flows for crisis detection, LLM failure, and network errors.'),
      ...blank(1),
      ...img(3, 'Figure 4.8: Sequence Diagram – Chat + AI Flow (Detailed, with Fallback and Crisis Alt Flows)'),
      ...blank(1),
      para('Sequence Diagram – Assessment Submission Flow: Shows the flow from a user selecting and starting an assessment, through the Assessment Service creating a session, iteratively fetching questions, saving answers per question, calculating scores, generating AI insights, and returning results — with an alternative flow for incomplete or error handling.'),
      ...blank(1),
      ...img(6, 'Figure 4.9: Sequence Diagram – Assessment Submission Flow'),

      subHead('4.3.4 Activity Diagrams'),
      para('Activity Diagram – User Journey (End-to-End Flow): Shows the complete user journey from opening the MaanSarathi application, through Login/Register, to the Dashboard, and then the four primary action paths: (1) Chat with AI, (2) Take Assessment, (3) Track & Reflect, and (4) Explore Content — with the crisis detection branch in the chat path, and the return-to-dashboard loop.'),
      ...blank(1),
      ...img(11, 'Figure 4.10: Activity Diagram – User Journey (End-to-End Flow)'),
      ...blank(1),
      para('Activity Diagram – Crisis Detection Logic: Shows the advanced AI flow for crisis detection through five stages: (1) User Input, (2) AI Analysis Pipeline (text preprocessing, context retrieval, feature extraction, AI analysis with LLM + NLP models, crisis signal score generation), (3) Risk Evaluation (aggregate risk score vs. threshold), (4) Response Actions (High Risk: crisis protocol, grounding exercises, emergency resources, therapist alert; Medium Risk: supportive resources, coping strategies; Low Risk: continue normally), and (5) Follow-up & Monitoring.'),
      ...blank(1),
      ...img(5, 'Figure 4.11: Activity Diagram – Crisis Detection Logic (Advanced AI Flow)'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.4 Component Diagram', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('The Component Diagram provides a high-level view of major components and their interactions in MaanSarathi. The three client applications (Web App, Mobile App, Therapist Portal) communicate through the API Gateway. Backend Services are organised into Core Modules (Auth, User, Chat, Assessment, Tracking, Notification), an AI & Intelligence Layer (LLM Service, Crisis Detector, Recommendation Service), and Shared Services (File, Content, Search, Analytics). The Data Layer includes PostgreSQL, Redis Cache, and Object Storage. External AI Providers (Gemini, OpenAI, Anthropic, HuggingFace, Ollama) are integrated into the AI layer.'),
      ...blank(1),
      ...img(9, 'Figure 4.12: Component Diagram – MaanSarathi System Architecture'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.5 Entity-Relationship (ER) Diagram', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('The ER Diagram shows the complete database schema for MaanSarathi with all primary and foreign key relationships. Key entities include: User, UserPreference, Therapist, Admin, Conversation, Message, Memory, Insight, Assessment, AssessmentSession, AssessmentResponse, Question, MoodEntry, SleepLog, JournalEntry, Habit, Content, Recommendation, CrisisAlert, and CrisisResourceUsage. All tables use UUID as primary key. JSON fields store flexible data for preferences, metadata, and AI-generated content.'),
      ...blank(1),
      ...img(8, 'Figure 4.13: ER Diagram – MaanSarathi Database Design'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '4.6 State Machine Diagram', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('The State Machine Diagram shows the Chat / User State Lifecycle. The session begins in the Idle state. On user message submission, the system transitions to Processing Message (validating input, retrieving context). It moves to Generating Response (LLMService generates using user context and profile), then Checking Safety (CrisisDetector analyzes). If no risk is detected, the system moves to Sending Response (with recommendations). If a risk is detected, it enters Crisis Handling (immediate support, grounding exercises) and potentially Escalation (notifying therapist/emergency). After response, the system waits for the next input. On timeout or user exit, it transitions to Ending Session (summarising conversation, updating insights) and finally to the Ended state.'),
      ...blank(1),
      ...img(10, 'Figure 4.14: State Machine Diagram – Chat / User State Lifecycle'),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 5 – PROJECT PLAN
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('5', 'PROJECT PLAN'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '5.1 Project Estimates', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      subHead('5.1.1 Effort Estimate Timetable'),
      ...blank(1),
      mkTable(
        ['Task', 'Effort (Weeks)', 'Deliverables', 'Milestones'],
        [
          ['Analysis of existing systems and requirement gathering', '4 weeks', 'Requirements Document', '–'],
          ['Literature Survey', '1 week', 'Survey Report', '–'],
          ['System Architecture and Design', '2 weeks', 'Design Document, SRS', '–'],
          ['Database Schema Design (Prisma)', '1 week', 'schema.prisma', '–'],
          ['Backend API Development', '5 weeks', 'Express.js API', 'Working API'],
          ['AI Service Integration (LLM, Crisis, Memory)', '3 weeks', 'LLM Services', 'AI Chat Working'],
          ['Frontend Development (React + Tailwind)', '5 weeks', 'React Web App', 'Working UI'],
          ['Assessment Engine and Tracking Modules', '2 weeks', 'Assessment + Mood Modules', '–'],
          ['Admin and Therapist Portals', '2 weeks', 'Portal UIs', '–'],
          ['Testing (Unit + Integration)', '3 weeks', 'Test Reports', 'Formal Review'],
          ['Documentation and Report Writing', '2 weeks', 'Project Report', 'Final Submission'],
        ],
        [2880, 1440, 2520, 2520]
      ),
      ...blank(1),
      subHead('5.1.2 Project Schedule'),
      ...blank(1),
      mkTable(
        ['Month Scheduled', 'Phase', 'Date', 'Work Done'],
        [
          ['July 2024', 'Topic Searching', '16/06/2024', 'Topic Searched'],
          ['August 2024', 'Topic Selection', '01/07/2024', 'Topic Selected'],
          ['', 'Project Confirmation', '04/07/2024', 'Project Confirmed'],
          ['September 2024', 'Review 1', '01/08/2024', 'Review 1 Done'],
          ['', 'Final Review 1', '06/08/2024', 'Final Review 1 Done'],
          ['October 2024', 'Requirement Gathering', '23/08/2024', 'Requirements Gathered'],
          ['November 2024', 'Coding – Core Modules', '02/10/2024', 'Auth, Chat, Mood Modules Coded'],
          ['December 2024', 'Review 2', '15/10/2024', 'Review 2 Done'],
          ['January 2025', 'AI Integration & Design', '03/01/2025', 'LLM Providers Integrated'],
          ['', 'Assessment Engine', '10/01/2025', 'Assessment Scoring + Insights'],
          ['', 'Recommendation Service', '24/01/2025', 'Recommendation Engine Integrated'],
          ['', 'Admin / Therapist Portals', '31/01/2025', 'Portals Built'],
          ['February 2025', 'Review 3', '03/02/2025', 'Review 3 Done'],
          ['', 'Crisis Detection Pipeline', '08/02/2025', 'Crisis Detection + Escalation'],
          ['', 'Mobile Scaffold', '19/02/2025', 'React Native / Expo Setup'],
          ['March 2025', 'Backend Optimisation', '08/03/2025', 'Performance + Security Hardening'],
          ['', 'UI Polish and Testing', '17/03/2025', 'Frontend Polish + Unit Tests'],
          ['April 2025', 'Review 4 / Final', '11/04/2025', 'Review 4 Done, Report Finalised'],
        ],
        [1800, 2340, 1440, 3780]
      ),
      ...blank(1),
      subHead('5.1.3 KLOC Estimation'),
      ...blank(1),
      mkTable(
        ['Sr. No.', 'Module', 'Estimated KLOC'],
        [
          ['1', 'Backend API (controllers, routes, services)', '12.5'],
          ['2', 'AI Services (LLMService, ChatService, CrisisDetection, Memory)', '6.8'],
          ['3', 'Frontend (React components, hooks, services)', '18.2'],
          ['4', 'Admin and Therapist Portals', '5.4'],
          ['5', 'Assessment Engine (scoring, insights)', '3.2'],
          ['6', 'Mobile App (future scope – React Native)', '8.0'],
          ['7', 'Database Schema and Seed Scripts', '1.5'],
          ['', 'TOTAL', '55.6'],
        ],
        [900, 5760, 2700]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '5.2 Risk Management', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      mkTable(
        ['Risk', 'Probability', 'Impact', 'Mitigation Strategy'],
        [
          ['LLM API downtime or rate limiting', 'Medium', 'High', 'Multi-provider fallback (Gemini→HuggingFace→OpenAI→Anthropic)'],
          ['User data privacy breach', 'Low', 'Very High', 'HTTPS, JWT, env-var secrets, CORS, role-based access control'],
          ['Crisis detection false negative', 'Low', 'Very High', 'Layered detection: keyword + AI scoring + admin alert'],
          ['Database corruption or data loss', 'Low', 'High', 'Regular backups, Prisma migrations, staging environment'],
          ['Scope creep beyond mobile app', 'High', 'Medium', 'Scope fixed to web; mobile listed as future scope'],
          ['Team member unavailability', 'Medium', 'Medium', 'Modular codebase; each module independently workable'],
        ],
        [2400, 1080, 1080, 4800]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '5.3 Timeline Chart', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      mkTable(
        ['Month', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
        [
          ['Finalise Topic', '✓', '', '', '', '', '', '', '', '', ''],
          ['Literature Survey', '', '✓', '', '', '', '', '', '', '', ''],
          ['Design & Planning', '', '', '✓', '', '', '', '', '', '', ''],
          ['Mid-sem Report', '', '', '', '✓', '', '', '', '', '', ''],
          ['Backend Development', '', '', '', '', '✓', '✓', '', '', '', ''],
          ['Frontend Development', '', '', '', '', '', '✓', '✓', '', '', ''],
          ['AI Integration', '', '', '', '', '', '', '✓', '✓', '', ''],
          ['Testing', '', '', '', '', '', '', '', '', '✓', ''],
          ['Final Report', '', '', '', '', '', '', '', '', '', '✓'],
        ],
        [2400, 630, 630, 630, 630, 630, 630, 630, 630, 630, 630]
      ),
      ...blank(1),
      para('Figure 5.1: Timeline Chart', { center: true }),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 6 – IMPLEMENTATION
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('6', 'IMPLEMENTATION'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.1 Module Descriptions', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      subHead('Module 1: AI Conversational Engine'),
      para('The conversational engine is implemented across three primary services: LLMService, ChatService, and CrisisDetectionService.'),
      bul('LLMService maintains a registry of API providers, rotates keys to avoid rate limits, and selects the active provider using a priority queue. It falls back to the next provider on any failure.'),
      bul('ChatService orchestrates the full message lifecycle: assembles context from user profile, mood history, conversation memory, and recent assessments; builds a therapeutic system prompt; invokes LLMService; post-processes the response to detect exercise card metadata; and persists the conversation.'),
      bul('CrisisDetectionService runs a two-pass analysis: keyword and pattern match against a curated crisis lexicon, followed by an AI-based severity score. If severity exceeds a threshold, it returns a crisis response pathway and persists a CrisisEvent record.'),
      ...blank(1),
      subHead('Module 2: Clinical Assessment Engine'),
      para('The assessment engine supports configurable, standardised psychometric assessments defined by JSON schemas in the database, allowing admins to add or modify assessments without code changes.'),
      bul('Scoring is handled by dedicated scoring functions — scoreGad2(), scorePHQ9(), scoreBigFive(), scoreEq5(), etc. — applying validated clinical algorithms.'),
      bul('Assessment insights are generated by buildAssessmentInsights(), which derives wellness scores, trend direction, and AI-generated narrative summaries.'),
      bul('Historical assessment data is aggregated into longitudinal trend charts on the user\'s dashboard.'),
      ...blank(1),
      subHead('Module 3: Daily Tracking (Mood, Sleep, Journal, Habits, Gratitude, Intentions)'),
      bul('Mood: each entry records mood label, emotion category, intensity (1–10), trigger, and free-text notes.'),
      bul('Sleep: sleep hygiene logs capture bedtime, wake time, quality rating, and notes.'),
      bul('Journal: AI-powered journal analyses entry patterns and surfaces themes, affirmations, and writing prompts.'),
      bul('Habits: daily habit logging with streak calculations and adaptive nudges from buildHabitNudge().'),
      bul('Gratitude: daily gratitude entries with AI-generated reflection prompts.'),
      bul('Intentions: daily intention setting with end-of-day reflection.'),
      ...blank(1),
      subHead('Module 4: Personalised Recommendation Engine'),
      para('The EnhancedRecommendationService derives focus areas by combining: recent assessment severity scores, prevalent emotion keywords from chat history, mood trend direction, and the user\'s wellness context. It ranks content and practice items by relevance to focus areas, filters by engagement history to avoid repetition, and attaches contextual reasons for each recommendation.'),
      ...blank(1),
      subHead('Module 5: Therapist Portal'),
      para('The therapist portal provides a dedicated interface for licensed clinicians. Therapists can view their assigned client list, review AI-generated wellbeing summaries, access historical assessment results, and add clinical notes. Appointment management is fully integrated. All therapist data access is gated by the requireTherapist() middleware.'),
      ...blank(1),
      subHead('Module 6: Admin Portal'),
      bul('Content and Practice Management: CRUD operations on articles, meditations, exercises, and other resources.'),
      bul('Assessment Management: create, edit, duplicate, and publish assessments; manage interpretation bands.'),
      bul('User and Therapist Management: view, deactivate, and manage user accounts.'),
      bul('Analytics: AI performance analytics, system health metrics, user engagement stats, and wellness impact analytics.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.2 Algorithms', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      subHead('6.2.1 Multi-Provider LLM Routing Algorithm'),
      para('The LLMService implements a priority-queue-based provider selection algorithm:'),
      num(1, 'Read AI_PROVIDER_PRIORITY from environment (default: gemini, huggingface, openai, anthropic).'),
      num(2, 'For each provider in priority order: attempt to retrieve a healthy API key via round-robin rotation.'),
      num(3, 'Send the chat payload to the selected provider\'s API endpoint.'),
      num(4, 'If response is successful: return the response and log metrics.'),
      num(5, 'If response fails: log the failure, mark the key as temporarily unhealthy, rotate to next key or next provider, retry.'),
      num(6, 'If all providers fail: throw AIProviderError with user-friendly message.'),
      ...blank(1),
      subHead('6.2.2 Crisis Detection Algorithm (Layered)'),
      num(1, 'Layer 1 — Keyword Matching: scan the message against a crisis lexicon organised by severity (mild, moderate, high, emergency). Matches produce an initial severity score.'),
      num(2, 'Layer 2 — AI Severity Scoring: if keyword score exceeds a low threshold, send the message to the LLM with a crisis assessment prompt. The LLM returns a structured severity score (0–10).'),
      num(3, 'Layer 3 — Response Selection: based on combined score: (a) empathetic acknowledgement, (b) grounding exercise (5-4-3-2-1 technique, breathing), or (c) emergency escalation with crisis helpline.'),
      num(4, 'Crisis events at level (b) or above are persisted to the CrisisEvent table for clinical review.'),
      ...blank(1),
      subHead('6.2.3 Wellness Score Calculation'),
      num(1, 'Assessment component (40%): most recent session scores normalised to 0–100 using validated cut-offs.'),
      num(2, 'Mood component (30%): rolling 14-day mood average, with streak bonuses for consistent logging.'),
      num(3, 'Engagement component (20%): proportion of days with at least one tracked activity over the past 30 days.'),
      num(4, 'Sleep component (10%): average sleep quality rating over the past 14 days.'),
      num(5, 'Components are weighted and summed to produce a wellness score (0–100), stored as a WellnessSnapshot.'),
      ...blank(1),
      subHead('6.2.4 Personalised Recommendation Scoring'),
      num(1, 'Focus area derivation: derived from assessment scores, mood keywords, and trend direction.'),
      num(2, 'Relevance boost: items tagged with user\'s focus areas receive a base relevance score.'),
      num(3, 'Engagement history penalty: recently completed items receive a decay factor to promote variety.'),
      num(4, 'Mood-based filtering: items filtered to approaches appropriate for current mood.'),
      num(5, 'Final ranking: items sorted by adjusted relevance score; top N items returned with generated reasons.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.3 Tools and Technologies Used', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      mkTable(
        ['Technology', 'Version', 'Purpose'],
        [
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
          ['Recharts', '2.x', 'Data visualisation for mood and progress charts'],
          ['React Native / Expo', 'Latest', 'Mobile application (future scope)'],
        ],
        [3240, 1440, 4680]
      ),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.4 Sample Code', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      subHead('6.4.1 LLMService – Multi-Provider Routing (TypeScript)'),
      ...blank(1),
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
        '      provider.rotateApiKey();  // try next key, then next provider',
        '    }',
        '  }',
        '  throw new AIProviderError("All LLM providers unavailable");',
        '}',
      ]),
      ...blank(1),
      subHead('6.4.2 CrisisDetectionService – detectCrisisLanguage (TypeScript)'),
      ...blank(1),
      ...code([
        'async detectCrisisLanguage(message: string, userId: string) {',
        '  const keywordScore = this.keywordScanner.score(message);',
        '  if (keywordScore < CRISIS_THRESHOLD_LOW) return null;',
        '',
        '  const aiScore = await this.llmService.scoreCrisisSeverity(message);',
        '  const combined = 0.4 * keywordScore + 0.6 * aiScore;',
        '',
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
      subHead('6.4.3 Mood Controller – createMoodEntry (TypeScript)'),
      ...blank(1),
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
      subHead('6.4.4 Wellness Score Calculation (TypeScript)'),
      ...blank(1),
      ...code([
        'function calculateWellnessScore(',
        '  assessments: AssessmentSession[],',
        '  moods: MoodEntry[],',
        '  engagement: EngagementData,',
        '  sleep: SleepLog[]',
        '): number {',
        '  const a = normaliseAssessments(assessments) * 0.40;',
        '  const m = computeMoodAvg(moods) * 0.30;',
        '  const e = engagementRate(engagement) * 0.20;',
        '  const s = avgSleepQuality(sleep) * 0.10;',
        '  return Math.round(a + m + e + s);',
        '}',
      ]),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: '6.5 Result Set / Screenshots', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      para('The following sections describe the key screens of the MaanSarathi platform. Screenshots should be inserted in the designated placeholders below.'),
      ...blank(1),
      subHead('6.5.1 Landing Page and Authentication'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: {
        top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE
      }, spacing: { before: 160, after: 160 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Landing Page — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      ...blank(1),
      subHead('6.5.2 AI Chat Interface with Crisis Detection'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: {
        top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE
      }, spacing: { before: 160, after: 160 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: AI Chat Interface — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      ...blank(1),
      subHead('6.5.3 User Dashboard and Progress Analytics'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: {
        top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE
      }, spacing: { before: 160, after: 160 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Dashboard — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      ...blank(1),
      subHead('6.5.4 Clinical Assessment Screen'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: {
        top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE
      }, spacing: { before: 160, after: 160 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Assessment Screen — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      ...blank(1),
      subHead('6.5.5 Therapist Portal'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: {
        top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE
      }, spacing: { before: 160, after: 160 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Therapist Portal — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),
      ...blank(1),
      subHead('6.5.6 Admin Portal'),
      new Paragraph({ alignment: AlignmentType.CENTER, border: {
        top: BORDER_SINGLE, bottom: BORDER_SINGLE, left: BORDER_SINGLE, right: BORDER_SINGLE
      }, spacing: { before: 160, after: 160 }, shading: { fill: 'F5F5F5', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '[Screenshot: Admin Portal — Insert here]', size: 20, font: 'Times New Roman', italics: true, color: '888888' })] }),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 7 – TESTING
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('7', 'TESTING'),
      para('Software testing, depending on the testing method employed, can be implemented at any time in the development process. The methodology of the test is governed by the software development methodology adopted. For MaanSarathi, a comprehensive multi-layered testing strategy is employed to ensure quality, security, and safety — particularly critical given the sensitive nature of the mental health domain.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Types of Testing Used', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      subHead('Unit Testing'),
      para('Unit testing concentrates verification on the smallest element — the module. Individual service functions are unit-tested in isolation using Vitest. Key units tested include: assessment scoring functions (scoreGad2, scoreBigFive), mood normalisation (normalizeLegacyMood), wellness score computation, and recommendation ranking. Mocks are used for database and LLM dependencies.'),
      ...blank(1),
      subHead('Integration Testing'),
      para('Once all individual units have been tested, integration testing ensures no data is lost across interfaces and that one module does not adversely impact another. API endpoints are integration-tested using supertest against a test SQLite database, verifying that controllers, services, and the data layer interact correctly across the full request lifecycle.'),
      ...blank(1),
      subHead('System Testing'),
      para('System testing ensures that by putting the software in different environments it still works. Critical user journeys — registration, first chat interaction, crisis detection pathway, and assessment submission — are tested end-to-end in a staging environment.'),
      ...blank(1),
      subHead('White-Box Testing'),
      para('In white-box testing, an internal perspective of the system is used to design test cases. This approach tests internal program logic, data flows, and control paths. Applied to the LLM routing algorithm, crisis detection logic, assessment scoring algorithms, and wellness score calculation.'),
      ...blank(1),
      subHead('Black-Box Testing'),
      para('Black-box testing treats the software as a "black box", examining functionality without knowledge of internal implementation. Applied to all API endpoints and user interface workflows to verify that defined inputs produce the expected outputs from a user perspective.'),
      ...blank(1),
      subHead('Performance Testing'),
      para('Performance testing ensures that the system generates results within specified time constraints. Applied to LLM response times (< 3 seconds for streaming to begin), API response times (< 2 seconds standard), and concurrent user load testing.'),
      ...blank(1),
      subHead('Usability Testing'),
      para('Usability testing is performed from the client\'s perspective to evaluate user-friendliness of the GUI. Applied to the chat interface, dashboard, assessment flow, and therapist portal with representative user groups.'),

      new Paragraph({ heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: 'Test Cases – Test Results', bold: true, font: 'Times New Roman' })] }),
      dividerRule(),
      subHead('Table 7.1: Test Cases – Authentication Module'),
      mkTable(
        ['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'],
        [
          ['Valid Registration', 'Name, email, password', 'Account created, JWT returned', 'Account created, redirected to dashboard', 'P'],
          ['Duplicate Email', 'Existing email', 'Error: "Email already registered"', 'Error: "Email already registered"', 'P'],
          ['Valid Login', 'Correct email/password', 'JWT token returned', 'Redirected to dashboard', 'P'],
          ['Invalid Password', 'Wrong credentials', 'Error: "Invalid credentials"', 'Error: "Invalid credentials"', 'P'],
          ['Google OAuth Login', 'Google token', 'JWT token returned', 'Logged in, redirected to dashboard', 'P'],
        ],
        [1800, 1800, 2400, 2400, 720]
      ),
      ...blank(1),
      subHead('Table 7.2: Test Cases – Chat and AI Engine'),
      mkTable(
        ['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'],
        [
          ['Normal message – AI response', 'User message (no crisis)', 'AI response received', '200 OK, empathetic AI response', 'P'],
          ['Crisis message – grounding response', 'High distress message', 'Crisis response + grounding exercise returned', 'Crisis response with emergency resources', 'P'],
          ['LLM provider fallback', 'Primary provider unavailable', 'Response from fallback provider', 'Response from backup LLM provider', 'P'],
          ['Conversation memory retention', 'Reference to prior session detail', 'AI acknowledges prior context', 'AI references past conversation', 'P'],
          ['All providers unavailable', 'All API keys invalid', 'User-friendly error message', '503 with graceful error', 'P'],
        ],
        [1800, 1800, 2400, 2400, 720]
      ),
      ...blank(1),
      subHead('Table 7.3: Test Cases – Mood Tracking Module'),
      mkTable(
        ['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'],
        [
          ['Create mood entry', 'mood, emotion, intensity=7, trigger', '201 Created, entry returned', 'Entry stored with all fields', 'P'],
          ['Invalid intensity (out of range)', 'intensity=15', '400 Bad Request – validation error', 'Zod validation error: max 10', 'P'],
          ['Retrieve mood history', 'Authenticated GET request', 'Array of mood entries with stats', 'Mood entries with distribution and streak', 'P'],
          ['Mood streak calculation', '7 consecutive days of entries', 'streak=7 returned in stats', 'Streak correctly calculated', 'P'],
        ],
        [1800, 1800, 2400, 2400, 720]
      ),
      ...blank(1),
      subHead('Table 7.4: Test Cases – Assessment Engine Module'),
      mkTable(
        ['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'],
        [
          ['Submit GAD-2 assessment', '2 responses (0–3 scale)', 'Score 0–6, interpretation label', 'Score and Minimal/Mild/Moderate/Severe label', 'P'],
          ['Submit PHQ-9 assessment', '9 responses (0–3 scale)', 'Score 0–27, severity band', 'Score with severity interpretation and insights', 'P'],
          ['Assessment history retrieval', 'Authenticated GET', 'Array of past session results', 'Historical sessions with trend data', 'P'],
          ['Invalid assessment ID', 'Non-existent assessment ID', '404 Not Found', 'Error: Assessment not found', 'P'],
        ],
        [1800, 1800, 2400, 2400, 720]
      ),
      ...blank(1),
      subHead('Table 7.5: Test Cases – Admin and Therapist Portal'),
      mkTable(
        ['Test Case', 'Test Case I/P', 'Actual Result', 'Expected Result', 'P/F'],
        [
          ['Admin creates new content', 'Title, body, type, tags', '201 Created, content object', 'Content stored and retrievable', 'P'],
          ['Non-admin on admin endpoint', 'End-user JWT on /admin route', '403 Forbidden', 'Role-based access denied', 'P'],
          ['Therapist views client progress', 'Therapist JWT + client ID', '200 OK, patient summary', 'Patient wellbeing summary returned', 'P'],
          ['Therapist accesses wrong client', 'Therapist JWT + unassigned client ID', '403 Forbidden', 'Access denied – not assigned client', 'P'],
        ],
        [1800, 1800, 2400, 2400, 720]
      ),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 8 – CONCLUSION
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('8', 'CONCLUSION'),
      dividerRule(),
      para('MaanSarathi represents a significant step forward in the application of Artificial Intelligence to digital mental health support. By integrating a multi-provider LLM conversational engine, a structured crisis detection and safety protocol, long-term conversation memory, standardised clinical assessments, comprehensive daily tracking, personalised recommendations, and professional therapist oversight into a single platform, MaanSarathi addresses the key limitations of existing digital mental health tools.'),
      ...blank(1),
      para('The platform\'s multi-provider AI architecture ensures high availability — a critical requirement for mental health applications where system downtime could leave vulnerable users without support at a critical moment. The crisis detection module provides a structured safety net, ensuring that users expressing distress are guided toward appropriate resources and care pathways rather than receiving generic AI responses.'),
      ...blank(1),
      para('From a technical standpoint, MaanSarathi demonstrates how modern full-stack technologies — React, Express.js, Prisma, and TypeScript — can be combined with cloud AI APIs to build a maintainable, scalable, and secure mental health platform. The modular monorepo architecture facilitates independent development of features while maintaining a shared type system and database schema.'),
      ...blank(1),
      para('The platform has been designed with India\'s mental health landscape in mind, where a chronic shortage of professionals, widespread stigma, and growing smartphone penetration make a digital-first approach both necessary and timely. MaanSarathi provides a private, empathetic, and always-available companion that can meaningfully extend the reach of mental health support — bridging the gap between self-care and professional intervention.'),
      ...blank(1),
      subHead('Future Scope'),
      bul('Mobile Application: The React Native/Expo mobile application, already scaffolded in the monorepo, will be fully developed to provide feature parity with the web application, including biometric authentication and push notifications.'),
      bul('Multilingual Support: Adding Hindi and other regional Indian language support to make the platform accessible to non-English-speaking users.'),
      bul('Voice Interaction: Integration of speech recognition for voice-based journaling and chat interaction, particularly relevant for mobile users.'),
      bul('Advanced Personalisation: Incorporating passive sensing signals (with user consent) such as typing patterns and session timing to enhance the digital phenotyping model.'),
      bul('Clinical Research Partnerships: Collaborating with mental health institutions to validate MaanSarathi\'s assessment insights against clinically administered evaluations.'),
      bul('Expanded Assessment Library: Adding validated instruments for PTSD, OCD, bipolar disorder screening, and substance use assessment.'),
      bul('Group Therapy Features: Facilitating moderated peer support groups supervised by therapists.'),

      // ══════════════════════════════════════════════════════════════════════
      //  CHAPTER 9 – REFERENCES
      // ══════════════════════════════════════════════════════════════════════
      pgBreak(),
      ...chapterPage('9', 'REFERENCES'),
      dividerRule(),
      num(1, 'Fitzpatrick, K. K., Darcy, A., & Vierhile, M. (2017). Delivering Cognitive Behavior Therapy to Young Adults With Symptoms of Depression and Anxiety Using a Fully Automated Conversational Agent (Woebot): A Randomized Controlled Trial. JMIR Mental Health, 4(2), e19.'),
      num(2, 'Vaidyam, A. N., Wisniewski, H., Halamka, J. D., Kashavan, M. S., & Torous, J. B. (2019). Chatbots and Conversational Agents in Mental Health: A Review of the Psychiatric Landscape. The Canadian Journal of Psychiatry, 64(7), 456–464.'),
      num(3, 'Yang, K., Zhang, T., & Ananiadou, S. (2022). A mental health knowledge graph for empathetic dialogue generation. Applied Sciences, 12(7), 3296.'),
      num(4, 'Singhal, K., Azizi, S., Tu, T., et al. (2022). Large Language Models Encode Clinical Knowledge. Nature, 620, 172–180.'),
      num(5, 'Liu, S., et al. (2020). Multi-Label Classification for Suicidal Ideation Detection. Proceedings of EMNLP 2020.'),
      num(6, 'Mohr, D. C., Zhang, M., & Schueller, S. M. (2017). Personal sensing: Understanding mental health using ubiquitous sensors and machine learning. Annual Review of Clinical Psychology, 13, 23–47.'),
      num(7, 'Kroenke, K., Spitzer, R. L., & Williams, J. B. (2001). The PHQ-9: validity of a brief depression severity measure. Journal of General Internal Medicine, 16(9), 606–613.'),
      num(8, 'Spitzer, R. L., Kroenke, K., Williams, J. B., & Lowe, B. (2006). A brief measure for assessing generalized anxiety disorder. Archives of Internal Medicine, 166(10), 1092–1097.'),
      num(9, 'Torous, J., et al. (2020). Digital mental health and COVID-19: Using technology today to accelerate the curve on access and quality tomorrow. JMIR Mental Health, 7(3).'),
      num(10, 'Luo, C., et al. (2020). Smartphone-based blood pressure telemonitoring with self-management support for hypertension treatment. Journal of Medical Internet Research, 22(4), e17504.'),
      num(11, 'World Health Organization. (2022). World Mental Health Report: Transforming Mental Health for All. WHO Press, Geneva.'),
      num(12, 'Brown, T. B., et al. (2020). Language Models are Few-Shot Learners (GPT-3). Advances in Neural Information Processing Systems, 33.'),
      num(13, 'Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding. Proceedings of NAACL-HLT 2019.'),
      num(14, 'Titov, N., et al. (2018). ICBT in routine care: A descriptive analysis of successful clinics in five countries. Internet Interventions, 13, 108–115.'),
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
  const outputPath = path.join(__dirname, 'ManaSarathi_BlackBook_v2.docx');
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outputPath, buffer);
  console.log(`Done! Generated: ${outputPath} Size: ${buffer.length}`);
}

main().catch((error) => {
  console.error('Failed to generate document:', error);
  process.exit(1);
});