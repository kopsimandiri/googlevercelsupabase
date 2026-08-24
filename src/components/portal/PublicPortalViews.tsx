import React, { useState, useEffect } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { ProductItem } from '../../types/database';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { projectService } from '../../services/projectService';
import {
  projectExposureService,
  ProjectExposure,
  ProjectUpdate,
} from '../../services/projectExposureService';
import { ProjectExposureCard } from './ProjectExposureCard';
import { ProjectExposureDetail } from './ProjectExposureDetail';
import {
  Package,
  Layers,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  CheckCircle,
  FileText,
  Upload,
  Download,
  Calendar,
  User,
  Users,
  Building,
  Award,
  ArrowRight,
  X,
  Lock,
  MessageCircle,
  Send,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Check,
  TrendingUp,
  FolderGit2,
  Newspaper,
  Compass,
} from 'lucide-react';

const MARKETPLACE_PRODUCTS: ProductItem[] = [
  { sku: 'IKAN-TUNA-01', name: 'Ikan Tuna Segar Grade A (Sashimi Quality)', category: 'Perikanan & Maritim', grade: 'Grade A Export', packaging: 'Vacuum Pack & Cold Chain Box', availability: 'Tersedia', moq: 50, supplyCapacity: '15 Ton / Bulan', price: 65000 },
  { sku: 'BERAS-ORG-01', name: 'Beras Organik Premium Cianjur', category: 'Pertanian Terpadu', grade: 'Super Kepala', packaging: 'Karung 5kg, 10kg, 25kg Food Grade', availability: 'Tersedia', moq: 100, supplyCapacity: '50 Ton / Bulan', price: 14000 },
  { sku: 'GARAM-IND-01', name: 'Garam Rakyat Mutu Industri Pangan (NaCl > 97%)', category: 'Garam Rakyat', grade: 'K1 Industri', packaging: 'Zak 50kg Karung Sak', availability: 'Tersedia', moq: 500, supplyCapacity: '200 Ton / Bulan', price: 4000 },
  { sku: 'RPO-HEALTH-01', name: 'Red Palm Oil (Minyak Sawit Merah)', category: 'Bio-Industri Sawit', grade: 'Food Grade Vitamin A & E', packaging: 'Jerrycan 5L & Drum 200L', availability: 'Tersedia', moq: 20, supplyCapacity: '10.000 Liter / Bulan', price: 18000 },
  { sku: 'PLYWOOD-18MM', name: 'Plywood Hardwood SVLK Certified 18mm', category: 'Manufaktur Kayu', grade: 'Export Quality BB/CC', packaging: 'Pallet Binding Standard', availability: 'Pre-Order', moq: 100, supplyCapacity: '5 Kontainer / Bulan', price: 220000 },
  { sku: 'MEAT-PRIME-01', name: 'Daging Sapi Prime Cut Halal MUI', category: 'Peternakan & Meatshop', grade: 'Prime Beef Halal', packaging: 'Thermovac Frozen Box', availability: 'Tersedia', moq: 25, supplyCapacity: '10 Ton / Bulan', price: 125000 },
];

