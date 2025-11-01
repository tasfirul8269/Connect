# Connections - Complete Setup Guide

This guide will help you set up the full-stack Connections social media application with React frontend, Node.js backend, and Neon database.

## Project Structure

```
connections/
├── src/                    # React frontend
│   ├── components/         # Reusable components
│   ├── context/           # React context (AuthContext)
│   ├── pages/             # Page components
│   ├── services/          # API service functions
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── backend/               # Node.js/Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── config/        # Database configuration
│   └── package.json
└── database-schema.sql    # Database schema
```

## Setup Instructions

### 1. Database Setup (Neon)

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your database connection string
4. Run the SQL schema from `database-schema.sql` in your Neon console

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env file with your values:
# DATABASE_URL=your_neon_database_url_here
# JWT_SECRET=your_jwt_secret_here
# PORT=5000
# NODE_ENV=development

# Start development server
npm run dev
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

```bash
# From the root connections directory
cd ..

# Install dependencies
npm install

# Create environment file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Start development server
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Posts
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create new post (authenticated)
- `GET /api/posts/user/:userId` - Get user's posts
- `POST /api/posts/:postId/like` - Like a post (authenticated)
- `DELETE /api/posts/:postId/like` - Unlike a post (authenticated)
- `POST /api/posts/:postId/comments` - Add comment (authenticated)
- `GET /api/posts/:postId/comments` - Get post comments

### Profiles
- `GET /api/profiles/:userId` - Get user profile
- `GET /api/profiles/me/profile` - Get current user's profile
- `PUT /api/profiles/personal/:userId` - Update personal profile (authenticated)
- `PUT /api/profiles/organization/:userId` - Update organization profile (authenticated)

## Features

### Authentication
- Email/password login
- Guest mode (view-only access)
- JWT token-based authentication
- Account registration with Personal/Organization types

### Account Types
- **Personal Accounts**: First name, last name, bio, date of birth, location, website
- **Organization Accounts**: Organization name, description, industry, founded year, location, website

### Social Features
- View posts from all users
- Create posts (authenticated users only)
- Like, comment, and share functionality (authenticated users only)
- Guest users can only view content
- Facebook-style profile pages

### Database Schema
- **users**: User accounts and authentication
- **personal_profiles**: Personal account information
- **organization_profiles**: Organization account information
- **posts**: Social media posts
- **likes**: Post likes
- **comments**: Post comments

## Development

### Backend Development
```bash
cd backend
npm run dev  # Starts with nodemon for auto-restart
```

### Frontend Development
```bash
npm start  # Starts React development server
```

### Building for Production
```bash
# Build backend
cd backend
npm run build

# Build frontend
npm run build
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=your_neon_database_url_here
JWT_SECRET=your_jwt_secret_here
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Troubleshooting

1. **Database Connection Issues**
   - Verify your Neon database URL is correct
   - Ensure the database schema has been created
   - Check that your Neon project is active

2. **CORS Issues**
   - The backend is configured to allow requests from `http://localhost:3000`
   - Update the CORS origin in `backend/src/index.ts` for production

3. **Authentication Issues**
   - Ensure JWT_SECRET is set in backend .env
   - Check that tokens are being stored in localStorage
   - Verify API endpoints are working with Postman/curl

## Production Deployment

1. Set up production database (Neon)
2. Configure environment variables for production
3. Build both frontend and backend
4. Deploy backend to your preferred hosting service
5. Deploy frontend to your preferred hosting service
6. Update CORS settings for production domains
