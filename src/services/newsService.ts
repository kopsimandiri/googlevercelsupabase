import { getSupabaseClient } from '../lib/supabase';
import { NewsArticle, NewsCategory, NewsStatus } from '../types/news';

export const NEWS_ARTICLES_SQL_DDL = `-- ====================================================================
-- SKEMA DATABASE: public.news_articles (Kanal Berita & Warta KOPSIM)
-- ====================================================================

-- 1. Buat tabel public.news_articles jika belum ada
CREATE TABLE IF NOT EXISTS public.news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kategori TEXT NOT NULL CHECK (kategori IN ('kemitraan', 'program', 'dampak', 'update_proyek')),
  project_id TEXT,
  judul TEXT NOT NULL,
  ringkasan TEXT NOT NULL,
  konten TEXT NOT NULL,
  lokasi TEXT,
  foto_url TEXT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  dibuat_oleh UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'terbit'))
);

-- 2. Indexing untuk optimasi query publik dan CMS
CREATE INDEX IF NOT EXISTS idx_news_articles_status ON public.news_articles(status);
CREATE INDEX IF NOT EXISTS idx_news_articles_kategori ON public.news_articles(kategori);
CREATE INDEX IF NOT EXISTS idx_news_articles_tanggal ON public.news_articles(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_project_id ON public.news_articles(project_id);

-- 3. Aktifkan Row Level Security (RLS)
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy 1: Publik (anon / authenticated) HANYA boleh membaca artikel berstatus 'terbit'
DROP POLICY IF EXISTS "Public Read Access for Published News" ON public.news_articles;
CREATE POLICY "Public Read Access for Published News"
  ON public.news_articles
  FOR SELECT
  USING (status = 'terbit');

-- 5. RLS Policy 2: Admin memiliki hak penuh (SELECT ALL, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Admin Full Access for News Articles" ON public.news_articles;
CREATE POLICY "Admin Full Access for News Articles"
  ON public.news_articles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('ADMIN', 'SUPER_ADMIN', 'PENGURUS')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = auth.uid()
        AND r.name IN ('ADMIN', 'SUPER_ADMIN', 'PENGURUS')
    )
  );

-- ====================================================================
-- TAHAP 2: SEED 6 DRAFT ARTIKEL (Status 'draft' & [ISI: ...] Utuh)
-- ====================================================================

INSERT INTO public.news_articles (kategori, project_id, judul, ringkasan, konten, lokasi, tanggal, status)
VALUES
(
  'kemitraan', NULL,
  'Sinergi Pemerintah dan Syarikat Islam Bangun Ekonomi Rakyat',
  'KOPSIM Mandiri menjalin sinergi dengan [ISI: nama instansi] memperkuat ekonomi rakyat berbasis sektor riil.',
  '[ISI: Lokasi], [ISI: tanggal] — Koperasi Syarikat Islam Mandiri (KOPSIM Mandiri) menjalin sinergi dengan [ISI: nama instansi pemerintah] dalam upaya bersama memperkuat ekonomi rakyat berbasis sektor riil. Kerja sama ini menyasar penguatan sektor perikanan dan pertanian di wilayah [ISI: lokasi], melibatkan pendampingan langsung kepada nelayan dan petani binaan koperasi.

"[ISI: kutipan]" ujar [ISI: nama & jabatan].

Sinergi ini menjadi langkah lanjutan dari komitmen KOPSIM Mandiri membangun ekonomi umat yang mandiri dan berkelanjutan, sejalan dengan prinsip syariah yang dipegang koperasi sejak awal berdiri.',
  '[ISI: lokasi]', CURRENT_DATE, 'draft'
),
(
  'program', NULL,
  'Langkah Nyata Penguatan Perikanan dan Pertanian Lokal',
  'Program pendampingan nelayan dan petani binaan KOPSIM Mandiri di sektor perikanan dan pertanian.',
  'KOPSIM Mandiri terus memperkuat komitmennya di sektor riil melalui program pendampingan nelayan dan petani binaan. Di sektor perikanan, koperasi menyalurkan hasil tangkapan ikan layang dan tuna dari nelayan Ambon ke jaringan distribusi yang lebih luas. Di sektor pertanian, program pendampingan mencakup budidaya jagung, wortel, cabai, dan singkong — termasuk pengolahan singkong menjadi tepung tapioka bernilai tambah lebih tinggi.

Program ini bukan sekadar transaksi jual-beli, melainkan bagian dari ekosistem ekonomi umat yang menghubungkan hulu (petani dan nelayan) dengan hilir (pasar dan industri pengolahan).',
  NULL, CURRENT_DATE, 'draft'
),
(
  'kemitraan', NULL,
  'MOU Pengelolaan SDA untuk Kesejahteraan Masyarakat',
  'KOPSIM Mandiri menandatangani MOU dengan [ISI: nama pihak] terkait pengelolaan SDA untuk kesejahteraan masyarakat.',
  '[ISI: Lokasi], [ISI: tanggal] — KOPSIM Mandiri menandatangani nota kesepahaman (MOU) dengan [ISI: nama pihak terkait] mengenai pengelolaan sumber daya alam untuk kesejahteraan masyarakat setempat. MOU ini mencakup [ISI: ruang lingkup kerja sama].

Penandatanganan dilakukan oleh [ISI: nama & jabatan pihak koperasi] dan [ISI: nama & jabatan pihak mitra].

"[ISI: kutipan]" kata [ISI: nama].',
  '[ISI: lokasi]', CURRENT_DATE, 'draft'
),
(
  'dampak', NULL,
  'Ekonomi Rakyat Bangkit dari Seram Bagian Timur!',
  'Dampak nyata program ekonomi umat KOPSIM Mandiri di Kabupaten Seram Bagian Timur, Maluku.',
  'Kabupaten Seram Bagian Timur, Maluku, menjadi salah satu wilayah yang merasakan langsung dampak program ekonomi umat KOPSIM Mandiri. Melalui pendampingan nelayan binaan, hasil tangkapan ikan layang dan tuna dari perairan setempat kini tersalurkan dengan rantai distribusi yang lebih tertata.

"[ISI: kutipan dari nelayan/tokoh masyarakat]" ujar [ISI: nama].

Bangkitnya ekonomi rakyat di Seram Bagian Timur menjadi bukti nyata bahwa model kemitraan koperasi berbasis syariah mampu memberi dampak langsung ke masyarakat akar rumput.',
  'Seram Bagian Timur, Maluku', CURRENT_DATE, 'draft'
),
(
  'update_proyek', 'pertanian-tapioka',
  'Hasil Panen Singkong dan Jagung',
  'Update hasil panen periode ini dari program Pertanian & Industri Tapioka.',
  'Musim panen kali ini, petani binaan program Pertanian & Industri Tapioka berhasil memanen [ISI: volume] ton singkong dan [ISI: volume] ton jagung dari lahan seluas [ISI: luas] hektar. Sebagian hasil singkong telah masuk tahap pengolahan menjadi tepung tapioka di unit pengolahan koperasi.',
  NULL, CURRENT_DATE, 'draft'
),
(
  'update_proyek', 'perikanan-ambon',
  'Hasil Tangkap Ikan',
  'Update hasil tangkapan periode ini dari program Perikanan Ambon.',
  'Nelayan binaan program Perikanan Ambon mencatat hasil tangkapan [ISI: volume] ton ikan layang dan tuna pada periode ini, disalurkan ke [ISI: tujuan distribusi].',
  'Ambon, Maluku', CURRENT_DATE, 'draft'
);
`;

