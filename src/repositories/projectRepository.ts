import { getSupabaseClient } from '../lib/supabase';

export const projectRepository = {
  async fetchProjectsFromSupabase(): Promise<{ data: any[]; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: [], error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  async upsertProjectToSupabase(row: any): Promise<{ data: any; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client.from('projects').upsert([row]).select();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },
};
