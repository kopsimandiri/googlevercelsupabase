import { getSupabaseClient } from '../lib/supabase';
import { NewsArticle } from '../types/news';

export const newsRepository = {
  async fetchNewsFromSupabase(): Promise<{ data: any[]; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: [], error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client
        .from('news_articles')
        .select('*')
        .order('published_at', { ascending: false });
      return { data: data || [], error };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  async upsertNewsToSupabase(row: any): Promise<{ data: any; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { data: null, error: new Error('Supabase client not initialized') };
    }

    try {
      const { data, error } = await client.from('news_articles').upsert([row]).select();
      return { data, error };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  async deleteNewsFromSupabase(id: string): Promise<{ success: boolean; error: any }> {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, error: new Error('Supabase client not initialized') };
    }

    try {
      const { error } = await client.from('news_articles').delete().eq('id', id);
      return { success: !error, error };
    } catch (err) {
      return { success: false, error: err };
    }
  },
};
