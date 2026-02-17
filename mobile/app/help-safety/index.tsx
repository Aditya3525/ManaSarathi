import { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Linking, Alert, RefreshControl, TextInput as RNTextInput, Modal, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Phone, MessageCircle, Globe, Shield, Search, ChevronDown, ChevronUp,
  ThumbsUp, ThumbsDown, MapPin, Star, Mail, Clock, Send, AlertTriangle,
  Heart, HelpCircle, Users, ArrowLeft,
} from 'lucide-react-native';
import { router } from 'expo-router';

import { Text } from '@/components/ui/Text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/Loading';
import { Separator } from '@/components/ui/Separator';
import { crisisApi, faqApi, therapistsApi, supportApi } from '@/services/api';
import { queryKeys } from '@/utils/queryKeys';

type TabKey = 'crisis' | 'faq' | 'therapist' | 'support';

const FAQ_CATEGORIES = ['ALL', 'GENERAL', 'TECHNICAL', 'PRIVACY', 'ASSESSMENTS', 'CHATBOT', 'SAFETY'];

export default function HelpSafetyScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('crisis');

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'crisis', label: t('help.crisis', 'Crisis'), icon: AlertTriangle },
    { key: 'faq', label: t('help.faq', 'FAQ'), icon: HelpCircle },
    { key: 'therapist', label: t('help.therapist', 'Therapist'), icon: Users },
    { key: 'support', label: t('help.support', 'Support'), icon: Mail },
  ];

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pt-12 pb-4 border-b border-gray-200">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3" accessibilityRole="button" accessibilityLabel={t('accessibility.backButton')}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text variant="h2" accessibilityRole="header">{t('help.title', 'Help & Safety')}</Text>
        </View>

        {/* Tab Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {tabs.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  className={`flex-row items-center px-4 py-2 rounded-full ${
                    isActive ? 'bg-primary-600' : 'bg-gray-100'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                >
                  <IconComp size={16} color={isActive ? '#ffffff' : '#6b7280'} />
                  <Text
                    variant="caption"
                    className={`ml-1.5 font-medium ${isActive ? 'text-white' : 'text-gray-600'}`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      {activeTab === 'crisis' && <CrisisTab />}
      {activeTab === 'faq' && <FAQTab />}
      {activeTab === 'therapist' && <TherapistTab />}
      {activeTab === 'support' && <SupportTab />}
    </View>
  );
}

// =============================================================================
// Crisis Resources Tab
// =============================================================================
function CrisisTab() {
  const { t } = useTranslation();

  const { data: resources, isLoading } = useQuery({
    queryKey: queryKeys.crisis.resources(),
    queryFn: async () => {
      const response = await crisisApi.getResources();
      return response.data || [];
    },
  });

  return (
    <ScrollView className="flex-1 px-6 py-4">
      {/* Emergency Banner */}
      <Card className="bg-red-50 border-red-300 mb-4">
        <CardContent className="p-4">
          <View className="flex-row items-center mb-2">
            <AlertTriangle size={20} color="#dc2626" />
            <Text variant="label" className="ml-2 text-red-800">
              {t('help.immediateHelp', 'If you are in immediate danger, call 911')}
            </Text>
          </View>
          <Text variant="caption" className="text-red-700">
            {t('help.crisisDisclaimer', 'This app is not a substitute for professional help. If you or someone you know is in crisis, please reach out.')}
          </Text>
        </CardContent>
      </Card>

      {/* Quick Dial */}
      <View className="gap-3 mb-6">
        <CrisisQuickAction
          title="988 Suicide & Crisis Lifeline"
          subtitle={t('help.call988', 'Call or text 988')}
          icon={Phone}
          color="#dc2626"
          bgColor="#fef2f2"
          onPress={() => Linking.openURL('tel:988')}
          accessibilityLabel={t('accessibility.crisisCall')}
          accessibilityHint={t('help.call988', 'Call or text 988')}
        />
        <CrisisQuickAction
          title="Crisis Text Line"
          subtitle={t('help.textHome', 'Text HOME to 741741')}
          icon={MessageCircle}
          color="#7c3aed"
          bgColor="#f5f3ff"
          onPress={() => Linking.openURL('sms:741741?body=HOME')}
          accessibilityLabel={t('accessibility.crisisText')}
          accessibilityHint={t('help.textHome', 'Text HOME to 741741')}
        />
        <CrisisQuickAction
          title="Emergency Services"
          subtitle={t('help.call911', 'Call 911')}
          icon={Phone}
          color="#dc2626"
          bgColor="#fef2f2"
          onPress={() => Linking.openURL('tel:911')}
          accessibilityLabel={t('accessibility.crisisCall')}
          accessibilityHint={t('help.call911', 'Call 911')}
        />
      </View>

      {/* API Resources */}
      {isLoading ? (
        <LoadingSpinner size="small" />
      ) : (
        <View className="gap-3 mb-6">
          <Text variant="h3" className="mb-1">{t('help.resources', 'Resources')}</Text>
          {(resources as any[])?.map((resource: any, index: number) => (
            <Card key={resource.id || index}>
              <CardContent className="p-4">
                <View className="flex-row items-start justify-between mb-2">
                  <Text variant="label" className="flex-1">{resource.name}</Text>
                  {resource.type && (
                    <Badge variant={resource.type === 'HOTLINE' ? 'danger' : 'default'}>
                      {resource.type}
                    </Badge>
                  )}
                </View>
                {resource.description && (
                  <Text variant="caption" className="text-gray-600 mb-3">
                    {resource.description}
                  </Text>
                )}
                <View className="flex-row gap-2">
                  {resource.phone && (
                    <Button variant="outline" size="sm" onPress={() => Linking.openURL(`tel:${resource.phone}`)}>
                      {t('help.call', 'Call')}
                    </Button>
                  )}
                  {resource.website && (
                    <Button variant="ghost" size="sm" onPress={() => Linking.openURL(resource.website)}>
                      {t('help.website', 'Website')}
                    </Button>
                  )}
                </View>
              </CardContent>
            </Card>
          ))}
        </View>
      )}

      {/* Info Cards */}
      <View className="gap-3 mb-8">
        <InfoCard
          icon={Heart}
          color="#ec4899"
          title={t('help.mentalHealthResources', 'Mental Health Resources')}
          description={t('help.mentalHealthDesc', 'Access curated resources for mental health education and support.')}
        />
        <InfoCard
          icon={Users}
          color="#6366f1"
          title={t('help.supportGroups', 'Support Groups')}
          description={t('help.supportGroupsDesc', 'Connect with peer support groups in your area or online.')}
        />
        <InfoCard
          icon={Shield}
          color="#10b981"
          title={t('help.crisisPrevention', 'Crisis Prevention')}
          description={t('help.crisisPreventionDesc', 'Learn strategies and create a safety plan for difficult times.')}
        />
      </View>
    </ScrollView>
  );
}

