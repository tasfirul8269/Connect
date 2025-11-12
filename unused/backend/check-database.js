require('dotenv').config();
const sql = require('./dist/config/database.js').default;

async function checkAndFixDatabase() {
  try {
    console.log('🔍 Checking current table structure...');
    
    // Check what columns exist
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'personal_profiles' 
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Current columns in personal_profiles:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if profile_photo column still exists
    const hasProfilePhoto = columns.some(col => col.column_name === 'profile_photo');
    
    if (hasProfilePhoto) {
      console.log('⚠️  profile_photo column still exists! This should have been removed.');
      console.log('🔧 Attempting to remove it now...');
      
      await sql`ALTER TABLE personal_profiles DROP COLUMN profile_photo`;
      console.log('✅ profile_photo column removed successfully');
    } else {
      console.log('✅ profile_photo column is already removed');
    }
    
    // Test a simple query to make sure everything works
    console.log('🧪 Testing a simple query...');
    const testQuery = await sql`SELECT COUNT(*) as count FROM personal_profiles`;
    console.log(`✅ Query successful: ${testQuery[0].count} profiles found`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
  process.exit(0);
}

checkAndFixDatabase();
