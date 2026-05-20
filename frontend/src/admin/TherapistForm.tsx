import {
  Plus,
  X,
  Loader2,
  MapPin,
  DollarSign,
  Clock,
  Mail,
  User,
  Award,
  FileText,
  Phone,
  CheckCircle,
  KeyRound,
  Shield
} from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';

// Types
export interface TherapistFormData {
  name: string;
  credential: string;
  title: string;
  bio: string;
  specialties: string[];
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country: string;
  acceptsInsurance: boolean;
  insurances?: string[];
  sessionFee?: number | null;
  offersSliding: boolean;
  availability?: { day: string; startTime: string; endTime: string }[];
  profileImageUrl?: string | null;
  yearsExperience?: number | null;
  languages?: string | null;
  isActive: boolean;
  isVerified: boolean;
  // Portal account fields
  enablePortal?: boolean;
  portalEmail?: string | null;
  portalPassword?: string | null;
}

interface TherapistFormProps {
  initialData?: Partial<TherapistFormData> & { insurancesList?: string[]; portalLinked?: boolean; portalEmail?: string | null };
  onSubmit: (data: TherapistFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CREDENTIALS = [
  { value: 'PSYCHOLOGIST', label: 'Psychologist (PhD/PsyD)' },
  { value: 'PSYCHIATRIST', label: 'Psychiatrist (MD)' },
  { value: 'LCSW', label: 'Licensed Clinical Social Worker (LCSW)' },
  { value: 'LMFT', label: 'Licensed Marriage & Family Therapist (LMFT)' },
  { value: 'LPC', label: 'Licensed Professional Counselor (LPC)' },
  { value: 'LMHC', label: 'Licensed Mental Health Counselor (LMHC)' }
];

const SPECIALTIES = [
  { value: 'ANXIETY', label: 'Anxiety' },
  { value: 'DEPRESSION', label: 'Depression' },
  { value: 'TRAUMA', label: 'Trauma' },
  { value: 'PTSD', label: 'PTSD' },
  { value: 'RELATIONSHIPS', label: 'Relationships' },
  { value: 'FAMILY_THERAPY', label: 'Family Therapy' },
  { value: 'ADDICTION', label: 'Addiction' },
  { value: 'EATING_DISORDERS', label: 'Eating Disorders' },
  { value: 'OCD', label: 'OCD' },
  { value: 'BIPOLAR', label: 'Bipolar Disorder' },
  { value: 'GRIEF', label: 'Grief & Loss' },
  { value: 'STRESS_MANAGEMENT', label: 'Stress Management' },
  { value: 'CBT', label: 'Cognitive Behavioral Therapy (CBT)' },
  { value: 'DBT', label: 'Dialectical Behavior Therapy (DBT)' },
  { value: 'EMDR', label: 'EMDR' },
  { value: 'MINDFULNESS', label: 'Mindfulness-Based Therapy' },
  { value: 'PSYCHODYNAMIC', label: 'Psychodynamic Therapy' },
  { value: 'COUPLES_THERAPY', label: 'Couples Therapy' }
];

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const COMMON_INSURANCES = [
  'Aetna', 'Blue Cross Blue Shield', 'Cigna', 'United Healthcare',
  'Humana', 'Kaiser Permanente', 'Medicare', 'Medicaid',
  'Tricare', 'Anthem', 'Oscar Health', 'Out of Network'
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

export function TherapistForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}: TherapistFormProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'practice' | 'availability' | 'portal'>('basic');

  // Form state
  const [formData, setFormData] = useState<TherapistFormData>({
    name: initialData?.name || '',
    credential: initialData?.credential || '',
    title: initialData?.title || '',
    bio: initialData?.bio || '',
    specialties: initialData?.specialties || [],
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    website: initialData?.website || '',
    street: initialData?.street || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zipCode: initialData?.zipCode || '',
    country: initialData?.country || 'US',
    acceptsInsurance: initialData?.acceptsInsurance || false,
    insurances: initialData?.insurancesList || (Array.isArray(initialData?.insurances) ? initialData.insurances : []),
    sessionFee: initialData?.sessionFee || null,
    offersSliding: initialData?.offersSliding || false,
    availability: initialData?.availability || [],
    profileImageUrl: initialData?.profileImageUrl || '',
    yearsExperience: initialData?.yearsExperience || null,
    languages: initialData?.languages || 'English',
    isActive: initialData?.isActive ?? true,
    isVerified: initialData?.isVerified ?? false,
    enablePortal: initialData?.portalLinked ?? false,
    portalEmail: initialData?.portalEmail || initialData?.email || '',
    portalPassword: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newAvailability, setNewAvailability] = useState({
    day: 'Monday',
    startTime: '09:00',
    endTime: '17:00'
  });

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.credential) newErrors.credential = 'Credential is required';
    if (!formData.title.trim()) newErrors.title = 'Title is required';
    if (!formData.bio.trim()) newErrors.bio = 'Bio is required';
    if (formData.bio.length > 2000) newErrors.bio = 'Bio must be under 2000 characters';
    if (formData.specialties.length === 0) newErrors.specialties = 'At least one specialty is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = 'Website must start with http:// or https://';
    }

