import api from './api';
import { AuditLog } from '../types';

export const auditService = {
  getAuditLogs: async (params?: {
    user_id?: number;
    action?: string;
    target_entity?: string;
    target_id?: number;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLog[]> => {
    const response = await api.get('/audit-logs', { params });
    return response.data;
  },

  exportExcelUrl: (params?: { from_date?: string; to_date?: string; action?: string }): string => {
    const query = new URLSearchParams(params as any).toString();
    return `/api/v1/audit-logs/export?${query}`;
  }
};
