import React from 'react';
import { ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { PredictionItem } from '../../types';

interface RiskBadgeProps {
  category?: string;
  predictions?: PredictionItem[];
  confidenceScore?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  category,
  predictions,
  confidenceScore,
  size = 'md',
}) => {
  const flagged = predictions ? predictions.filter(p => p.flagged) : [];
  const isFlagged = flagged.length > 0 || (category && category.toLowerCase().includes('cảnh báo'));

  let bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-emerald-100';
  let Icon = ShieldCheck;
  let label = category || 'Không phát hiện bất thường';

  if (isFlagged) {
    bgClass = 'bg-rose-50 text-rose-700 border-rose-400 shadow-rose-100 animate-pulse';
    Icon = AlertTriangle;
    if (flagged.length > 0) {
      label = `Cảnh báo: ${flagged.map(f => f.name).join(', ')}`;
    } else {
      label = category || 'Phát hiện dấu hiệu bất thường';
    }
  } else if (!category && !predictions) {
    bgClass = 'bg-slate-100 text-slate-700 border-slate-300';
    Icon = AlertCircle;
    label = 'Chưa phân tích';
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2 font-semibold',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full border shadow-sm ${bgClass} ${sizeClasses[size]}`}
    >
      <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
      <span>{label}</span>
      {confidenceScore !== undefined && confidenceScore > 0 && (
        <span className="font-mono text-xs opacity-90 ml-1">
          ({(confidenceScore * 100).toFixed(1)}%)
        </span>
      )}
    </div>
  );
};
