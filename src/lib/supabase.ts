import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as any);

const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey = (
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabasePublishableKey !== 'your-publishable-key' &&
  supabasePublishableKey !== 'your-anon-key'
);

let supabaseInstance: SupabaseClient | null = null;

export function validateEnvironment(): void {
  const mode = metaEnv.MODE || 'development';

  if (!isSupabaseConfigured) {
    const errorMsg =
      'KOPSIM: Supabase URL atau Publishable Key belum dikonfigurasi. ' +
      'Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY telah diatur di Environment Variables.';
    if (mode === 'production') {
      throw new Error(errorMsg);
    } else {
      console.warn(errorMsg);
    }
  }
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }

  if (!supabaseInstance) {
    supabaseInstance = createClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }

  return supabaseInstance;
}

export interface SupabaseTableCheckResult {
  tableName: string;
  isConfigured: boolean;
  isConnected: boolean;
  rowCount?: number;
  latencyMs?: number;
  statusMessage: string;
  url: string;
  keyMasked: string;
  error?: string;
}

/**
 * Diagnostic helper to test connection to a specific table in Supabase
 */
export async function testTableConnection(tableName: string): Promise<SupabaseTableCheckResult> {
  const maskedKey = supabasePublishableKey
    ? `${supabasePublishableKey.substring(0, 8)}...${supabasePublishableKey.substring(supabasePublishableKey.length - 4)}`
    : 'Belum Dikonfigurasi';

  if (!isSupabaseConfigured) {
    return {
      tableName,
      isConfigured: false,
      isConnected: false,
      statusMessage: 'Supabase URL belum dikonfigurasi. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY telah diisi di Environment Variables.',
      url: supabaseUrl || 'Belum Dikonfigurasi',
      keyMasked: maskedKey,
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      tableName,
      isConfigured: true,
      isConnected: false,
      statusMessage: 'Gagal menginisialisasi Supabase client.',
      url: supabaseUrl,
      keyMasked: maskedKey,
    };
  }

  const startTime = performance.now();
  try {
    const { count, error } = await client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - startTime);

    if (error) {
      return {
        tableName,
        isConfigured: true,
        isConnected: false,
        latencyMs,
        statusMessage: `Tabel '${tableName}' belum ditemukan atau akses ditolak: ${error.message}`,
        url: supabaseUrl,
        keyMasked: maskedKey,
        error: error.message,
      };
    }

    return {
      tableName,
      isConfigured: true,
      isConnected: true,
      rowCount: count ?? 0,
      latencyMs,
      statusMessage: `Berhasil terhubung ke tabel '${tableName}' (${count ?? 0} baris data, latensi ${latencyMs}ms).`,
      url: supabaseUrl,
      keyMasked: maskedKey,
    };
  } catch (err: any) {
    const latencyMs = Math.round(performance.now() - startTime);
    return {
      tableName,
      isConfigured: true,
      isConnected: false,
      latencyMs,
      statusMessage: `Kesalahan jaringan saat menghubungi Supabase: ${err?.message || err}`,
      url: supabaseUrl,
      keyMasked: maskedKey,
      error: String(err?.message || err),
    };
  }
}