    // Portal validation
    if (formData.enablePortal) {
      if (!formData.portalEmail?.trim()) {
        newErrors.portalEmail = 'Portal email is required when portal access is enabled';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.portalEmail)) {
        newErrors.portalEmail = 'Invalid email format';
      }
      // Password required only for NEW portal accounts (not editing existing)
      if (!initialData?.portalLinked && !formData.portalPassword?.trim()) {
        newErrors.portalPassword = 'Password is required for new portal accounts';
      }
      if (formData.portalPassword && formData.portalPassword.length < 6) {
        newErrors.portalPassword = 'Password must be at least 6 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Clean up data before submission
    const submitData: TherapistFormData = {
      ...formData,
      email: formData.email?.trim() || null,
      phone: formData.phone?.trim() || null,
      website: formData.website?.trim() || null,
      street: formData.street?.trim() || null,
      city: formData.city?.trim() || null,
      state: formData.state?.trim() || null,
      zipCode: formData.zipCode?.trim() || null,
      profileImageUrl: formData.profileImageUrl?.trim() || null,
      languages: formData.languages?.trim() || null,
      sessionFee: formData.sessionFee || null,
      yearsExperience: formData.yearsExperience || null,
      enablePortal: formData.enablePortal,
      portalEmail: formData.enablePortal ? formData.portalEmail?.trim() || null : null,
      portalPassword: formData.enablePortal && formData.portalPassword?.trim() ? formData.portalPassword.trim() : null
    };

    await onSubmit(submitData);
  };

  const toggleSpecialty = (specialty: string) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  const toggleInsurance = (insurance: string) => {
    setFormData(prev => ({
      ...prev,
      insurances: (prev.insurances || []).includes(insurance)
        ? (prev.insurances || []).filter(i => i !== insurance)
        : [...(prev.insurances || []), insurance]
    }));
  };

  const addAvailability = () => {
    setFormData(prev => ({
      ...prev,
      availability: [...(prev.availability || []), newAvailability]
    }));
    setNewAvailability({ day: 'Monday', startTime: '09:00', endTime: '17:00' });
  };

