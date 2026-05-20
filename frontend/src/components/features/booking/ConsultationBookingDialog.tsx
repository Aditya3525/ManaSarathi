import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Video,
    Phone,
    MapPin,
    User,
    Calendar,
    Clock,
    Check,
    ArrowLeft,
    ArrowRight,
    Loader2,
    Star,
    CheckCircle2
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { useToast } from '../../../contexts/ToastContext';
import { assessmentsApi, type AssessmentInsights } from '../../../services/api';
import { therapistApi, type Therapist } from '../../../services/helpSafetyApi';
import {
    type AssessmentShareContext,
    getDefaultShareSelection,
    hasShareSelectionEnabled,
} from '../../../utils/assessmentSharingContext';
import { Button } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../../ui/dialog';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';


import './booking.css';

interface ConsultationBookingDialogProps {
    therapist: Therapist | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sharingContext?: AssessmentShareContext | null;
}

type ConsultationType = 'video' | 'phone' | 'in-person';

interface StepConfig {
    label: string;
    icon: React.ReactNode;
}

const STEPS: StepConfig[] = [
    { label: 'Type', icon: <Video className="h-3 w-3" /> },
    { label: 'Schedule', icon: <Calendar className="h-3 w-3" /> },
    { label: 'Details', icon: <User className="h-3 w-3" /> },
    { label: 'Confirm', icon: <Check className="h-3 w-3" /> },
];

const TIME_SLOTS = [
    '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30',
    '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
];

const CONSULTATION_TYPES: { key: ConsultationType; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
    {
        key: 'video',
        label: 'Video Call',
        desc: 'Face-to-face session via secure video',
        icon: <Video className="h-5 w-5 text-blue-600" />,
        color: 'bg-blue-100'
    },
    {
        key: 'phone',
        label: 'Phone Call',
        desc: 'Voice-only session for your comfort',
        icon: <Phone className="h-5 w-5 text-green-600" />,
        color: 'bg-green-100'
    },
    {
        key: 'in-person',
        label: 'In-Person',
        desc: 'Visit the therapist\'s office',
        icon: <MapPin className="h-5 w-5 text-purple-600" />,
        color: 'bg-purple-100'
    },
];

const formatAssessmentLabel = (assessmentType: string): string =>
    assessmentType
        .replace(/[_-]+/g, ' ')
        .replace(/\b(phq|gad|ptsd|ocd)\b/gi, (match) => match.toUpperCase())
        .replace(/\b\w/g, (char) => char.toUpperCase());

const formatTrendLabel = (trend: string | undefined): string | undefined => {
    if (!trend) return undefined;

    switch (trend) {
        case 'improving':
            return 'Improving';
        case 'declining':
            return 'Declining';
        case 'stable':
            return 'Stable';
        case 'baseline':
            return 'Baseline';
        default:
            return trend;
    }
};

const buildDirectBookingShareContext = (insights: AssessmentInsights): AssessmentShareContext | null => {
    const entries = Object.entries(insights.byType ?? {});
    if (entries.length === 0) {
        return null;
    }

    const [assessmentType, summary] = [...entries].sort((a, b) => {
        const aDate = new Date(a[1].lastCompletedAt).getTime();
        const bDate = new Date(b[1].lastCompletedAt).getTime();
        return bDate - aDate;
    })[0];

    const recommendations = (summary.recommendations ?? [])
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .slice(0, 4);

    return {
        source: 'direct-booking',
        assessmentType,
        assessmentLabel: formatAssessmentLabel(assessmentType),
        latestScore: Number.isFinite(summary.latestScore) ? Math.round(summary.latestScore) : undefined,
        trend: formatTrendLabel(summary.trend),
        interpretation: summary.interpretation || undefined,
        recommendations: recommendations.length > 0 ? recommendations : undefined,
        wellnessScore:
            typeof insights.wellnessScore?.value === 'number'
                ? Math.round(insights.wellnessScore.value)
                : undefined,
        generatedAt: new Date().toISOString(),
    };
};

