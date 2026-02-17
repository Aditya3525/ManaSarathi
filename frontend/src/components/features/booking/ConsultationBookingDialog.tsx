import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../../ui/dialog';
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
import { Badge } from '../../ui/badge';
import { therapistApi, type Therapist } from '../../../services/helpSafetyApi';
import { useToast } from '../../../contexts/ToastContext';
import './booking.css';

interface ConsultationBookingDialogProps {
    therapist: Therapist | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
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

export function ConsultationBookingDialog({
    therapist,
    open,
    onOpenChange,
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

    const resetState = () => {
        setCurrentStep(0);
        setConsultType(null);
        setSelectedDate('');
        setSelectedTime('');
        setMessage('');
        setUserPhone('');
        setBookingSuccess(false);
    };

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

        const fullMessage = [
            `Consultation Type: ${CONSULTATION_TYPES.find(t => t.key === consultType)?.label || consultType}`,
            message ? `\nMessage: ${message}` : ''
        ].join('');

        bookingMutation.mutate({
            therapistId: therapist.id,
            preferredDate: selectedDate,
            preferredTime: selectedTime,
            message: fullMessage || undefined,
            userPhone: userPhone || undefined,
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
                                You'll receive a notification once the therapist confirms your appointment.
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
                                    <div
                                        key={type.key}
                                        className={`consult-type-card ${consultType === type.key ? 'selected' : ''}`}
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
                                    </div>
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
                                            className={`time-slot-btn ${selectedTime === slot ? 'selected' : ''}`}
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

                            <div className="space-y-2">
                                <Label htmlFor="consult-phone">
                                    Phone Number <span className="text-xs text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                    id="consult-phone"
                                    type="tel"
                                    placeholder="e.g. +1 (555) 123-4567"
                                    value={userPhone}
                                    onChange={(e) => setUserPhone(e.target.value)}
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
                            </div>

                            <p className="text-xs text-muted-foreground text-center">
                                By submitting, the therapist will review and confirm your appointment. You'll be notified once confirmed.
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
