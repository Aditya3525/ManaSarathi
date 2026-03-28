import {
    User,
    Star,
    MapPin,
    Phone,
    Mail,
    ExternalLink,
    Calendar,
    Shield,
    Clock,
    BookOpen,
    CheckCircle2,
} from 'lucide-react';
import React, { useState } from 'react';

import { type Therapist } from '../../../services/helpSafetyApi';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../../ui/dialog';

import { ConsultationBookingDialog } from './ConsultationBookingDialog';
import './booking.css';

interface TherapistProfileDialogProps {
    therapist: Therapist | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function TherapistProfileDialog({
    therapist,
    open,
    onOpenChange,
}: TherapistProfileDialogProps) {
    const [bookingOpen, setBookingOpen] = useState(false);

    if (!therapist) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="sr-only">
                        <DialogTitle>{therapist.name} — Profile</DialogTitle>
                    </DialogHeader>

                    {/* Profile Header */}
                    <div className="therapist-profile-header">
                        <div className="flex items-start gap-4 relative z-10">
                            {therapist.profileImageUrl ? (
                                <img
                                    src={therapist.profileImageUrl}
                                    alt={therapist.name}
                                    className="therapist-profile-avatar"
                                />
                            ) : (
                                <div className="therapist-profile-avatar-placeholder">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-lg font-bold">{therapist.name}</h2>
                                    {therapist.isVerified && (
                                        <Badge variant="default" className="text-xs gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Verified
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {therapist.title} • {therapist.credential}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                    <div className="flex items-center gap-1">
                                        <Star className="h-4 w-4 fill-current text-yellow-500" />
                                        <span className="text-sm font-semibold">{therapist.rating.toFixed(1)}</span>
                                        {therapist.reviewCount > 0 && (
                                            <span className="text-xs text-muted-foreground">
                                                ({therapist.reviewCount} reviews)
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        <span>{therapist.city}, {therapist.state}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            About
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {therapist.bio}
                        </p>
                    </div>

                    {/* Specialties */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            Specializations
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                            {therapist.specialties.map((specialty, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                    {specialty}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Insurance & Fees */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            Insurance & Fees
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-3 rounded-lg bg-muted/50">
                                <p className="text-xs text-muted-foreground mb-0.5">Insurance</p>
                                <p className="font-medium">
                                    {therapist.acceptsInsurance ? 'Accepted' : 'Self-Pay Only'}
                                </p>
                            </div>
                            {therapist.sessionFee != null && (
                                <div className="p-3 rounded-lg bg-muted/50">
                                    <p className="text-xs text-muted-foreground mb-0.5">Session Fee</p>
                                    <p className="font-medium">
                                        ${therapist.sessionFee}
                                        {therapist.offersSliding && (
                                            <span className="text-xs text-muted-foreground ml-1">(Sliding scale)</span>
                                        )}
                                    </p>
                                </div>
                            )}
                            {therapist.insuranceProviders && (
                                <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                                    <p className="text-xs text-muted-foreground mb-0.5">Providers</p>
                                    <p className="font-medium text-xs">{therapist.insuranceProviders}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Experience & Languages */}
                    {(therapist.yearsExperience || therapist.languages) && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-primary" />
                                Experience
                            </h3>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {therapist.yearsExperience != null && (
                                    <div className="p-3 rounded-lg bg-muted/50">
                                        <p className="text-xs text-muted-foreground mb-0.5">Years of Experience</p>
                                        <p className="font-medium">{therapist.yearsExperience}+ years</p>
                                    </div>
                                )}
                                {therapist.languages && (
                                    <div className="p-3 rounded-lg bg-muted/50">
                                        <p className="text-xs text-muted-foreground mb-0.5">Languages</p>
                                        <p className="font-medium">{therapist.languages}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Contact */}
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold">Contact</h3>
                        <div className="flex flex-wrap gap-2">
                            {therapist.phone && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`tel:${therapist.phone}`)}
                                >
                                    <Phone className="h-3 w-3 mr-1" />
                                    {therapist.phone}
                                </Button>
                            )}
                            {therapist.email && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`mailto:${therapist.email}`)}
                                >
                                    <Mail className="h-3 w-3 mr-1" />
                                    Email
                                </Button>
                            )}
                            {therapist.website && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(therapist.website!, '_blank')}
                                >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    Website
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Book CTA */}
                    <Button
                        className="w-full book-cta-btn"
                        size="lg"
                        onClick={() => {
                            onOpenChange(false);
                            setTimeout(() => setBookingOpen(true), 200);
                        }}
                    >
                        <Calendar className="h-4 w-4 mr-2" />
                        Book a Consultation
                    </Button>
                </DialogContent>
            </Dialog>

            {/* Booking Dialog */}
            <ConsultationBookingDialog
                therapist={therapist}
                open={bookingOpen}
                onOpenChange={setBookingOpen}
            />
        </>
    );
}
