import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Activity,
  UserCheck,
  LogOut,
  KeyRound,
  Stethoscope,
  UserPlus,
  ClipboardList,
  ShieldCheck,
  Users,
  CheckCircle2,
  Power,
  Building2
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Modal } from '../common/Modal';
import { authService } from '../../services/authService';

export const Navbar: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);

  const handleToggleDoctorAvailability = async () => {
    if (!user || user.role !== 'DOCTOR' || isTogglingAvailability) return;
    const currentStatus = user.is_available ?? true;
    const nextStatus = !currentStatus;
    setIsTogglingAvailability(true);
    try {
      const updatedUser = await authService.toggleDoctorStatus(nextStatus);
      updateUser({ is_available: updatedUser.is_available });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Không thể cập nhật trạng thái hoạt động.');
    } finally {
      setIsTogglingAvailability(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setIsSubmitting(true);
    try {
      await authService.changePassword(oldPassword, newPassword);
      setPasswordSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setOldPassword('');
        setNewPassword('');
        setPasswordSuccess('');
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Lỗi khi đổi mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-purple-100 text-purple-700">Admin</span>;
      case 'DOCTOR':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-sky-100 text-sky-700">Bác sĩ</span>;
      case 'NURSE':
        return <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-emerald-100 text-emerald-700">Y tá / Điều dưỡng</span>;
      default:
        return null;
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <Link to="/" className="text-base font-bold text-slate-800 tracking-tight hover:text-sky-600 transition-colors flex items-center gap-2">
                  <span>LungAI X-ray</span>
                  <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full border border-slate-200">v1.0</span>
                </Link>
                <p className="text-xs text-slate-500 hidden sm:block">Quản lý bệnh nhân và hỗ trợ phân tích tình trạng phổi</p>
              </div>
            </div>

            {/* Navigation by Role */}
            <nav className="hidden md:flex items-center gap-1">
              {user?.role === 'DOCTOR' && (
                <>
                  <Link
                    to="/doctor/workspace"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/doctor/workspace')
                      ? 'bg-sky-50 text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    Hàng đợi khám
                  </Link>
                  <Link
                    to="/patients"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/patients')
                      ? 'bg-sky-50 text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <ClipboardList className="w-4 h-4" />
                    Hồ Sơ & Bệnh Án
                  </Link>
                  <Link
                    to="/doctor/completed"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/doctor/completed')
                      ? 'bg-sky-50 text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Đã Khám
                  </Link>
                </>
              )}

              {user?.role === 'NURSE' && (
                <>
                  <Link
                    to="/nurse/reception"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/nurse/reception')
                      ? 'bg-sky-50 text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Tiếp Nhận BN
                  </Link>
                  <Link
                    to="/nurse/rooms"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/nurse/rooms') || isActive('/nurse/queue')
                      ? 'bg-sky-50 text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Phòng Khám
                  </Link>
                  <Link
                    to="/patients"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/patients')
                      ? 'bg-sky-50 text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    Tra Cứu BN
                  </Link>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <>
                  <Link
                    to="/admin/users"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/users')
                      ? 'bg-sky-50 text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <Users className="w-4 h-4" />
                    Quản Lý Cán Bộ
                  </Link>
                  <Link
                    to="/admin/audit-logs"
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${isActive('/admin/audit-logs')
                      ? 'bg-sky-50 text-sky-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Nhật Ký Kiểm Toán
                  </Link>
                </>
              )}
            </nav>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              {/* Nút bật/tắt trạng thái hoạt động độc lập dành riêng cho Bác sĩ */}
              {user?.role === 'DOCTOR' && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200">
                  <button
                    type="button"
                    disabled={isTogglingAvailability}
                    onClick={handleToggleDoctorAvailability}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${(user.is_available ?? true) ? 'bg-emerald-500' : 'bg-slate-300'
                      } ${isTogglingAvailability ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={(user.is_available ?? true) ? "Bác sĩ đang hoạt động (Bấm để tạm nghỉ)" : "Bác sĩ đang tạm nghỉ (Bấm để hoạt động trở lại)"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${(user.is_available ?? true) ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </button>
                  <span className={`text-xs font-semibold select-none flex items-center gap-1 ${(user.is_available ?? true) ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                    {(user.is_available ?? true) ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Nhận bệnh
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        Tạm nghỉ
                      </>
                    )}
                  </span>
                </div>
              )}

              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-800">{user?.full_name || user?.username}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {getRoleBadge(user?.role)}
                  {(user?.name_room || user?.nameRoom) && (
                    <span className="text-xs text-slate-400">| {user?.name_room || user?.nameRoom}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Đổi mật khẩu"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Đổi Mật Khẩu Cá Nhân"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
              {passwordSuccess}
            </div>
          )}

          <div>
            <label htmlFor="old-password" className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu hiện tại</label>
            <input
              id="old-password"
              name="old-password"
              type="password"
              autoComplete="current-password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nhập mật khẩu hiện tại"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới (tối thiểu 6 ký tự)</label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              placeholder="Nhập mật khẩu mới"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Đang cập nhật...' : 'Lưu Mật Khẩu'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
