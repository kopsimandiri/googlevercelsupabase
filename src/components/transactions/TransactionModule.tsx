import React, { useState, useEffect, useMemo } from 'react';
import { transactionService, TransactionsMetaResult, TRANSACTIONS_SQL_DDL } from '../../services/transactionService';
import { masterDataService } from '../../services/masterDataService';
import { TransactionRecord, CustomerRecord, SupplierRecord } from '../../types/database';
import { formatDateIndo, formatRupiah, cleanRupiah } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Trash2,
  Edit2,
  X,
  Save,
  Building,
  Briefcase,
  Layers,
  FileText,
  UploadCloud,
  Database,
  CheckCircle2,
  HardDrive,
  Code,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';

export const TransactionModule: React.FC = () => {
  const { role, user } = useAuth();
  const { showToast } = useNotification();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metaInfo, setMetaInfo] = useState<TransactionsMetaResult | null>(null);

  // Filter and tabs state
  const [activeTab, setActiveTab] = useState<'ALL' | 'PUSAT' | 'CABANG' | 'PROJECT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [jenisFilter, setJenisFilter] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTrx, setEditingTrx] = useState<TransactionRecord | null>(null);
  const [viewingTrx, setViewingTrx] = useState<TransactionRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDdlModal, setShowDdlModal] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Form inputs
  const [formTanggal, setFormTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formReferal, setFormReferal] = useState<'KOPERASI' | 'PROJECT'>('KOPERASI');
  const [formPlantation, setFormPlantation] = useState<string>('PUSAT JAKARTA');
  const [formJenis, setFormJenis] = useState<'MASUK' | 'KELUAR'>('MASUK');
  const [formKategori, setFormKategori] = useState<string>('Penjualan Komoditas');
  const [formSkuName, setFormSkuName] = useState<string>('');
  const [formMetodeBayar, setFormMetodeBayar] = useState<string>('Bank BSI');
  const [formQty, setFormQty] = useState<number>(1);
  const [formHargaSatuan, setFormHargaSatuan] = useState<number>(0);
  const [formJumlah, setFormJumlah] = useState<number>(0);
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formSupplierId, setFormSupplierId] = useState<string>('');
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  const [formFilelink, setFormFilelink] = useState<string>('');

  const canEdit = role === 'ADMIN' || role === 'DIRECTOR';
  const canDelete = role === 'ADMIN';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const meta = await transactionService.getTransactionsWithMeta();
      setMetaInfo(meta);
      setTransactions(meta.data);
      setCustomers(transactionService.getCustomers());
      setSuppliers(transactionService.getSuppliers());
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat transaksi.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await masterDataService.seedTableToSupabase('transactions');
      if (res.success) {
        showToast(`Berhasil menyinkronkan ${res.count} transaksi ke Supabase!`, 'success');
        await loadData();
      } else {
        showToast(res.error || 'Gagal sinkronisasi data.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sinkronisasi.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(TRANSACTIONS_SQL_DDL);
    setCopiedSql(true);
    showToast('Skrip SQL DDL & Kebijakan RLS disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Update jumlah automatically when qty or hargaSatuan changes in project mode
  useEffect(() => {
    if (formReferal === 'PROJECT' && formQty > 0 && formHargaSatuan > 0) {
      setFormJumlah(formQty * formHargaSatuan);
    }
  }, [formQty, formHargaSatuan, formReferal]);

  const handleOpenAddModal = () => {
    setEditingTrx(null);
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormReferal('KOPERASI');
    setFormPlantation('PUSAT JAKARTA');
    setFormJenis('MASUK');
    setFormKategori('Kas Operasional');
    setFormSkuName('');
    setFormMetodeBayar('Bank BSI');
    setFormQty(1);
    setFormHargaSatuan(0);
    setFormJumlah(0);
    setFormCustomerId('');
    setFormSupplierId('');
    setFormKeterangan('');
    setFormFilelink('');
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (t: TransactionRecord) => {
    setEditingTrx(t);
    setFormTanggal(t.tanggal);
    setFormReferal(t.referal);
    setFormPlantation(t.plantation);
    setFormJenis(t.jenis);
    setFormKategori(t.kategori);
    setFormSkuName(t.sku_name || '');
    setFormMetodeBayar(t.metode_bayar);
    setFormQty(t.qty || 1);
    setFormHargaSatuan(t.harga_satuan || 0);
    setFormJumlah(t.jumlah);
    setFormCustomerId(t.customer_id || '');
    setFormSupplierId(t.supplier_id || '');
    setFormKeterangan(t.keterangan || '');
    setFormFilelink(t.filelink || '');
    setIsFormOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formJumlah <= 0) {
      showToast('Nominal jumlah transaksi harus lebih dari Rp 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<TransactionRecord> = {
        id: editingTrx?.id,
        tanggal: formTanggal,
        referal: formReferal,
        plantation: formPlantation,
        jenis: formJenis,
        kategori: formKategori,
        sku_name: formSkuName,
        metode_bayar: formMetodeBayar,
        qty: formQty,
        harga_satuan: formHargaSatuan,
        jumlah: formJumlah,
        customer_id: formCustomerId,
        supplier_id: formSupplierId,
        keterangan: formKeterangan,
        filelink: formFilelink,
        login_as: user?.name || role || 'ADMIN',
      };

      const res = await transactionService.saveTransaction(payload);
      if (res.success) {
        showToast(
          editingTrx
            ? `Transaksi ${res.id} berhasil diperbarui.`
            : `Transaksi baru berhasil dibukukan dengan ID: ${res.id}`,
          'success'
        );
        setIsFormOpen(false);
        await loadData();
      } else {
        showToast(res.error || 'Gagal menyimpan transaksi.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      showToast('Hanya role ADMIN yang berwenang membatalkan transaksi.', 'error');
      return;
    }
    const confirmed = window.confirm(`Batalkan dan hapus transaksi ${id}?`);
    if (!confirmed) return;

    try {
      const res = await transactionService.deleteTransaction(id);
      if (res.success) {
        showToast(`Transaksi ${id} telah dihapus.`, 'info');
        await loadData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus data.', 'error');
    }
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Tab filter
      if (activeTab === 'PUSAT' && !t.area_jenis.includes('PUSAT')) return false;
      if (activeTab === 'CABANG' && !t.area_jenis.includes('CABANG')) return false;
      if (activeTab === 'PROJECT' && !t.area_jenis.includes('PROJECT')) return false;

      // Jenis filter
      if (jenisFilter !== 'ALL' && t.jenis !== jenisFilter) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          t.id.toLowerCase().includes(q) ||
          t.plantation.toLowerCase().includes(q) ||
          t.kategori.toLowerCase().includes(q) ||
          (t.akun && t.akun.toLowerCase().includes(q)) ||
          (t.sku_name && t.sku_name.toLowerCase().includes(q)) ||
          (t.keterangan && t.keterangan.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [transactions, activeTab, jenisFilter, searchQuery]);

  // Aggregate stats
  const totals = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    filteredTransactions.forEach((t) => {
      const n = cleanRupiah(t.jumlah);
      if (t.jenis === 'MASUK') masuk += n;
      else keluar += n;
    });
    return { masuk, keluar, saldo: masuk - keluar, count: filteredTransactions.length };
  }, [filteredTransactions]);

  if (isLoading && transactions.length === 0) {
    return <LoadingState message="Memuat Buku Jurnal Transaksi 20 Kolom..." fullHeight />;
  }

  return (
    <div className="space-y-6" id="transactions-module-root">
      {/* 3 Metric Cards for Current Filtered Tab */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-700" headerBorder={false}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                TOTAL KAS MASUK
              </span>
              <h3 className="text-xl font-bold text-emerald-950 mt-1 font-serif">
                {formatRupiah(totals.masuk)}
              </h3>
              <span className="text-[11px] text-emerald-700">Akumulasi Penerimaan</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Plus className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-600" headerBorder={false}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                TOTAL KAS KELUAR
              </span>
              <h3 className="text-xl font-bold text-rose-950 mt-1 font-serif">
                {formatRupiah(totals.keluar)}
              </h3>
              <span className="text-[11px] text-rose-700">Akumulasi Pengeluaran / HPP</span>
            </div>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-800 border border-rose-200">
              <Trash2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-600" headerBorder={false}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                NETTO / SALDO
              </span>
              <h3 className="text-xl font-bold text-stone-900 mt-1 font-serif">
                {formatRupiah(totals.saldo)}
              </h3>
              <span className="text-[11px] text-amber-800">{totals.count} Transaksi Tercatat</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Ledger Card */}
      <Card
        id="card-transactions-ledger"
        title="Buku Transaksi Kas & Komoditas Riil"
        subtitle="Pencatatan standar akuntansi 19-20 kolom (Pusat, Cabang, dan 8 Project)"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Supabase Connection Status Badge */}
            {metaInfo && (
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                  metaInfo.source === 'SUPABASE'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
                title={metaInfo.errorMessage || `Latency: ${metaInfo.latencyMs}ms`}
              >
                {metaInfo.source === 'SUPABASE' ? (
                  <>
                    <Database className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
                    <span>Supabase: {metaInfo.totalDbRows} baris ({metaInfo.latencyMs}ms)</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-amber-700" />
                    <span>Lokal ({metaInfo.data.length} baris)</span>
                  </>
                )}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDdlModal(true)}
              leftIcon={<Code className="w-3.5 h-3.5" />}
              title="Lihat Skrip SQL DDL & Aturan RLS Supabase"
            >
              SQL DDL & RLS
            </Button>

            {metaInfo?.source === 'SUPABASE' && metaInfo.totalDbRows === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-amber-800 border-amber-300 bg-amber-50 hover:bg-amber-100"
                onClick={handleSeedData}
                disabled={isSeeding}
                leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
              >
                {isSeeding ? 'Mengirim...' : 'Sinkronkan Data Awal'}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            >
              Segarkan
            </Button>
            {canEdit && (
              <Button variant="gold" size="sm" onClick={handleOpenAddModal} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Input Transaksi
              </Button>
            )}
          </div>
        }
      >
        {/* Navigation Tabs (PUSAT, CABANG, PROJECT, ALL) */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-stone-200 mb-4">
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-stone-200">
            {[
              { id: 'ALL', label: 'Semua Area' },
              { id: 'PUSAT', label: 'Koperasi Pusat' },
              { id: 'CABANG', label: 'Koperasi Cabang' },
              { id: 'PROJECT', label: '8 Strategic Project' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Jenis */}
            <select
              value={jenisFilter}
              onChange={(e: any) => setJenisFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden text-stone-700"
            >
              <option value="ALL">Semua Jenis (Masuk & Keluar)</option>
              <option value="MASUK">Hanya Pemasukan (MASUK)</option>
              <option value="KELUAR">Hanya Pengeluaran (KELUAR)</option>
            </select>

            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Cari ID, SKU, keterangan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Data Table */}
        {filteredTransactions.length === 0 ? (
          <EmptyState
            title="Tidak Ada Transaksi Ditemukan"
            description="Tidak ada catatan transaksi pada filter atau tab ini."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse" id="tbl-transactions-ledger">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/90 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">ID Transaksi</th>
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">Entitas / Project</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Nama Akun</th>
                  {activeTab !== 'PUSAT' && activeTab !== 'CABANG' && (
                    <>
                      <th className="py-2.5 px-3">Produk / SKU</th>
                      <th className="py-2.5 px-3 text-center">QTY</th>
                    </>
                  )}
                  <th className="py-2.5 px-3 text-center">Jenis</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-950">{t.id}</td>
                    <td className="py-3 px-3 text-stone-600">{formatDateIndo(t.tanggal)}</td>
                    <td className="py-3 px-3 font-semibold text-stone-800">{t.plantation}</td>
                    <td className="py-3 px-3 text-stone-600">{t.kategori}</td>
                    <td className="py-3 px-3 font-medium text-stone-800">{t.akun || '-'}</td>
                    {activeTab !== 'PUSAT' && activeTab !== 'CABANG' && (
                      <>
                        <td className="py-3 px-3 text-stone-700">{t.sku_name || '-'}</td>
                        <td className="py-3 px-3 text-center font-mono text-stone-600">{t.qty || 1}</td>
                      </>
                    )}
                    <td className="py-3 px-3 text-center">
                      <Badge variant={t.jenis === 'MASUK' ? 'success' : 'danger'} size="sm">
                        {t.jenis}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 font-serif">
                      {formatRupiah(t.jumlah)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setViewingTrx(t)}
                          className="p-1 text-stone-500 hover:text-emerald-800 hover:bg-emerald-50 rounded"
                          title="Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction Detail View Modal */}
      {viewingTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-800" />
                <h3 className="font-bold text-stone-900 font-serif">Detail Transaksi 20 Kolom</h3>
              </div>
              <button onClick={() => setViewingTrx(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl">
                <div>
                  <span className="text-stone-500 font-medium block">ID Transaksi</span>
                  <span className="font-bold font-mono text-emerald-950">{viewingTrx.id}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Tanggal</span>
                  <span className="font-semibold text-stone-900">{formatDateIndo(viewingTrx.tanggal)}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Referal / Area</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.referal} — {viewingTrx.area_jenis}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Entitas / Project</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.plantation}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-500 font-medium block">Kategori</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.kategori}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">Metode / Akun</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.metode_bayar} ({viewingTrx.akun || '-'})</span>
                </div>
                {viewingTrx.sku_name && (
                  <div>
                    <span className="text-stone-500 font-medium block">Komoditas / SKU</span>
                    <span className="font-semibold text-stone-900">{viewingTrx.sku_name}</span>
                  </div>
                )}
                {viewingTrx.qty > 0 && (
                  <div>
                    <span className="text-stone-500 font-medium block">Volume QTY</span>
                    <span className="font-semibold text-stone-900">{viewingTrx.qty}</span>
                  </div>
                )}
                {viewingTrx.harga_satuan && viewingTrx.harga_satuan > 0 && (
                  <div>
                    <span className="text-stone-500 font-medium block">Harga Satuan</span>
                    <span className="font-semibold text-stone-900">{formatRupiah(viewingTrx.harga_satuan)}</span>
                  </div>
                )}
                {viewingTrx.customer_id && (
                  <div>
                    <span className="text-stone-500 font-medium block">Customer Terdaftar</span>
                    <span className="font-semibold text-emerald-800">{viewingTrx.customer_id}</span>
                  </div>
                )}
                {viewingTrx.supplier_id && (
                  <div>
                    <span className="text-stone-500 font-medium block">Supplier Terdaftar</span>
                    <span className="font-semibold text-amber-800">{viewingTrx.supplier_id}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-semibold text-emerald-900">Total Nilai Transaksi:</span>
                <span className="text-base font-bold text-emerald-950 font-serif">
                  {formatRupiah(viewingTrx.jumlah)}
                </span>
              </div>

              {viewingTrx.keterangan && (
                <div>
                  <span className="text-stone-500 font-medium block">Keterangan:</span>
                  <p className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 mt-1">
                    {viewingTrx.keterangan}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setViewingTrx(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Input / Edit Modal Form */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 font-serif">
                {editingTrx ? `Edit Transaksi: ${editingTrx.id}` : 'Form Input Transaksi Kas & Komoditas'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Referal Area *</label>
                  <select
                    value={formReferal}
                    onChange={(e: any) => {
                      setFormReferal(e.target.value);
                      if (e.target.value === 'PROJECT') {
                        setFormPlantation('TRADING IKAN');
                      } else {
                        setFormPlantation('PUSAT JAKARTA');
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="KOPERASI">KOPERASI (Pusat / Cabang)</option>
                    <option value="PROJECT">PROJECT (8 Sektor Riil)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Entitas / Project *</label>
                  {formReferal === 'PROJECT' ? (
                    <select
                      value={formPlantation}
                      onChange={(e) => setFormPlantation(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                    >
                      <option value="KAMPUNG HAJI">KAMPUNG HAJI</option>
                      <option value="TRADING IKAN">TRADING IKAN</option>
                      <option value="GARAM">GARAM</option>
                      <option value="PERTANIAN">PERTANIAN</option>
                      <option value="PLYWOOD">PLYWOOD</option>
                      <option value="MINYAK MERAH">MINYAK MERAH</option>
                      <option value="SUPPLIER MBG">SUPPLIER MBG</option>
                      <option value="DISTRIBUTOR MEATSHOP">DISTRIBUTOR MEATSHOP</option>
                    </select>
                  ) : (
                    <select
                      value={formPlantation}
                      onChange={(e) => setFormPlantation(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                    >
                      <option value="PUSAT JAKARTA">PUSAT JAKARTA</option>
                      <option value="CABANG JAWA BARAT">CABANG JAWA BARAT</option>
                      <option value="CABANG JAWA TIMUR">CABANG JAWA TIMUR</option>
                      <option value="CABANG JAWA TENGAH">CABANG JAWA TENGAH</option>
                      <option value="CABANG SUMATERA">CABANG SUMATERA</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Jenis Mutasi *</label>
                  <select
                    value={formJenis}
                    onChange={(e: any) => setFormJenis(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="MASUK">Penerimaan / Penjualan (MASUK)</option>
                    <option value="KELUAR">Pengeluaran / Pembelian (KELUAR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Kategori Transaksi</label>
                  <input
                    type="text"
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    placeholder="Simpanan / Penjualan / Operasional"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Metode Pembayaran / Kas</label>
                  <select
                    value={formMetodeBayar}
                    onChange={(e) => setFormMetodeBayar(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="Bank BSI">Bank Syariah Indonesia (BSI)</option>
                    <option value="Bank Mandiri">Bank Mandiri</option>
                    <option value="Kas Tunai">Kas Tunai Kantor</option>
                  </select>
                </div>
              </div>

              {formReferal === 'PROJECT' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                  <span className="text-[11px] font-bold text-amber-900 uppercase block">
                    Kalkulasi Komoditas Project
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] text-stone-600 font-medium mb-0.5">Nama SKU / Produk</label>
                      <input
                        type="text"
                        value={formSkuName}
                        onChange={(e) => setFormSkuName(e.target.value)}
                        placeholder="Tuna / Garam / Beras"
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-hidden text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 font-medium mb-0.5">QTY (Volume)</label>
                      <input
                        type="number"
                        min="1"
                        value={formQty}
                        onChange={(e) => setFormQty(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-hidden text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-stone-600 font-medium mb-0.5">Harga Satuan (Rp)</label>
                      <input
                        type="number"
                        min="0"
                        value={formHargaSatuan}
                        onChange={(e) => setFormHargaSatuan(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-hidden text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Total Nominal Transaksi (Rp) *</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={formJumlah}
                  onChange={(e) => setFormJumlah(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden font-mono font-bold text-sm text-emerald-950"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Keterangan / Uraian</label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Uraian transaksi lengkap"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting} leftIcon={<Save className="w-3.5 h-3.5" />}>
                  Simpan Transaksi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SQL DDL & RLS Policy Modal */}
      {showDdlModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-800" />
                <div>
                  <h3 className="font-bold text-stone-900 font-serif">Skrip SQL & RLS PostgreSQL: public.transactions</h3>
                  <p className="text-[11px] text-stone-500">19 Kolom Resmi + RLS Diaktifkan (ENABLE) + Kebijakan Izin Lengkap</p>
                </div>
              </div>
              <button onClick={() => setShowDdlModal(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>Mengapa RLS Tetap Aktif (ENABLE)?</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                RLS (Row Level Security) mengamankan data tabel Anda di tingkat baris. Agar query aplikasi tidak menghasilkan 0 baris kosong,
                kebijakan akses (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">CREATE POLICY</code>) untuk <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">SELECT</code>, <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">INSERT</code>, <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">UPDATE</code>, dan <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">DELETE</code> telah disertakan dalam skrip di bawah.
              </p>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-xl border border-stone-800 bg-stone-950 p-4">
              <div className="absolute right-3 top-3">
                <button
                  onClick={handleCopySql}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-xs font-mono font-medium transition-colors border border-stone-700"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Tersalin!' : 'Salin SQL'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono text-emerald-400 overflow-y-auto max-h-64 pr-24 leading-relaxed">
                {TRANSACTIONS_SQL_DDL}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
              <span className="text-stone-500">Jalankan di <strong>Supabase SQL Editor</strong></span>
              <Button variant="primary" size="sm" onClick={() => setShowDdlModal(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
