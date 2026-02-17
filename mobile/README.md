# MaanSarathi Mobile App

A React Native + Expo mobile application for mental wellbeing, built as a companion to the existing web application.

## 🏗️ Architecture

- **Framework**: React Native with Expo SDK 52+
- **Routing**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **i18n**: i18next + expo-localization
- **Auth**: expo-secure-store + expo-local-authentication (biometric)
- **Charts**: Victory Native

## 📁 Project Structure

```
mobile/
├── app/                    # Expo Router - file-based routing
│   ├── _layout.tsx         # Root layout with providers
│   ├── index.tsx           # Entry point & auth redirect
│   ├── (auth)/             # Auth screens (login, register, etc.)
│   ├── (onboarding)/       # Onboarding flow
│   └── (tabs)/             # Main app with bottom tabs
├── components/
│   ├── ui/                 # Base UI components (Button, Card, Input, etc.)
│   ├── features/           # Feature-specific components
│   └── layout/             # Layout components
├── services/
│   ├── api.ts              # REST API client (adapted from web)
│   └── auth.ts             # Auth helpers with biometric support
├── stores/
│   ├── authStore.ts        # User authentication state
│   ├── appStore.ts         # App state (theme, network, modals)
│   └── notificationStore.ts # Toast notifications
├── hooks/                  # Custom React hooks
├── contexts/               # React contexts
├── types/                  # TypeScript type definitions
├── utils/
│   ├── storage.ts          # SecureStore & AsyncStorage wrappers
│   ├── queryKeys.ts        # React Query key factories
│   ├── linking.ts          # Deep linking helpers
│   └── cn.ts               # Tailwind class utility
├── i18n/
│   ├── config.ts           # i18n setup with expo-localization
│   └── locales/            # Translation files (en, hi, es, fr, de, zh)
├── constants/
│   ├── config.ts           # App configuration
│   └── theme.ts            # Theme tokens & design system
└── assets/                 # Images, fonts, icons
```

## 🔑 Key Adaptations from Web

### Token Management
- **Web**: Synchronous `localStorage.getItem('token')`
- **Mobile**: Async `await SecureStore.getItemAsync('token')`
- All API requests now use `await TokenManager.getAuthHeaders()`

### Storage
- **Sensitive data** (tokens, user data): `expo-secure-store` (encrypted)
- **App settings**: `@react-native-async-storage/async-storage`

### Network Detection
- **Web**: `window.addEventListener('online'/'offline')`
- **Mobile**: `@react-native-community/netinfo`

### Navigation
- **Web**: Custom page state in appStore
- **Mobile**: Expo Router with file-based routing

### Styles
- **Web**: Tailwind CSS classes on HTML elements
- **Mobile**: NativeWind classes on React Native components

### Charts
- **Web**: Recharts
- **Mobile**: Victory Native

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
cd mobile
npm install
```

### Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_API_URL=http://localhost:5000/api
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_APP_NAME=MaanSarathi
```

### Development

```bash
# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Clear cache and restart
npm run reset
```

### Build

```bash
# Development build
eas build --profile development --platform android

# Production build
eas build --profile production --platform all
```

## 📦 Dependencies

### Core
- `expo` - Expo SDK
- `react-native` - React Native
- `expo-router` - File-based routing
- `typescript` - Type safety

### UI & Styling
- `nativewind` - Tailwind for RN
- `react-native-reanimated` - Animations
- `react-native-gesture-handler` - Gestures
- `lucide-react-native` - Icons
- `react-native-svg` - SVG support
- `victory-native` - Charts

### State & Data
- `zustand` - State management
- `@tanstack/react-query` - Server state
- `react-hook-form` - Forms
- `zod` - Validation
- `date-fns` - Date utilities

### i18n
- `i18next` - Internationalization
- `react-i18next` - React bindings
- `expo-localization` - Device locale

### Auth & Security
- `expo-secure-store` - Encrypted storage
- `expo-local-authentication` - Biometric auth
- `expo-auth-session` - OAuth flows
- `expo-web-browser` - OAuth browser
- `expo-crypto` - Cryptography

### Native Features
- `expo-notifications` - Push notifications
- `expo-haptics` - Haptic feedback
- `expo-image-picker` - Image selection
- `expo-av` - Audio/Video
- `expo-file-system` - File operations
- `expo-sharing` - Share functionality
- `expo-clipboard` - Clipboard access
- `@react-native-community/netinfo` - Network status

### UI Components
- `@gorhom/bottom-sheet` - Bottom sheets
- `react-native-toast-message` - Toasts
- `react-native-markdown-display` - Markdown
- `react-native-keyboard-aware-scroll-view` - Keyboard handling

## 🔐 Security

- JWT tokens stored in `expo-secure-store` (encrypted)
- Biometric authentication support (Face ID / Touch ID)
- Secure password reset flow
- Security question setup
- No sensitive data in AsyncStorage

## 🌍 Internationalization

Supports 6 languages:
- English (en)
- Hindi (hi)
- Spanish (es)
- French (fr)
- German (de)
- Chinese (zh)

Automatically detects device language, with fallback to English.

## 📱 Features

### Implemented (Phase 1 & 2)
- ✅ Project scaffolding with Expo
- ✅ NativeWind configuration
- ✅ Complete API client with async token management
- ✅ Secure storage (tokens, user data)
- ✅ Biometric authentication support
- ✅ State management (Zustand)
- ✅ i18n with 6 languages
- ✅ Base UI components
- ✅ Root layout with providers
- ✅ Network status monitoring

### To Be Implemented (Phase 3+)
- 🔲 Auth screens (login, register, OAuth)
- 🔲 Onboarding flow
- 🔲 Dashboard with mood tracking
- 🔲 Assessment flows
- 🔲 AI Chatbot
- 🔲 Content library
- 🔲 Guided practices
- 🔲 Personalized plans
- 🔲 Profile & settings
- 🔲 Help & safety resources
- 🔲 Push notifications

## 🔗 Backend Integration

The mobile app connects to the same backend API as the web app over HTTP. No backend code changes are required - the mobile app is just another REST API client.

**API Base URL**: Configured in `.env` as `EXPO_PUBLIC_API_URL`

## 📝 Notes

- **100% self-contained**: No imports from `/frontend` or `/backend`
- **Shared backend**: Uses the same REST API as the web app
- **Separate codebase**: Independent `package.json`, `node_modules`, configs
- **Type safety**: All types copied and adapted from web app
- **Mobile-first**: Native components and patterns throughout

## 🐛 Debugging

```bash
# View logs
expo start --dev-client

# Clear cache
expo start --clear

# Reset project
npm run reset

# Type check
npm run type-check
```

## 📄 License

Same as the main project.
