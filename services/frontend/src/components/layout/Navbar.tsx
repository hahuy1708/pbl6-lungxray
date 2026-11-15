import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Building2,
  CheckCircle2,
  ClipboardList,
  KeyRound,
  LogOut,
  Menu,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { Modal } from '../common/Modal';
import { authService } from '../../services/authService';

interface NavItem {
  to: string;
  label: string;
  Icon: LucideIcon;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  DOCTOR: [
    { to: '/doctor/workspace', label: 'Hàng đợi khám', Icon: Stethoscope },
    { to: '/patients', label: 'Hồ sơ bệnh nhân', Icon: ClipboardList },
    { to: '/doctor/completed', label: 'Đã khám', Icon: CheckCircle2 },
  ],
  NURSE: [
    { to: '/nurse/reception', label: 'Tiếp nhận', Icon: UserPlus },
    { to: '/nurse/rooms', label: 'Phòng khám', Icon: Building2 },
    { to: '/patients', label: 'Tra cứu bệnh nhân', Icon: UserCheck },
  ],
  ADMIN: [
    { to: '/admin/users', label: 'Cán bộ', Icon: Users },
    { to: '/admin/audit-logs', label: 'Nhật ký hệ thống', Icon: ShieldCheck },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Quản trị viên',
  DOCTOR: 'Bác sĩ',
  NURSE: 'Điều dưỡng',
};

export const Navbar: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState(false);

  const navItems = user ? NAV_BY_ROLE[user.role] ?? [] : [];
  const isAvailable = user?.is_available ?? true;

  const handleToggleDoctorAvailability = async () => {
    if (!user || user.role !== 'DOCTOR' || isTogglingAvailability) return;
    setIsTogglingAvailability(true);
    try {
      const updatedUser = await authService.toggleDoctorStatus(!isAvailable);
      updateUser({ is_available: updatedUser.is_available });
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Chưa cập nhật được trạng thái nhận bệnh.');
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
      setPasswordSuccess('Đã đổi mật khẩu.');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setOldPassword('');
        setNewPassword('');
        setPasswordSuccess('');
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Chưa đổi được mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkClass = (path: string) =>
    `flex items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500 ${
      location.pathname === path
        ? 'border-accent-500 font-medium text-chrome-900'
        : 'border-transparent text-chrome-600 hover:text-chrome-900'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-chrome-200 bg-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5 text-chrome-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500">
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-accent-600 text-white">
              <Activity className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">LungAI X-ray</span>
          </Link>

          {/* Điều hướng: máy tính */}
          <nav aria-label="Chính" className="hidden h-14 items-stretch md:flex">
            {navItems.map(({ to, label, Icon }) => (
              <Link key={to} to={to} aria-current={location.pathname === to ? 'page' : undefined} className={linkClass(to)}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {user?.role === 'DOCTOR' && (
              <button
                type="button"
                role="switch"
                aria-checked={isAvailable}
                disabled={isTogglingAvailability}
                onClick={handleToggleDoctorAvailability}
                className="hidden items-center gap-2 rounded-sm border border-chrome-200 px-2.5 py-1 text-xs text-chrome-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500 disabled:opacity-50 sm:flex"
              >
                <span className={`relative inline-flex h-4 w-7 rounded-full transition-colors ${isAvailable ? 'bg-clear-500' : 'bg-chrome-600'}`}>
                  <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${isAvailable ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                </span>
                {isAvailable ? 'Đang nhận bệnh' : 'Tạm nghỉ'}
              </button>
            )}

            <div className="hidden flex-col items-end leading-tight sm:flex">
              <span className="text-sm font-medium text-chrome-900">{user?.full_name || user?.username}</span>
              <span className="text-xs text-chrome-600">
                {user ? ROLE_LABEL[user.role] : ''}
                {(user?.name_room || user?.nameRoom) && ` · ${user.name_room || user.nameRoom}`}
              </span>
            </div>

            <div className="flex items-center gap-0.5 border-l border-chrome-200 pl-3">
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                aria-label="Đổi mật khẩu"
                className="rounded-sm p-2 text-chrome-600 hover:bg-chrome-100 hover:text-chrome-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500"
              >
                <KeyRound className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Đăng xuất"
                className="rounded-sm p-2 text-chrome-600 hover:bg-chrome-100 hover:text-flag-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
              </button>
              {navItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-controls="mobile-nav"
                  aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                  className="rounded-sm p-2 text-chrome-600 hover:bg-chrome-100 hover:text-chrome-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500 md:hidden"
                >
                  {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Điều hướng: điện thoại */}
        {menuOpen && navItems.length > 0 && (
          <nav id="mobile-nav" aria-label="Chính" className="border-t border-chrome-200 bg-white md:hidden">
            <ul className="py-1">
              {navItems.map(({ to, label, Icon }) => (
                <li key={to}>
                  <Link
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    aria-current={location.pathname === to ? 'page' : undefined}
                    className={`flex items-center gap-3 px-4 py-3 text-sm ${location.pathname === to ? 'bg-chrome-100 font-medium text-chrome-900' : 'text-chrome-600 hover:bg-chrome-50'}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
              {user?.role === 'DOCTOR' && (
                <li className="border-t border-chrome-200 px-4 py-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isAvailable}
                    disabled={isTogglingAvailability}
                    onClick={handleToggleDoctorAvailability}
                    className="flex w-full items-center justify-between text-sm text-chrome-900 disabled:opacity-50"
                  >
                    Nhận bệnh
                    <span className={`relative inline-flex h-4 w-7 rounded-full ${isAvailable ? 'bg-clear-500' : 'bg-chrome-600'}`}>
                      <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${isAvailable ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </nav>
        )}
      </header>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Đổi mật khẩu">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div role="alert" className="rounded-sm border border-flag-500/40 bg-flag-50 p-3 text-sm text-flag-500">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div role="status" className="rounded-sm border border-clear-500/40 bg-clear-50 p-3 text-sm text-clear-500">
              {passwordSuccess}
            </div>
          )}

          <div>
            <label htmlFor="old-password" className="mb-1 block text-sm font-medium text-chrome-900">Mật khẩu hiện tại</label>
            <input
              id="old-password"
              name="old-password"
              type="password"
              autoComplete="current-password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full rounded-sm border border-chrome-200 px-3 py-2 text-sm focus:outline focus:outline-2 focus:outline-accent-500"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-chrome-900">Mật khẩu mới (tối thiểu 6 ký tự)</label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-sm border border-chrome-200 px-3 py-2 text-sm focus:outline focus:outline-2 focus:outline-accent-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-chrome-200 pt-4">
            <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="rounded-sm px-4 py-2 text-sm text-chrome-600 hover:bg-chrome-100">
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-sm bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu…' : 'Lưu mật khẩu'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};
