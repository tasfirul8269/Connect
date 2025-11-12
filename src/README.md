# Frontend Structure Documentation

This document outlines the organized frontend structure of the Connections project.

## 📁 Directory Structure

```
src/
├── 📁 components/           # Reusable UI components
│   ├── 📁 layout/          # Layout-related components
│   │   ├── Layout.tsx      # Main layout wrapper
│   │   ├── Navigation.tsx  # Navigation component
│   │   ├── Topbar.tsx      # Top navigation bar
│   │   ├── Sidebar.tsx     # Left sidebar
│   │   ├── RightSidebar.tsx # Right sidebar
│   │   ├── BottomNav.tsx   # Mobile bottom navigation
│   │   └── index.ts        # Layout exports
│   ├── 📁 profile/         # Profile-related components
│   │   ├── ProfileCard.tsx # User profile card
│   │   ├── ProfileWizard.tsx # Profile setup wizard
│   │   ├── ProfilePrompt.tsx # Profile completion prompt
│   │   ├── ProfileCompletionPopup.tsx # Profile completion popup
│   │   └── index.ts        # Profile exports
│   ├── 📁 cards/           # Card-style components
│   │   ├── ContactCard.tsx # Contact information card
│   │   ├── FriendsCard.tsx # Friends list card
│   │   ├── IntroCard.tsx   # Introduction card
│   │   ├── PhotosCard.tsx  # Photos gallery card
│   │   ├── SocialLinksCard.tsx # Social links card
│   │   └── index.ts        # Card exports
│   ├── 📁 posts/           # Post-related components
│   │   ├── PostCard.tsx    # Individual post card
│   │   └── index.ts        # Post exports
│   └── index.ts            # Main component exports
├── 📁 pages/               # Page components (routes)
│   ├── 📁 auth/           # Authentication pages
│   │   ├── Login.tsx      # Login page
│   │   ├── Signup.tsx     # Signup page
│   │   ├── ForgotPassword.tsx # Password reset page
│   │   └── index.ts       # Auth page exports
│   ├── Feed.tsx           # Main feed page
│   ├── Profile.tsx        # User profile page
│   └── index.ts           # Page exports
├── 📁 services/           # API services and external integrations
│   ├── api.ts             # Base API configuration
│   ├── auth.ts            # Authentication services
│   ├── posts.ts           # Post-related API calls
│   ├── profiles.ts        # Profile-related API calls
│   ├── cloudinary.ts      # Image upload service
│   ├── realtime.ts        # WebSocket/real-time services
│   └── index.ts           # Service exports
├── 📁 context/            # React Context providers
│   └── AuthContext.tsx    # Authentication context
├── 📁 utils/              # Utility functions and helpers
│   ├── auth.ts            # Authentication utilities
│   └── profile.ts         # Profile-related utilities
├── 📁 types/              # TypeScript type definitions
│   └── index.ts           # Main type exports
├── 📁 styles/             # CSS and styling files
│   ├── App.css            # Main app styles
│   └── index.css          # Global styles
├── 📁 hooks/              # Custom React hooks (future use)
├── 📁 config/             # Configuration files
│   └── database.ts        # Database configuration
├── App.tsx                # Main App component
└── index.tsx              # Application entry point
```

## 🎯 Import Patterns

### ✅ Recommended Import Patterns

```typescript
// Import from organized component folders
import { Layout, Sidebar, Topbar } from '../components/layout';
import { ProfileCard, ProfileWizard } from '../components/profile';
import { PostCard } from '../components/posts';
import { ContactCard, FriendsCard } from '../components/cards';

// Import pages
import { Login, Signup } from '../pages/auth';
import Feed from '../pages/Feed';

// Import services
import { authService, profilesService } from '../services';

// Import utilities
import { readExtendedProfile } from '../utils/profile';
```

### ❌ Avoid These Patterns

```typescript
// Don't import directly from nested paths
import Layout from '../components/layout/Layout';
import ProfileCard from '../components/profile/ProfileCard';

// Don't use relative imports for deeply nested files
import { authService } from '../../../services/auth';
```

## 🔧 Adding New Components

### 1. Layout Components
Place in `src/components/layout/` for:
- Navigation elements
- Page structure components
- Header/footer components

### 2. Profile Components
Place in `src/components/profile/` for:
- Profile display components
- Profile editing components
- Profile-related modals

### 3. Card Components
Place in `src/components/cards/` for:
- Information display cards
- Dashboard widgets
- Sidebar cards

### 4. Post Components
Place in `src/components/posts/` for:
- Post display components
- Post creation components
- Comment components

### 5. UI Components
Place in `src/components/ui/` for:
- Reusable UI elements (buttons, inputs, modals)
- Generic components used across the app

## 📝 Best Practices

1. **Always update index.ts files** when adding new components
2. **Use barrel exports** for cleaner imports
3. **Keep components focused** - one responsibility per component
4. **Use TypeScript interfaces** for all props
5. **Follow the established folder structure**
6. **Update this README** when adding new folders or patterns

## 🚀 Benefits of This Structure

- **Better Organization**: Components are grouped by functionality
- **Easier Imports**: Barrel exports make imports cleaner
- **Scalability**: Easy to add new components in appropriate folders
- **Maintainability**: Clear separation of concerns
- **Developer Experience**: Easier to find and work with components

---

**Last Updated:** November 8, 2024  
**Structure Version:** 2.0
