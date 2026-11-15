import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Filter, 
  Eye, 
  Calendar, 
  Terminal,
  Activity
} from 'lucide-react';
import { AuditLog } from '../../types';
import { auditService } from '../../services/auditService';
import { Modal } from '../../components/common/Modal';

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Log detail
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditService.getAuditLogs({
        action: actionFilter || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleExportExcel = () => {
    const url = auditService.exportExcelUrl({
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      action: actionFilter || undefined,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-chrome-900 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-accent-600" />
            Nhật Ký Kiểm Toán Hệ Thống (Audit Log - UC011)
          </h1>
          <p className="text-sm text-chrome-600 mt-1">
            Tra soát toàn bộ lịch sử thao tác, truy vết sự cố, tính minh bạch dữ liệu y tế và biến động bản ghi.
          </p>
        </div>

        <button
          onClick={handleExportExcel}
          className="px-4 py-2.5 bg-clear-500 hover:bg-clear-500 text-white text-xs font-bold rounded-sm transition-all flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          Xuất Báo Cáo Excel (.xlsx)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-sm border border-chrome-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-chrome-600" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 bg-chrome-50 border border-chrome-200 rounded-sm text-xs font-medium text-chrome-900 focus:outline focus:outline-2 focus:outline-accent-500"
          >
            <option value="">Tất cả loại hành động</option>
            <option value="LOGIN_SUCCESS">Đăng nhập thành công</option>
            <option value="CREATE_PATIENT">Tiếp nhận bệnh nhân mới</option>
            <option value="ASSIGN_QUEUE">Phân phòng khám & cấp STT</option>
            <option value="START_EXAM">Gọi bệnh nhân vào khám</option>
            <option value="SAVE_CLINICAL_DRAFT">Lưu nháp bệnh án</option>
            <option value="UPLOAD_XRAY">Tải lên ảnh X-quang</option>
            <option value="RUN_AI_DIAGNOSIS">Chạy suy luận AI</option>
            <option value="CLOSE_ENCOUNTER">Đóng & khóa bệnh án</option>
            <option value="EXPORT_PDF">Xuất phiếu khám PDF</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-chrome-600">Từ ngày:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 rounded-sm border border-chrome-200 text-xs focus:outline focus:outline-2 focus:outline-accent-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-chrome-600">Đến ngày:</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 rounded-sm border border-chrome-200 text-xs focus:outline focus:outline-2 focus:outline-accent-500"
          />
        </div>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-chrome-100 hover:bg-chrome-200 text-chrome-900 text-xs font-semibold rounded-sm transition-colors ml-auto"
        >
          Áp Dụng Bộ Lọc
        </button>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-sm border border-chrome-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-chrome-50 border-b border-chrome-200 text-chrome-600 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Thời Điểm</th>
                <th className="py-3.5 px-4">Người Thực Hiện</th>
                <th className="py-3.5 px-4">Hành Động</th>
                <th className="py-3.5 px-4">Đối Tượng Tác Động</th>
                <th className="py-3.5 px-4">Địa Chỉ IP</th>
                <th className="py-3.5 px-4 text-right">Chi Tiết Thay Đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-chrome-100 text-chrome-900 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-chrome-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-chrome-600">
                    {new Date(log.created_at).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-3.5 px-4 font-sans font-bold text-chrome-900">
                    {log.user ? (
                      <div>
                        <span>{log.user.full_name}</span>
                        <span className="block text-[10px] font-mono text-chrome-600">@{log.user.username} ({log.user.role})</span>
                      </div>
                    ) : (
                      <span className="text-chrome-600 italic">Hệ thống</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-sans">
                    <span className="px-2 py-0.5 rounded-sm font-bold text-[10px] bg-chrome-100 text-chrome-900 border border-chrome-200">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-chrome-600">
                    {log.target_entity} {log.target_id ? `(#${log.target_id})` : ''}
                  </td>
                  <td className="py-3.5 px-4 text-chrome-600">
                    {log.ip_address || '127.0.0.1'}
                  </td>
                  <td className="py-3.5 px-4 text-right font-sans">
                    {log.details ? (
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 text-accent-600 hover:text-accent-600 bg-chrome-50 hover:bg-chrome-100 rounded-sm text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem JSON Diff
                      </button>
                    ) : (
                      <span className="text-chrome-200">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Diff Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Chi Tiết Nhật Ký Thao Tác #${selectedLog.id} — ${selectedLog.action}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 bg-chrome-100 rounded-sm text-xs space-y-1">
              <p><span className="text-chrome-600">Người thực hiện:</span> <b>{selectedLog.user?.full_name} (@{selectedLog.user?.username})</b></p>
              <p><span className="text-chrome-600">Thời gian:</span> {new Date(selectedLog.created_at).toLocaleString('vi-VN')}</p>
              <p><span className="text-chrome-600">Đối tượng:</span> {selectedLog.target_entity} {selectedLog.target_id ? `(ID: ${selectedLog.target_id})` : ''}</p>
              <p><span className="text-chrome-600">Địa chỉ IP:</span> {selectedLog.ip_address}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-chrome-900 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-accent-600" />
                Dữ Liệu Thay Đổi (Payload / JSON Diff):
              </label>
              <pre className="p-4 bg-ink-950 text-clear-500 rounded-sm font-mono text-xs overflow-x-auto max-h-80 border border-chrome-900">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-chrome-200 hover:bg-chrome-200 text-chrome-900 text-xs font-bold rounded-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
