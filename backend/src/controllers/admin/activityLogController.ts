import { Request, Response } from 'express';
import prisma from '../../config/database';

const parseBoundedInt = (value: unknown, fallback: number, min: number, max: number): number => {
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
};

const parseDetailsJson = (raw: string | null): unknown => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Helper function to log admin activity
export async function logActivity(
  adminEmail: string,
  action: string,
  entityType: string,
  entityId?: string,
  entityName?: string,
  details?: object,
  req?: Request
) {
  try {
    await prisma.activityLog.create({
      data: {
        adminEmail,
        action,
        entityType,
        entityId,
        entityName,
        details: details ? JSON.stringify(details) : null,
        ipAddress: req?.ip || req?.socket?.remoteAddress || null,
        userAgent: req?.get('user-agent') || null,
      },
    });
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to log activity:', error);
  }
}

// Get activity logs with filtering and pagination
export async function getActivityLogs(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '50',
      action,
      entityType,
      adminEmail,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseBoundedInt(page, 1, 1, 100000);
    const limitNum = parseBoundedInt(limit, 50, 1, 200);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where: any = {};

    if (action) {
      where.action = action as string;
    }

    if (entityType) {
      where.entityType = entityType as string;
    }

    if (adminEmail) {
      where.adminEmail = {
        contains: adminEmail as string,
        mode: 'insensitive',
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // Get logs with pagination
    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.activityLog.count({ where }),
    ]);

    // Parse details JSON for each log
    const logsWithParsedDetails = logs.map(log => ({
      ...log,
      details: parseDetailsJson(log.details),
    }));

    res.json({
      success: true,
      data: {
        logs: logsWithParsedDetails,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
    });
  }
}

// Get activity log statistics
export async function getActivityStats(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    // Get action counts
    const actionCounts = await prisma.activityLog.groupBy({
      by: ['action'],
      where,
      _count: {
        id: true,
      },
    });

    // Get entity type counts
    const entityTypeCounts = await prisma.activityLog.groupBy({
      by: ['entityType'],
      where,
      _count: {
        id: true,
      },
    });

    // Get admin activity counts
    const adminCounts = await prisma.activityLog.groupBy({
      by: ['adminEmail'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Get recent activity trend (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyActivity = await prisma.$queryRaw<
      Array<{ date: string; count: number }>
    >`
      SELECT 
        date("createdAt") as date,
        COUNT(*) as count
      FROM activity_logs
      WHERE "createdAt" >= ${sevenDaysAgo}
      GROUP BY date("createdAt")
      ORDER BY date("createdAt") ASC
    `;

    res.json({
      success: true,
      data: {
        actionCounts: actionCounts.map(a => ({
          action: a.action,
          count: a._count.id,
        })),
        entityTypeCounts: entityTypeCounts.map(e => ({
          entityType: e.entityType,
          count: e._count.id,
        })),
        adminActivity: adminCounts.map(a => ({
          adminEmail: a.adminEmail,
          count: a._count.id,
        })),
        dailyTrend: dailyActivity,
      },
    });
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity statistics',
    });
  }
}

// Get unique filter values
export async function getActivityFilters(req: Request, res: Response) {
  try {
    // Get unique actions
    const actions = await prisma.activityLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    });

    // Get unique entity types
    const entityTypes = await prisma.activityLog.findMany({
      distinct: ['entityType'],
      select: { entityType: true },
      orderBy: { entityType: 'asc' },
    });

    // Get unique admin emails
    const admins = await prisma.activityLog.findMany({
      distinct: ['adminEmail'],
      select: { adminEmail: true },
      orderBy: { adminEmail: 'asc' },
    });

    res.json({
      success: true,
      data: {
        actions: actions.map(a => a.action),
        entityTypes: entityTypes.map(e => e.entityType),
        admins: admins.map(a => a.adminEmail),
      },
    });
  } catch (error) {
    console.error('Error fetching activity filters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch filter options',
    });
  }
}

// Export logs as CSV (for download)
export async function exportActivityLogs(req: Request, res: Response) {
  try {
    const { startDate, endDate, action, entityType, adminEmail } = req.query;

    const where: any = {};

    if (action) where.action = action as string;
    if (entityType) where.entityType = entityType as string;
    if (adminEmail) {
      where.adminEmail = {
        contains: adminEmail as string,
        mode: 'insensitive',
      };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to prevent excessive exports
    });

    // Generate CSV
    const csvHeader =
      'Timestamp,Admin,Action,Entity Type,Entity ID,Entity Name,Details\n';
    const csvRows = logs
      .map(log => {
        const details = parseDetailsJson(log.details) || {};
        return [
          log.createdAt.toISOString(),
          log.adminEmail,
          log.action,
          log.entityType,
          log.entityId || '',
          log.entityName || '',
          JSON.stringify(details).replace(/"/g, '""'), // Escape quotes
        ]
          .map(field => `"${field}"`)
          .join(',');
      })
      .join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="activity-logs-${new Date().toISOString()}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Error exporting activity logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export activity logs',
    });
  }
}