export const PortfolioMarketplaceView: React.FC<{ onOpenRegister?: () => void }> = ({ onOpenRegister }) => {
  const { showToast } = useNotification();
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedExposure, setSelectedExposure] = useState<ProjectExposure | null>(null);
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryQty, setInquiryQty] = useState(100);
  const [inquiryNotes, setInquiryNotes] = useState('');

  const exposures = projectExposureService.getExposures();
  const [projectUpdates, setProjectUpdates] = useState<ProjectUpdate[]>([]);
  const [isLoadingUpdates, setIsLoadingUpdates] = useState<boolean>(true);

  // Statistik Real-Time dari getPortfolioData (dengan fallback statis in-memory)
  const [portfolioStats, setPortfolioStats] = useState<{
    totalProjects: number;
    totalValue: number;
    commodityCount: number;
  }>({
    totalProjects: 8,
    totalValue: 560000000,
    commodityCount: 6,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [result, updates] = await Promise.all([
          projectService.getPortfolioData(),
          projectExposureService.getProjectUpdates(),
        ]);
        if (isMounted) {
          if (result && result.stats) {
            setPortfolioStats({
              totalProjects: result.stats.totalProjects > 0 ? result.stats.totalProjects : 8,
              totalValue: result.stats.totalValue !== 0 ? result.stats.totalValue : 560000000,
              commodityCount: result.stats.commodityCount > 0 ? result.stats.commodityCount : 6,
            });
          }
          setProjectUpdates(updates.slice(0, 5));
        }
      } catch (err) {
        console.warn('Failed to load live portfolio data or updates:', err);
      } finally {
        if (isMounted) {
          setIsLoadingStats(false);
          setIsLoadingUpdates(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(
      `Permintaan pasok komoditas ${selectedProduct?.name} telah dikirim ke Tim Perdagangan KOPSIM.`,
      'success',
      'Inquiry Terkirim'
    );
    setIsInquiryOpen(false);
  };

  return (
    <div className="space-y-8" id="portfolio-marketplace-root">
      {/* Hero Banner */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 rounded-2xl text-white shadow-md border border-emerald-800">
        <div className="max-w-2xl space-y-2">
          <Badge variant="gold" size="sm">
            KATALOG SEKTOR RIIL KOPSIM
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-amber-300">
            Rantai Pasok Komoditas Unggulan & Ekosistem Halal
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
            Menyediakan komoditas agrikultur, maritim, dan peternakan berkualitas tinggi langsung dari petani, nelayan binaan, dan sentra produksi syariah berdaya saing global.
          </p>
        </div>

        {/* Live Aggregated Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 pt-5 border-t border-emerald-800/80">
          <div className="p-3.5 bg-emerald-900/60 rounded-xl border border-emerald-700/60 backdrop-blur-xs flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-300">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-emerald-200 block">Unit Strategic Projects</span>
              <span className="text-lg font-bold text-white font-mono">
                {portfolioStats.totalProjects} Unit
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-900/60 rounded-xl border border-emerald-700/60 backdrop-blur-xs flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-emerald-200 block">Nilai Perputaran Proyek</span>
              <span className="text-lg font-bold text-amber-300 font-serif">
                {formatRupiah(portfolioStats.totalValue)}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-900/60 rounded-xl border border-emerald-700/60 backdrop-blur-xs flex items-center gap-3">
            <div className="p-2 bg-amber-400/20 rounded-lg text-amber-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-emerald-200 block">Komoditas Siap Pasok</span>
              <span className="text-lg font-bold text-white font-mono">
                {portfolioStats.commodityCount} Komoditas
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: PROYEK UNGGULAN & EKSPOSUR RANTAI NILAI */}
      <div className="space-y-4" id="section-strategic-project-exposure">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent-gold" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-accent-gold-dark font-mono">
                PORTFOLIO EXPOSURE
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold font-serif text-text-dark">
              Proyek Strategis & Rantai Nilai Berkelanjutan
            </h3>
          </div>
          <p className="text-xs text-text-muted sm:max-w-md sm:text-right leading-relaxed">
            Eksplorasi kemitraan langsung hulu-ke-hilir dengan nelayan dan petani binaan KOPSIM Mandiri.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exposures.map((proj) => (
            <ProjectExposureCard
              key={proj.id}
              project={proj}
              onSelect={(p) => setSelectedExposure(p)}
            />
          ))}
        </div>
      </div>

      {/* SECTION 2: TIMELINE UPDATE TERBARU PROYEK (TAHAP 8) */}
      <div className="space-y-4" id="section-project-timeline-updates">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-primary-700" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-primary-700 font-mono">
                LAPORAN LAPANGAN
              </span>
            </div>
            <h3 className="text-xl font-bold font-serif text-text-dark">
              Update Terbaru Perkembangan Proyek
            </h3>
          </div>
          <span className="text-xs text-text-muted">
            Transparansi aktivitas lapangan & hilirisasi produksi
          </span>
        </div>

        {projectUpdates.length === 0 ? (
          <div className="p-6 bg-surface rounded-[var(--radius-card)] border border-stone-200/70 text-center text-xs text-text-muted">
            Belum ada catatan update perkembangan proyek terkini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectUpdates.map((upd) => {
              const matchedProject = exposures.find((e) => e.id === upd.project_id);
              return (
                <div
                  key={upd.id}
                  className="p-5 bg-surface rounded-[var(--radius-card)] border border-stone-200/80 shadow-2xs hover:border-primary-700/50 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {upd.foto_url && (
                      <div className="aspect-16/9 w-full rounded-xl overflow-hidden bg-stone-100 mb-2">
                        <img
                          src={upd.foto_url}
                          alt={upd.judul}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-accent-gold-dark font-mono bg-accent-gold/10 px-2 py-0.5 rounded-sm">
                        {matchedProject ? matchedProject.tagline : upd.project_id}
                      </span>
                      <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {formatDateIndo(upd.tanggal)}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-text-dark leading-snug line-clamp-2">
                      {upd.judul}
                    </h4>

                    <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                      {upd.narasi}
                    </p>
                  </div>

                  {matchedProject && (
                    <button
                      onClick={() => setSelectedExposure(matchedProject)}
                      className="pt-2 border-t border-stone-100 text-[11px] font-semibold text-primary-700 hover:text-primary-900 flex items-center gap-1 cursor-pointer transition-colors text-left"
                    >
                      <span>Lihat profil proyek {matchedProject.tagline}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 3: KATALOG KOMODITAS SIAP PASOK */}
      <div className="space-y-4" id="section-commodity-marketplace">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-primary-700 font-mono">
              ORDER & DISTRIBUSI
            </span>
            <h3 className="text-xl font-bold font-serif text-text-dark">
              Katalog Komoditas Siap Pasok (MOQ & Grade)
            </h3>
          </div>
          <span className="text-xs text-text-muted">
            Pemesanan pasokan reguler untuk industri, Horeka & ekspor
          </span>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MARKETPLACE_PRODUCTS.map((p) => (
            <Card key={p.sku} title={p.name} subtitle={p.category}>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-stone-500">{p.sku}</span>
                  <Badge variant={p.availability === 'Tersedia' ? 'success' : 'gold'} size="sm">
                    {p.availability}
                  </Badge>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl space-y-1.5 text-stone-700">
                  <div className="flex justify-between">
                    <span>Grade / Mutu:</span>
                    <span className="font-semibold text-stone-900">{p.grade}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kemasan Standar:</span>
                    <span className="font-semibold text-stone-900">{p.packaging}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kapasitas Suplai:</span>
                    <span className="font-semibold text-emerald-900">{p.supplyCapacity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Minimum Order (MOQ):</span>
                    <span className="font-semibold text-stone-900">{p.moq} Unit</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-stone-200/80 mt-2">
                  <div>
                    <span className="text-[10px] text-stone-500 block font-medium">Harga Acuan:</span>
                    <span className="text-sm font-bold text-emerald-950 font-serif">
                      {formatRupiah(p.price)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-stone-300 text-stone-700 hover:bg-stone-100 hover:text-stone-950 shadow-xs"
                      onClick={() => setSelectedProduct(p)}
                    >
                      Spesifikasi
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-xs"
                      onClick={() => {
                        setSelectedProduct(p);
                        setIsInquiryOpen(true);
                      }}
                    >
                      Pesan Pasok
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Project Exposure Detail Modal */}
      {selectedExposure && (
        <ProjectExposureDetail
          project={selectedExposure}
          onClose={() => setSelectedExposure(null)}
        />
      )}

      {/* Product Detail Modal */}
      {selectedProduct && !isInquiryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 font-serif">Spesifikasi Komoditas</h3>
              <button onClick={() => setSelectedProduct(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="text-sm font-bold text-emerald-950">{selectedProduct.name}</h4>
              <Badge variant="primary" size="sm">{selectedProduct.category}</Badge>

              <div className="p-3 bg-stone-50 rounded-xl space-y-1.5 text-stone-700">
                <div><strong>Kode SKU:</strong> {selectedProduct.sku}</div>
                <div><strong>Grade:</strong> {selectedProduct.grade}</div>
                <div><strong>Packaging:</strong> {selectedProduct.packaging}</div>
                <div><strong>Kapasitas Suplai:</strong> {selectedProduct.supplyCapacity}</div>
                <div><strong>MOQ:</strong> {selectedProduct.moq} Unit</div>
                <div><strong>Estimasi Harga:</strong> {formatRupiah(selectedProduct.price)}</div>
              </div>

              <p className="text-stone-600 italic">
                Komoditas siap dipasok untuk kebutuhan industri, katering MBG, restoran Horeka, dan ekspor.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                className="border-stone-300 text-stone-700 hover:bg-stone-100"
                onClick={() => setSelectedProduct(null)}
              >
                Tutup
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold shadow-xs"
                onClick={() => setIsInquiryOpen(true)}
              >
                Ajukan Kemitraan Pasok
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Form Modal */}
      {isInquiryOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 font-serif">Form Pemesanan / Kemitraan</h3>
                <span className="text-[11px] text-emerald-800 font-semibold">{selectedProduct.name}</span>
              </div>
              <button onClick={() => setIsInquiryOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInquirySubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nama Pemesan / Perusahaan *</label>
                <input
                  type="text"
                  required
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  placeholder="PT / Koperasi / Nama Pribadi"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nomor WhatsApp / Kontak *</label>
                <input
                  type="tel"
                  required
                  value={inquiryPhone}
                  onChange={(e) => setInquiryPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Estimasi Kebutuhan Volume</label>
                <input
                  type="number"
                  min={selectedProduct.moq}
                  value={inquiryQty}
                  onChange={(e) => setInquiryQty(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={inquiryNotes}
                  onChange={(e) => setInquiryNotes(e.target.value)}
                  placeholder="Lokasi pengiriman, jadwal pasokan rutin..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsInquiryOpen(false)}>
                  Batal
                </Button>
                <Button variant="gold" size="sm" type="submit" leftIcon={<Send className="w-3.5 h-3.5" />}>
                  Kirim Permintaan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const FileManagementView: React.FC = () => {
  const { showToast } = useNotification();
  const [uploadedFiles, setUploadedFiles] = useState<Array<{ name: string; size: string; date: string; category: string }>>([
    { name: 'AD-ART-KOPSIM-MANDIRI-2024.pdf', size: '2.4 MB', date: '2024-08-10', category: 'Legalitas Organisasi' },
    { name: 'SK-Kemenkumham-KOPSIM.pdf', size: '1.1 MB', date: '2024-08-12', category: 'Izin Operasional' },
    { name: 'Sertifikat-Halal-MUI-Komoditas.pdf', size: '850 KB', date: '2025-01-15', category: 'Sertifikasi Halal' },
    { name: 'Rekap-Simpanan-Pokok-Batch1.pdf', size: '3.8 MB', date: '2026-08-15', category: 'Slip Pembayaran' },
  ]);

  const handleSimulateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newEntry = {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        date: new Date().toISOString().split('T')[0],
        category: 'Dokumen Unggahan',
      };
      setUploadedFiles([newEntry, ...uploadedFiles]);
      showToast(`Berkas ${file.name} berhasil diunggah ke Supabase Storage.`, 'success');
    }
  };

  return (
    <div className="space-y-6" id="file-management-root">
      <Card
        title="Repositori Dokumen & Berkas Bukti (File Management)"
        subtitle="Penyimpanan terpusat dokumen legalitas, bukti transfer bank, dan scan KTP anggota"
        action={
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-800 text-white hover:bg-emerald-900 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Dokumen</span>
            <input type="file" onChange={handleSimulateUpload} className="hidden" />
          </label>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Nama Berkas</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">Ukuran</th>
                <th className="py-2.5 px-3">Tgl Unggah</th>
                <th className="py-2.5 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {uploadedFiles.map((f, i) => (
                <tr key={i} className="hover:bg-stone-50">
                  <td className="py-3 px-3 font-semibold text-stone-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-800" />
                    <span>{f.name}</span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant="primary" size="sm">{f.category}</Badge>
                  </td>
                  <td className="py-3 px-3 text-stone-600 font-mono">{f.size}</td>
                  <td className="py-3 px-3 text-stone-600">{f.date}</td>
                  <td className="py-3 px-3 text-center">
                    <button
                      onClick={() => showToast(`Mengunduh berkas ${f.name}...`, 'info')}
                      className="p-1 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded"
                      title="Unduh Berkas"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export const HistoryView: React.FC = () => {
  return (
    <div className="space-y-6" id="history-view-root">
      <Card title="Jejak Langkah & Transformasi Sejarah KOPSIM" subtitle="Dari Sarekat Dagang Islam 1905 hingga Era Modernisasi 2026">
        <div className="space-y-6 border-l-2 border-amber-500 pl-5 ml-3">
          {[
            { year: '1905', title: 'Fondasi Sarekat Dagang Islam', desc: 'Dipelopori oleh H. Samanhudi dan H.O.S Tjokroaminoto untuk membangkitkan kemandirian ekonomi saudagar pribumi.' },
            { year: '1980 - 2000', title: 'Ekspansi Kemitraan Komoditas', desc: 'Pengembangan unit usaha simpan pinjam syariah dan distribusi komoditas pangan pokok.' },
            { year: '2024', title: 'Restrukturisasi Sektor Riil', desc: 'Penyusunan AD/ART Baru dan pembentukan 8 Strategic Projects untuk ketahanan pangan nasional.' },
            { year: '2026', title: 'Modernisasi Frontend React & Supabase', desc: 'Migrasi arsitektur dari 7 Google Apps Script ke React/Vite dan PostgreSQL Supabase terintegrasi.' },
          ].map((item, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-7 top-0 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
              <span className="text-xs font-mono font-bold text-amber-700">{item.year}</span>
              <h4 className="text-sm font-bold text-stone-900 mt-0.5">{item.title}</h4>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

interface TeamMember {
  name: string;
  role: string;
  roleBadge: string;
  roleVariant: 'gold' | 'success' | 'primary';
  photoUrl: string;
  bio: string;
  objectPosition?: string;
  photoScale?: string;
  email?: string;
  phone?: string;
}

const ProfileAvatar: React.FC<{
  photoUrl: string;
  name: string;
  size: 'main' | 'sub';
  objectPosition?: string;
  photoScale?: string;
}> = ({
  photoUrl,
  name,
  size,
  objectPosition = '50% 15%',
  photoScale = 'scale-100',
}) => {
  const [hasError, setHasError] = useState(false);
  const sizeClass = size === 'main' ? 'w-32 h-32 text-2xl' : 'w-28 h-28 text-xl';

  const getInitials = (fullName: string) => {
    const clean = fullName.replace(/Dr\.|S\.H\.|M\.H\.|SE/gi, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (clean.slice(0, 2) || 'KP').toUpperCase();
  };

  if (!photoUrl || hasError) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-primary-700 text-white font-bold flex items-center justify-center border-3 border-accent-gold shadow-md shrink-0`}
      >
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full overflow-hidden border-3 border-accent-gold shadow-md shrink-0 bg-stone-100 ring-4 ring-amber-400/20 relative`}
    >
      <img
        src={photoUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        style={{ objectPosition: objectPosition }}
        className={`w-full h-full object-cover transition-transform duration-300 ${photoScale}`}
      />
    </div>
  );
};

export const TeamView: React.FC = () => {
  const mainLeader: TeamMember = {
    name: 'Dr. Hamdan Zoelva, S.H., M.H.',
    role: 'Ketua Dewan Pengawas Syariah',
    roleBadge: 'Pengawas Syariah',
    roleVariant: 'gold',
    photoUrl: '/assets/hamdan.jpg',
    objectPosition: '50% 12%',
    photoScale: 'scale-105',
    bio: 'Mantan Ketua Mahkamah Konstitusi RI & Pakar Hukum Tata Negara. Mengawal keabsahan akad syariah dan kepatuhan hukum transaksi koperasi.',
  };

  const executiveTeam: TeamMember[] = [
    {
      name: 'Nunung Suhudiah, SE',
      role: 'Ketua Koperasi',
      roleBadge: 'Ketua Pengurus',
      roleVariant: 'success',
      photoUrl: '/assets/nunung.jpeg',
      objectPosition: '50% 18%',
      photoScale: 'scale-110',
      bio: 'Memimpin operasional holding koperasi, kemitraan strategis sektor riil, dan hilirisasi rantai pasok industri.',
    },
    {
      name: 'Yudhi Irsyadi, SE',
      role: 'Sekretaris Koperasi',
      roleBadge: 'Sekretaris',
      roleVariant: 'primary',
      photoUrl: '/assets/yudi.jpeg',
      objectPosition: '50% 15%',
      photoScale: 'scale-105',
      bio: 'Mengatur administrasi regulasi keanggotaan, database pendaftaran, dan hubungan antar lembaga regional.',
    },
  ];

  return (
    <div className="space-y-6" id="team-view-root">
      {/* 1. Dewan Pengawas Syariah (Kartu Utama di Bagian Atas) */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <ProfileAvatar
            photoUrl={mainLeader.photoUrl}
            name={mainLeader.name}
            size="main"
            objectPosition={mainLeader.objectPosition}
            photoScale={mainLeader.photoScale}
          />
          <div className="space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">{mainLeader.name}</h3>
                <p className="text-accent-gold text-sm font-semibold">{mainLeader.role}</p>
              </div>
              <div>
                <Badge variant={mainLeader.roleVariant} size="sm">{mainLeader.roleBadge}</Badge>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl pt-1">
              {mainLeader.bio}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Ketua & Sekretaris (Sejajar di Bawah) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {executiveTeam.map((member, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <ProfileAvatar
                photoUrl={member.photoUrl}
                name={member.name}
                size="sub"
                objectPosition={member.objectPosition}
                photoScale={member.photoScale}
              />
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-lg font-bold text-stone-900 font-serif">{member.name}</h4>
                  <Badge variant={member.roleBadge ? member.roleVariant : 'primary'} size="sm">{member.roleBadge}</Badge>
                </div>
                <p className="text-accent-gold text-sm font-semibold">{member.role}</p>
                <p className="text-xs text-stone-600 leading-relaxed pt-1">
                  {member.bio}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Kontak Sekretariat Koperasi */}
      <Card title="Sekretariat Pusat & Kontak Layanan">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-stone-700">
          <div className="flex items-start gap-2.5 p-3 bg-stone-50 rounded-xl">
            <MapPin className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Kantor Pusat</span>
              <span className="leading-snug block">
                Jl. Taman Amir Hamzah No.6A Pegangsaan, Kec. Menteng, Jakarta Pusat
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-stone-50 rounded-xl">
            <Mail className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Email Resmi</span>
              <span>koperasi.simandiri@gmail.com</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-stone-50 rounded-xl">
            <Phone className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Layanan Anggota</span>
              <span className="font-semibold block">021 - 23599354 | 082148988520</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
