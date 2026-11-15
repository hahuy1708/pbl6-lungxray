import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Search, 
  Clock, 
  Printer, 
  FileText, 
  RefreshCw, 
  Stethoscope, 
  User, 
  AlertCircle 
} from 'lucide-react';
import { Encounter } from '../../types';
import { encounterService } from '../../services/encounterService';
import { useAuthStore } from '../../stores/authStore';
import { useDoctorTabsStore } from '../../stores/doctorTabsStore';
import { MedicalReportModal } from '../../components/pdf/MedicalReportModal';

export const DoctorCompletedPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { openTab } = useDoctorTabsStore();
  const doctorRoom = user?.name_room || user?.nameRoom || 'Phòng Khám Hô Hấp 101';

  const [completedList, setCompletedList] = useState<Encounter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // PDF Preview Modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [selectedEncounter, setSelectedEncounter] = useState<Encounter | null>(null);

  const loadCompletedData = async () => {
    setIsLoading(true);
    try {
      const data = await encounterService.getRoomQueue(doctorRoom, 'COMPLETED');
      setCompletedList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompletedData();
  }, [doctorRoom]);

  // Filter list by search query
  const filteredList = completedList.filter((enc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const patientName = enc.patient?.full_name?.toLowerCase() || '';
    const patientCode = enc.patient?.patient_code?.toLowerCase() || '';
    const encCode = enc.encounter_code?.toLowerCase() || '';
    const diag = enc.clinical_record?.final_diagnosis?.toLowerCase() || '';
    return patientName.includes(q) || patientCode.includes(q) || encCode.includes(q) || diag.includes(q);
  });

  const handleOpenInWorkspace = (enc: Encounter) => {
    openTab(
      enc.id,
      enc.patient?.patient_code || '',
      enc.patient?.full_name || '',
      enc.clinical_record || undefined,
      true
    );
    navigate('/doctor/workspace');
  };

  const handleOpenPdf = (enc: Encounter) => {
    setSelectedEncounter(enc);
    setIsPdfModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-sm p-6 border border-chrome-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-sm bg-clear-50 text-clear-500">
              <CheckCircle2 className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-chrome-900 tracking-tight">
                Danh Sách Bệnh Nhân Đã Khám
              </h1>
              <p className="text-xs text-chrome-600 mt-0.5">
                Lịch sử các ca khám đã hoàn thành trong ngày hôm nay tại{' '}
                <span className="font-semibold text-accent-600 bg-chrome-50 px-2 py-0.5 rounded-sm">
                  {doctorRoom}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats & Refresh Button */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-clear-50 border border-clear-50 rounded-sm text-center">
            <span className="text-[10px] font-bold text-clear-500 uppercase tracking-wider block">
              Đã khám hôm nay
            </span>
            <span className="text-lg font-black text-clear-500">
              {completedList.length} ca
            </span>
          </div>

          <button
            onClick={loadCompletedData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-chrome-100 hover:bg-chrome-200 text-chrome-900 text-xs font-semibold rounded-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-sm p-4 border border-chrome-200 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-chrome-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bệnh nhân, mã BN, mã lượt khám, chẩn đoán..."
            className="w-full pl-10 pr-4 py-2 bg-chrome-50 border border-chrome-200 rounded-sm text-xs focus:outline focus:outline-2 focus:outline-accent-500 text-chrome-900"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-sm border border-chrome-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-chrome-50 border-b border-chrome-200 text-chrome-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">STT</th>
                <th className="py-3.5 px-4">Mã Lượt Khám</th>
                <th className="py-3.5 px-4">Bệnh Nhân</th>
                <th className="py-3.5 px-4">Giờ Hoàn Tất</th>
                <th className="py-3.5 px-4">Chẩn Đoán Kết Luận</th>
                <th className="py-3.5 px-4">Hướng Điều Trị</th>
                <th className="py-3.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chrome-100 text-chrome-900">
              {filteredList.length > 0 ? (
                filteredList.map((enc) => (
                  <tr key={enc.id} className="hover:bg-chrome-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="w-7 h-7 rounded-sm bg-clear-500 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {enc.queue_number || '--'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-chrome-900">
                      {enc.encounter_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-chrome-900">
                        {enc.patient?.full_name}
                      </div>
                      <div className="font-mono text-[10px] text-chrome-600">
                        {enc.patient?.patient_code} • {enc.patient?.gender === 'MALE' ? 'Nam' : enc.patient?.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-chrome-600 font-medium">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-chrome-600" />
                        {enc.completion_time
                          ? new Date(enc.completion_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                          : new Date(enc.admission_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="line-clamp-2 text-chrome-900 font-medium">
                        {enc.clinical_record?.final_diagnosis || <span className="text-chrome-600 italic">Chưa ghi</span>}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="line-clamp-2 text-chrome-600">
                        {enc.clinical_record?.treatment_plan || '—'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenInWorkspace(enc)}
                        className="px-3 py-1.5 text-xs font-semibold text-accent-600 hover:text-accent-600 bg-chrome-50 hover:bg-chrome-100 rounded-sm transition-colors inline-flex items-center gap-1.5"
                        title="Mở tab khám bệnh án"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        Mở Bàn Khám
                      </button>
                      <button
                        onClick={() => handleOpenPdf(enc)}
                        className="px-3 py-1.5 text-xs font-semibold text-chrome-900 hover:text-ink-950 bg-chrome-100 hover:bg-chrome-200 rounded-sm transition-colors inline-flex items-center gap-1.5"
                        title="In phiếu kết quả khám"
                      >
                        <Printer className="w-3.5 h-3.5 text-chrome-600" />
                        In Phiếu
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <CheckCircle2 className="w-10 h-10 text-chrome-200 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-chrome-600">
                      {isLoading ? 'Đang tải dữ liệu...' : 'Chưa có ca khám nào hoàn thành phù hợp.'}
                    </p>
                    <p className="text-[11px] text-chrome-600 mt-0.5">
                      {searchQuery ? 'Thử tìm kiếm với từ khóa khác' : 'Các ca khám hoàn tất trong ngày sẽ xuất hiện tại đây'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Modal */}
      {selectedEncounter && (
        <MedicalReportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          encounterId={selectedEncounter.id}
          patientName={selectedEncounter.patient?.full_name}
          encounterCode={selectedEncounter.encounter_code}
        />
      )}
    </div>
  );
};

export default DoctorCompletedPage;
