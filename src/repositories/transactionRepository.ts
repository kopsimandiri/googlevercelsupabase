import { getSupabaseClient } from '../lib/supabase';
import { TransactionRecord } from '../types/database';

export interface TransactionFilters {
  referal?: 'KOPERASI' | 'PROJECT';
  jenis?: 'MASUK' | 'KELUAR';
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  limit?: number;
}

export const transactionRepository = {
  async fetchFromSupabase(filters?: TransactionFilters): Promise<{ data: any[]; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: [], error: new Error('Supabase client not initialized') };
    }

    try {
      let query = client
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (filters?.referal) {
        query = query.eq('referral_type', filters.referal);
      }
      if (filters?.jenis) {
        query = query.eq('transaction_type', filters.jenis);
      }
      if (filters?.startDate) {
        query = query.gte('transaction_date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('transaction_date', filters.endDate);
      }
      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  async upsertToSupabase(row: any): Promise<{ data: any; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client.from('transactions').upsert([row]).select();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async deleteFromSupabase(id: string): Promise<{ success: boolean; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: new Error('Supabase client not initialized') };
    }

    try {
      const isNum = /^\d+$/.test(id);
      let query = client.from('transactions').delete();
      if (isNum) {
        query = query.or(`id.eq.${id},transaction_no.eq.${id}`);
      } else {
        query = query.eq('transaction_no', id);
      }
      const { error } = await query;
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  async callVoidRpc(transactionNo: string, reason: string): Promise<{ data: any; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client.rpc('void_transaction', {
        p_transaction_no: transactionNo,
        p_reason: reason,
      });
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },
};