function CrisisQuickAction({ title, subtitle, icon: Icon, color, bgColor, onPress, accessibilityLabel, accessibilityHint }: {
  title: string; subtitle: string; icon: any; color: string; bgColor: string; onPress: () => void; accessibilityLabel?: string; accessibilityHint?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel={accessibilityLabel || title} accessibilityHint={accessibilityHint}>
      <Card>
        <CardContent className="p-4 flex-row items-center">
          <View className="rounded-full p-3 mr-4" style={{ backgroundColor: bgColor }}>
            <Icon size={24} color={color} />
          </View>
          <View className="flex-1">
            <Text variant="label" className="mb-0.5">{title}</Text>
            <Text variant="caption" className="text-gray-600">{subtitle}</Text>
          </View>
          <Phone size={20} color={color} />
        </CardContent>
      </Card>
    </TouchableOpacity>
  );
}

function InfoCard({ icon: Icon, color, title, description }: {
  icon: any; color: string; title: string; description: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex-row items-start">
        <View className="rounded-full p-2 mr-3" style={{ backgroundColor: `${color}15` }}>
          <Icon size={20} color={color} />
        </View>
        <View className="flex-1">
          <Text variant="label" className="mb-1">{title}</Text>
          <Text variant="caption" className="text-gray-600">{description}</Text>
        </View>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// FAQ Tab
// =============================================================================
function FAQTab() {
  const { t } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: faqs, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.faq.list(selectedCategory === 'ALL' ? undefined : selectedCategory),
    queryFn: async () => {
      const response = selectedCategory === 'ALL'
        ? await faqApi.getFAQs()
        : await faqApi.getFAQs(selectedCategory);
      return (response.data || []) as any[];
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: queryKeys.faq.search(searchQuery),
    queryFn: async () => {
      const response = await faqApi.searchFAQs(searchQuery);
      return (response.data || []) as any[];
    },
    enabled: searchQuery.length > 2,
  });

  const voteMutation = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      faqApi.voteFAQ(id, helpful),
  });

  const displayFaqs = searchQuery.length > 2 ? searchResults : faqs;

  return (
    <ScrollView
      className="flex-1"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View className="px-6 py-4">
        {/* Search */}
        <View className="bg-gray-100 rounded-xl px-4 py-2 flex-row items-center mb-4">
          <Search size={18} color="#9ca3af" />
          <RNTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('help.searchFAQ', 'Search FAQ...')}
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-base text-gray-900"
          />
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {FAQ_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-full ${
                  selectedCategory === cat ? 'bg-primary-600' : 'bg-gray-100'
                }`}
              >
                <Text
                  variant="caption"
                  className={`font-medium ${selectedCategory === cat ? 'text-white' : 'text-gray-600'}`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* FAQ List */}
        {isLoading ? (
          <LoadingSpinner size="small" />
        ) : (
          <View className="gap-2 mb-8">
            {displayFaqs?.map((faq: any) => (
              <Card key={faq.id}>
                <TouchableOpacity
                  onPress={() => {
                    setExpandedId(expandedId === faq.id ? null : faq.id);
                    if (expandedId !== faq.id) {
                      faqApi.trackFAQView(faq.id);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between">
                      <Text variant="label" className="flex-1 pr-4">{faq.question}</Text>
                      {expandedId === faq.id ? (
                        <ChevronUp size={20} color="#6b7280" />
                      ) : (
                        <ChevronDown size={20} color="#6b7280" />
                      )}
                    </View>
                    {expandedId === faq.id && (
                      <View className="mt-3 pt-3 border-t border-gray-100">
                        <Text variant="body" className="text-gray-700 leading-relaxed mb-3">
                          {faq.answer}
                        </Text>
                        <View className="flex-row items-center gap-3">
                          <Text variant="caption" className="text-gray-500">
                            {t('help.wasHelpful', 'Was this helpful?')}
                          </Text>
                          <TouchableOpacity
                            onPress={() => voteMutation.mutate({ id: faq.id, helpful: true })}
                            className="p-1"
                          >
                            <ThumbsUp size={16} color="#10b981" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => voteMutation.mutate({ id: faq.id, helpful: false })}
                            className="p-1"
                          >
                            <ThumbsDown size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </CardContent>
                </TouchableOpacity>
              </Card>
            ))}
            {displayFaqs?.length === 0 && (
              <View className="items-center py-8">
                <HelpCircle size={48} color="#d1d5db" />
                <Text variant="body" className="text-gray-500 mt-4">
                  {t('help.noFAQs', 'No FAQs found')}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// =============================================================================
// Therapist Tab
// =============================================================================
function TherapistTab() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: therapists, isLoading, refetch, isRefetching } = useQuery({
    queryKey: queryKeys.therapists.lists(),
    queryFn: async () => {
      const response = await therapistsApi.getTherapists();
      return (response.data || []) as any[];
    },
  });

  const { data: searchResults } = useQuery({
    queryKey: queryKeys.therapists.search(searchQuery),
    queryFn: async () => {
      const response = await therapistsApi.searchTherapists(searchQuery);
      return (response.data || []) as any[];
    },
    enabled: searchQuery.length > 2,
  });

  const displayTherapists = searchQuery.length > 2 ? searchResults : therapists;

  return (
    <ScrollView
      className="flex-1"
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View className="px-6 py-4">
        {/* Search */}
        <View className="bg-gray-100 rounded-xl px-4 py-2 flex-row items-center mb-4">
          <Search size={18} color="#9ca3af" />
          <RNTextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('help.searchTherapist', 'Search therapists...')}
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-base text-gray-900"
          />
        </View>

        {isLoading ? (
          <LoadingSpinner size="small" />
        ) : (
          <View className="gap-3 mb-8">
            {displayTherapists?.map((therapist: any) => (
              <TherapistCard key={therapist.id} therapist={therapist} />
            ))}
            {displayTherapists?.length === 0 && (
              <View className="items-center py-8">
                <Users size={48} color="#d1d5db" />
                <Text variant="body" className="text-gray-500 mt-4">
                  {t('help.noTherapists', 'No therapists found')}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function TherapistCard({ therapist }: { therapist: any }) {
  const { t } = useTranslation();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [bookingNote, setBookingNote] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Generate time slots from 09:00 to 17:30 in 30-min increments (matches webapp)
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  const bookMutation = useMutation({
    mutationFn: () => {
      // Combine selected date + time slot
      const bookingDate = new Date(selectedDate);
      if (selectedTimeSlot) {
        const [hours, minutes] = selectedTimeSlot.split(':').map(Number);
        bookingDate.setHours(hours, minutes, 0, 0);
      }
      return therapistsApi.bookTherapist({
        therapistId: therapist.id,
        dateTime: bookingDate.toISOString(),
        duration: 60,
        type: 'initial',
        notes: bookingNote || undefined,
      });
    },
    onSuccess: () => {
      setShowBookingModal(false);
      setSelectedTimeSlot(null);
      setBookingNote('');
      Alert.alert(
        t('help.booked', 'Consultation Requested'),
        t('help.bookedDesc', 'Your consultation request has been sent. The therapist will contact you soon.')
      );
    },
    onError: () => {
      Alert.alert(t('common.error', 'Error'), t('help.bookError', 'Failed to book consultation.'));
    },
  });

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <View className="flex-row items-start mb-3">
            <View className="bg-primary-100 rounded-full w-12 h-12 items-center justify-center mr-3">
              <Text variant="h3" className="text-primary-600">
                {therapist.name?.charAt(0) || '?'}
              </Text>
            </View>
            <View className="flex-1">
              <Text variant="label">{therapist.name}</Text>
              {therapist.credential && (
                <Text variant="caption" className="text-gray-500">{therapist.credential}</Text>
              )}
              {therapist.title && (
                <Text variant="caption" className="text-gray-500">{therapist.title}</Text>
              )}
            </View>
            {therapist.rating && (
              <View className="flex-row items-center">
                <Star size={14} color="#f59e0b" />
                <Text variant="caption" className="ml-1 font-medium">{therapist.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>

          {therapist.bio && (
            <Text variant="body" className="text-gray-700 mb-3" numberOfLines={3}>
              {therapist.bio}
            </Text>
          )}

          {therapist.specialties && therapist.specialties.length > 0 && (
            <View className="flex-row flex-wrap gap-1 mb-3">
              {therapist.specialties.slice(0, 4).map((s: string, i: number) => (
                <View key={i} className="bg-primary-50 px-2 py-0.5 rounded-full">
                  <Text variant="caption" className="text-primary-700">{s}</Text>
                </View>
              ))}
            </View>
          )}

          {therapist.location && (
            <View className="flex-row items-center mb-3">
              <MapPin size={14} color="#6b7280" />
              <Text variant="caption" className="ml-1 text-gray-600">{therapist.location}</Text>
            </View>
          )}

          <View className="flex-row gap-2">
            {therapist.phone && (
              <Button variant="outline" size="sm" onPress={() => Linking.openURL(`tel:${therapist.phone}`)}>
                {t('help.call', 'Call')}
              </Button>
            )}
            {therapist.email && (
              <Button variant="outline" size="sm" onPress={() => Linking.openURL(`mailto:${therapist.email}`)}>
                {t('help.email', 'Email')}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onPress={() => setShowBookingModal(true)}
              disabled={bookMutation.isPending}
            >
              {t('help.bookConsultation', 'Book')}
            </Button>
          </View>
        </CardContent>
      </Card>

      {/* Booking Modal with Date/Time Picker */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View className="flex-1 bg-white">
          <View className="px-6 pt-12 pb-4 border-b border-gray-200 flex-row items-center justify-between">
            <Text variant="h2">{t('help.bookTitle', 'Book Consultation')}</Text>
            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
              <Text variant="body" className="text-primary-600 font-medium">{t('common.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6 py-6">
            {/* Therapist summary */}
            <View className="flex-row items-center mb-6">
              <View className="bg-primary-100 rounded-full w-10 h-10 items-center justify-center mr-3">
                <Text variant="label" className="text-primary-600">
                  {therapist.name?.charAt(0) || '?'}
                </Text>
              </View>
              <View>
                <Text variant="label">{therapist.name}</Text>
                {therapist.credential && (
                  <Text variant="caption" className="text-gray-500">{therapist.credential}</Text>
                )}
              </View>
            </View>

            {/* Date Selection */}
            <Text variant="label" className="mb-2">{t('help.selectDate', 'Select Date')}</Text>
            {Platform.OS === 'ios' ? (
              <View className="bg-gray-50 rounded-xl mb-6 overflow-hidden">
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display="inline"
                  minimumDate={minDate}
                  onChange={handleDateChange}
                />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex-row items-center"
                >
                  <Clock size={18} color="#6b7280" />
                  <Text variant="body" className="ml-3 text-gray-700">
                    {selectedDate.toLocaleDateString(undefined, {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    minimumDate={minDate}
                    onChange={handleDateChange}
                  />
                )}
              </>
            )}

            {/* Time Slot Grid */}
            <Text variant="label" className="mb-2">{t('help.selectTime', 'Select Time')}</Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {timeSlots.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedTimeSlot(slot)}
                  className={`px-4 py-3 rounded-xl border ${
                    selectedTimeSlot === slot
                      ? 'bg-primary-600 border-primary-600'
                      : 'bg-white border-gray-200'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="body"
                    className={selectedTimeSlot === slot ? 'text-white font-medium' : 'text-gray-700'}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Optional Note */}
            <Text variant="label" className="mb-2">{t('help.addNote', 'Add a Note (Optional)')}</Text>
            <RNTextInput
              value={bookingNote}
              onChangeText={setBookingNote}
              placeholder={t('help.notePlaceholder', 'Any specific concerns or preferences...')}
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-base text-gray-900 mb-8"
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />
          </ScrollView>

          {/* Confirm Button */}
          <View className="px-6 py-4 border-t border-gray-200">
            <Button
              variant="primary"
              onPress={() => bookMutation.mutate()}
              disabled={!selectedTimeSlot || bookMutation.isPending}
            >
              {bookMutation.isPending
                ? t('common.loading', 'Loading...')
                : t('help.confirmBooking', 'Confirm Booking')}
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

// =============================================================================
// Support Tab
// =============================================================================
function SupportTab() {
  const { t } = useTranslation();
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const { data: tickets, refetch } = useQuery({
    queryKey: queryKeys.support.tickets(),
    queryFn: async () => {
      const response = await supportApi.getTickets();
      return (response.data || []) as any[];
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => supportApi.createTicket({
      subject,
      message,
      category,
    }),
    onSuccess: () => {
      Alert.alert(
        t('help.ticketCreated', 'Ticket Submitted'),
        t('help.ticketCreatedDesc', 'We have received your request and will get back to you soon.')
      );
      setSubject('');
      setMessage('');
      refetch();
    },
    onError: () => {
      Alert.alert(t('common.error', 'Error'), t('help.ticketError', 'Failed to submit ticket.'));
    },
  });

  const categories = [
    { value: 'general', label: t('help.catGeneral', 'General') },
    { value: 'technical', label: t('help.catTechnical', 'Technical') },
    { value: 'billing', label: t('help.catBilling', 'Billing') },
    { value: 'feedback', label: t('help.catFeedback', 'Feedback') },
  ];

  return (
    <ScrollView className="flex-1">
      <View className="px-6 py-4">
        <Text variant="h3" className="mb-4">{t('help.contactSupport', 'Contact Support')}</Text>

        {/* Category Selector */}
        <Text variant="label" className="mb-2">{t('help.category', 'Category')}</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              onPress={() => setCategory(cat.value)}
              className={`px-4 py-2 rounded-xl ${
                category === cat.value ? 'bg-primary-600' : 'bg-gray-100'
              }`}
            >
              <Text
                variant="caption"
                className={`font-medium ${category === cat.value ? 'text-white' : 'text-gray-600'}`}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Subject */}
        <Text variant="label" className="mb-2">{t('help.subject', 'Subject')}</Text>
        <View className="bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <RNTextInput
            value={subject}
            onChangeText={setSubject}
            placeholder={t('help.subjectPlaceholder', 'Brief description of your issue')}
            placeholderTextColor="#9ca3af"
            className="text-base text-gray-900"
          />
        </View>

        {/* Message */}
        <Text variant="label" className="mb-2">{t('help.message', 'Message')}</Text>
        <View className="bg-gray-100 rounded-xl px-4 py-3 mb-4">
          <RNTextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('help.messagePlaceholder', 'Describe your issue in detail...')}
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            className="text-base text-gray-900"
            style={{ minHeight: 120 }}
          />
        </View>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onPress={() => submitMutation.mutate()}
          disabled={!subject.trim() || !message.trim() || submitMutation.isPending}
          leftIcon={<Send size={18} color="#ffffff" />}
        >
          {t('help.submit', 'Submit Ticket')}
        </Button>

        {/* Previous Tickets */}
        {tickets && tickets.length > 0 && (
          <View className="mt-8">
            <Separator className="mb-4" />
            <Text variant="h3" className="mb-3">{t('help.previousTickets', 'Previous Tickets')}</Text>
            <View className="gap-2 mb-8">
              {tickets.map((ticket: any) => (
                <Card key={ticket.id}>
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between mb-1">
                      <Text variant="label" numberOfLines={1} className="flex-1">{ticket.subject}</Text>
                      <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'}>
                        {ticket.status}
                      </Badge>
                    </View>
                    <Text variant="caption" className="text-gray-500">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </Text>
                  </CardContent>
                </Card>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
