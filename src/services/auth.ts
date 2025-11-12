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
    date_of_birth?: string;
    phone_number?: string;
    gender?: string;
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

  registerInit: async (email: string, password: string, account_type: 'personal' | 'organization' = 'personal') => {
    const response = await api.post('/auth/register-init', { email, password, account_type });
    return response.data as { message: string; pending_verification: boolean };
  },

  verifyEmailOTP: async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-email/verify-otp', { email, otp });
    return response.data as { message: string; token: string; user: any };
  },

  resendEmailVerificationOTP: async (email: string) => {
    const response = await api.post('/auth/verify-email/send-otp', { email });
    return response.data as { message: string };
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

  checkEmail: async (email: string) => {
    const response = await api.post('/auth/check-email', { email });
    return response.data as { available: boolean; provider?: string; message?: string };
  },

  sendPasswordResetOTP: async (email: string) => {
    const response = await api.post('/auth/forgot-password/send-otp', { email });
    return response.data;
  },

  verifyPasswordResetOTP: async (email: string, otp: string) => {
    const response = await api.post('/auth/forgot-password/verify-otp', { email, otp });
    return response.data as { message: string; resetToken: string };
  },

  resetPassword: async (resetToken: string, newPassword: string) => {
    const response = await api.post('/auth/forgot-password/reset-password', { resetToken, newPassword });
    return response.data;
  },
};
