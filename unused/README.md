# Unused Files Archive

This folder contains files that are no longer actively used in the project but are preserved for reference or potential future use.

## 📁 Folder Structure

### `/frontend/` - Unused Frontend Files
- **`App.test.tsx`** - React test file (not being used)
- **`setupTests.ts`** - Jest test setup (not being used)
- **`logo.svg`** - React default logo (not imported anywhere)
- **`reportWebVitals.ts`** - Performance monitoring (optional)
- **`react-app-env.d.ts`** - TypeScript definitions (auto-generated)

### `/backend/` - Temporary Backend Scripts
- **`run-migration.js`** - ✅ Used for profile migration (Nov 8, 2024)
- **`fix-profile-photo.js`** - ✅ Used to fix profile_photo redundancy
- **`check-database.js`** - ✅ Used to verify database structure
- **`setup.js`** - Old setup script (not being used)
- **`run-migrations.js`** - Old migration runner (superseded)
- **`run_migration.ts`** - TypeScript migration script (duplicate)
- **`scripts/`** - Compiled TypeScript files (auto-generated)

### `/docs/` - Outdated Documentation
- **`EXTENDED_PROFILE_SETUP.md`** - Setup guide for extended profiles (now merged)
- **`MERGE_PROFILES_MIGRATION.md`** - Migration guide (completed)
- **`PROFILE_SYSTEM_SUMMARY.md`** - Old profile system summary (outdated)
- **`REAL_TIME_EMAIL_VALIDATION_TEST.md`** - Email validation test guide
- **`AUTH_PROVIDER_IMPLEMENTATION.md`** - Auth provider setup guide
- **`PASSWORD_RESET_SETUP.md`** - Password reset setup guide
- **`ENVIRONMENT_SETUP.md`** - Environment setup guide
- **`MIGRATION_GUIDE.md`** - General migration guide
- **`README.md`** - Migration folder readme

### `/migrations/` - Old Migration Files
- **`20241107_create_extended_profiles.sql`** - Created extended_profiles table (now merged)
- **`20241107_rename_to_profile_details.sql`** - Renamed endpoints (superseded)

## 🗑️ Safe to Delete?

These files can be safely deleted if you're confident you won't need them:
- All frontend files (can be regenerated if needed)
- Backend scripts (already executed successfully)
- Old documentation (superseded by current implementation)
- Old migration files (already applied and superseded)

## 🔄 Restoration

If you need to restore any file:
```bash
# Example: Restore reportWebVitals.ts
move unused\frontend\reportWebVitals.ts src\
```

---
**Created:** November 8, 2024  
**Reason:** Project cleanup after profile system merge
