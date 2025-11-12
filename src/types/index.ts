export interface User {
  id: string;
  email: string;
  password: string;
  account_type: 'personal' | 'organization';
  created_at: string;
  updated_at: string;
}

export interface PersonalProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone_number?: string;
  gender?: 'male' | 'female' | 'other';
  
  // Basic profile info
  bio?: string;
  profile_picture?: string;
  location?: string;
  website?: string;
  
  // Extended profile data
  handle?: string;
  nickname?: string;
  cover_photo?: string;
  lives_in?: string;
  hometown?: string;
  
  // JSONB fields
  education?: {
    school?: string;
    college?: string;
    university?: string;
    year_batch?: string;
    department?: string;
  };
  work?: {
    workplace?: string;
    role?: string;
    previous?: string;
  };
  socials?: {
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    github?: string;
    website?: string;
  };
  interests?: string[];
  skills?: string[];
  
  relationship_status?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationProfile {
  id: string;
  user_id: string;
  organization_name: string;
  description?: string;
  logo?: string;
  website?: string;
  industry?: string;
  founded_year?: number;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: SignupData) => Promise<boolean>;
  logout: () => void;
  continueAsGuest: () => void;
}

export interface SignupData {
  email: string;
  password: string;
  account_type: 'personal' | 'organization';
  personalData?: {
    first_name: string;
    last_name: string;
    gender?: 'male' | 'female' | 'other';
    phone_number?: string;
    bio?: string;
    date_of_birth?: string;
    location?: string;
    website?: string;
  };
  organizationData?: {
    organization_name: string;
    description?: string;
    industry?: string;
    founded_year?: number;
    location?: string;
    website?: string;
  };
}
