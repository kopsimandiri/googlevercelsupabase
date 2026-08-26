import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  newsService,
  NEWS_ARTICLES_SQL_DDL,
} from '../../services/newsService';
import {
  NewsArticle,
  NewsCategory,
  NewsStatus,
  NEWS_CATEGORIES,
} from '../../types/news';
import { formatDateIndo } from '../../utils/formatters';
import {
  Newspaper,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  ExternalLink,
  Upload,
  Calendar,
  MapPin,
  FolderGit2,
  Eye,
  Sparkles,
  Database,
  Copy,
  Check,
  X,
  Lock,
  RefreshCw,
  Info,
} from 'lucide-react';

const PRESET_ASSETS = [
  {
    name: 'Ikan Layang Ambon',
    url: '/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
    kategori: 'perikanan',
  },
  {
    name: 'Tuna Ambon',
    url: '/assets/portfolio/perikanan-tuna-ambon.jpg',
    kategori: 'perikanan',
  },
  {
    name: 'Panen Singkong',
    url: '/assets/portfolio/pertanian-panen-singkong.jpg',
    kategori: 'pertanian',
  },
  {
    name: 'Jagung, Wortel, Cabe',
    url: '/assets/portfolio/pertanian-jagung-wortel-cabe.jpg',
    kategori: 'pertanian',
  },
  {
    name: 'Industri Tepung Tapioka',
    url: '/assets/portfolio/industri-tepung-tapioka.jpg',
    kategori: 'industri',
  },
];

