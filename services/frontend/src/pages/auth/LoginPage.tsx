import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../stores/authStore';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const data = await authService.login(username, password);

      login(data.access_token, {
        id: data.user_id,
        username: data.username,
        full_name: data.full_name,
        role: data.role,
        is_active: true,
        must_change_password: data.must_change_password,
        created_at: new Date().toISOString(),
        name_room: data.name_room || data.nameRoom,
        nameRoom: data.nameRoom || data.name_room,
      });

      // Điều hướng dựa vào vai trò
      if (data.role === 'DOCTOR') {
        navigate('/doctor/workspace', { replace: true });
      } else if (data.role === 'NURSE') {
        navigate('/nurse/reception', { replace: true });
      } else if (data.role === 'ADMIN') {
        navigate('/admin/users', { replace: true });
      } else {
        navigate('/patients', { replace: true });
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setErrorMessage(detail);
      } else if (err.response?.status === 400) {
        setErrorMessage('Tên đăng nhập hoặc mật khẩu không đúng.');
      } else if (err.response?.status === 423) {
        setErrorMessage(detail || 'Tài khoản đang bị khoá tạm thời. Thử lại sau.');
      } else {
        setErrorMessage('Chưa kết nối được máy chủ. Thử lại sau.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const field =
    'mt-1 w-full rounded-sm border border-chrome-200 bg-white px-3 py-2 text-sm text-chrome-900 placeholder:text-chrome-600/70 focus:outline focus:outline-2 focus:outline-accent-500';

  return (
    <div className="flex min-h-screen items-center justify-center bg-chrome-50 p-4">
      <div className="w-full max-w-sm rounded-sm border border-chrome-200 bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-sm bg-accent-600 text-white">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-chrome-900">LungAI X-ray</h1>
            <p className="text-xs text-chrome-600">Chẩn đoán X-quang phổi và quản lý khám bệnh</p>
          </div>
        </div>

        {errorMessage && (
          <div role="alert" className="mb-4 rounded-sm border border-flag-500/40 bg-flag-50 px-3 py-2.5 text-sm text-flag-500">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-chrome-900">Tên đăng nhập</label>
            <input
              id="username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={field}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-chrome-900">Mật khẩu</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={field}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-sm bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:opacity-50"
          >
            {isLoading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
};
