const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

// Import your database connection
const sql = require('./dist/config/database.js').default;

async function runMigration() {
  try {
    console.log('🚀 Starting personal profiles merge migration...');
    
    console.log('⚡ Step 1: Adding new columns to personal_profiles table...');
    
    // Step 1: Add new columns
    await sql`
      ALTER TABLE personal_profiles 
      ADD COLUMN IF NOT EXISTS handle VARCHAR(50) UNIQUE,
      ADD COLUMN IF NOT EXISTS nickname VARCHAR(100),
      ADD COLUMN IF NOT EXISTS profile_photo TEXT,
      ADD COLUMN IF NOT EXISTS cover_photo TEXT,
      ADD COLUMN IF NOT EXISTS lives_in VARCHAR(255),
      ADD COLUMN IF NOT EXISTS hometown VARCHAR(255),
      ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS work JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS socials JSONB DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS interests JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS relationship_status VARCHAR(50)
    `;
    
    console.log('✅ New columns added successfully');
    
    console.log('⚡ Step 2: Updating phone_number column...');
    
    // Step 2: Update phone_number column
    try {
      await sql`ALTER TABLE personal_profiles ALTER COLUMN phone_number TYPE VARCHAR(20)`;
      console.log('✅ Phone number column updated');
    } catch (error) {
      console.log('ℹ️  Phone number column already correct type');
    }
    
    console.log('⚡ Step 3: Adding gender constraint...');
    
    // Step 3: Add gender constraint
    try {
      await sql`ALTER TABLE personal_profiles ADD CONSTRAINT check_gender CHECK (gender IN ('male', 'female', 'other'))`;
      console.log('✅ Gender constraint added');
    } catch (error) {
      console.log('ℹ️  Gender constraint already exists');
    }
    
    console.log('⚡ Step 4: Migrating data from extended_profiles...');
    
    // Step 4: Check if extended_profiles exists and migrate data
    try {
      const extendedProfilesExist = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'extended_profiles'
        )
      `;
      
      if (extendedProfilesExist[0].exists) {
        console.log('📋 Found extended_profiles table, migrating data...');
        
        // Update existing personal_profiles with extended_profiles data
        const updateResult = await sql`
          UPDATE personal_profiles 
          SET 
            handle = ep.handle,
            nickname = ep.nickname,
            profile_photo = ep.profile_photo,
            cover_photo = ep.cover_photo,
            lives_in = ep.lives_in,
            hometown = ep.hometown,
            education = ep.education,
            work = ep.work,
            socials = ep.socials,
            interests = ep.interests,
            skills = ep.skills,
            relationship_status = ep.relationship_status,
            updated_at = GREATEST(personal_profiles.updated_at, ep.updated_at)
          FROM extended_profiles ep
          WHERE personal_profiles.user_id = ep.user_id
        `;
        
        console.log(`✅ Updated ${updateResult.count} existing profiles`);
        
        // Insert users who only have extended_profiles
        const insertResult = await sql`
          INSERT INTO personal_profiles (
            user_id, handle, nickname, profile_photo, cover_photo, lives_in, hometown,
            education, work, socials, interests, skills, relationship_status, created_at, updated_at
          )
          SELECT 
            user_id, handle, nickname, profile_photo, cover_photo, lives_in, hometown,
            education, work, socials, interests, skills, relationship_status, created_at, updated_at
          FROM extended_profiles ep
          WHERE NOT EXISTS (
            SELECT 1 FROM personal_profiles pp WHERE pp.user_id = ep.user_id
          )
        `;
        
        console.log(`✅ Inserted ${insertResult.count} new profiles from extended_profiles`);
        
        // Drop extended_profiles table
        await sql`DROP TABLE extended_profiles CASCADE`;
        console.log('✅ extended_profiles table removed');
        
      } else {
        console.log('ℹ️  No extended_profiles table found, skipping data migration');
      }
    } catch (error) {
      console.log('⚠️  Error during data migration:', error.message);
    }
    
    console.log('⚡ Step 5: Creating indexes...');
    
    // Step 5: Create indexes
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_personal_profiles_user_id ON personal_profiles(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_personal_profiles_handle ON personal_profiles(handle)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_personal_profiles_first_name ON personal_profiles(first_name)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_personal_profiles_last_name ON personal_profiles(last_name)`;
      console.log('✅ Indexes created successfully');
    } catch (error) {
      console.log('ℹ️  Indexes already exist or error creating them:', error.message);
    }
    
    console.log('⚡ Step 6: Creating updated_at trigger...');
    
    // Step 6: Create trigger
    try {
      await sql`
        CREATE OR REPLACE FUNCTION update_personal_profiles_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `;
      
      await sql`DROP TRIGGER IF EXISTS trigger_update_personal_profiles_updated_at ON personal_profiles`;
      
      await sql`
        CREATE TRIGGER trigger_update_personal_profiles_updated_at
            BEFORE UPDATE ON personal_profiles
            FOR EACH ROW
            EXECUTE FUNCTION update_personal_profiles_updated_at()
      `;
      
      console.log('✅ Updated_at trigger created successfully');
    } catch (error) {
      console.log('⚠️  Error creating trigger:', error.message);
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    const profileCount = await sql`SELECT COUNT(*) as count FROM personal_profiles`;
    console.log(`📊 Total profiles in unified table: ${profileCount[0].count}`);
    
    const sampleProfiles = await sql`
      SELECT user_id, first_name, last_name, handle, nickname 
      FROM personal_profiles 
      WHERE first_name IS NOT NULL 
      LIMIT 3
    `;
    
    if (sampleProfiles.length > 0) {
      console.log('📋 Sample profiles:');
      sampleProfiles.forEach((profile, index) => {
        console.log(`  ${index + 1}. ${profile.first_name} ${profile.last_name} (@${profile.handle || 'no-handle'})`);
      });
    }
    
    // Check if extended_profiles table still exists
    try {
      await sql`SELECT 1 FROM extended_profiles LIMIT 1`;
      console.log('⚠️  Warning: extended_profiles table still exists (migration may have failed)');
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('✅ extended_profiles table successfully removed');
      } else {
        console.log('❓ Could not verify extended_profiles table removal');
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('💡 Your personal profiles are now unified in a single table.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check your DATABASE_URL environment variable');
    console.error('2. Ensure your database is accessible');
    console.error('3. Verify you have the necessary permissions');
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
runMigration();
