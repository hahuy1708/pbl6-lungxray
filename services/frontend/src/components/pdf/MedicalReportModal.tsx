import React from 'react';
import { Printer, Download, FileText } from 'lucide-react';
import { Modal } from '../common/Modal';
import { encounterService } from '../../services/encounterService';

interface MedicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  encounterId: number;
  patientName?: string;
  encounterCode?: string;
}

export const MedicalReportModal: React.FC<MedicalReportModalProps> = ({
  isOpen,
  onClose,
  encounterId,
  patientName,
  encounterCode,
}) => {
  const pdfUrl = encounterService.exportPdfUrl(encounterId);

  const handlePrint = () => {
    const iframe = document.getElementById('medical-pdf-frame') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Bản Xem Trước Phiếu Khám & Kết Quả X-Quang - ${patientName || ''} (${encounterCode || ''})`}
      maxWidth="5xl"
    >
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex items-center justify-between p-3 bg-chrome-100 rounded-sm border border-chrome-200">
          <div className="flex items-center gap-2 text-sm text-chrome-600">
            <FileText className="w-4 h-4 text-accent-600" />
            <span>Mẫu phiếu khám ngoại trú & chẩn đoán hình ảnh chuẩn Bộ Y Tế (Khổ A4)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-chrome-50 border border-chrome-200 text-chrome-900 text-sm font-semibold rounded-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              In Phiếu Khám
            </button>
            <a
              href={pdfUrl}
              download={`PhieuKham_${encounterCode || encounterId}.pdf`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-accent-600 hover:bg-accent-500 text-white text-sm font-semibold rounded-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Tải Tệp PDF
            </a>
          </div>
        </div>

        {/* Embedded PDF iframe */}
        <div className="w-full h-[650px] bg-chrome-200 rounded-sm overflow-hidden border border-chrome-200">
          <iframe
            id="medical-pdf-frame"
            src={pdfUrl}
            title="Medical Record PDF"
            className="w-full h-full"
          />
        </div>
      </div>
    </Modal>
  );
};
