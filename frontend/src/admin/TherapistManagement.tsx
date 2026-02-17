import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Shield,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Star,
  Clock,
  DollarSign,
  Loader2,
  MoreVertical,
  RefreshCw,
  Users
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { useNotificationStore } from '../stores/notificationStore';

import { AdminStatCard } from './AdminStatCard';
import { AdminSectionCard } from './AdminSectionCard';
import { TherapistForm, TherapistFormData } from './TherapistForm';

// Types
export interface Therapist {
  id: string;
  name: string;
  credential: string;
  title: string;
  bio: string;
  specialties: string[];
  email: string | null;
  phone: string | null;
  website: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string;
  acceptsInsurance: boolean;
  insurancesList: string[];
  sessionFee: number | null;
  offersSliding: boolean;
  availability: { day: string; startTime: string; endTime: string }[];
  profileImageUrl: string | null;
  yearsExperience: number | null;
  languages: string | null;
  rating: number | null;
  reviewCount: number;
  isActive: boolean;
  isVerified: boolean;
  portalLinked?: boolean;
  portalEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TherapistStats {
  total: number;
  active: number;
  verified: number;
  inactive: number;
  unverified: number;
  byCredential: { credential: string; count: number }[];
  bySpecialty: { specialty: string; count: number }[];
}

const CREDENTIALS = [
  { value: 'PSYCHOLOGIST', label: 'Psychologist' },
  { value: 'PSYCHIATRIST', label: 'Psychiatrist' },
  { value: 'LCSW', label: 'LCSW' },
  { value: 'LMFT', label: 'LMFT' },
  { value: 'LPC', label: 'LPC' },
  { value: 'LMHC', label: 'LMHC' }
];

const SPECIALTIES = [
  'ANXIETY', 'DEPRESSION', 'TRAUMA', 'PTSD', 'RELATIONSHIPS',
  'FAMILY_THERAPY', 'ADDICTION', 'EATING_DISORDERS', 'OCD',
  'BIPOLAR', 'GRIEF', 'STRESS_MANAGEMENT', 'CBT', 'DBT',
  'EMDR', 'MINDFULNESS', 'PSYCHODYNAMIC', 'COUPLES_THERAPY'
];

const API_BASE = '/api/admin';

// API Functions
const therapistAdminApi = {
  getAll: async (params?: {
    search?: string;
    specialty?: string;
    credential?: string;
    isActive?: boolean;
    isVerified?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ data: Therapist[]; pagination: { total: number } }> => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.specialty) searchParams.set('specialty', params.specialty);
    if (params?.credential) searchParams.set('credential', params.credential);
    if (params?.isActive !== undefined) searchParams.set('isActive', String(params.isActive));
    if (params?.isVerified !== undefined) searchParams.set('isVerified', String(params.isVerified));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const response = await fetch(`${API_BASE}/therapists?${searchParams}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch therapists');
    const json = await response.json();
    return json;
  },

  getById: async (id: string): Promise<Therapist> => {
    const response = await fetch(`${API_BASE}/therapists/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch therapist');
    const json = await response.json();
    return json.data;
  },

  create: async (data: TherapistFormData): Promise<Therapist> => {
    const response = await fetch(`${API_BASE}/therapists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details?.join(', ') || error.error || 'Failed to create therapist');
    }
    const json = await response.json();
    return json.data;
  },

  update: async (id: string, data: TherapistFormData): Promise<Therapist> => {
    const response = await fetch(`${API_BASE}/therapists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details?.join(', ') || error.error || 'Failed to update therapist');
    }
    const json = await response.json();
    return json.data;
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`${API_BASE}/therapists/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete therapist');
    }
  },

  updateStatus: async (id: string, status: { isActive?: boolean; isVerified?: boolean }): Promise<Therapist> => {
    const response = await fetch(`${API_BASE}/therapists/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(status)
    });
    if (!response.ok) throw new Error('Failed to update status');
    const json = await response.json();
    return json.data;
  },

  getStats: async (): Promise<TherapistStats> => {
    const response = await fetch(`${API_BASE}/therapists-stats`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    const json = await response.json();
    return json.data;
  }
};

interface TherapistManagementProps {
  onRefresh?: () => void;
}

