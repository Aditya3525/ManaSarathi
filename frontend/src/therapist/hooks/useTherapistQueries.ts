import { useQuery } from '@tanstack/react-query';

import { therapistFetch } from '../useTherapistAuth';

export interface TherapistStats {
  pending: number;
  confirmed: number;
  completed: number;
  total: number;
  uniqueClients: number;
}

export interface TherapistBooking {
  id: string;
  userId: string;
  preferredDate?: string | null;
  preferredTime?: string | null;
  message?: string | null;
  userEmail: string;
  userPhone?: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  therapistNotes?: string | null;
  adminNotes?: string | null;
  createdAt: string;
  user?: { id: string; name: string; email: string; profilePhoto?: string | null };
}

export interface TherapistProfile {
  id: string;
  name: string;
  credential: string;
  title: string;
  bio: string;
  specialtiesJson: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  sessionFee?: number | null;
  offersSliding: boolean;
  acceptsInsurance: boolean;
  insurances?: string | null;
  availabilityJson: string;
  yearsExperience?: number | null;
  languages?: string | null;
  rating?: number | null;
  reviewCount: number;
  isActive: boolean;
  isVerified: boolean;
  profileImageUrl?: string | null;
}

export interface TherapistClient {
  id: string;
  name: string;
  email: string;
  profilePhoto?: string | null;
  approach?: string | null;
  createdAt: string;
  bookingCount: number;
  completedSessions: number;
  lastBooking: string;
  lastStatus: string;
}

export interface TherapistClientSummary {
  client: {
    id: string;
    name: string;
    email: string;
    profilePhoto?: string | null;
    approach?: string | null;
    level?: string | null;
    createdAt: string;
  };
  stats: {
    totalBookings: number;
    completedSessions: number;
    noShowSessions: number;
    cancelledSessions: number;
    completionRate: number;
    lastSessionAt?: string | null;
    nextSessionAt?: string | null;
  };
  bookings: Array<{
    id: string;
    scheduledAt: string;
    status: string;
    sessionType: string;
    durationMinutes: number;
    notes?: string | null;
  }>;
  checkIns: Array<{
    id: string;
    moodScore?: number | null;
    stressScore?: number | null;
    sleepHours?: number | null;
    energyLevel?: string | null;
    notes?: string | null;
    createdAt: string;
  }>;
  goals: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    targetDate?: string | null;
    createdAt: string;
  }>;
  insights: Array<{
    id: string;
    type: string;
    severity?: string | null;
    title: string;
    message: string;
    recommendations?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
  }>;
}

export interface TherapistNoteRecord {
  id: string;
  format: string;
  subjective?: string | null;
  objective?: string | null;
  assessment?: string | null;
  plan?: string | null;
  narrative?: string | null;
  tags?: string | null;
  createdAt: string;
  updatedAt: string;
  booking?: {
    preferredDate?: string | null;
    preferredTime?: string | null;
    status?: string | null;
  } | null;
}

export interface TherapistCrisisAlert {
  id: string;
  crisisLevel: string;
  confidence: number;
  indicators: string;
  actionTaken: string;
  followUpResponse?: string | null;
  detectedAt: string;
  resolved: boolean;
  resolvedAt?: string | null;
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

async function fetchTherapistData<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await therapistFetch(path, init);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || 'Therapist request failed');
  }

  return (payload?.data ?? payload) as T;
}

export const therapistQueryKeys = {
  stats: ['therapist', 'stats'] as const,
  bookings: ['therapist', 'bookings'] as const,
  profile: ['therapist', 'profile'] as const,
  clients: ['therapist', 'clients'] as const,
  clientSummary: (clientId: string) => ['therapist', 'clients', clientId, 'summary'] as const,
  clientNotes: (clientId: string) => ['therapist', 'clients', clientId, 'notes'] as const,
  crisisAlerts: ['therapist', 'crisis-alerts'] as const,
};

export function useTherapistStatsQuery() {
  return useQuery({
    queryKey: therapistQueryKeys.stats,
    queryFn: () => fetchTherapistData<TherapistStats>('/stats'),
    staleTime: 30_000,
  });
}

export function useTherapistBookingsQuery() {
  return useQuery({
    queryKey: therapistQueryKeys.bookings,
    queryFn: () => fetchTherapistData<TherapistBooking[]>('/bookings'),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useTherapistProfileQuery() {
  return useQuery({
    queryKey: therapistQueryKeys.profile,
    queryFn: () => fetchTherapistData<TherapistProfile>('/profile'),
    staleTime: 30_000,
  });
}

export function useTherapistClientsQuery() {
  return useQuery({
    queryKey: therapistQueryKeys.clients,
    queryFn: () => fetchTherapistData<TherapistClient[]>('/clients'),
    staleTime: 30_000,
  });
}

export function useTherapistClientSummaryQuery(clientId?: string | null) {
  return useQuery({
    queryKey: clientId ? therapistQueryKeys.clientSummary(clientId) : ['therapist', 'clients', 'summary', 'idle'],
    queryFn: () => fetchTherapistData<TherapistClientSummary>(`/clients/${clientId}/summary`),
    enabled: Boolean(clientId),
    staleTime: 20_000,
  });
}

export function useTherapistClientNotesQuery(clientId?: string | null) {
  return useQuery({
    queryKey: clientId ? therapistQueryKeys.clientNotes(clientId) : ['therapist', 'clients', 'notes', 'idle'],
    queryFn: () => fetchTherapistData<TherapistNoteRecord[]>(`/clients/${clientId}/notes`),
    enabled: Boolean(clientId),
    staleTime: 10_000,
  });
}

export function useTherapistCrisisAlertsQuery() {
  return useQuery({
    queryKey: therapistQueryKeys.crisisAlerts,
    queryFn: () => fetchTherapistData<TherapistCrisisAlert[]>('/crisis-alerts'),
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}

export function useTherapistDashboardQueryBundle() {
  const statsQuery = useTherapistStatsQuery();
  const bookingsQuery = useTherapistBookingsQuery();
  const profileQuery = useTherapistProfileQuery();

  const isLoading = statsQuery.isLoading || bookingsQuery.isLoading || profileQuery.isLoading;

  const refetchAll = async () => {
    await Promise.all([statsQuery.refetch(), bookingsQuery.refetch(), profileQuery.refetch()]);
  };

  return {
    statsQuery,
    bookingsQuery,
    profileQuery,
    isLoading,
    refetchAll,
  };
}
