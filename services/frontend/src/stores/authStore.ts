import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const safeParseUser = (): User | null => {
  try {
    const raw = localStorage.getItem('pbl6_user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw) as User;
  } catch (e) {
    localStorage.removeItem('pbl6_user');
    localStorage.removeItem('pbl6_token');
    return null;
  }
};

const initialToken = localStorage.getItem('pbl6_token') || null;
const initialUser = initialToken ? safeParseUser() : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!(initialToken && initialUser),

  login: (token: string, user: User) => {
    try {
      localStorage.setItem('pbl6_token', token);
      localStorage.setItem('pbl6_user', JSON.stringify(user));
    } catch (e) {
      console.error('Không thể lưu localStorage:', e);
    }
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    try {
      localStorage.removeItem('pbl6_token');
      localStorage.removeItem('pbl6_user');
    } catch (e) {
      // ignore
    }
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUser: (fields: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updated = { ...state.user, ...fields };
      try {
        localStorage.setItem('pbl6_user', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return { user: updated };
    });
  },
}));
