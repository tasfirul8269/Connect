# Database Migrations

## How to Apply Migrations

Connect to your Neon database and run the SQL files in order:

### Migration: Add Auth Provider Support (20240302)

This migration adds support for tracking authentication providers (email, google, facebook) to prevent cross-provider account conflicts.

```bash
# Run this SQL in your Neon database console:
psql <your-connection-string> -f backend/migrations/20240302_add_auth_provider_to_users.sql
```

Or copy and paste the contents of `20240302_add_auth_provider_to_users.sql` directly into your Neon SQL editor.

### What This Migration Does

1. Adds `auth_provider` column to the `users` table
2. Sets all existing users to use 'email' as their auth provider
3. Enforces that the field is NOT NULL with a CHECK constraint limiting values to: 'email', 'google', 'facebook'

### Impact

After this migration:
- Users who sign up with email cannot sign in with Google/Facebook (and vice versa)
- Clear error messages will be shown when attempting to use a different auth method
- Example errors:
  - "An account with this email already exists. Please sign in with Google."
  - "An account with this email already exists. Please sign in with email and password."
