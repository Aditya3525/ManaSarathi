// Help & Safety API Service
import { getApiBaseUrl } from '../config/apiConfig';

const API_BASE_URL = getApiBaseUrl();

// Types
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'TECHNICAL' | 'ACCOUNT' | 'BILLING' | 'GENERAL' | 'CRISIS' | 'FEEDBACK';
export type FAQCategory = 'GENERAL' | 'TECHNICAL' | 'PRIVACY' | 'BILLING' | 'ASSESSMENTS' | 'CHATBOT' | 'SAFETY';
export type ResourceType = 'HOTLINE' | 'CHAT' | 'TEXT' | 'WEBSITE' | 'APP';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface CrisisResource {
  id: string;
  name: string;
  type: ResourceType;
  country: string;
  phone: string | null;
  sms: string | null;
  website: string | null;
  description: string;
  available24x7: boolean;
  languages: string[];
  availability?: string | null;
  tags?: string | null;
  isActive: boolean;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
  tags: string | null;
  helpful: number;
  notHelpful: number;
  viewCount: number;
}

export interface Therapist {
  id: string;
  name: string;
  credential: string;
  title: string;
  bio: string;
  specialties: string[];
  phone: string | null;
  email: string | null;
  website: string | null;
  city: string;
  state: string;
  country: string;
  acceptsInsurance: boolean;
  insuranceProviders: string | null;
  insurancesList?: string[];
  sessionFee: number | null;
  offersSliding: boolean;
  availability?: { day: string; startTime: string; endTime: string }[];
  profileImageUrl: string | null;
  yearsExperience: number | null;
  languages: string | null;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  isVerified: boolean;
}

export interface SupportTicket {
  id: string;
  subject: string;
  message?: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  response?: string | null;
  adminResponse?: string | null;
  respondedBy?: string | null;
  respondedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface SafetyPlan {
  id: string;
  warningSigns: string[];
  copingStrategies: string[];
  supportContacts: Array<{ name: string; phone: string; relationship: string }>;
  professionalContacts: Array<{ name: string; phone: string; role: string }>;
  environmentSafety: string[];
  reasonsToLive: string[];
  createdAt: string;
  updatedAt: string;
}

type BackendResourceType = 'HOTLINE' | 'TEXT_LINE' | 'CHAT_SERVICE' | 'EMERGENCY' | 'SUPPORT_GROUP' | 'WEBSITE';

const mapBackendResourceType = (type: string): ResourceType => {
  switch (type as BackendResourceType) {
    case 'TEXT_LINE':
      return 'TEXT';
    case 'CHAT_SERVICE':
      return 'CHAT';
    case 'WEBSITE':
      return 'WEBSITE';
    case 'SUPPORT_GROUP':
      return 'APP';
    case 'EMERGENCY':
    case 'HOTLINE':
    default:
      return 'HOTLINE';
  }
};

const parseLanguages = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return [];
};

const parseJsonArray = <T>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const mapSafetyPlanFromBackend = (raw: any): SafetyPlan => {
  const contacts = parseJsonArray<any>(raw?.contactsJson);

  const supportContacts = contacts
    .filter((contact) => !contact?.role || contact?.relationship)
    .map((contact) => ({
      name: String(contact?.name ?? '').trim(),
      phone: String(contact?.phone ?? '').trim(),
      relationship: String(contact?.relationship ?? '').trim()
    }))
    .filter((contact) => contact.name || contact.phone || contact.relationship);

  const professionalContactsFromJson = contacts
    .filter((contact) => !!contact?.role)
    .map((contact) => ({
      name: String(contact?.name ?? '').trim(),
      phone: String(contact?.phone ?? '').trim(),
      role: String(contact?.role ?? '').trim()
    }))
    .filter((contact) => contact.name || contact.phone || contact.role);

  const professionalContacts: Array<{ name: string; phone: string; role: string }> = [
    ...professionalContactsFromJson,
    ...(raw?.therapistName || raw?.therapistPhone
      ? [{ name: raw.therapistName ?? '', phone: raw.therapistPhone ?? '', role: 'Therapist' }]
      : []),
    ...(raw?.psychiatristName || raw?.psychiatristPhone
      ? [{ name: raw.psychiatristName ?? '', phone: raw.psychiatristPhone ?? '', role: 'Psychiatrist' }]
      : [])
  ];

  return {
    id: raw?.id ?? 'safety-plan',
    warningSigns: parseJsonArray<string>(raw?.warningSignsJson),
    copingStrategies: parseJsonArray<string>(raw?.copingStrategiesJson),
    supportContacts,
    professionalContacts,
    environmentSafety: parseJsonArray<string>(raw?.safeEnvironmentJson),
    reasonsToLive: parseJsonArray<string>(raw?.reasonsToLiveJson),
    createdAt: raw?.createdAt ?? new Date().toISOString(),
    updatedAt: raw?.updatedAt ?? new Date().toISOString()
  };
};

