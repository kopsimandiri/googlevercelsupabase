import { useState, useEffect, useCallback } from 'react';
import { auditService, AuditLogEntry } from '../services/auditService';

export function useAudit(options?: { entity?: string; action?: string; limit?: number }) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await auditService.getAuditLogs(options);
      setLogs(res.data);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat log audit aktivitas');
    } finally {
      setIsLoading(false);
    }
  }, [options?.entity, options?.action, options?.limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logActivity = async (
    action: string,
    entity: string,
    entityId?: string,
    oldData?: any,
    newData?: any
  ) => {
    const res = await auditService.logActivity(action, entity, entityId, oldData, newData);
    await fetchLogs();
    return res;
  };

  return {
    logs,
    isLoading,
    error,
    refresh: fetchLogs,
    logActivity,
  };
}
