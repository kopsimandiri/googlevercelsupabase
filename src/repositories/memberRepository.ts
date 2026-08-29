import { getSupabaseClient } from '../lib/supabase';
import { MemberRecord } from '../types/database';

export const memberRepository = {
  async fetchMembersFromSupabase(): Promise<{ data: any[]; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: [], error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client
        .from('members')
        .select('*')
        .order('registered_at', { ascending: false });
      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  async upsertMemberToSupabase(row: any): Promise<{ data: any; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client.from('members').upsert([row]).select();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async deleteMemberFromSupabase(id: string): Promise<{ success: boolean; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: new Error('Supabase client not initialized') };
    }

    try {
      const { error } = await client
        .from('members')
        .delete()
        .or(`id.eq.${id},member_no.eq.${id}`);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  },

  async fetchRegistrationsFromSupabase(): Promise<{ data: any[]; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: [], error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client
        .from('member_registrations')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  async upsertRegistrationToSupabase(row: any): Promise<{ data: any; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client.from('member_registrations').upsert([row]).select();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },
};