const mapSafetyPlanToBackend = (planData: {
  warningSigns: string[];
  copingStrategies: string[];
  supportContacts: Array<{ name: string; phone: string; relationship: string }>;
  professionalContacts: Array<{ name: string; phone: string; role: string }>;
  environmentSafety: string[];
  reasonsToLive: string[];
}) => {
  const therapistContact = planData.professionalContacts.find((contact) =>
    /therapist/i.test(contact.role)
  );
  const psychiatristContact = planData.professionalContacts.find((contact) =>
    /psychiatrist/i.test(contact.role)
  );

  const normalizedContacts = [
    ...planData.supportContacts.map((contact) => ({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship
    })),
    ...planData.professionalContacts.map((contact) => ({
      name: contact.name,
      phone: contact.phone,
      role: contact.role
    }))
  ];

  return {
    warningSignsJson: JSON.stringify(planData.warningSigns ?? []),
    copingStrategiesJson: JSON.stringify(planData.copingStrategies ?? []),
    contactsJson: JSON.stringify(normalizedContacts),
    therapistName: therapistContact?.name || undefined,
    therapistPhone: therapistContact?.phone || undefined,
    psychiatristName: psychiatristContact?.name || undefined,
    psychiatristPhone: psychiatristContact?.phone || undefined,
    safeEnvironmentJson: JSON.stringify(planData.environmentSafety ?? []),
    reasonsToLiveJson: JSON.stringify(planData.reasonsToLive ?? [])
  };
};

export interface TherapistBookingTherapist {
  name: string;
  credential: string;
  title: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
}

export interface TherapistBooking {
  id: string;
  therapistId: string;
  preferredDate: string | null;
  preferredTime: string | null;
  message: string | null;
  status: BookingStatus;
  therapistNotes?: string | null;
  processedBy?: string | null;
  processedAt?: string | null;
  therapist?: TherapistBookingTherapist;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// Crisis Resources API
export const crisisResourcesApi = {
  getAll: async (country?: string): Promise<CrisisResource[]> => {
    const url = country
      ? `${API_BASE_URL}/crisis/resources?country=${country}`
      : `${API_BASE_URL}/crisis/resources`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch crisis resources');
    const data = await response.json();
    const resources = Array.isArray(data?.data?.resources) ? data.data.resources : [];

    return resources.map((resource: any) => ({
      id: resource.id,
      name: resource.name,
      type: mapBackendResourceType(resource.type),
      country: resource.country ?? country ?? 'US',
      phone: resource.phone ?? resource.phoneNumber ?? null,
      sms: resource.sms ?? resource.textNumber ?? null,
      website: resource.website ?? null,
      description: resource.description ?? '',
      available24x7:
        typeof resource.availability === 'string'
          ? /24\s*\/\s*7/i.test(resource.availability)
          : Boolean(resource.available24x7),
      languages: parseLanguages(resource.languages ?? resource.language),
      availability: resource.availability ?? null,
      tags: resource.tags ?? null,
      isActive: resource.isActive ?? true
    }));
  }
};

// FAQ API
export const faqApi = {
  getAll: async (category?: FAQCategory): Promise<FAQ[]> => {
    const url = category
      ? `${API_BASE_URL}/faq?category=${category}`
      : `${API_BASE_URL}/faq`;

    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch FAQs');
    const data = await response.json();
    return data.data.faqs;
  },

  search: async (query: string): Promise<FAQ[]> => {
    const response = await fetch(`${API_BASE_URL}/faq/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search FAQs');
    const data = await response.json();
    return data.data.faqs;
  },

  recordView: async (id: string): Promise<void> => {
    await fetch(`${API_BASE_URL}/faq/${id}/view`, { method: 'POST' });
  },

  vote: async (id: string, helpful: boolean): Promise<void> => {
    await fetch(`${API_BASE_URL}/faq/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ helpful })
    });
  }
};

