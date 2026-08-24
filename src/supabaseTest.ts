import { testSupabaseConnection } from './lib/testSupabase';

(window as any).testSupabaseConnection = testSupabaseConnection;

console.log('Supabase test tersedia.');
console.log('Jalankan: testSupabaseConnection()');