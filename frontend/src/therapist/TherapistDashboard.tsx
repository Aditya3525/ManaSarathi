import {
    ArrowLeft, Calendar, CheckCircle, Clock, Edit2, Heart,
    Loader2, LogOut, MessageSquare, Save, Star, Users, X, XCircle, RefreshCw, Plus, Image
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
import { Separator } from '../components/ui/separator';
import { Textarea } from '../components/ui/textarea';

// ─── Types ──────────────────────────────────────────────────────────────────
interface TherapistProfile {
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

interface Booking {
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

interface Stats {
    pending: number;
    confirmed: number;
    completed: number;
    total: number;
    uniqueClients: number;
}

// ─── API helpers ────────────────────────────────────────────────────────────
const API = '/api/therapist-portal';

async function apiFetch(path: string, opts: RequestInit = {}) {
    const res = await fetch(`${API}${path}`, {
        ...opts,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...opts.headers },
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

// ─── Props ──────────────────────────────────────────────────────────────────
interface TherapistDashboardProps {
    onLogout: () => void;
    therapistName?: string;
}

type Tab = 'overview' | 'bookings' | 'profile';

// ─── Component ──────────────────────────────────────────────────────────────
export function TherapistDashboard({ onLogout, therapistName }: TherapistDashboardProps) {
    const [tab, setTab] = useState<Tab>('overview');
    const [stats, setStats] = useState<Stats | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [profile, setProfile] = useState<TherapistProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [actionBookingId, setActionBookingId] = useState<string | null>(null);
    const [noteInput, setNoteInput] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    // ─ Fetch all data
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, bookingsRes, profileRes] = await Promise.all([
                apiFetch('/stats'),
                apiFetch('/bookings'),
                apiFetch('/profile'),
            ]);
            if (statsRes.success) setStats(statsRes.data);
            if (bookingsRes.success) setBookings(bookingsRes.data);
            if (profileRes.success) setProfile(profileRes.data);
        } catch (e: any) {
            console.error('Dashboard fetch error:', e);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─ Booking actions
    const updateBookingStatus = async (id: string, status: string) => {
        try {
            const body: any = { status };
            if (noteInput.trim()) body.therapistNotes = noteInput.trim();
            await apiFetch(`/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify(body) });
            showToast(`Booking ${status.toLowerCase()}`);
            setActionBookingId(null);
            setNoteInput('');
            fetchData();
        } catch (e: any) {
            showToast(e.message || 'Failed');
        }
    };

    // ─ Profile save
    const saveProfile = async () => {
        if (!profile) return;
        setSaving(true);
        try {
            await apiFetch('/profile', { method: 'PUT', body: JSON.stringify(profile) });
            showToast('Profile updated');
        } catch (e: any) {
            showToast(e.message || 'Failed to save');
        }
        setSaving(false);
    };

    // ─ Filtered bookings
    const filtered = statusFilter === 'ALL' ? bookings : bookings.filter(b => b.status === statusFilter);

    // helpers
    const statusColor = (s: string) => {
        switch (s) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'CONFIRMED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-300';
            case 'COMPLETED': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return '';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg animate-in fade-in slide-in-from-top-2">
                    {toast}
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Heart className="h-6 w-6 text-emerald-600" />
                        <div>
                            <h1 className="text-lg font-semibold">Therapist Portal</h1>
                            <p className="text-xs text-muted-foreground">{therapistName || profile?.name}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onLogout}>
                        <LogOut className="h-4 w-4 mr-2" /> Logout
                    </Button>
                </div>

                {/* Tabs */}
                <div className="max-w-6xl mx-auto px-4">
                    <nav className="flex gap-1 -mb-px">
                        {([
                            { key: 'overview' as Tab, label: 'Overview', icon: <Star className="h-4 w-4" /> },
                            { key: 'bookings' as Tab, label: 'Bookings', icon: <Calendar className="h-4 w-4" />, badge: stats?.pending },
                            { key: 'profile' as Tab, label: 'Profile', icon: <Edit2 className="h-4 w-4" /> },
                        ]).map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.key
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                    }`}
                            >
                                {t.icon} {t.label}
                                {t.badge ? (
                                    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-500 px-1.5 text-xs font-bold text-white">
                                        {t.badge}
                                    </span>
                                ) : null}
                            </button>
                        ))}
                    </nav>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">

                {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
                {tab === 'overview' && stats && (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Pending', value: stats.pending, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                                { label: 'Confirmed', value: stats.confirmed, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Completed', value: stats.completed, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { label: 'Unique Clients', value: stats.uniqueClients, color: 'text-purple-600', bg: 'bg-purple-50' },
                            ].map(s => (
                                <Card key={s.label} className={s.bg}>
                                    <CardContent className="pt-5 pb-4 text-center">
                                        <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Quick actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-wrap gap-3">
                                <Button size="sm" variant="outline" onClick={() => { setTab('bookings'); setStatusFilter('PENDING'); }}>
                                    <Clock className="h-4 w-4 mr-1.5" /> Review Pending ({stats.pending})
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setTab('profile')}>
                                    <Edit2 className="h-4 w-4 mr-1.5" /> Edit Profile
                                </Button>
                                <Button size="sm" variant="outline" onClick={fetchData}>
                                    <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Recent pending bookings preview */}
                        {bookings.filter(b => b.status === 'PENDING').length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Pending Requests</CardTitle>
                                    <CardDescription>These clients are waiting for your response</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {bookings.filter(b => b.status === 'PENDING').slice(0, 5).map(b => (
                                        <div key={b.id} className="flex items-center justify-between rounded-lg border p-3">
                                            <div>
                                                <p className="font-medium text-sm">{b.user?.name || b.userEmail}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {b.preferredDate ? new Date(b.preferredDate).toLocaleDateString() : 'No date set'}
                                                    {b.preferredTime ? ` at ${b.preferredTime}` : ''}
                                                </p>
                                                {b.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{b.message}</p>}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="default" className="bg-emerald-600 hover:bg-emerald-700 h-8" onClick={() => updateBookingStatus(b.id, 'CONFIRMED')}>
                                                    <CheckCircle className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="sm" variant="destructive" className="h-8" onClick={() => updateBookingStatus(b.id, 'CANCELLED')}>
                                                    <XCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}

                {/* ── BOOKINGS TAB ─────────────────────────────────────── */}
                {tab === 'bookings' && (
                    <>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold">Booking Requests</h2>
                                <Button size="sm" variant="ghost" onClick={fetchData} className="h-8 w-8 p-0" title="Refresh bookings">
                                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                            <div className="flex gap-1">
                                {['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
                                    <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'}
                                        className={statusFilter === s ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                                        onClick={() => setStatusFilter(s)}>
                                        {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {filtered.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center text-muted-foreground">
                                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-40" />
                                    <p>No {statusFilter === 'ALL' ? '' : statusFilter.toLowerCase()} bookings</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map(b => (
                                    <Card key={b.id}>
                                        <CardContent className="p-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{b.user?.name || b.userEmail}</span>
                                                        <Badge className={`text-xs ${statusColor(b.status)}`}>{b.status}</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span>{b.userEmail}</span>
                                                        {b.userPhone && <span>{b.userPhone}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                        <span><Calendar className="h-3 w-3 inline mr-1" />{b.preferredDate ? new Date(b.preferredDate).toLocaleDateString() : 'No date'}</span>
                                                        {b.preferredTime && <span><Clock className="h-3 w-3 inline mr-1" />{b.preferredTime}</span>}
                                                        <span>Requested {new Date(b.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    {b.message && (
                                                        <div className="mt-2 rounded bg-muted/50 p-2 text-sm">
                                                            <MessageSquare className="h-3 w-3 inline mr-1 opacity-50" />{b.message}
                                                        </div>
                                                    )}
                                                    {b.therapistNotes && (
                                                        <p className="text-xs italic text-muted-foreground mt-1">Your note: {b.therapistNotes}</p>
                                                    )}
                                                </div>

                                                {/* Actions */}
                                                {b.status === 'PENDING' && (
                                                    <div className="flex flex-col gap-1.5 shrink-0">
                                                        {actionBookingId === b.id ? (
                                                            <div className="space-y-2 w-56">
                                                                <Textarea placeholder="Add a note (optional)..." value={noteInput} onChange={e => setNoteInput(e.target.value)} rows={2} className="text-xs" />
                                                                <div className="flex gap-1.5">
                                                                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-7 text-xs" onClick={() => updateBookingStatus(b.id, 'CONFIRMED')}>
                                                                        Approve
                                                                    </Button>
                                                                    <Button size="sm" variant="destructive" className="flex-1 h-7 text-xs" onClick={() => updateBookingStatus(b.id, 'CANCELLED')}>
                                                                        Decline
                                                                    </Button>
                                                                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setActionBookingId(null); setNoteInput(''); }}>
                                                                        <X className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <Button size="sm" variant="outline" className="text-xs" onClick={() => setActionBookingId(b.id)}>
                                                                Respond
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                                {b.status === 'CONFIRMED' && (
                                                    <Button size="sm" variant="outline" className="text-xs" onClick={() => updateBookingStatus(b.id, 'COMPLETED')}>
                                                        <CheckCircle className="h-3 w-3 mr-1" /> Complete
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {/* ── PROFILE TAB ──────────────────────────────────────── */}
                {tab === 'profile' && profile && (() => {
                    const specialties: string[] = (() => { try { return JSON.parse(profile.specialtiesJson || '[]'); } catch { return []; } })();
                    const availability: { day: string; startTime: string; endTime: string }[] = (() => { try { return JSON.parse(profile.availabilityJson || '[]'); } catch { return []; } })();
                    const insurancesList: string[] = (() => { try { return profile.insurances ? JSON.parse(profile.insurances) : []; } catch { return []; } })();

                    const SPECIALTIES = [
                        { value: 'ANXIETY', label: 'Anxiety' }, { value: 'DEPRESSION', label: 'Depression' },
                        { value: 'TRAUMA', label: 'Trauma' }, { value: 'PTSD', label: 'PTSD' },
                        { value: 'RELATIONSHIPS', label: 'Relationships' }, { value: 'FAMILY_THERAPY', label: 'Family Therapy' },
                        { value: 'ADDICTION', label: 'Addiction' }, { value: 'EATING_DISORDERS', label: 'Eating Disorders' },
                        { value: 'OCD', label: 'OCD' }, { value: 'BIPOLAR', label: 'Bipolar Disorder' },
                        { value: 'GRIEF', label: 'Grief & Loss' }, { value: 'STRESS_MANAGEMENT', label: 'Stress Management' },
                        { value: 'CBT', label: 'CBT' }, { value: 'DBT', label: 'DBT' },
                        { value: 'EMDR', label: 'EMDR' }, { value: 'MINDFULNESS', label: 'Mindfulness-Based Therapy' },
                        { value: 'PSYCHODYNAMIC', label: 'Psychodynamic Therapy' }, { value: 'COUPLES_THERAPY', label: 'Couples Therapy' }
                    ];

                    const CREDENTIALS = [
                        { value: 'PSYCHOLOGIST', label: 'Psychologist (PhD/PsyD)' },
                        { value: 'PSYCHIATRIST', label: 'Psychiatrist (MD)' },
                        { value: 'LCSW', label: 'Licensed Clinical Social Worker (LCSW)' },
                        { value: 'LMFT', label: 'Licensed Marriage & Family Therapist (LMFT)' },
                        { value: 'LPC', label: 'Licensed Professional Counselor (LPC)' },
                        { value: 'LMHC', label: 'Licensed Mental Health Counselor (LMHC)' }
                    ];

                    const COMMON_INSURANCES = [
                        'Aetna', 'Blue Cross Blue Shield', 'Cigna', 'United Healthcare',
                        'Humana', 'Kaiser Permanente', 'Medicare', 'Medicaid',
                        'Tricare', 'Anthem', 'Oscar Health', 'Out of Network'
                    ];

                    const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

                    const toggleSpecialty = (spec: string) => {
                        const updated = specialties.includes(spec) ? specialties.filter(s => s !== spec) : [...specialties, spec];
                        setProfile({ ...profile, specialtiesJson: JSON.stringify(updated) });
                    };

                    const toggleInsurance = (ins: string) => {
                        const updated = insurancesList.includes(ins) ? insurancesList.filter(i => i !== ins) : [...insurancesList, ins];
                        setProfile({ ...profile, insurances: JSON.stringify(updated) });
                    };

                    const addAvailabilitySlot = (day: string, startTime: string, endTime: string) => {
                        const updated = [...availability, { day, startTime, endTime }];
                        setProfile({ ...profile, availabilityJson: JSON.stringify(updated) });
                    };

                    const removeAvailabilitySlot = (index: number) => {
                        const updated = availability.filter((_, i) => i !== index);
                        setProfile({ ...profile, availabilityJson: JSON.stringify(updated) });
                    };

                    return (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Edit Profile</CardTitle>
                                    <CardDescription>Update your public therapist profile</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {profile.isVerified && <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">Verified</Badge>}
                                    {profile.isActive ? (
                                        <Badge className="bg-green-100 text-green-800 border-green-300">Active</Badge>
                                    ) : (
                                        <Badge className="bg-red-100 text-red-800 border-red-300">Inactive</Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Basic Info */}
                            <div>
                                <h3 className="font-medium text-sm mb-3">Basic Information</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-name">Display Name</Label>
                                        <Input id="p-name" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-credential">Credential</Label>
                                        <Select value={profile.credential} onValueChange={v => setProfile({ ...profile, credential: v })}>
                                            <SelectTrigger><SelectValue placeholder="Select credential" /></SelectTrigger>
                                            <SelectContent>
                                                {CREDENTIALS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-title">Title</Label>
                                        <Input id="p-title" value={profile.title} onChange={e => setProfile({ ...profile, title: e.target.value })} placeholder="Licensed Clinical Psychologist" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-image">Profile Image URL</Label>
                                        <Input id="p-image" value={profile.profileImageUrl || ''} onChange={e => setProfile({ ...profile, profileImageUrl: e.target.value })} placeholder="https://example.com/photo.jpg" />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="p-bio">Bio</Label>
                                        <Textarea id="p-bio" value={profile.bio} onChange={e => setProfile({ ...profile, bio: e.target.value })} rows={4} />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Specialties */}
                            <div>
                                <h3 className="font-medium text-sm mb-3">Specialties</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {SPECIALTIES.map(s => (
                                        <div key={s.value} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`p-spec-${s.value}`}
                                                checked={specialties.includes(s.value)}
                                                onCheckedChange={() => toggleSpecialty(s.value)}
                                            />
                                            <label htmlFor={`p-spec-${s.value}`} className="text-sm cursor-pointer">{s.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Contact & Location */}
                            <div>
                                <h3 className="font-medium text-sm mb-3">Contact & Location</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-email">Email</Label>
                                        <Input id="p-email" type="email" value={profile.email || ''} onChange={e => setProfile({ ...profile, email: e.target.value })} placeholder="therapist@example.com" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-phone">Phone</Label>
                                        <Input id="p-phone" value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-website">Website</Label>
                                        <Input id="p-website" value={profile.website || ''} onChange={e => setProfile({ ...profile, website: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="p-street">Street Address</Label>
                                        <Input id="p-street" value={profile.street || ''} onChange={e => setProfile({ ...profile, street: e.target.value })} placeholder="123 Main Street, Suite 100" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-city">City</Label>
                                        <Input id="p-city" value={profile.city || ''} onChange={e => setProfile({ ...profile, city: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-state">State</Label>
                                        <Input id="p-state" value={profile.state || ''} onChange={e => setProfile({ ...profile, state: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-zip">ZIP Code</Label>
                                        <Input id="p-zip" value={profile.zipCode || ''} onChange={e => setProfile({ ...profile, zipCode: e.target.value })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-country">Country</Label>
                                        <Input id="p-country" value={profile.country || 'US'} onChange={e => setProfile({ ...profile, country: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Fees & Insurance */}
                            <div>
                                <h3 className="font-medium text-sm mb-3">Session Fees & Insurance</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-fee">Session Fee ($)</Label>
                                        <Input id="p-fee" type="number" value={profile.sessionFee ?? ''} onChange={e => setProfile({ ...profile, sessionFee: e.target.value ? Number(e.target.value) : null })} />
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input type="checkbox" id="p-sliding" checked={profile.offersSliding} onChange={e => setProfile({ ...profile, offersSliding: e.target.checked })} />
                                        <Label htmlFor="p-sliding">Sliding scale</Label>
                                    </div>
                                    <div className="flex items-center gap-2 pt-6">
                                        <input type="checkbox" id="p-insurance" checked={profile.acceptsInsurance} onChange={e => setProfile({ ...profile, acceptsInsurance: e.target.checked })} />
                                        <Label htmlFor="p-insurance">Accepts insurance</Label>
                                    </div>
                                </div>
                                {profile.acceptsInsurance && (
                                    <div className="mt-4 p-3 border rounded-md bg-muted/50">
                                        <Label className="text-sm mb-2 block">Accepted Insurance Providers</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                            {COMMON_INSURANCES.map(ins => (
                                                <div key={ins} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`p-ins-${ins}`}
                                                        checked={insurancesList.includes(ins)}
                                                        onCheckedChange={() => toggleInsurance(ins)}
                                                    />
                                                    <label htmlFor={`p-ins-${ins}`} className="text-sm cursor-pointer">{ins}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Availability */}
                            <div>
                                <h3 className="font-medium text-sm mb-3">Availability Schedule</h3>
                                {availability.length > 0 && (
                                    <div className="space-y-2 mb-3">
                                        {availability.map((slot, index) => (
                                            <div key={index} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30">
                                                <Badge variant="outline">{slot.day}</Badge>
                                                <span className="text-sm">{slot.startTime} - {slot.endTime}</span>
                                                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => removeAvailabilitySlot(index)}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <AvailabilityAdder onAdd={addAvailabilitySlot} days={DAYS_OF_WEEK} />
                            </div>

                            <Separator />

                            {/* Experience */}
                            <div>
                                <h3 className="font-medium text-sm mb-3">Experience</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-exp">Years of Experience</Label>
                                        <Input id="p-exp" type="number" value={profile.yearsExperience ?? ''} onChange={e => setProfile({ ...profile, yearsExperience: e.target.value ? Number(e.target.value) : null })} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="p-lang">Languages</Label>
                                        <Input id="p-lang" value={profile.languages || ''} onChange={e => setProfile({ ...profile, languages: e.target.value })} placeholder="English, Hindi" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2">
                                <Button onClick={saveProfile} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    {saving ? 'Saving…' : 'Save Changes'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                    );
                })()}
            </main>
        </div>
    );
}

// ─── Availability Adder Sub-Component ────────────────────────────────────────
function AvailabilityAdder({ onAdd, days }: { onAdd: (day: string, startTime: string, endTime: string) => void; days: string[] }) {
    const [day, setDay] = useState('Monday');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');

    return (
        <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-1">
                <Label className="text-xs">Day</Label>
                <Select value={day} onValueChange={setDay}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {days.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-1">
                <Label className="text-xs">Start</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-[120px]" />
            </div>
            <div className="space-y-1">
                <Label className="text-xs">End</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-[120px]" />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onAdd(day, startTime, endTime)}>
                <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
        </div>
    );
}
