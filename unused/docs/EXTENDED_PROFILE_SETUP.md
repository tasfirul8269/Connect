# Extended Profile System - Complete Setup Guide

## Overview

This document provides complete setup instructions for the Extended Profile system, which adds comprehensive user profile fields including education, work, social links, interests, and skills.

## 🎯 What's New

### Frontend Features

**Profile Page (White Theme):**
- ✅ Cover Photo & Profile Photo (editable)
- ✅ Username/Handle (@username) with unique validation
- ✅ Nickname & Bio
- ✅ **Personal Information**: Date of Birth, Gender
- ✅ **Contact Info**: Email, Phone, Website
- ✅ **Location**: Lives In, Hometown
- ✅ **Education**: School, College, University, Year/Batch, Department
- ✅ **Work**: Current Workplace, Position/Role, Previous Companies
- ✅ **Social Links**: Facebook, Instagram, LinkedIn, GitHub
- ✅ **Interests & Skills**: Tag-based display
- ✅ **Media Gallery**: Photos & Videos from posts
- ✅ **Organizations**: Placeholder for auto-populated data
- ✅ **Activity Stats**: Post count, Photo count, Video count

**New Components:**
- `PostCard.tsx` - Reusable post component with all interactions
- `ProfileCompletionPopup.tsx` - Registration flow popup
- Updated `ProfileWizard.tsx` - Step-by-step profile completion

### Backend Features

**New Database Table:**
- `extended_profiles` - JSONB-based flexible schema
- Unique handle/username support
- Profile by handle lookup
- Auto-updating timestamps

**New API Endpoints:**
```
GET    /api/profiles/extended/:userId          - Get extended profile
PUT    /api/profiles/extended                  - Update extended profile
GET    /api/profiles/handle/:handle            - Get profile by handle
GET    /api/profiles/handle-available/:handle  - Check handle availability
```

## 📦 Installation Steps

### 1. Database Migration

Run the migration to create the `extended_profiles` table:

```bash
cd backend
npm run migrate -- migrations/20241107_create_extended_profiles.sql
```

**Verify migration:**
```bash
psql $DATABASE_URL
\dt extended_profiles
\d extended_profiles
```

### 2. Backend Setup

The backend routes are already integrated. Just restart your backend server:

```bash
cd backend
npm run dev
```

**Test the endpoints:**
```bash
# Get extended profile
curl http://localhost:5000/api/profiles/extended/YOUR_USER_ID

# Check handle availability
curl http://localhost:5000/api/profiles/handle-available/testuser
```

### 3. Frontend Setup

No additional setup needed! The frontend automatically:
- Migrates localStorage data to backend on first load
- Uses backend API for all future updates
- Caches in localStorage for performance

Just start your frontend:
```bash
cd connections
npm start
```

## 🔄 Data Migration

### Automatic Migration

The system automatically migrates existing localStorage profile data to the backend:

1. User visits their profile page
2. Frontend checks for extended profile in backend
3. If none exists, reads from localStorage
4. Automatically syncs to backend
5. Future updates go directly to backend

### Manual Migration (if needed)

If you need to manually migrate data:

```javascript
// In browser console
const userId = 'YOUR_USER_ID';
const localData = JSON.parse(localStorage.getItem(`extended_profile_${userId}`));

// Send to backend
fetch('/api/profiles/extended', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${your_token}`
  },
  body: JSON.stringify(localData)
});
```

## 🎨 Profile Completion Flow

### Registration Flow

```
User Registers → Auto Login → Redirect to Feed
                                    ↓
                         Profile Completion Popup
                         /                    \
                 Complete Now              Skip for Now
                        ↓                        ↓
                 ProfileWizard              Continue Browsing
                        ↓                   (Limited access)
                 Fill Profile Fields              ↓
                        ↓                          ↓
                 Save to Backend         Profile Page Shows
                        ↓                 Completion Progress
                 Profile Page                     ↓
                                          User Completes Later
```

### Implementation

In `Feed.tsx` (after registration):

```tsx
import ProfileCompletionPopup from '../components/ProfileCompletionPopup';

const [showCompletionPopup, setShowCompletionPopup] = useState(false);
const [wizardOpen, setWizardOpen] = useState(false);

// Show popup for new users
useEffect(() => {
  const ext = readExtendedProfile(user?.id);
  if (user && !ext?.profile_photo) {
    setShowCompletionPopup(true);
  }
}, [user]);

// Render popup
<ProfileCompletionPopup
  isOpen={showCompletionPopup}
  profilePercent={completion.percent}
  onCompleteNow={() => {
    setShowCompletionPopup(false);
    setWizardOpen(true);
  }}
  onSkip={() => setShowCompletionPopup(false)}