  const removeAvailability = (index: number) => {
    setFormData(prev => ({
      ...prev,
      availability: (prev.availability || []).filter((_, i) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Tabs Navigation - Fixed */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 px-6 py-2.5 border-b bg-background">
          <TabsList className="inline-flex h-9 items-center justify-center rounded-lg bg-muted/50 p-1 text-muted-foreground w-full">
            <TabsTrigger
              value="basic"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex-1 gap-2"
            >
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Basic Info</span>
            </TabsTrigger>
            <TabsTrigger
              value="contact"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex-1 gap-2"
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Contact</span>
            </TabsTrigger>
            <TabsTrigger
              value="practice"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex-1 gap-2"
            >
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Practice</span>
            </TabsTrigger>
            <TabsTrigger
              value="availability"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex-1 gap-2"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Schedule</span>
            </TabsTrigger>
            <TabsTrigger
              value="portal"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm flex-1 gap-2"
            >
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">Portal</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-muted/5" style={{ maxHeight: 'calc(85vh - 200px)' }}>
          <div className="px-6 py-4">
            {/* Basic Information Tab */}
            <TabsContent value="basic" className="m-0 space-y-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Dr. Jane Smith"
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="credential">Credential *</Label>
                    <Select
                      value={formData.credential}
                      onValueChange={(value) => setFormData({ ...formData, credential: value })}
                    >
                      <SelectTrigger className={errors.credential ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Select credential" />
                      </SelectTrigger>
                      <SelectContent>
                        {CREDENTIALS.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.credential && <p className="text-sm text-destructive">{errors.credential}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Professional Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Licensed Clinical Psychologist"
                    className={errors.title ? 'border-destructive' : ''}
                  />
                  {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio *</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Describe your background, approach, and areas of expertise..."
                    rows={4}
                    className={errors.bio ? 'border-destructive' : ''}
                  />
                  <div className="flex justify-between">
                    {errors.bio && <p className="text-sm text-destructive">{errors.bio}</p>}
                    <p className="text-sm text-muted-foreground ml-auto">{formData.bio.length}/2000</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yearsExperience">Years of Experience</Label>
                    <Input
                      id="yearsExperience"
                      type="number"
                      min="0"
                      value={formData.yearsExperience || ''}
                      onChange={(e) => setFormData({ ...formData, yearsExperience: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder="10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="languages">Languages</Label>
                    <Input
                      id="languages"
                      value={formData.languages || ''}
                      onChange={(e) => setFormData({ ...formData, languages: e.target.value })}
                      placeholder="English, Spanish"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profileImageUrl">Profile Image URL</Label>
                  <Input
                    id="profileImageUrl"
                    value={formData.profileImageUrl || ''}
                    onChange={(e) => setFormData({ ...formData, profileImageUrl: e.target.value })}
                    placeholder="https://example.com/photo.jpg"
                  />
                </div>

                {/* Specialties Section */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Specialties *</Label>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {SPECIALTIES.map(s => (
                      <div key={s.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`specialty-${s.value}`}
                          checked={formData.specialties.includes(s.value)}
                          onCheckedChange={() => toggleSpecialty(s.value)}
                        />
                        <label
                          htmlFor={`specialty-${s.value}`}
                          className="text-sm cursor-pointer"
                        >
                          {s.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  {errors.specialties && <p className="text-sm text-destructive">{errors.specialties}</p>}
                </div>
              </div>
            </TabsContent>

            {/* Contact & Location Tab */}
            <TabsContent value="contact" className="m-0 space-y-6">
              <div className="space-y-4">
                {/* Contact Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Contact Information</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="jane.smith@therapy.com"
                        className={errors.email ? 'border-destructive' : ''}
                      />
                      {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="tel"
                        maxLength={10}
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        placeholder="e.g. 9876543210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      placeholder="https://www.therapist-website.com"
                      className={errors.website ? 'border-destructive' : ''}
                    />
                    {errors.website && <p className="text-sm text-destructive">{errors.website}</p>}
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Location</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={formData.street || ''}
                      onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                      placeholder="123 Main Street, Suite 100"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city || ''}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="San Francisco"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">State</Label>
                      <Select
                        value={formData.state || ''}
                        onValueChange={(value) => setFormData({ ...formData, state: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="State" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zipCode">ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode || ''}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        placeholder="94102"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input
                        id="country"
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        placeholder="US"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Practice Details Tab */}
            <TabsContent value="practice" className="m-0 space-y-6">
              <div className="space-y-4">
                {/* Fees */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Session Fees</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sessionFee">Session Fee ($)</Label>
                      <Input
                        id="sessionFee"
                        type="number"
                        min="0"
                        value={formData.sessionFee || ''}
                        onChange={(e) => setFormData({ ...formData, sessionFee: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="150"
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-8">
                      <Checkbox
                        id="offersSliding"
                        checked={formData.offersSliding}
                        onCheckedChange={(checked) => setFormData({ ...formData, offersSliding: !!checked })}
                      />
                      <label htmlFor="offersSliding" className="text-sm cursor-pointer">
                        Offers sliding scale fees
                      </label>
                    </div>
                  </div>
                </div>

                {/* Insurance */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="acceptsInsurance"
                      checked={formData.acceptsInsurance}
                      onCheckedChange={(checked) => setFormData({ ...formData, acceptsInsurance: !!checked })}
                    />
                    <label htmlFor="acceptsInsurance" className="text-sm cursor-pointer font-medium">
                      Accepts Insurance
                    </label>
                  </div>

                  {formData.acceptsInsurance && (
                    <div className="mt-3 p-3 border rounded-md bg-muted/50">
                      <Label className="text-sm mb-2 block">Accepted Insurance Providers</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {COMMON_INSURANCES.map(ins => (
                          <div key={ins} className="flex items-center space-x-2">
                            <Checkbox
                              id={`insurance-${ins}`}
                              checked={(formData.insurances || []).includes(ins)}
                              onCheckedChange={() => toggleInsurance(ins)}
                            />
                            <label htmlFor={`insurance-${ins}`} className="text-sm cursor-pointer">
                              {ins}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Availability & Status Tab */}
            <TabsContent value="availability" className="m-0 space-y-6">
              <div className="space-y-4">
                {/* Availability Schedule */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Availability Schedule</Label>
                  </div>

                  {/* Current availability slots */}
                  {(formData.availability || []).length > 0 && (
                    <div className="space-y-2">
                      {formData.availability?.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                          <Badge variant="outline">{slot.day}</Badge>
                          <span className="text-sm">{slot.startTime} - {slot.endTime}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-auto"
                            onClick={() => removeAvailability(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new slot */}
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Day</Label>
                      <Select
                        value={newAvailability.day}
                        onValueChange={(value) => setNewAvailability({ ...newAvailability, day: value })}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Start Time</Label>
                      <Input
                        type="time"
                        value={newAvailability.startTime}
                        onChange={(e) => setNewAvailability({ ...newAvailability, startTime: e.target.value })}
                        className="w-[120px]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">End Time</Label>
                      <Input
                        type="time"
                        value={newAvailability.endTime}
                        onChange={(e) => setNewAvailability({ ...newAvailability, endTime: e.target.value })}
                        className="w-[120px]"
                      />
                    </div>

                    <Button type="button" variant="outline" size="sm" onClick={addAvailability}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Status */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Status</Label>
                  </div>
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isActive"
                        checked={formData.isActive}
                        onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                      />
                      <label htmlFor="isActive" className="text-sm cursor-pointer">
                        Active (visible in directory)
                      </label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isVerified"
                        checked={formData.isVerified}
                        onCheckedChange={(checked) => setFormData({ ...formData, isVerified: !!checked })}
                      />
                      <label htmlFor="isVerified" className="text-sm cursor-pointer">
                        Verified (credentials confirmed)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Portal Account Tab */}
            <TabsContent value="portal" className="m-0 space-y-6">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-muted-foreground" />
                    <Label className="font-medium">Therapist Portal Access</Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable portal access so this therapist can log in to manage their bookings, respond to client requests, and update their profile.
                  </p>

                  {initialData?.portalLinked && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200">
                      <Shield className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700 font-medium">Portal account is currently linked</span>
                      {initialData?.portalEmail && (
                        <span className="text-sm text-emerald-600">({initialData.portalEmail})</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox
                      id="enablePortal"
                      checked={formData.enablePortal}
                      onCheckedChange={(checked) => setFormData({ ...formData, enablePortal: !!checked })}
                    />
                    <label htmlFor="enablePortal" className="text-sm cursor-pointer font-medium">
                      Enable therapist portal access
                    </label>
                  </div>
                </div>

                {formData.enablePortal && (
                  <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                    <div className="space-y-2">
                      <Label htmlFor="portalEmail">Portal Login Email *</Label>
                      <Input
                        id="portalEmail"
                        type="email"
                        value={formData.portalEmail || ''}
                        onChange={(e) => setFormData({ ...formData, portalEmail: e.target.value })}
                        placeholder="therapist@email.com"
                        className={errors.portalEmail ? 'border-destructive' : ''}
                      />
                      <p className="text-xs text-muted-foreground">
                        This email will be used for portal login. If a user account with this email already exists, it will be linked.
                      </p>
                      {errors.portalEmail && <p className="text-sm text-destructive">{errors.portalEmail}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="portalPassword">
                        {initialData?.portalLinked ? 'New Password (leave blank to keep current)' : 'Password *'}
                      </Label>
                      <Input
                        id="portalPassword"
                        type="password"
                        value={formData.portalPassword || ''}
                        onChange={(e) => setFormData({ ...formData, portalPassword: e.target.value })}
                        placeholder={initialData?.portalLinked ? '••••••••' : 'Min 6 characters'}
                        className={errors.portalPassword ? 'border-destructive' : ''}
                      />
                      {errors.portalPassword && <p className="text-sm text-destructive">{errors.portalPassword}</p>}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </div>
        </div>

        {/* Fixed Footer with Actions */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-background">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initialData ? 'Update Therapist' : 'Add Therapist'}
            </Button>
          </div>
        </div>
      </Tabs>
    </form>
  );
}
