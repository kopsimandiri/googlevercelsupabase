import React, { useState, useEffect, useMemo, useRef } from 'react';
import { transactionService, TransactionsMetaResult, TRANSACTIONS_SQL_DDL } from '../../services/transactionService';
import { masterDataService } from '../../services/masterDataService';
import { memberService } from '../../services/memberService';
import { TransactionRecord, CustomerRecord, SupplierRecord, MemberRecord } from '../../types/database';
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
  Calendar,
  Wallet,
  Tag,
  Paperclip,
  Calculator,
  UserCheck,
  ShoppingBag,
  ExternalLink,
} from 'lucide-react';

export const TransactionModule: React.FC = () => {
  const { role, user } = useAuth();
  const { showToast } = useNotification();

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>([]);
  const [members, setMembers] = useState<MemberRecord[]>([]);
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

  // Form inputs (11 Form Fields in exact order matching user specification)
  // 1. Tanggal Transaksi -> transaction_date
  const [formTanggal, setFormTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  // 2. Referal Area -> referral_type ('KOPERASI' | 'PROJECT')
  const [formReferal, setFormReferal] = useState<'KOPERASI' | 'PROJECT'>('KOPERASI');
  // 3. Entitas / Project -> area_name
  const [formPlantation, setFormPlantation] = useState<string>('PUSAT JAKARTA');
  // 4. Jenis Transaksi -> transaction_type ('MASUK' | 'KELUAR')
  const [formJenis, setFormJenis] = useState<'MASUK' | 'KELUAR'>('MASUK');
  // 5. Kategori -> category_name
  const [formKategori, setFormKategori] = useState<string>('Simpanan Pokok Anggota');
  // 6. Sumber Dana -> payment_method
  const [formMetodeBayar, setFormMetodeBayar] = useState<string>('Bank BSI 7123456789 (a.n KOPSIM)');
  // 7. Total Nominal Transaksi -> amount
  const [formJumlah, setFormJumlah] = useState<number>(500000);
  // 8. Akun / Anggota / Project -> account_name_legacy
  const [formAkun, setFormAkun] = useState<string>('Kas Umum Koperasi (Non-Anggota)');
  // 9. Keterangan -> description
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  // 10. Lampiran File -> file_url
  const [formFilelink, setFormFilelink] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  // 11. Kalkulasi Komoditas Project (11.1 s/d 11.4)
  const [formSkuName, setFormSkuName] = useState<string>('');
  const [formQty, setFormQty] = useState<number>(1);
  const [formHargaSatuan, setFormHargaSatuan] = useState<number>(0);

  // Optional customer / supplier link
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formSupplierId, setFormSupplierId] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = role === 'ADMIN' || role === 'DIRECTOR';
  const canDelete = role === 'ADMIN';

  // Bank accounts map by entity / project (Step 6 query logic)
  const entityBankMap: Record<string, string[]> = {
    'PUSAT JAKARTA': [
      'Bank BSI 7123456789 (a.n KOPSIM)',
      'Bank Mandiri 1230009876543',
      'BCA Syariah 0019283746',
      'Kas Tunai Kantor Pusat',
    ],
    'CABANG JAWA BARAT': [
      'Bank BSI 7987654321 (Cabang Jabar)',
      'Bank Mandiri 1300012345678',
      'Kas Tunai Cabang Jabar',
    ],
    'CABANG JAWA TIMUR': [
      'Bank Mandiri 1400055443322 (Cabang Jatim)',
      'Bank BSI Cabang Surabaya',
      'Kas Tunai Cabang Jatim',
    ],
    'CABANG JAWA TENGAH': [
      'Bank BSI 7334455667 (Cabang Jateng)',
      'Kas Tunai Cabang Jateng',
    ],
    'CABANG SUMATERA': [
      'Bank Mandiri 1550099887766 (Cabang Sumatera)',
      'Kas Tunai Cabang Sumatera',
    ],
    'TRADING IKAN': [
      'Bank BSI 7223344556 (Trading Ikan)',
      'Bank Mandiri Unit Perikanan',
      'Kas Operasional Unit Ikan',
    ],
    'PERTANIAN': [
      'Bank BSI 7987654321 (Unit Pertanian)',
      'Kas Operasional Pertanian Cianjur',
    ],
    'GARAM': [
      'Bank Mandiri 1400055443322 (Unit Garam)',
      'Kas Operasional Garam Rakyat',
    ],
    'MINYAK MERAH': [
      'Bank BSI 7556677889 (Minyak Merah)',
      'Kas Operasional Minyak Merah',
    ],
    'PLYWOOD': [
      'Bank Mandiri 1660022334455 (Plywood)',
      'Kas Operasional Unit Plywood',
    ],
    'DISTRIBUTOR MEATSHOP': [
      'Bank Mandiri 1770033445566 (Meatshop)',
      'Kas Operasional Meatshop',
    ],
    'SUPPLIER MBG': [
      'Bank BSI 7445566778 (Supplier MBG)',
      'Kas Operasional Dapur MBG',
    ],
    'KAMPUNG HAJI': [
      'Bank BSI 7112233445 (Kampung Haji)',
      'Kas Operasional Proyek Kampung Haji',
    ],
  };

  // Commodities map by project entity (Step 11.1 query logic)
  const projectProductsMap: Record<string, Array<{ name: string; defaultPrice: number; unit: string }>> = {
    'DISTRIBUTOR MEATSHOP': [
      { name: 'Daging Sapi Prime Cut Halal Segar', defaultPrice: 125000, unit: 'Kg' },
      { name: 'Daging Ayam Karkas Broiler Segar', defaultPrice: 38000, unit: 'Kg' },
      { name: 'Daging Kerbau Allana Import', defaultPrice: 85000, unit: 'Kg' },
      { name: 'Daging Cincang Giling Super', defaultPrice: 110000, unit: 'Kg' },
    ],
    'TRADING IKAN': [
      { name: 'Ikan Tuna Segar Tangkap Laut (Yellowfin)', defaultPrice: 65000, unit: 'Kg' },
      { name: 'Ikan Layang Tangkap Segar', defaultPrice: 22000, unit: 'Kg' },
      { name: 'Cumi-Cumi Beku Ekspor', defaultPrice: 75000, unit: 'Kg' },
      { name: 'Kakap Merah Fillet Super', defaultPrice: 90000, unit: 'Kg' },
    ],
    'PERTANIAN': [
      { name: 'Beras Organik Pandan Wangi Cianjur', defaultPrice: 15000, unit: 'Kg' },
      { name: 'Beras Rojolele Super', defaultPrice: 13500, unit: 'Kg' },
      { name: 'Tepung Tapioka Halus Industri', defaultPrice: 8500, unit: 'Kg' },
      { name: 'Jagung Pipil Kering Pakan', defaultPrice: 5500, unit: 'Kg' },
    ],
    'GARAM': [
      { name: 'Garam Kristal NaCl > 97% Food Grade', defaultPrice: 4500, unit: 'Kg' },
      { name: 'Garam Kasar Tambak Rakyat K1', defaultPrice: 2500, unit: 'Kg' },
      { name: 'Garam Halus Beryodium Konsumsi', defaultPrice: 6000, unit: 'Kg' },
    ],
    'MINYAK MERAH': [
      { name: 'Minyak Makan Merah (Red Palm Oil)', defaultPrice: 18000, unit: 'Liter' },
      { name: 'Minyak Goreng Sawit Higienis Koperasi', defaultPrice: 15500, unit: 'Liter' },
    ],
    'PLYWOOD': [
      { name: 'Kayu Lapis Plywood Grade Ekspor 18mm', defaultPrice: 220000, unit: 'Lembar' },
      { name: 'Plywood Furniture Grade 12mm', defaultPrice: 165000, unit: 'Lembar' },
    ],
    'SUPPLIER MBG': [
      { name: 'Paket Pangan Makan Bergizi Gratis (MBG)', defaultPrice: 15000, unit: 'Porsi' },
      { name: 'Telur Ayam Ras Segar Peternak', defaultPrice: 28000, unit: 'Kg' },
      { name: 'Susu Segar Pasteurisasi', defaultPrice: 12000, unit: 'Liter' },
    ],
    'KAMPUNG HAJI': [
      { name: 'Paket Investasi Sarana Kampung Haji', defaultPrice: 10000000, unit: 'Unit' },
      { name: 'Jasa Akomodasi & Logistik Umrah/Haji', defaultPrice: 25000000, unit: 'Pax' },
    ],
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [meta, memberList] = await Promise.all([
        transactionService.getTransactionsWithMeta(),
        memberService.getMembers(),
      ]);
      setMetaInfo(meta);
      setTransactions(meta.data);
      setMembers(memberList);
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

  // 11.4: Update jumlah automatically when qty or hargaSatuan changes in project mode
  useEffect(() => {
    if (formReferal === 'PROJECT') {
      const calculated = (formQty || 0) * (formHargaSatuan || 0);
      setFormJumlah(calculated);
    }
  }, [formQty, formHargaSatuan, formReferal]);

  // Step 5: Categories list based on transaction_type (MASUK / KELUAR)
  const categoryOptions = useMemo(() => {
    if (formJenis === 'MASUK') {
      return [
        'Simpanan Pokok Anggota',
        'Simpanan Wajib Anggota',
        'Simpanan Sukarela / Manasuka',
        'Penjualan Komoditas Riil',
        'Penerimaan Termin Proyek',
        'Penerimaan Kas & Pendapatan Lain',
      ];
    } else {
      return [
        'Biaya Operasional Kantor',
        'Pembelian Bahan Baku / Komoditas',
        'Pengadaan Sarana & Alat Kerja',
        'Honor & Upah Petani / Nelayan',
        'Biaya Logistik & Distribusi',
        'Bagi Hasil / Penyaluran Dana',
        'Biaya Pajak & Administrasi Bank',
      ];
    }
  }, [formJenis]);

  // Step 6: Available bank accounts based on selected area / project
  const availableBankAccounts = useMemo(() => {
    const list = entityBankMap[formPlantation];
    if (list && list.length > 0) return list;
    return [
      'Bank Syariah Indonesia (BSI)',
      'Bank Mandiri',
      'Kas Tunai Kantor',
    ];
  }, [formPlantation]);

  // Step 8: Members belonging to selected work area (for KOPERASI)
  const filteredMembersForArea = useMemo(() => {
    if (formReferal === 'PROJECT') return [];
    const normalizedArea = formPlantation.toUpperCase();
    return members.filter((m) => {
      const mArea = (m.plantation || '').toUpperCase();
      if (normalizedArea.includes('JAWA BARAT') && mArea.includes('JAWA BARAT')) return true;
      if (normalizedArea.includes('JAWA TIMUR') && mArea.includes('JAWA TIMUR')) return true;
      if (normalizedArea.includes('JAWA TENGAH') && mArea.includes('JAWA TENGAH')) return true;
      if (normalizedArea.includes('SUMATERA') && mArea.includes('SUMATERA')) return true;
      if (normalizedArea.includes('PUSAT') && (mArea.includes('PUSAT') || m.area_jenis === 'KOPERASI PUSAT')) return true;
      return mArea === normalizedArea;
    });
  }, [members, formPlantation, formReferal]);

  // Step 11.1: Available commodity products for project
  const availableProductsForProject = useMemo(() => {
    if (formReferal !== 'PROJECT') return [];
    return projectProductsMap[formPlantation] || [
      { name: 'Komoditas Sektor Riil Standar', defaultPrice: 50000, unit: 'Unit' },
    ];
  }, [formPlantation, formReferal]);

  const handleOpenAddModal = () => {
    setEditingTrx(null);
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormReferal('KOPERASI');
    setFormPlantation('PUSAT JAKARTA');
    setFormJenis('MASUK');
    setFormKategori('Simpanan Pokok Anggota');
    setFormMetodeBayar('Bank BSI 7123456789 (a.n KOPSIM)');
    setFormJumlah(500000);
    setFormAkun('Kas Umum Koperasi (Non-Anggota)');
    setFormKeterangan('');
    setFormFilelink('');
    setFileName('');
    setFormSkuName('');
    setFormQty(1);
    setFormHargaSatuan(0);
    setFormCustomerId('');
    setFormSupplierId('');
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (t: TransactionRecord) => {
    setEditingTrx(t);
    setFormTanggal(t.tanggal);
    setFormReferal(t.referal);
    setFormPlantation(t.plantation);
    setFormJenis(t.jenis);
    setFormKategori(t.kategori);
    setFormMetodeBayar(t.metode_bayar);
    setFormJumlah(t.jumlah);
    setFormAkun(t.akun || (t.referal === 'PROJECT' ? 'DANA PROJECT' : 'Kas Umum Koperasi (Non-Anggota)'));
    setFormKeterangan(t.keterangan || '');
    setFormFilelink(t.filelink || '');
    setFileName(t.filelink ? 'Lampiran File Tersedia' : '');
    setFormSkuName(t.sku_name || '');
    setFormQty(t.qty || 1);
    setFormHargaSatuan(t.harga_satuan || 0);
    setFormCustomerId(t.customer_id || '');
    setFormSupplierId(t.supplier_id || '');
    setIsFormOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5MB.', 'error');
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const simulatedPath = `/assets/uploadfile/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      setFormFilelink(result || simulatedPath);
      showToast(`File ${file.name} berhasil diunggah ke folder lampiran transaksi.`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formJumlah <= 0) {
      showToast('Total nominal transaksi harus lebih dari Rp 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      // 8. Akun / Anggota / Project logic:
      // If referral_type === 'PROJECT', lock to 'DANA PROJECT'
      const finalAkun = formReferal === 'PROJECT' ? 'DANA PROJECT' : (formAkun || 'Kas Umum Koperasi (Non-Anggota)');

      const payload: Partial<TransactionRecord> = {
        id: editingTrx?.id,
        tanggal: formTanggal,
        referal: formReferal,
        plantation: formPlantation,
        jenis: formJenis,
        kategori: formKategori,
        metode_bayar: formMetodeBayar,
        jumlah: formJumlah,
        akun: finalAkun,
        keterangan: formKeterangan,
        filelink: formFilelink,
        sku_name: formReferal === 'PROJECT' ? formSkuName : '',
        qty: formReferal === 'PROJECT' ? formQty : 1,
        harga_satuan: formReferal === 'PROJECT' ? formHargaSatuan : formJumlah,
        customer_id: formCustomerId,
        supplier_id: formSupplierId,
        login_as: user?.name || role || 'ADMIN',
      };

      const res = await transactionService.saveTransaction(payload);
      if (res.success) {
        showToast(
          editingTrx
            ? `Transaksi ${res.id} berhasil diperbarui.`
            : `Transaksi baru berhasil dibukukan dengan ID: ${res.id} (Tersinkron ke Supabase public.transactions)`,
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

  // Financial summary of currently filtered transactions
  const totalMasuk = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.jenis === 'MASUK')
      .reduce((acc, t) => acc + (t.jumlah || 0), 0);
  }, [filteredTransactions]);

  const totalKeluar = useMemo(() => {
    return filteredTransactions
      .filter((t) => t.jenis === 'KELUAR')
      .reduce((acc, t) => acc + (t.jumlah || 0), 0);
  }, [filteredTransactions]);

  const netBalance = totalMasuk - totalKeluar;

  return (
    <div className="space-y-6" id="view-transactions-module">
      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-stone-900 font-serif">Buku Transaksi & Jurnal Kas</h1>
            <Badge variant="neutral" size="sm">
              {transactions.length} Transaksi Terdata
            </Badge>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Pencatatan kas masuk & keluar, simpanan anggota, serta perdagangan komoditas 8 sektor riil KOPSIM.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDdlModal(true)}
            leftIcon={<Code className="w-3.5 h-3.5 text-stone-600" />}
          >
            DDL & RLS
          </Button>

          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenAddModal}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Tambah Transaksi
            </Button>
          )}
        </div>
      </div>

      {/* Supabase Status Banner */}
      {metaInfo && (
        <div
          className={`p-3.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
            metaInfo.isConnected
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {metaInfo.isConnected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Database className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="font-semibold">
                Status Supabase (public.transactions):{' '}
              </span>
              <span>
                {metaInfo.isConnected
                  ? `Terhubung aktif (${metaInfo.totalDbRows} baris di PostgreSQL, latensi: ${metaInfo.latencyMs}ms)`
                  : 'Mode Offline / Local Storage (Database belum dikonfigurasi / belum disinkronkan)'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={handleSeedData}
              isLoading={isSeeding}
              leftIcon={<UploadCloud className="w-3 h-3" />}
            >
              Sinkronkan Data ke Supabase
            </Button>
          </div>
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Total Kas Masuk
          </span>
          <span className="text-xl font-bold text-emerald-950 font-serif mt-1 block">
            {formatRupiah(totalMasuk)}
          </span>
          <span className="text-[10px] text-emerald-600 mt-1 block">
            Simpanan anggota & penjualan komoditas
          </span>
        </Card>

        <Card className="p-4 bg-rose-50/50 border-rose-200">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">
            Total Kas Keluar
          </span>
          <span className="text-xl font-bold text-rose-950 font-serif mt-1 block">
            {formatRupiah(totalKeluar)}
          </span>
          <span className="text-[10px] text-rose-600 mt-1 block">
            Biaya operasional & pembelian komoditas
          </span>
        </Card>

        <Card className="p-4 bg-stone-50 border-stone-200">
          <span className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider block">
            Surplus / Saldo Bersih
          </span>
          <span className={`text-xl font-bold font-serif mt-1 block ${netBalance >= 0 ? 'text-emerald-950' : 'text-rose-900'}`}>
            {formatRupiah(netBalance)}
          </span>
          <span className="text-[10px] text-stone-500 mt-1 block">
            Arus kas bersih periode transaksi
          </span>
        </Card>
      </div>

      {/* Filter Tabs and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Semua ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab('PUSAT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'PUSAT'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Koperasi Pusat
            </button>
            <button
              onClick={() => setActiveTab('CABANG')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'CABANG'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Koperasi Cabang
            </button>
            <button
              onClick={() => setActiveTab('PROJECT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'PROJECT'
                  ? 'bg-white text-amber-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              8 Sektor Proyek Riil
            </button>
          </div>

          {/* Controls: Jenis filter and Search */}
          <div className="flex items-center gap-2">
            <select
              value={jenisFilter}
              onChange={(e: any) => setJenisFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
            >
              <option value="ALL">Semua Jenis (Masuk & Keluar)</option>
              <option value="MASUK">Penerimaan (MASUK)</option>
              <option value="KELUAR">Pengeluaran (KELUAR)</option>
            </select>

            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari ID, akun, komoditas..."
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
                  <th className="py-2.5 px-3">Referal / Entitas</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Akun / Anggota</th>
                  <th className="py-2.5 px-3">Produk / QTY</th>
                  <th className="py-2.5 px-3 text-center">Jenis</th>
                  <th className="py-2.5 px-3 text-right">Nominal</th>
                  <th className="py-2.5 px-3 text-center">Lampiran</th>
                  <th className="py-2.5 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-950">{t.id}</td>
                    <td className="py-3 px-3 text-stone-600">{formatDateIndo(t.tanggal)}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-stone-800 block">{t.plantation}</span>
                      <span className="text-[10px] text-stone-500 block font-mono">{t.referal}</span>
                    </td>
                    <td className="py-3 px-3 text-stone-600">{t.kategori}</td>
                    <td className="py-3 px-3 font-medium text-stone-800">
                      {t.akun || (t.referal === 'PROJECT' ? 'DANA PROJECT' : '-')}
                    </td>
                    <td className="py-3 px-3 text-stone-700">
                      {t.sku_name ? (
                        <div>
                          <span className="font-medium text-stone-900 block">{t.sku_name}</span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {t.qty || 1} unit {t.harga_satuan ? `@ ${formatRupiah(t.harga_satuan)}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant={t.jenis === 'MASUK' ? 'success' : 'danger'} size="sm">
                        {t.jenis}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-stone-900 font-serif">
                      {formatRupiah(t.jumlah)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {t.filelink ? (
                        <a
                          href={t.filelink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-medium underline"
                          title="Buka Lampiran"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Lihat</span>
                        </a>
                      ) : (
                        <span className="text-stone-400">-</span>
                      )}
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
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-800" />
                <h3 className="font-bold text-stone-900 font-serif">Detail Transaksi Supabase</h3>
              </div>
              <button onClick={() => setViewingTrx(null)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-stone-50 rounded-xl">
                <div>
                  <span className="text-stone-500 font-medium block">1. ID Transaksi</span>
                  <span className="font-bold font-mono text-emerald-950">{viewingTrx.id}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">1. Tanggal Transaksi</span>
                  <span className="font-semibold text-stone-900">{formatDateIndo(viewingTrx.tanggal)}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">2. Referal Area</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.referal}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">3. Entitas / Project</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.plantation}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-stone-500 font-medium block">4. Jenis Transaksi</span>
                  <Badge variant={viewingTrx.jenis === 'MASUK' ? 'success' : 'danger'} size="sm">
                    {viewingTrx.jenis}
                  </Badge>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">5. Kategori</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.kategori}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">6. Sumber Dana (Rekening)</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.metode_bayar}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-medium block">8. Akun / Anggota / Project</span>
                  <span className="font-semibold text-stone-900">{viewingTrx.akun || '-'}</span>
                </div>
              </div>

              {viewingTrx.referal === 'PROJECT' && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-amber-900 uppercase block">
                    11. Kalkulasi Komoditas Project
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-stone-500 font-medium block">11.1 Produk:</span>
                      <span className="font-semibold text-stone-900">{viewingTrx.sku_name || '-'}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 font-medium block">11.2 QTY:</span>
                      <span className="font-semibold text-stone-900">{viewingTrx.qty || 1}</span>
                    </div>
                    <div>
                      <span className="text-stone-500 font-medium block">11.3 Harga Satuan:</span>
                      <span className="font-semibold text-stone-900">{formatRupiah(viewingTrx.harga_satuan || 0)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
                <span className="font-semibold text-emerald-900">7. Total Nominal Transaksi (Rp):</span>
                <span className="text-base font-bold text-emerald-950 font-serif">
                  {formatRupiah(viewingTrx.jumlah)}
                </span>
              </div>

              {viewingTrx.keterangan && (
                <div>
                  <span className="text-stone-500 font-medium block">9. Keterangan:</span>
                  <p className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 mt-1">
                    {viewingTrx.keterangan}
                  </p>
                </div>
              )}

              {viewingTrx.filelink && (
                <div>
                  <span className="text-stone-500 font-medium block">10. Lampiran File:</span>
                  <a
                    href={viewingTrx.filelink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-medium underline mt-1"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Lihat / Unduh Dokumen Bukti Transaksi</span>
                  </a>
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

      {/* ========================================================================= */}
      {/* 11-STEP INPUT / EDIT MODAL FORM (STRICT ORDER 1 TO 11)                   */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 font-serif text-base">
                  {editingTrx ? `Edit Transaksi: ${editingTrx.id}` : 'Form Tambah Transaksi (11 Urutan Kolom)'}
                </h3>
                <p className="text-[11px] text-stone-500">
                  Data otomatis tersinkronisasi dan disimpan ke tabel PostgreSQL <code>public.transactions</code> di Supabase.
                </p>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              {/* 1. TANGGAL TRANSAKSI & 2. REFERAL AREA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-stone-800 font-semibold mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                    <span>1. Tanggal Transaksi *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white transition-colors"
                  />
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Masuk ke kolom: <code>transaction_date</code>
                  </span>
                </div>

                <div>
                  <label className="block text-stone-800 font-semibold mb-1 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-800" />
                    <span>2. Referal Area *</span>
                  </label>
                  <select
                    value={formReferal}
                    onChange={(e: any) => {
                      const val = e.target.value as 'KOPERASI' | 'PROJECT';
                      setFormReferal(val);
                      if (val === 'PROJECT') {
                        setFormPlantation('TRADING IKAN');
                        setFormAkun('DANA PROJECT');
                        setFormSkuName('Ikan Tuna Segar Tangkap Laut (Yellowfin)');
                        setFormHargaSatuan(65000);
                        setFormQty(1);
                      } else {
                        setFormPlantation('PUSAT JAKARTA');
                        setFormAkun('Kas Umum Koperasi (Non-Anggota)');
                        setFormSkuName('');
                        setFormHargaSatuan(0);
                        setFormJumlah(500000);
                      }
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white transition-colors font-medium text-stone-900"
                  >
                    <option value="KOPERASI">KOPERASI</option>
                    <option value="PROJECT">PROJECT</option>
                  </select>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Masuk ke kolom: <code>referral_type</code>
                  </span>
                </div>
              </div>

              {/* 3. ENTITAS / PROJECT & 4. JENIS TRANSAKSI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-stone-800 font-semibold mb-1 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-emerald-800" />
                    <span>3. Entitas / Project *</span>
                  </label>
                  {formReferal === 'PROJECT' ? (
                    <select
                      value={formPlantation}
                      onChange={(e) => {
                        const entity = e.target.value;
                        setFormPlantation(entity);
                        // Auto-set first commodity product for this project
                        const prods = projectProductsMap[entity];
                        if (prods && prods.length > 0) {
                          setFormSkuName(prods[0].name);
                          setFormHargaSatuan(prods[0].defaultPrice);
                        }
                      }}
                      className="w-full px-3 py-2 bg-amber-50/60 border border-amber-300 rounded-lg focus:outline-hidden focus:border-amber-700 focus:bg-white transition-colors font-semibold text-stone-900"
                    >
                      <option value="TRADING IKAN">TRADING IKAN</option>
                      <option value="PERTANIAN">PERTANIAN</option>
                      <option value="GARAM">GARAM</option>
                      <option value="MINYAK MERAH">MINYAK MERAH</option>
                      <option value="PLYWOOD">PLYWOOD</option>
                      <option value="DISTRIBUTOR MEATSHOP">DISTRIBUTOR MEATSHOP</option>
                      <option value="SUPPLIER MBG">SUPPLIER MBG</option>
                      <option value="KAMPUNG HAJI">KAMPUNG HAJI</option>
                    </select>
                  ) : (
                    <select
                      value={formPlantation}
                      onChange={(e) => setFormPlantation(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white transition-colors font-semibold text-stone-900"
                    >
                      <option value="PUSAT JAKARTA">PUSAT JAKARTA</option>
                      <option value="CABANG JAWA BARAT">CABANG JAWA BARAT</option>
                      <option value="CABANG JAWA TIMUR">CABANG JAWA TIMUR</option>
                      <option value="CABANG JAWA TENGAH">CABANG JAWA TENGAH</option>
                      <option value="CABANG SUMATERA">CABANG SUMATERA</option>
                    </select>
                  )}
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Masuk ke kolom: <code>area_name</code>
                  </span>
                </div>

                <div>
                  <label className="block text-stone-800 font-semibold mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-800" />
                    <span>4. Jenis Transaksi *</span>
                  </label>
                  <select
                    value={formJenis}
                    onChange={(e: any) => {
                      const newJenis = e.target.value as 'MASUK' | 'KELUAR';
                      setFormJenis(newJenis);
                      if (newJenis === 'MASUK') {
                        setFormKategori(formReferal === 'PROJECT' ? 'Penjualan Komoditas Riil' : 'Simpanan Pokok Anggota');
                      } else {
                        setFormKategori(formReferal === 'PROJECT' ? 'Pembelian Bahan Baku / Komoditas' : 'Biaya Operasional Kantor');
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-hidden font-bold transition-colors ${
                      formJenis === 'MASUK'
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                        : 'bg-rose-50/70 border-rose-300 text-rose-950'
                    }`}
                  >
                    <option value="MASUK">MASUK (Penerimaan / Penjualan / Setoran)</option>
                    <option value="KELUAR">KELUAR (Pengeluaran / Pembelian / Biaya)</option>
                  </select>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Masuk ke kolom: <code>transaction_type</code>
                  </span>
                </div>
              </div>

              {/* 5. KATEGORI & 6. SUMBER DANA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-stone-800 font-semibold mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-800" />
                    <span>5. Kategori *</span>
                  </label>
                  <select
                    value={formKategori}
                    onChange={(e) => setFormKategori(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white transition-colors"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Masuk ke kolom: <code>category_name</code>
                  </span>
                </div>

                <div>
                  <label className="block text-stone-800 font-semibold mb-1 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-800" />
                    <span>6. Sumber Dana *</span>
                  </label>
                  <select
                    value={formMetodeBayar}
                    onChange={(e) => setFormMetodeBayar(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white transition-colors"
                  >
                    {availableBankAccounts.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Masuk ke kolom: <code>payment_method</code>
                  </span>
                </div>
              </div>

              {/* 7. TOTAL NOMINAL TRANSAKSI (Rp) - (Jika KOPERASI muncul biasa, Jika PROJECT otomatis dari 11.4) */}
              {formReferal === 'KOPERASI' && (
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-xl">
                  <label className="block text-emerald-950 font-bold text-xs mb-1">
                    7. Total Nominal Transaksi (Rp) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 font-bold text-stone-500">Rp</span>
                    <input
                      type="number"
                      min="1000"
                      step="1000"
                      required
                      value={formJumlah}
                      onChange={(e) => setFormJumlah(Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2 bg-white border border-emerald-300 rounded-lg focus:outline-hidden focus:border-emerald-700 font-mono font-bold text-base text-emerald-950"
                    />
                  </div>
                  <span className="text-[10px] text-emerald-800 mt-1 block">
                    Masuk ke kolom: <code>amount</code> (Nilai: {formatRupiah(formJumlah)})
                  </span>
                </div>
              )}

              {/* 8. AKUN / ANGGOTA / PROJECT */}
              <div>
                <label className="block text-stone-800 font-semibold mb-1 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-800" />
                  <span>8. Akun / Anggota / Project *</span>
                </label>
                {formReferal === 'PROJECT' ? (
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-center justify-between">
                    <span className="font-mono font-bold text-amber-950">DANA PROJECT</span>
                    <Badge variant="warning" size="sm">
                      Otomatis untuk Referal Project
                    </Badge>
                  </div>
                ) : (
                  <select
                    value={formAkun}
                    onChange={(e) => setFormAkun(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white transition-colors"
                  >
                    <option value="Kas Umum Koperasi (Non-Anggota)">Kas Umum Koperasi (Non-Anggota)</option>
                    <option value="Pengurus / Manajemen Pusat">Pengurus / Manajemen Pusat</option>
                    {filteredMembersForArea.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} ({m.id} - {m.plantation})
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Masuk ke kolom: <code>account_name_legacy</code>
                </span>
              </div>

              {/* 11. KALKULASI KOMODITAS PROJECT (HANYA MUNCUL SAAT REFERAL AREA = PROJECT) */}
              {formReferal === 'PROJECT' && (
                <div className="p-4 bg-amber-50/80 border-2 border-amber-300 rounded-2xl space-y-3.5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-amber-800" />
                      <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        11. Kalkulasi Komoditas Project ({formPlantation})
                      </span>
                    </div>
                    <Badge variant="warning" size="sm">
                      Khusus Referal PROJECT
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* 11.1 NAMA PRODUK */}
                    <div className="sm:col-span-1">
                      <label className="block text-[11px] text-stone-800 font-semibold mb-1">
                        11.1 Nama Produk *
                      </label>
                      <select
                        value={formSkuName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormSkuName(val);
                          const matched = availableProductsForProject.find((p) => p.name === val);
                          if (matched) {
                            setFormHargaSatuan(matched.defaultPrice);
                          }
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-hidden text-xs text-stone-900 font-medium"
                      >
                        {availableProductsForProject.map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] text-amber-800 mt-0.5 block">
                        Masuk ke: <code>product_name</code>
                      </span>
                    </div>

                    {/* 11.2 QTY */}
                    <div>
                      <label className="block text-[11px] text-stone-800 font-semibold mb-1">
                        11.2 QTY (Volume) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={formQty}
                        onChange={(e) => setFormQty(Math.max(1, Number(e.target.value)))}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-hidden text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] text-amber-800 mt-0.5 block">
                        Masuk ke: <code>qty</code>
                      </span>
                    </div>

                    {/* 11.3 HARGA SATUAN */}
                    <div>
                      <label className="block text-[11px] text-stone-800 font-semibold mb-1">
                        11.3 Harga Satuan (Rp) *
                      </label>
                      <input
                        type="number"
                        min="100"
                        step="500"
                        required
                        value={formHargaSatuan}
                        onChange={(e) => setFormHargaSatuan(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-hidden text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] text-amber-800 mt-0.5 block">
                        Masuk ke: <code>price</code>
                      </span>
                    </div>
                  </div>

                  {/* 11.4 AMOUNT: LOGIS QTY x HARGA SATUAN */}
                  <div className="p-3 bg-white border border-amber-300 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-amber-950 block">
                        11.4 TOTAL AMOUNT (QTY × Harga Satuan):
                      </span>
                      <span className="text-[10px] text-stone-500 font-mono">
                        {formQty} unit × {formatRupiah(formHargaSatuan)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-950 font-serif">
                        {formatRupiah(formQty * formHargaSatuan)}
                      </span>
                      <span className="text-[10px] text-emerald-800 block">
                        Otomatis masuk ke kolom: <code>amount</code>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 9. KETERANGAN */}
              <div>
                <label className="block text-stone-800 font-semibold mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-800" />
                  <span>9. Keterangan / Uraian</span>
                </label>
                <textarea
                  rows={2}
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  placeholder="Tuliskan uraian transaksi, nomor invoice, atau catatan pembukuan..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white resize-none transition-colors"
                />
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Masuk ke kolom: <code>description</code>
                </span>
              </div>

              {/* 10. LAMPIRAN FILE */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <label className="block text-stone-800 font-semibold text-xs flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-emerald-800" />
                  <span>10. Lampiran File (Nota / Kuitansi / Bukti Bayar)</span>
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,.pdf"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<UploadCloud className="w-3 h-3" />}
                  >
                    Pilih File Foto / Dokumen
                  </Button>

                  {formFilelink ? (
                    <div className="flex items-center gap-2 text-[11px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="font-medium truncate max-w-[200px]">{fileName || 'File Terlampir'}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormFilelink('');
                          setFileName('');
                        }}
                        className="text-stone-400 hover:text-rose-600 ml-1"
                        title="Hapus file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-stone-400 italic">
                      Belum ada file dipilih (tersimpan di public\assets\uploadfile)
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-stone-500 block">
                  Masuk ke kolom: <code>file_url</code>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsFormOpen(false)}>
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmitting}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  {editingTrx ? 'Simpan Perubahan' : 'Simpan Transaksi ke Supabase'}
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
