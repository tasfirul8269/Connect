const fs = require('fs');
const path = require('path');
const postgres = require('postgres');
require('dotenv').config();

async function runMigrations() {
  const sql = postgres(process.env.DATABASE_URL);
  
  try {
    console.log('🚀 Running database migrations...\n');
    
    // Get all .sql files in the migrations directory
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to run in order
    
    for (const file of files) {
      console.log(`📄 Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const migration = fs.readFileSync(filePath, 'utf8');
      
      try {
        await sql.unsafe(migration);
        console.log(`✅ Successfully applied: ${file}\n`);
      } catch (error) {
        console.error(`❌ Error applying ${file}:`, error.message);
        // Continue with other migrations even if one fails
      }
    }
    
    console.log('✨ All migrations completed!');
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigrations();