export const NewsAdminModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'draft' | 'terbit'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [formData, setFormData] = useState<{
    kategori: NewsCategory;
    project_id: string;
    judul: string;
    ringkasan: string;
    konten: string;
    lokasi: string;
    foto_url: string;
    tanggal: string;
    status: NewsStatus;
  }>({
    kategori: 'kemitraan',
    project_id: '',
    judul: '',
    ringkasan: '',
    konten: '',
    lokasi: '',
    foto_url: '/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
    tanggal: new Date().toISOString().split('T')[0],
    status: 'draft',
  });

  // SQL Script Viewer Modal
  const [isSqlModalOpen, setIsSqlModalOpen] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Load articles
  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const data = await newsService.getAllArticles();
      setArticles(data);
    } catch (err) {
      console.error('Error fetching articles:', err);
      showToast('Gagal memuat artikel dari database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  // Access check: Only ADMIN
  if (role !== 'ADMIN') {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 shadow-sm max-w-lg mx-auto">
        <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-3">
          <Lock className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-stone-900">Akses Dibatasi</h3>
        <p className="text-sm text-stone-600 mt-1">
          Halaman Pengelolaan Berita (CMS) hanya dapat diakses oleh akun dengan hak akses **ADMIN**.
        </p>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingArticle(null);
    setFormData({
      kategori: 'kemitraan',
      project_id: '',
      judul: '',
      ringkasan: '',
      konten: '',
      lokasi: '',
      foto_url: '/assets/portfolio/perikanan-ikan-layang-ambon.jpg',
      tanggal: new Date().toISOString().split('T')[0],
      status: 'draft',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setFormData({
      kategori: article.kategori,
      project_id: article.project_id || '',
      judul: article.judul,
      ringkasan: article.ringkasan,
      konten: article.konten,
      lokasi: article.lokasi || '',
      foto_url: article.foto_url || '',
      tanggal: article.tanggal,
      status: article.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, judul: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus artikel "${judul}"?`)) {
      try {
        await newsService.deleteArticle(id);
        showToast('Artikel berhasil dihapus.', 'success');
        fetchArticles();
      } catch (err) {
        showToast('Gagal menghapus artikel.', 'error');
      }
    }
  };

  // Validasi Placeholder Kritis
  const foundPlaceholders = newsService.scanPlaceholders(formData);
  const hasPlaceholders = foundPlaceholders.length > 0;

  const handleSave = async (targetStatus: NewsStatus) => {
    if (!formData.judul.trim()) {
      showToast('Judul artikel wajib diisi.', 'warning');
      return;
    }
    if (!formData.ringkasan.trim()) {
      showToast('Ringkasan artikel wajib diisi.', 'warning');
      return;
    }
    if (!formData.konten.trim()) {
      showToast('Konten artikel wajib diisi.', 'warning');
      return;
    }
    if (formData.kategori === 'update_proyek' && !formData.project_id.trim()) {
      showToast('Kategori Update Proyek wajib mengisi Project ID.', 'warning');
      return;
    }

    // Strict validation on publishing
    if (targetStatus === 'terbit' && hasPlaceholders) {
      showToast(
        `DITOLAK: Masih terdapat ${foundPlaceholders.length} placeholder [ISI: ...] yang belum dilengkapi!`,
        'error',
        'Gagal Menerbitkan'
      );
      return;
    }

    try {
      const payload = {
        ...formData,
        project_id: formData.project_id.trim() || null,
        lokasi: formData.lokasi.trim() || null,
        foto_url: formData.foto_url.trim() || null,
        status: targetStatus,
      };

      if (editingArticle) {
        await newsService.updateArticle(editingArticle.id, payload);
        showToast(
          targetStatus === 'terbit'
            ? 'Artikel berhasil diterbitkan ke portal publik!'
            : 'Draft artikel berhasil diperbarui.',
          'success'
        );
      } else {
        await newsService.createArticle(payload);
        showToast(
          targetStatus === 'terbit'
            ? 'Artikel baru berhasil diterbitkan!'
            : 'Draft artikel baru berhasil disimpan.',
          'success'
        );
      }

      setIsModalOpen(false);
      fetchArticles();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Terjadi kesalahan saat menyimpan artikel.', 'error');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(NEWS_ARTICLES_SQL_DDL);
    setCopiedSql(true);
    showToast('Skema SQL & Seed berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  // Filtered list
  const filteredArticles = articles.filter((a) => {
    const matchSearch =
      a.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.ringkasan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.lokasi && a.lokasi.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchCat = categoryFilter === 'ALL' || a.kategori === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const draftCount = articles.filter((a) => a.status === 'draft').length;
  const terbitCount = articles.filter((a) => a.status === 'terbit').length;
  const placeholderPendingCount = articles.filter(
    (a) => newsService.scanPlaceholders(a).length > 0
  ).length;

  return (
    <div className="space-y-6" id="news-admin-root">
      {/* Top Banner & Action Header */}
      <div className="p-6 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 rounded-2xl text-white shadow-md border border-emerald-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <div className="flex items-center gap-2">
            <Badge variant="gold" size="sm">
              CMS ADMIN PORTAL
            </Badge>
            <span className="text-xs text-emerald-200">
              Berdasarkan Formula Narasi Baku KOPSIM
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-amber-300">
            Pengelolaan Kanal Berita & Warta Sektor Riil
          </h2>
          <p className="text-xs text-emerald-100/90 leading-relaxed">
            Kelola draft, perbarui placeholder narasi `[ISI: ...]`, dan publikasikan warta kemitraan, inisiatif program, dampak ekonomi, serta update panen proyek strategis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="bg-emerald-900/60 text-white border-emerald-700 hover:bg-emerald-800"
            onClick={() => setIsSqlModalOpen(true)}
            leftIcon={<Database className="w-4 h-4 text-amber-300" />}
          >
            Skema SQL & Seed
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={handleOpenCreate}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Tulis Artikel Baru
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-stone-400 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
                Total Draft (Tertunda)
              </span>
              <span className="text-2xl font-bold font-mono text-stone-900 mt-1 block">
                {draftCount} <span className="text-xs font-normal text-stone-500">Artikel</span>
              </span>
            </div>
            <div className="p-3 bg-stone-100 text-stone-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-600 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
                Artikel Terbit (Publik)
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-950 mt-1 block">
                {terbitCount} <span className="text-xs font-normal text-emerald-700">Tayang</span>
              </span>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-500 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                Draft Mengandung Placeholder
              </span>
              <span className="text-2xl font-bold font-mono text-amber-950 mt-1 block">
                {placeholderPendingCount}{' '}
                <span className="text-xs font-normal text-amber-700">Perlu Fakta Asli</span>
              </span>
            </div>
            <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-white">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari artikel berdasarkan judul, ringkasan, atau lokasi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-700 bg-stone-50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
              {(['ALL', 'draft', 'terbit'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-all ${
                    statusFilter === st
                      ? 'bg-white text-emerald-950 font-bold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {st === 'ALL' ? 'Semua Status' : st === 'draft' ? 'Draft' : 'Terbit'}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs py-1.5 px-3 rounded-lg border border-stone-300 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="kemitraan">Kemitraan</option>
              <option value="program">Program</option>
              <option value="dampak">Dampak</option>
              <option value="update_proyek">Update Proyek</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchArticles}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {/* Article List Table / Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
            <RefreshCw className="w-6 h-6 text-emerald-700 animate-spin mx-auto mb-2" />
            <p className="text-xs text-stone-600 font-medium">Memuat data artikel berita...</p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-stone-200">
            <Newspaper className="w-10 h-10 text-stone-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-stone-800">Tidak ada artikel yang cocok</h4>
            <p className="text-xs text-stone-500 mt-1">
              Coba sesuaikan kata kunci pencarian atau filter status/kategori.
            </p>
          </div>
        ) : (
          filteredArticles.map((art) => {
            const catMeta = NEWS_CATEGORIES[art.kategori] || NEWS_CATEGORIES.kemitraan;
            const phs = newsService.scanPlaceholders(art);
            const isDraft = art.status === 'draft';

            return (
              <div
                key={art.id}
                className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-700 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    {isDraft ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
                        Draft
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        Terbit
                      </span>
                    )}

                    {/* Category Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${catMeta.badgeClass}`}>
                      {catMeta.label}
                    </span>

                    {/* Project ID Tag */}
                    {art.project_id && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                        <FolderGit2 className="w-3 h-3" />
                        {art.project_id}
                      </span>
                    )}

                    {/* Date & Location */}
                    <span className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-stone-400" />
                      {formatDateIndo(art.tanggal)}
                    </span>

                    {art.lokasi && (
                      <span className="text-[11px] text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-stone-400" />
                        {art.lokasi}
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-stone-900 font-serif">
                    {art.judul}
                  </h3>

                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {art.ringkasan}
                  </p>

                  {/* Warning Placeholder Notification */}
                  {phs.length > 0 && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>
                        Terdapat <strong>{phs.length} placeholder</strong> belum diisi:
                        <span className="font-mono ml-1 text-amber-800">
                          {phs.slice(0, 3).join(', ')}
                          {phs.length > 3 ? ' ...' : ''}
                        </span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(art)}
                    leftIcon={<Edit className="w-3.5 h-3.5" />}
                  >
                    Edit & Lengkapi
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 p-2"
                    onClick={() => handleDelete(art.id, art.judul)}
                    aria-label="Hapus artikel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit / Create Article Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-3xl w-full max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-stone-900 font-serif">
                  {editingArticle ? 'Edit & Lengkapi Artikel' : 'Tulis Artikel Berita Baru'}
                </h3>
                <p className="text-xs text-stone-500">
                  Formula narasi baku KOPSIM: Lead, Konteks, Kutipan, Penutup
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Placeholder Detection Alert */}
              {hasPlaceholders ? (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Terdeteksi {foundPlaceholders.length} Placeholder [ISI: ...]</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Sesuai <strong>Panduan Narasi Berita KOPSIM</strong>, tombol <strong>"Terbitkan" dinonaktifkan</strong> selama masih ada placeholder yang belum diganti dengan data asli yang terverifikasi. Anda tetap dapat menyimpannya sebagai <strong>Draft</strong>.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {foundPlaceholders.map((ph, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-amber-200/80 text-amber-950 font-mono text-[10px] rounded border border-amber-400"
                      >
                        {ph}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-medium text-emerald-900">
                    Semua placeholder telah lengkap & siap untuk diterbitkan secara publik.
                  </span>
                </div>
              )}

              {/* Grid 2 Kolom: Kategori & Project ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Kategori Berita <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.kategori}
                    onChange={(e) =>
                      setFormData({ ...formData, kategori: e.target.value as NewsCategory })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white"
                  >
                    <option value="kemitraan">Kemitraan (Kerja sama eksternal/pemerintah/MOU)</option>
                    <option value="program">Program (Inisiatif internal pendampingan)</option>
                    <option value="dampak">Dampak (Cerita kemaslahatan di masyarakat)</option>
                    <option value="update_proyek">Update Proyek (Laporan panen/tangkapan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Project ID {formData.kategori === 'update_proyek' && <span className="text-red-500">* (Wajib)</span>}
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white"
                  >
                    <option value="">-- Tidak Terhubung ke Proyek Tertentu --</option>
                    <option value="perikanan-ambon">perikanan-ambon (Perikanan Laut Banda)</option>
                    <option value="pertanian-tapioka">pertanian-tapioka (Pertanian & Tapioka)</option>
                    <option value="PRJ-01">PRJ-01 (Kampung Haji)</option>
                    <option value="PRJ-02">PRJ-02 (Trading Ikan)</option>
                    <option value="PRJ-03">PRJ-03 (Garam Rakyat)</option>
                    <option value="PRJ-04">PRJ-04 (Pertanian Terpadu)</option>
                    <option value="PRJ-05">PRJ-05 (Plywood Industri)</option>
                    <option value="PRJ-06">PRJ-06 (Sawit Merah RPO)</option>
                    <option value="PRJ-07">PRJ-07 (Supplier MBG)</option>
                    <option value="PRJ-08">PRJ-08 (Meatshop Halal)</option>
                  </select>
                </div>
              </div>

              {/* Judul Artikel */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Judul Artikel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sinergi Pemerintah dan Syarikat Islam Bangun Ekonomi Rakyat"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white font-medium"
                />
              </div>

              {/* Ringkasan (Lead) */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Ringkasan / Lead (Maks. ~150 karakter) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="1-2 kalimat padat menjawab Apa-Kapan-Di mana-Siapa..."
                  value={formData.ringkasan}
                  onChange={(e) => setFormData({ ...formData, ringkasan: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white"
                />
                <span className="text-[10px] text-stone-400">
                  {formData.ringkasan.length} karakter
                </span>
              </div>

              {/* Konten Lengkap */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Konten Lengkap Artikel (3–5 Paragraf) <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={8}
                  placeholder="Isi narasi artikel... (gunakan [ISI: ...] untuk data yang belum terkonfirmasi)"
                  value={formData.konten}
                  onChange={(e) => setFormData({ ...formData, konten: e.target.value })}
                  className="w-full p-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white font-sans leading-relaxed"
                />
              </div>

              {/* Grid 3 Kolom: Tanggal, Lokasi, Foto Asset */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={formData.tanggal}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Lokasi (Opsional)</label>
                  <input
                    type="text"
                    placeholder="Contoh: Ambon, Maluku"
                    value={formData.lokasi}
                    onChange={(e) => setFormData({ ...formData, lokasi: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">URL Foto Sampul</label>
                  <input
                    type="text"
                    placeholder="/assets/portfolio/..."
                    value={formData.foto_url}
                    onChange={(e) => setFormData({ ...formData, foto_url: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-emerald-700 bg-white"
                  />
                </div>
              </div>

              {/* Preset Image Picker */}
              <div className="space-y-1.5">
                <span className="block font-bold text-stone-700">Pilih Foto Aset Tersedia:</span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ASSETS.map((asset, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFormData({ ...formData, foto_url: asset.url })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] border transition-all flex items-center gap-1.5 ${
                        formData.foto_url === asset.url
                          ? 'bg-emerald-800 text-white border-emerald-900 font-bold'
                          : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'
                      }`}
                    >
                      <span>{asset.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer: DISTINCT ACTIONS & VALIDATION */}
            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Batal
              </Button>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                {/* 1. Tombol Simpan Draft (Selalu Aktif) */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSave('draft')}
                  leftIcon={<FileText className="w-4 h-4" />}
                >
                  Simpan Draft
                </Button>

                {/* 2. Tombol Terbitkan (DIKUNCI / DISABLED JIKA ADA [ISI:) */}
                <div className="relative group">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={hasPlaceholders}
                    onClick={() => handleSave('terbit')}
                    className={
                      hasPlaceholders
                        ? 'opacity-50 cursor-not-allowed bg-stone-400 hover:bg-stone-400'
                        : 'bg-emerald-800 hover:bg-emerald-700 text-white'
                    }
                    leftIcon={
                      hasPlaceholders ? (
                        <Lock className="w-4 h-4 text-stone-200" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                      )
                    }
                  >
                    Terbitkan Sekarang
                  </Button>

                  {/* Tooltip on disabled */}
                  {hasPlaceholders && (
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-2 bg-stone-900 text-white text-[10px] rounded-lg shadow-lg">
                      Tombol ini terkunci karena masih ada <strong>{foundPlaceholders.length} placeholder [ISI: ...]</strong>. Lengkapi semua data asli sebelum menerbitkan.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Script Viewer Modal */}
      {isSqlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full max-h-[85vh] flex flex-col">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-800" />
                <h3 className="text-base font-bold text-stone-900 font-serif">
                  Skema SQL & 6 Draft Seed (Supabase)
                </h3>
              </div>
              <button
                onClick={() => setIsSqlModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              <p className="text-xs text-stone-600">
                Jalankan script SQL berikut pada <strong>Supabase SQL Editor</strong> untuk membuat tabel `public.news_articles`, konfigurasi RLS, dan memasukkan 6 draft artikel awal.
              </p>
              <pre className="p-4 bg-stone-900 text-emerald-300 text-[11px] font-mono rounded-xl overflow-x-auto max-h-96 leading-relaxed">
                {NEWS_ARTICLES_SQL_DDL}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Tabel: `public.news_articles` • RLS: Aktif
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopySql}
                leftIcon={
                  copiedSql ? (
                    <Check className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
              >
                {copiedSql ? 'Tersalin!' : 'Salin SQL Lengkap'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
