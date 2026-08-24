import { getSupabaseClient } from '../lib/supabase';

export interface ProjectImpact {
  label: string;
  nilai: string;
}

export interface ProjectExposure {
  id: string;
  judul: string;
  tagline: string;
  fotoGaleri: string[];
  badge?: string;
  konteks: string;
  rantaiNilai: string[];
  dampak: ProjectImpact[];
  penutup: string;
}

export interface ProjectUpdate {
  id: string;
  project_id: string;
  judul: string;
  narasi: string;
  foto_url?: string | null;
  tanggal: string;
  dibuat_oleh?: string | null;
  created_at?: string;
}

export const PROJECT_EXPOSURES: ProjectExposure[] = [
  {
    id: 'perikanan-ambon',
    judul: 'Dari Laut Banda, Menghidupi Ekonomi Umat',
    tagline: 'Perikanan Ambon',
    fotoGaleri: [
      '/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
      '/assets/portfolio/perikanan-tuna-ambon.jpg',
    ],
    konteks:
      'Perairan Ambon dan Laut Banda dikenal sebagai salah satu kawasan tangkap ikan pelagis terbaik di Indonesia Timur. Di sinilah KOPSIM Mandiri membangun kemitraan strategis dengan lebih dari 11.000 nelayan di Kepulauan Maluku untuk menyalurkan hasil laut segar berkualitas ekspor.',
    rantaiNilai: [
      'Lebih dari 11.000 Nelayan Maluku Menangkap',
      'Sortir & Kontrol Kualitas di Dermaga',
      'Distribusi Rantai Dingin (Segar/Beku)',
      'Mitra Pasar & Ekspor',
    ],
    dampak: [
      { label: 'Nelayan Binaan', nilai: '11.000+ Nelayan' },
      { label: 'Wilayah Kemitraan', nilai: 'Kepulauan Maluku' },
      { label: 'Komoditas Utama', nilai: 'Ikan Layang & Tuna' },
    ],
    penutup:
      'Setiap kilogram ikan yang tersalurkan bukan sekadar transaksi dagang — ini soal keberlanjutan hidup nelayan binaan kami.',
  },
  {
    id: 'pertanian-tapioka',
    judul: 'Dari Kebun ke Pabrik: Nilai Tambah untuk Petani',
    tagline: 'Pertanian & Industri Olahan',
    fotoGaleri: [
      '/assets/portfolio/pertanian-jagung-wortel-cabe.jpg',
      '/assets/portfolio/pertanian-panen-singkong.jpg',
      '/assets/portfolio/industri-tepung-tapioka.jpg',
    ],
    badge: 'Produk Olahan',
    konteks:
      'KOPSIM Mandiri mendampingi 1.000+ petani binaan yang tersebar di Jawa Barat dalam mengelola lahan produktif untuk jagung, wortel, cabai, dan singkong. Yang membedakan program ini: singkong hasil panen dihilirisasi menjadi tepung tapioka berkualitas tinggi.',
    rantaiNilai: [
      '1.000+ Petani Jawa Barat Menanam',
      'Panen Jagung, Wortel, Cabe & Singkong',
      'Singkong Diolah di Unit Pengolahan Koperasi',
      'Tepung Tapioka Siap Distribusi & Pasar',
    ],
    dampak: [
      { label: 'Petani Binaan', nilai: '1.000+ Petani' },
      { label: 'Sebaran Wilayah', nilai: 'Tersebar di Jawa Barat' },
      { label: 'Komoditas Unggulan', nilai: 'Jagung, Wortel, Cabe & Singkong' },
    ],
    penutup:
      'Nilai tambah dari pengolahan kembali ke petani — bukan hanya ke tengkulak.',
  },
];

export const PROJECT_UPDATES_SQL_DDL = `-- =========================================================
-- TABEL: public.project_updates (Kanal Update Perkembangan Proyek)
-- =========================================================

CREATE TABLE IF NOT EXISTS public.project_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  judul TEXT NOT NULL,
  narasi TEXT NOT NULL,
  foto_url TEXT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  dibuat_oleh UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing untuk query cepat berdasarkan project_id dan tanggal
CREATE INDEX IF NOT EXISTS idx_project_updates_project_id ON public.project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_tanggal ON public.project_updates(tanggal DESC);

-- RLS (Row Level Security)
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- Policy 1: Publik (Siapa saja termasuk anon) dapat membaca timeline update
CREATE POLICY "Public Read Access for Project Updates"
  ON public.project_updates
  FOR SELECT
  USING (true);

-- Policy 2: Admin dapat menambah, mengubah, dan menghapus update proyek
CREATE POLICY "Admin Full Access for Project Updates"
  ON public.project_updates
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
`;

const STORAGE_UPDATES_KEY = 'kopsim_project_updates_cache';

