export type TherapistTab = 'overview' | 'clients' | 'bookings' | 'calendar' | 'notes' | 'profile';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export type BookingDateRange = 'all' | 'today' | 'this-week' | 'this-month';

export type NoteFormat = 'SOAP' | 'DAP' | 'NARRATIVE';

export const THERAPIST_TAB_ORDER: TherapistTab[] = [
  'overview',
  'clients',
  'bookings',
  'calendar',
  'notes',
  'profile',
];

export const BOOKING_STATUS_FILTERS: Array<'ALL' | BookingStatus> = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

export const BOOKING_DATE_RANGE_OPTIONS: Array<{ value: BookingDateRange; label: string }> = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'this-week', label: 'This week' },
  { value: 'this-month', label: 'This month' },
];

export const THERAPIST_NOTE_FORMATS: Array<{ value: NoteFormat; label: string }> = [
  { value: 'SOAP', label: 'SOAP' },
  { value: 'DAP', label: 'DAP' },
  { value: 'NARRATIVE', label: 'Narrative' },
];
