import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { createRequestLogger } from '../utils/logger';
import { z } from 'zod';
import { ValidationError } from '../shared/errors/AppError';
import { formatZodErrors } from '../utils/zodHelpers';

// Validation schemas
const createTicketSchema = z.object({
  subject: z.string().min(5).max(200),
  message: z.string().min(10).max(2000),
  category: z.enum(['TECHNICAL', 'ACCOUNT', 'BILLING', 'GENERAL', 'CRISIS', 'FEEDBACK']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional()
});

/**
 * Create a new support ticket
 * POST /api/support/tickets
 */
export const createSupportTicket = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({ 
    controller: 'support', 
    action: 'createTicket',
    userId: req.user.id 
  });

  try {
    const validation = createTicketSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(formatZodErrors(validation.error), 'Invalid ticket data');
    }

    const { subject, message, category, priority } = validation.data;
    const userId = req.user.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true }
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Auto-escalate CRISIS tickets
    const finalPriority = category === 'CRISIS' ? 'URGENT' : (priority || 'MEDIUM');

    const ticket = await prisma.supportTicket.create({
      data: {
        userId,
        subject,
        message,
        category: category || 'GENERAL',
        priority: finalPriority,
        status: 'OPEN',
        userEmail: user.email,
        userName: user.name,
        userAgent: req.headers['user-agent'] || null,
        ipAddress: req.ip || null
      }
    });

    log.info({ ticketId: ticket.id, category: ticket.category, priority: ticket.priority }, 'Support ticket created');

    res.status(201).json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          category: ticket.category,
          priority: ticket.priority,
          status: ticket.status,
          createdAt: ticket.createdAt
        }
      },
      message: 'Support ticket created successfully. We\'ll respond within 24 hours.'
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to create support ticket');
    if (error instanceof ValidationError) {
      throw error;
    }
    res.status(500).json({ success: false, error: 'Failed to create support ticket' });
  }
};

/**
 * Get user's support tickets
 * GET /api/support/tickets
 */
export const getUserTickets = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({ 
    controller: 'support', 
    action: 'getUserTickets',
    userId: req.user.id 
  });

  try {
    const userId = req.user.id;
    const status = req.query.status as string | undefined;

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId,
        ...(status && { status: status as any })
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        message: true,
        category: true,
        priority: true,
        status: true,
        response: true,
        respondedBy: true,
        respondedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    log.info({ count: tickets.length }, 'Fetched user support tickets');

    res.json({
      success: true,
      data: { tickets }
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch user tickets');
    res.status(500).json({ success: false, error: 'Failed to fetch support tickets' });
  }
};

/**
 * Get a specific support ticket
 * GET /api/support/tickets/:id
 */
export const getTicketById = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({ 
    controller: 'support', 
    action: 'getTicket',
    userId: req.user.id 
  });

  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id,
        userId // Ensure user can only access their own tickets
      }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found' });
    }

    log.info({ ticketId: id }, 'Fetched support ticket details');

    res.json({
      success: true,
      data: { ticket }
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to fetch ticket');
    res.status(500).json({ success: false, error: 'Failed to fetch support ticket' });
  }
};

/**
 * Mark ticket as resolved (user acknowledgment)
 * PUT /api/support/tickets/:id/acknowledge
 */
export const acknowledgeTicket = async (req: any, res: Response) => {
  const requestId = (req as any).id ?? res.locals.requestId;
  const log = createRequestLogger(requestId).child({ 
    controller: 'support', 
    action: 'acknowledgeTicket',
    userId: req.user.id 
  });

  try {
    const { id } = req.params;
    const userId = req.user.id;

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId }
    });

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found' });
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt: new Date()
      }
    });

    log.info({ ticketId: id }, 'Ticket acknowledged and closed');

    res.json({
      success: true,
      data: { ticket: updatedTicket },
      message: 'Ticket closed successfully'
    });
  } catch (error) {
    log.error({ err: error }, 'Failed to acknowledge ticket');
    res.status(500).json({ success: false, error: 'Failed to close ticket' });
  }
};
