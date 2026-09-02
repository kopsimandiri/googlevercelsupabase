import React, { useState, useEffect, useMemo, useRef } from 'react';
import { memberService, MEMBERS_SQL_DDL, MEMBERS_TABLE_NAME } from '../../services/memberService';
import { MemberRecord } from '../../types/database';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import { ErrorState } from '../common/ErrorState';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { IdCardModal, renderMemberCardToCanvas } from '../idcard/IdCardModal';
import { AddMemberModal } from './AddMemberModal';
import { SupabaseTableCheckResult } from '../../lib/supabase';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CreditCard,
  Download,
  Filter,
  RefreshCw,
  X,
  Save,
  CheckCircle,
  Building,
  UserCheck,
  Database,
  Code,
  Copy,
  UploadCloud,
  Check,
  Info,
  Server,
  Activity,
  Printer,
} from 'lucide-react';

export const MembershipModule: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useNotification();

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [dataSource, setDataSource] = useState<'SUPABASE' | 'LOCAL_STORAGE'>('LOCAL_STORAGE');
  const [sourceMessage, setSourceMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Batch KTA Generation state
  const batchCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isConfirmBatchModalOpen, setIsConfirmBatchModalOpen] = useState<boolean>(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; name: string } | null>(null);

  // Supabase Diagnostics Modal & State
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [isCheckingSupabase, setIsCheckingSupabase] = useState<boolean>(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseTableCheckResult | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Search, filter, sorting state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name_asc' | 'date_desc' | 'date_asc'>('date_desc');

  // Modals state
  const [selectedMember, setSelectedMember] = useState<MemberRecord | null>(null);
  const [idCardMember, setIdCardMember] = useState<MemberRecord | null>(null);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [deletingMember, setDeletingMember] = useState<{ id: string; nama: string } | null>(null);
  const [editingMember, setEditingMember] = useState<MemberRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form fields
  const [formNama, setFormNama] = useState<string>('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formProvinsi, setFormProvinsi] = useState<string>('DKI Jakarta');
  const [formKota, setFormKota] = useState<string>('Jakarta Pusat');
  const [formAlamat, setFormAlamat] = useState<string>('');
  const [formPekerjaan, setFormPekerjaan] = useState<string>('');
  const [formPlantation, setFormPlantation] = useState<string>('PUSAT JAKARTA');
  const [formTglLahir, setFormTglLahir] = useState<string>('1990-01-01');
  const [formSukarela, setFormSukarela] = useState<number>(0);

  const canEdit = role === 'ADMIN' || role === 'DIRECTOR';
  const canDelete = role === 'ADMIN';

  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await memberService.getMembersWithMeta();
      setMembers(result.data);
      setDataSource(result.source);
      setSourceMessage(result.message);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data anggota.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckSupabase = async () => {
    setIsCheckingSupabase(true);
    try {
      const res = await memberService.checkStatus();
      setSupabaseStatus(res);
      if (res.isConnected) {
        showToast(`Tabel '${res.tableName}' aktif di Supabase (${res.rowCount} baris, ${res.latencyMs}ms)`, 'success');
      } else {
        showToast(res.statusMessage, 'info');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal memeriksa koneksi Supabase', 'error');
    } finally {
      setIsCheckingSupabase(false);
    }
  };

  const handleSeedToSupabase = async () => {
    setIsSeeding(true);
    try {
      const res = await memberService.pushSeedToSupabase();
      if (res.success) {
        showToast(`Berhasil menyinkronkan ${res.count} data anggota ke tabel '${MEMBERS_TABLE_NAME}' di Supabase!`, 'success');
        await loadMembers();
        await handleCheckSupabase();
      } else {
        showToast(res.error || 'Gagal menyinkronkan data ke Supabase.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Terjadi kesalahan sinkronisasi.', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(MEMBERS_SQL_DDL);
    setCopiedSql(true);
    showToast('Script DDL PostgreSQL tabel members berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedSql(false), 3000);
  };

  useEffect(() => {
    loadMembers();
    handleCheckSupabase();
  }, []);

  const handleOpenAddModal = () => {
    setIsAddMemberModalOpen(true);
  };

  const handleOpenEditModal = (m: MemberRecord) => {
    setEditingMember(m);
    setFormNama(m.nama);
    setFormGender(m.gender);
    setFormProvinsi(m.provinsi);
    setFormKota(m.kota);
    setFormAlamat(m.alamat);
    setFormPekerjaan(m.pekerjaan);
    setFormPlantation(m.plantation);
    setFormTglLahir(m.tgl_lahir);
    setFormSukarela(m.simpanan_sukarela || 0);
    setIsFormOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNama.trim()) {
      showToast('Nama anggota wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Partial<MemberRecord> = {
        id: editingMember?.id,
        nama: formNama.trim(),
        gender: formGender,
        provinsi: formProvinsi.trim(),
        kota: formKota.trim(),
        alamat: formAlamat.trim(),
        pekerjaan: formPekerjaan.trim(),
        plantation: formPlantation,
        tgl_lahir: formTglLahir,
        simpanan_sukarela: formSukarela,
      };

      const result = await memberService.saveMember(payload);
      if (result.success) {
        const dest = result.source === 'SUPABASE' ? 'Supabase Database & Local' : 'Local Storage';
        showToast(
          editingMember
            ? `Data anggota ${result.id} berhasil diperbarui (${dest}).`
            : `Anggota baru berhasil didaftarkan dengan ID: ${result.id} (${dest})`,
          'success'
        );
        setIsFormOpen(false);
        await loadMembers();
      } else {
        showToast(result.error || 'Gagal menyimpan anggota.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = (id: string, nama: string) => {
    if (!canDelete) {
      showToast('Hanya role ADMIN yang berwenang menghapus data anggota.', 'error');
      return;
    }
    setDeletingMember({ id, nama });
  };

  const handleConfirmDeleteMember = async () => {
    if (!deletingMember) return;
    try {
      const res = await memberService.deleteMember(deletingMember.id);
      if (res.success) {
        showToast(`Anggota ${deletingMember.nama} (${deletingMember.id}) berhasil dihapus.`, 'info');
        await loadMembers();
      } else {
        showToast(res.error || 'Gagal menghapus anggota.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus data.', 'error');
    } finally {
      setDeletingMember(null);
    }
  };

  /**
   * Cetak Massal KTA (Replika generateAllCards GAS Legacy)
   * Render canvas satu-persatu, export JPEG, jeda 600ms antar unduhan.
   */
  const generateAllCards = async () => {
    setIsConfirmBatchModalOpen(false);
    const targetMembers = filteredMembers.length > 0 ? filteredMembers : members;
    if (targetMembers.length === 0) {
      showToast('Tidak ada data anggota untuk dicetak.', 'info');
      return;
    }

    setIsBatchGenerating(true);
    showToast(`Memulai proses unduh KTA untuk ${targetMembers.length} anggota...`, 'info');

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/assets/MasterBlankoID.jpg';

    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    logoImg.src = '/assets/logo-kopsim.png';

    await Promise.all([
      new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      }),
      new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
      }),
    ]);

    const canvas = batchCanvasRef.current || document.createElement('canvas');

    for (let i = 0; i < targetMembers.length; i++) {
      const member = targetMembers[i];
      setBatchProgress({
        current: i + 1,
        total: targetMembers.length,
        name: member.nama,
      });

      const dataUrl = await renderMemberCardToCanvas(
        canvas,
        member,
        img.naturalWidth > 0 ? img : null,
        logoImg.naturalWidth > 0 ? logoImg : null
      );
      const safeName = (member.nama || 'Anggota').trim().replace(/\s+/g, '_');
      const safeId = (member.id || 'NRA').trim().replace(/\s+/g, '_');

      const link = document.createElement('a');
      link.download = `ID_CARD_${safeName}_${safeId}.jpg`;
      link.href = dataUrl;
      link.click();

      // Jeda 600ms persis seperti implementasi GAS legacy
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsBatchGenerating(false);
    setBatchProgress(null);
    showToast(`Berhasil mengunduh seluruh ${targetMembers.length} ID Card KTA Anggota!`, 'success');
  };

  // Filter & Sort computation
  const filteredMembers = useMemo(() => {
    return members
      .filter((m) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = m.nama.toLowerCase().includes(q);
          const matchId = m.id.toLowerCase().includes(q);
          const matchKota = m.kota.toLowerCase().includes(q);
          const matchPekerjaan = m.pekerjaan.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchKota && !matchPekerjaan) return false;
        }

        // Area filter
        if (areaFilter !== 'ALL') {
          if (areaFilter === 'PUSAT' && !m.area_jenis.includes('PUSAT')) return false;
          if (areaFilter === 'CABANG' && !m.area_jenis.includes('CABANG')) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') {
          return a.nama.localeCompare(b.nama);
        }
        if (sortBy === 'date_asc') {
          return a.tgl_reg.localeCompare(b.tgl_reg);
        }
        return b.tgl_reg.localeCompare(a.tgl_reg);
      });
  }, [members, searchQuery, areaFilter, sortBy]);

  const totalCount = members.length;
  const pusatCount = members.filter((m) => m.area_jenis.includes('PUSAT')).length;
  const cabangCount = members.filter((m) => m.area_jenis.includes('CABANG')).length;

  // Subtotal akumulasi simpanan keseluruhan dari tabel public.members
  const totals = useMemo(() => {
    let pokok = 0;
    let wajib = 0;
    let manasuka = 0;

    members.forEach((m) => {
      pokok += Number(m.simpanan_pokok ?? 500000);
      wajib += Number(m.simpanan_wajib ?? 360000);
      manasuka += Number(m.simpanan_sukarela ?? 0);
    });

    return {
      pokok,
      wajib,
      manasuka,
      grandTotal: pokok + wajib + manasuka,
    };
  }, [members]);

  // Subtotal terfilter sesuai pencarian/filter area aktif
  const filteredTotals = useMemo(() => {
    let pokok = 0;
    let wajib = 0;
    let manasuka = 0;

    filteredMembers.forEach((m) => {
      pokok += Number(m.simpanan_pokok ?? 500000);
      wajib += Number(m.simpanan_wajib ?? 360000);
      manasuka += Number(m.simpanan_sukarela ?? 0);
    });

    return {
      pokok,
      wajib,
      manasuka,
      grandTotal: pokok + wajib + manasuka,
    };
  }, [filteredMembers]);

  if (isLoading && members.length === 0) {
    return (
      <LoadingState
        message="Menghubungkan ke tabel members di Supabase PostgreSQL..."
        idPrefix="members-load"
      />
    );
  }

  if (error && members.length === 0) {
    return (
      <ErrorState
        title="Gagal Memuat Keanggotaan"
        errorMessage={error}
        onRetry={loadMembers}
        idPrefix="members-load-error"
      />
    );
  }

  return (
    <div className="space-y-6" id="membership-module-root">
      {/* Top Supabase Status Bar */}
      <div className="bg-emerald-950 text-white rounded-2xl p-4 sm:p-5 border border-emerald-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-900/90 border border-emerald-700 text-amber-300">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white font-serif">
                Integrasi Database: Tabel <code className="text-amber-300 bg-emerald-900/60 px-1.5 py-0.5 rounded font-mono text-xs">public.members</code>
              </h3>
              {dataSource === 'SUPABASE' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live PostgreSQL Supabase
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Local Storage Fallback
                </span>
              )}
            </div>
            <p className="text-xs text-emerald-200/80 mt-0.5">
              {sourceMessage || 'Tabel keanggotaan master tersinkronisasi otomatis dengan simpanan & KTA digital.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="bg-emerald-900/60 text-emerald-100 border-emerald-700 hover:bg-emerald-800 text-xs"
            onClick={() => setIsSupabaseModalOpen(true)}
            leftIcon={<Code className="w-3.5 h-3.5 text-amber-300" />}
          >
            Skema SQL & Status
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="bg-emerald-900/60 text-emerald-100 border-emerald-700 hover:bg-emerald-800 text-xs"
            onClick={handleCheckSupabase}
            isLoading={isCheckingSupabase}
            leftIcon={<Activity className="w-3.5 h-3.5 text-emerald-400" />}
          >
            Tes Ping
          </Button>

          {canEdit && (
            <Button
              variant="gold"
              size="sm"
              className="text-xs"
              onClick={handleSeedToSupabase}
              isLoading={isSeeding}
              leftIcon={<UploadCloud className="w-3.5 h-3.5" />}
            >
              Sinkron ke Supabase
            </Button>
          )}
        </div>
      </div>

      {/* Top Statistic Cards: Data Anggota & Subtotal Simpanan */}
      <div className="space-y-3">
        {/* Row 1: Statistik Keanggotaan */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 border-l-4 border-l-emerald-700" headerBorder={false}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                  TOTAL ANGGOTA TERDAFTAR
                </span>
                <h3 className="text-xl font-bold text-emerald-950 mt-1 font-serif">
                  {totalCount} Anggota
                </h3>
                <span className="text-[11px] text-emerald-700 font-medium">Buku Register Induk</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-600" headerBorder={false}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                  ANGGOTA PUSAT
                </span>
                <h3 className="text-xl font-bold text-amber-950 mt-1 font-serif">
                  {pusatCount} Anggota
                </h3>
                <span className="text-[11px] text-amber-800 font-medium">Domisili Kantor Pusat</span>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                <Building className="w-5 h-5" />
              </div>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-teal-600" headerBorder={false}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                  ANGGOTA CABANG / DAERAH
                </span>
                <h3 className="text-xl font-bold text-teal-950 mt-1 font-serif">
                  {cabangCount} Anggota
                </h3>
                <span className="text-[11px] text-teal-800 font-medium">Wilayah Regional Koperasi</span>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Row 2: Subtotal Simpanan Anggota dari public.members */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Subtotal Simpanan Pokok
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-950 mt-0.5">
              {formatRupiah(totals.pokok)}
            </div>
            <span className="text-[10px] text-stone-400">Rp 500.000 / anggota</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Subtotal Simpanan Wajib
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-950 mt-0.5">
              {formatRupiah(totals.wajib)}
            </div>
            <span className="text-[10px] text-stone-400">Rp 360.000 / tahun berjalan</span>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Subtotal Simpanan Manasuka
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-amber-900 mt-0.5">
              {formatRupiah(totals.manasuka)}
            </div>
            <span className="text-[10px] text-stone-400">Simpanan sukarela / fleksibel</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-950 text-white border border-emerald-800 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              Total Seluruh Simpanan
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-amber-300 mt-0.5">
              {formatRupiah(totals.grandTotal)}
            </div>
            <span className="text-[10px] text-emerald-300">Akumulasi {totalCount} Anggota</span>
          </div>
        </div>
      </div>

      {/* Main Database Table Card */}
      <Card
        id="card-members-database"
        title="Buku Induk Register Anggota"
        subtitle="Manajemen data resmi, nomor register, dan pencetakan KTA Digital"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              id="btn-refresh-members"
              variant="outline"
              size="sm"
              onClick={loadMembers}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Data
            </Button>

            {role === 'ADMIN' && (
              <Button
                id="btn-print-all-kta"
                variant="outline"
                size="sm"
                className="text-amber-800 border-amber-300 hover:bg-amber-50"
                onClick={() => setIsConfirmBatchModalOpen(true)}
                disabled={isBatchGenerating || members.length === 0}
                leftIcon={<Printer className="w-3.5 h-3.5 text-amber-700" />}
              >
                Cetak Semua KTA
              </Button>
            )}

            {canEdit && (
              <Button
                id="btn-add-member"
                variant="gold"
                size="sm"
                onClick={handleOpenAddModal}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Tambah Anggota
              </Button>
            )}
          </div>
        }
      >
        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-stone-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Cari nama, ID register, kota, pekerjaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-stone-500 ml-1" />
              <button
                onClick={() => setAreaFilter('ALL')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  areaFilter === 'ALL' ? 'bg-white text-emerald-950 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                onClick={() => setAreaFilter('PUSAT')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  areaFilter === 'PUSAT' ? 'bg-white text-emerald-950 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Pusat ({pusatCount})
              </button>
              <button
                onClick={() => setAreaFilter('CABANG')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  areaFilter === 'CABANG' ? 'bg-white text-emerald-950 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Cabang ({cabangCount})
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="text-xs bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden"
            >
              <option value="date_desc">Tgl Reg (Terbaru)</option>
              <option value="date_asc">Tgl Reg (Terlama)</option>
              <option value="name_asc">Nama (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Member Table */}
        {filteredMembers.length === 0 ? (
          <EmptyState
            title="Tidak Ada Data Anggota"
            description="Tidak ada data anggota yang cocok dengan filter atau pencarian Anda."
            actionLabel="Reset Pencarian"
            onAction={() => {
              setSearchQuery('');
              setAreaFilter('ALL');
            }}
            idPrefix="members-empty"
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left text-xs border-collapse" id="tbl-membership-list">
              <thead>
                <tr className="bg-stone-100/80 text-stone-700 font-semibold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                  <th className="p-3">ID Register (NRA)</th>
                  <th className="p-3">Nama Anggota</th>
                  <th className="p-3">Domisili & Wilayah</th>
                  <th className="p-3">Pekerjaan</th>
                  <th className="p-3">Tgl Daftar</th>
                  <th className="p-3 text-right">Simpanan Pokok</th>
                  <th className="p-3 text-right">Simpanan Wajib</th>
                  <th className="p-3 text-right">Simpanan Manasuka</th>
                  <th className="p-3 text-center">Aksi & KTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {filteredMembers.map((m) => {
                  const isPusat = m.area_jenis.includes('PUSAT');
                  return (
                    <tr key={m.id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-950">
                        {m.id}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-stone-900">{m.nama}</div>
                        <span className="text-[10px] text-stone-500">
                          {m.gender === 'P' ? 'Wanita' : 'Pria'}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="text-stone-800 font-medium">{m.kota}, {m.provinsi}</div>
                        <Badge variant={isPusat ? 'gold' : 'teal'} size="xs" className="mt-0.5">
                          {m.plantation}
                        </Badge>
                      </td>
                      <td className="p-3 text-stone-600">
                        {m.pekerjaan || 'Anggota Koperasi'}
                      </td>
                      <td className="p-3 text-stone-600 font-mono text-[11px]">
                        {formatDateIndo(m.tgl_reg)}
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-stone-800">
                        {formatRupiah(m.simpanan_pokok || 500000)}
                      </td>
                      <td className="p-3 text-right font-mono font-medium text-stone-800">
                        {formatRupiah(m.simpanan_wajib || 360000)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-amber-900">
                        {formatRupiah(m.simpanan_sukarela || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="amber"
                            size="xs"
                            onClick={() => setIdCardMember(m)}
                            title="Cetak Kartu Tanda Anggota (KTA Digital)"
                            leftIcon={<CreditCard className="w-3 h-3 text-stone-950" />}
                          >
                            KTA
                          </Button>

                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(m)}
                              className="p-1.5 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 border border-blue-200 hover:border-blue-600 cursor-pointer"
                              title="Edit Data Anggota"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => handleDeleteMember(m.id, m.nama)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg transition-all shadow-2xs hover:shadow-xs active:scale-95 border border-rose-200 hover:border-rose-600 cursor-pointer"
                              title="Hapus Anggota"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-emerald-800 bg-emerald-950 text-white font-bold text-xs">
                  <td colSpan={5} className="p-3 uppercase tracking-wider text-emerald-200">
                    Subtotal Keseluruhan ({filteredMembers.length} Anggota Ditampilkan)
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-100">
                    {formatRupiah(filteredTotals.pokok)}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-100">
                    {formatRupiah(filteredTotals.wajib)}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-300">
                    {formatRupiah(filteredTotals.manasuka)}
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-amber-300 text-[11px]">
                    Total: {formatRupiah(filteredTotals.grandTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Supabase Schema & Diagnostic Modal */}
      {isSupabaseModalOpen && (
        <div
          id="supabase-status-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-3xl w-full p-6 space-y-4 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 font-serif text-base">
                    Informasi & DDL Skema Supabase: Tabel <code className="font-mono text-emerald-800">public.members</code>
                  </h3>
                  <p className="text-xs text-stone-500">
                    Konfigurasi tabel keanggotaan master untuk PostgreSQL Supabase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Connection Status Card */}
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                <h4 className="font-bold text-stone-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-700" />
                  Status Koneksi Supabase Saat Ini
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200 space-y-1">
                    <span className="text-[10px] text-stone-500 uppercase font-mono block">Status Konfigurasi:</span>
                    <div className="font-bold text-stone-900 flex items-center gap-1.5">
                      {supabaseStatus?.isConnected ? (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-emerald-600" /> Terhubung (Live PostgreSQL)
                        </span>
                      ) : (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Info className="w-4 h-4 text-amber-600" /> Local Storage Mode
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-stone-200 space-y-1">
                    <span className="text-[10px] text-stone-500 uppercase font-mono block">Latensi & Baris Data:</span>
                    <div className="font-bold text-stone-900 font-mono">
                      {supabaseStatus?.latencyMs !== undefined ? `${supabaseStatus.latencyMs} ms` : '-'} • {supabaseStatus?.rowCount !== undefined ? `${supabaseStatus.rowCount} Baris` : `${members.length} Baris (Lokal)`}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-lg border border-stone-200 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Supabase URL:</span>
                    <span className="font-mono text-stone-800 font-bold">{supabaseStatus?.url || 'Belum diisi'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Publishable / Anon Key:</span>
                    <span className="font-mono text-stone-800">{supabaseStatus?.keyMasked || 'Belum diisi'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Keterangan:</span>
                    <span className="text-stone-800">{supabaseStatus?.statusMessage || sourceMessage}</span>
                  </div>
                </div>
              </div>

              {/* SQL Script Viewer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800 font-mono text-[11px]">
                    SQL DDL Script (Jalankan di Supabase SQL Editor):
                  </span>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleCopySql}
                    leftIcon={copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  >
                    {copiedSql ? 'Tersalin!' : 'Salin SQL'}
                  </Button>
                </div>

                <pre className="p-3 bg-stone-900 text-emerald-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-stone-800 max-h-60 leading-relaxed">
                  {MEMBERS_SQL_DDL}
                </pre>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <p className="font-bold">Panduan Supabase Dashboard:</p>
                <p>1. Buka dashboard Supabase project Anda di browser.</p>
                <p>2. Masuk ke menu <strong>SQL Editor</strong> lalu tempelkan (paste) script SQL di atas.</p>
                <p>3. Klik <strong>Run</strong> untuk membuat tabel, index, dan policy RLS secara otomatis.</p>
                <p>4. Setelah tabel dibuat, klik tombol <strong>"Sinkron ke Supabase"</strong> untuk mengunggah master data awal.</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSupabaseModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Official Add Member Modal (public.members & public.areas) */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        onSuccess={() => {
          loadMembers();
        }}
        onOpenKta={(m) => {
          setIdCardMember(m);
        }}
      />

      {/* Edit Member Modal */}
      {isFormOpen && editingMember && (
        <div
          id="member-form-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full p-6 space-y-4 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-900">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 font-serif text-sm">
                    {editingMember ? 'Edit Data Anggota' : 'Pendaftaran Anggota Baru'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {editingMember ? `Perbarui data untuk ID ${editingMember.id}` : 'Tambahkan anggota ke Buku Register Induk KOPSIM'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="overflow-y-auto space-y-3.5 pr-1 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nama Lengkap Sesuai KTP *</label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  placeholder="Contoh: H. Ahmad Dahlan, S.E."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Jenis Kelamin</label>
                  <select
                    value={formGender}
                    onChange={(e: any) => setFormGender(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  >
                    <option value="L">Pria</option>
                    <option value="P">Wanita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={formTglLahir}
                    onChange={(e) => setFormTglLahir(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={formProvinsi}
                    onChange={(e) => setFormProvinsi(e.target.value)}
                    placeholder="DKI Jakarta"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={formKota}
                    onChange={(e) => setFormKota(e.target.value)}
                    placeholder="Jakarta Pusat"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Alamat Domisili</label>
                <textarea
                  rows={2}
                  value={formAlamat}
                  onChange={(e) => setFormAlamat(e.target.value)}
                  placeholder="Alamat lengkap tempat tinggal"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Pekerjaan</label>
                  <input
                    type="text"
                    value={formPekerjaan}
                    onChange={(e) => setFormPekerjaan(e.target.value)}
                    placeholder="Wiraswasta / PNS / Petani"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Plantation / Wilayah</label>
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
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Simpanan Manasuka Awal (Opsional)</label>
                <input
                  type="number"
                  min="0"
                  step="100000"
                  value={formSukarela}
                  onChange={(e) => setFormSukarela(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  isLoading={isSubmitting}
                  leftIcon={<Save className="w-3.5 h-3.5" />}
                >
                  Simpan Data
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ID Card Modal */}
      {idCardMember && (
        <IdCardModal
          member={idCardMember}
          onClose={() => setIdCardMember(null)}
        />
      )}

      {/* Hidden Canvas for Batch KTA Generation */}
      <canvas ref={batchCanvasRef} className="hidden" />

      {/* Batch Progress Floating Banner */}
      {isBatchGenerating && batchProgress && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-950/95 text-white px-5 py-4 rounded-2xl shadow-2xl border border-amber-400/80 flex items-center gap-4 max-w-md backdrop-blur-xs">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-300 shrink-0" />
          <div className="text-xs space-y-0.5 min-w-0">
            <p className="font-bold text-amber-300 font-mono">
              Mengunduh ({batchProgress.current}/{batchProgress.total})
            </p>
            <p className="text-stone-300 truncate font-medium">
              {batchProgress.name}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Batch KTA Generation */}
      {isConfirmBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-800">
              <div className="p-2.5 bg-amber-100/80 rounded-xl border border-amber-200">
                <Printer className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-stone-900 font-serif">Konfirmasi Cetak Massal KTA</h3>
                <p className="text-xs text-stone-500">Unduh otomatis satu-per-satu</p>
              </div>
            </div>

            <p className="text-sm text-stone-600 leading-relaxed">
              Yakin ingin mengunduh ID Card untuk <strong>{filteredMembers.length > 0 ? filteredMembers.length : members.length} anggota</strong>? Sistem akan memproses kartu satu persatu dengan jeda 600ms.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConfirmBatchModalOpen(false)}
              >
                Batal
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={generateAllCards}
                leftIcon={<Download className="w-3.5 h-3.5" />}
              >
                Mulai Unduh
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Member Dialog */}
      <ConfirmDialog
        isOpen={!!deletingMember}
        onClose={() => setDeletingMember(null)}
        onConfirm={handleConfirmDeleteMember}
        title="Hapus Data Anggota"
        message={`Apakah Anda yakin ingin menghapus data anggota "${deletingMember?.nama}" (${deletingMember?.id}) dari database koperasi? Tindakan ini akan menghapus akses portal anggota yang bersangkutan.`}
        confirmText="Hapus Anggota"
        cancelText="Batal"
        variant="danger"
      />
    </div>
  );
};
