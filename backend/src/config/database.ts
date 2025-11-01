import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('Please check your .env file in the backend folder.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

export default sql;
