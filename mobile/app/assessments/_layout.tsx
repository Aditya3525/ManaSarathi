import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function AssessmentsLayout() {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTintColor: '#1f2937',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          title: t('assessments.title', 'Assessments'),
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: t('assessments.takeAssessment', 'Take Assessment'),
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="result" 
        options={{ 
          title: t('assessments.results', 'Results'),
          headerBackTitle: t('nav.back', 'Back'),
          headerLeft: () => null,
        }} 
      />
      <Stack.Screen 
        name="selection" 
        options={{ 
          title: t('assessments.overallTitle', 'Overall Assessment'),
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="combined" 
        options={{ 
          title: t('assessments.combinedFlow', 'Combined Assessment'),
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
      <Stack.Screen 
        name="insights" 
        options={{ 
          title: t('assessments.insights', 'Insights & History'),
          headerBackTitle: t('nav.back', 'Back'),
        }} 
      />
    </Stack>
  );
}