export function TherapistManagement({ onRefresh }: TherapistManagementProps) {
  const { push } = useNotificationStore();
  
  // State
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [stats, setStats] = useState<TherapistStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCredential, setFilterCredential] = useState<string>('all');
  const [filterSpecialty, setFilterSpecialty] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState<Therapist | null>(null);
  const [viewingTherapist, setViewingTherapist] = useState<Therapist | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Therapist | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch therapists
  const fetchTherapists = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { limit: 100 };
      if (searchQuery) params.search = searchQuery;
      if (filterCredential !== 'all') params.credential = filterCredential;
      if (filterSpecialty !== 'all') params.specialty = filterSpecialty;
      if (filterStatus === 'active') params.isActive = true;
      if (filterStatus === 'inactive') params.isActive = false;
      if (filterStatus === 'verified') params.isVerified = true;
      if (filterStatus === 'unverified') params.isVerified = false;

      const result = await therapistAdminApi.getAll(params);
      setTherapists(result.data);
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load therapists'
      });
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterCredential, filterSpecialty, filterStatus, push]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const data = await therapistAdminApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTherapists();
    fetchStats();
  }, [fetchTherapists, fetchStats]);

  // Handlers
  const handleCreate = () => {
    setEditingTherapist(null);
    setIsFormOpen(true);
  };

  const handleEdit = (therapist: Therapist) => {
    setEditingTherapist(therapist);
    setIsFormOpen(true);
  };

  const handleView = (therapist: Therapist) => {
    setViewingTherapist(therapist);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    setIsSubmitting(true);
    try {
      await therapistAdminApi.delete(deleteConfirm.id);
      push({
        type: 'success',
        title: 'Deleted',
        description: `${deleteConfirm.name} has been removed`
      });
      setDeleteConfirm(null);
      fetchTherapists();
      fetchStats();
      onRefresh?.();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete therapist'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (therapist: Therapist) => {
    try {
      await therapistAdminApi.updateStatus(therapist.id, { isActive: !therapist.isActive });
      push({
        type: 'success',
        title: therapist.isActive ? 'Deactivated' : 'Activated',
        description: `${therapist.name} is now ${therapist.isActive ? 'inactive' : 'active'}`
      });
      fetchTherapists();
      fetchStats();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to update status'
      });
    }
  };

  const handleToggleVerified = async (therapist: Therapist) => {
    try {
      await therapistAdminApi.updateStatus(therapist.id, { isVerified: !therapist.isVerified });
      push({
        type: 'success',
        title: therapist.isVerified ? 'Unverified' : 'Verified',
        description: `${therapist.name} verification ${therapist.isVerified ? 'removed' : 'confirmed'}`
      });
      fetchTherapists();
      fetchStats();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to update verification'
      });
    }
  };

  const handleFormSubmit = async (data: TherapistFormData) => {
    setIsSubmitting(true);
    try {
      if (editingTherapist) {
        await therapistAdminApi.update(editingTherapist.id, data);
        push({
          type: 'success',
          title: 'Updated',
          description: `${data.name} has been updated`
        });
      } else {
        await therapistAdminApi.create(data);
        push({
          type: 'success',
          title: 'Created',
          description: `${data.name} has been added`
        });
      }
      setIsFormOpen(false);
      setEditingTherapist(null);
      fetchTherapists();
      fetchStats();
      onRefresh?.();
    } catch (error) {
      push({
        type: 'error',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatSpecialty = (s: string) => s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return (
    <>
      <AdminSectionCard
        icon={Shield}
        title="Therapist Directory"
        description="Manage therapist profiles, verify credentials, and keep availability information up to date."
        actions={(
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchTherapists();
                fetchStats();
              }}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Add Therapist
            </Button>
          </>
        )}
        contentClassName="space-y-6"
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statsLoading ? (
            <>
              {[1, 2, 3, 4].map(i => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="mb-2 h-4 w-20" />
                    <Skeleton className="h-8 w-12" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : stats ? (
            <>
              <AdminStatCard
                label="Total Therapists"
                value={stats.total}
                icon={Users}
                helperText="All profiles in the directory"
              />
              <AdminStatCard
                label="Active"
                value={stats.active}
                icon={CheckCircle}
                tone="positive"
                helperText="Currently visible to members"
              />
              <AdminStatCard
                label="Verified"
                value={stats.verified}
                icon={ShieldCheck}
                tone="info"
                helperText="Credentials confirmed"
              />
              <AdminStatCard
                label="Pending Review"
                value={stats.unverified}
                icon={Clock}
                tone="warning"
                helperText="Awaiting verification"
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search therapists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] pl-9"
              />
            </div>

            <Select value={filterCredential} onValueChange={setFilterCredential}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Credential" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Credentials</SelectItem>
                {CREDENTIALS.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {SPECIALTIES.map(s => (
                  <SelectItem key={s} value={s}>{formatSpecialty(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-4 p-8">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : therapists.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <p>No therapists found</p>
                <Button variant="link" onClick={handleCreate}>Add your first therapist</Button>
              </div>
            ) : (
              <div className="divide-y">
                {therapists.map((therapist) => (
                  <div key={therapist.id} className="p-4 transition-colors hover:bg-muted/50">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
                      <div className="flex items-start gap-3 sm:flex-1">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                          {therapist.profileImageUrl ? (
                            <img
                              src={therapist.profileImageUrl}
                              alt={therapist.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-semibold text-primary">
                              {therapist.name.charAt(0)}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm sm:text-base">
                            <h3 className="text-base font-semibold text-foreground">{therapist.name}</h3>
                            <Badge variant="secondary">{therapist.credential}</Badge>
                            {therapist.isVerified && (
                              <Badge variant="default" className="bg-blue-500">
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                            {!therapist.isActive && (
                              <Badge variant="destructive">Inactive</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{therapist.title}</p>

                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                            {therapist.city && therapist.state && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {therapist.city}, {therapist.state}
                              </span>
                            )}
                            {therapist.yearsExperience && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {therapist.yearsExperience} yrs exp
                              </span>
                            )}
                            {therapist.sessionFee && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                ${therapist.sessionFee}/session
                              </span>
                            )}
                            {therapist.rating !== null && therapist.rating > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                {therapist.rating.toFixed(1)} ({therapist.reviewCount})
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-1">
                            {therapist.specialties.slice(0, 4).map(s => (
                              <Badge key={s} variant="outline" className="text-xs">
                                {formatSpecialty(s)}
                              </Badge>
                            ))}
                            {therapist.specialties.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{therapist.specialties.length - 4} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end sm:ml-auto">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Manage actions for ${therapist.name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(therapist)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(therapist)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleToggleActive(therapist)}>
                              {therapist.isActive ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleVerified(therapist)}>
                              {therapist.isVerified ? (
                                <>
                                  <Shield className="mr-2 h-4 w-4" />
                                  Remove Verification
                                </>
                              ) : (
                                <>
                                  <ShieldCheck className="mr-2 h-4 w-4" />
                                  Verify Therapist
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(therapist)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </AdminSectionCard>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="flex h-auto max-h-[85vh] w-[95vw] max-w-4xl flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="flex-shrink-0 border-b bg-muted/20 px-6 pt-4 pb-3">
            <DialogTitle className="text-lg font-semibold">
              {editingTherapist ? 'Edit Therapist' : 'Add New Therapist'}
            </DialogTitle>
            <DialogDescription>
              {editingTherapist
                ? 'Update the therapist information below'
                : 'Fill in the details to add a new therapist to the directory'}
            </DialogDescription>
          </DialogHeader>
          <TherapistForm
            initialData={editingTherapist || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingTherapist} onOpenChange={() => setViewingTherapist(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Therapist Details</DialogTitle>
          </DialogHeader>
          {viewingTherapist && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  {viewingTherapist.profileImageUrl ? (
                    <img
                      src={viewingTherapist.profileImageUrl}
                      alt={viewingTherapist.name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-semibold text-primary">
                      {viewingTherapist.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{viewingTherapist.name}</h2>
                  <p className="text-muted-foreground">{viewingTherapist.title}</p>
                  <div className="mt-1 flex gap-2">
                    <Badge>{viewingTherapist.credential}</Badge>
                    {viewingTherapist.isVerified && (
                      <Badge className="bg-blue-500">Verified</Badge>
                    )}
                    <Badge variant={viewingTherapist.isActive ? 'default' : 'destructive'}>
                      {viewingTherapist.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-1 font-medium">Bio</h4>
                <p className="text-sm text-muted-foreground">{viewingTherapist.bio}</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="mb-1 font-medium">Contact</h4>
                  <div className="space-y-1 text-sm">
                    {viewingTherapist.email && (
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4" /> {viewingTherapist.email}
                      </p>
                    )}
                    {viewingTherapist.phone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4" /> {viewingTherapist.phone}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="mb-1 font-medium">Location</h4>
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {[viewingTherapist.city, viewingTherapist.state, viewingTherapist.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium">Specialties</h4>
                <div className="flex flex-wrap gap-1">
                  {viewingTherapist.specialties.map(s => (
                    <Badge key={s} variant="outline">{formatSpecialty(s)}</Badge>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Session Fee:</span>
                  <p className="font-medium">
                    {viewingTherapist.sessionFee ? `$${viewingTherapist.sessionFee}` : 'Not specified'}
                    {viewingTherapist.offersSliding && ' (Sliding scale available)'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Experience:</span>
                  <p className="font-medium">
                    {viewingTherapist.yearsExperience ? `${viewingTherapist.yearsExperience} years` : 'Not specified'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Languages:</span>
                  <p className="font-medium">{viewingTherapist.languages || 'English'}</p>
                </div>
              </div>

              {viewingTherapist.acceptsInsurance && viewingTherapist.insurancesList.length > 0 && (
                <div>
                  <h4 className="mb-1 font-medium">Accepted Insurance</h4>
                  <p className="text-sm text-muted-foreground">
                    {viewingTherapist.insurancesList.join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingTherapist(null)}>
              Close
            </Button>
            <Button onClick={() => {
              if (viewingTherapist) {
                handleEdit(viewingTherapist);
                setViewingTherapist(null);
              }
            }}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Therapist</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
