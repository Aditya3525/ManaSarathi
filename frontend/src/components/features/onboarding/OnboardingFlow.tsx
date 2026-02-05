import { ArrowRight, ArrowLeft, Shield, Heart, Users, CheckCircle, Check, AlertTriangle, X } from 'lucide-react';
import React, { useState } from 'react';

import { useDevice } from '../../../hooks/use-device';
import { setupSecurityQuestion } from '../../../services/auth';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Progress } from '../../ui/progress';
import { RadioGroup, RadioGroupItem } from '../../ui/radio-group';
import { SecurityQuestionSetup } from '../auth/SecurityQuestionSetup';

interface OnboardingFlowProps {
  onComplete: (profileData: {
    approach?: 'western' | 'eastern' | 'hybrid';
    firstName?: string;
    lastName?: string;
    birthday?: string;
    gender?: string;
    region?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
  }) => void;
  user: { 
    name: string; 
    email: string;
    firstName?: string;
    lastName?: string;
    profilePhoto?: string;
    isGoogleUser?: boolean;
  } | null;
  onExit?: () => void;
  onBack?: () => void;
}

interface ProfileData {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  gender?: string;
  region?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  dataConsent: boolean;
  clinicianSharing: boolean;
  currentMood?: string;
  approach?: 'western' | 'eastern' | 'hybrid';
}

