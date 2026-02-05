import {
  Search,
  Eye,
  MessageSquare,
  Inbox,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  MoreVertical,
  RefreshCw,
  Send,
  XCircle,
  User
} from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import { useNotificationStore } from '../stores/notificationStore';

import { AdminSectionCard } from './AdminSectionCard';
import { AdminStatCard } from './AdminStatCard';

// Types
export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  response: string | null;
  respondedBy: string | null;
  respondedAt: string | null;
  userEmail: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Admin API for Support Tickets
const supportTicketAdminApi = {
  getAll: async (params?: { status?: string; priority?: string }): Promise<{ data: SupportTicket[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.priority) queryParams.append('priority', params.priority);
    
    const response = await fetch(`${API_BASE}/api/admin/help-safety/support/tickets?${queryParams}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch support tickets');
    const json = await response.json();
    return { data: json.data.tickets, total: json.data.total };
  },

  respond: async (id: string, response: string): Promise<SupportTicket> => {
    const res = await fetch(`${API_BASE}/api/admin/help-safety/support/tickets/${id}/respond`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response })
    });
    if (!res.ok) throw new Error('Failed to respond to ticket');
    const json = await res.json();
    return json.data.ticket;
  },

  close: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/api/admin/help-safety/support/tickets/${id}/close`, {
      method: 'PUT',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to close ticket');
  }
};

interface SupportTicketManagementProps {
  onRefresh?: () => void;
}

export function SupportTicketManagement({ onRefresh }: SupportTicketManagementProps) {
  const { push } = useNotificationStore();
  
  // State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  
  // Dialog states
  const [viewingTicket, setViewingTicket] = useState<SupportTicket | null>(null);
  const [respondingTicket, setRespondingTicket] = useState<SupportTicket | null>(null);
  const [closeConfirm, setCloseConfirm] = useState<SupportTicket | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseText, setResponseText] = useState('');

  // Fetch tickets
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: string; priority?: string } = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterPriority !== 'all') params.priority = filterPriority;
      
      const result = await supportTicketAdminApi.getAll(params);
      setTickets(result.data);
      setTotal(result.total);
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load support tickets'
      });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, push]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Stats
  const openTickets = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressTickets = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const urgentTickets = tickets.filter(t => t.priority === 'URGENT' && t.status !== 'CLOSED').length;
  const resolvedToday = tickets.filter(t => {
    if (t.status !== 'RESOLVED' || !t.respondedAt) return false;
    const today = new Date().toDateString();
    return new Date(t.respondedAt).toDateString() === today;
  }).length;

  // Handlers
  const handleView = (ticket: SupportTicket) => {
    setViewingTicket(ticket);
  };

  const handleRespond = (ticket: SupportTicket) => {
    setRespondingTicket(ticket);
    setResponseText('');
  };

  const handleSubmitResponse = async () => {
    if (!respondingTicket || responseText.trim().length < 10) {
      push({ type: 'error', title: 'Validation Error', description: 'Response must be at least 10 characters' });
      return;
    }

    setIsSubmitting(true);
    try {
      await supportTicketAdminApi.respond(respondingTicket.id, responseText);
      push({
        type: 'success',
        title: 'Response Sent',
        description: 'Your response has been sent to the user'
      });
      setRespondingTicket(null);
      setResponseText('');
      fetchTickets();
      onRefresh?.();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send response'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!closeConfirm) return;
    
    setIsSubmitting(true);
    try {
      await supportTicketAdminApi.close(closeConfirm.id);
      push({
        type: 'success',
        title: 'Ticket Closed',
        description: 'The support ticket has been closed'
      });
      setCloseConfirm(null);
      fetchTickets();
      onRefresh?.();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to close ticket'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
      RESOLVED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-500 text-white'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      TECHNICAL: 'bg-purple-100 text-purple-800',
      ACCOUNT: 'bg-blue-100 text-blue-800',
      BILLING: 'bg-green-100 text-green-800',
      GENERAL: 'bg-gray-100 text-gray-800',
      CRISIS: 'bg-red-100 text-red-800',
      FEEDBACK: 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AdminStatCard
          label="Open Tickets"
          value={openTickets}
          icon={Inbox}
          tone="info"
        />
        <AdminStatCard
          label="In Progress"
          value={inProgressTickets}
          icon={Clock}
          tone="warning"
        />
        <AdminStatCard
          label="Urgent"
          value={urgentTickets}
          icon={AlertCircle}
          tone="warning"
        />
        <AdminStatCard
          label="Resolved Today"
          value={resolvedToday}
          icon={CheckCircle}
          tone="positive"
        />
      </div>

      {/* Main Content */}
      <AdminSectionCard
        title="Support Ticket Management"
        icon={MessageSquare}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTickets()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        }
      >
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {TICKET_STATUSES.map(status => (
                <SelectItem key={status} value={status}>{status.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              {TICKET_PRIORITIES.map(priority => (
                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tickets Found</h3>
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== 'all' || filterPriority !== 'all'
                ? 'Try adjusting your filters'
                : 'No support tickets have been submitted yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map(ticket => (
              <Card key={ticket.id} className={`hover:shadow-md transition-shadow ${ticket.priority === 'URGENT' ? 'border-red-300' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                        <Badge className={getCategoryColor(ticket.category)}>
                          {ticket.category}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-lg mb-1 truncate">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {ticket.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ticket.userName} ({ticket.userEmail})
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(ticket.createdAt)}
                        </span>
                        {ticket.response && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3 w-3" />
                            Responded
                          </span>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(ticket)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {ticket.status !== 'CLOSED' && (
                          <>
                            <DropdownMenuItem onClick={() => handleRespond(ticket)}>
                              <Send className="h-4 w-4 mr-2" />
                              Respond
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setCloseConfirm(ticket)}
                              className="text-destructive"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Close Ticket
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {total > 0 && (
          <div className="text-center text-sm text-muted-foreground mt-4">
            Showing {filteredTickets.length} of {total} tickets
          </div>
        )}
      </AdminSectionCard>

      {/* View Dialog */}
      <Dialog open={!!viewingTicket} onOpenChange={() => setViewingTicket(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Details</DialogTitle>
          </DialogHeader>
          {viewingTicket && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={getStatusColor(viewingTicket.status)}>
                  {viewingTicket.status.replace('_', ' ')}
                </Badge>
                <Badge className={getPriorityColor(viewingTicket.priority)}>
                  {viewingTicket.priority}
                </Badge>
                <Badge className={getCategoryColor(viewingTicket.category)}>
                  {viewingTicket.category}
                </Badge>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Subject</Label>
                <p className="mt-1 font-medium text-lg">{viewingTicket.subject}</p>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="mt-1 whitespace-pre-wrap bg-muted p-3 rounded-lg">
                  {viewingTicket.message}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">From</Label>
                  <p className="mt-1">{viewingTicket.userName}</p>
                  <p className="text-sm text-muted-foreground">{viewingTicket.userEmail}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="mt-1">{formatDate(viewingTicket.createdAt)}</p>
                </div>
              </div>
              
              {viewingTicket.response && (
                <div className="pt-4 border-t">
                  <Label className="text-muted-foreground">Admin Response</Label>
                  <p className="mt-1 whitespace-pre-wrap bg-green-50 p-3 rounded-lg border border-green-200">
                    {viewingTicket.response}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Responded by {viewingTicket.respondedBy} on {viewingTicket.respondedAt ? formatDate(viewingTicket.respondedAt) : 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTicket(null)}>
              Close
            </Button>
            {viewingTicket && viewingTicket.status !== 'CLOSED' && (
              <Button onClick={() => {
                handleRespond(viewingTicket);
                setViewingTicket(null);
              }}>
                <Send className="h-4 w-4 mr-2" />
                Respond
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Respond Dialog */}
      <Dialog open={!!respondingTicket} onOpenChange={() => setRespondingTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Respond to Ticket</DialogTitle>
            <DialogDescription>
              Your response will be sent to the user and the ticket will be marked as resolved.
            </DialogDescription>
          </DialogHeader>
          {respondingTicket && (
            <div className="space-y-4 py-4">
              <div className="bg-muted p-3 rounded-lg">
                <p className="font-medium">{respondingTicket.subject}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  From: {respondingTicket.userName} ({respondingTicket.userEmail})
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm">{respondingTicket.message}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="response">Your Response *</Label>
                <Textarea
                  id="response"
                  placeholder="Type your response here..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={6}
                />
                <p className="text-xs text-muted-foreground">
                  {responseText.length} characters (minimum 10)
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondingTicket(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResponse} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Confirmation Dialog */}
      <Dialog open={!!closeConfirm} onOpenChange={() => setCloseConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this ticket? The user will no longer be able to receive responses.
            </DialogDescription>
          </DialogHeader>
          {closeConfirm && (
            <div className="py-4">
              <p className="font-medium">{closeConfirm.subject}</p>
              <p className="text-sm text-muted-foreground">
                From: {closeConfirm.userName}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Close Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
