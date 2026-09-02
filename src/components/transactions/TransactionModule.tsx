import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { transactionService, TransactionsMetaResult, TRANSACTIONS_SQL_DDL, SplitCategoryItem } from '../../services/transactionService';
import { masterDataService } from '../../services/masterDataService';
import { memberService } from '../../services/memberService';
import { productService, ProductItem } from '../../services/productService';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import {
  validateAndOptimizeProofImage,
  generateStorageProofPath,
  uploadTransactionProof,
  deleteTransactionProof,
  getPublicProofUrl,
  isImageFile,
  isPdfFile,
  ProofOptimizationResult,
  STORAGE_BUKTI_TRANSFER_SQL_DDL,
} from '../../services/storageService';
import { TransactionRecord, CustomerRecord, SupplierRecord, MemberRecord } from '../../types/database';
import { formatDateIndo, formatRupiah, cleanRupiah } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { Pagination } from '../common/Pagination';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { Modal } from '../common/Modal';
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
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Printer,
  FolderSearch,
  FileCheck,
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');
  const [jenisFilter, setJenisFilter] = useState<'ALL' | 'MASUK' | 'KELUAR'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [financialSummary, setFinancialSummary] = useState<{
    totalMasuk: number;
    totalKeluar: number;
    netBalance: number;
  }>({
    totalMasuk: 0,
    totalKeluar: 0,
    netBalance: 0,
  });

  const searchRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingTrx, setEditingTrx] = useState<TransactionRecord | null>(null);
  const [viewingTrx, setViewingTrx] = useState<TransactionRecord | null>(null);
  const [viewingProofSignedUrl, setViewingProofSignedUrl] = useState<string | null>(null);
  const [isLoadingProofSignedUrl, setIsLoadingProofSignedUrl] = useState<boolean>(false);
  const [quickProofTrx, setQuickProofTrx] = useState<TransactionRecord | null>(null);
  const [quickProofUrl, setQuickProofUrl] = useState<string | null>(null);
  const [isLoadingQuickProof, setIsLoadingQuickProof] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showDdlModal, setShowDdlModal] = useState<boolean>(false);
  const [activeSqlTab, setActiveSqlTab] = useState<'transactions' | 'storage'>('transactions');
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [deletingTrxId, setDeletingTrxId] = useState<string | null>(null);

  // Form inputs (11 Form Fields in exact order matching user specification)
  // 1. Tanggal Transaksi -> transaction_date
  const [formTanggal, setFormTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  // 2. Referal Area -> referral_type ('KOPERASI' | 'PROJECT')
  const [formReferal, setFormReferal] = useState<'KOPERASI' | 'PROJECT'>('KOPERASI');
  // 3. Entitas / Project -> area_name
  const [formPlantation, setFormPlantation] = useState<string>('');
  // 4. Jenis Transaksi -> transaction_type ('MASUK' | 'KELUAR')
  const [formJenis, setFormJenis] = useState<'MASUK' | 'KELUAR'>('MASUK');
  // 5. Kategori -> category_name
  const [formKategori, setFormKategori] = useState<string>('');
  // 6. Sumber Dana -> payment_method
  const [formMetodeBayar, setFormMetodeBayar] = useState<string>('');
  // 7. Total Nominal Transaksi -> amount
  const [formJumlah, setFormJumlah] = useState<number>(0);
  // 8. Akun / Anggota / Project -> account_name_legacy
  const [formAkun, setFormAkun] = useState<string>('Kas Umum Koperasi (Non-Anggota)');
  // 9. Keterangan -> description
  const [formKeterangan, setFormKeterangan] = useState<string>('');
  // 10. Lampiran File -> file_url (Supabase Storage: bukti_transfer)
  const [formFilelink, setFormFilelink] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [optimizedProof, setOptimizedProof] = useState<ProofOptimizationResult | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isOptimizingProof, setIsOptimizingProof] = useState<boolean>(false);
  const [proofError, setProofError] = useState<string | null>(null);
  // 11. Kalkulasi Komoditas Project (11.1 s/d 11.4)
  const [formSkuName, setFormSkuName] = useState<string>('');
  const [formQty, setFormQty] = useState<number>(1);
  const [formHargaSatuan, setFormHargaSatuan] = useState<number>(0);

  // Multi-Category Split State (1 Bukti Transfer -> Banyak Pos Pembukuan Transaksi)
  const [isSplitMode, setIsSplitMode] = useState<boolean>(false);
  const [splitItems, setSplitItems] = useState<SplitCategoryItem[]>([
    { category_name: '', amount: 0, description: '' },
    { category_name: '', amount: 0, description: '' },
    { category_name: '', amount: 0, description: '' },
  ]);

  const handleAddSplitRow = () => {
    setSplitItems((prev) => [...prev, { category_name: '', amount: 0, description: '' }]);
  };

  const handleRemoveSplitRow = (index: number) => {
    if (splitItems.length <= 1) {
      showToast('Minimal harus ada 1 baris pos kategori dalam mode split.', 'warning');
      return;
    }
    setSplitItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSplitRow = (index: number, field: keyof SplitCategoryItem, value: any) => {
    setSplitItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const totalSplitAmount = useMemo(() => {
    return splitItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [splitItems]);

  // 4 Cascading Dropdown States & Anti-Fail Trackers
  // Field 3: Entitas / Project (from public.areas where referral_type = formReferal)
  const [areaOptions, setAreaOptions] = useState<string[]>([]);
  const [isLoadingAreas, setIsLoadingAreas] = useState<boolean>(false);
  const [areaError, setAreaError] = useState<string | null>(null);

  // Field 6: Sumber Dana (from public.areas where area_name = formPlantation: bank_account_1, 2, 3)
  const [bankOptions, setBankOptions] = useState<string[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [bankError, setBankError] = useState<string | null>(null);

  // Field 5: Kategori (from public.transaction_categories where type = formJenis)
  const [categoryOptionsList, setCategoryOptionsList] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Field 11.1: Nama Produk / SKU (from public.products where group_name = formPlantation)
  const [projectProducts, setProjectProducts] = useState<ProductItem[]>([]);
  const [isLoadingProjectProducts, setIsLoadingProjectProducts] = useState<boolean>(false);
  const [productError, setProductError] = useState<string | null>(null);

  // Optional customer / supplier link
  const [formCustomerId, setFormCustomerId] = useState<string>('');
  const [formSupplierId, setFormSupplierId] = useState<string>('');

  // Storage bucket search & recovery states
  const [isSearchingStorageId, setIsSearchingStorageId] = useState<string | null>(null);
  const [isScanningAllStorage, setIsScanningAllStorage] = useState<boolean>(false);

  // Kuitansi Modal State
  const [selectedKuitansi, setSelectedKuitansi] = useState<TransactionRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = role === 'ADMIN';
  const canEdit = role === 'ADMIN';
  const canDelete = role === 'ADMIN';
  const canUpload = role === 'ADMIN';

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

  // Debounce 400ms on search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const executeSearch = async (showInitialLoading = false) => {
    if (showInitialLoading) setIsLoading(true);
    setIsSearching(true);
    setSearchError(null);

    // Abort previous in-flight request to prevent race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentReqId = ++searchRequestIdRef.current;

    try {
      const res = await transactionService.searchTransactionsServer({
        searchQuery: debouncedSearchQuery,
        tabFilter: activeTab,
        jenisFilter: jenisFilter,
        page: currentPage,
        pageSize: pageSize,
        signal: controller.signal,
      });

      // Discard stale response if a newer request was dispatched
      if (currentReqId !== searchRequestIdRef.current) {
        return;
      }

      setTransactions(res.data);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
      setFinancialSummary({
        totalMasuk: res.totalMasuk,
        totalKeluar: res.totalKeluar,
        netBalance: res.netBalance,
      });
      setMetaInfo((prev) => ({
        data: res.data,
        source: res.source,
        isConfigured: prev?.isConfigured ?? true,
        isConnected: res.source === 'SUPABASE',
        totalDbRows: res.totalCount,
        latencyMs: res.latencyMs,
        errorMessage: res.errorMessage,
      }));
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      if (currentReqId === searchRequestIdRef.current) {
        setSearchError(err.message || 'Gagal memuat data transaksi dari server.');
      }
    } finally {
      if (currentReqId === searchRequestIdRef.current) {
        setIsSearching(false);
        if (showInitialLoading) setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    executeSearch(isLoading);
  }, [debouncedSearchQuery, activeTab, jenisFilter, currentPage, pageSize]);

  // Load auxiliary master data (members, customers, suppliers) on mount
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const memberList = await memberService.getMembers();
        setMembers(memberList);
        setCustomers(transactionService.getCustomers());
        setSuppliers(transactionService.getSuppliers());
      } catch (err) {
        console.warn('Failed to load aux data:', err);
      }
    };
    loadAuxData();
  }, []);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      const res = await masterDataService.seedTableToSupabase('transactions');
      if (res.success) {
        showToast(`Berhasil menyinkronkan ${res.count} transaksi ke Supabase!`, 'success');
        await executeSearch(true);
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
    const textToCopy = activeSqlTab === 'transactions' ? TRANSACTIONS_SQL_DDL : STORAGE_BUKTI_TRANSFER_SQL_DDL;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSql(true);
    showToast(
      activeSqlTab === 'transactions'
        ? 'Skrip SQL DDL & Kebijakan RLS tabel transactions disalin ke clipboard!'
        : 'Skrip SQL Storage & Kebijakan RLS bucket bukti_transfer disalin ke clipboard!',
      'success'
    );
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // 11.4: Update jumlah automatically when qty or hargaSatuan changes in project mode
  useEffect(() => {
    if (formReferal === 'PROJECT') {
      const calculated = (formQty || 0) * (formHargaSatuan || 0);
      setFormJumlah(calculated);
    }
  }, [formQty, formHargaSatuan, formReferal]);

  // Step 8: Members belonging to selected work area (for KOPERASI)
  const filteredMembersForArea = useMemo(() => {
    if (formReferal === 'PROJECT' || !formPlantation) return [];
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

  // =========================================================================
  // 4 CASCADING DROPDOWN FETCHERS & ANTI-FAIL LOGIC (Supabase + Offline Fallbacks)
  // =========================================================================

  // 1. FIELD 3: Fetch areas based on referral_type ('KOPERASI' | 'PROJECT')
  const fetchAreaOptions = useCallback(async (referralType: 'KOPERASI' | 'PROJECT') => {
    setIsLoadingAreas(true);
    setAreaError(null);
    try {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured) {
        const { data, error } = await client
          .from('areas')
          .select('area_name')
          .eq('referral_type', referralType)
          .order('area_name', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          const uniqueAreas = Array.from(
            new Set(data.map((d: any) => String(d.area_name || '').trim()).filter(Boolean))
          );
          if (uniqueAreas.length > 0) {
            setAreaOptions(uniqueAreas);
            return;
          }
        }
      }
      // Offline fallback
      const fallback = referralType === 'PROJECT'
        ? ['TRADING IKAN', 'PERTANIAN', 'GARAM', 'MINYAK MERAH', 'PLYWOOD', 'DISTRIBUTOR MEATSHOP', 'SUPPLIER MBG', 'KAMPUNG HAJI']
        : ['PUSAT JAKARTA', 'CABANG JAWA BARAT', 'CABANG JAWA TIMUR', 'CABANG JAWA TENGAH', 'CABANG SUMATERA'];
      setAreaOptions(fallback);
    } catch (err: any) {
      console.warn('[TransactionModule] Gagal query public.areas:', err);
      setAreaError('Gagal memuat daftar entitas dari database.');
      const fallback = referralType === 'PROJECT'
        ? ['TRADING IKAN', 'PERTANIAN', 'GARAM', 'MINYAK MERAH', 'PLYWOOD', 'DISTRIBUTOR MEATSHOP', 'SUPPLIER MBG', 'KAMPUNG HAJI']
        : ['PUSAT JAKARTA', 'CABANG JAWA BARAT', 'CABANG JAWA TIMUR', 'CABANG JAWA TENGAH', 'CABANG SUMATERA'];
      setAreaOptions(fallback);
    } finally {
      setIsLoadingAreas(false);
    }
  }, []);

  // 2. FIELD 6: Fetch bank accounts based on selected area_name
  const fetchBankAccountsForArea = useCallback(async (areaName: string) => {
    if (!areaName) {
      setBankOptions([]);
      setBankError(null);
      return;
    }
    setIsLoadingBanks(true);
    setBankError(null);
    try {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured) {
        const { data, error } = await client
          .from('areas')
          .select('bank_account_1, bank_account_2, bank_account_3')
          .eq('area_name', areaName)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const accs = [data.bank_account_1, data.bank_account_2, data.bank_account_3]
            .map((s) => (s ? String(s).trim() : ''))
            .filter((s) => s.length > 0);
          
          if (accs.length > 0) {
            setBankOptions(accs);
            return;
          }
        }
      }
      // Offline / entityBankMap fallback
      const fallbackAccs = (entityBankMap[areaName] || []).filter(Boolean);
      setBankOptions(fallbackAccs);
    } catch (err: any) {
      console.warn('[TransactionModule] Gagal query rekening di public.areas:', err);
      setBankError('Gagal memuat rekening entitas.');
      const fallbackAccs = (entityBankMap[areaName] || []).filter(Boolean);
      setBankOptions(fallbackAccs);
    } finally {
      setIsLoadingBanks(false);
    }
  }, []);

  // 3. FIELD 5: Fetch categories based on transaction_type ('MASUK' | 'KELUAR')
  const fetchCategoriesForType = useCallback(async (trxType: 'MASUK' | 'KELUAR') => {
    setIsLoadingCategories(true);
    setCategoryError(null);
    try {
      const client = getSupabaseClient();
      if (client && isSupabaseConfigured) {
        const { data, error } = await client
          .from('transaction_categories')
          .select('name')
          .eq('type', trxType)
          .order('name', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          const catNames = Array.from(
            new Set(data.map((d: any) => String(d.name || '').trim()).filter(Boolean))
          );
          if (catNames.length > 0) {
            setCategoryOptionsList(catNames);
            return;
          }
        }
      }
      // Offline fallback
      const fallbackCats = trxType === 'MASUK'
        ? [
            'Simpanan Pokok Anggota',
            'Simpanan Wajib Anggota',
            'Simpanan Sukarela / Manasuka',
            'Penjualan Komoditas Riil',
            'Penerimaan Termin Proyek',
            'Penerimaan Kas & Pendapatan Lain',
          ]
        : [
            'Biaya Operasional Kantor',
            'Pembelian Bahan Baku / Komoditas',
            'Pengadaan Sarana & Alat Kerja',
            'Honor & Upah Petani / Nelayan',
            'Biaya Logistik & Distribusi',
            'Bagi Hasil / Penyaluran Dana',
            'Biaya Pajak & Administrasi Bank',
          ];
      setCategoryOptionsList(fallbackCats);
    } catch (err: any) {
      console.warn('[TransactionModule] Gagal query public.transaction_categories:', err);
      setCategoryError('Gagal memuat kategori transaksi.');
      const fallbackCats = trxType === 'MASUK'
        ? [
            'Simpanan Pokok Anggota',
            'Simpanan Wajib Anggota',
            'Simpanan Sukarela / Manasuka',
            'Penjualan Komoditas Riil',
            'Penerimaan Termin Proyek',
            'Penerimaan Kas & Pendapatan Lain',
          ]
        : [
            'Biaya Operasional Kantor',
            'Pembelian Bahan Baku / Komoditas',
            'Pengadaan Sarana & Alat Kerja',
            'Honor & Upah Petani / Nelayan',
            'Biaya Logistik & Distribusi',
            'Bagi Hasil / Penyaluran Dana',
            'Biaya Pajak & Administrasi Bank',
          ];
      setCategoryOptionsList(fallbackCats);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // 4. FIELD 11.1: Fetch commodity products for selected Project entity
  const fetchProductsForProject = useCallback(async (projectName: string) => {
    if (!projectName) {
      setProjectProducts([]);
      setProductError(null);
      return;
    }
    setIsLoadingProjectProducts(true);
    setProductError(null);
    try {
      const prods = await productService.getProductsByProject(projectName);
      setProjectProducts(prods);
    } catch (err: any) {
      console.warn('[TransactionModule] Gagal query public.products:', err);
      setProductError('Gagal memuat daftar produk.');
      const fallbackList = projectProductsMap[projectName] || [];
      setProjectProducts(
        fallbackList.map((p, idx) => ({
          id: `FALLBACK-${idx}`,
          sku_code: `SKU-${idx + 1}`,
          sku_name: p.name,
          group_id: 'GRP',
          group_name: projectName,
          subgroup: '',
          brand: '',
          grade: 'Grade A',
          packaging: 'Standard',
          availability: 'Tersedia',
          moq: 1,
          supply_capacity: '',
          defaultPrice: p.defaultPrice,
          unit: p.unit,
        }))
      );
    } finally {
      setIsLoadingProjectProducts(false);
    }
  }, []);

  // Cascading Effect Triggers
  useEffect(() => {
    fetchAreaOptions(formReferal);
  }, [formReferal, fetchAreaOptions]);

  useEffect(() => {
    if (formPlantation) {
      fetchBankAccountsForArea(formPlantation);
      if (formReferal === 'PROJECT') {
        fetchProductsForProject(formPlantation);
      }
    } else {
      setBankOptions([]);
      setProjectProducts([]);
    }
  }, [formPlantation, formReferal, fetchBankAccountsForArea, fetchProductsForProject]);

  useEffect(() => {
    fetchCategoriesForType(formJenis);
  }, [formJenis, fetchCategoriesForType]);

  // Cascading Change Handlers with Strict Reset Rules
  const handleReferalChange = (newReferal: 'KOPERASI' | 'PROJECT') => {
    setFormReferal(newReferal);
    // WAJIB: Reset Field 3, Field 6, dan Field 11.1 saat Field 2 berubah
    setFormPlantation('');
    setFormMetodeBayar('');
    setFormSkuName('');
    setFormHargaSatuan(0);
    setFormQty(1);
    setFormJumlah(0);
    if (newReferal === 'PROJECT') {
      setFormAkun('DANA PROJECT');
    } else {
      setFormAkun('Kas Umum Koperasi (Non-Anggota)');
    }
  };

  const handlePlantationChange = (newAreaName: string) => {
    setFormPlantation(newAreaName);
    // WAJIB: Reset Field 6 dan Field 11.1 saat Field 3 berubah
    setFormMetodeBayar('');
    setFormSkuName('');
    setFormHargaSatuan(0);
  };

  const handleJenisChange = (newJenis: 'MASUK' | 'KELUAR') => {
    setFormJenis(newJenis);
    // WAJIB: Reset Field 5 saat Field 4 berubah
    setFormKategori('');
  };

  const handleSkuNameChange = (newSkuName: string) => {
    setFormSkuName(newSkuName);
    const matched = projectProducts.find(
      (p) => p.sku_name === newSkuName || p.sku_code === newSkuName
    );
    if (matched) {
      setFormHargaSatuan(matched.defaultPrice || 0);
    } else {
      setFormHargaSatuan(0);
    }
  };

  // Load public URL when viewing transaction detail
  useEffect(() => {
    if (viewingTrx?.filelink) {
      const url = getPublicProofUrl(viewingTrx.filelink);
      setViewingProofSignedUrl(url || null);
      setIsLoadingProofSignedUrl(false);
    } else {
      setViewingProofSignedUrl(null);
      setIsLoadingProofSignedUrl(false);
    }
  }, [viewingTrx]);

  const handleOpenQuickProof = async (t: TransactionRecord) => {
    setQuickProofTrx(t);
    if (t.filelink) {
      const url = getPublicProofUrl(t.filelink);
      setQuickProofUrl(url || null);
      setIsLoadingQuickProof(false);
    } else {
      setQuickProofUrl(null);
      setIsLoadingQuickProof(false);
    }
  };

  const handleSearchBucketForTrx = async (t: TransactionRecord) => {
    setIsSearchingStorageId(t.id);
    try {
      const res = await transactionService.findAndLinkTransactionProof(t.id, t.tanggal);
      if (res.found && res.publicUrl) {
        showToast(`Berhasil! Ditemukan berkas bukti untuk ${t.id} di bucket storage dan dihubungkan ke transaksi.`, 'success');
        await executeSearch(false);
      } else {
        showToast(`Tidak ditemukan file bukti untuk ${t.id} di bucket storage. Silakan upload berkas baru jika diperlukan.`, 'warning');
      }
    } catch (err: any) {
      showToast(`Gagal mencari di bucket storage: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsSearchingStorageId(null);
    }
  };

  const handleScanAllStorage = async () => {
    setIsScanningAllStorage(true);
    try {
      const res = await transactionService.scanAndRecoverBucketProofs();
      if (res.recoveredCount > 0) {
        showToast(`Selesai scan storage: ${res.recoveredCount} bukti transfer berhasil ditemukan dan dihubungkan ke database!`, 'success');
        await executeSearch(false);
      } else {
        showToast(`Scan storage selesai: ${res.scannedCount} transaksi tanpa bukti diperiksa. Tidak ada berkas baru yang cocok.`, 'info');
      }
    } catch (err: any) {
      showToast(`Gagal scan storage: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsScanningAllStorage(false);
    }
  };

  const handleOpenReceipt = (t: TransactionRecord) => {
    setSelectedKuitansi(t);
  };

  const handleOpenAddModal = () => {
    setEditingTrx(null);
    setIsSplitMode(false);
    setSplitItems([
      { category_name: '', amount: 0, description: '' },
      { category_name: '', amount: 0, description: '' },
      { category_name: '', amount: 0, description: '' },
    ]);
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormReferal('KOPERASI');
    setFormPlantation('');
    setFormJenis('MASUK');
    setFormKategori('');
    setFormMetodeBayar('');
    setFormJumlah(0);
    setFormAkun('Kas Umum Koperasi (Non-Anggota)');
    setFormKeterangan('');
    setFormFilelink('');
    setFileName('');
    setSelectedProofFile(null);
    setOptimizedProof(null);
    setProofPreviewUrl(null);
    setProofError(null);
    setFormSkuName('');
    setFormQty(1);
    setFormHargaSatuan(0);
    setFormCustomerId('');
    setFormSupplierId('');
    fetchAreaOptions('KOPERASI');
    fetchCategoriesForType('MASUK');
    setIsFormOpen(true);
  };

  const handleOpenEditModal = (t: TransactionRecord) => {
    setEditingTrx(t);
    setIsSplitMode(false);
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
    setFileName(t.filelink ? (t.filelink.split('/').pop() || 'Lampiran Bukti Tersedia') : '');
    setSelectedProofFile(null);
    setOptimizedProof(null);
    setProofError(null);
    if (t.filelink) {
      setProofPreviewUrl(getPublicProofUrl(t.filelink));
    } else {
      setProofPreviewUrl(null);
    }
    setFormSkuName(t.sku_name || '');
    setFormQty(t.qty || 1);
    setFormHargaSatuan(t.harga_satuan || 0);
    setFormCustomerId(t.customer_id || '');
    setFormSupplierId(t.supplier_id || '');
    fetchAreaOptions(t.referal);
    fetchCategoriesForType(t.jenis);
    if (t.plantation) {
      fetchBankAccountsForArea(t.plantation);
      if (t.referal === 'PROJECT') {
        fetchProductsForProject(t.plantation);
      }
    }
    setIsFormOpen(true);
  };

  const handleProofFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUpload) {
      showToast('Akses Ditolak: Hanya akun Administrator (ADMIN) yang diizinkan mengunggah bukti transaksi ke Supabase Storage.', 'error');
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setProofError(null);
    setIsOptimizingProof(true);

    try {
      const result = await validateAndOptimizeProofImage(file);
      setSelectedProofFile(file);
      setOptimizedProof(result);
      setProofPreviewUrl(result.previewUrl);
      setFileName(file.name);
      setFormFilelink(''); // Will be replaced by Supabase Storage path upon upload
      showToast(
        `Gambar "${file.name}" siap diunggah (${(result.originalSize / 1024).toFixed(0)} KB → ${(result.optimizedSize / 1024).toFixed(0)} KB ${result.extension.toUpperCase()}).`,
        'info'
      );
    } catch (err: any) {
      setProofError(err.message || 'Gagal memproses file gambar.');
      showToast(err.message || 'File tidak valid.', 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsOptimizingProof(false);
    }
  };

  const handleRemoveProof = () => {
    setSelectedProofFile(null);
    setOptimizedProof(null);
    setProofPreviewUrl(null);
    setFormFilelink('');
    setFileName('');
    setProofError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. SPLIT MODE HANDLER (1 Bukti Transfer -> Banyak Pos Transaksi)
    if (!editingTrx && isSplitMode) {
      if (!formPlantation) {
        showToast('Silakan pilih Entitas / Project terlebih dahulu (Field 3).', 'error');
        return;
      }
      if (!formMetodeBayar) {
        showToast('Silakan pilih Rekening / Sumber Dana terlebih dahulu (Field 6).', 'error');
        return;
      }
      if (splitItems.length === 0) {
        showToast('Minimal harus ada 1 pos kategori dalam mode split.', 'error');
        return;
      }
      const invalidSplit = splitItems.find((s) => !s.category_name || Number(s.amount) <= 0);
      if (invalidSplit) {
        showToast('Setiap baris split wajib memilih Kategori dan mengisi Nominal > Rp 0.', 'error');
        return;
      }
      if (totalSplitAmount <= 0) {
        showToast('Total nominal transaksi split harus lebih dari Rp 0.', 'error');
        return;
      }

      setIsSubmitting(true);
      let uploadedStoragePath: string | null = null;

      try {
        const finalAkun = formReferal === 'PROJECT' ? 'DANA PROJECT' : (formAkun || 'Kas Umum Koperasi (Non-Anggota)');
        const targetTrxId = await transactionService.generateTransactionId(formReferal, formTanggal);
        let finalFileUrl = formFilelink;

        // Upload single proof to Supabase Storage bucket 'bukti_transfer'
        if (optimizedProof) {
          if (!canUpload) {
            showToast('Akses Ditolak: Hanya pengguna dengan hak ADMIN yang diizinkan mengunggah bukti transaksi.', 'error');
            setIsSubmitting(false);
            return;
          }

          const storagePath = generateStorageProofPath(targetTrxId, optimizedProof.extension, formTanggal);
          const uploadRes = await uploadTransactionProof(
            optimizedProof.file,
            storagePath,
            optimizedProof.mimeType
          );

          if (!uploadRes.success || !uploadRes.path) {
            showToast(uploadRes.error || 'Gagal mengunggah file bukti transaksi ke Supabase Storage.', 'error');
            setIsSubmitting(false);
            return;
          }

          uploadedStoragePath = uploadRes.path;
          finalFileUrl = uploadRes.publicUrl || uploadRes.path || '';
        }

        const res = await transactionService.saveSplitTransactions({
          baseTrxId: targetTrxId,
          tanggal: formTanggal,
          referal: formReferal,
          plantation: formPlantation,
          jenis: formJenis,
          metode_bayar: formMetodeBayar,
          akun: finalAkun,
          filelink: finalFileUrl,
          customer_id: formCustomerId,
          supplier_id: formSupplierId,
          login_as: user?.name || role || 'ADMIN',
          keterangan_umum: formKeterangan,
          splits: splitItems,
        });

        if (!res.success) {
          if (uploadedStoragePath) {
            await deleteTransactionProof(uploadedStoragePath);
          }
          showToast(res.error || 'Gagal menyimpan transaksi split ke database.', 'error');
          return;
        }

        showToast(
          `Sukses membukukan ${res.count} pos transaksi (ID Induk: ${res.baseId}, Total: ${formatRupiah(totalSplitAmount)}) dengan 1 bukti transfer terhubung di Supabase Storage.`,
          'success'
        );
        setIsFormOpen(false);
        await executeSearch(true);
        return;
      } catch (err: any) {
        if (uploadedStoragePath) {
          await deleteTransactionProof(uploadedStoragePath);
        }
        showToast(err.message || 'Terjadi kesalahan saat memproses transaksi split.', 'error');
        return;
      } finally {
        setIsSubmitting(false);
      }
    }

    // 2. SINGLE TRANSACTION HANDLER
    if (!formPlantation) {
      showToast('Silakan pilih Entitas / Project terlebih dahulu (Field 3).', 'error');
      return;
    }
    if (!formKategori) {
      showToast('Silakan pilih Kategori Transaksi terlebih dahulu (Field 5).', 'error');
      return;
    }
    if (!formMetodeBayar) {
      showToast('Silakan pilih Rekening / Sumber Dana terlebih dahulu (Field 6).', 'error');
      return;
    }
    if (formReferal === 'PROJECT' && !formSkuName) {
      showToast('Silakan pilih Komoditas / SKU terlebih dahulu (Field 11.1).', 'error');
      return;
    }
    if (formJumlah <= 0) {
      showToast('Total nominal transaksi harus lebih dari Rp 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    let uploadedStoragePath: string | null = null;

    try {
      const finalAkun = formReferal === 'PROJECT' ? 'DANA PROJECT' : (formAkun || 'Kas Umum Koperasi (Non-Anggota)');
      const targetTrxId = editingTrx?.id || (await transactionService.generateTransactionId(formReferal, formTanggal));
      
      let finalFileUrl = formFilelink;

      // 1. Upload proof file to Supabase Storage bucket 'bukti_transfer' if a new file is staged
      if (optimizedProof) {
        if (!canUpload) {
          showToast('Akses Ditolak: Hanya pengguna dengan hak ADMIN yang diizinkan mengunggah bukti transaksi.', 'error');
          setIsSubmitting(false);
          return;
        }

        const storagePath = generateStorageProofPath(targetTrxId, optimizedProof.extension, formTanggal);
        
        const uploadRes = await uploadTransactionProof(
          optimizedProof.file,
          storagePath,
          optimizedProof.mimeType
        );

        if (!uploadRes.success || !uploadRes.path) {
          // UPLOAD FAILED: Stop immediately, do NOT insert transaction to database
          showToast(uploadRes.error || 'Gagal mengunggah file bukti transaksi ke Supabase Storage.', 'error');
          setIsSubmitting(false);
          return;
        }

        uploadedStoragePath = uploadRes.path;
        finalFileUrl = uploadRes.publicUrl || uploadRes.path || '';
      }

      // 2. Prepare Transaction payload with storage reference in file_url (filelink)
      const payload: Partial<TransactionRecord> = {
        id: targetTrxId,
        tanggal: formTanggal,
        referal: formReferal,
        plantation: formPlantation,
        jenis: formJenis,
        kategori: formKategori,
        metode_bayar: formMetodeBayar,
        jumlah: formJumlah,
        akun: finalAkun,
        keterangan: formKeterangan,
        filelink: finalFileUrl,
        sku_name: formReferal === 'PROJECT' ? formSkuName : '',
        qty: formReferal === 'PROJECT' ? formQty : 1,
        harga_satuan: formReferal === 'PROJECT' ? formHargaSatuan : formJumlah,
        customer_id: formCustomerId,
        supplier_id: formSupplierId,
        login_as: user?.name || role || 'ADMIN',
      };

      const res = await transactionService.saveTransaction(payload);
      
      if (!res.success) {
        // ROLLBACK: Delete newly uploaded storage object if database insert/update fails
        if (uploadedStoragePath) {
          console.warn('Rollback: Menghapus file storage orphan:', uploadedStoragePath);
          await deleteTransactionProof(uploadedStoragePath);
        }
        showToast(res.error || 'Gagal menyimpan transaksi ke database.', 'error');
        return;
      }

      showToast(
        editingTrx
          ? `Transaksi ${res.id} berhasil diperbarui.`
          : `Transaksi baru berhasil dibukukan dengan ID: ${res.id} (Tersimpan ke Supabase public.transactions & Storage bukti_transfer)`,
        'success'
      );
      setIsFormOpen(false);
      await executeSearch(true);
    } catch (err: any) {
      // ROLLBACK on unhandled exception
      if (uploadedStoragePath) {
        console.warn('Rollback exception: Menghapus file storage orphan:', uploadedStoragePath);
        await deleteTransactionProof(uploadedStoragePath);
      }
      showToast(err.message || 'Terjadi kesalahan saat memproses transaksi.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!canDelete) {
      showToast('Hanya role ADMIN yang berwenang membatalkan transaksi.', 'error');
      return;
    }
    setDeletingTrxId(id);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTrxId) return;
    try {
      const res = await transactionService.deleteTransaction(deletingTrxId);
      if (res.success) {
        showToast(`Transaksi ${deletingTrxId} telah dihapus.`, 'info');
        await executeSearch(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus data.', 'error');
    } finally {
      setDeletingTrxId(null);
    }
  };

  // Financial summary from server-side query aggregate
  const totalMasuk = financialSummary.totalMasuk;
  const totalKeluar = financialSummary.totalKeluar;
  const netBalance = financialSummary.netBalance;

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
            onClick={() => executeSearch(true)}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="amber"
            size="sm"
            onClick={handleScanAllStorage}
            isLoading={isScanningAllStorage}
            leftIcon={<FolderSearch className="w-3.5 h-3.5" />}
            title="Scan bucket storage dan hubungkan bukti transfer berdasarkan nomor transaksi"
          >
            Cari Bukti di Storage
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

      {/* Filter Tabs, Search Bar, and Search State */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg overflow-x-auto">
            <button
              onClick={() => {
                setActiveTab('ALL');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Semua {activeTab === 'ALL' ? `(${totalCount})` : ''}
            </button>
            <button
              onClick={() => {
                setActiveTab('PUSAT');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'PUSAT'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Koperasi Pusat {activeTab === 'PUSAT' ? `(${totalCount})` : ''}
            </button>
            <button
              onClick={() => {
                setActiveTab('CABANG');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'CABANG'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Koperasi Cabang {activeTab === 'CABANG' ? `(${totalCount})` : ''}
            </button>
            <button
              onClick={() => {
                setActiveTab('PROJECT');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'PROJECT'
                  ? 'bg-white text-amber-950 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              8 Sektor Proyek Riil {activeTab === 'PROJECT' ? `(${totalCount})` : ''}
            </button>
          </div>

          {/* Controls: Jenis filter and Search */}
          <div className="flex items-center gap-2">
            <select
              value={jenisFilter}
              onChange={(e: any) => {
                setJenisFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
            >
              <option value="ALL">Semua Jenis (Masuk & Keluar)</option>
              <option value="MASUK">Penerimaan (MASUK)</option>
              <option value="KELUAR">Pengeluaran (KELUAR)</option>
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              <input
                id="input-transaction-search"
                type="text"
                placeholder="Cari ID, akun, komoditas, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
              />
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin absolute right-2.5 top-2.5" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="text-stone-400 hover:text-stone-600 absolute right-2.5 top-2.5 p-0.5"
                  title="Hapus filter pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Database Search Error Banner (With Retry Button & Non-destructive Fallback) */}
        {searchError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Pencarian database terkendala: <strong>{searchError}</strong>. Menampilkan data cache terakhir.
              </span>
            </div>
            <button
              type="button"
              onClick={() => executeSearch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-100/60 border border-rose-300 rounded-lg font-semibold text-rose-900 shadow-2xs transition-colors shrink-0"
            >
              <RefreshCw className="w-3 h-3" /> Coba Lagi
            </button>
          </div>
        )}

        {/* Data Table */}
        {transactions.length === 0 ? (
          <EmptyState
            title="Tidak Ada Transaksi Ditemukan"
            description={
              searchQuery.trim()
                ? `Tidak ada transaksi yang cocok dengan kata kunci "${searchQuery}".`
                : 'Tidak ada catatan transaksi pada filter atau tab ini.'
            }
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
                {transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-stone-50/70">
                    <td className="py-3 px-3 font-mono font-bold text-emerald-950">
                      <div>{t.id}</div>
                      {/[-_.]\d+$/.test(t.id) && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded mt-0.5">
                          <Layers className="w-2.5 h-2.5" />
                          <span>Pos Split</span>
                        </span>
                      )}
                    </td>
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
                        (() => {
                          const pubUrl = getPublicProofUrl(t.filelink);
                          const isImg = isImageFile(t.filelink) || isImageFile(pubUrl);
                          const isPdf = isPdfFile(t.filelink) || isPdfFile(pubUrl);

                          if (isImg) {
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenQuickProof(t)}
                                className="group inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer border border-emerald-700"
                                title="Klik untuk memperbesar bukti gambar"
                              >
                                <Eye className="w-3.5 h-3.5 shrink-0" />
                                <img
                                  src={pubUrl || t.filelink}
                                  alt="Bukti"
                                  className="w-4 h-4 object-cover rounded bg-white/20"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                                <span className="hidden sm:inline">Lihat Bukti</span>
                              </button>
                            );
                          }

                          if (isPdf) {
                            return (
                              <a
                                href={pubUrl || t.filelink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow active:scale-[0.98] transition-all border border-blue-700"
                                title="Buka Dokumen PDF di Tab Baru"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span>Lihat Lampiran</span>
                              </a>
                            );
                          }

                          return (
                            <a
                              href={pubUrl || t.filelink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs hover:shadow active:scale-[0.98] transition-all border border-sky-700"
                              title="Buka Berkas Lampiran"
                            >
                              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                              <span>Lihat Lampiran</span>
                            </a>
                          );
                        })()
                      ) : (
                        <span className="text-stone-400 font-medium text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewingTrx(t)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer border border-emerald-200 hover:border-emerald-600"
                          title="Lihat Detail Transaksi"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenReceipt(t)}
                          className="p-1.5 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer border border-purple-200 hover:border-purple-600"
                          title="Cetak Kuitansi Resmi"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer border border-blue-200 hover:border-blue-600"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer border border-rose-200 hover:border-rose-600"
                            title="Hapus Transaksi"
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

        {/* Server-side Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
          pageSizeOptions={[10, 25, 50, 100]}
          id="transactions-pagination"
        />
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
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                  <span className="text-stone-700 font-semibold flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-800" />
                    <span>10. Bukti Transaksi (Supabase Storage: bukti_transfer)</span>
                  </span>
                  
                  <div className="text-[10px] font-mono text-stone-600 bg-white p-2 rounded border border-stone-200 truncate">
                    Object Path: {viewingTrx.filelink}
                  </div>

                  {isLoadingProofSignedUrl ? (
                    <div className="flex items-center gap-2 py-4 text-stone-500 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-800" />
                      <span className="text-xs">Memuat URL preview dari storage privat...</span>
                    </div>
                  ) : viewingProofSignedUrl ? (
                    <div className="space-y-2">
                      <div className="rounded-lg overflow-hidden border border-stone-200 max-h-56 bg-stone-100 flex items-center justify-center">
                        <img
                          src={viewingProofSignedUrl}
                          alt="Bukti Transaksi"
                          className="max-h-56 object-contain w-full"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                      <a
                        href={viewingProofSignedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-emerald-800 hover:text-emerald-950 font-medium underline text-xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Gambar Bukti Transaksi Ukuran Penuh</span>
                      </a>
                    </div>
                  ) : (
                    <div className="text-[11px] text-stone-500 bg-white p-2.5 rounded border border-stone-200">
                      File terdaftar: <span className="font-mono text-emerald-950">{viewingTrx.filelink}</span>
                    </div>
                  )}
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

      {/* Quick Proof Preview Modal */}
      {quickProofTrx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-5 space-y-4 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-sm">Lampiran Bukti Transaksi</h3>
                  <span className="text-[11px] text-stone-500 font-mono">
                    ID: {quickProofTrx.id} • {formatDateIndo(quickProofTrx.tanggal)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setQuickProofTrx(null);
                  setQuickProofUrl(null);
                }}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-stone-500 block text-[11px]">Kategori & Akun:</span>
                  <span className="font-semibold text-stone-800 block truncate">{quickProofTrx.kategori}</span>
                  <span className="text-[10px] text-stone-500 block font-mono truncate">{quickProofTrx.akun || '-'}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500 block text-[11px]">Nominal:</span>
                  <span className="font-bold text-emerald-950 text-sm font-serif block">
                    {formatRupiah(quickProofTrx.jumlah)}
                  </span>
                  <Badge variant={quickProofTrx.jenis === 'MASUK' ? 'success' : 'danger'} size="sm">
                    {quickProofTrx.jenis}
                  </Badge>
                </div>
              </div>

              <div className="bg-stone-900 rounded-xl overflow-hidden min-h-64 flex items-center justify-center relative p-3 border border-stone-800">
                {isLoadingQuickProof ? (
                  <div className="flex flex-col items-center gap-2 text-stone-400 py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    <span className="text-xs">Memuat file bukti dari Supabase Storage (bukti_transfer)...</span>
                  </div>
                ) : quickProofUrl ? (
                  <img
                    src={quickProofUrl}
                    alt={`Bukti Transaksi ${quickProofTrx.id}`}
                    className="max-h-[50vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="text-center p-6 text-stone-400 space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-xs text-stone-300">File tersimpan di bucket storage <code>bukti_transfer</code>:</p>
                    <code className="text-[10px] text-emerald-400 bg-stone-950 px-2 py-1 rounded block break-all font-mono">
                      {quickProofTrx.filelink}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickProof(quickProofTrx)}
                      className="mt-2 text-xs text-emerald-400 hover:underline inline-block font-semibold"
                    >
                      Coba muat ulang URL
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-stone-500 flex items-center justify-between px-1">
                <span className="truncate max-w-[260px] font-mono text-[10px]">Path: {quickProofTrx.filelink}</span>
                {quickProofUrl && (
                  <a
                    href={quickProofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-800 hover:text-emerald-950 font-semibold underline text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Ukuran Penuh</span>
                  </a>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-between items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const trx = quickProofTrx;
                  setQuickProofTrx(null);
                  setViewingTrx(trx);
                }}
              >
                Detail Lengkap Transaksi
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setQuickProofTrx(null);
                  setQuickProofUrl(null);
                }}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Official Kuitansi Modal */}
      {selectedKuitansi && (
        <Modal
          isOpen={!!selectedKuitansi}
          onClose={() => setSelectedKuitansi(null)}
          title="Kuitansi Resmi Transaksi Koperasi"
          subtitle={`No. Transaksi: ${selectedKuitansi.id}`}
          size="md"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedKuitansi(null)}
              >
                Tutup
              </Button>
              <Button
                variant="purple"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                leftIcon={<Printer className="w-4 h-4" />}
              >
                Cetak Kuitansi Resmi
              </Button>
            </div>
          }
        >
          <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-bold text-stone-900 font-serif text-base">Koperasi Syarikat Islam Mandiri</h3>
                <p className="text-[11px] text-stone-500">Badan Hukum No. AHU-0001234.AH.01.26.TAHUN 2024</p>
              </div>
              <Badge variant={selectedKuitansi.jenis === 'MASUK' ? 'success' : 'warning'} size="sm">
                {selectedKuitansi.jenis === 'MASUK' ? 'PENERIMAAN KAS' : 'PENGELUARAN KAS'}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Akun / Pihak Terkait</span>
                <span className="font-bold text-stone-900 text-xs">{selectedKuitansi.akun || 'Kas Umum Koperasi'}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Nomor Transaksi</span>
                <span className="font-mono font-bold text-emerald-950 text-xs">{selectedKuitansi.id}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Kategori Transaksi</span>
                <span className="font-semibold text-stone-800 text-xs">{selectedKuitansi.kategori}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Tanggal Pembukuan</span>
                <span className="font-mono text-stone-800 text-xs">{formatDateIndo(selectedKuitansi.tanggal || '')}</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Entitas / Area</span>
                <span className="font-semibold text-stone-800 text-xs">{selectedKuitansi.plantation} ({selectedKuitansi.referal})</span>
              </div>
              <div>
                <span className="text-stone-400 block text-[10px] uppercase font-bold">Sumber Dana / Rekening</span>
                <span className="font-mono text-stone-800 text-xs">{selectedKuitansi.metodeBayar || '-'}</span>
              </div>
            </div>

            {selectedKuitansi.keterangan && (
              <div className="p-2.5 bg-white rounded-xl border border-stone-200">
                <span className="text-[10px] text-stone-400 block uppercase font-bold">Uraian / Keterangan</span>
                <p className="text-stone-700 text-xs mt-0.5">{selectedKuitansi.keterangan}</p>
              </div>
            )}

            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-xs text-emerald-800 font-semibold block uppercase">Total Nominal:</span>
              <span className="text-2xl font-bold font-mono text-emerald-950 tracking-tight">
                {formatRupiah(selectedKuitansi.jumlah)}
              </span>
            </div>

            <p className="text-[10px] text-stone-400 text-center italic">
              Kuitansi ini dihasilkan secara elektronik dari sistem ERP Koperasi Syarikat Islam Mandiri dan sah sebagai bukti pembukuan transaksi.
            </p>
          </div>
        </Modal>
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
                    onChange={(e: any) => handleReferalChange(e.target.value as 'KOPERASI' | 'PROJECT')}
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-800 font-semibold flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-emerald-800" />
                      <span>3. Entitas / Project *</span>
                    </label>
                    {isLoadingAreas ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Memuat...
                      </span>
                    ) : areaError ? (
                      <span className="text-[10px] text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>Gagal memuat</span>
                        <button
                          type="button"
                          onClick={() => fetchAreaOptions(formReferal)}
                          className="underline font-semibold ml-0.5 text-emerald-700 hover:text-emerald-900"
                        >
                          Coba lagi
                        </button>
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-500 font-mono font-medium">
                        {areaOptions.length} entitas
                      </span>
                    )}
                  </div>
                  <select
                    value={formPlantation}
                    onChange={(e) => handlePlantationChange(e.target.value)}
                    disabled={isLoadingAreas}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-hidden transition-colors font-semibold text-stone-900 ${
                      formReferal === 'PROJECT'
                        ? 'bg-amber-50/60 border-amber-300 focus:border-amber-700 focus:bg-white'
                        : 'bg-stone-50 border-stone-300 focus:border-emerald-700 focus:bg-white'
                    } ${isLoadingAreas ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <option value="">-- Pilih Entitas / Project --</option>
                    {areaOptions.map((area) => (
                      <option key={area} value={area}>
                        {area}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-stone-500 mt-0.5 block">
                    Masuk ke kolom: <code>area_name</code> (Filtered by <code>referral_type = '{formReferal}'</code>)
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-stone-800 font-semibold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-emerald-800" />
                      <span>4. Jenis Transaksi *</span>
                    </label>
                  </div>
                  <select
                    value={formJenis}
                    onChange={(e: any) => handleJenisChange(e.target.value as 'MASUK' | 'KELUAR')}
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

              {/* MODE SWITCHER: Transaksi Tunggal vs Multi-Kategori Split */}
              {!editingTrx && formReferal === 'KOPERASI' && (
                <div className="p-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-stone-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-800 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">Mode Alokasi Pos Pembukuan</span>
                      <span className="text-[10px] text-stone-600">
                        {isSplitMode
                          ? '1 Bukti Transfer (Foto) dialokasikan ke beberapa pos kategori transaksi'
                          : '1 Transaksi Tunggal untuk 1 Pos Kategori'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center bg-white p-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsSplitMode(false)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        !isSplitMode ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      Tunggal (1 Pos)
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSplitMode(true)}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                        isSplitMode ? 'bg-emerald-700 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Layers className="w-3 h-3" />
                      <span>Split Kategori ({splitItems.length} Pos)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 6. SUMBER DANA */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-800 font-semibold flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-800" />
                    <span>6. Sumber Dana / Rekening Bank *</span>
                  </label>
                  {isLoadingBanks ? (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" /> Memuat...
                    </span>
                  ) : bankError ? (
                    <span className="text-[10px] text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-2.5 h-2.5" />
                      <span>Gagal memuat</span>
                      <button
                        type="button"
                        onClick={() => fetchBankAccountsForArea(formPlantation)}
                        className="underline font-semibold ml-0.5 text-emerald-700 hover:text-emerald-900"
                      >
                        Coba lagi
                      </button>
                    </span>
                  ) : !formPlantation ? (
                    <span className="text-[10px] text-amber-700 font-medium">Pilih entitas dahulu</span>
                  ) : (
                    <span className="text-[10px] text-stone-500 font-mono font-medium">
                      {bankOptions.length} rekening
                    </span>
                  )}
                </div>
                <select
                  value={formMetodeBayar}
                  onChange={(e) => setFormMetodeBayar(e.target.value)}
                  disabled={isLoadingBanks || !formPlantation || bankOptions.length === 0}
                  className={`w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white transition-colors ${
                    isLoadingBanks || !formPlantation || bankOptions.length === 0 ? 'opacity-70 cursor-not-allowed bg-stone-100' : ''
                  }`}
                >
                  {!formPlantation ? (
                    <option value="">Pilih Entitas/Project terlebih dahulu</option>
                  ) : bankOptions.length === 0 && !isLoadingBanks ? (
                    <option value="">Tidak ada sumber dana terdaftar untuk entitas ini</option>
                  ) : (
                    <>
                      <option value="">-- Pilih Rekening / Sumber Dana --</option>
                      {bankOptions.map((acc) => (
                        <option key={acc} value={acc}>
                          {acc}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <span className="text-[10px] text-stone-500 mt-0.5 block">
                  Masuk ke: <code>payment_method</code> (Dari <code>areas.bank_account_1, 2, 3</code>)
                </span>
              </div>

              {/* SINGLE MODE: FIELD 5 KATEGORI & FIELD 7 NOMINAL */}
              {!isSplitMode && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-stone-800 font-semibold flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-emerald-800" />
                        <span>5. Kategori *</span>
                      </label>
                      {isLoadingCategories ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-medium">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Memuat...
                        </span>
                      ) : categoryError ? (
                        <span className="text-[10px] text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>Gagal memuat</span>
                          <button
                            type="button"
                            onClick={() => fetchCategoriesForType(formJenis)}
                            className="underline font-semibold ml-0.5 text-emerald-700 hover:text-emerald-900"
                          >
                            Coba lagi
                          </button>
                        </span>
                      ) : (
                        <span className="text-[10px] text-stone-500 font-mono font-medium">
                          {categoryOptionsList.length} kategori
                        </span>
                      )}
                    </div>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value)}
                      disabled={isLoadingCategories}
                      className={`w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:border-emerald-700 focus:bg-white transition-colors ${
                        isLoadingCategories ? 'opacity-70 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">-- Pilih Kategori Transaksi --</option>
                      {categoryOptionsList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-stone-500 mt-0.5 block">
                      Masuk ke kolom: <code>category_name</code> (Filtered by <code>type = '{formJenis}'</code>)
                    </span>
                  </div>

                  {formReferal === 'KOPERASI' && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl">
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
                </div>
              )}

              {/* SPLIT MODE: MULTI-CATEGORY BUILDER (1 BUKTI TRANSFER -> BANYAK POS KATEGORI) */}
              {isSplitMode && !editingTrx && formReferal === 'KOPERASI' && (
                <div className="p-4 bg-emerald-50/40 border-2 border-emerald-300 rounded-2xl space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-800" />
                      <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        Alokasi Pos Kategori & Nominal (1 Bukti Transfer $\rightarrow$ {splitItems.length} Pos)
                      </span>
                    </div>
                    <Badge variant="success" size="sm">
                      Multi-Category Split
                    </Badge>
                  </div>

                  <p className="text-[11px] text-stone-600">
                    Satu bukti transfer (foto) akan diunggah <strong>1 kali ke Supabase Storage</strong> dan otomatis dihubungkan ke seluruh pos transaksi di bawah ini dengan penomoran sub-transaksi (contoh: <code>T251229001-1</code>, <code>T251229001-2</code>, <code>T251229001-3</code>).
                  </p>

                  <div className="space-y-2.5">
                    {splitItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-white border border-stone-300 hover:border-emerald-400 rounded-xl shadow-2xs space-y-2 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-800 text-white font-mono font-bold text-xs rounded-md">
                              Pos #{idx + 1}
                            </span>
                            <span className="text-[11px] font-semibold text-stone-700">
                              {item.category_name || 'Pilih Kategori'}
                            </span>
                          </div>
                          {splitItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSplitRow(idx)}
                              className="text-stone-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                              title="Hapus baris pos ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                          {/* Kategori Dropdown */}
                          <div className="sm:col-span-5">
                            <label className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                              Kategori Transaksi *
                            </label>
                            <select
                              value={item.category_name}
                              onChange={(e) => handleUpdateSplitRow(idx, 'category_name', e.target.value)}
                              required
                              className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-semibold text-stone-900 focus:outline-hidden focus:border-emerald-700 focus:bg-white"
                            >
                              <option value="">-- Pilih Kategori --</option>
                              {categoryOptionsList.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Nominal Input */}
                          <div className="sm:col-span-4">
                            <label className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                              Nominal Pos (Rp) *
                            </label>
                            <div className="relative">
                              <span className="absolute left-2 top-1.5 text-xs font-bold text-stone-400">Rp</span>
                              <input
                                type="number"
                                min="1000"
                                step="1000"
                                required
                                placeholder="0"
                                value={item.amount || ''}
                                onChange={(e) => handleUpdateSplitRow(idx, 'amount', Number(e.target.value))}
                                className="w-full pl-8 pr-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-emerald-950 focus:outline-hidden focus:border-emerald-700 focus:bg-white"
                              />
                            </div>
                          </div>

                          {/* Keterangan Pos */}
                          <div className="sm:col-span-3">
                            <label className="block text-[10px] text-stone-600 font-semibold mb-0.5">
                              Uraian Khusus Pos
                            </label>
                            <input
                              type="text"
                              placeholder="Catatan pos..."
                              value={item.description || ''}
                              onChange={(e) => handleUpdateSplitRow(idx, 'description', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:outline-hidden focus:border-emerald-700 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-emerald-200">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddSplitRow}
                      leftIcon={<Plus className="w-3.5 h-3.5 text-emerald-700" />}
                    >
                      + Tambah Pos Kategori Baru
                    </Button>

                    {/* Total Akumulasi Bukti Transfer */}
                    <div className="text-right w-full sm:w-auto bg-white p-2.5 rounded-xl border border-emerald-300 shadow-2xs">
                      <span className="text-[10px] text-stone-500 block uppercase font-semibold">
                        Total Nilai Bukti Transfer (Akumulasi {splitItems.length} Pos):
                      </span>
                      <span className="text-base font-bold text-emerald-950 font-serif">
                        {formatRupiah(totalSplitAmount)}
                      </span>
                    </div>
                  </div>
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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] text-stone-800 font-semibold">
                          11.1 Komoditas / SKU *
                        </label>
                        {isLoadingProjectProducts ? (
                          <span className="flex items-center gap-1 text-[10px] text-amber-700 font-medium">
                            <Loader2 className="w-2.5 h-2.5 animate-spin" /> Memuat...
                          </span>
                        ) : productError ? (
                          <span className="text-[10px] text-rose-600 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            <span>Gagal</span>
                            <button
                              type="button"
                              onClick={() => fetchProductsForProject(formPlantation)}
                              className="underline font-semibold ml-0.5 text-amber-800 hover:text-amber-950"
                            >
                              Coba lagi
                            </button>
                          </span>
                        ) : !formPlantation ? (
                          <span className="text-[10px] text-amber-700 font-medium">Pilih entitas dahulu</span>
                        ) : (
                          <span className="text-[10px] text-emerald-800 font-mono font-medium">
                            {projectProducts.length} produk
                          </span>
                        )}
                      </div>
                      <select
                        value={formSkuName}
                        onChange={(e) => handleSkuNameChange(e.target.value)}
                        disabled={isLoadingProjectProducts || !formPlantation || projectProducts.length === 0}
                        className={`w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-hidden text-xs text-stone-900 font-medium ${
                          isLoadingProjectProducts || !formPlantation || projectProducts.length === 0 ? 'opacity-70 cursor-not-allowed bg-stone-100' : ''
                        }`}
                      >
                        {!formPlantation ? (
                          <option value="">Pilih Entitas/Project terlebih dahulu</option>
                        ) : projectProducts.length === 0 && !isLoadingProjectProducts ? (
                          <option value="">Tidak ada produk terdaftar untuk entitas ini</option>
                        ) : (
                          <>
                            <option value="">-- Pilih Komoditas / SKU --</option>
                            {projectProducts.map((p) => (
                              <option key={p.sku_code || p.id} value={p.sku_name}>
                                {p.sku_code ? `[${p.sku_code}] ` : ''}{p.sku_name} ({formatRupiah(p.defaultPrice)}/{p.unit})
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      <span className="text-[10px] text-amber-800 mt-0.5 block">
                        Relasi: <code>public.products.group_name = '{formPlantation}'</code>
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

              {/* 10. LAMPIRAN FILE BUKTI TRANSAKSI (SUPABASE STORAGE: bukti_transfer) */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-stone-800 font-semibold flex items-center gap-1.5 text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-800" />
                    <span>10. Bukti Transaksi (Supabase Storage: bukti_transfer)</span>
                  </label>
                  <span className="text-[10px] text-stone-500 font-mono">
                    JPG, PNG, WebP (Maks. 10MB)
                  </span>
                </div>

                {canUpload ? (
                  <>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleProofFileSelect}
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                    />

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                      <Button
                        type="button"
                        variant="blue"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isOptimizingProof || isSubmitting}
                        leftIcon={
                          isOptimizingProof ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            <UploadCloud className="w-3.5 h-3.5" />
                          )
                        }
                      >
                        {isOptimizingProof ? 'Memproses Gambar...' : 'Upload Berkas Bukti Transaksi'}
                      </Button>

                      {proofPreviewUrl || formFilelink ? (
                        <div className="flex items-center gap-2 text-[11px] text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium truncate max-w-[200px]">{fileName || 'Bukti Terlampir'}</span>
                            {optimizedProof && (
                              <span className="text-[9px] text-emerald-700 font-mono">
                                {(optimizedProof.originalSize / 1024).toFixed(0)} KB → {(optimizedProof.optimizedSize / 1024).toFixed(0)} KB ({optimizedProof.extension.toUpperCase()})
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveProof}
                            className="text-stone-400 hover:text-rose-600 ml-1.5 p-0.5 rounded"
                            title="Hapus / Ganti file"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-400 italic">
                          Belum ada bukti transaksi dipilih
                        </span>
                      )}
                    </div>

                    {/* Thumbnail Preview if available */}
                    {proofPreviewUrl && (
                      <div className="flex items-center gap-3 pt-1">
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-emerald-300 bg-stone-100 shadow-2xs shrink-0">
                          <img
                            src={proofPreviewUrl}
                            alt="Preview Bukti"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="text-[11px] text-stone-600 space-y-0.5">
                          <p className="font-medium text-emerald-950">Gambar siap di-upload ke Supabase Storage</p>
                          <p className="text-[10px] text-stone-500">
                            File akan otomatis disimpan ke bucket private <code>bukti_transfer</code> dan path referensi dicatat ke kolom <code>public.transactions.file_url</code>.
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-stone-100 rounded-lg border border-stone-200 text-stone-600 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-stone-500 shrink-0" />
                      <span className="text-[11px]">
                        Pengunggahan bukti transaksi dibatasi khusus untuk <strong>ADMIN</strong>.
                      </span>
                    </div>
                    {formFilelink && (
                      <span className="text-[10px] text-emerald-800 font-mono bg-emerald-50 px-2 py-1 rounded border border-emerald-200 truncate max-w-[180px]">
                        {formFilelink}
                      </span>
                    )}
                  </div>
                )}

                {proofError && (
                  <div className="flex items-center gap-1.5 text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{proofError}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-stone-500 pt-0.5">
                  <span>Masuk ke kolom database: <code>public.transactions.file_url</code></span>
                  <span className="text-emerald-800 font-semibold">Tersimpan sebagai Object Path (Bukan Base64)</span>
                </div>
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
                  <h3 className="font-bold text-stone-900 font-serif">Skrip SQL DDL & Kebijakan RLS Supabase</h3>
                  <p className="text-[11px] text-stone-500">Tabel PostgreSQL & Supabase Storage Bucket</p>
                </div>
              </div>
              <button onClick={() => setShowDdlModal(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab navigation */}
            <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
              <button
                type="button"
                onClick={() => setActiveSqlTab('transactions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSqlTab === 'transactions'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                1. Table: public.transactions (19 Kolom)
              </button>
              <button
                type="button"
                onClick={() => setActiveSqlTab('storage')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeSqlTab === 'storage'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                2. Storage Bucket: bukti_transfer (RLS ADMIN)
              </button>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <span>
                  {activeSqlTab === 'transactions'
                    ? 'Ketentuan RLS Tabel public.transactions'
                    : 'Keamanan Bucket bukti_transfer (Public Read & Authorized Upload)'}
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                {activeSqlTab === 'transactions'
                  ? 'RLS mengamankan data tabel di tingkat baris. Kebijakan akses lengkap untuk SELECT, INSERT, UPDATE, dan DELETE telah disertakan.'
                  : 'Bucket berstatus PUBLIC untuk SELECT (preview bukti tanpa signed token), sedangkan INSERT diizinkan untuk ADMIN & DIRECTOR, serta UPDATE/DELETE hanya untuk ADMIN.'}
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
                {activeSqlTab === 'transactions' ? TRANSACTIONS_SQL_DDL : STORAGE_BUKTI_TRANSFER_SQL_DDL}
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

      {/* Confirm Delete Transaction Dialog */}
      <ConfirmDialog
        isOpen={!!deletingTrxId}
        onClose={() => setDeletingTrxId(null)}
        onConfirm={handleConfirmDelete}
        title="Batalkan & Hapus Transaksi"
        message={`Apakah Anda yakin ingin membatalkan dan menghapus transaksi "${deletingTrxId}" dari pembukuan resmi? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus Transaksi"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};
