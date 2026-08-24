import { getSupabaseClient } from './supabase';

/**
 * Validates Supabase connection by testing a query on the chart_of_accounts table.
 */
export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  data?: any[];
  error?: string;
}> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.warn('Supabase belum terkonfigurasi. Periksa .env.local');
    return {
      ok: false,
      error: 'Supabase belum terkonfigurasi. Periksa .env.local',
    };
  }

  try {
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .limit(1);

    if (error) {
      console.error('SUPABASE ERROR:', error);

      return {
        ok: false,
        error: error.message,
      };
    }

    console.log('SUPABASE CONNECTION: OK');
    console.log('DATA:', data);

    return {
      ok: true,
      data: data || [],
    };
  } catch (err: unknown) {
    console.error('SUPABASE CONNECTION ERROR:', err);

    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}