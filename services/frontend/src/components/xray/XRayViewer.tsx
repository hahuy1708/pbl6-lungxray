import React, { useId, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Trash2 } from 'lucide-react';
import { XrayImage, PredictionItem } from '../../types';
import { RiskBadge } from '../common/RiskBadge';
import { xrayService } from '../../services/xrayService';

interface XRayViewerProps {
  xray: XrayImage;
  isLocked?: boolean;
  onCommentSaved?: () => void;
  onDelete?: () => Promise<void>;
}

const MODEL_NOTE =
  'Phân đoạn: U-Net, huấn luyện trên Montgomery và Shenzhen. ' +
  'Phân loại: ResNet18, 3 nhóm đa nhãn, mỗi nhóm có ngưỡng riêng được chọn trên tập validation để ưu tiên độ nhạy. ' +
  'Kết quả chỉ hỗ trợ sàng lọc.';

const segButton = (on: boolean) =>
  `rounded-sm px-2.5 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
    on ? 'bg-ink-700 text-white' : 'text-ink-300 hover:text-white'
  }`;

const iconButton =
  'rounded-sm p-1.5 text-ink-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500 disabled:opacity-40';

const GroupRow: React.FC<{ p: PredictionItem }> = ({ p }) => {
  const prob = Math.min(100, p.probability * 100);
  const thr = Math.min(100, p.threshold * 100);
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-chrome-900">{p.name}</span>
        <span className={`shrink-0 text-xs font-medium ${p.flagged ? 'text-flag-500' : 'text-clear-500'}`}>
          {p.flagged ? 'Vượt ngưỡng' : 'Dưới ngưỡng'}
        </span>
      </div>
      <div className="relative mt-2 h-1.5 rounded-sm bg-chrome-200" aria-hidden="true">
        <div
          className={`absolute inset-y-0 left-0 rounded-sm ${p.flagged ? 'bg-flag-500' : 'bg-clear-500'}`}
          style={{ width: `${prob}%` }}
        />
        <div className="absolute -bottom-1 -top-1 w-px bg-chrome-900" style={{ left: `${thr}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-xs tabular-nums text-chrome-600">
        <span>Xác suất {prob.toFixed(1)}%</span>
        <span>Ngưỡng {thr.toFixed(1)}%</span>
      </div>
      {p.conditions && p.conditions.length > 0 && (
        <p className="mt-1 text-xs leading-relaxed text-chrome-600">{p.conditions.join(', ')}</p>
      )}
    </li>
  );
};

export const XRayViewer: React.FC<XRayViewerProps> = ({ xray, isLocked = false, onCommentSaved, onDelete }) => {
  const [viewMode, setViewMode] = useState<'overlay' | 'split'>('overlay');
  const [opacity, setOpacity] = useState(65);
  const [zoom, setZoom] = useState(100);
  const [comment, setComment] = useState(xray.ai_result?.doctor_comment || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const opacityId = useId();
  const commentId = useId();
  const aiResult = xray.ai_result;
  const predictions: PredictionItem[] = aiResult?.predictions ?? [];
  const hasOverlay = !!aiResult?.overlay_image_url;

  const zoomBy = (delta: number) => setZoom((z) => Math.min(250, Math.max(50, z + delta)));

  const saveComment = async () => {
    if (!aiResult) return;
    setSaving(true);
    setStatus(null);
    try {
      await xrayService.updateDoctorComment(aiResult.id, comment);
      setStatus({ kind: 'ok', text: 'Đã lưu nhận xét vào ca khám.' });
      onCommentSaved?.();
    } catch {
      setStatus({ kind: 'error', text: 'Chưa lưu được nhận xét. Kiểm tra kết nối rồi thử lại.' });
    } finally {
      setSaving(false);
    }
  };

  const deleteImage = async () => {
    if (!onDelete || !window.confirm('Xóa ảnh X-quang chưa phân tích khỏi lượt khám này?')) return;
    setDeleting(true);
    setStatus(null);
    try {
      await onDelete();
    } catch (error: any) {
      setStatus({ kind: 'error', text: error.response?.data?.detail || 'Chưa xóa được ảnh. Vui lòng thử lại.' });
    } finally {
      setDeleting(false);
    }
  };

  const scale = { transform: `scale(${zoom / 100})`, transformOrigin: 'center center' };

  return (
    <section aria-label="Ảnh X-quang và kết quả phân tích" className="overflow-hidden rounded-sm border border-chrome-900 bg-ink-950 text-ink-100">
      {/* Thanh công cụ */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink-800 px-3 py-2">
        <div role="group" aria-label="Chế độ xem" className="inline-flex gap-1 rounded-sm border border-ink-700 p-0.5">
          <button type="button" aria-pressed={viewMode === 'overlay'} className={segButton(viewMode === 'overlay')} onClick={() => setViewMode('overlay')}>
            Phủ lớp
          </button>
          <button type="button" aria-pressed={viewMode === 'split'} className={segButton(viewMode === 'split')} onClick={() => setViewMode('split')}>
            So sánh
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {onDelete && (
            <button
              type="button"
              onClick={deleteImage}
              disabled={deleting}
              className="inline-flex items-center gap-1 rounded-sm px-2 py-1.5 text-sm text-flag-500 hover:bg-ink-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Đang xóa…' : 'Xóa ảnh'}
            </button>
          )}
          {viewMode === 'overlay' && hasOverlay && (
            <div className="flex items-center gap-2 text-sm">
              <label htmlFor={opacityId} className="text-ink-300">Độ mờ lớp phủ</label>
              <input
                id={opacityId}
                type="range"
                min={0}
                max={100}
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-24 accent-accent-500"
              />
              <output htmlFor={opacityId} className="w-10 font-mono tabular-nums text-ink-100">{opacity}%</output>
            </div>
          )}

          <div role="group" aria-label="Phóng to ảnh" className="inline-flex items-center gap-0.5">
            <button type="button" aria-label="Thu nhỏ" className={iconButton} onClick={() => zoomBy(-20)}>
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="w-12 text-center font-mono text-sm tabular-nums text-ink-100">{zoom}%</span>
            <button type="button" aria-label="Phóng to" className={iconButton} onClick={() => zoomBy(20)}>
              <ZoomIn className="h-4 w-4" />
            </button>
            <button type="button" aria-label="Đặt lại kích thước" className={iconButton} onClick={() => setZoom(100)}>
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Vùng xem ảnh */}
      <div className="flex min-h-[320px] max-h-[70vh] items-center justify-center overflow-auto p-4 md:min-h-[460px] md:max-h-[620px]">
        {viewMode === 'overlay' ? (
          <div className="relative inline-block max-w-full transition-transform duration-150" style={scale}>
            <img
              src={xray.image_url}
              alt="Ảnh X-quang ngực"
              className="block h-auto max-w-full w-auto select-none max-h-[62vh] md:max-h-[580px]"
            />
            {hasOverlay && (
              <img
                src={aiResult!.overlay_image_url}
                alt="Vùng phổi được phân đoạn"
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
                style={{ opacity: opacity / 100 }}
              />
            )}
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 transition-transform duration-150 md:grid-cols-2" style={scale}>
            <figure>
              <figcaption className="mb-2 font-mono text-xs text-ink-400">Ảnh gốc</figcaption>
              <img src={xray.image_url} alt="Ảnh X-quang gốc" className="mx-auto h-auto max-w-full w-auto select-none max-h-[56vh]" />
            </figure>
            <figure>
              <figcaption className="mb-2 font-mono text-xs text-ink-400">Vùng phổi và khung bao</figcaption>
              <img
                src={aiResult?.overlay_image_url || aiResult?.mask_image_url || xray.image_url}
                alt="Vùng phổi được phân đoạn"
                className="mx-auto h-auto max-w-full w-auto select-none max-h-[56vh]"
              />
            </figure>
          </div>
        )}
      </div>

      {/* Kết quả và nhận xét */}
      {aiResult ? (
        <div className="border-t border-ink-800 bg-white text-chrome-900">
          <div className="grid gap-6 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] md:p-5">
            <div className="space-y-3">
              <p className="text-sm text-chrome-600">Kết quả phân loại</p>
              <RiskBadge
                category={aiResult.predicted_category}
                predictions={predictions}
                confidenceScore={Number(aiResult.confidence_score)}
                size="lg"
              />
              <p className="text-sm leading-relaxed text-chrome-600">
                Kết quả chỉ hỗ trợ sàng lọc, không thay thế chẩn đoán lâm sàng.
              </p>
              <details className="text-sm text-chrome-600">
                <summary className="cursor-pointer text-chrome-900 underline underline-offset-2">Thông tin mô hình</summary>
                <p className="mt-2 leading-relaxed">{MODEL_NOTE}</p>
              </details>
            </div>

            {predictions.length > 0 ? (
              <ul aria-label="Xác suất từng nhóm" className="divide-y divide-chrome-200">
                {predictions.map((p) => (
                  <GroupRow key={p.id} p={p} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-chrome-600">Không có dữ liệu phân loại theo nhóm.</p>
            )}
          </div>

          <div className="border-t border-chrome-200 p-4 md:p-5">
            <label htmlFor={commentId} className="block text-sm font-medium text-chrome-900">
              Nhận xét của bác sĩ
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id={commentId}
                type="text"
                disabled={isLocked}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ví dụ: đồng ý với kết quả AI, nốt mờ vùng đỉnh phổi phải"
                className="min-w-0 flex-1 rounded-sm border border-chrome-200 bg-white px-3 py-2 text-sm text-chrome-900 placeholder:text-chrome-600/70 focus:outline focus:outline-2 focus:outline-accent-500 disabled:bg-chrome-100 disabled:text-chrome-600"
              />
              {!isLocked && (
                <button
                  type="button"
                  onClick={saveComment}
                  disabled={saving}
                  className="rounded-sm bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:opacity-50"
                >
                  {saving ? 'Đang lưu…' : 'Lưu nhận xét'}
                </button>
              )}
            </div>
            {status && (
              <p role="status" className={`mt-2 text-sm ${status.kind === 'ok' ? 'text-clear-500' : 'text-flag-500'}`}>
                {status.text}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="border-t border-ink-800 px-4 py-3 text-sm text-ink-300">
          Chưa có kết quả AI cho ảnh này.
        </div>
      )}
    </section>
  );
};