export function ConsultationBookingDialog({
    therapist,
    open,
    onOpenChange,
    sharingContext,
}: ConsultationBookingDialogProps) {
    const { push } = useToast();
    const queryClient = useQueryClient();

    const [currentStep, setCurrentStep] = useState(0);
    const [consultType, setConsultType] = useState<ConsultationType | null>(null);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [message, setMessage] = useState('');
    const [userPhone, setUserPhone] = useState('');
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [shareSelection, setShareSelection] = useState(() => getDefaultShareSelection(sharingContext));
    const [shareReferenceEnabled, setShareReferenceEnabled] = useState(() =>
        Boolean(sharingContext?.assessmentLabel) && hasShareSelectionEnabled(getDefaultShareSelection(sharingContext))
    );

    const fallbackShareContextQuery = useQuery({
        queryKey: ['booking-share-context-fallback'],
        enabled: open && !sharingContext,
        staleTime: 5 * 60 * 1000,
        queryFn: async (): Promise<AssessmentShareContext | null> => {
            const response = await assessmentsApi.getAssessmentHistory();
            if (!response.success || !response.data?.insights) {
                return null;
            }

            return buildDirectBookingShareContext(response.data.insights);
        },
    });

    const resolvedSharingContext = sharingContext ?? fallbackShareContextQuery.data ?? null;
    const hasReferralContext = Boolean(resolvedSharingContext?.assessmentLabel);
    const sharingEnabled = hasReferralContext && shareReferenceEnabled && hasShareSelectionEnabled(shareSelection);

    const sharedDataLabels = useMemo(() => {
        if (!hasReferralContext) {
            return [] as string[];
        }

        const labels: string[] = [];
        if (shareSelection.scoreSummary) labels.push('Score summary');
        if (shareSelection.interpretation) labels.push('Interpretation');
        if (shareSelection.recommendations) labels.push('Recommendations');
        if (shareSelection.trend) labels.push('Trend');
        return labels;
    }, [hasReferralContext, shareSelection]);

    const applyShareDefaults = (context: AssessmentShareContext | null | undefined) => {
        const defaults = getDefaultShareSelection(context);
        setShareSelection(defaults);
        setShareReferenceEnabled(Boolean(context?.assessmentLabel) && hasShareSelectionEnabled(defaults));
    };

    const resetState = () => {
        setCurrentStep(0);
        setConsultType(null);
        setSelectedDate('');
        setSelectedTime('');
        setMessage('');
        setUserPhone('');
        setBookingSuccess(false);
        applyShareDefaults(resolvedSharingContext);
    };

    useEffect(() => {
        if (open) {
            applyShareDefaults(resolvedSharingContext);
        }
    }, [open, resolvedSharingContext]);

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) resetState();
        onOpenChange(isOpen);
    };

    // Booking mutation
    const bookingMutation = useMutation({
        mutationFn: (data: {
            therapistId: string;
            preferredDate: string;
            preferredTime: string;
            message?: string;
            userPhone?: string;
            sharingContext?: {
                source?: 'insights-share' | 'insights-discuss' | 'direct-booking';
                assessmentType?: string;
                assessmentLabel?: string;
                latestScore?: number;
                trend?: string;
                interpretation?: string;
                recommendations?: string[];
                wellnessScore?: number;
                generatedAt?: string;
                includeData?: {
                    scoreSummary?: boolean;
                    interpretation?: boolean;
                    recommendations?: boolean;
                    trend?: boolean;
                };
            };
        }) => therapistApi.requestBooking(data),
        onSuccess: () => {
            setBookingSuccess(true);
            queryClient.invalidateQueries({ queryKey: ['therapists'] });
            queryClient.invalidateQueries({ queryKey: ['myBookings'] });
        },
        onError: (error: Error) => {
            push({
                type: 'error',
                title: 'Booking Failed',
                description: error.message || 'Failed to request booking. Please try again.',
            });
        }
    });

    const getMinDate = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    };

    const canProceed = () => {
        switch (currentStep) {
            case 0: return consultType !== null;
            case 1: return selectedDate !== '' && selectedTime !== '';
            case 2: return true; // details are optional
            case 3: return true;
            default: return false;
        }
    };

    const handleNext = () => {
        if (currentStep < 3) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = () => {
        if (!therapist) return;

        const selectedConsultationType = CONSULTATION_TYPES.find(t => t.key === consultType)?.label || consultType;

        const messageParts: string[] = [`Consultation Type: ${selectedConsultationType}`];
        const trimmedMessage = message.trim();
        if (trimmedMessage.length > 0) {
            messageParts.push(`Message: ${trimmedMessage}`);
        }

        let sharingPayload:
            | {
                source?: 'insights-share' | 'insights-discuss' | 'direct-booking';
                assessmentType?: string;
                assessmentLabel?: string;
                latestScore?: number;
                trend?: string;
                interpretation?: string;
                recommendations?: string[];
                wellnessScore?: number;
                generatedAt?: string;
                includeData?: {
                    scoreSummary?: boolean;
                    interpretation?: boolean;
                    recommendations?: boolean;
                    trend?: boolean;
                };
            }
            | undefined;

        if (hasReferralContext && sharingEnabled && resolvedSharingContext) {
            sharingPayload = {
                ...resolvedSharingContext,
                includeData: {
                    scoreSummary: shareSelection.scoreSummary,
                    interpretation: shareSelection.interpretation,
                    recommendations: shareSelection.recommendations,
                    trend: shareSelection.trend,
                },
            };
        }

        const fullMessage = messageParts.join('\n').trim();

        bookingMutation.mutate({
            therapistId: therapist.id,
            preferredDate: selectedDate,
            preferredTime: selectedTime,
            message: fullMessage || undefined,
            userPhone: userPhone || undefined,
            sharingContext: sharingPayload,
        });
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (time: string) => {
        if (!time) return '';
        const [h, m] = time.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hr = h % 12 || 12;
        return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    if (!therapist) return null;

    // Success state
    if (bookingSuccess) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md">
                    <div className="flex flex-col items-center text-center py-6 space-y-4">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Booking Requested!</h3>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                Your consultation request with <strong>{therapist.name}</strong> has been submitted.
                                You&apos;ll receive a notification once the therapist confirms your appointment.
                            </p>
                        </div>
                        <div className="booking-summary w-full mt-2">
                            <div className="booking-summary-row">
                                <span className="booking-summary-label">Date</span>
                                <span className="booking-summary-value">{formatDate(selectedDate)}</span>
                            </div>
                            <div className="booking-summary-row">
                                <span className="booking-summary-label">Time</span>
                                <span className="booking-summary-value">{formatTime(selectedTime)}</span>
                            </div>
                            <div className="booking-summary-row">
                                <span className="booking-summary-label">Type</span>
                                <span className="booking-summary-value">
                                    {CONSULTATION_TYPES.find(t => t.key === consultType)?.label}
                                </span>
                            </div>
                        </div>
                        <Button className="w-full mt-4" onClick={() => handleClose(false)}>
                            Done
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Book a Consultation</DialogTitle>
                    <DialogDescription>
                        Schedule a session with {therapist.name}
                    </DialogDescription>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="booking-steps">
                    {STEPS.map((step, idx) => (
                        <React.Fragment key={idx}>
                            <div className="booking-step">
                                <div
                                    className={`booking-step-circle ${idx === currentStep ? 'active' :
                                            idx < currentStep ? 'completed' : ''
                                        }`}
                                >
                                    {idx < currentStep ? (
                                        <Check className="h-3.5 w-3.5" />
                                    ) : (
                                        idx + 1
                                    )}
                                </div>
                                <span
                                    className={`booking-step-label ${idx === currentStep ? 'active' :
                                            idx < currentStep ? 'completed' : ''
                                        }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                            {idx < STEPS.length - 1 && (
                                <div className={`booking-step-connector ${idx < currentStep ? 'completed' : ''}`} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Therapist Mini-Header */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    {therapist.profileImageUrl ? (
                        <img
                            src={therapist.profileImageUrl}
                            alt={therapist.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{therapist.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{therapist.title} • {therapist.credential}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-yellow-500" />
                        <span className="text-xs font-medium">{therapist.rating.toFixed(1)}</span>
                    </div>
                </div>

                {/* Step Content */}
                <div className="step-content min-h-[200px]" key={currentStep}>
                    {/* Step 0: Choose Type */}
                    {currentStep === 0 && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                How would you like to have your consultation?
                            </p>
                            <div className="grid gap-3">
                                {CONSULTATION_TYPES.map((type) => (
                                    <button
                                        type="button"
                                        key={type.key}
                                        className={`consult-type-card booking-selectable ${consultType === type.key ? 'selected' : ''}`}
                                        aria-pressed={consultType === type.key}
                                        data-selected={consultType === type.key ? 'true' : 'false'}
                                        onClick={() => setConsultType(type.key)}
                                    >
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className={`consult-type-icon ${type.color}`}>
                                                {type.icon}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{type.label}</p>
                                                <p className="text-xs text-muted-foreground">{type.desc}</p>
                                            </div>
                                            {consultType === type.key && (
                                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                                    <Check className="h-3 w-3 text-primary-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Date & Time */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="consult-date" className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    Select Date
                                </Label>
                                <Input
                                    id="consult-date"
                                    type="date"
                                    min={getMinDate()}
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="w-full"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-primary" />
                                    Select Time
                                </Label>
                                <div className="time-slot-grid">
                                    {TIME_SLOTS.map((slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            className={`time-slot-btn booking-selectable ${selectedTime === slot ? 'selected' : ''}`}
                                            aria-pressed={selectedTime === slot}
                                            data-selected={selectedTime === slot ? 'true' : 'false'}
                                            onClick={() => setSelectedTime(slot)}
                                        >
                                            {formatTime(slot)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Details */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Add optional details to help the therapist prepare for your session.
                            </p>

                            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                                <div>
                                    <p className="text-sm font-medium text-primary">Share assessment insights with therapist</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        You can choose whether to send your latest assessment data as a reference.
                                    </p>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="share-assessment-reference"
                                        checked={hasReferralContext && shareReferenceEnabled}
                                        disabled={!hasReferralContext || fallbackShareContextQuery.isLoading}
                                        onCheckedChange={(checked) => {
                                            const enabled = checked === true;
                                            setShareReferenceEnabled(enabled);

                                            if (enabled && !hasShareSelectionEnabled(shareSelection)) {
                                                setShareSelection(getDefaultShareSelection(resolvedSharingContext));
                                            }
                                        }}
                                    />
                                    <Label htmlFor="share-assessment-reference" className="text-sm">
                                        Send data to therapist as reference
                                    </Label>
                                </div>

                                {fallbackShareContextQuery.isLoading && !sharingContext && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        Loading your latest assessment insights...
                                    </div>
                                )}

                                {hasReferralContext ? (
                                    <>
                                        <p className="text-xs text-muted-foreground">
                                            Reference source: {resolvedSharingContext?.assessmentLabel}
                                        </p>

                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="share-score-summary"
                                                    checked={shareSelection.scoreSummary}
                                                    disabled={!shareReferenceEnabled}
                                                    onCheckedChange={(checked) =>
                                                        setShareSelection((prev) => ({ ...prev, scoreSummary: checked === true }))
                                                    }
                                                />
                                                <Label htmlFor="share-score-summary" className="text-sm">Score summary</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="share-trend"
                                                    checked={shareSelection.trend}
                                                    disabled={!shareReferenceEnabled}
                                                    onCheckedChange={(checked) =>
                                                        setShareSelection((prev) => ({ ...prev, trend: checked === true }))
                                                    }
                                                />
                                                <Label htmlFor="share-trend" className="text-sm">Trend over recent assessments</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="share-interpretation"
                                                    checked={shareSelection.interpretation}
                                                    disabled={!shareReferenceEnabled}
                                                    onCheckedChange={(checked) =>
                                                        setShareSelection((prev) => ({ ...prev, interpretation: checked === true }))
                                                    }
                                                />
                                                <Label htmlFor="share-interpretation" className="text-sm">Interpretation summary</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id="share-recommendations"
                                                    checked={shareSelection.recommendations}
                                                    disabled={!shareReferenceEnabled}
                                                    onCheckedChange={(checked) =>
                                                        setShareSelection((prev) => ({ ...prev, recommendations: checked === true }))
                                                    }
                                                />
                                                <Label htmlFor="share-recommendations" className="text-sm">Top recommendations</Label>
                                            </div>
                                        </div>

                                        {shareReferenceEnabled && sharedDataLabels.length === 0 && (
                                            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                                No assessment fields selected. You can still continue without sharing.
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-xs text-muted-foreground bg-background/70 border rounded px-2 py-2">
                                        No completed assessment insights found yet. Complete an assessment first to share reference data.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="consult-phone">
                                    Phone Number <span className="text-xs text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                    id="consult-phone"
                                    type="tel"
                                    maxLength={10}
                                    placeholder="e.g. 9876543210"
                                    value={userPhone}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setUserPhone(val);
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="consult-message">
                                    Reason for Consultation <span className="text-xs text-muted-foreground">(optional)</span>
                                </Label>
                                <Textarea
                                    id="consult-message"
                                    placeholder="Briefly describe what you'd like to discuss or any specific concerns..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {message.length}/500 characters
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Review your consultation details before submitting.
                            </p>

                            <div className="booking-summary">
                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Therapist</span>
                                    <span className="booking-summary-value">{therapist.name}</span>
                                </div>
                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Consultation Type</span>
                                    <span className="booking-summary-value">
                                        {CONSULTATION_TYPES.find(t => t.key === consultType)?.label}
                                    </span>
                                </div>
                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Date</span>
                                    <span className="booking-summary-value">{formatDate(selectedDate)}</span>
                                </div>
                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Time</span>
                                    <span className="booking-summary-value">{formatTime(selectedTime)}</span>
                                </div>
                                {message && (
                                    <div className="booking-summary-row">
                                        <span className="booking-summary-label">Message</span>
                                        <span className="booking-summary-value text-right max-w-[60%] text-xs font-normal">
                                            {message.length > 80 ? message.slice(0, 80) + '...' : message}
                                        </span>
                                    </div>
                                )}
                                {userPhone && (
                                    <div className="booking-summary-row">
                                        <span className="booking-summary-label">Phone</span>
                                        <span className="booking-summary-value">{userPhone}</span>
                                    </div>
                                )}
                                <div className="booking-summary-row">
                                    <span className="booking-summary-label">Sharing</span>
                                    <span className="booking-summary-value text-right max-w-[60%] text-xs font-normal">
                                        {!hasReferralContext
                                            ? (fallbackShareContextQuery.isLoading && !sharingContext
                                                ? 'Checking assessment data...'
                                                : 'No assessment reference available')
                                            : !shareReferenceEnabled
                                                ? `Not sharing (${resolvedSharingContext?.assessmentLabel})`
                                                : sharedDataLabels.length > 0
                                                    ? `${sharedDataLabels.join(', ')} (${resolvedSharingContext?.assessmentLabel})`
                                                    : `No fields selected (${resolvedSharingContext?.assessmentLabel})`}
                                    </span>
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground text-center">
                                By submitting, the therapist will review and confirm your appointment. You&apos;ll be notified once confirmed.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <DialogFooter className="flex justify-between gap-2 sm:justify-between">
                    <Button
                        variant="outline"
                        onClick={currentStep === 0 ? () => handleClose(false) : handleBack}
                        disabled={bookingMutation.isPending}
                    >
                        {currentStep === 0 ? (
                            'Cancel'
                        ) : (
                            <>
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back
                            </>
                        )}
                    </Button>

                    <Button
                        onClick={handleNext}
                        disabled={!canProceed() || bookingMutation.isPending}
                        className={currentStep === 3 ? 'book-cta-btn' : ''}
                    >
                        {bookingMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : currentStep === 3 ? (
                            <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Confirm Booking
                            </>
                        ) : (
                            <>
                                Next
                                <ArrowRight className="h-4 w-4 ml-1" />
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
