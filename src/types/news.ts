export type NewsCategory = 'kemitraan' | 'program' | 'dampak' | 'update_proyek';
export type NewsStatus = 'draft' | 'terbit';

export interface NewsArticle {
  id: string;
  kategori: NewsCategory;
  project_id?: string | null;
  judul: string;
  ringkasan: string;
  konten: string;
  lokasi?: string | null;
  foto_url?: string | null;
  tanggal: string;
  dibuat_oleh?: string | null;
  created_at?: string;
  status: NewsStatus;
}

export interface NewsCategoryMeta {
  code: NewsCategory;
  label: string;
  badgeClass: string;
  accentColor: string;
  description: string;
}

export const NEWS_CATEGORIES: Record<NewsCategory, NewsCategoryMeta> = {
  kemitraan: {
    code: 'kemitraan',
    label: 'Kemitraan Strategis',
    badgeClass: 'bg-emerald-800 text-emerald-100 border border-emerald-700',
    accentColor: '#15803D',
    description: 'Kerja sama eksternal, pemerintah, dan MOU bisnis.',
  },
  program: {
    code: 'program',
    label: 'Program Koperasi',
    badgeClass: 'bg-amber-500/20 text-amber-900 border border-amber-600/30',
    accentColor: '#C9972C',
    description: 'Inisiatif internal pendampingan dan ekspansi koperasi.',
  },
  dampak: {
    code: 'dampak',
    label: 'Dampak Sosial Ekonomi',
    badgeClass: 'bg-emerald-600/20 text-emerald-950 border border-emerald-600/40',
    accentColor: '#22A85C',
    description: 'Cerita kemaslahatan nyata di masyarakat akar rumput.',
  },
  update_proyek: {
    code: 'update_proyek',
    label: 'Update Proyek Sektor Riil',
    badgeClass: 'bg-teal-500/20 text-teal-950 border border-teal-600/40',
    accentColor: '#14B8A6',
    description: 'Laporan progres panen, tangkapan, dan operasional unit usaha.',
  },
};
