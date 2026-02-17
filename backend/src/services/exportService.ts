import type { Conversation, ChatMessage } from '@prisma/client';

interface ExportOptions {
  includeSystemMessages?: boolean;
  includeMetadata?: boolean;
}

type ConversationWithMessages = Conversation & {
  messages: ChatMessage[];
};

export class ExportService {
  /**
   * Generate text export of conversation
   */
  generateTextExport(
    conversation: ConversationWithMessages,
    options: ExportOptions = {}
  ): string {
    const { includeSystemMessages = true, includeMetadata = true } = options;

    let text = '';

    // Header
    text += '='.repeat(60) + '\n';
    text += `Conversation: ${conversation.title || 'Untitled'}\n`;
    
    if (includeMetadata) {
      text += `Created: ${conversation.createdAt.toLocaleString()}\n`;
      text += `Last Updated: ${conversation.updatedAt.toLocaleString()}\n`;
      text += `Total Messages: ${conversation.messages.length}\n`;
    }
    
    text += '='.repeat(60) + '\n\n';

    // Messages
    const messages = includeSystemMessages
      ? conversation.messages
      : conversation.messages.filter((m) => m.type !== 'system');

    messages.forEach((message, index) => {
      const timestamp = message.createdAt.toLocaleString();
      const sender =
        message.type === 'user'
          ? 'You'
          : message.type === 'bot'
          ? 'AI Assistant'
          : 'System';

      text += `[${timestamp}] ${sender}:\n`;
      text += `${message.content}\n`;

      if (index < messages.length - 1) {
        text += '\n' + '-'.repeat(60) + '\n\n';
      }
    });

    // Footer
    text += '\n' + '='.repeat(60) + '\n';
    text += `Exported: ${new Date().toLocaleString()}\n`;
    text += `MaanSarathi - Conversation Export\n`;
    text += '='.repeat(60) + '\n';

    return text;
  }

  /**
   * Generate JSON export of conversation
   */
  generateJSONExport(
    conversation: ConversationWithMessages,
    options: ExportOptions = {}
  ): string {
    const { includeSystemMessages = true, includeMetadata = true } = options;

    const messages = includeSystemMessages
      ? conversation.messages
      : conversation.messages.filter((m) => m.type !== 'system');

    const exportData: any = {
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
      messages: messages.map((m) => ({
        id: m.id,
        type: m.type,
        content: m.content,
        timestamp: m.createdAt,
      })),
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    if (includeMetadata) {
      exportData.metadata = {
        messageCount: messages.length,
        duration: this.calculateDuration(conversation),
        conversationId: conversation.id,
      };
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Generate PDF export of conversation
   */
  async generatePDFExport(
    conversation: ConversationWithMessages,
    options: ExportOptions = {}
  ): Promise<Buffer> {
    // Dynamic require for pdfkit to avoid CommonJS/ESM issues
    const PDFDocument = require('pdfkit');
    
    const { includeSystemMessages = true, includeMetadata = true } = options;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Header
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('MaanSarathi', { align: 'center' });

        doc.moveDown(0.5);
        doc
          .fontSize(16)
          .font('Helvetica')
          .text(conversation.title || 'Untitled Conversation', {
            align: 'center',
          });

        doc.moveDown();

        // Metadata section
        if (includeMetadata) {
          doc.fontSize(10).font('Helvetica');
          doc.text(`Created: ${conversation.createdAt.toLocaleString()}`, {
            align: 'left',
          });
          doc.text(`Last Updated: ${conversation.updatedAt.toLocaleString()}`, {
            align: 'left',
          });
          doc.text(`Total Messages: ${conversation.messages.length}`, {
            align: 'left',
          });
          doc.moveDown();
        }

        // Separator line
        doc
          .strokeColor('#cccccc')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke();

        doc.moveDown();

        // Messages
        const messages = includeSystemMessages
          ? conversation.messages
          : conversation.messages.filter((m) => m.type !== 'system');

        messages.forEach((message, index) => {
          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          const sender =
            message.type === 'user'
              ? 'You'
              : message.type === 'bot'
              ? 'AI Assistant'
              : 'System';

          const timestamp = message.createdAt.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          // Sender and timestamp
          doc
            .fontSize(10)
            .font('Helvetica-Bold')
            .fillColor(message.type === 'user' ? '#3b82f6' : '#10b981')
            .text(`${sender}`, { continued: true })
            .font('Helvetica')
            .fillColor('#666666')
            .text(` • ${timestamp}`);

          doc.moveDown(0.3);

          // Message content
          doc
            .fontSize(11)
            .font('Helvetica')
            .fillColor('#000000')
            .text(message.content, {
              align: 'left',
              lineGap: 2,
            });

          doc.moveDown();

          // Separator between messages (except last)
          if (index < messages.length - 1) {
            doc
              .strokeColor('#e5e7eb')
              .lineWidth(0.5)
              .moveTo(50, doc.y)
              .lineTo(545, doc.y)
              .stroke();
            doc.moveDown(0.5);
          }
        });

        // Add footer to last page only
        doc.moveDown(2);
        doc
          .fontSize(8)
          .fillColor('#999999')
          .text(
            `Exported: ${new Date().toLocaleDateString()}`,
            50,
            doc.page.height - 30,
            { align: 'center' }
          );

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate bulk export (multiple conversations)
   */
  async generateBulkExport(
    conversations: ConversationWithMessages[],
    format: 'text' | 'json'
  ): Promise<string> {
    if (format === 'text') {
      return conversations
        .map((conv, index) => {
          let text = this.generateTextExport(conv);
          if (index < conversations.length - 1) {
            text += '\n\n' + '▓'.repeat(60) + '\n\n';
          }
          return text;
        })
        .join('');
    } else {
      // JSON bulk export
      const bulkData = {
        conversations: conversations.map((conv) =>
          JSON.parse(this.generateJSONExport(conv))
        ),
        exportedAt: new Date().toISOString(),
        totalConversations: conversations.length,
        version: '1.0',
      };
      return JSON.stringify(bulkData, null, 2);
    }
  }

  /**
   * Helper: Calculate conversation duration
   */
  private calculateDuration(conversation: ConversationWithMessages): string {
    if (conversation.messages.length === 0) {
      return '0 minutes';
    }

    const firstMessage = conversation.messages[0];
    const lastMessage =
      conversation.messages[conversation.messages.length - 1];

    const diffMs =
      lastMessage.createdAt.getTime() - firstMessage.createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
    } else {
      return 'Less than a minute';
    }
  }
}

export const exportService = new ExportService();