const INITIAL_DEMO_UPDATES: ProjectUpdate[] = [
  {
    id: 'upd-001',
    project_id: 'perikanan-ambon',
    judul: 'Uji Coba Pengiriman Perdana Ikan Layang Segar ke Sentra Pengolahan',
    narasi:
      'Tim kemitraan maritim KOPSIM Mandiri mendampingi kelompok nelayan Teluk Ambon melakukan penimbangan dan uji rantai dingin cold box untuk pengiriman batch pertama ikan layang dan tuna sirip kuning.',
    foto_url: '/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  },
  {
    id: 'upd-002',
    project_id: 'pertanian-tapioka',
    judul: 'Optimalisasi Mesin Pemarut & Pengering Tepung Tapioka Skala UMKM',
    narasi:
      'Unit pengolahan singkong koperasi menyelesaikan kalibrasi mesin ekstraksi pati singkong lokal, memastikan mutu tepung tapioka memenuhi standar kadar air < 12% dan warna putih alami tanpa pemutih sintetis.',
    foto_url: '/assets/portfolio/industri-tepung-tapioka.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString(),
  },
];

export const projectExposureService = {
  getExposures(): ProjectExposure[] {
    return PROJECT_EXPOSURES;
  },

  getExposureById(id: string): ProjectExposure | undefined {
    return PROJECT_EXPOSURES.find((p) => p.id === id);
  },

  getStoredUpdates(): ProjectUpdate[] {
    try {
      const raw = localStorage.getItem(STORAGE_UPDATES_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse local project updates cache:', e);
    }
    localStorage.setItem(STORAGE_UPDATES_KEY, JSON.stringify(INITIAL_DEMO_UPDATES));
    return INITIAL_DEMO_UPDATES;
  },

  async getProjectUpdates(projectId?: string): Promise<ProjectUpdate[]> {
    const client = getSupabaseClient();
    if (client) {
      try {
        let query = client
          .from('project_updates')
          .select('*')
          .order('tanggal', { ascending: false });

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            project_id: d.project_id,
            judul: d.judul,
            narasi: d.narasi,
            foto_url: d.foto_url,
            tanggal: d.tanggal,
            dibuat_oleh: d.dibuat_oleh,
            created_at: d.created_at,
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch project updates from Supabase, using local cache:', err);
      }
    }

    const local = this.getStoredUpdates();
    if (projectId) {
      return local.filter((u) => u.project_id === projectId);
    }
    return local;
  },

  async createProjectUpdate(payload: {
    project_id: string;
    judul: string;
    narasi: string;
    foto_url?: string | null;
    tanggal: string;
    dibuat_oleh?: string | null;
  }): Promise<{ success: boolean; data: ProjectUpdate; message: string }> {
    const cleanProjectId = (payload.project_id || '').trim();
    const cleanJudul = (payload.judul || '').trim();
    const cleanNarasi = (payload.narasi || '').trim();

    if (!cleanProjectId) throw new Error('Pilih proyek yang valid.');
    if (!cleanJudul) throw new Error('Judul update wajib diisi.');
    if (!cleanNarasi) throw new Error('Narasi update wajib diisi.');

    const newId = `upd-${Date.now().toString(36)}`;
    const nowIso = new Date().toISOString();

    const record: ProjectUpdate = {
      id: newId,
      project_id: cleanProjectId,
      judul: cleanJudul,
      narasi: cleanNarasi,
      foto_url: payload.foto_url || null,
      tanggal: payload.tanggal || nowIso.split('T')[0],
      dibuat_oleh: payload.dibuat_oleh || null,
      created_at: nowIso,
    };

    const client = getSupabaseClient();
    let savedToSupabase = false;

    if (client) {
      try {
        const { data, error } = await client
          .from('project_updates')
          .insert({
            project_id: record.project_id,
            judul: record.judul,
            narasi: record.narasi,
            foto_url: record.foto_url,
            tanggal: record.tanggal,
            dibuat_oleh: record.dibuat_oleh,
          })
          .select();

        if (!error && data && data.length > 0) {
          record.id = data[0].id;
          record.created_at = data[0].created_at;
          savedToSupabase = true;
        } else if (error) {
          console.warn('Supabase project_updates insert warning:', error.message);
        }
      } catch (err) {
        console.warn('Supabase project_updates insert exception:', err);
      }
    }

    // Update local cache
    const current = this.getStoredUpdates();
    const updatedList = [record, ...current];
    localStorage.setItem(STORAGE_UPDATES_KEY, JSON.stringify(updatedList));

    return {
      success: true,
      data: record,
      message: savedToSupabase
        ? 'Update proyek berhasil diposting dan tersimpan di database Supabase.'
        : 'Update proyek berhasil diposting ke timeline lokal.',
    };
  },

  async deleteProjectUpdate(updateId: string): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('project_updates').delete().eq('id', updateId);
      } catch (err) {
        console.warn('Supabase delete project_update error:', err);
      }
    }

    const current = this.getStoredUpdates();
    const filtered = current.filter((u) => u.id !== updateId);
    localStorage.setItem(STORAGE_UPDATES_KEY, JSON.stringify(filtered));

    return {
      success: true,
      message: 'Update proyek berhasil dihapus.',
    };
  },
};
