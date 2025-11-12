require('dotenv').config();
const sql = require('./dist/config/database.js').default;

async function fixProfilePhotoRedundancy() {
  try {
    console.log('🔧 Fixing profile_photo redundancy...');
    
    // Step 1: Copy any data from profile_photo to profile_picture if profile_picture is null
    const updateResult = await sql`
      UPDATE personal_profiles 
      SET profile_picture = profile_photo 
      WHERE profile_picture IS NULL AND profile_photo IS NOT NULL
    `;
    
    console.log(`✅ Updated ${updateResult.count || 0} profiles with profile_photo data`);
    
    // Step 2: Drop the redundant profile_photo column
    await sql`ALTER TABLE personal_profiles DROP COLUMN IF EXISTS profile_photo`;
    console.log('✅ Removed redundant profile_photo column');
    
    console.log('🎉 Profile photo redundancy fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit(0);
}

fixProfilePhotoRedundancy();
