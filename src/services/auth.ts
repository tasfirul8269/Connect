import api from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  account_type: 'personal' | 'organization';
  personalData?: {
    first_name: string;
    last_name: string;
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

export const authService = {
  login: async (data: LoginData) => {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  signup: async (data: SignupData) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  googleLogin: async (code: string) => {
    const response = await api.post('/auth/google', { code });
    return response.data as { token: string; user: any; needs_completion?: boolean };
  },

  facebookLogin: async (accessToken: string) => {
    const response = await api.post('/auth/facebook', { access_token: accessToken });
    return response.data as { token: string; user: any; needs_completion?: boolean };
  },
};
