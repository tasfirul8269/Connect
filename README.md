# Connections - Social Media App

A modern social media application built with React, TypeScript, and Neon database. Features include user authentication, personal/organization accounts, social feed, and profile management.

## Features

- **Authentication System**
  - Email/password login
  - Guest mode (view-only access)
  - Account registration with Personal/Organization types

- **Account Types**
  - **Personal Accounts**: First name, last name, bio, date of birth, location, website
  - **Organization Accounts**: Organization name, description, industry, founded year, location, website

- **Social Feed**
  - View posts from all users
  - Create posts (authenticated users only)
  - Like, comment, and share functionality (authenticated users only)
  - Guest users can only view content

- **Profile Management**
  - Facebook-style profile pages
  - Different layouts for Personal vs Organization accounts
  - About section with detailed information
  - User posts display

## Tech Stack

- **Frontend**: React 18, TypeScript, CSS3
- **Routing**: React Router DOM
- **Database**: Neon (PostgreSQL)
- **Authentication**: JWT tokens, bcrypt password hashing
- **Styling**: Custom CSS with modern design

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd connections
npm install
```

### 2. Set up Neon Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Create a new project
3. Copy your database connection string
4. Run the SQL schema from `database-schema.sql` in your Neon console

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
REACT_APP_NEON_DATABASE_URL=your_neon_database_url_here
REACT_APP_JWT_SECRET=your_jwt_secret_here
```

### 4. Start the Development Server

```bash
npm start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
src/
├── components/          # Reusable components
├── context/           # React context (AuthContext)
├── pages/            # Page components
│   ├── Login.tsx     # Login page
│   ├── Signup.tsx    # Registration page
│   ├── Feed.tsx      # Social media feed
│   └── Profile.tsx   # User profile page
├── types/            # TypeScript type definitions
├── utils/            # Utility functions (auth, database)
├── config/           # Configuration files
└── App.tsx           # Main app component
```

## Database Schema

The application uses the following main tables:

- **users**: User accounts and authentication
- **personal_profiles**: Personal account information
- **organization_profiles**: Organization account information
- **posts**: Social media posts
- **likes**: Post likes
- **comments**: Post comments

## Usage

1. **Login**: Use email/password or continue as guest
2. **Signup**: Choose Personal or Organization account type
3. **Feed**: View and interact with posts (guests can only view)
4. **Profile**: View detailed user profiles with different layouts

## Guest Mode

Guests can:
- View the social feed
- See all posts and content
- Navigate to user profiles

Guests cannot:
- Create posts
- Like, comment, or share
- Access full profile features

## Development

The app is built with modern React patterns:
- Functional components with hooks
- TypeScript for type safety
- Context API for state management
- Responsive CSS design
- JWT-based authentication

## Future Enhancements

- Real-time notifications
- Image upload for posts and profiles
- Advanced search and filtering
- Direct messaging
- Groups and communities
- Mobile app version