// Therapist API
export const therapistApi = {
  getAll: async (filters?: {
    specialty?: string;
    location?: string;
    acceptsInsurance?: boolean;
  }): Promise<Therapist[]> => {
    const params = new URLSearchParams();
    if (filters?.specialty) params.append('specialty', filters.specialty);
    if (filters?.location) params.append('city', filters.location);
    if (filters?.acceptsInsurance !== undefined) {
      params.append('acceptsInsurance', filters.acceptsInsurance.toString());
    }

    const url = `${API_BASE_URL}/therapists${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch therapists');
    const data = await response.json();
    return data.data.therapists;
  },

  getById: async (id: string): Promise<Therapist> => {
    const response = await fetch(`${API_BASE_URL}/therapists/${id}`);
    if (!response.ok) throw new Error('Failed to fetch therapist');
    const data = await response.json();
    return data.data.therapist;
  },

  search: async (query: string): Promise<Therapist[]> => {
    const response = await fetch(`${API_BASE_URL}/therapists/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Failed to search therapists');
    const data = await response.json();
    return data.data.therapists;
  },

  requestBooking: async (bookingData: {
    therapistId: string;
    preferredDate: string;
    preferredTime: string;
    message?: string;
    userPhone?: string;
  }): Promise<TherapistBooking> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/therapists/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookingData)
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error || 'Failed to request booking');
    }
    const data = await response.json();
    return data.data.booking;
  },

  getMyBookings: async (): Promise<TherapistBooking[]> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/therapists/bookings`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch bookings');
    const data = await response.json();
    return data.data.bookings;
  },

  cancelBooking: async (id: string): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/therapists/bookings/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to cancel booking');
  }
};

// Support Tickets API
export const supportTicketsApi = {
  create: async (ticketData: {
    subject: string;
    message: string;
    category: TicketCategory;
    priority?: TicketPriority;
  }): Promise<SupportTicket> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/support/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(ticketData)
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(errorPayload?.error || 'Failed to create support ticket');
    }
    const data = await response.json();
    const ticket = data?.data?.ticket;
    return {
      ...ticket,
      response: ticket?.response ?? null,
      adminResponse: ticket?.response ?? null,
      respondedBy: ticket?.respondedBy ?? null,
      respondedAt: ticket?.respondedAt ?? null
    };
  },

  getMyTickets: async (status?: TicketStatus): Promise<SupportTicket[]> => {
    const token = getAuthToken();
    const url = status
      ? `${API_BASE_URL}/support/tickets?status=${status}`
      : `${API_BASE_URL}/support/tickets`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch support tickets');
    const data = await response.json();
    const tickets = Array.isArray(data?.data?.tickets) ? data.data.tickets : [];
    return tickets.map((ticket: any) => ({
      ...ticket,
      response: ticket.response ?? null,
      adminResponse: ticket.response ?? null
    }));
  },

  getById: async (id: string): Promise<SupportTicket> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/support/tickets/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to fetch support ticket');
    const data = await response.json();
    const ticket = data?.data?.ticket;
    return {
      ...ticket,
      response: ticket?.response ?? null,
      adminResponse: ticket?.response ?? null
    };
  },

  acknowledge: async (id: string): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/support/tickets/${id}/acknowledge`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to acknowledge ticket');
  }
};

// Safety Plan API
export const safetyPlanApi = {
  get: async (): Promise<SafetyPlan | null> => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE_URL}/crisis/safety-plan`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch safety plan');
      const data = await response.json();
      return mapSafetyPlanFromBackend(data?.data?.safetyPlan);
    } catch (error) {
      console.error('Error fetching safety plan:', error);
      return null;
    }
  },

  createOrUpdate: async (planData: {
    warningSigns: string[];
    copingStrategies: string[];
    supportContacts: Array<{ name: string; phone: string; relationship: string }>;
    professionalContacts: Array<{ name: string; phone: string; role: string }>;
    environmentSafety: string[];
    reasonsToLive: string[];
  }): Promise<SafetyPlan> => {
    const token = getAuthToken();
    const payload = mapSafetyPlanToBackend(planData);
    const response = await fetch(`${API_BASE_URL}/crisis/safety-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Failed to save safety plan');
    const data = await response.json();
    return mapSafetyPlanFromBackend(data?.data?.safetyPlan);
  },

  delete: async (): Promise<void> => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/crisis/safety-plan`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) throw new Error('Failed to delete safety plan');
  }
};
