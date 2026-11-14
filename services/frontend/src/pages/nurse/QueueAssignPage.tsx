import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Clock,
  CheckCircle,
  AlertOctagon,
  Printer,
  Ticket,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { RoomQueueStats, Patient, Encounter } from '../../types';
import { encounterService } from '../../services/encounterService';
import { patientService } from '../../services/patientService';
import { Modal } from '../../components/common/Modal';

export const QueueAssignPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [rooms, setRooms] = useState<RoomQueueStats[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [assignedEncounter, setAssignedEncounter] = useState<Encounter | null>(null);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const patientIdParam = searchParams.get('patientId');

  // Load rooms and optionally patient from URL
  const loadData = async () => {
    try {
      const roomStats = await encounterService.getRoomsStatus();
      setRooms(roomStats);
      // Auto select the first available (least busy) room
      const availableRoom = roomStats.find((r) => !r.is_overloaded);
      if (availableRoom) setSelectedRoom(availableRoom.name);

      if (patientIdParam) {
        const p = await patientService.getPatientById(Number(patientIdParam));
        setPatient(p);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientIdParam]);

  // Search patients
  const handleSearchPatient = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length >= 2) {
      setIsSearching(true);
      try {
        const res = await patientService.getPatients(q.trim());
        setSearchResults(res);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectPatient = (p: Patient) => {
    setPatient(p);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleAssignQueue = async () => {
    if (!patient) {
      setErrorMsg('Vui lòng chọn bệnh nhân cần phân phòng khám.');
      return;
    }
    if (!selectedRoom) {
      setErrorMsg('Vui lòng chọn phòng khám phù hợp.');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);

    try {
      // 1. Tạo lượt khám mới
      const newEnc = await encounterService.createEncounter(patient.id, selectedRoom);
      // 2. Cấp số thứ tự trong hàng đợi
      const updatedEnc = await encounterService.assignQueue(newEnc.id, selectedRoom);

      setAssignedEncounter(updatedEnc);
      setIsTicketModalOpen(true);

      // Refresh room stats
      loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Lỗi khi phân phòng khám.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
          <Ticket className="w-7 h-7 text-sky-600" />
          Phân Phòng Khám & Điều Phối Hàng Đợi
        </h1>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          {errorMsg}
        </div>
      )}

      {/* Patient Selection Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-600" />
          1. Thông Tin Bệnh Nhân Tiếp Đón
        </h3>

        {patient ? (
          <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-sky-600 text-white rounded-md">
                  {patient.patient_code}
                </span>
                <span className="text-base font-bold text-slate-800">{patient.full_name}</span>
                <span className="text-xs text-slate-500">
                  ({patient.gender === 'MALE' ? 'Nam' : 'Nữ'}, sinh năm {new Date(patient.date_of_birth).getFullYear()})
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Số CCCD: <span className="font-mono font-medium">{patient.card_number}</span> — SĐT: <span className="font-mono font-medium">{patient.phone}</span> — Địa chỉ: {patient.address || 'N/A'}
              </p>
            </div>
            <button
              onClick={() => setPatient(null)}
              className="text-xs font-semibold text-sky-700 hover:text-sky-900 underline"
            >
              Chọn bệnh nhân khác
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchPatient(e.target.value)}
                placeholder="Nhập Mã BN, Họ tên, CCCD hoặc SĐT để tìm nhanh..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
              {isSearching && (
                <span className="absolute right-3 top-3 text-xs text-slate-400">Đang tìm...</span>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-52 overflow-y-auto bg-slate-50">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleSelectPatient(p)}
                    className="p-3 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold bg-white px-2 py-0.5 rounded border border-slate-200 mr-2">
                        {p.patient_code}
                      </span>
                      <span className="text-sm font-semibold text-slate-800">{p.full_name}</span>
                      <span className="text-xs text-slate-500 ml-2">CCCD: {p.card_number}</span>
                    </div>
                    <span className="text-xs text-sky-600 font-bold flex items-center gap-1">
                      Chọn <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clinic Rooms Selection */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            2. Lựa Chọn Phòng Khám Phù Hợp (Ưu tiên phòng ít người chờ)
          </h3>
          <span className="text-xs text-slate-400">Tối đa 35 hồ sơ / ngày / phòng</span>
        </div>

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

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={handleAssignQueue}
            disabled={isLoading || !patient || !selectedRoom}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-md transition-all text-sm disabled:opacity-50 flex items-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            {isLoading ? 'Đang cấp số...' : 'Cấp Số Thứ Tự (STT) & Hoàn Tất Phân Phòng'}
          </button>
        </div>
      </div>

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

              <div className="text-left bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><span className="text-slate-500">Bệnh nhân:</span> <b className="text-slate-800">{assignedEncounter.patient?.full_name}</b></p>
                <p><span className="text-slate-500">Mã BN:</span> <b className="font-mono text-slate-800">{assignedEncounter.patient?.patient_code}</b></p>
                <p><span className="text-slate-500">Phòng khám:</span> <b className="text-sky-700">{assignedEncounter.clinic_room}</b></p>
                <p><span className="text-slate-500">Mã lượt khám:</span> <b className="font-mono text-slate-600">{assignedEncounter.encounter_code}</b></p>
                <p><span className="text-slate-500">Thời gian tiếp nhận:</span> {new Date(assignedEncounter.admission_time).toLocaleTimeString('vi-VN')}</p>
              </div>

              <p className="text-xs text-slate-400 italic">
                * Vui lòng ngồi chờ trước cửa phòng khám và theo dõi số thứ tự trên màn hình LCD.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handlePrintTicket}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                <Printer className="w-4 h-4" />
                In Phiếu STT
              </button>
              <button
                onClick={() => {
                  setIsTicketModalOpen(false);
                  setPatient(null);
                  navigate('/nurse/reception');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
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
