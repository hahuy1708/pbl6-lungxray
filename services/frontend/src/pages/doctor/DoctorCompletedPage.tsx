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
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Danh Sách Bệnh Nhân Đã Khám
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Lịch sử các ca khám đã hoàn thành trong ngày hôm nay tại{' '}
                <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                  {doctorRoom}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats & Refresh Button */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
              Đã khám hôm nay
            </span>
            <span className="text-lg font-black text-emerald-700">
              {completedList.length} ca
            </span>
          </div>

          <button
            onClick={loadCompletedData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-2xl transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên bệnh nhân, mã BN, mã lượt khám, chẩn đoán..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
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
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.length > 0 ? (
                filteredList.map((enc) => (
                  <tr key={enc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {enc.queue_number || '--'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {enc.encounter_code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">
                        {enc.patient?.full_name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {enc.patient?.patient_code} • {enc.patient?.gender === 'MALE' ? 'Nam' : enc.patient?.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {enc.completion_time
                          ? new Date(enc.completion_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                          : new Date(enc.admission_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-700 font-medium">
                        {enc.clinical_record?.final_diagnosis || <span className="text-slate-400 italic">Chưa ghi</span>}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-600">
                        {enc.clinical_record?.treatment_plan || '—'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenInWorkspace(enc)}
                        className="px-3 py-1.5 text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        title="Mở tab khám bệnh án"
                      >
                        <Stethoscope className="w-3.5 h-3.5" />
                        Mở Bàn Khám
                      </button>
                      <button
                        onClick={() => handleOpenPdf(enc)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-1.5"
                        title="In phiếu kết quả khám"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-600" />
                        In Phiếu
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-600">
                      {isLoading ? 'Đang tải dữ liệu...' : 'Chưa có ca khám nào hoàn thành phù hợp.'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
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

