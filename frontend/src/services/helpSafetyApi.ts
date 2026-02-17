// Help & Safety API Service
import { getApiBaseUrl } from '../config/apiConfig';

const API_BASE_URL = getApiBaseUrl();

// Types
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
export type TicketCategory = 'TECHNICAL' | 'BILLING' | 'FEATURE_REQUEST' | 'CRISIS' | 'GENERAL';
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
  message: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  attachmentUrl: string | null;
  adminResponse: string | null;
  respondedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    return data.data.resources;
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
    if (filters?.location) params.append('location', filters.location);
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
    if (!response.ok) throw new Error('Failed to create support ticket');
    const data = await response.json();
    return data.data.ticket;
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
    return data.data.tickets;
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
    return data.data.ticket;
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
      return data.data.safetyPlan;
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
    const response = await fetch(`${API_BASE_URL}/crisis/safety-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(planData)
    });
    if (!response.ok) throw new Error('Failed to save safety plan');
    const data = await response.json();
    return data.data.safetyPlan;
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
