import { getSupabaseClient } from '../lib/supabase';
import { AuditLogEntry } from '../services/auditService';

export const auditRepository = {
  async fetchLogsFromSupabase(options?: {
    entity?: string;
    action?: string;
    limit?: number;
  }): Promise<{ data: any[]; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: [], error: new Error('Supabase client not initialized') };
    }

    try {
      let query = client
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(options?.limit || 50);

      if (options?.entity) {
        query = query.eq('entity', options.entity);
      }
      if (options?.action) {
        query = query.eq('action', options.action.toUpperCase());
      }

      const { data, error } = await query;
      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  async insertLogToSupabase(entry: any): Promise<{ success: boolean; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: new Error('Supabase client not initialized') };
    }

    try {
      const { error } = await client.from('audit_logs').insert([entry]);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  },
};