/>
```

## 🔗 Profile URL Slugs

### Current Implementation

Profiles are currently accessed by:
```
/profile  (own profile)
```

### Future: Handle-Based URLs

To implement `/profile/@username`:

1. **Update Router** (`App.tsx`):
```tsx
<Route path="/profile/:handle?" element={<Profile />} />
```

2. **Update Profile.tsx**:
```tsx
import { useParams } from 'react-router-dom';

const { handle } = useParams();

useEffect(() => {
  if (handle) {
    // Load profile by handle
    const data = await profilesService.getProfileByHandle(handle);
  } else {
    // Load own profile
    const data = await profilesService.getCurrentProfile();
  }
}, [handle]);
```

3. **Link to profiles**:
```tsx
<Link to={`/profile/${user.handle || '@' + user.handle}`}>
  View Profile
</Link>
```

## 🧪 Testing Checklist

### Backend Tests

- [ ] Run migration successfully
- [ ] Create extended profile via API
- [ ] Update extended profile
- [ ] Get extended profile by userId
- [ ] Get profile by handle
- [ ] Check handle uniqueness validation
- [ ] Verify JSONB fields stored correctly
- [ ] Test with missing optional fields

### Frontend Tests

- [ ] ProfileWizard saves to backend
- [ ] Profile page displays all fields
- [ ] Media gallery shows photos/videos
- [ ] Social links are clickable
- [ ] Interests/Skills display as tags
- [ ] Profile completion bar updates
- [ ] Handle validation works
- [ ] Photo uploads to Cloudinary
- [ ] localStorage data migrates automatically

## 📊 Database Schema

### extended_profiles Table

```sql
CREATE TABLE extended_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE REFERENCES users(id),
    handle VARCHAR(50) UNIQUE,
    nickname VARCHAR(100),
    bio TEXT,
    profile_photo TEXT,
    cover_photo TEXT,
    lives_in VARCHAR(255),
    hometown VARCHAR(255),
    education JSONB DEFAULT '{}',
    work JSONB DEFAULT '{}',
    socials JSONB DEFAULT '{}',
    interests JSONB DEFAULT '[]',
    skills JSONB DEFAULT '[]',
    relationship_status VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### JSONB Examples

**Education:**
```json
{
  "school": "Springfield High School",
  "college": "State College",
  "university": "Tech University",
  "year_batch": "2024",
  "department": "Computer Science"
}
```

**Work:**
```json
{
  "workplace": "Acme Corp",
  "role": "Software Engineer",
  "previous": "Previous Company Inc"
}
```

**Socials:**
```json
{
  "facebook": "https://facebook.com/username",
  "instagram": "https://instagram.com/username",
  "linkedin": "https://linkedin.com/in/username",
  "github": "https://github.com/username"
}
```

## 🚨 Troubleshooting

### Migration Errors

**Error: relation "extended_profiles" already exists**
- Migration already applied, you're good!

**Error: permission denied**
- Check DATABASE_URL has proper permissions
- Verify Neon database allows table creation

### API Errors

**Error: Handle already taken**
- Handle must be unique across all users
- Try a different handle

**Error: Unauthorized**
- Ensure you're logged in
- Check JWT token is valid

### Frontend Issues

**Profile not updating**
- Check browser console for errors
- Verify API endpoints are accessible
- Clear localStorage and refresh

**Images not uploading**
- Check Cloudinary credentials in `.env`
- Verify file size limits

## 📝 Environment Variables

Make sure these are set in `backend/.env`:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 🎉 Success!

After setup, you should have:
- ✅ Comprehensive profile page with all fields
- ✅ White-themed modern UI
- ✅ Backend API persisting data
- ✅ Automatic localStorage migration
- ✅ Profile completion tracking
- ✅ Reusable PostCard component
- ✅ Media gallery from posts

## 📚 Documentation

- **Migration Guide**: `backend/migrations/MIGRATION_GUIDE.md`
- **API Endpoints**: Check backend routes in `src/routes/profiles.ts`
- **Frontend Types**: `src/services/profiles.ts`
- **Profile Utils**: `src/utils/profile.ts`

## 🔜 Future Enhancements

- [ ] Profile slug routing (`/profile/@username`)
- [ ] Profile privacy settings
- [ ] Verified badge system
- [ ] Profile views tracking
- [ ] Profile search/discovery
- [ ] Organization profiles integration
- [ ] Profile themes/customization

## 💡 Support

If you encounter issues:
1. Check this guide first
2. Review migration logs
3. Check browser console errors
4. Verify backend server is running
5. Test API endpoints with curl/Postman

---

**Version**: 1.0.0
**Last Updated**: November 7, 2024
**Status**: ✅ Production Ready
