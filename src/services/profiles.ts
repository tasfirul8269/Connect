import api from './api';

export interface ProfilePictureHistory {
  id: number;
  user_id: string;
  image_url: string;
  created_at: string;
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
  profile_photo?: string; // Alias for profile_picture for backward compatibility
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

export interface User {
  id: string;
  email: string;
  account_type: 'personal' | 'organization';
  created_at: string;
}

export interface ProfileResponse {
  user: User;
  profile: PersonalProfile | OrganizationProfile | null;
}

export const profilesService = {
  getProfile: async (userId: string): Promise<ProfileResponse> => {
    const response = await api.get(`/profiles/${userId}`);
    return response.data;
  },

  getCurrentProfile: async (): Promise<ProfileResponse> => {
    const response = await api.get('/profiles/me/profile');
    return response.data;
  },

  getProfileByHandle: async (handle: string): Promise<ProfileResponse> => {
    const response = await api.get(`/profiles/handle/${handle}`);
    return response.data;
  },

  updatePersonalProfile: async (userId: string, data: Partial<PersonalProfile>): Promise<PersonalProfile> => {
    const response = await api.put(`/profiles/personal/${userId}`, data);
    return response.data;
  },

  updateOrganizationProfile: async (userId: string, data: Partial<OrganizationProfile>): Promise<OrganizationProfile> => {
    const response = await api.put(`/profiles/organization/${userId}`, data);
    return response.data;
  },

  // Profile details endpoints (now returns full PersonalProfile)
  getProfileDetails: async (userId: string): Promise<PersonalProfile | null> => {
    try {
      const response = await api.get(`/profiles/details/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching profile details:', error);
      return null;
    }
  },

  updateProfileDetails: async (data: Partial<PersonalProfile>): Promise<PersonalProfile> => {
    const response = await api.put('/profiles/details', data);
    return response.data;
  },

  // Legacy methods (backward compatibility)
  getExtendedProfile: async (userId: string): Promise<PersonalProfile | null> => {
    return profilesService.getProfileDetails(userId);
  },

  updateExtendedProfile: async (data: Partial<PersonalProfile>): Promise<PersonalProfile> => {
    // Map the data to match the backend's expected structure
    const requestData = {
      ...data,
      profile_picture: data.profile_photo || data.profile_picture, // Handle both property names
      education: data.education || {},
      work: data.work || {},
      socials: data.socials || {},
      interests: data.interests || [],
      skills: data.skills || []
    };
    return profilesService.updateProfileDetails(requestData);
  },

  checkHandleAvailability: async (handle: string): Promise<boolean> => {
    try {
      const response = await api.get(`/profiles/handle-available/${handle}`);
      return response.data.available;
    } catch (error) {
      return false;
    }
  },

  getProfilePictureHistory: async (userId: string): Promise<ProfilePictureHistory[]> => {
    return api.get(`/profiles/${userId}/profile-pictures`).then(res => res.data);
  },
  
  saveProfilePictureHistory: async (userId: string, imageUrl: string): Promise<void> => {
    try {
      await api.post(`/profiles/${userId}/profile-pictures`, { imageUrl });
    } catch (error) {
      console.error('Error saving profile picture to history:', error);
      throw error; // Re-throw to allow handling in the component
    }
  },
};
