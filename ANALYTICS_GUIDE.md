# Analytics Integration Guide

## Overview
The landing page now includes comprehensive analytics tracking to help you understand user behavior and optimize conversion rates.

## Hook Usage

### Basic Import
```typescript
import { useAnalytics } from '../../../hooks/use-analytics';

// In your component
const analytics = useAnalytics();
```

## Available Methods

### 1. Track Custom Events
```typescript
analytics.trackEvent({
  event: 'feature_clicked',
  category: 'engagement',
  label: 'meditation_timer',
  value: 1,
  metadata: {
    duration: '10min',
    location: 'homepage'
  }
});
```

### 2. Track Button Clicks
```typescript
analytics.trackButtonClick('signup_button', 'hero_section');
```

### 3. Track Form Submissions
```typescript
analytics.trackFormSubmit('newsletter_signup', true); // true = success
```

### 4. Track Page Views
```typescript
analytics.trackPageView('/about', 'About Us');
```

### 5. Track Scroll Depth
```typescript
analytics.trackScrollDepth(75); // User scrolled 75% of page
```

## Currently Tracked Events

### Landing Page Events

| Event | Category | Label | Triggered When |
|-------|----------|-------|----------------|
| `button_click` | engagement | `open_start_modal` | User clicks "Start journey" |
| `button_click` | engagement | `open_signup_modal` | User clicks "Create account" |
| `button_click` | engagement | `open_login_modal` | User clicks "Log in" |
| `button_click` | engagement | `open_admin_modal` | User accesses admin login |
| `button_click` | engagement | `google_oauth` | User clicks Google sign-in |
| `form_submit` | conversion | `signup` | User submits signup form |
| `form_submit` | conversion | `login` | User submits login form |
| `form_submit` | conversion | `admin_login` | Admin submits login |
| `scroll_depth` | engagement | `25%` | User scrolls 25% of page |
| `scroll_depth` | engagement | `50%` | User scrolls 50% of page |
| `scroll_depth` | engagement | `75%` | User scrolls 75% of page |
| `scroll_depth` | engagement | `100%` | User scrolls to bottom |

## Integration with Google Analytics

### Setup GA4

1. **Add GA4 to your HTML:**
```html
<!-- In index.html or _document.tsx -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

2. **Replace `GA_MEASUREMENT_ID`** in `use-analytics.ts`:
```typescript
gtag('config', 'YOUR_ACTUAL_GA_ID', {
  page_path: page,
  page_title: title,
});
```

### Setup Mixpanel (Optional)

```typescript
// In use-analytics.ts, uncomment Mixpanel section:
if (typeof window !== 'undefined' && (window as any).mixpanel) {
  (window as any).mixpanel.track(eventData.event, eventData.metadata);
}
```

## Key Metrics to Monitor

### Conversion Funnel
1. **Landing → Modal Open**: Track `open_start_modal` / `open_signup_modal`
2. **Modal → Form Submit**: Track `form_submit` with success/failure
3. **Form → Onboarding**: Track next step after successful auth

### Engagement Metrics
- **Scroll Depth**: How far users scroll (indicates content engagement)
- **Button Clicks**: Which CTAs get the most clicks
- **Time on Page**: Combine with scroll depth for quality score

### Optimization Opportunities

#### A/B Testing Ideas
```typescript
// Track different CTA variations
analytics.trackButtonClick('signup_cta_v1', 'hero'); // "Start your journey"
analytics.trackButtonClick('signup_cta_v2', 'hero'); // "Begin free trial"

// Compare conversion rates
```

#### User Segmentation
```typescript
analytics.trackEvent({
  event: 'user_segment',
  category: 'demographics',
  metadata: {
    source: document.referrer,
    device: device.isMobile ? 'mobile' : 'desktop',
    darkMode: accessibilitySettings.darkMode
  }
});
```

## Dashboard Setup (Google Analytics 4)

### Recommended Custom Events

1. **Goal: Sign-ups**
   - Event: `form_submit`
   - Condition: `label = signup`
   - Value: 1

2. **Goal: 75% Scroll Depth**
   - Event: `scroll_depth`
   - Condition: `label >= 75%`

3. **Engagement Rate**
   - Events: All `button_click` events
   - Filter by `category = engagement`

### Custom Reports

#### Conversion Funnel
```
1. Landing Page View (page_view)
2. Modal Opened (button_click → open_*_modal)
3. Form Started (form_interact)
4. Form Submitted (form_submit)
5. Success (successful_signup)
```

#### Content Engagement
```
- Scroll depth distribution
- Time to first interaction
- Most clicked CTAs
- Exit points
```

## Development Mode

In development, all events are logged to console:
```
📊 Analytics Event: {
  event: 'button_click',
  category: 'engagement',
  label: 'open_signup_modal',
  metadata: { location: 'landing_page' }
}
```

## Best Practices

### 1. Consistent Naming
- Use snake_case for event names
- Use descriptive labels
- Include location context

### 2. Meaningful Metadata
```typescript
// ❌ Bad
analytics.trackButtonClick('btn1', 'top');

// ✅ Good
analytics.trackButtonClick('start_journey_cta', 'hero_section');
```

### 3. Track User Intent
```typescript
// Track what users are trying to do
analytics.trackEvent({
  event: 'feature_interest',
  category: 'discovery',
  label: 'ai_chat_feature',
  metadata: {
    scrolledTo: true,
    timeSpent: 15 // seconds
  }
});
```

### 4. Privacy Compliance
- ✅ No PII (Personally Identifiable Information) in events
- ✅ Use anonymized user IDs
- ✅ Respect Do Not Track settings
- ✅ Include analytics disclosure in privacy policy

## Troubleshooting

### Events not showing in GA4?
1. Check browser console for logs (dev mode)
2. Verify GA4 tracking ID is correct
3. Check GA4 debug mode: `gtag('config', 'GA_ID', { 'debug_mode': true });`
4. Wait 24-48 hours for data to populate

### Console errors?
- Ensure `window.gtag` is defined before using
- Check if analytics script loaded correctly
- Verify event parameters match GA4 schema

## Next Steps

1. **Set up GA4 property** (if not already)
2. **Configure conversion goals**
3. **Create custom dashboards**
4. **Set up automated reports**
5. **Start A/B testing CTAs**
6. **Monitor and iterate**

---

**Pro Tip**: Combine analytics with user session recordings (Hotjar, FullStory) for complete user behavior understanding.
