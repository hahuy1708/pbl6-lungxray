import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Stethoscope,
  ChevronRight,
  FileText
} from 'lucide-react';
import { RoomQueueStats, Encounter } from '../../types';
import { encounterService } from '../../services/encounterService';
import { maskCard } from '../../utils/format';

export const ClinicRoomsPage: React.FC = () => {
  const [rooms, setRooms] = useState<RoomQueueStats[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomQueueStats | null>(null);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL | WAITING | IN_PROGRESS | COMPLETED
  const [searchPatient, setSearchPatient] = useState('');

  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isLoadingEncounters, setIsLoadingEncounters] = useState(false);

  // Tải danh sách phòng khám
  const loadRooms = async () => {
    setIsLoadingRooms(true);
    try {
      const roomStats = await encounterService.getRoomsStatus();
      setRooms(roomStats);
      if (roomStats.length > 0) {
        // Giữ phòng hiện tại nếu còn, hoặc chọn phòng đầu tiên
        setSelectedRoom((prev) => {
          if (prev) {
            const found = roomStats.find((r) => r.name === prev.name);
            return found || roomStats[0];
          }
          return roomStats[0];
        });
      }
    } catch (err) {
      console.error('Lỗi khi tải phòng khám:', err);
    } finally {
      setIsLoadingRooms(false);
    }
  };

  // Tải danh sách ca khám trong ngày của phòng đang chọn
  const loadRoomEncounters = async (roomName: string) => {
    setIsLoadingEncounters(true);
    try {
      // 1. Lấy danh sách chờ & đang khám
      const activeQueue = await encounterService.getRoomQueue(roomName);
      // 2. Lấy danh sách đã khám
      const completedQueue = await encounterService.getRoomQueue(roomName, 'COMPLETED');

      const allToday = [...activeQueue, ...completedQueue];
      // Sắp xếp: Đang khám -> Chờ khám -> Đã khám
      allToday.sort((a, b) => {
        const order: Record<string, number> = { IN_PROGRESS: 1, WAITING: 2, COMPLETED: 3 };
        const orderA = order[a.status] || 4;
        const orderB = order[b.status] || 4;
        if (orderA !== orderB) return orderA - orderB;
        return (a.queue_number || 999) - (b.queue_number || 999);
      });

      setEncounters(allToday);
    } catch (err) {
      console.error('Lỗi khi tải ca khám của phòng:', err);
    } finally {
      setIsLoadingEncounters(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadRoomEncounters(selectedRoom.name);
    }
  }, [selectedRoom]);

  // Lọc theo trạng thái & từ khóa
  const filteredEncounters = encounters.filter((enc) => {
    const matchStatus = statusFilter === 'ALL' || enc.status === statusFilter;
    const matchSearch =
      !searchPatient.trim() ||
      enc.patient?.full_name?.toLowerCase().includes(searchPatient.toLowerCase()) ||
      enc.patient?.patient_code?.toLowerCase().includes(searchPatient.toLowerCase()) ||
      enc.patient?.card_number?.includes(searchPatient);
    return matchStatus && matchSearch;
  });

  const countWaiting = encounters.filter((e) => e.status === 'WAITING').length;
  const countInProgress = encounters.filter((e) => e.status === 'IN_PROGRESS').length;
  const countCompleted = encounters.filter((e) => e.status === 'COMPLETED').length;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-chrome-900 flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-accent-600" />
            Giám Sát Phòng Khám & Lượt Khám Trong Ngày
          </h1>
        </div>

        <button
          onClick={() => {
            loadRooms();
            if (selectedRoom) loadRoomEncounters(selectedRoom.name);
          }}
          className="px-4 py-2 bg-white hover:bg-chrome-50 text-chrome-900 text-xs font-bold rounded-sm border border-chrome-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-accent-600" />
          Làm Mới Số Liệu
        </button>
      </div>

      {/* Main Grid: Danh sách phòng khám (Trái) & Chi tiết ca khám (Phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI: DANH SÁCH PHÒNG KHÁM CỦA BÁC SĨ */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-chrome-600 uppercase tracking-wider">
              Danh Sách Phòng Khám ({rooms.length})
            </h3>
            {isLoadingRooms && (
              <span className="text-[11px] text-accent-600 animate-pulse">Đang cập nhật...</span>
            )}
          </div>

          <div className="space-y-3">
            {rooms.map((room) => {
              const isSelected = selectedRoom?.code === room.code;
              const isPaused = room.is_available === false;

              return (
                <div
                  key={room.code}
                  onClick={() => setSelectedRoom(room)}
                  className={`p-4 rounded-sm border transition-all cursor-pointer relative ${isSelected
                    ? 'bg-chrome-50/90 border-accent-500 ring-2 ring-accent-500/20'
                    : 'bg-white border-chrome-200 hover:border-chrome-200'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-chrome-900">{room.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-chrome-600 font-mono">{room.code}</span>
                        {room.doctor_name && (
                          <span className="text-xs font-medium text-accent-600 bg-chrome-100/70 px-2 py-0.5 rounded-sm flex items-center gap-1">
                            <Stethoscope className="w-3 h-3 text-accent-600" />
                            {room.doctor_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {isPaused ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                        Tạm nghỉ
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-clear-500 bg-clear-50 px-2 py-0.5 rounded-full border border-clear-500">
                        Hoạt động
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-chrome-100 text-xs">
                    <div>
                      <span className="text-chrome-600 block text-[11px]">Đang chờ:</span>
                      <span className="text-sm font-extrabold text-amber-600">{room.waiting_count} ca</span>
                    </div>
                    <div>
                      <span className="text-chrome-600 block text-[11px]">Tổng tiếp nhận:</span>
                      <span className="text-sm font-bold text-chrome-900">
                        {room.total_today} / {room.max_capacity}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI: CHI TIẾT CÁC CA KHÁM TRONG NGÀY CỦA PHÒNG ĐƯỢC CHỌN */}
        <div className="lg:col-span-8 bg-white rounded-sm p-6 border border-chrome-200 space-y-5">
          {selectedRoom ? (
            <>
              {/* Header chi tiết phòng */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-chrome-100 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-chrome-900">{selectedRoom.name}</h2>
                    <span className="text-xs font-mono text-chrome-600">({selectedRoom.code})</span>
                  </div>
                  <p className="text-xs text-chrome-600 mt-0.5">
                    Bác sĩ phụ trách: <b className="text-chrome-900">{selectedRoom.doctor_name || 'Chưa gán'}</b> • Trạng thái:{' '}
                    {selectedRoom.is_available === false ? (
                      <span className="text-amber-700 font-semibold">Tạm nghỉ tiếp nhận</span>
                    ) : (
                      <span className="text-clear-500 font-semibold">Sẵn sàng nhận bệnh</span>
                    )}
                  </p>
                </div>

                {/* Badges tổng quan */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-sm">
                    Chờ: {countWaiting}
                  </span>
                  <span className="px-3 py-1 bg-chrome-50 text-accent-600 border border-chrome-200 text-xs font-bold rounded-sm">
                    Đang khám: {countInProgress}
                  </span>
                  <span className="px-3 py-1 bg-clear-50 text-clear-500 border border-clear-50 text-xs font-bold rounded-sm">
                    Đã khám: {countCompleted}
                  </span>
                </div>
              </div>

              {/* Bộ lọc trạng thái & tìm kiếm bệnh nhân */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Tabs trạng thái */}
                <div className="flex items-center p-1 bg-chrome-100 rounded-sm text-xs font-semibold w-full sm:w-auto">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-sm transition-colors ${statusFilter === 'ALL'
                      ? 'bg-white text-chrome-900'
                      : 'text-chrome-600 hover:text-chrome-900'
                      }`}
                  >
                    Tất cả ({encounters.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('WAITING')}
                    className={`px-3 py-1.5 rounded-sm transition-colors ${statusFilter === 'WAITING'
                      ? 'bg-white text-amber-700 font-bold'
                      : 'text-chrome-600 hover:text-chrome-900'
                      }`}
                  >
                    Chờ khám ({countWaiting})
                  </button>
                  <button
                    onClick={() => setStatusFilter('IN_PROGRESS')}
                    className={`px-3 py-1.5 rounded-sm transition-colors ${statusFilter === 'IN_PROGRESS'
                      ? 'bg-white text-accent-600 font-bold'
                      : 'text-chrome-600 hover:text-chrome-900'
                      }`}
                  >
                    Đang khám ({countInProgress})
                  </button>
                  <button
                    onClick={() => setStatusFilter('COMPLETED')}
                    className={`px-3 py-1.5 rounded-sm transition-colors ${statusFilter === 'COMPLETED'
                      ? 'bg-white text-clear-500 font-bold'
                      : 'text-chrome-600 hover:text-chrome-900'
                      }`}
                  >
                    Đã khám ({countCompleted})
                  </button>
                </div>

                {/* Tìm kiếm trong phòng */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-chrome-600 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                    placeholder="Tìm tên, Mã BN, CCCD..."
                    className="w-full pl-9 pr-3 py-2 bg-chrome-50 border border-chrome-200 rounded-sm text-xs focus:outline focus:outline-2 focus:outline-accent-500"
                  />
                </div>
              </div>

              {/* Bảng danh sách ca khám */}
              {isLoadingEncounters ? (
                <div className="py-16 text-center text-xs text-chrome-600 italic">
                  Đang tải danh sách ca khám...
                </div>
              ) : filteredEncounters.length > 0 ? (
                <div className="border border-chrome-200 rounded-sm overflow-hidden divide-y divide-chrome-100">
                  {filteredEncounters.map((enc) => {
                    const statusConfig = {
                      WAITING: {
                        label: 'Chờ khám',
                        badge: 'bg-amber-100 text-amber-800 border-amber-200',
                        dot: 'bg-amber-500',
                      },
                      IN_PROGRESS: {
                        label: 'Đang khám',
                        badge: 'bg-chrome-100 text-accent-600 border-chrome-200',
                        dot: 'bg-accent-500 animate-pulse',
                      },
                      COMPLETED: {
                        label: 'Đã hoàn tất',
                        badge: 'bg-clear-50 text-clear-500 border-clear-50',
                        dot: 'bg-clear-500',
                      },
                    }[enc.status] || {
                      label: enc.status,
                      badge: 'bg-chrome-100 text-chrome-900 border-chrome-200',
                      dot: 'bg-chrome-600',
                    };

                    return (
                      <div
                        key={enc.id}
                        className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-chrome-50/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-sm bg-chrome-100 text-accent-600 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                            {enc.queue_number ? String(enc.queue_number).padStart(2, '0') : '--'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-chrome-900">
                                {enc.patient?.full_name}
                              </span>
                              <span className="font-mono text-xs font-semibold text-chrome-600">
                                {enc.patient?.patient_code}
                              </span>
                            </div>
                            <p className="text-xs text-chrome-600 mt-0.5">
                              CCCD: {maskCard(enc.patient?.card_number)} • SĐT: {enc.patient?.phone} • Tiếp nhận:{' '}
                              {new Date(enc.admission_time).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                            {statusConfig.label}
                          </span>

                          {enc.clinical_record?.final_diagnosis && (
                            <span className="text-xs text-chrome-600 max-w-[200px] truncate hidden md:block" title={enc.clinical_record.final_diagnosis}>
                              Chẩn đoán: {enc.clinical_record.final_diagnosis}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-chrome-600 space-y-2">
                  <FileText className="w-10 h-10 mx-auto opacity-20 text-accent-600" />
                  <p className="text-sm font-semibold">Chưa có ca khám nào phù hợp</p>
                  <p className="text-xs">Phòng khám hiện chưa tiếp nhận lượt khám nào theo bộ lọc này.</p>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-chrome-600">
              Vui lòng chọn một phòng khám từ danh sách bên trái để xem chi tiết.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