const INITIAL_ARTICLES: NewsArticle[] = [
  {
    id: 'art-001',
    kategori: 'kemitraan',
    project_id: null,
    judul: 'Sinergi Pemerintah dan Syarikat Islam Bangun Ekonomi Rakyat',
    ringkasan:
      'KOPSIM Mandiri menjalin sinergi dengan [ISI: nama instansi] memperkuat ekonomi rakyat berbasis sektor riil.',
    konten: `[ISI: Lokasi], [ISI: tanggal] — Koperasi Syarikat Islam Mandiri (KOPSIM Mandiri) menjalin sinergi dengan [ISI: nama instansi pemerintah] dalam upaya bersama memperkuat ekonomi rakyat berbasis sektor riil. Kerja sama ini menyasar penguatan sektor perikanan dan pertanian di wilayah [ISI: lokasi], melibatkan pendampingan langsung kepada nelayan dan petani binaan koperasi.

"[ISI: kutipan]" ujar [ISI: nama & jabatan].

Sinergi ini menjadi langkah lanjutan dari komitmen KOPSIM Mandiri membangun ekonomi umat yang mandiri dan berkelanjutan, sejalan dengan prinsip syariah yang dipegang koperasi sejak awal berdiri.`,
    lokasi: '[ISI: lokasi]',
    foto_url: '/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    status: 'draft',
  },
  {
    id: 'art-002',
    kategori: 'program',
    project_id: null,
    judul: 'Langkah Nyata Penguatan Perikanan dan Pertanian Lokal',
    ringkasan:
      'Program pendampingan nelayan dan petani binaan KOPSIM Mandiri di sektor perikanan dan pertanian.',
    konten: `KOPSIM Mandiri terus memperkuat komitmennya di sektor riil melalui program pendampingan nelayan dan petani binaan. Di sektor perikanan, koperasi menyalurkan hasil tangkapan ikan layang dan tuna dari nelayan Ambon ke jaringan distribusi yang lebih luas. Di sektor pertanian, program pendampingan mencakup budidaya jagung, wortel, cabai, dan singkong — termasuk pengolahan singkong menjadi tepung tapioka bernilai tambah lebih tinggi.

Program ini bukan sekadar transaksi jual-beli, melainkan bagian dari ekosistem ekonomi umat yang menghubungkan hulu (petani dan nelayan) dengan hilir (pasar dan industri pengolahan).`,
    lokasi: null,
    foto_url: '/assets/portfolio/pertanian-panen-singkong.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    status: 'draft',
  },
  {
    id: 'art-003',
    kategori: 'kemitraan',
    project_id: null,
    judul: 'MOU Pengelolaan SDA untuk Kesejahteraan Masyarakat',
    ringkasan:
      'KOPSIM Mandiri menandatangani MOU dengan [ISI: nama pihak] terkait pengelolaan SDA untuk kesejahteraan masyarakat.',
    konten: `[ISI: Lokasi], [ISI: tanggal] — KOPSIM Mandiri menandatangani nota kesepahaman (MOU) dengan [ISI: nama pihak terkait] mengenai pengelolaan sumber daya alam untuk kesejahteraan masyarakat setempat. MOU ini mencakup [ISI: ruang lingkup kerja sama].

Penandatanganan dilakukan oleh [ISI: nama & jabatan pihak koperasi] dan [ISI: nama & jabatan pihak mitra].

"[ISI: kutipan]" kata [ISI: nama].`,
    lokasi: '[ISI: lokasi]',
    foto_url: '/assets/portfolio/perikanan-tuna-ambon.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    status: 'draft',
  },
  {
    id: 'art-004',
    kategori: 'dampak',
    project_id: null,
    judul: 'Ekonomi Rakyat Bangkit dari Seram Bagian Timur!',
    ringkasan:
      'Dampak nyata program ekonomi umat KOPSIM Mandiri di Kabupaten Seram Bagian Timur, Maluku.',
    konten: `Kabupaten Seram Bagian Timur, Maluku, menjadi salah satu wilayah yang merasakan langsung dampak program ekonomi umat KOPSIM Mandiri. Melalui pendampingan nelayan binaan, hasil tangkapan ikan layang dan tuna dari perairan setempat kini tersalurkan dengan rantai distribusi yang lebih tertata.

"[ISI: kutipan dari nelayan/tokoh masyarakat]" ujar [ISI: nama].

Bangkitnya ekonomi rakyat di Seram Bagian Timur menjadi bukti nyata bahwa model kemitraan koperasi berbasis syariah mampu memberi dampak langsung ke masyarakat akar rumput.`,
    lokasi: 'Seram Bagian Timur, Maluku',
    foto_url: '/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    status: 'draft',
  },
  {
    id: 'art-005',
    kategori: 'update_proyek',
    project_id: 'pertanian-tapioka',
    judul: 'Hasil Panen Singkong dan Jagung',
    ringkasan:
      'Update hasil panen periode ini dari program Pertanian & Industri Tapioka.',
    konten:
      'Musim panen kali ini, petani binaan program Pertanian & Industri Tapioka berhasil memanen [ISI: volume] ton singkong dan [ISI: volume] ton jagung dari lahan seluas [ISI: luas] hektar. Sebagian hasil singkong telah masuk tahap pengolahan menjadi tepung tapioka di unit pengolahan koperasi.',
    lokasi: null,
    foto_url: '/assets/portfolio/industri-tepung-tapioka.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    status: 'draft',
  },
  {
    id: 'art-006',
    kategori: 'update_proyek',
    project_id: 'perikanan-ambon',
    judul: 'Hasil Tangkap Ikan',
    ringkasan: 'Update hasil tangkapan periode ini dari program Perikanan Ambon.',
    konten:
      'Nelayan binaan program Perikanan Ambon mencatat hasil tangkapan [ISI: volume] ton ikan layang dan tuna pada periode ini, disalurkan ke [ISI: tujuan distribusi].',
    lokasi: 'Ambon, Maluku',
    foto_url: '/assets/portfolio/perikanan-tuna-ambon.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    status: 'draft',
  },
];

