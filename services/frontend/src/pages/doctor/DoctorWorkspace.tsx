import React, { useState, useEffect } from 'react';
import {
  Users,
  Stethoscope,
  CheckCircle2,
  FileText,
  History,
  UploadCloud,
  Sparkles,
  Lock,
  AlertCircle,
  Clock,
  Printer
} from 'lucide-react';
import { Encounter, Patient, XrayImage, ClinicalRecord } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { encounterService } from '../../services/encounterService';
import { clinicalService } from '../../services/clinicalService';
import { xrayService } from '../../services/xrayService';
import { patientService } from '../../services/patientService';
import { XRayViewer } from '../../components/xray/XRayViewer';
import { MedicalReportModal } from '../../components/pdf/MedicalReportModal';
import { Modal } from '../../components/common/Modal';

export const DoctorWorkspace: React.FC = () => {
  const { user } = useAuthStore();
  const doctorRoom = user?.name_room || user?.nameRoom || 'Phòng Khám Hô Hấp 101';

  const [queueList, setQueueList] = useState<Encounter[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  // Bệnh nhân đang được chọn để khám trực tiếp (Đơn ca khám, không chia tab)
  const [activeEncounter, setActiveEncounter] = useState<Encounter | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'consultation' | 'history'>('consultation');
  const [draftRecord, setDraftRecord] = useState<Partial<ClinicalRecord>>({
    chief_complaint: '',
    present_illness: '',
    medical_history: '',
    physical_exam: '',
    final_diagnosis: '',
    treatment_plan: '',
    follow_up_recommendation: '',
  });

  const [isUploadingXray, setIsUploadingXray] = useState(false);
  const [isTriggeringAI, setIsTriggeringAI] = useState(false);
  const [aiError, setAiError] = useState('');

  // Timeline History data
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // PDF Preview Modal
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Close Encounter Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeFinalDiagnosis, setCloseFinalDiagnosis] = useState('');
  const [closeTreatmentPlan, setCloseTreatmentPlan] = useState('Kê đơn ngoại trú');
  const [closeFollowUp, setCloseFollowUp] = useState('Tái khám sau 2 tuần hoặc khi có dấu hiệu bất thường');
  const [isClosing, setIsClosing] = useState(false);

  const [toastMsg, setToastMsg] = useState('');

  // Fetch Queue for the doctor's room
  const loadQueue = async () => {
    setIsLoadingQueue(true);
    try {
      const data = await encounterService.getRoomQueue(doctorRoom);
      setQueueList(data);

      // Nếu chưa có ca nào đang chọn mà hàng đợi có ca IN_PROGRESS -> Tự động chọn ca đó
      setActiveEncounter((current) => {
        if (current) {
          const fresh = data.find((e) => e.id === current.id);
          return fresh ? fresh : current;
        }
        const inProgressEnc = data.find((e) => e.status === 'IN_PROGRESS');
        return inProgressEnc || null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, [doctorRoom]);

  // Đồng bộ draftRecord khi chọn hoặc đổi activeEncounter
  useEffect(() => {
    if (activeEncounter) {
      // Tải chi tiết ca khám
      encounterService
        .getEncounterDetail(activeEncounter.id)
        .then((enc) => {
          setActiveEncounter(enc);
          setDraftRecord({
            chief_complaint: enc.clinical_record?.chief_complaint || '',
            present_illness: enc.clinical_record?.present_illness || '',
            medical_history: enc.clinical_record?.medical_history || '',
            physical_exam: enc.clinical_record?.physical_exam || '',
            final_diagnosis: enc.clinical_record?.final_diagnosis || '',
            treatment_plan: enc.clinical_record?.treatment_plan || '',
            follow_up_recommendation: enc.clinical_record?.follow_up_recommendation || '',
          });
        })
        .catch(console.error);

      // Tải lịch sử khám của bệnh nhân
      if (activeEncounter.patient_id) {
        setIsLoadingHistory(true);
        patientService
          .getPatientHistory(activeEncounter.patient_id)
          .then((hist) => {
            setPatientHistory(hist);
          })
          .finally(() => setIsLoadingHistory(false));
      }
    }
  }, [activeEncounter?.id]);

  // Hành động: Chọn ca khám hoặc Gọi khám
  const handleSelectOrCallPatient = async (enc: Encounter) => {
    try {
      let targetEnc = enc;
      if (enc.status === 'WAITING') {
        targetEnc = await encounterService.startExam(enc.id);
        loadQueue();
      }
      setActiveEncounter(targetEnc);
      setActiveSubTab('consultation');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Lỗi khi gọi khám.');
    }
  };

  // Upload ảnh X-Quang (UC007)
  const handleUploadXray = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeEncounter) return;
    const file = e.target.files[0];
    setIsUploadingXray(true);
    setAiError('');

    try {
      await xrayService.uploadXray(activeEncounter.id, file);
      const updated = await encounterService.getEncounterDetail(activeEncounter.id);
      setActiveEncounter(updated);
      setToastMsg('Tải lên ảnh X-quang thành công!');
      setTimeout(() => setToastMsg(''), 2500);
    } catch (err: any) {
      setAiError(err.response?.data?.detail || 'Lỗi khi tải ảnh X-quang lên.');
    } finally {
      setIsUploadingXray(false);
      e.target.value = '';
    }
  };

  // Kích hoạt AI suy luận (UC007)
  const handleRunAI = async (xrayId: number) => {
    if (!activeEncounter) return;
    setIsTriggeringAI(true);
    setAiError('');
    try {
      await xrayService.triggerAIDiagnosis(xrayId);
      const updated = await encounterService.getEncounterDetail(activeEncounter.id);
      setActiveEncounter(updated);
      setToastMsg('AI phân đoạn & chẩn đoán nguy cơ thành công!');
      setTimeout(() => setToastMsg(''), 2500);
    } catch (err: any) {
      setAiError(err.response?.data?.detail || 'Lỗi khi chạy suy luận AI.');
    } finally {
      setIsTriggeringAI(false);
    }
  };

  // Đóng bệnh án & Hoàn tất ca khám (UC010)
  const handleConfirmCloseEncounter = async () => {
    if (!activeEncounter) return;
    setIsClosing(true);
    try {
      await encounterService.closeEncounter(activeEncounter.id, {
        final_diagnosis: closeFinalDiagnosis || draftRecord.final_diagnosis || 'Chưa ghi nhận',
        treatment_plan: closeTreatmentPlan || draftRecord.treatment_plan || 'Ngoại trú',
        follow_up_recommendation: closeFollowUp || draftRecord.follow_up_recommendation,
      });

      setIsCloseModalOpen(false);
      setToastMsg('Đã kết thúc lượt khám và đóng bệnh án thành công!');
      setTimeout(() => setToastMsg(''), 3000);
      loadQueue();

      const updated = await encounterService.getEncounterDetail(activeEncounter.id);
      setActiveEncounter(updated);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Lỗi khi đóng bệnh án.');
    } finally {
      setIsClosing(false);
    }
  };

  const isLocked = activeEncounter?.status === 'COMPLETED' || activeEncounter?.clinical_record?.is_locked;

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* Main Grid: Left Queue Sidebar & Right Consultation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI: DANH SÁCH HÀNG ĐỢI KHÁM */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-600" />
                Hàng Đợi Khám ({queueList.length})
              </h3>
              <span className="text-[11px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full inline-block mt-1">
                {doctorRoom}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-medium">Chờ khám</span>
          </div>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {queueList.length > 0 ? (
              queueList.map((enc) => {
                const isSelected = activeEncounter?.id === enc.id;
                return (
                  <div
                    key={enc.id}
                    onClick={() => handleSelectOrCallPatient(enc)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${isSelected
                      ? 'bg-sky-50/90 border-sky-400 shadow-xs ring-2 ring-sky-400/20'
                      : enc.status === 'IN_PROGRESS'
                        ? 'bg-sky-50/50 border-sky-200 hover:border-sky-300'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-sky-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                          {enc.queue_number || '--'}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
                            {enc.patient?.full_name}
                          </h4>
                          <span className="font-mono text-[10px] text-slate-400">
                            {enc.patient?.patient_code}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enc.status === 'IN_PROGRESS'
                          ? 'bg-sky-100 text-sky-700'
                          : 'bg-amber-100 text-amber-700'
                          }`}
                      >
                        {enc.status === 'IN_PROGRESS' ? 'Đang khám' : 'Chờ khám'}
                      </span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(enc.admission_time).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {enc.status === 'WAITING' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectOrCallPatient(enc);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-2xs"
                        >
                          Gọi Khám
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-sky-600">
                          {isSelected ? 'Đang xem' : 'Bấm để xem'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                {isLoadingQueue ? 'Đang tải hàng đợi...' : 'Chưa có bệnh nhân nào trong hàng chờ.'}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: KHÔNG GIAN KHÁM BỆNH CỦA BỆNH NHÂN ĐANG CHỌN */}
        <div className="lg:col-span-9 space-y-4">
          {activeEncounter ? (
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
              {/* Patient Banner */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {activeEncounter.patient?.full_name?.charAt(0) || 'BN'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 bg-sky-100 text-sky-700 rounded-md">
                        {activeEncounter.patient?.patient_code}
                      </span>
                      <h2 className="text-lg font-bold text-slate-800 uppercase">
                        {activeEncounter.patient?.full_name}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {activeEncounter.patient?.gender === 'MALE' ? 'Nam' : 'Nữ'} • Sinh ngày:{' '}
                      {activeEncounter.patient?.date_of_birth} • SĐT: {activeEncounter.patient?.phone} • CCCD:{' '}
                      {activeEncounter.patient?.card_number}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isLocked && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-amber-300">
                      <Lock className="w-3.5 h-3.5" />
                      ĐÃ KHÓA BỆNH ÁN
                    </span>
                  )}
                  <button
                    onClick={() => setIsPdfModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    <Printer className="w-4 h-4 text-sky-600" />
                    Xem & In Phiếu Khám
                  </button>
                </div>
              </div>

              {/* Sub-Tab Navigation */}
              <div className="flex items-center border-b border-slate-200 gap-6 text-sm font-semibold">
                <button
                  onClick={() => setActiveSubTab('consultation')}
                  className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${activeSubTab === 'consultation'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  1. Khám Bệnh & Hỗ trợ chẩn đoán
                </button>
                <button
                  onClick={() => setActiveSubTab('history')}
                  className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${activeSubTab === 'history'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <History className="w-4 h-4" />
                  2. Lịch Sử Khám Cũ
                </button>
              </div>

              {/* Sub-Tab 1: Khám Bệnh & Chẩn Đoán AI */}
              {activeSubTab === 'consultation' && (
                <div className="space-y-6">
                  {/* Khối Khám lâm sàng cơ bản */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-sky-600" />
                        Diễn biến Lâm Sàng
                      </h4>
                      <span className="text-[11px] text-slate-400">Ghi nhận triệu chứng và thăm khám</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                          Lý do đến khám
                        </label>
                        <textarea
                          rows={3}
                          disabled={isLocked}
                          value={draftRecord.chief_complaint || ''}
                          onChange={(e) => setDraftRecord({ ...draftRecord, chief_complaint: e.target.value })}

                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:opacity-75"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                          Bệnh sử hiện tại
                        </label>
                        <textarea
                          rows={3}
                          disabled={isLocked}
                          value={draftRecord.present_illness || ''}
                          onChange={(e) => setDraftRecord({ ...draftRecord, present_illness: e.target.value })}

                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:opacity-75"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                          Tiền sử bản thân & gia đình
                        </label>
                        <textarea
                          rows={3}
                          disabled={isLocked}
                          value={draftRecord.medical_history || ''}
                          onChange={(e) => setDraftRecord({ ...draftRecord, medical_history: e.target.value })}

                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:opacity-75"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                          Khám thực thể lồng ngực
                        </label>
                        <textarea
                          rows={3}
                          disabled={isLocked}
                          value={draftRecord.physical_exam || ''}
                          onChange={(e) => setDraftRecord({ ...draftRecord, physical_exam: e.target.value })}

                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:bg-slate-100 disabled:opacity-75"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Khối Chẩn Đoán X-Quang & AI */}
                  <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-sky-600" />
                        Chẩn Đoán Hình Ảnh X-Quang & Hỗ Trợ AI
                      </h4>
                      <span className="text-[11px] text-slate-500">Bóc tách phế trường & phân loại nguy cơ</span>
                    </div>

                    {aiError && (
                      <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{aiError}</span>
                      </div>
                    )}

                    {/* Upload Bar */}
                    {!isLocked && (
                      <div className="p-4 bg-white border border-dashed border-slate-300 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">Tải Lên Ảnh X-Quang Phổi 2D</h4>
                          <p className="text-xs text-slate-500">Định dạng hỗ trợ: .PNG, .JPG (Dung lượng tối đa 15MB)</p>
                        </div>

                        <label className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer flex items-center gap-1.5 transition-colors">
                          <UploadCloud className="w-4 h-4" />
                          {isUploadingXray ? 'Đang tải lên...' : 'Chọn Tệp Ảnh X-Quang'}
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg"
                            onChange={handleUploadXray}
                            className="hidden"
                            disabled={isUploadingXray}
                          />
                        </label>
                      </div>
                    )}

                    {/* Hiển thị danh sách ảnh X-quang */}
                    {activeEncounter.xray_images && activeEncounter.xray_images.length > 0 ? (
                      activeEncounter.xray_images.map((xray) => (
                        <div key={xray.id} className="space-y-3">
                          {!xray.ai_result && !isLocked && (
                            <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between">
                              <span className="text-xs text-sky-800 font-medium">
                                Ảnh X-quang đã tải lên thành công. Sẵn sàng bóc tách phế trường và phân loại nguy cơ.
                              </span>
                              <button
                                onClick={() => handleRunAI(xray.id)}
                                disabled={isTriggeringAI}
                                className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md hover:from-sky-500 hover:to-indigo-500 transition-all flex items-center gap-1.5 disabled:opacity-50"
                              >
                                <Sparkles className="w-4 h-4" />
                                {isTriggeringAI ? 'Đang suy luận AI (Tối đa 30s)...' : 'Chẩn Đoán Tình Trạng Phổi Bằng AI'}
                              </button>
                            </div>
                          )}

                          <XRayViewer
                            xray={xray}
                            isLocked={isLocked}
                            onCommentSaved={() => {
                              encounterService.getEncounterDetail(activeEncounter.id).then(setActiveEncounter);
                            }}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 space-y-2">
                        <UploadCloud className="w-10 h-10 mx-auto opacity-30 text-sky-600" />
                        <p className="text-sm font-semibold">Chưa có ảnh chụp X-quang nào cho ca khám này</p>
                        <p className="text-xs">Bác sĩ hãy chọn file ảnh chụp lồng ngực phía trên để tiến hành phân tích AI</p>
                      </div>
                    )}
                  </div>

                  {/* Diagnosis & Treatments */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Kết Luận & Hướng Xử Trí
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Chẩn đoán xác định</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          value={draftRecord.final_diagnosis || ''}
                          onChange={(e) => setDraftRecord({ ...draftRecord, final_diagnosis: e.target.value })}
                          placeholder="Chẩn đoán bệnh cuối cùng"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Phương án xử trí</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          value={draftRecord.treatment_plan || ''}
                          onChange={(e) => setDraftRecord({ ...draftRecord, treatment_plan: e.target.value })}
                          placeholder="Kê đơn ngoại trú / Hẹn tái khám / Nhập viện"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Lời dặn & Lịch tái khám</label>
                        <input
                          type="text"
                          disabled={isLocked}
                          value={draftRecord.follow_up_recommendation || ''}
                          onChange={(e) => setDraftRecord({ ...draftRecord, follow_up_recommendation: e.target.value })}
                          placeholder="Tự theo dõi và hẹn ngày tái khám"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  {!isLocked && (
                    <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setCloseFinalDiagnosis(draftRecord.final_diagnosis || '');
                          setCloseTreatmentPlan(draftRecord.treatment_plan || 'Kê đơn ngoại trú');
                          setCloseFollowUp(draftRecord.follow_up_recommendation || '');
                          setIsCloseModalOpen(true);
                        }}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Đóng Bệnh Án & Hoàn Thành Khám (UC010)
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 2: Patient Medical History Timeline */}
              {activeSubTab === 'history' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-4 h-4 text-sky-600" />
                    Dòng Thời Gian Lịch Sử Khám Cũ Của Bệnh Nhân
                  </h3>

                  {isLoadingHistory ? (
                    <p className="text-xs text-slate-400">Đang tải lịch sử...</p>
                  ) : patientHistory.length > 0 ? (
                    <div className="relative border-l-2 border-sky-200 ml-4 pl-6 space-y-6">
                      {patientHistory.map((hist) => (
                        <div key={hist.encounter_id} className="relative">
                          <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-sky-600 border-4 border-white shadow-xs" />
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-sky-700">{hist.encounter_code}</span>
                              <span className="text-slate-400">{new Date(hist.date).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">
                              Chẩn đoán: {hist.final_diagnosis || 'Chưa có chẩn đoán cuối'}
                            </h4>
                            <p className="text-xs text-slate-600">
                              <span className="font-semibold">Lý do khám:</span> {hist.chief_complaint || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-600">
                              <span className="font-semibold">Phác đồ xử trí:</span> {hist.treatment_plan || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-600">
                              <span className="font-semibold">Bác sĩ:</span> {hist.doctor_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Bệnh nhân chưa có lịch sử khám cũ trên hệ thống.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-16 border border-slate-200 shadow-sm text-center text-slate-400 space-y-3">
              <Stethoscope className="w-16 h-16 mx-auto opacity-20 text-sky-600" />
              <h3 className="text-lg font-bold text-slate-700">Chưa chọn phiên khám bệnh nhân</h3>
              <p className="text-xs max-w-md mx-auto">
                Bác sĩ vui lòng chọn một bệnh nhân từ danh sách hàng đợi bên trái hoặc nhấn nút "Gọi Khám" để bắt đầu phiên làm việc.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Close Encounter Confirmation Modal (UC010) */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => setIsCloseModalOpen(false)}
        title="Xác Nhận Đóng Bệnh Án & Hoàn Thành Ca Khám"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <b>Lưu ý quan trọng:</b> Sau khi đóng bệnh án, hồ sơ sẽ được chuyển sang chế độ <b>Chỉ đọc (Read-only)</b> và khóa quyền chỉnh sửa để bảo đảm tính pháp lý.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chẩn đoán xác định cuối cùng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={closeFinalDiagnosis}
              onChange={(e) => setCloseFinalDiagnosis(e.target.value)}
              placeholder="VD: Viêm phế quản mạn tính / Nghi ngờ nốt mờ thùy trên phổi phải"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phương án xử trí / Phác đồ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={closeTreatmentPlan}
              onChange={(e) => setCloseTreatmentPlan(e.target.value)}
              placeholder="Kê đơn ngoại trú / Chuyển tuyến chuyên khoa..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lời dặn & Lịch hẹn tái khám</label>
            <input
              type="text"
              value={closeFollowUp}
              onChange={(e) => setCloseFollowUp(e.target.value)}
              placeholder="Tái khám sau 2 tuần hoặc khi có dấu hiệu khó thở"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCloseModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={isClosing || !closeFinalDiagnosis.trim()}
              onClick={handleConfirmCloseEncounter}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isClosing ? 'Đang đóng...' : 'Xác Nhận & Khóa Bệnh Án'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Medical Report PDF Preview Modal (UC009) */}
      {activeEncounter && (
        <MedicalReportModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          encounterId={activeEncounter.id}
          patientName={activeEncounter.patient?.full_name}
          encounterCode={activeEncounter.encounter_code}
        />
      )}
    </div>
  );
};
