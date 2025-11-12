# Personal Profiles Table Merge Migration

## Overview
This migration consolidates the `personal_profiles` and `extended_profiles` tables into a single unified `personal_profiles` table. This eliminates the need for JOINs and simplifies the database structure.

## What This Migration Does

1. **Adds new columns** to the existing `personal_profiles` table:
   - `handle` (unique username)
   - `nickname`
   - `profile_photo`
   - `cover_photo`
   - `lives_in`
   - `hometown`
   - `education` (JSONB)
   - `work` (JSONB)
   - `socials` (JSONB)
   - `interests` (JSONB array)
   - `skills` (JSONB array)
   - `relationship_status`

2. **Migrates data** from `extended_profiles` to the unified `personal_profiles` table

3. **Drops the `extended_profiles` table** after successful migration

4. **Creates indexes** for better performance on new fields

## How to Run the Migration

### Option 1: Using psql (Recommended)
```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration
\i backend/migrations/20241108_merge_personal_profiles.sql
```

### Option 2: Using Neon Console
1. Go to your Neon database console
2. Copy the contents of `backend/migrations/20241108_merge_personal_profiles.sql`
3. Paste and execute in the SQL editor

### Option 3: Using Node.js script
```bash
cd backend
node -e "
const sql = require('./src/config/database.js').default;
const fs = require('fs');
const migration = fs.readFileSync('./migrations/20241108_merge_personal_profiles.sql', 'utf8');
sql.unsafe(migration).then(() => {
  console.log('Migration completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
"
```

## Verification

After running the migration, verify it worked correctly:

```sql
-- Check the new table structure
\d personal_profiles

-- Verify data was migrated
SELECT COUNT(*) FROM personal_profiles;
SELECT user_id, first_name, last_name, handle, nickname FROM personal_profiles LIMIT 5;

-- Confirm extended_profiles table is gone
\dt extended_profiles
```

## Benefits After Migration

✅ **Simplified queries** - No more JOINs between personal_profiles and extended_profiles  
✅ **Better performance** - Single table lookups  
✅ **Cleaner code** - Unified data model  
✅ **Easier maintenance** - One table to manage  

## Rollback (if needed)

If you need to rollback this migration:

1. **Stop your application** to prevent data corruption
2. **Restore from backup** (recommended approach)
3. Or manually recreate the `extended_profiles` table and split the data

⚠️ **Important**: Take a database backup before running this migration!

## Files Updated

- ✅ `backend/migrations/20241108_merge_personal_profiles.sql` - Migration script
- ✅ `backend/src/routes/profiles.ts` - API routes updated
- ✅ `src/services/profiles.ts` - Frontend services updated  
- ✅ `src/types/index.ts` - TypeScript interfaces updated
- ✅ `database-schema.sql` - Schema file updated

## Status
🎯 **Ready to run** - All code has been updated to work with the unified table structure.