const LOCAL_STORAGE_KEY = 'kopsim_news_articles_v1';

export class NewsService {
  private getLocalArticles(): NewsArticle[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    this.saveLocalArticles(INITIAL_ARTICLES);
    return INITIAL_ARTICLES;
  }

  private saveLocalArticles(articles: NewsArticle[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(articles));
    } catch (e) {
      console.warn('Failed to persist articles in localStorage:', e);
    }
  }

  /**
   * Mengambil semua artikel yang berstatus 'terbit' (untuk portal publik)
   */
  async getPublishedArticles(): Promise<NewsArticle[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .select('*')
          .eq('status', 'terbit')
          .order('tanggal', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as NewsArticle[];
        }
      } catch (err) {
        console.warn('Supabase query error on news_articles:', err);
      }
    }

    // Local fallback
    const local = this.getLocalArticles();
    return local
      .filter((a) => a.status === 'terbit')
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  }

  /**
   * Mengambil semua artikel (draft & terbit) untuk CMS Admin
   */
  async getAllArticles(): Promise<NewsArticle[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as NewsArticle[];
        }
      } catch (err) {
        console.warn('Supabase query all news_articles:', err);
      }
    }

    const local = this.getLocalArticles();
    return local.sort(
      (a, b) =>
        new Date(b.created_at || b.tanggal).getTime() -
        new Date(a.created_at || a.tanggal).getTime()
    );
  }

  /**
   * Ambil artikel berdasarkan ID
   */
  async getArticleById(id: string): Promise<NewsArticle | null> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return data as NewsArticle;
        }
      } catch (err) {
        console.warn('Supabase query article by id error:', err);
      }
    }

    const local = this.getLocalArticles();
    return local.find((a) => a.id === id) || null;
  }

  /**
   * Simpan atau Buat Artikel Baru
   */
  async createArticle(
    article: Omit<NewsArticle, 'id' | 'created_at'>
  ): Promise<NewsArticle> {
    const id = `art-${Date.now()}`;
    const newArticle: NewsArticle = {
      ...article,
      id,
      created_at: new Date().toISOString(),
    };

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .insert([
            {
              kategori: newArticle.kategori,
              project_id: newArticle.project_id || null,
              judul: newArticle.judul,
              ringkasan: newArticle.ringkasan,
              konten: newArticle.konten,
              lokasi: newArticle.lokasi || null,
              foto_url: newArticle.foto_url || null,
              tanggal: newArticle.tanggal,
              status: newArticle.status,
            },
          ])
          .select()
          .single();

        if (!error && data) {
          const saved = data as NewsArticle;
          const current = this.getLocalArticles();
          this.saveLocalArticles([saved, ...current.filter((c) => c.id !== saved.id)]);
          return saved;
        }
      } catch (err) {
        console.warn('Supabase insert news error:', err);
      }
    }

    const current = this.getLocalArticles();
    const updated = [newArticle, ...current];
    this.saveLocalArticles(updated);
    return newArticle;
  }

  /**
   * Perbarui Artikel
   */
  async updateArticle(id: string, updates: Partial<NewsArticle>): Promise<NewsArticle> {
    // Validasi pencegahan status terbit bila masih ada placeholder
    if (updates.status === 'terbit') {
      const existing = await this.getArticleById(id);
      const combined = { ...existing, ...updates };
      if (this.hasPlaceholders(combined.konten || '') || this.hasPlaceholders(combined.ringkasan || '') || this.hasPlaceholders(combined.judul || '')) {
        throw new Error('Artikel tidak dapat diterbitkan karena masih mengandung placeholder [ISI: ...]');
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('news_articles')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) {
          const updatedArt = data as NewsArticle;
          const current = this.getLocalArticles();
          const list = current.map((item) => (item.id === id ? updatedArt : item));
          this.saveLocalArticles(list);
          return updatedArt;
        }
      } catch (err) {
        console.warn('Supabase update news error:', err);
      }
    }

    const current = this.getLocalArticles();
    let updatedItem: NewsArticle | null = null;
    const list = current.map((item) => {
      if (item.id === id) {
        updatedItem = { ...item, ...updates };
        return updatedItem;
      }
      return item;
    });
    this.saveLocalArticles(list);
    if (!updatedItem) throw new Error('Article not found');
    return updatedItem;
  }

  /**
   * Hapus Artikel
   */
  async deleteArticle(id: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.from('news_articles').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase delete news error:', err);
      }
    }

    const current = this.getLocalArticles();
    const filtered = current.filter((item) => item.id !== id);
    this.saveLocalArticles(filtered);
    return true;
  }

  /**
   * Utilitas: Deteksi Placeholder '[ISI:'
   */
  hasPlaceholders(text: string = ''): boolean {
    return text.includes('[ISI:');
  }

  /**
   * Utilitas: Ambil daftar semua placeholder dalam artikel
   */
  scanPlaceholders(article: Partial<NewsArticle>): string[] {
    const combined = `${article.judul || ''} ${article.ringkasan || ''} ${article.konten || ''} ${article.lokasi || ''}`;
    const regex = /\[ISI:[^\]]*\]/g;
    const matches = combined.match(regex);
    return matches ? Array.from(new Set(matches)) : [];
  }
}

export const newsService = new NewsService();
