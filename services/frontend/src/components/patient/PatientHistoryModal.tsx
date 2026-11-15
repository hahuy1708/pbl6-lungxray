import React, { useState, useEffect } from 'react';
import {
  User,
  Calendar,
  CreditCard,
  Phone,
  ShieldCheck,
  MapPin,
  Clock,
  Stethoscope,
  FileText,
  Activity,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';
import { Patient, PatientHistoryItem } from '../../types';
import { patientService } from '../../services/patientService';
import { Modal } from '../common/Modal';
import { maskCard } from '../../utils/format';

interface PatientHistoryModalProps {
  patient: Patient | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PatientHistoryModal: React.FC<PatientHistoryModalProps> = ({
  patient,
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<PatientHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && patient?.id) {
      setIsLoading(true);
      patientService
        .getPatientHistory(patient.id)
        .then((data) => setHistory(data))
        .catch((err) => {
          console.error('Lỗi khi tải lịch sử khám bệnh:', err);
          setHistory([]);
        })
        .finally(() => setIsLoading(false));
    } else {
      setHistory([]);
    }
  }, [isOpen, patient?.id]);

  if (!patient) return null;

  const calculateAge = (dobString?: string) => {
    if (!dobString) return null;
    const birth = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const age = calculateAge(patient.date_of_birth);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-clear-50 text-clear-500">
            <CheckCircle2 className="w-3 h-3" /> Đã hoàn thành
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-chrome-100 text-accent-600">
            <Activity className="w-3 h-3" /> Đang khám
          </span>
        );
      case 'WAITING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> Chờ khám
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold bg-chrome-100 text-chrome-900">
            {status}
          </span>
        );
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Hồ Sơ & Lịch Sử Khám Bệnh — ${patient.full_name}`}
        maxWidth="4xl"
      >
        <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          {/* Card Thông tin hành chính (Chỉ đọc - Read only) */}
          <div className="bg-chrome-50 border border-chrome-200/80 rounded-sm p-5">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-chrome-200">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-accent-600 text-white rounded-sm font-mono font-bold text-sm tracking-wide">
                  {patient.patient_code}
                </span>
                <h3 className="text-base font-bold text-ink-950">{patient.full_name}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-chrome-600 block mb-0.5 font-medium">Số CCCD / Định danh</span>
                <span className="font-mono font-semibold text-chrome-900">{maskCard(patient.card_number)}</span>
              </div>
              <div>
                <span className="text-chrome-600 block mb-0.5 font-medium">Ngày sinh / Tuổi</span>
                <span className="font-medium text-chrome-900">
                  {patient.date_of_birth} {age !== null && `(${age} tuổi)`}
                </span>
              </div>
              <div>
                <span className="text-chrome-600 block mb-0.5 font-medium">Giới tính</span>
                <span className="font-semibold text-chrome-900">
                  {patient.gender === 'MALE' ? 'Nam' : patient.gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                </span>
              </div>
              <div>
                <span className="text-chrome-600 block mb-0.5 font-medium">Số điện thoại</span>
                <span className="font-mono font-semibold text-chrome-900">{patient.phone || '—'}</span>
              </div>
              <div>
                <span className="text-chrome-600 block mb-0.5 font-medium">Mã thẻ BHYT</span>
                <span className="font-mono font-semibold text-chrome-900">{patient.insurance_number || '—'}</span>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <span className="text-chrome-600 block mb-0.5 font-medium">Địa chỉ thường trú</span>
                <span className="font-medium text-chrome-900">{patient.address || '—'}</span>
              </div>
            </div>
          </div>

          {/* Dòng thời gian lịch sử các đợt khám (Timeline - UC008) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-chrome-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-600" />
                Lịch Sử Các Đợt Khám Ngoại Trú ({history.length} đợt)
              </h4>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-chrome-600 text-sm">
                <div className="w-6 h-6 border-2 border-accent-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Đang tải dữ liệu bệnh sử...
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 bg-chrome-50 border border-dashed border-chrome-200 rounded-sm text-center text-chrome-600 text-xs">
                Bệnh nhân này chưa có lịch sử đợt khám nào được ghi nhận trên hệ thống.
              </div>
            ) : (
              <div className="relative border-l-2 border-chrome-200 ml-4 pl-6 space-y-6">
                {history.map((hist) => (
                  <div key={hist.encounter_id} className="relative">
                    {/* Timeline Node Point */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-accent-600 border-4 border-white" />

                    <div className="p-5 bg-white border border-chrome-200 rounded-sm space-y-3.5 hover:border-accent-500 transition-colors">
                      {/* Header đợt khám */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-chrome-100">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-accent-600 text-xs bg-chrome-50 px-2.5 py-1 rounded-sm border border-chrome-100">
                            {hist.encounter_code}
                          </span>
                          <span className="text-xs text-chrome-600 font-medium flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(hist.date).toLocaleDateString('vi-VN')} {new Date(hist.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-chrome-600 font-medium flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5 text-chrome-600" />
                            {hist.clinic_room} • BS. {hist.doctor_name}
                          </span>
                          {getStatusBadge(hist.status)}
                        </div>
                      </div>

                      {/* Chi tiết bệnh án lâm sàng */}
                      <div className="space-y-2 text-xs">
                        {hist.chief_complaint && (
                          <div className="bg-chrome-50 p-2.5 rounded-sm border border-chrome-100">
                            <span className="font-semibold text-chrome-600 block mb-0.5">Lý do vào khám:</span>
                            <p className="text-chrome-900">{hist.chief_complaint}</p>
                          </div>
                        )}

                        <div className="bg-chrome-50/50 p-3 rounded-sm border border-chrome-100">
                          <span className="font-bold text-accent-600 block mb-0.5">Chẩn đoán xác định:</span>
                          <p className="text-ink-950 font-medium text-sm">
                            {hist.final_diagnosis || 'Chưa hoàn thành chẩn đoán'}
                          </p>
                        </div>

                        {hist.treatment_plan && (
                          <div>
                            <span className="font-semibold text-chrome-600 block mb-0.5">Phác đồ điều trị & Hướng xử trí:</span>
                            <p className="text-chrome-900 whitespace-pre-line">{hist.treatment_plan}</p>
                          </div>
                        )}

                        {hist.follow_up_recommendation && (
                          <div>
                            <span className="font-semibold text-chrome-600 block mb-0.5">Lời dặn & Hẹn tái khám:</span>
                            <p className="text-chrome-900">{hist.follow_up_recommendation}</p>
                          </div>
                        )}
                      </div>

                      {/* Hình ảnh X-quang và phân tích AI của đợt khám (nếu có) */}
                      {hist.xray_images && hist.xray_images.length > 0 && (
                        <div className="pt-2 border-t border-chrome-100">
                          <span className="text-xs font-bold text-chrome-900 block mb-2 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            Ảnh Chụp X-Quang & Kết Quả AI Sàng Lọc ({hist.xray_images.length})
                          </span>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {hist.xray_images.map((img) => (
                              <div
                                key={img.id}
                                className="group relative border border-chrome-200 rounded-sm overflow-hidden bg-ink-950 hover:border-accent-500 transition-all cursor-pointer"
                                onClick={() => setPreviewImage(img.image_url)}
                              >
                                <img
                                  src={img.image_url}
                                  alt="X-ray thumbnail"
                                  className="w-full h-24 object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-5 h-5" />
                                </div>
                                {img.ai_result && (
                                  <div className="absolute bottom-0 inset-x-0 bg-ink-950/90 p-1 text-[10px] text-white text-center font-bold truncate">
                                    {img.ai_result.predicted_category || 'Đã phân tích'} {img.ai_result.confidence_score ? `(${(Number(img.ai_result.confidence_score) * 100).toFixed(1)}%)` : ''}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-4 border-t border-chrome-100 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-chrome-900 hover:bg-chrome-100 rounded-sm transition-colors"
          >
            Đóng
          </button>
        </div>
      </Modal>

      {/* Lightbox Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="X-ray preview full"
            className="max-w-full max-h-[90vh] object-contain rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};
