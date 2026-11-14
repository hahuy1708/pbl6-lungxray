import React, { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Layers, 
  Columns, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { XrayImage } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { xrayService } from '../../services/xrayService';

interface XRayViewerProps {
  xray: XrayImage;
  isLocked?: boolean;
  onCommentSaved?: () => void;
}

export const XRayViewer: React.FC<XRayViewerProps> = ({
  xray,
  isLocked = false,
  onCommentSaved,
}) => {
  const [viewMode, setViewMode] = useState<'overlay' | 'split'>('overlay');
  const [opacity, setOpacity] = useState<number>(65); // 0% - 100%
  const [zoom, setZoom] = useState<number>(100);
  const [doctorComment, setDoctorComment] = useState<string>(
    xray.ai_result?.doctor_comment || ''
  );
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const aiResult = xray.ai_result;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 20, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 20, 50));
  const handleResetZoom = () => setZoom(100);

  const handleSaveDoctorComment = async () => {
    if (!aiResult) return;
    setIsSavingComment(true);
    setSaveSuccess(false);
    try {
      await xrayService.updateDoctorComment(aiResult.id, doctorComment);
      setSaveSuccess(true);
      if (onCommentSaved) onCommentSaved();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      alert('Lỗi khi lưu nhận xét của bác sĩ.');
    } finally {
      setIsSavingComment(false);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl text-white">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3 bg-slate-950/80 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            Trực Quan Hóa X-Quang & Phân Đoạn AI
          </span>
          {aiResult && (
            <RiskBadge
              category={aiResult.predicted_category}
              predictions={aiResult.predictions}
              confidenceScore={Number(aiResult.confidence_score)}
              size="sm"
            />
          )}
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              onClick={() => setViewMode('overlay')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'overlay'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Chế độ xếp chồng lớp mặt nạ (Overlay)"
            >
              <Layers className="w-3.5 h-3.5" />
              Lớp Phủ (Overlay)
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'split'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Chế độ so sánh song song hai ảnh (Split View)"
            >
              <Columns className="w-3.5 h-3.5" />
              Song Song (Split)
            </button>
          </div>

          {/* Opacity Slider for Overlay */}
          {viewMode === 'overlay' && aiResult?.overlay_image_url && (
            <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700/60 text-xs">
              <span className="text-slate-400">Độ mờ:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="font-mono text-slate-300 w-7">{opacity}%</span>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60">
            <button
              onClick={handleZoomOut}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-slate-300 px-1">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors ml-1"
              title="Đặt lại kích thước"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas View Area */}
      <div className="relative min-h-[460px] max-h-[580px] overflow-auto flex items-center justify-center p-6 bg-radial from-slate-900 to-black select-none">
        {viewMode === 'overlay' ? (
          <div
            className="relative transition-transform duration-150 inline-block shadow-2xl rounded-lg overflow-hidden border border-slate-700/50"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          >
            {/* Ảnh gốc X-quang */}
            <img
              src={xray.image_url}
              alt="X-ray ngực gốc"
              className="max-h-[440px] w-auto object-contain block filter contrast-110"
            />

            {/* Lớp Overlay viền contour xanh + Bounding Box đỏ sinh từ U-Net */}
            {aiResult?.overlay_image_url && (
              <img
                src={aiResult.overlay_image_url}
                alt="Overlay phân đoạn phế trường"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-150 mix-blend-screen"
                style={{ opacity: opacity / 100 }}
              />
            )}
          </div>
        ) : (
          /* Split View Mode */
          <div
            className="grid grid-cols-1 md:grid-cols-2 gap-4 transition-transform duration-150 w-full max-w-4xl"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
          >
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-slate-400 block mb-1 font-medium">Ảnh Chụp X-Quang Gốc (2D)</span>
              <img
                src={xray.image_url}
                alt="Ảnh gốc"
                className="max-h-[380px] w-auto mx-auto object-contain rounded-lg"
              />
            </div>
            <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 text-center">
              <span className="text-xs text-sky-400 block mb-1 font-medium">Phân Đoạn & BBox U-Net</span>
              <img
                src={aiResult?.overlay_image_url || aiResult?.mask_image_url || xray.image_url}
                alt="Phân đoạn phế trường"
                className="max-h-[380px] w-auto mx-auto object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom AI Diagnostic Assessment & Doctor Notes */}
      {aiResult && (
        <div className="p-5 bg-slate-950 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 block">Kết quả phân loại tổn thương phổi (ResNet18 3 nhóm):</span>
              <div className="flex items-center gap-3 mt-1">
                <RiskBadge
                  category={aiResult.predicted_category}
                  predictions={aiResult.predictions}
                  confidenceScore={Number(aiResult.confidence_score)}
                  size="lg"
                />
                <span className="text-xs text-slate-400">
                  Phế trường trích xuất bằng mô hình U-Net (Montgomery & Shenzhen)
                </span>
              </div>
            </div>
          </div>

          {/* 3 Groups Prediction Cards */}
          {aiResult.predictions && aiResult.predictions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
              {aiResult.predictions.map((p) => {
                const probPercent = (p.probability * 100).toFixed(1);
                const threshPercent = (p.threshold * 100).toFixed(1);
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border transition-all ${
                      p.flagged
                        ? 'bg-rose-950/40 border-rose-600/60 shadow-lg shadow-rose-950/30'
                        : 'bg-slate-900/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-xs text-slate-200 truncate">
                        {p.name}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          p.flagged
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {p.flagged ? 'Phát hiện' : 'Âm tính'}
                      </span>
                    </div>

                    {/* Probability Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Xác suất: <b className="text-slate-200 font-mono">{probPercent}%</b></span>
                        <span>Ngưỡng: <span className="font-mono">{threshPercent}%</span></span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            p.flagged ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(Number(probPercent), 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Conditions */}
                    {p.conditions && p.conditions.length > 0 && (
                      <div className="mt-2 text-[10px] text-slate-400 truncate" title={p.conditions.join(', ')}>
                        Bao gồm: {p.conditions.join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Doctor Comment & Confirmation */}
          <div className="pt-3 border-t border-slate-800/60">
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              Đánh giá & Nhận xét chuyên môn của Bác sĩ (Doctor's Note):
            </label>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                disabled={isLocked}
                value={doctorComment}
                onChange={(e) => setDoctorComment(e.target.value)}
                placeholder="Ví dụ: Đồng thuận với kết quả AI, phát hiện nốt mờ hạ đòn đỉnh phổi phải..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
              />
              {!isLocked && (
                <button
                  onClick={handleSaveDoctorComment}
                  disabled={isSavingComment}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSavingComment ? 'Đang lưu...' : 'Xác Nhận & Lưu Kết Quả'}
                </button>
              )}
            </div>
            {saveSuccess && (
              <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã lưu nhận xét chuyên môn vào hồ sơ ca khám.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
