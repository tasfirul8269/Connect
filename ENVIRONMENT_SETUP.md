# Environment Setup Guide

## 🔧 **Required Environment Variables**

### **1. Backend Environment (.env file in `/backend` folder)**

Create a `.env` file in the `backend` folder with these variables:

```env
# Database Configuration
DATABASE_URL=your_neon_database_url_here

# JWT Secret (use a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random

# Server Configuration
PORT=5000
NODE_ENV=development

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### **2. Frontend Environment (.env file in root folder)**

Create a `.env` file in the root `connections` folder:

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:5000/api

# Google OAuth Client ID
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

## 🗄️ **Database Setup (Neon)**

1. **Create Neon Account:**
   - Go to [console.neon.tech](https://console.neon.tech)
   - Sign up for a free account
   - Create a new project

2. **Get Database URL:**
   - Copy your connection string from Neon dashboard
   - It looks like: `postgresql://username:password@hostname/database?sslmode=require`

3. **Run Database Schema:**
   - Go to your Neon SQL Editor
   - Copy and paste the contents of `database-schema.sql`
   - Execute the SQL to create all tables

## 🚀 **Step-by-Step Setup**

### **Step 1: Set up Backend**

```bash
# Navigate to backend folder
cd connections/backend

# Install dependencies (if not already done)
npm install

# Create .env file
# Copy the backend environment variables above into .env

# Start backend server
npm run dev
```

### **Step 2: Set up Frontend**

```bash
# Navigate to root connections folder
cd connections

# Install dependencies (if not already done)
npm install

# Create .env file
# Copy the frontend environment variables above into .env

# Start frontend server
npm start
```

## 🔑 **Important Security Notes**

### **JWT Secret:**
- Use a long, random string (at least 32 characters)
- Example: `my_super_secret_jwt_key_that_is_very_long_and_random_12345`
- Never commit this to version control

### **Database URL:**
- Keep your Neon database URL secure
- Don't share it publicly
- The URL contains your database credentials

## 📝 **Environment File Examples**

### **Backend .env:**
```env
DATABASE_URL=postgresql://username:password@ep-cool-name-123456.us-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=my_super_secret_jwt_key_that_is_very_long_and_random_12345
PORT=5000
NODE_ENV=development
```

### **Frontend .env:**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🧪 **Testing Your Setup**

1. **Backend Test:**
   - Visit: `http://localhost:5000/api/health`
   - Should return: `{"status":"OK","message":"Connections API is running"}`

2. **Frontend Test:**
   - Visit: `http://localhost:3000`
   - Should show the login page

3. **Database Test:**
   - Try registering a new account
   - Check if data appears in your Neon database

## 🚨 **Common Issues**

### **Backend won't start:**
- Check if PORT 5000 is available
- Verify .env file is in the correct location
- Ensure all dependencies are installed

### **Frontend can't connect to backend:**
- Verify REACT_APP_API_URL is correct
- Check if backend is running on port 5000
- Look for CORS errors in browser console

### **Database connection fails:**
- Verify DATABASE_URL is correct
- Check if Neon database is active
- Ensure database schema has been created

## 📁 **File Structure After Setup**

```
connections/
├── .env                    # Frontend environment
├── backend/
│   ├── .env               # Backend environment
│   ├── src/
│   └── package.json
├── src/
├── database-schema.sql
└── package.json
```
