import React, { useState, useEffect } from 'react';
import { projectService, ProjectDetailInfo } from '../../services/projectService';
import { productService, ProductItem } from '../../services/productService';
import {
  projectExposureService,
  ProjectExposure,
  ProjectUpdate,
} from '../../services/projectExposureService';
import { ProjectSummary, TransactionRecord } from '../../types/database';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import {
  FolderGit2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Eye,
  Package,
  Layers,
  MapPin,
  User,
  ArrowRight,
  Send,
  Trash2,
  PlusCircle,
  Calendar,
  Image as ImageIcon,
  CheckCircle2,
  FileEdit,
} from 'lucide-react';

export const ProjectModule: React.FC = () => {
  const { user, role } = useAuth();
  const canDelete = role === 'ADMIN';
  const { showToast } = useNotification();

  const [projects, setProjects] = useState<Array<ProjectDetailInfo & ProjectSummary>>([]);
  const [selectedProject, setSelectedProject] = useState<(ProjectDetailInfo & ProjectSummary) | null>(null);
  const [projectTrx, setProjectTrx] = useState<TransactionRecord[]>([]);
  const [projectProducts, setProjectProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);

  // Admin Project Updates State
  const exposures = projectExposureService.getExposures();
  const [updatesList, setUpdatesList] = useState<ProjectUpdate[]>([]);
  const [selectedExposureId, setSelectedExposureId] = useState<string>(exposures[0]?.id || 'perikanan-ambon');
  const [updateJudul, setUpdateJudul] = useState<string>('');
  const [updateNarasi, setUpdateNarasi] = useState<string>('');
  const [updateFotoUrl, setUpdateFotoUrl] = useState<string>('');
  const [updateTanggal, setUpdateTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState<boolean>(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [data, updates] = await Promise.all([
        projectService.getProjectsWithFinancials(),
        projectExposureService.getProjectUpdates(),
      ]);
      setProjects(data);
      setUpdatesList(updates);
      if (data.length > 0) {
        setSelectedProject(data[0]);
        const [trx, prods] = await Promise.all([
          projectService.getProjectTransactions(data[0].name),
          productService.getProductsByProject(data[0].name),
        ]);
        setProjectTrx(trx);
        setProjectProducts(prods);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectProject = async (p: ProjectDetailInfo & ProjectSummary) => {
    setSelectedProject(p);
    setIsLoadingProducts(true);
    try {
      const [trx, prods] = await Promise.all([
        projectService.getProjectTransactions(p.name),
        productService.getProductsByProject(p.name),
      ]);
      setProjectTrx(trx);
      setProjectProducts(prods);
    } catch (err) {
      console.warn('Error loading project details & products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateJudul.trim() || !updateNarasi.trim()) {
      showToast('Judul dan narasi update wajib diisi.', 'error');
      return;
    }

    setIsSubmittingUpdate(true);
    try {
      const res = await projectExposureService.createProjectUpdate({
        project_id: selectedExposureId,
        judul: updateJudul.trim(),
        narasi: updateNarasi.trim(),
        foto_url: updateFotoUrl.trim() || null,
        tanggal: updateTanggal,
        dibuat_oleh: user?.id || null,
      });

      showToast(res.message, 'success', 'Update Terposting');
      setUpdateJudul('');
      setUpdateNarasi('');
      setUpdateFotoUrl('');
      setUpdateTanggal(new Date().toISOString().split('T')[0]);

      // Reload updates
      const refreshed = await projectExposureService.getProjectUpdates();
      setUpdatesList(refreshed);
    } catch (err: any) {
      showToast(err.message || 'Gagal memposting update proyek.', 'error');
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (id: string) => {
    if (!canDelete) {
      showToast('Otorisasi Ditolak: Hanya Admin yang diizinkan menghapus data update proyek.', 'error');
      return;
    }
    setIsDeletingId(id);
    try {
      const res = await projectExposureService.deleteProjectUpdate(id);
      showToast(res.message, 'success');
      const refreshed = await projectExposureService.getProjectUpdates();
      setUpdatesList(refreshed);
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus update proyek.', 'error');
    } finally {
      setIsDeletingId(null);
    }
  };

  if (isLoading && projects.length === 0) {
    return <LoadingState message="Memuat 8 Proyek Strategis Sektor Riil..." fullHeight />;
  }

  return (
    <div className="space-y-6" id="project-module-root">
      {/* 8 Project Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {projects.map((p) => {
          const isSelected = selectedProject?.name === p.name;
          return (
            <button
              key={p.name}
              onClick={() => handleSelectProject(p)}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-emerald-950 text-white border-amber-400 shadow-md ring-2 ring-amber-400/50'
                  : 'bg-white text-stone-800 border-stone-200 hover:border-emerald-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-amber-300' : 'text-emerald-800'}`}>
                  {p.code}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-stone-100 text-stone-600'}`}>
                  {p.status}
                </span>
              </div>
              <h4 className="text-xs font-bold truncate">{p.name}</h4>
              <p className={`text-[10px] mt-1 truncate ${isSelected ? 'text-emerald-200' : 'text-stone-500'}`}>
                Saldo: {formatRupiah(p.saldo)}
              </p>
            </button>
          );
        })}
      </div>

      {/* Selected Project Overview Card */}
      {selectedProject && (
        <div className="space-y-6">
          <Card
            title={`Proyek ${selectedProject.code} — ${selectedProject.name}`}
            subtitle={selectedProject.category}
            action={
              <Badge variant={selectedProject.saldo >= 0 ? 'success' : 'danger'} size="sm">
                Status: {selectedProject.status}
              </Badge>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-stone-600">
                  <User className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Lead Divisi:</span>
                </div>
                <h4 className="text-xs font-bold text-stone-900">{selectedProject.lead}</h4>

                <div className="flex items-center gap-1.5 text-xs text-stone-600 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-800" />
                  <span>Lokasi Sentra:</span>
                </div>
                <p className="text-xs font-medium text-stone-800">{selectedProject.location}</p>
              </div>

              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-stone-600">
                  <Package className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Komoditas / SKU Utama:</span>
                </div>
                <h4 className="text-xs font-bold text-stone-900">{selectedProject.defaultSku}</h4>

                <div className="flex items-center gap-1.5 text-xs text-stone-600 pt-1">
                  <span>Harga Acuan:</span>
                </div>
                <p className="text-xs font-bold text-emerald-950 font-serif">
                  {formatRupiah(selectedProject.defaultPrice)} / {selectedProject.unit}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-emerald-900 font-mono">
                  SALDO BERSIH PROJECT
                </span>
                <p className="text-xl font-bold text-emerald-950 font-serif">
                  {formatRupiah(selectedProject.saldo)}
                </p>
                <div className="text-[11px] space-y-0.5 pt-1 text-stone-600">
                  <div>Masuk: <span className="text-emerald-700 font-semibold">{formatRupiah(selectedProject.totalMasuk)}</span></div>
                  <div>Keluar: <span className="text-rose-700 font-semibold">{formatRupiah(selectedProject.totalKeluar)}</span></div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700">
              <span className="font-bold text-emerald-950 block mb-1">Deskripsi & Ruang Lingkup Proyek:</span>
              <p className="leading-relaxed">{selectedProject.description}</p>
            </div>
          </Card>

          {/* Daftar Komoditas & Produk Sektor Riil (Supabase public.products) */}
          <Card
            title={`Katalog Komoditas & SKU — ${selectedProject.name}`}
            subtitle={`Data komoditas terdaftar di Supabase (public.products) dengan relasi group_name = '${selectedProject.name}'`}
            action={
              <Badge variant="neutral" size="sm">
                {projectProducts.length} SKU Terdaftar
              </Badge>
            }
          >
            {projectProducts.length === 0 ? (
              <EmptyState
                title="Belum Ada Komoditas Khusus di Database"
                description={`Komoditas untuk sektor ${selectedProject.name} menggunakan acuan bawaan.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Kode SKU</th>
                      <th className="py-2.5 px-3">Nama Komoditas / Produk</th>
                      <th className="py-2.5 px-3">Sub-Kategori</th>
                      <th className="py-2.5 px-3">Grade & Kemasan</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Harga Acuan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {projectProducts.map((p) => (
                      <tr key={p.sku_code || p.id} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-950">{p.sku_code}</td>
                        <td className="py-2.5 px-3 font-medium text-stone-900">{p.sku_name}</td>
                        <td className="py-2.5 px-3 text-stone-600">{p.subgroup || p.brand || '-'}</td>
                        <td className="py-2.5 px-3 text-stone-600">
                          <span className="font-semibold text-stone-800">{p.grade}</span> • {p.packaging}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Badge variant={p.availability === 'Tersedia' ? 'success' : 'warning'} size="sm">
                            {p.availability}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-950 font-serif">
                          {formatRupiah(p.defaultPrice)} / {p.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Project Transactions History */}
          <Card
            title={`Buku Transaksi — ${selectedProject.name}`}
            subtitle={`Daftar mutasi keluar-masuk dana khusus unit ${selectedProject.name}`}
          >
            {projectTrx.length === 0 ? (
              <EmptyState
                title="Belum Ada Transaksi Khusus Proyek Ini"
                description="Input transaksi penjualan atau pembelian komoditas untuk memulai pencatatan proyek."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">ID Transaksi</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Produk / SKU</th>
                      <th className="py-2.5 px-3 text-center">QTY</th>
                      <th className="py-2.5 px-3 text-center">Jenis</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {projectTrx.map((t) => (
                      <tr key={t.id} className="hover:bg-stone-50">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-950">{t.id}</td>
                        <td className="py-3 px-3 text-stone-600">{formatDateIndo(t.tanggal)}</td>
                        <td className="py-3 px-3 text-stone-700">{t.kategori}</td>
                        <td className="py-3 px-3 font-medium text-stone-900">{t.sku_name || selectedProject.defaultSku}</td>
                        <td className="py-3 px-3 text-center font-mono">{t.qty || 1}</td>
                        <td className="py-3 px-3 text-center">
                          <Badge variant={t.jenis === 'MASUK' ? 'success' : 'danger'} size="sm">
                            {t.jenis}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-950 font-serif">
                          {formatRupiah(t.jumlah)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* SECTION ADMIN: KANAL UPDATE PROYEK STRATEGIS */}
      <div className="space-y-6 pt-4 border-t border-stone-200/80" id="admin-project-updates-section">
        <Card
          title="Kanal Update Perkembangan Proyek Strategis"
          subtitle="Publikasikan kabar terbaru, progres panen, dan hilirisasi rantai nilai ke portal publik"
          action={
            <Badge variant="gold" size="sm">
              Role: Admin Operasional
            </Badge>
          }
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Posting Update */}
            <form onSubmit={handlePostUpdate} className="lg:col-span-5 space-y-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-3.5">
                <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                  <FileEdit className="w-4 h-4 text-primary-700" />
                  <span className="font-bold text-text-dark text-xs uppercase tracking-wide">
                    Form Posting Update Baru
                  </span>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Pilih Proyek Strategis *
                  </label>
                  <select
                    value={selectedExposureId}
                    onChange={(e) => setSelectedExposureId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-hidden text-xs font-medium text-stone-900"
                  >
                    {exposures.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.tagline} — {e.judul}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Judul Perkembangan *
                  </label>
                  <input
                    type="text"
                    required
                    value={updateJudul}
                    onChange={(e) => setUpdateJudul(e.target.value)}
                    placeholder="Contoh: Pengiriman Perdana Ikan Layang ke Sentra Pengolahan"
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-hidden text-xs text-stone-900 placeholder:text-stone-400"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Tanggal Laporan *
                    </label>
                    <input
                      type="date"
                      required
                      value={updateTanggal}
                      onChange={(e) => setUpdateTanggal(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-hidden text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Pilihan Cepat Foto
                    </label>
                    <select
                      value={updateFotoUrl}
                      onChange={(e) => setUpdateFotoUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-hidden text-xs"
                    >
                      <option value="">-- Tanpa / Custom URL --</option>
                      <option value="/assets/portfolio/perikanan-ikan-layang-ambon.jpg">Ikan Layang Ambon</option>
                      <option value="/assets/portfolio/perikanan-tuna-ambon.jpg">Tuna Ambon</option>
                      <option value="/assets/portfolio/pertanian-jagung-wortel-cabe.jpg">Lahan Jagung & Cabe</option>
                      <option value="/assets/portfolio/pertanian-panen-singkong.jpg">Panen Singkong</option>
                      <option value="/assets/portfolio/industri-tepung-tapioka.jpg">Pabrik Tapioka</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    URL Foto Dokumentasi (Opsional)
                  </label>
                  <input
                    type="text"
                    value={updateFotoUrl}
                    onChange={(e) => setUpdateFotoUrl(e.target.value)}
                    placeholder="/assets/portfolio/... atau https://..."
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-hidden text-xs font-mono placeholder:text-stone-400"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Narasi Progres & Dampak *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={updateNarasi}
                    onChange={(e) => setUpdateNarasi(e.target.value)}
                    placeholder="Ceritakan progres lapangan, kapasitas panen, hasil uji mutu, atau keterlibatan anggota binaan..."
                    className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg focus:outline-hidden text-xs resize-none"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    isLoading={isSubmittingUpdate}
                    leftIcon={<Send className="w-3.5 h-3.5" />}
                    className="w-full shadow-xs"
                  >
                    Posting Update ke Publik
                  </Button>
                </div>
              </div>
            </form>

            {/* List Existing Updates */}
            <div className="lg:col-span-7 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-stone-200/60 pb-2">
                <span className="font-bold text-text-dark text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary-700" />
                  Daftar Update Aktif ({updatesList.length})
                </span>
                <span className="text-[11px] text-text-muted">
                  Tersinkronisasi dengan Portal Publik
                </span>
              </div>

              {updatesList.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200 text-stone-500">
                  Belum ada update proyek yang diposting.
                </div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {updatesList.map((item) => {
                    const matchedProj = exposures.find((e) => e.id === item.project_id);
                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-stone-50 border border-stone-200/80 hover:border-stone-300 transition-all flex flex-col sm:flex-row gap-3 justify-between items-start"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded-sm bg-accent-gold/15 text-accent-gold-dark font-bold text-[10px] font-mono">
                              {matchedProj?.tagline || item.project_id}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {formatDateIndo(item.tanggal)}
                            </span>
                          </div>
                          <h4 className="font-bold text-stone-900 text-xs leading-snug">
                            {item.judul}
                          </h4>
                          <p className="text-stone-600 text-[11px] leading-relaxed line-clamp-2">
                            {item.narasi}
                          </p>
                          {item.foto_url && (
                            <span className="text-[10px] text-primary-700 font-mono flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" />
                              {item.foto_url}
                            </span>
                          )}
                        </div>

                        {canDelete && (
                          <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-center">
                            <Button
                              variant="danger"
                              size="sm"
                              isLoading={isDeletingId === item.id}
                              onClick={() => handleDeleteUpdate(item.id)}
                              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                              className="px-2.5 py-1 text-[11px]"
                            >
                              Hapus
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
