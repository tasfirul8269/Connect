const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set in environment variables');
  process.exit(1);
}

async function applyMigration() {
  // Database connection configuration
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    // Connect to the database
    await client.connect();
    console.log('Connected to the database');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '20241109_add_bio_to_personal_profiles.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    // Start a transaction
    await client.query('BEGIN');
    
    // Execute the migration
    console.log('Applying migration...');
    await client.query(migrationSQL);
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Migration applied successfully!');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    // Close the connection
    await client.end();
  }
}

// Run the migration
applyMigration();
