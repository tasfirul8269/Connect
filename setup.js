#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Connections App Setup Helper\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the connections root directory');
  process.exit(1);
}

// Create backend .env if it doesn't exist
const backendEnvPath = path.join('backend', '.env');
if (!fs.existsSync(backendEnvPath)) {
  const backendEnvContent = `# Database Configuration
DATABASE_URL=your_neon_database_url_here

# JWT Secret (use a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Server Configuration
PORT=5000
NODE_ENV=development`;

  fs.writeFileSync(backendEnvPath, backendEnvContent);
  console.log('✅ Created backend/.env file');
} else {
  console.log('ℹ️  backend/.env already exists');
}

// Create frontend .env if it doesn't exist
const frontendEnvPath = '.env';
if (!fs.existsSync(frontendEnvPath)) {
  const frontendEnvContent = `# Backend API URL
REACT_APP_API_URL=http://localhost:5000/api`;

  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log('✅ Created .env file');
} else {
  console.log('ℹ️  .env already exists');
}

console.log('\n📋 Next Steps:');
console.log('1. Set up your Neon database:');
console.log('   - Go to https://console.neon.tech');
console.log('   - Create a new project');
console.log('   - Copy your database URL');
console.log('   - Run the SQL from database-schema.sql in Neon SQL Editor');
console.log('');
console.log('2. Update your environment files:');
console.log('   - Edit backend/.env with your DATABASE_URL and JWT_SECRET');
console.log('   - Frontend .env is ready to go');
console.log('');
console.log('3. Start the servers:');
console.log('   - Backend: cd backend && npm run dev');
console.log('   - Frontend: npm start');
console.log('');
console.log('🎉 Happy coding!');
