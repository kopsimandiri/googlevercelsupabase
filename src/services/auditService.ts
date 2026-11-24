/**
 * KOPSIM MANDIRI - Audit Log Service
 * Provides centralized audit trail tracking, immutable log fetching,
 * and security event logging for financial & identity mutations.
 */
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { authService } from './authService';

export interface AuditLogEntry {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  created_at: string;
}

const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'audit-001',
    user_email: 'admin@kopsim.id',
    action: 'SYSTEM_BOOT',
    entity: 'system',
    entity_id: 'boot-2026',
    new_values: { version: '2.5.0', security_tier: 'HARDENED_RBAC_RLS_FINANCIAL' },
    created_at: '2026-08-26T08:00:00.000Z',
  },
  {
    id: 'audit-002',
    user_email: 'admin@kopsim.id',
    action: 'FINANCIAL_INIT',
    entity: 'chart_of_accounts',
    entity_id: 'COA_MASTER',
    new_values: { standard: 'SAK_ETAP_KOPERASI_2026', total_accounts: 25 },
    created_at: '2026-08-26T08:05:00.000Z',
  },
];

let inMemoryAuditLogs: AuditLogEntry[] | null = null;

export const auditService = {
  getStoredLogs(): AuditLogEntry[] {
    if (inMemoryAuditLogs) return inMemoryAuditLogs;
    inMemoryAuditLogs = [...INITIAL_AUDIT_LOGS];
    return inMemoryAuditLogs;
  },

  async logActivity(
    action: string,
    entity: string,
    entityId: string,
    oldValues?: Record<string, any> | null,
    newValues?: Record<string, any> | null
  ): Promise<{ success: boolean; id?: string }> {
    const user = authService.getCurrentUser();
    const client = getSupabaseClient();
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_id: user?.id || null,
      user_email: user?.email || user?.username || 'system',
      action: action.toUpperCase(),
      entity,
      entity_id: entityId,
      old_values: oldValues || null,
      new_values: newValues || null,
      created_at: new Date().toISOString(),
    };

    // 1. Try insert to Supabase public.audit_logs
    if (client) {
      try {
        const isUuid = (val?: string | null) =>
          Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
        const { error } = await client.from('audit_logs').insert([
          {
            user_id: isUuid(user?.id) ? user?.id : null,
            user_email: newEntry.user_email,
            action: newEntry.action,
            entity: newEntry.entity,
            entity_id: newEntry.entity_id,
            old_values: newEntry.old_values,
            new_values: newEntry.new_values,
          },
        ]);
        if (!error) {
          console.log(`[auditService] Log '${action}' tersimpan di Supabase.`);
        }
      } catch (err) {
        console.warn('[auditService] Supabase audit insert notice:', err);
      }
    }

    // 2. In-memory fallback HANYA jika Supabase belum dikonfigurasi (sandbox/test offline)
    if (!isSupabaseConfigured || !client) {
      const logs = this.getStoredLogs();
      logs.unshift(newEntry);
      inMemoryAuditLogs = logs.slice(0, 200);
    }

    return { success: true, id: newEntry.id };
  },

  async getAuditLogs(options?: {
    entity?: string;
    action?: string;
    limit?: number;
  }): Promise<{ data: AuditLogEntry[]; source: 'SUPABASE' | 'LOCAL' }> {
    const client = getSupabaseClient();
    const limit = options?.limit || 50;

    if (isSupabaseConfigured && client) {
      let query = client
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (options?.entity) {
        query = query.eq('entity', options.entity);
      }
      if (options?.action) {
        query = query.eq('action', options.action.toUpperCase());
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Gagal memuat audit log dari server: ${error.message}`);
      }
      const mapped: AuditLogEntry[] = (data || []).map((r: any) => ({
        id: String(r.id),
        user_id: r.user_id || null,
        user_email: r.user_email || 'system',
        action: r.action || 'ACTIVITY',
        entity: r.entity || 'general',
        entity_id: r.entity_id || null,
        old_values: r.old_values || null,
        new_values: r.new_values || null,
        ip_address: r.ip_address || null,
        created_at: r.created_at || new Date().toISOString(),
      }));
      return { data: mapped, source: 'SUPABASE' };
    }

    let local = this.getStoredLogs();
    if (options?.entity) {
      local = local.filter((l) => l.entity.toLowerCase() === options.entity?.toLowerCase());
    }
    if (options?.action) {
      local = local.filter((l) => l.action.toLowerCase() === options.action?.toLowerCase());
    }

    return { data: local.slice(0, limit), source: 'LOCAL' };
  },
};
