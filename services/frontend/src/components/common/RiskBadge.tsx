import React from 'react';
import { PredictionItem } from '../../types';

interface RiskBadgeProps {
  category?: string;
  predictions?: PredictionItem[];
  confidenceScore?: number;
  size?: 'sm' | 'md' | 'lg';
}

type Tone = 'flagged' | 'clear' | 'pending';

const TONE: Record<Tone, string> = {
  flagged: 'border-flag-500/40 bg-flag-50 text-flag-500',
  clear: 'border-clear-500/40 bg-clear-50 text-clear-500',
  pending: 'border-chrome-200 bg-chrome-100 text-chrome-600',
};

const SIZE: Record<NonNullable<RiskBadgeProps['size']>, string> = {
  sm: 'text-xs px-1.5 py-px',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-2.5 py-1 font-semibold',
};

// Trạng thái kết quả AI. Màu chỉ mang nghĩa trạng thái, không trang trí.
export const RiskBadge: React.FC<RiskBadgeProps> = ({
  category,
  predictions,
  confidenceScore,
  size = 'md',
}) => {
  const flagged = predictions ? predictions.filter((p) => p.flagged) : [];
  const legacyFlag = !!category && category.toLowerCase().includes('cảnh báo');

  let tone: Tone = 'pending';
  let text = 'Chưa phân tích';

  if (flagged.length > 0 || legacyFlag) {
    tone = 'flagged';
    text = flagged.length > 0
      ? `Vượt ngưỡng: ${flagged.map((f) => f.name).join('; ')}`
      : category || 'Có dấu hiệu bất thường';
  } else if (category || predictions) {
    tone = 'clear';
    text = 'Không nhóm nào vượt ngưỡng';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm border ${TONE[tone]} ${SIZE[size]}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span>{text}</span>
      {confidenceScore !== undefined && confidenceScore > 0 && (
        <span className="font-mono tabular-nums opacity-80">{(confidenceScore * 100).toFixed(1)}%</span>
      )}
    </span>
  );
};
