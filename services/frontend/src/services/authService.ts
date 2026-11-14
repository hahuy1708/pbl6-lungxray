import api from './api';

export interface LoginResponseData {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  full_name: string;
  role: 'DOCTOR' | 'NURSE' | 'ADMIN';
  name_room?: string;
  nameRoom?: string;
  must_change_password: boolean;
}

export const authService = {
  login: async (username: string, password: string): Promise<LoginResponseData> => {
    const response = await api.post<LoginResponseData>('/auth/login', {
      username: username.trim(),
      password: password,
    });
    return response.data;
  },

  changePassword: async (old_password: string, new_password: string) => {
    const response = await api.post('/auth/change-password', {
      old_password,
      new_password,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  toggleDoctorStatus: async (is_available: boolean) => {
    const response = await api.patch('/auth/doctor-status', null, {
      params: { is_available }
    });
    return response.data;
  },
};
