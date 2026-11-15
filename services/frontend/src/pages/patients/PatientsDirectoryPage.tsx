import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserCheck,
  Edit3,
  Ticket,
  History,
  ShieldCheck,
  FileText,
  Eye,
  Clock,
  Stethoscope,
  UserPlus
} from 'lucide-react';
import { Patient } from '../../types';
import { patientService } from '../../services/patientService';
import { useAuthStore } from '../../stores/authStore';
import { Modal } from '../../components/common/Modal';
import { PatientHistoryModal } from '../../components/patient/PatientHistoryModal';
import { maskCard } from '../../utils/format';

export const PatientsDirectoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const isDoctor = user?.role === 'DOCTOR';
  const isNurse = user?.role === 'NURSE';
  const isAdmin = user?.role === 'ADMIN';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Edit Patient Modal (Only for Nurse / Admin)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editInsurance, setEditInsurance] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Patient History Modal (Available for all roles, primary action for Doctor)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);

  const loadPatients = async (query?: string) => {
    setIsLoading(true);
    try {
      const data = await patientService.getPatients(query);
      setPatients(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadPatients(searchQuery);
  };

  const handleOpenHistory = (p: Patient) => {
    setSelectedPatientForHistory(p);
    setIsHistoryModalOpen(true);
  };

  const handleOpenEdit = (p: Patient) => {
    // Only nurse and admin can edit
    if (isDoctor) return;
    setEditingPatient(p);
    setEditPhone(p.phone);
    setEditAddress(p.address || '');
    setEditInsurance(p.insurance_number || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPatient || isDoctor) return;
    setIsSaving(true);
    try {
      await patientService.updatePatient(editingPatient.id, {
        phone: editPhone,
        address: editAddress,
        insurance_number: editInsurance,
      });
      setIsEditModalOpen(false);
      loadPatients(searchQuery);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Lỗi khi cập nhật thông tin bệnh nhân.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header by Role */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-chrome-900 flex items-center gap-2.5">
            {isDoctor ? (
              <>
                <FileText className="w-7 h-7 text-accent-600" />
                Tra Cứu Hồ Sơ & Lịch Sử Bệnh Nhân
              </>
            ) : (
              <>
                <UserCheck className="w-7 h-7 text-accent-600" />
                Tra Cứu & Quản Lý Hồ Sơ Bệnh Nhân
              </>
            )}
          </h1>
          <p className="text-sm text-chrome-600 mt-1">
            {isDoctor
              ? 'Tra cứu thông tin bệnh nhân và lịch sử các đợt khám.'
              : 'Tra cứu thông tin và cập nhật thông tin liên hệ.'}
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-chrome-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nhập từ khóa tìm kiếm..."
              className="w-full pl-10 pr-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-accent-600 hover:bg-accent-500 text-white text-xs font-bold rounded-sm transition-colors whitespace-nowrap"
          >
            Tìm Kiếm
          </button>
        </form>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-sm border border-chrome-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-chrome-50 border-b border-chrome-200 text-chrome-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Mã BN</th>
                <th className="py-3.5 px-4">Họ và Tên</th>
                <th className="py-3.5 px-4">Số CCCD</th>
                <th className="py-3.5 px-4">Ngày Sinh / Giới Tính</th>
                <th className="py-3.5 px-4">Số Điện Thoại</th>
                <th className="py-3.5 px-4">Mã BHYT</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chrome-100 text-chrome-900">
              {patients.length > 0 ? (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-chrome-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-accent-600">
                      <button
                        onClick={() => handleOpenHistory(p)}
                        className="hover:underline text-accent-600 font-bold focus:outline-none"
                        title="Bấm để xem lịch sử khám bệnh"
                      >
                        {p.patient_code}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-chrome-900">
                      <button
                        onClick={() => handleOpenHistory(p)}
                        className="hover:text-accent-600 text-left font-bold focus:outline-none"
                        title="Bấm để xem lịch sử khám bệnh"
                      >
                        {p.full_name}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-chrome-600">
                      {maskCard(p.card_number)}
                    </td>
                    <td className="py-3.5 px-4">
                      {p.date_of_birth} ({p.gender === 'MALE' ? 'Nam' : p.gender === 'FEMALE' ? 'Nữ' : 'Khác'})
                    </td>
                    <td className="py-3.5 px-4 font-mono text-chrome-600">
                      {p.phone}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-chrome-600">
                      {p.insurance_number || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isDoctor ? (
                        /* CHỈ DÀNH CHO BÁC SĨ: Chỉ có nút Xem Lịch Sử Khám, KHÔNG có Sửa và Cấp Khám */
                        <button
                          onClick={() => handleOpenHistory(p)}
                          className="px-3 py-1.5 text-accent-600 hover:text-accent-600 bg-chrome-50 hover:bg-chrome-100 border border-chrome-200/80 rounded-sm font-bold inline-flex items-center gap-1.5 transition-colors"
                          title="Xem bệnh sử và toàn bộ các đợt khám của bệnh nhân"
                        >
                          <History className="w-3.5 h-3.5 text-accent-600" />
                          Xem Lịch Sử Khám
                        </button>
                      ) : (
                        /* DÀNH CHO Y TÁ & ADMIN: Có nút Lịch Sử, Sửa, và Cấp Khám */
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenHistory(p)}
                            className="p-1.5 text-chrome-600 hover:text-accent-600 hover:bg-chrome-100 rounded-sm transition-colors"
                            title="Xem lịch sử các đợt khám cũ"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="px-2.5 py-1 text-chrome-600 hover:text-ink-950 bg-chrome-100 hover:bg-chrome-200 rounded-sm font-medium inline-flex items-center gap-1 transition-colors"
                            title="Chỉnh sửa thông tin liên hệ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Sửa
                          </button>
                          <button
                            onClick={() => navigate(`/nurse/queue?patientId=${p.id}`)}
                            className="px-2.5 py-1 text-accent-600 hover:text-accent-600 bg-chrome-50 hover:bg-chrome-100 rounded-sm font-bold inline-flex items-center gap-1 transition-colors"
                            title="Phân phòng và cấp số thứ tự khám"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                            Cấp Khám
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-chrome-600">
                    {isLoading ? 'Đang tải dữ liệu bệnh nhân...' : 'Không tìm thấy hồ sơ bệnh nhân nào phù hợp.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Patient Medical History Modal (UC008) */}
      <PatientHistoryModal
        patient={selectedPatientForHistory}
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedPatientForHistory(null);
        }}
      />

      {/* Edit Patient Contact Modal (Chỉ hiển thị cho Y tá / Admin) */}
      {!isDoctor && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Chỉnh Sửa Thông Tin Hành Chính - ${editingPatient?.full_name || ''}`}
          maxWidth="md"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-chrome-900 mb-1">Số điện thoại liên hệ</label>
              <input
                type="tel"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-chrome-900 mb-1">Mã thẻ BHYT</label>
              <input
                type="text"
                value={editInsurance}
                onChange={(e) => setEditInsurance(e.target.value)}
                className="w-full px-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500 font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-chrome-900 mb-1">Địa chỉ thường trú / tạm trú</label>
              <textarea
                rows={2}
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3.5 py-2 rounded-sm border border-chrome-200 text-sm focus:outline focus:outline-2 focus:outline-accent-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-chrome-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-chrome-600 hover:bg-chrome-100 rounded-sm"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-accent-600 hover:bg-accent-500 rounded-sm transition-all disabled:opacity-50"
              >
                {isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
