# Authentication Provider Conflict Detection

## Overview

This implementation prevents users from signing up with the same email using different authentication methods (email/password, Google, Facebook). When a user attempts to sign up with an email that already exists using a different authentication method, they receive a clear error message directing them to use the correct sign-in method.

## Changes Made

### 1. Database Schema Updates

#### New Column: `auth_provider`
- **Location**: `users` table
- **Type**: `VARCHAR(20)` 
- **Values**: `'email'`, `'google'`, `'facebook'`
- **Default**: `'email'`
- **Constraint**: `NOT NULL`, `CHECK` constraint to enforce valid values

#### Files Modified:
- `database-schema.sql` - Updated users table definition
- `backend/migrations/20240302_add_auth_provider_to_users.sql` - Migration file to add the column

### 2. Backend Authentication Logic

#### Email/Password Registration (`/auth/register`)
- Now checks if email exists with a different auth provider
- Returns specific error messages:
  - "An account with this email already exists. Please sign in with Google."
  - "An account with this email already exists. Please sign in with Facebook."
  - "User already exists" (for email-based duplicates)
- Sets `auth_provider = 'email'` for new email registrations

#### Google OAuth (`/auth/google`)
- Checks if email exists with `auth_provider = 'email'` or `'facebook'`
- Returns appropriate error messages directing users to correct sign-in method
- Sets `auth_provider = 'google'` for new Google sign-ups
- Allows existing Google users to sign in normally

#### Facebook OAuth (`/auth/facebook`)
- Checks if email exists with `auth_provider = 'email'` or `'google'`
- Returns appropriate error messages directing users to correct sign-in method
- Sets `auth_provider = 'facebook'` for new Facebook sign-ups
- Allows existing Facebook users to sign in normally

### 3. Error Messages

Clear, user-friendly error messages are returned when conflicts occur:

| Scenario | Error Message |
|----------|---------------|
| Email signup → Google exists | "An account with this email already exists. Please sign in with Google." |
| Email signup → Facebook exists | "An account with this email already exists. Please sign in with Facebook." |
| Google signup → Email exists | "An account with this email already exists. Please sign in with email and password." |
| Google signup → Facebook exists | "An account with this email already exists. Please sign in with Facebook." |
| Facebook signup → Email exists | "An account with this email already exists. Please sign in with email and password." |
| Facebook signup → Google exists | "An account with this email already exists. Please sign in with Google." |

## How to Deploy

### Step 1: Apply Database Migration

Run the migration to add the `auth_provider` column:

```bash
# Option 1: Using psql
psql <your-neon-connection-string> -f backend/migrations/20240302_add_auth_provider_to_users.sql

# Option 2: Copy and paste into Neon SQL Editor
# Copy the contents of backend/migrations/20240302_add_auth_provider_to_users.sql
# Paste into Neon dashboard SQL editor and execute
```

### Step 2: Restart Backend Server

```bash
cd backend
npm run dev
```

The backend code changes are already complete - no additional steps needed.

## Testing Scenarios

### Test Case 1: Email → Google Conflict
1. Sign up with email: test@example.com
2. Try to sign up with Google using same email
3. Expected: Error message directing to email sign-in

### Test Case 2: Google → Email Conflict
1. Sign up with Google: test2@example.com
2. Try to sign up with email using same email
3. Expected: Error message directing to Google sign-in

### Test Case 3: Facebook → Google Conflict
1. Sign up with Facebook: test3@example.com
2. Try to sign up with Google using same email
3. Expected: Error message directing to Facebook sign-in

### Test Case 4: Same Provider Works
1. Sign up with Google: test4@example.com
2. Log out
3. Sign in with Google using same email
4. Expected: Successful login

## Technical Details

### Files Modified
1. `backend/src/routes/auth.ts` - Added auth provider checks and logic
2. `database-schema.sql` - Updated schema with auth_provider column
3. `backend/migrations/20240302_add_auth_provider_to_users.sql` - Migration file
4. `backend/migrations/README.md` - Migration instructions

### Database Queries Updated
- Email registration now queries: `SELECT id, auth_provider FROM users WHERE email = ${email}`
- Google OAuth now checks: `users[0].auth_provider`
- Facebook OAuth now checks: `users[0].auth_provider`
- All new user insertions include: `auth_provider` field

## Benefits

1. **Security**: Prevents account hijacking through different OAuth providers
2. **User Experience**: Clear error messages guide users to correct sign-in method
3. **Data Integrity**: Maintains single account per email address
4. **Audit Trail**: Track which authentication method each user prefers

## Future Enhancements

Potential future improvements:
- Allow users to link multiple auth providers to one account
- Add "Sign in with a different method" flow
- Add provider switching with email verification
- Support for additional OAuth providers (GitHub, LinkedIn, etc.)
