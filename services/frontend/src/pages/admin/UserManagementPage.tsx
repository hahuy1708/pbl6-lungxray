import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Lock,
  Unlock,
  KeyRound,
  Edit3,
  CheckCircle,
  AlertCircle,
  Building,
  Copy,
  Check
} from 'lucide-react';
import api from '../../services/api';
import { User, ClinicRoom } from '../../types';
import { roomService } from '../../services/roomService';
import { Modal } from '../../components/common/Modal';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filter states
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create User Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<'DOCTOR' | 'NURSE' | 'ADMIN'>('DOCTOR');
  const [newRoomId, setNewRoomId] = useState<number | ''>('');
  const [newNameRoom, setNewNameRoom] = useState<string>('');
  const [newPhone, setNewPhone] = useState('');
  const [availableRooms, setAvailableRooms] = useState<ClinicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  // Reset / Create Password Result Modal
  const [passwordResult, setPasswordResult] = useState<{ username: string; tempPass: string; title: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const usersRes = await api.get('/users', {
        params: { role: roleFilter || undefined, search: searchQuery || undefined }
      });
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const rooms = await roomService.getAvailableRooms();
      setAvailableRooms(rooms);
      if (rooms.length > 0) {
        setNewRoomId(rooms[0].id);
        setNewNameRoom(rooms[0].room_name);
      } else {
        setNewRoomId('');
        setNewNameRoom('');
      }
    } catch (err) {
      console.error('Lỗi tải danh sách phòng khám:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  useEffect(() => {
    if (isCreateModalOpen && newRole === 'DOCTOR') {
      loadAvailableRooms();
    }
  }, [isCreateModalOpen, newRole]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateMsg('');
    try {
      const payload: any = {
        username: newUsername,
        full_name: newFullName,
        role: newRole,
        phone: newPhone || null,
      };

      if (newRole === 'DOCTOR') {
        payload.room_id = newRoomId ? Number(newRoomId) : null;
        payload.name_room = newNameRoom || null;
      }

      const res = await api.post('/users', payload);

      setIsCreateModalOpen(false);
      setNewUsername('');
      setNewFullName('');
      setNewRoomId('');
      setNewNameRoom('');
      setNewPhone('');
      loadData();

      if (res.data.temporary_password) {
        setPasswordResult({
          username: res.data.username,
          tempPass: res.data.temporary_password,
          title: "Tạo Tài Khoản Mới Thành Công"
        });
      }
    } catch (err: any) {
      setCreateMsg(err.response?.data?.detail || 'Lỗi khi tạo tài khoản.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (confirm(`Bạn có chắc muốn ${user.is_active ? 'KHÓA' : 'KÍCH HOẠT'} tài khoản '${user.username}'?`)) {
      try {
        await api.patch(`/users/${user.id}/status`, { is_active: !user.is_active });
        loadData();
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Lỗi khi đổi trạng thái.');
      }
    }
  };

  const handleResetPassword = async (user: User) => {
    if (confirm(`Đặt lại mật khẩu tạm thời cho tài khoản '${user.username}'?`)) {
      try {
        const res = await api.post(`/users/${user.id}/reset-password`);
        setPasswordResult({
          username: user.username,
          tempPass: res.data.temporary_password,
          title: "Cấp Lại Mật Khẩu Tạm Thời Thành Công"
        });
      } catch (err: any) {
        alert(err.response?.data?.detail || 'Lỗi khi reset mật khẩu.');
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-chrome-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-accent-600" />
            Quản Lý Người Dùng & Phân Quyền
          </h1>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2.5 bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold rounded-sm transition-all flex items-center gap-1.5"
        >
          <UserPlus className="w-4 h-4" />
          Cấp Mới Tài Khoản
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-sm border border-chrome-200">
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 bg-chrome-50 border border-chrome-200 rounded-sm text-xs font-medium text-chrome-900 focus:outline focus:outline-2 focus:outline-accent-500"
        >
          <option value="">Tất cả vai trò (Role)</option>
          <option value="DOCTOR">Bác sĩ (DOCTOR)</option>
          <option value="NURSE">Y tá / Điều dưỡng (NURSE)</option>
          <option value="ADMIN">Quản trị viên (ADMIN)</option>
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadData()}
          placeholder="Tìm theo username hoặc họ tên..."
          className="px-3.5 py-2 rounded-sm border border-chrome-200 text-xs w-64 focus:outline focus:outline-2 focus:outline-accent-500"
        />

        <button
          onClick={loadData}
          className="px-4 py-2 bg-chrome-100 hover:bg-chrome-200 text-chrome-900 text-xs font-semibold rounded-sm transition-colors"
        >
          Lọc
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-sm border border-chrome-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-chrome-50 border-b border-chrome-200 text-chrome-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tên Đăng Nhập</th>
                <th className="py-3.5 px-4">Họ và Tên</th>
                <th className="py-3.5 px-4">Vai Trò</th>
                <th className="py-3.5 px-4">Phòng Khám</th>
                <th className="py-3.5 px-4">Số Điện Thoại</th>
                <th className="py-3.5 px-4">Trạng Thái</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chrome-100 text-chrome-900">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-chrome-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-accent-600">
                    {u.username}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-chrome-900">
                    {u.full_name}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${u.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : u.role === 'DOCTOR'
                        ? 'bg-chrome-100 text-accent-600'
                        : 'bg-clear-50 text-clear-500'
                      }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-chrome-600 font-medium">
                    {u.name_room || u.nameRoom || '—'}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    {u.phone || '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-clear-500 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-clear-500" /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-flag-500 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-flag-500" /> Bị khóa
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5">
                    <button
                      onClick={() => handleResetPassword(u)}
                      className="p-1.5 text-chrome-600 hover:text-amber-600 hover:bg-chrome-100 rounded-sm transition-colors"
                      title="Đặt lại mật khẩu tạm"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={`p-1.5 rounded-sm transition-colors ${u.is_active
                        ? 'text-flag-500 hover:bg-flag-50'
                        : 'text-clear-500 hover:bg-clear-50'
                        }`}
                      title={u.is_active ? 'Khóa tài khoản' : 'Mở khóa'}
                    >
                      {u.is_active ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Thêm Mới Cán Bộ Y Tế / Tài Khoản"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {createMsg && (
            <div className="p-3 bg-flag-50 border border-flag-50 text-flag-500 text-xs rounded-sm">
              {createMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-chrome-900 mb-1">Tên đăng nhập <span className="text-flag-500">*</span></label>
            <input
              type="text"
              required
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              placeholder="VD: bs.nguyenvana"
              className="w-full px-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-chrome-900 mb-1">Họ và tên đầy đủ <span className="text-flag-500">*</span></label>
            <input
              type="text"
              required
              value={newFullName}
              onChange={(e) => setNewFullName(e.target.value)}
              placeholder="VD: BSCKI Nguyễn Văn A"
              className="w-full px-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-chrome-900 mb-1">Vai trò quyền hạn (Role) <span className="text-flag-500">*</span></label>
            <select
              value={newRole}
              onChange={(e) => {
                const selectedRole = e.target.value as 'DOCTOR' | 'NURSE' | 'ADMIN';
                setNewRole(selectedRole);
                if (selectedRole !== 'DOCTOR') {
                  setNewRoomId('');
                  setNewNameRoom('');
                }
              }}
              className="w-full px-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500"
            >
              <option value="DOCTOR">Bác sĩ (DOCTOR)</option>
              <option value="NURSE">Y tá / Điều dưỡng (NURSE)</option>
              <option value="ADMIN">Quản trị viên (ADMIN)</option>
            </select>
          </div>

          {/* CHỈ HIỂN THỊ PHÂN PHÒNG KHI ROLE LÀ DOCTOR */}
          {newRole === 'DOCTOR' && (
            <div className="p-3.5 bg-chrome-50/60 border border-chrome-100 rounded-sm space-y-1.5">
              <label className="block text-xs font-bold text-accent-600">
                Phòng khám phân công (Mỗi bác sĩ 1 phòng riêng) <span className="text-flag-500">*</span>
              </label>

              {isLoadingRooms ? (
                <div className="text-xs text-chrome-600 py-1.5">Đang tải danh sách phòng khả dụng...</div>
              ) : availableRooms.length === 0 ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-sm text-xs text-amber-800">
                  ⚠️ Tất cả các phòng khám hiện tại đã được phân công cho bác sĩ khác. Vui lòng thêm phòng mới hoặc giải phóng phòng trước.
                </div>
              ) : (
                <select
                  value={newRoomId}
                  required
                  onChange={(e) => {
                    const rId = Number(e.target.value);
                    setNewRoomId(rId);
                    const found = availableRooms.find((r) => r.id === rId);
                    setNewNameRoom(found ? found.room_name : '');
                  }}
                  className="w-full px-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500 bg-white"
                >
                  <option value="">-- Chọn phòng khám còn trống --</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      [{room.room_code}] {room.room_name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-chrome-600">
                * Các phòng đã được bác sĩ khác đảm nhận sẽ tự động bị ẩn khỏi danh sách.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-chrome-900 mb-1">Số điện thoại liên hệ</label>
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="0912345678"
              className="w-full px-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500"
            />
          </div>

          <p className="text-xs text-chrome-600 italic">
            * Hệ thống sẽ tự động tạo mật khẩu ngẫu nhiên ban đầu. Người dùng sẽ phải tự đổi mật khẩu khi đăng nhập lần đầu tiên.
          </p>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-chrome-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-chrome-600 hover:bg-chrome-100 rounded-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="px-5 py-2 text-xs font-bold text-white bg-accent-600 hover:bg-accent-500 rounded-sm transition-all disabled:opacity-50"
            >
              {isCreating ? 'Đang tạo...' : 'Tạo Tài Khoản'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Result Modal (Create or Reset) */}
      {passwordResult && (
        <Modal
          isOpen={true}
          onClose={() => {
            setPasswordResult(null);
            setCopied(false);
          }}
          title={passwordResult.title}
          maxWidth="sm"
        >
          <div className="space-y-4 text-center">
            <CheckCircle className="w-12 h-12 text-clear-500 mx-auto" />
            <p className="text-xs text-chrome-600">
              Mật khẩu tạm thời cho tài khoản <b className="font-mono text-chrome-900">{passwordResult.username}</b>:
            </p>
            <div className="flex items-center justify-between p-3 bg-chrome-100 rounded-sm border border-chrome-200">
              <span className="font-mono font-extrabold text-lg text-accent-600 tracking-wider select-all ml-2">
                {passwordResult.tempPass}
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(passwordResult.tempPass);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-2.5 py-1.5 bg-white border border-chrome-200 hover:border-chrome-200 rounded-sm text-xs font-semibold text-chrome-900 flex items-center gap-1 transition-colors"
                title="Sao chép mật khẩu"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-clear-500" />
                    <span className="text-clear-500 font-bold">Đã chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-chrome-600" />
                    <span>Sao chép</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-chrome-600">
              Vui lòng sao chép và bàn giao cho nhân viên. Nhân viên sẽ được yêu cầu đổi mật khẩu ngay khi đăng nhập lần đầu tiên.
            </p>
            <button
              onClick={() => {
                setPasswordResult(null);
                setCopied(false);
              }}
              className="w-full py-2 bg-chrome-900 text-white rounded-sm text-xs font-bold hover:bg-ink-950 transition-colors"
            >
              Đã Ghi Nhận
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};