export function OnboardingFlow({ onComplete, user, onExit, onBack }: OnboardingFlowProps) {
  // Device detection for responsive behavior
  const device = useDevice();
  const { isMobile, isTablet } = device;
  
  const [currentStep, setCurrentStep] = useState(0);
  const [profileData, setProfileData] = useState<ProfileData>({
    // Pre-fill with Google data if available
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    dataConsent: false,
    clinicianSharing: false,
  });
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [birthdayError, setBirthdayError] = useState<string | null>(null);
  const [securityQuestionSaved, setSecurityQuestionSaved] = useState(false);
  const [securityQuestionError, setSecurityQuestionError] = useState<string | null>(null);
  const [isSavingSecurityQuestion, setIsSavingSecurityQuestion] = useState(false);

  const validateStep1 = () => {
    const errors: {[key: string]: string} = {};
    
    if (!profileData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!profileData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (!profileData.birthday) {
      errors.birthday = 'Birthday is required';
    }
    if (!profileData.gender) {
      errors.gender = 'Gender selection is required';
    }
    if (!profileData.region) {
      errors.region = 'Country/Region is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const totalSteps = 7;
  const progress = ((currentStep) / (totalSteps - 1)) * 100;

  const handleSecurityQuestionComplete = async ({ question, answer }: { question: string; answer: string }) => {
    setSecurityQuestionError(null);
    setIsSavingSecurityQuestion(true);
    try {
      await setupSecurityQuestion({ question, answer });
      setSecurityQuestionSaved(true);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save security question. Please try again.';
      setSecurityQuestionError(message);
    } finally {
      setIsSavingSecurityQuestion(false);
    }
  };

  const validateBirthday = (dateStr: string | undefined) => {
    if (!dateStr) return true; // optional
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      setBirthdayError('Invalid date');
      return false;
    }
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
    if (age < 10 || age > 100) {
      setBirthdayError('Age must be between 10 and 100');
      return false;
    }
    setBirthdayError(null);
    return true;
  };

  const handleNext = () => {
    // Validate birthday on basic profile step
    if (currentStep === 1) {
      const ok = validateBirthday(profileData.birthday);
      if (!ok) return;
      
      if (!validateStep1()) return;
    }
    if (currentStep === totalSteps - 1) {
      // Complete onboarding with all profile data
      const completionData = {
        approach: profileData.approach,
        firstName: profileData.firstName?.trim() || undefined,
        lastName: profileData.lastName?.trim() || undefined,
        birthday: profileData.birthday || undefined,
        gender: profileData.gender || undefined,
        region: profileData.region || undefined,
        emergencyContact: profileData.emergencyContact?.trim() || undefined,
        emergencyPhone: profileData.emergencyPhone?.trim() || undefined
      };
      
      onComplete(completionData);
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: return true; // Welcome step
      case 1: return true; // Basic profile - validation happens in handleNext
      case 2: return profileData.dataConsent; // Safety & consent requires data consent
      case 3: return true; // Emergency contacts optional
      case 4: return profileData.approach !== undefined; // Approach selection required
      case 5: return securityQuestionSaved; // Must save security question before continuing
      case 6: return true; // Mood check optional
      default: return false;
    }
  };

  const handleBackToLanding = () => {
    // Exit - go back to landing page and logout
    const confirmExit = window.confirm('Are you sure you want to exit? You will be logged out and your progress will not be saved.');
    if (!confirmExit) return;
    
    // Use onBack callback if provided (logs out), otherwise fallback to onExit
    if (onBack) {
      onBack();
    } else if (onExit) {
      onExit();
    }
  };

  // Responsive header component
  const renderHeader = () => {
    if (isMobile) {
      // Mobile: Back button, step indicator
      return (
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLanding}
            className="h-9 flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Button>
          
          <div className="text-sm font-medium">
            Step {currentStep + 1}/{totalSteps}
          </div>
          
          {/* Empty div to balance the flex layout */}
          <div className="w-16" />
        </div>
      );
    } else if (isTablet) {
      // Tablet: Back button on left
      return (
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLanding}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      );
    } else {
      // Desktop: Show header with Back
      return (
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToLanding}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      );
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Heart className="h-10 w-10 text-primary" />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl">Welcome, {([user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name)}! 👋</h2>
              <p className="text-muted-foreground text-lg">
                We&apos;re here to support your wellbeing journey. This quick setup will help us personalize your experience.
              </p>
              <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
                <p className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Takes 5-8 minutes to complete
                </p>
                <p className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Your privacy and safety are our top priority
                </p>
                <p className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Complete all steps to get started
                </p>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl">Tell us about yourself</h2>
              <p className="text-muted-foreground">
                Help us personalize your experience (first name, last name, birthday, gender, and country are required)
              </p>
              {user?.isGoogleUser && user.profilePhoto && (
                <div className="flex justify-center mb-4">
                  <img 
                    src={user.profilePhoto} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full border-2 border-primary/20"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Name fields - 1 column on mobile, 2 columns on tablet+ */}
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName || ''}
                    onChange={(e) => {
                      setProfileData(prev => ({ ...prev, firstName: e.target.value }));
                      if (validationErrors.firstName) {
                        setValidationErrors(prev => ({ ...prev, firstName: '' }));
                      }
                    }}
                    placeholder="Your first name"
                    required
                    className={`${validationErrors.firstName ? 'border-red-500' : ''} ${isMobile ? 'h-12 text-base' : ''}`}
                  />
                  {validationErrors.firstName && (
                    <p className="text-sm text-red-600">{validationErrors.firstName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName || ''}
                    onChange={(e) => {
                      setProfileData(prev => ({ ...prev, lastName: e.target.value }));
                      if (validationErrors.lastName) {
                        setValidationErrors(prev => ({ ...prev, lastName: '' }));
                      }
                    }}
                    placeholder="Your last name"
                    required
                    className={`${validationErrors.lastName ? 'border-red-500' : ''} ${isMobile ? 'h-12 text-base' : ''}`}
                  />
                  {validationErrors.lastName && (
                    <p className="text-sm text-red-600">{validationErrors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday">Birthday *</Label>
                <Input
                  id="birthday"
                  type="date"
                  value={profileData.birthday || ''}
                  onChange={(e) => {
                    setProfileData(prev => ({ ...prev, birthday: e.target.value }));
                    if (birthdayError) setBirthdayError(null);
                    if (validationErrors.birthday) {
                      setValidationErrors(prev => ({ ...prev, birthday: '' }));
                    }
                  }}
                  required
                  className={`${(validationErrors.birthday || birthdayError) ? 'border-red-500' : ''} ${isMobile ? 'h-12 text-base' : ''}`}
                />
                {birthdayError && (
                  <p className="text-sm text-red-600">{birthdayError}</p>
                )}
                {validationErrors.birthday && !birthdayError && (
                  <p className="text-sm text-red-600">{validationErrors.birthday}</p>
                )}
              </div>

              <div className="space-y-3">
                <Label>Gender *</Label>
                <RadioGroup 
                  value={profileData.gender || ''} 
                  onValueChange={(value) => {
                    setProfileData(prev => ({ ...prev, gender: value }));
                    if (validationErrors.gender) {
                      setValidationErrors(prev => ({ ...prev, gender: '' }));
                    }
                  }}
                  required
                  className={isMobile ? 'space-y-3' : ''}
                >
                  <div className={`flex items-center space-x-2 ${isMobile ? 'min-h-[48px]' : ''}`}>
                    <RadioGroupItem value="female" id="female" />
                    <Label htmlFor="female" className="cursor-pointer">Female</Label>
                  </div>
                  <div className={`flex items-center space-x-2 ${isMobile ? 'min-h-[48px]' : ''}`}>
                    <RadioGroupItem value="male" id="male" />
                    <Label htmlFor="male" className="cursor-pointer">Male</Label>
                  </div>
                  <div className={`flex items-center space-x-2 ${isMobile ? 'min-h-[48px]' : ''}`}>
                    <RadioGroupItem value="non-binary" id="non-binary" />
                    <Label htmlFor="non-binary" className="cursor-pointer">Non-binary</Label>
                  </div>
                  <div className={`flex items-center space-x-2 ${isMobile ? 'min-h-[48px]' : ''}`}>
                    <RadioGroupItem value="prefer-not-to-say" id="prefer-not-to-say" />
                    <Label htmlFor="prefer-not-to-say" className="cursor-pointer">Prefer not to say</Label>
                  </div>
                </RadioGroup>
                {validationErrors.gender && (
                  <p className="text-sm text-red-600">{validationErrors.gender}</p>
                )}
              </div>

              {/* Country field - Full width on mobile, half on tablet+ */}
              <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                <div className="space-y-2">
                  <Label htmlFor="region">Country / Region *</Label>
                  <select
                    id="region"
                    value={profileData.region || ''}
                    onChange={(e) => {
                      setProfileData(prev => ({ ...prev, region: e.target.value }));
                      if (validationErrors.region) {
                        setValidationErrors(prev => ({ ...prev, region: '' }));
                      }
                    }}
                    className={`border-input flex w-full rounded-md border bg-input-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isMobile ? 'h-12 text-base' : 'h-9'
                    } ${validationErrors.region ? 'border-red-500' : ''}`}
                    required
                  >
                    <option value="">Select country</option>
                    {['India','United States','United Kingdom','Canada','Australia','Germany','France','Spain','Brazil','Japan','Singapore','United Arab Emirates'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {validationErrors.region && (
                    <p className="text-sm text-red-600">{validationErrors.region}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl">Safety & Privacy</h2>
              <p className="text-muted-foreground">
                Your wellbeing and privacy are our highest priorities
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-medium text-red-800">Important Safety Notice</h3>
                    <p className="text-sm text-red-700">
                      This app is designed for general wellbeing support and is not a substitute for professional 
                      medical care. If you&apos;re experiencing a wellbeing crisis or having thoughts of self-harm, 
                      please contact emergency services immediately.
                    </p>
                    <div className="text-sm text-red-700 font-medium">
                      Crisis Hotlines: 988 (US) | Text &quot;HELLO&quot; to 741741
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Select All Button */}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allSelected = profileData.dataConsent && profileData.clinicianSharing;
                      setProfileData(prev => ({ 
                        ...prev, 
                        dataConsent: !allSelected,
                        clinicianSharing: !allSelected
                      }));
                    }}
                    className={isMobile ? 'h-10 text-sm' : 'text-xs'}
                  >
                    {profileData.dataConsent && profileData.clinicianSharing ? (
                      <>
                        <X className="h-3 w-3 mr-1" />
                        Deselect All
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Select All
                      </>
                    )}
                  </Button>
                </div>

                {/* Data Consent Checkbox */}
                <div className={`flex items-start space-x-3 ${isMobile ? 'min-h-[56px] py-2' : ''}`}>
                  <Checkbox
                    id="dataConsent"
                    checked={profileData.dataConsent}
                    onCheckedChange={(checked) => 
                      setProfileData(prev => ({ ...prev, dataConsent: checked as boolean }))
                    }
                    className={isMobile ? 'mt-1' : ''}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="dataConsent" className={`leading-relaxed cursor-pointer ${isMobile ? 'text-base' : 'text-sm'}`}>
                      I understand that my responses will be used to personalize my wellbeing experience. 
                      My data is encrypted, secure, and I can delete it at any time.
                    </Label>
                  </div>
                </div>

                {/* Clinician Sharing Checkbox */}
                <div className={`flex items-start space-x-3 ${isMobile ? 'min-h-[56px] py-2' : ''}`}>
                  <Checkbox
                    id="clinicianSharing"
                    checked={profileData.clinicianSharing}
                    onCheckedChange={(checked) => 
                      setProfileData(prev => ({ ...prev, clinicianSharing: checked as boolean }))
                    }
                    className={isMobile ? 'mt-1' : ''}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="clinicianSharing" className={`leading-relaxed cursor-pointer ${isMobile ? 'text-base' : 'text-sm'}`}>
                      (Optional) Allow me to share anonymized insights with licensed clinicians for 
                      research and improved recommendations.
                    </Label>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Your data is never sold to third parties</p>
                <p>• All personal information is encrypted</p>
                <p>• You can export or delete your data anytime</p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl">Emergency Contact</h2>
              <p className="text-muted-foreground">
                (Optional) Someone we can help you reach in case of emergency
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Contact Name</Label>
                <Input
                  id="emergencyContact"
                  value={profileData.emergencyContact || ''}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergencyContact: e.target.value }))}
                  placeholder="e.g., Mom, Partner, Best Friend"
                  className={isMobile ? 'h-12 text-base' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Phone Number</Label>
                <Input
                  id="emergencyPhone"
                  type="tel"
                  value={profileData.emergencyPhone || ''}
                  onChange={(e) => setProfileData(prev => ({ ...prev, emergencyPhone: e.target.value }))}
                  placeholder="e.g., +1 (555) 123-4567"
                  className={isMobile ? 'h-12 text-base' : ''}
                />
              </div>

              <div className={`bg-muted/50 rounded-lg p-4 text-muted-foreground ${isMobile ? 'text-base' : 'text-sm'}`}>
                <p>
                  We&apos;ll only suggest contacting this person if our AI detects you might be in crisis.
                  You always have full control over whether to reach out.
                </p>
              </div>

              <Button 
                variant="outline" 
                className={`w-full ${isMobile ? 'h-12 text-base' : ''}`}
                onClick={() => {
                  // Clear optional fields then advance to next step
                  setProfileData(prev => ({ 
                    ...prev, 
                    emergencyContact: '', 
                    emergencyPhone: '' 
                  }));
                  setCurrentStep(currentStep + 1);
                }}
              >
                Skip this step
              </Button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl">Choose Your Wellbeing Approach</h2>
              <p className="text-muted-foreground">
                Select the approach that resonates most with you. You can change this anytime.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  id: 'western',
                  title: 'Therapy-Based (Western)',
                  description: 'Focus on evidence-based therapy techniques, cognitive behavioral strategies, and modern psychological approaches.',
                  icon: '🧠',
                  features: ['CBT & DBT techniques', 'Structured assessments', 'Goal-oriented plans', 'Progress tracking']
                },
                {
                  id: 'eastern',
                  title: 'Yoga-Based (Eastern)', 
                  description: 'Emphasize mindfulness, meditation, yoga practices, and ancient wisdom for holistic wellbeing.',
                  icon: '🧘',
                  features: ['Meditation practices', 'Yoga sessions', 'Breathwork', 'Mind-body connection']
                },
                {
                  id: 'hybrid',
                  title: 'Hybrid (Best of Both)',
                  description: 'Combine Western therapy techniques with Eastern practices for a comprehensive, integrated approach.',
                  icon: '⚖️',
                  features: ['Balanced approach', 'Diverse techniques', 'Holistic healing', 'Flexible methods']
                }
              ].map((approach) => (
                <Button
                  key={approach.id}
                  variant="outline"
                  className={`w-full h-auto flex-col items-start text-left space-y-3 break-words whitespace-normal ${
                    isMobile ? 'p-4 min-h-[120px]' : 'p-6'
                  } ${
                    profileData.approach === approach.id 
                      ? 'border-primary bg-primary/5' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    const selectedApproach = approach.id as ProfileData['approach'];
                    setProfileData(prev => ({ ...prev, approach: selectedApproach }));
                    setCurrentStep(currentStep); // Force re-render to ensure layout updates
                  }}
                >
                  <div className="flex items-start gap-3 w-full">
                    <span className={`flex-shrink-0 ${isMobile ? 'text-3xl' : 'text-2xl'}`}>{approach.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-medium ${isMobile ? 'text-base' : 'text-base'}`}>{approach.title}</h3>
                      <p className={`text-muted-foreground mt-1 break-words leading-relaxed ${isMobile ? 'text-sm' : 'text-sm'}`}>{approach.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {approach.features.map((feature) => (
                      <span key={feature} className="text-xs bg-muted px-2 py-1 rounded whitespace-nowrap">
                        {feature}
                      </span>
                    ))}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <SecurityQuestionSetup
              onComplete={handleSecurityQuestionComplete}
              userName={user?.firstName || user?.name}
              isSubmitting={isSavingSecurityQuestion}
              error={securityQuestionError}
              variant="card"
            />
            {!securityQuestionSaved && (
              <p className="text-xs text-muted-foreground">
                We&apos;ll store your question securely before you can continue.
              </p>
            )}
            {securityQuestionSaved && (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm text-primary">
                Security question saved. You can continue with onboarding.
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl">How are you feeling today?</h2>
              <p className="text-muted-foreground">
                This helps us understand your starting point
              </p>
            </div>

            <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {[
                { mood: 'Great', emoji: '😊', color: 'bg-green-100 border-green-200 hover:bg-green-200' },
                { mood: 'Good', emoji: '🙂', color: 'bg-blue-100 border-blue-200 hover:bg-blue-200' },
                { mood: 'Okay', emoji: '😐', color: 'bg-yellow-100 border-yellow-200 hover:bg-yellow-200' },
                { mood: 'Struggling', emoji: '😔', color: 'bg-orange-100 border-orange-200 hover:bg-orange-200' },
                { mood: 'Anxious', emoji: '😰', color: 'bg-red-100 border-red-200 hover:bg-red-200' },
                { mood: 'Not sure', emoji: '🤔', color: 'bg-gray-100 border-gray-200 hover:bg-gray-200' },
              ].map(({ mood, emoji, color }) => (
                <Button
                  key={mood}
                  variant="outline"
                  className={`flex-col gap-2 ${isMobile ? 'h-24' : 'h-20'} ${
                    profileData.currentMood === mood 
                      ? 'border-primary bg-primary/10' 
                      : color
                  }`}
                  onClick={() => setProfileData(prev => ({ ...prev, currentMood: mood }))}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-sm">{mood}</span>
                </Button>
              ))}
            </div>

            <div className="text-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setProfileData(prev => ({ ...prev, currentMood: undefined }));
                  if (currentStep === totalSteps - 1) {
                    // Complete onboarding with all profile data
                    const completionData = {
                      approach: profileData.approach,
                      firstName: profileData.firstName?.trim() || undefined,
                      lastName: profileData.lastName?.trim() || undefined,
                      birthday: profileData.birthday || undefined,
                      gender: profileData.gender || undefined,
                      region: profileData.region || undefined,
                      emergencyContact: profileData.emergencyContact?.trim() || undefined,
                      emergencyPhone: profileData.emergencyPhone?.trim() || undefined
                    };
                    onComplete(completionData);
                  } else {
                    setCurrentStep(currentStep + 1);
                  }
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Prefer not to share
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Mobile sticky bottom action bar
  const renderMobileActions = () => {
    if (!isMobile) return null;

    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t p-4 pb-safe">
        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              className="flex-1 h-12"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
          )}
          
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`h-12 text-base font-medium ${currentStep === 0 ? 'w-full' : 'flex-[2]'}`}
          >
            {currentStep === totalSteps - 1 ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Complete Setup
              </>
            ) : (
              <>
                Next Step
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-background ${isMobile ? 'p-0' : 'p-6'} flex items-center justify-center`}>
      <div className={`w-full ${isMobile ? 'max-w-full' : isTablet ? 'max-w-3xl' : 'max-w-2xl'}`}>
        {/* Header with Back button */}
        {renderHeader()}

        {/* Progress Bar (hidden on mobile - shown in header) */}
        {!isMobile && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Main Content */}
        <Card>
          <CardContent className={`${isMobile ? 'p-4 pb-32' : isTablet ? 'p-6' : 'p-8'}`}>
            {renderStep()}
          </CardContent>
        </Card>

        {/* Desktop/Tablet Navigation (hidden on mobile - using sticky bar) */}
        {!isMobile && (
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              {currentStep === totalSteps - 1 ? 'Complete Setup' : 'Next Step'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Mobile Sticky Bottom Action Bar */}
        {renderMobileActions()}
      </div>
    </div>
  );
}
