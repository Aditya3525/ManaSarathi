import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  AlertTriangle,
  Heart,
  Users,
  Clock,
  Search,
  Send,
  MapPin,
  Star,
  ExternalLink,
  HelpCircle,
  Shield,
  BookOpen,
  Video,
  Mail,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  User,
  CalendarCheck
} from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '../../contexts/ToastContext';
import {
  crisisResourcesApi,
  faqApi,
  therapistApi,
  supportTicketsApi,
  type CrisisResource,
  type FAQ,
  type Therapist,
  type FAQCategory,
  type TicketCategory,
  type TherapistBooking
} from '../../services/helpSafetyApi';
import { ConsultationBookingDialog } from '../features/booking/ConsultationBookingDialog';
import { MyBookings } from '../features/booking/MyBookings';
import { TherapistProfileDialog } from '../features/booking/TherapistProfileDialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Textarea } from '../ui/textarea';

interface HelpSafetyProps {
  onNavigate: (page: string) => void;
  userRegion?: string;
}

export function HelpSafety({ onNavigate, userRegion }: HelpSafetyProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [faqSearchQuery, setFaqSearchQuery] = useState('');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketCategory, setTicketCategory] = useState<TicketCategory>('GENERAL');
  const [selectedSpecialty, setSelectedSpecialty] = useState('all');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<FAQCategory | 'all'>('all');
  const { push } = useToast();
  const queryClient = useQueryClient();

  // Therapist profile & booking state
  const [profileTherapist, setProfileTherapist] = useState<Therapist | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [bookingTherapist, setBookingTherapist] = useState<Therapist | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [therapistSubTab, setTherapistSubTab] = useState<'find' | 'bookings'>('find');

  // Fetch crisis resources
  const { data: crisisResources = [], isLoading: loadingCrisis } = useQuery({
    queryKey: ['crisisResources', userRegion],
    queryFn: () => crisisResourcesApi.getAll(userRegion)
  });

  // Fetch FAQs
  const { data: allFaqs = [], isLoading: loadingFaqs } = useQuery({
    queryKey: ['faqs', selectedFaqCategory],
    queryFn: () => faqApi.getAll(selectedFaqCategory === 'all' ? undefined : selectedFaqCategory)
  });

  // Fetch therapists
  const { data: therapists = [], isLoading: loadingTherapists } = useQuery({
    queryKey: ['therapists', selectedSpecialty],
    queryFn: () => therapistApi.getAll(
      selectedSpecialty === 'all' ? undefined : { specialty: selectedSpecialty }
    )
  });

  // Create support ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: supportTicketsApi.create,
    onSuccess: () => {
      push({
        type: 'success',
        title: 'Ticket Submitted',
        description: 'Your support request has been received. We\'ll respond within 24 hours.',
      });
      setTicketSubject('');
      setTicketMessage('');
      setTicketCategory('GENERAL');
    },
    onError: () => {
      push({
        type: 'error',
        title: 'Error',
        description: 'Failed to submit ticket. Please try again.',
      });
    }
  });

  // FAQ vote mutation
  const voteOnFaqMutation = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      faqApi.vote(id, helpful),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      push({
        type: 'success',
        title: 'Thanks for your feedback!',
        description: 'Your vote helps us improve our content.',
      });
    }
  });

  // Booking helper: open booking dialog directly for a therapist
  const handleRequestConsultation = (therapist: Therapist) => {
    setBookingTherapist(therapist);
    setBookingOpen(true);
  };

  // Profile helper: open therapist profile
  const handleViewProfile = (therapist: Therapist) => {
    setProfileTherapist(therapist);
    setProfileOpen(true);
  };

  // Filter FAQs by search query
  const filteredFAQs = allFaqs.filter(faq =>
    faq.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(faqSearchQuery.toLowerCase())
  );

  // Get unique specialties from therapists
  const allSpecialties = Array.from(
    new Set(therapists.flatMap(t => t.specialties))
  );
  const specialties = ['all', ...allSpecialties];

  // Filter therapists by specialty
  const filteredTherapists = selectedSpecialty === 'all'
    ? therapists
    : therapists.filter(therapist => therapist.specialties.includes(selectedSpecialty));

  // FAQ categories
  const faqCategories: Array<FAQCategory | 'all'> = [
    'all', 'GENERAL', 'TECHNICAL', 'PRIVACY', 'BILLING', 'ASSESSMENTS', 'CHATBOT', 'SAFETY'
  ];

  const handleTicketSubmit = () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      push({
        type: 'error',
        title: 'Validation Error',
        description: 'Please fill in both subject and message.',
      });
      return;
    }

    if (ticketSubject.length < 5 || ticketSubject.length > 200) {
      push({
        type: 'error',
        title: 'Validation Error',
        description: 'Subject must be between 5 and 200 characters.',
      });
      return;
    }

    if (ticketMessage.length < 20 || ticketMessage.length > 5000) {
      push({
        type: 'error',
        title: 'Validation Error',
        description: 'Message must be between 20 and 5000 characters.',
      });
      return;
    }

    createTicketMutation.mutate({
      subject: ticketSubject,
      message: ticketMessage,
      category: ticketCategory
    });
  };

  const handleFaqVote = (faqId: string, helpful: boolean) => {
    voteOnFaqMutation.mutate({ id: faqId, helpful });
  };

  const handleFaqClick = (faqId: string) => {
    // Record view when FAQ is expanded
    faqApi.recordView(faqId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Crisis Banner - Always Visible */}
      <div className="bg-red-600 text-white p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <div>
              <p className="font-semibold">If you are in immediate danger or having thoughts of self-harm:</p>
              <p className="text-sm">Call 988 (US) • Text HOME to 741741 • Call 911 for emergencies</p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() => window.open('tel:988')}
            className="bg-white text-red-600 hover:bg-gray-100"
          >
            <Phone className="h-4 w-4 mr-2" />
            Call 988
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate('dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <h1 className="text-2xl sm:text-3xl">Help & Safety</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Resources, support, and answers to help you on your wellbeing journey
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <Tabs defaultValue="crisis" className="space-y-6">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full justify-start gap-1 sm:grid sm:w-full sm:grid-cols-4">
              <TabsTrigger value="crisis" className="flex-shrink-0 px-3 min-h-[44px] sm:px-2">Crisis Resources</TabsTrigger>
              <TabsTrigger value="faq" className="flex-shrink-0 px-3 min-h-[44px] sm:px-2">FAQ</TabsTrigger>
              <TabsTrigger value="therapists" className="flex-shrink-0 px-3 min-h-[44px] sm:px-2">Find Therapist</TabsTrigger>
              <TabsTrigger value="support" className="flex-shrink-0 px-3 min-h-[44px] sm:px-2">Contact Support</TabsTrigger>
            </TabsList>
          </div>

          {/* Crisis Resources Tab */}
          <TabsContent value="crisis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Immediate Crisis Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  If you or someone you know is in immediate danger, please don't wait.
                  Reach out for professional help right away.
                </p>

                {loadingCrisis ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {crisisResources.map((resource) => (
                      <Card key={resource.id} className={`border-2 ${resource.type === 'HOTLINE' ? 'border-red-200 bg-red-50' :
                        resource.type === 'TEXT' ? 'border-orange-200 bg-orange-50' :
                          'border-blue-200 bg-blue-50'
                        }`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{resource.name}</h3>
                            <div className="flex gap-2">
                              {resource.available24x7 && (
                                <Badge variant="secondary" className="text-xs">
                                  24/7
                                </Badge>
                              )}
                              <Badge variant={
                                resource.type === 'HOTLINE' ? 'destructive' :
                                  resource.type === 'TEXT' ? 'secondary' : 'default'
                              }>
                                {resource.type}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {resource.description}
                          </p>

                          {resource.languages && resource.languages.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Languages: {resource.languages.join(', ')}
                            </p>
                          )}

                          <div className="flex flex-col gap-2">
                            {resource.phone && (
                              <Button
                                size="sm"
                                onClick={() => window.open(`tel:${resource.phone}`)}
                                className="w-full"
                              >
                                <Phone className="h-4 w-4 mr-2" />
                                Call {resource.phone}
                              </Button>
                            )}
                            {resource.sms && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(`sms:${resource.sms}`)}
                                className="w-full"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Text {resource.sms}
                              </Button>
                            )}
                            {resource.website && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(resource.website!, '_blank')}
                                className="w-full"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Visit Website
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Resources */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <Heart className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold">Mental Health Resources</h3>
                  <p className="text-sm text-muted-foreground">
                    Educational materials and self-help resources for various mental health topics
                  </p>
                  <Button variant="outline" size="sm">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Browse Resources
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <Users className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold">Support Groups</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect with others who understand your journey through peer support groups
                  </p>
                  <Button variant="outline" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Find Groups
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center space-y-3">
                  <Video className="h-8 w-8 text-primary mx-auto" />
                  <h3 className="font-semibold">Crisis Prevention</h3>
                  <p className="text-sm text-muted-foreground">
                    Learn warning signs and develop a personal safety plan for difficult times
                  </p>
                  <Button variant="outline" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Create Plan
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Frequently Asked Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2">
                    {faqCategories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedFaqCategory === category ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedFaqCategory(category)}
                        className="capitalize"
                      >
                        {category === 'all' ? 'All' : category.replace('_', ' ').toLowerCase()}
                      </Button>
                    ))}
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground cursor-pointer"
                      onClick={(e) => {
                        const input = e.currentTarget.parentElement?.querySelector('input');
                        input?.focus();
                        input?.select();
                      }}
                    />
                    <Input
                      placeholder={t('help.searchFAQ')}
                      value={faqSearchQuery}
                      onChange={(e) => setFaqSearchQuery(e.target.value)}
                      className="pr-12"
                    />
                  </div>

                  {loadingFaqs ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <>
                      <Accordion type="single" collapsible className="space-y-2">
                        {filteredFAQs.map((faq) => (
                          <AccordionItem
                            key={faq.id}
                            value={faq.id}
                            className="border rounded-lg px-4"
                            onClick={() => handleFaqClick(faq.id)}
                          >
                            <AccordionTrigger className="text-left">
                              <div className="flex items-center justify-between w-full pr-4">
                                <span>{faq.question}</span>
                                <Badge variant="outline" className="ml-2">
                                  {faq.category}
                                </Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3">
                              <p className="text-muted-foreground leading-relaxed">
                                {faq.answer}
                              </p>
                              {faq.tags && (
                                <div className="flex flex-wrap gap-1">
                                  {faq.tags.split(',').map((tag, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {tag.trim()}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center gap-4 pt-2 border-t">
                                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFaqVote(faq.id, true);
                                    }}
                                    disabled={voteOnFaqMutation.isPending}
                                  >
                                    <ThumbsUp className="h-3 w-3 mr-1" />
                                    Yes ({faq.helpful})
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleFaqVote(faq.id, false);
                                    }}
                                    disabled={voteOnFaqMutation.isPending}
                                  >
                                    <ThumbsDown className="h-3 w-3 mr-1" />
                                    No ({faq.notHelpful})
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>

                      {filteredFAQs.length === 0 && (
                        <div className="text-center py-8">
                          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No results found</h3>
                          <p className="text-muted-foreground">
                            Try different search terms or contact support for personalized help.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Therapist Directory Tab */}
          <TabsContent value="therapists" className="space-y-6">
            {/* Sub-tab toggle: Find Therapist / My Bookings */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="therapist-sub-tabs">
                <button
                  className={`therapist-sub-tab ${therapistSubTab === 'find' ? 'active' : ''}`}
                  onClick={() => setTherapistSubTab('find')}
                >
                  <Users className="h-3.5 w-3.5 inline mr-1.5" />
                  Find Therapist
                </button>
                <button
                  className={`therapist-sub-tab ${therapistSubTab === 'bookings' ? 'active' : ''}`}
                  onClick={() => setTherapistSubTab('bookings')}
                >
                  <CalendarCheck className="h-3.5 w-3.5 inline mr-1.5" />
                  My Bookings
                </button>
              </div>
            </div>

            {/* My Bookings Sub-Tab */}
            {therapistSubTab === 'bookings' && (
              <Card>
                <CardContent className="p-6">
                  <MyBookings />
                </CardContent>
              </Card>
            )}

            {/* Find Therapist Sub-Tab */}
            {therapistSubTab === 'find' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      Find a Licensed Therapist
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-muted-foreground">
                        Connect with licensed professionals in your area.
                        This directory includes verified therapists who specialize in various areas.
                      </p>

                      {/* Specialty Filter */}
                      <div className="space-y-2">
                        <span className="text-sm font-medium">Specialty:</span>
                        <div className="flex flex-wrap gap-2">
                          {specialties.map((specialty) => (
                            <Button
                              key={specialty}
                              variant={selectedSpecialty === specialty ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedSpecialty(specialty)}
                              className="capitalize"
                            >
                              {specialty}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Therapist Cards */}
                {loadingTherapists ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredTherapists.map((therapist) => (
                      <Card key={therapist.id} className="cursor-pointer transition-all hover:shadow-md hover:border-primary/20" onClick={() => handleViewProfile(therapist)}>
                        <CardContent className="p-6">
                          <div className="flex gap-4">
                            {therapist.profileImageUrl ? (
                              <img
                                src={therapist.profileImageUrl}
                                alt={therapist.name}
                                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-muted rounded-full flex-shrink-0 flex items-center justify-center">
                                <Users className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}

                            <div className="flex-1 space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{therapist.name}</h3>
                                    {therapist.isVerified && (
                                      <Badge variant="default" className="text-xs">
                                        Verified
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {therapist.title} • {therapist.credential}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                                      <span className="text-sm">{therapist.rating.toFixed(1)}</span>
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

                                <Badge variant={therapist.acceptsInsurance ? 'default' : 'secondary'}>
                                  {therapist.acceptsInsurance ? 'Insurance Accepted' : 'Self-Pay'}
                                </Badge>
                              </div>

                              <p className="text-sm text-muted-foreground">
                                {therapist.bio}
                              </p>

                              <div className="flex flex-wrap gap-1">
                                {therapist.specialties.map((specialty, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {specialty}
                                  </Badge>
                                ))}
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex gap-2">
                                  {therapist.phone && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(`tel:${therapist.phone}`)}
                                    >
                                      <Phone className="h-3 w-3 mr-1" />
                                      Call
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

                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestConsultation(therapist);
                                  }}
                                  className="book-cta-btn"
                                >
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Request Consultation
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {filteredTherapists.length === 0 && (
                      <Card>
                        <CardContent className="p-6 text-center">
                          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No therapists found</h3>
                          <p className="text-muted-foreground mb-4">
                            Try adjusting your filters or contact support for help finding a therapist.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Can't find what you're looking for? We can help you find additional therapists in your area.
                    </p>
                    <Button variant="outline">
                      <Phone className="h-4 w-4 mr-2" />
                      Request Therapist Referral
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* Contact Support Tab */}
          <TabsContent value="support" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-primary" />
                    Contact Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground">
                    Need help with the app or have questions about your wellbeing journey?
                    Our support team is here to help.
                  </p>

                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={ticketCategory}
                        onChange={(e) => setTicketCategory(e.target.value as TicketCategory)}
                      >
                        <option value="GENERAL">General Inquiry</option>
                        <option value="TECHNICAL">Technical Issue</option>
                        <option value="ACCOUNT">Account Problem</option>
                        <option value="BILLING">Billing Question</option>
                        <option value="FEEDBACK">Feedback / Feature Idea</option>
                        <option value="CRISIS">Crisis Support</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject</label>
                      <Input
                        type="text"
                        placeholder="Brief summary of your issue"
                        value={ticketSubject}
                        onChange={(e) => setTicketSubject(e.target.value)}
                        className={ticketSubject.length > 0 && ticketSubject.length < 5 ? 'border-destructive' : ''}
                      />
                      <p className="text-xs text-muted-foreground">
                        {ticketSubject.length}/200 characters (minimum 5)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Your Message</label>
                      <Textarea
                        placeholder="Describe your question or issue in detail..."
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        rows={4}
                        className={ticketMessage.length > 0 && ticketMessage.length < 20 ? 'border-destructive' : ''}
                      />
                      <p className="text-xs text-muted-foreground">
                        {ticketMessage.length}/5000 characters (minimum 20)
                      </p>
                    </div>

                    <Button
                      onClick={handleTicketSubmit}
                      disabled={createTicketMutation.isPending}
                      className="w-full"
                    >
                      {createTicketMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    We typically respond within 24 hours. For urgent issues, please use the crisis resources above.
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Other Ways to Reach Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Email Support</p>
                        <p className="text-sm text-muted-foreground">support@wellbeingai.com</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <MessageSquare className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Live Chat</p>
                        <p className="text-sm text-muted-foreground">Available Mon-Fri, 9AM-6PM PST</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Help Center</p>
                        <p className="text-sm text-muted-foreground">Comprehensive guides and tutorials</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      <strong>Response Times:</strong><br />
                      • General inquiries: Within 24 hours<br />
                      • Technical issues: Within 12 hours<br />
                      • Account problems: Within 6 hours
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Therapist Profile Dialog */}
      <TherapistProfileDialog
        therapist={profileTherapist}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />

      {/* Consultation Booking Dialog */}
      <ConsultationBookingDialog
        therapist={bookingTherapist}
        open={bookingOpen}
        onOpenChange={setBookingOpen}
      />
    </div>
  );
}
