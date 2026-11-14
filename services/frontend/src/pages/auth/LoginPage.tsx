import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
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
        setErrorMessage('Tên đăng nhập hoặc mật khẩu không chính xác.');
      } else if (err.response?.status === 423) {
        setErrorMessage(detail || 'Tài khoản đang bị tạm khóa. Vui lòng thử lại sau.');
      } else {
        setErrorMessage('Không thể kết nối máy chủ. Vui lòng kiểm tra backend.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-slate-100">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/30">
            <Activity className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            LungAI Hospital
          </h1>
          <p className="text-xs text-slate-300">
            Hệ thống Chẩn đoán X-quang Phổi & Quản lý Quy trình Khám
          </p>
        </div>

        {/* Khung báo lỗi trực quan */}
        {errorMessage && (
          <div className="p-3.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-200 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Tên đăng nhập
            </label>
            <div className="relative">
              <UserIcon className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full pl-11 pr-4 py-2.5 bg-slate-900/60 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-sky-500/30 transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng Nhập Vào Hệ Thống'}
          </button>
        </form>
      </div>
    </div>
  );
};
