# MaanSarathi - Frontend

React + Vite frontend application for the MaanSarathi wellbeing platform.

## Tech Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Full type safety and better developer experience
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icons

## Project Structure

```
src/
├── components/
│   ├── features/           # Feature-specific components
│   │   ├── auth/          # Authentication (LandingPage, OAuthCallback)
│   │   ├── assessment/    # Wellbeing assessments
│   │   ├── chat/          # AI chatbot interface
│   │   ├── content/       # Content library & practices
│   │   ├── dashboard/     # Main dashboard
│   │   ├── onboarding/    # User onboarding flow
│   │   ├── plans/         # Personalized wellness plans
│   │   └── profile/       # User profile & progress tracking
│   ├── layout/            # Layout components (HelpSafety)
│   ├── common/            # Shared components (ImageWithFallback)
│   └── ui/                # Base UI components (buttons, cards, etc.)
├── services/              # API services and authentication
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── types/                 # TypeScript type definitions
├── utils/                 # Helper functions
├── styles/                # Global styles and CSS
└── assets/                # Images, icons, static files
```

## Key Features

### Wellbeing Components
- **Assessment Flow**: Multi-step wellbeing evaluations with scientific scoring
- **Basic Overall Assessment**: Dedicated dashboard card with one-click combined screening, retake, and quick access to the latest wellness results
- **Personalized Plans**: Adaptive wellness content based on user assessments
- **Progress Tracking**: Visual charts and metrics for wellbeing journey
- **AI Chatbot**: 24/7 emotional support with crisis detection

### Authentication
- **Email/Password**: Traditional authentication with password validation
- **Google OAuth**: Seamless social login integration
- **JWT Tokens**: Secure token-based session management

### User Experience
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: Built with Radix UI accessible components
- **Dark/Light Mode**: Theme switching capability
- **Loading States**: Proper loading and error handling

## Available Scripts

```bash
# Development
npm run dev              # Start development server (port 3000)
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format with Prettier
npm run typecheck        # TypeScript type checking
npm run check            # Run typecheck + lint
```

## Development Guidelines

### Component Organization
- Use **feature-based structure** for better maintainability
- Create **index.ts** files for clean imports
- Keep components **focused and single-responsibility**
- Use **TypeScript interfaces** for props and state

### Styling
- Use **Tailwind CSS** for styling
- Follow **mobile-first** responsive design
- Maintain **consistent spacing** and color schemes
- Use **Radix UI** for complex interactive components

### State Management
- Use **React useState** for local component state
- Pass state down through props or context when needed
- Keep **API calls in services** layer
- Handle **loading and error states** properly

### Type Safety
- Define **interfaces** for all props and API responses
- Use **strict TypeScript** configuration
- Avoid **any** types - prefer proper typing
- Export types from centralized **types/** directory

## API Integration

The frontend communicates with the backend through the `services/` layer:

- `services/api.ts` - HTTP client and API endpoints
- `services/auth.ts` - Authentication logic and user management

## Environment Variables

Create a `.env.local` file (not committed) for local development:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

## Contributing

1. Follow the established **folder structure**
2. Use **TypeScript** for all new components
3. Follow **ESLint and Prettier** configurations
4. Add **proper error handling** and loading states
5. Write **meaningful component names** and comments
6. Test components in different screen sizes

## Build and Deployment

```bash
# Build for production
npm run build

# The build outputs to `dist/` directory
# Deploy the contents of `dist/` to your hosting platform
```

The build is optimized and includes:
- Code splitting for better performance
- Asset optimization and minification
- TypeScript compilation and type checking
- CSS purging for smaller bundle size

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020+ features required
- CSS Grid and Flexbox support needed
