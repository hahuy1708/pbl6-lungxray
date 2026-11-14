import React, { useState, useEffect, useRef } from 'react';
import {
  UserPlus,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  CreditCard,
  RefreshCw,
  Save,
  UserCheck,
  User,
  Building2,
  Ticket,
  Printer,
  AlertOctagon
} from 'lucide-react';
import { patientService } from '../../services/patientService';
import { encounterService } from '../../services/encounterService';
import { Patient, RoomQueueStats, Encounter } from '../../types';
import { Modal } from '../../components/common/Modal';

export const ReceptionPage: React.FC = () => {
  const cccdInputRef = useRef<HTMLInputElement>(null);

  const initialFormState = {
    full_name: '',
    card_number: '',
    date_of_birth: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    phone: '',
    address: '',
    insurance_number: '',
  };

  const [formData, setFormData] = useState(initialFormState);
  const [existingPatient, setExistingPatient] = useState<Patient | null>(null);
  const [isCheckingCCCD, setIsCheckingCCCD] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Danh sách phòng khám & phòng được chọn
  const [rooms, setRooms] = useState<RoomQueueStats[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Trạng thái lưu & kết quả cấp STT
  const [assignedEncounter, setAssignedEncounter] = useState<Encounter | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Tải danh sách phòng khám
  const loadRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const roomStats = await encounterService.getRoomsStatus();
      setRooms(roomStats);
      const availableRoom = roomStats.find((r) => !r.is_overloaded && r.is_available !== false);
      if (availableRoom && !selectedRoom) {
        setSelectedRoom(availableRoom.name);
      }
    } catch (err) {
      console.error('Lỗi khi tải phòng khám:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Debounced check CCCD
  useEffect(() => {
    const cccd = formData.card_number.trim();
    if (cccd.length >= 9) {
      setIsCheckingCCCD(true);
      const timer = setTimeout(async () => {
        try {
          const results = await patientService.getPatients(cccd);
          const found = results.find((p) => p.card_number === cccd);
          if (found) {
            setExistingPatient(found);
            // Tự động điền (Autofill) toàn bộ thông tin của bệnh nhân đã có
            setFormData({
              card_number: found.card_number || cccd,
              full_name: found.full_name || '',
              date_of_birth: found.date_of_birth || '',
              gender: (found.gender as any) || 'MALE',
              phone: found.phone || '',
              address: found.address || '',
              insurance_number: found.insurance_number || '',
            });
            setErrorMsg('');
          } else {
            setExistingPatient(null);
          }
          setHasSearched(true);
        } catch (err) {
          console.error('Lỗi khi tra cứu CCCD:', err);
        } finally {
          setIsCheckingCCCD(false);
        }
      }, 350);

      return () => clearTimeout(timer);
    } else {
      setExistingPatient(null);
      setHasSearched(false);
      setIsCheckingCCCD(false);
    }
  }, [formData.card_number]);

  // Xóa form để tiếp nhận bệnh nhân khác
  const handleResetForm = () => {
    setFormData(initialFormState);
    setExistingPatient(null);
    setHasSearched(false);
    setErrorMsg('');
    setSuccessMsg('');
    loadRooms();
    if (cccdInputRef.current) {
      cccdInputRef.current.focus();
    }
  };

  // Cập nhật thông tin cho bệnh nhân cũ nếu có chỉnh sửa SĐT, BHYT, Địa chỉ
  const handleUpdateExisting = async () => {
    if (!existingPatient) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsUpdating(true);

    try {
      const updated = await patientService.updatePatient(existingPatient.id, {
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        insurance_number: formData.insurance_number,
      });
      setExistingPatient(updated);
      setSuccessMsg('Đã cập nhật thông tin bệnh nhân thành công!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi cập nhật thông tin bệnh nhân.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Lưu hồ sơ và cấp STT phân phòng khám ngay tại chỗ
  const handleSaveAndAssignQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedRoom) {
      setErrorMsg('Vui lòng chọn phòng khám phù hợp cho bệnh nhân.');
      return;
    }

    setIsSubmitting(true);

    try {
      let patientId: number;

      if (existingPatient) {
        // Cập nhật thông tin mới nhất nếu có thay đổi
        await patientService.updatePatient(existingPatient.id, {
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          insurance_number: formData.insurance_number,
        });
        patientId = existingPatient.id;
      } else {
        // Tạo hồ sơ bệnh nhân mới
        const newPatient = await patientService.createPatient({
          ...formData,
          gender: formData.gender as any,
        });
        patientId = newPatient.id;
      }

      // Khởi tạo lượt khám & Phân phòng cấp STT
      const newEnc = await encounterService.createEncounter(patientId, selectedRoom);
      const updatedEnc = await encounterService.assignQueue(newEnc.id, selectedRoom);

      setAssignedEncounter(updatedEnc);
      setIsTicketModalOpen(true);
      loadRooms(); // Cập nhật lại số liệu tải phòng
    } catch (err: any) {
      if (err.response?.status === 409) {
        const detail = err.response.data.detail;
        setErrorMsg(detail.message || 'Bệnh nhân đã tồn tại với số CCCD này.');
      } else {
        setErrorMsg(err.response?.data?.detail || 'Lỗi khi tạo hồ sơ hoặc cấp STT khám.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
          <UserPlus className="w-7 h-7 text-sky-600" />
          Tiếp Nhận & Đăng Ký Khám Bệnh
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Nhập thông tin bệnh nhân qua CCCD, lựa chọn phòng khám và cấp số trực tiếp tại quầy tiếp đón.
        </p>
      </div>

      {/* Thông báo lỗi / thành công */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSaveAndAssignQueue} className="space-y-6">
        {/* KHỐI 1: THÔNG TIN HÀNH CHÍNH BỆNH NHÂN */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-sky-600" />
              1. Thông Tin Hành Chính Bệnh Nhân
            </h2>
            <button
              type="button"
              onClick={handleResetForm}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Làm mới form
            </button>
          </div>

          {/* Ô nhập CCCD đầu tiên nổi bật */}
          <div className="p-4 bg-sky-50/60 border-2 border-sky-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="card_number" className="text-xs font-black text-sky-900 uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-sky-600" />
                Số Căn Cước Công Dân (CCCD)
              </label>
              {isCheckingCCCD && (
                <span className="text-xs text-sky-600 flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Đang kiểm tra CSDL...
                </span>
              )}
            </div>
            <input
              ref={cccdInputRef}
              id="card_number"
              type="text"
              required
              maxLength={12}
              value={formData.card_number}
              onChange={(e) => setFormData({ ...formData, card_number: e.target.value.replace(/\D/g, '') })}
              className="w-full px-4 py-3 bg-white rounded-xl border border-sky-300 text-slate-900 font-mono text-base font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 tracking-wider shadow-inner"
              autoFocus
            />

            {/* Trạng thái nhận diện CCCD */}
            {hasSearched && (
              existingPatient ? (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    Bệnh nhân cũ ({existingPatient.patient_code} - {existingPatient.full_name}).
                  </span>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleUpdateExisting}
                    className="text-xs font-bold text-sky-700 hover:text-sky-900 hover:underline flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isUpdating ? 'Đang lưu...' : 'Lưu sửa đổi nếu có'}
                  </button>
                </div>
              ) : (
                <div className="text-xs text-amber-700 font-medium flex items-center gap-1 pt-1">
                  <span>Bệnh nhân mới</span>
                </div>
              )
            )}
          </div>

          {/* Các trường thông tin còn lại */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="full_name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Họ và Tên Bệnh Nhân <span className="text-rose-500">*</span>
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Ví dụ: Nguyễn Văn Bình"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>

            <div>
              <label htmlFor="gender" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Giới Tính <span className="text-rose-500">*</span>
              </label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium bg-white"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <label htmlFor="date_of_birth" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngày Tháng Năm Sinh <span className="text-rose-500">*</span>
              </label>
              <input
                id="date_of_birth"
                type="date"
                required
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Số Điện Thoại Liên Hệ <span className="text-rose-500">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ví dụ: 0914706192"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>

            <div>
              <label htmlFor="insurance_number" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mã Thẻ BHYT (Nếu có)
              </label>
              <input
                id="insurance_number"
                type="text"
                value={formData.insurance_number}
                onChange={(e) => setFormData({ ...formData, insurance_number: e.target.value.toUpperCase() })}
                placeholder="VD: DN44095001234"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium font-mono"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Địa Chỉ Nơi Cư Trú
              </label>
              <input
                id="address"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>
          </div>
        </div>

        {/* KHỐI 2: LỰA CHỌN PHÒNG KHÁM & CẤP SỐ THỨ TỰ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-600" />
                2. Lựa Chọn Phòng Khám Của Bác Sĩ (Tự động cấp STT)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Ưu tiên lựa chọn phòng khám có ít người chờ nhất</p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Tối đa 35 ca / ngày / phòng</span>
          </div>

          {isLoadingRooms ? (
            <p className="text-xs text-slate-400 italic py-4">Đang tải danh sách phòng khám...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => {
                const isSelected = selectedRoom === room.name;
                const isPaused = room.is_available === false;
                const isBlocked = room.is_overloaded || isPaused;

                return (
                  <div
                    key={room.code}
                    onClick={() => {
                      if (!isBlocked) setSelectedRoom(room.name);
                    }}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${isBlocked
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : isSelected
                        ? 'bg-sky-50/80 border-sky-500 shadow-md ring-2 ring-sky-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                      }`}
                  >
                    {/* Status Badges */}
                    {isPaused ? (
                      <div className="absolute top-2 right-2 bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-300">
                        <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
                        Bác Sĩ Tạm Nghỉ
                      </div>
                    ) : isBlocked ? (
                      <div className="absolute top-2 right-2 bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-rose-300">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        OFF
                      </div>
                    ) : null}

                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{room.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-slate-400 font-mono">{room.code}</span>
                          {room.doctor_name && (
                            <span className="text-xs font-medium text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-md">
                              BS: {room.doctor_name}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isBlocked && isSelected && (
                        <CheckCircle className="w-5 h-5 text-sky-600" />
                      )}
                    </div>

                    {/* Queue Stats */}
                    <div className="grid grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block">Đang chờ khám:</span>
                        <span className="text-base font-extrabold text-amber-600">{room.waiting_count} bệnh nhân</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Tiếp nhận hôm nay:</span>
                        <span className="text-base font-bold text-slate-700">
                          {room.total_today} / {room.max_capacity}
                        </span>
                      </div>
                    </div>

                    {/* Load Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${isBlocked
                            ? 'bg-rose-500'
                            : room.load_percentage > 75
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            }`}
                          style={{ width: `${Math.min(room.load_percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nút Submit chính */}
          <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Dữ liệu CCCD & SĐT được mã hóa an toàn ở tầng ứng dụng
            </span>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !selectedRoom || formData.card_number.trim().length < 9}
                className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all text-sm disabled:opacity-50 flex items-center gap-2"
              >
                <Ticket className="w-4 h-4" />
                {isSubmitting ? 'Đang cấp số...' : 'Phân phòng khám'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Ticket Modal & Thermal Print Preview */}
      <Modal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
        title="Phiếu Số Thứ Tự Chờ Khám"
        maxWidth="md"
      >
        {assignedEncounter && (
          <div className="space-y-6 text-center">
            <div id="printable-ticket" className="p-6 bg-slate-50 border border-slate-300 rounded-2xl space-y-4">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="font-extrabold text-sm text-slate-800 uppercase tracking-tight">
                  Phòng Khám Chuyên Khoa Phổi PBL6
                </h4>
                <p className="text-xs text-slate-500">Phiếu tiếp đón & thứ tự khám trong ngày</p>
              </div>

              {/* Huge Queue Number */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Số Thứ Tự Của Bạn
                </span>
                <span className="text-6xl font-black text-sky-600 tracking-tight my-2 block font-mono">
                  {assignedEncounter.queue_number ? String(assignedEncounter.queue_number).padStart(2, '0') : '--'}
                </span>
              </div>

              <div className="text-left bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
                <p><span className="text-slate-500">Bệnh nhân:</span> <b className="text-slate-800">{assignedEncounter.patient?.full_name}</b></p>
                <p><span className="text-slate-500">Mã BN:</span> <b className="font-mono text-slate-800">{assignedEncounter.patient?.patient_code}</b></p>
                <p><span className="text-slate-500">Phòng khám:</span> <b className="text-sky-700 font-bold">{assignedEncounter.clinic_room}</b></p>
                <p><span className="text-slate-500">Mã lượt khám:</span> <b className="font-mono text-slate-600">{assignedEncounter.encounter_code}</b></p>
                <p><span className="text-slate-500">Thời gian tiếp nhận:</span> {new Date(assignedEncounter.admission_time).toLocaleTimeString('vi-VN')}</p>
              </div>

              <p className="text-xs text-slate-400 italic">
                * Vui lòng ngồi chờ trước cửa phòng khám và theo dõi số thứ tự trên màn hình LCD.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handlePrintTicket}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                In Phiếu STT
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsTicketModalOpen(false);
                  handleResetForm();
                }}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                Tiếp Nhận Ca Tiếp Theo
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
