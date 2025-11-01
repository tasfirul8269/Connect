import api from './api';

export interface PersonalProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  phone_number?: string;
  gender?: 'male' | 'female' | 'other';
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

  updatePersonalProfile: async (userId: string, data: Partial<PersonalProfile>): Promise<PersonalProfile> => {
    const response = await api.put(`/profiles/personal/${userId}`, data);
    return response.data;
  },

  updateOrganizationProfile: async (userId: string, data: Partial<OrganizationProfile>): Promise<OrganizationProfile> => {
    const response = await api.put(`/profiles/organization/${userId}`, data);
    return response.data;
  },
};
