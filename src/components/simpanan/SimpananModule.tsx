import React, { useState, useEffect, useMemo } from 'react';
import { memberService } from '../../services/memberService';
import { transactionService, cleanNumeric } from '../../services/transactionService';
import { MemberRecord, TransactionRecord } from '../../types/database';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import { EmptyState } from '../common/EmptyState';
import {
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  RefreshCw,
  X,
  FileCheck,
  ShieldAlert,
  Coins,
  History,
} from 'lucide-react';

export const SimpananModule: React.FC = () => {
  const { role, user } = useAuth();
  const { showToast } = useNotification();

  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [savingsTransactions, setSavingsTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'REKAP' | 'MUTASI'>('REKAP');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [koperasiSummary, setKoperasiSummary] = useState<{
    totalSimpananPokok: number;
    totalSimpananWajib: number;
    totalSimpananManasuka: number;
    grandTotalSimpanan: number;
    memberMap: Record<string, { pokok: number; wajib: number; manasuka: number; total: number; accountName: string }>;
  }>({
    totalSimpananPokok: 0,
    totalSimpananWajib: 0,
    totalSimpananManasuka: 0,
    grandTotalSimpanan: 0,
    memberMap: {},
  });

  // Setoran Modal State
  const [isDepositOpen, setIsDepositOpen] = useState<boolean>(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [depositType, setDepositType] = useState<'Simpanan Pokok' | 'Simpanan Wajib' | 'Simpanan Manasuka'>('Simpanan Manasuka');
  const [depositAmount, setDepositAmount] = useState<number>(500000);
  const [depositMethod, setDepositMethod] = useState<string>('Bank BSI');
  const [depositNotes, setDepositNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canMutate = role === 'ADMIN' || role === 'DIRECTOR';

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [membersData, allTrx, summaryRes] = await Promise.all([
        memberService.getMembers(),
        transactionService.getTransactions('PUSAT'),
        transactionService.getKoperasiSavingsSummary(),
      ]);
      setMembers(membersData);
      setKoperasiSummary(summaryRes);

      // Filter only transactions related to savings
      const savingsOnly = allTrx.filter((t) => {
        const k = (t.kategori || '').toUpperCase();
        return k.includes('SIMPANAN') || k.includes('POKOK') || k.includes('WAJIB') || k.includes('MANASUKA') || k.includes('SUKARELA');
      });
      setSavingsTransactions(savingsOnly);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat data simpanan.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Per-member savings dynamically calculated from public.transactions query aggregation
  const memberSavingsMap = useMemo(() => {
    const map: Record<string, { pokok: number; wajib: number; manasuka: number; total: number }> = {};
    const memberMapFromSql = koperasiSummary.memberMap || {};

    members.forEach((m) => {
      const mNameLower = (m.nama || '').toLowerCase().trim();
      const mIdLower = (m.id || '').toLowerCase().trim();

      // Check if an exact match or partial match exists in the SQL aggregated result
      let matchedEntry: { pokok: number; wajib: number; manasuka: number; total: number } | null = null;

      for (const key of Object.keys(memberMapFromSql)) {
        const val = memberMapFromSql[key];
        const keyLower = key.toLowerCase();
        if (
          keyLower === mNameLower ||
          keyLower === mIdLower ||
          (mNameLower.length > 3 && keyLower.includes(mNameLower)) ||
          (keyLower.length > 3 && mNameLower.includes(keyLower))
        ) {
          matchedEntry = val;
          break;
        }
      }

      if (matchedEntry && (matchedEntry.pokok > 0 || matchedEntry.wajib > 0 || matchedEntry.manasuka > 0)) {
        map[m.id] = {
          pokok: matchedEntry.pokok,
          wajib: matchedEntry.wajib,
          manasuka: matchedEntry.manasuka,
          total: matchedEntry.pokok + matchedEntry.wajib + matchedEntry.manasuka,
        };
      } else {
        // Fallback to member registered baseline if no transaction in database yet
        const p = m.simpanan_pokok || 500000;
        const w = m.simpanan_wajib || 360000;
        const s = m.simpanan_sukarela || 0;
        map[m.id] = {
          pokok: p,
          wajib: w,
          manasuka: s,
          total: p + w + s,
        };
      }
    });

    return map;
  }, [members, koperasiSummary]);

  // Aggregated calculations based on dynamic member savings map
  const totals = useMemo(() => {
    let pokok = 0;
    let wajib = 0;
    let manasuka = 0;

    members.forEach((m) => {
      const s = memberSavingsMap[m.id] || {
        pokok: m.simpanan_pokok || 500000,
        wajib: m.simpanan_wajib || 360000,
        manasuka: m.simpanan_sukarela || 0,
        total: 860000,
      };
      pokok += s.pokok;
      wajib += s.wajib;
      manasuka += s.manasuka;
    });

    return {
      pokok,
      wajib,
      manasuka,
      grandTotal: pokok + wajib + manasuka,
    };
  }, [members, memberSavingsMap]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      showToast('Pilih anggota terlebih dahulu.', 'error');
      return;
    }
    if (depositAmount <= 0) {
      showToast('Nominal simpanan harus lebih dari Rp 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const member = members.find((m) => m.id === selectedMemberId);
      const res = await transactionService.saveTransaction({
        tanggal: new Date().toISOString().split('T')[0],
        referal: 'KOPERASI',
        plantation: member?.plantation || 'PUSAT JAKARTA',
        jenis: 'MASUK',
        kategori: depositType,
        metode_bayar: depositMethod,
        qty: 1,
        jumlah: depositAmount,
        area_jenis: member?.area_jenis || 'KOPERASI PUSAT',
        keterangan: depositNotes || `Setoran ${depositType} an. ${member?.nama} (${member?.id})`,
      });

      if (res.success) {
        showToast(`Setoran ${depositType} berhasil dicatat dengan ID: ${res.id}`, 'success');
        setIsDepositOpen(false);
        await loadData();
      } else {
        showToast(res.error || 'Gagal mencatat simpanan.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.nama.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.kota.toLowerCase().includes(q)
    );
  });

  if (isLoading && members.length === 0) {
    return (
      <LoadingState
        message="Memuat Neraca Simpanan KOPSIM Mandiri..."
        subMessage="Menghitung total Simpanan Pokok, Simpanan Wajib 3 Tahun, dan Simpanan Sukarela"
        fullHeight
      />
    );
  }

  return (
    <div className="space-y-6" id="simpanan-module-root">
      {/* 4 KPI Cards: Grand Total & 3 Savings Types */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-800" headerBorder={false}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                TOTAL SIMPANAN ANGGOTA
              </span>
              <h3 className="text-xl font-bold text-emerald-950 mt-1 font-serif">
                {formatRupiah(totals.grandTotal)}
              </h3>
              <span className="text-[11px] text-emerald-700 font-medium">Modal Pokok, Wajib & Sukarela</span>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Coins className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-teal-600" headerBorder={false}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                SIMPANAN POKOK
              </span>
              <h3 className="text-xl font-bold text-teal-950 mt-1 font-serif">
                {formatRupiah(totals.pokok)}
              </h3>
              <span className="text-[11px] text-teal-800">Rp 500.000 / Anggota</span>
            </div>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-600" headerBorder={false}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                SIMPANAN WAJIB
              </span>
              <h3 className="text-xl font-bold text-amber-950 mt-1 font-serif">
                {formatRupiah(totals.wajib)}
              </h3>
              <span className="text-[11px] text-amber-800">Rp 360.000 / 3 Tahun</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <History className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-indigo-600" headerBorder={false}>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 font-mono">
                SIMPANAN MANASUKA
              </span>
              <h3 className="text-xl font-bold text-indigo-950 mt-1 font-serif">
                {formatRupiah(totals.manasuka)}
              </h3>
              <span className="text-[11px] text-indigo-800">Manasuka / Sukarela Fleksibel</span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <Card
        id="card-simpanan-main"
        title="Pengelolaan Simpanan & Tabungan Syariah"
        subtitle="Struktur permodalan koperasi: Simpanan Pokok, Simpanan Wajib, dan Simpanan Manasuka"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Sinkron
            </Button>
            {canMutate && (
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  setSelectedMemberId(members[0]?.id || '');
                  setIsDepositOpen(true);
                }}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Setor Simpanan
              </Button>
            )}
          </div>
        }
      >
        {/* Tab Buttons */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-3 mb-4 flex-wrap">
          <button
            onClick={() => setActiveTab('REKAP')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'REKAP'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Buku Rekap Simpanan per Anggota
          </button>
          <button
            onClick={() => setActiveTab('MUTASI')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'MUTASI'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Riwayat Mutasi Masuk / Keluar
          </button>
        </div>

        {activeTab === 'REKAP' && (
          <div className="space-y-4">
            <div className="relative max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Cari anggota / nomor register..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse" id="tbl-simpanan-rekap">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50/90 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3">ID Anggota</th>
                    <th className="py-2.5 px-3">Nama Anggota</th>
                    <th className="py-2.5 px-3">Entitas / Area</th>
                    <th className="py-2.5 px-3 text-right">Simpanan Pokok</th>
                    <th className="py-2.5 px-3 text-right">Simpanan Wajib</th>
                    <th className="py-2.5 px-3 text-right">Simpanan Manasuka</th>
                    <th className="py-2.5 px-3 text-right">Total Simpanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMembers.map((m) => {
                    const savings = memberSavingsMap[m.id] || {
                      pokok: m.simpanan_pokok || 500000,
                      wajib: m.simpanan_wajib || 360000,
                      manasuka: m.simpanan_sukarela || 0,
                      total: 860000,
                    };
                    const sp = savings.pokok;
                    const sw = savings.wajib;
                    const ss = savings.manasuka;
                    const subTotal = savings.total;
                    return (
                      <tr key={m.id} className="hover:bg-stone-50/70">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-950">{m.id}</td>
                        <td className="py-3 px-3 font-semibold text-stone-900">{m.nama}</td>
                        <td className="py-3 px-3 text-stone-600">{m.plantation}</td>
                        <td className="py-3 px-3 text-right text-stone-700">{formatRupiah(sp)}</td>
                        <td className="py-3 px-3 text-right text-stone-700">{formatRupiah(sw)}</td>
                        <td className="py-3 px-3 text-right text-amber-900 font-medium">{formatRupiah(ss)}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-950 font-serif">
                          {formatRupiah(subTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-emerald-900 bg-emerald-950/5 text-stone-900 font-bold text-xs">
                    <td colSpan={3} className="py-3 px-3 uppercase tracking-wider text-emerald-950">
                      Subtotal Akumulasi Simpanan ({filteredMembers.length} Anggota)
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-950">
                      {formatRupiah(
                        filteredMembers.reduce((acc, m) => acc + (memberSavingsMap[m.id]?.pokok || 0), 0)
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-950">
                      {formatRupiah(
                        filteredMembers.reduce((acc, m) => acc + (memberSavingsMap[m.id]?.wajib || 0), 0)
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-950">
                      {formatRupiah(
                        filteredMembers.reduce((acc, m) => acc + (memberSavingsMap[m.id]?.manasuka || 0), 0)
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-serif font-bold text-emerald-950 text-sm">
                      {formatRupiah(
                        filteredMembers.reduce((acc, m) => acc + (memberSavingsMap[m.id]?.total || 0), 0)
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'MUTASI' && (
          <div>
            {savingsTransactions.length === 0 ? (
              <EmptyState
                title="Belum Ada Riwayat Mutasi Simpanan"
                description="Semua transaksi simpanan pokok, wajib, dan sukarela akan tercatat otomatis di sini."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">ID Trx</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3">Metode / Akun</th>
                      <th className="py-2.5 px-3">Keterangan</th>
                      <th className="py-2.5 px-3 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {savingsTransactions.map((trx) => (
                      <tr key={trx.id} className="hover:bg-stone-50">
                        <td className="py-3 px-3 font-mono font-bold text-emerald-950">{trx.id}</td>
                        <td className="py-3 px-3 text-stone-600">{formatDateIndo(trx.tanggal)}</td>
                        <td className="py-3 px-3 font-medium text-stone-800">{trx.kategori}</td>
                        <td className="py-3 px-3 text-stone-600">{trx.metode_bayar}</td>
                        <td className="py-3 px-3 text-stone-600">{trx.keterangan}</td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-950 font-serif">
                          {formatRupiah(trx.jumlah)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Setor Simpanan Modal */}
      {isDepositOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-stone-900 font-serif">Setor Simpanan Anggota</h3>
              <button onClick={() => setIsDepositOpen(false)} className="p-1 text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Pilih Anggota *</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} — {m.nama} ({m.plantation})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Jenis Simpanan</label>
                <select
                  value={depositType}
                  onChange={(e: any) => setDepositType(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                >
                  <option value="Simpanan Pokok">Simpanan Pokok (Rp 500.000)</option>
                  <option value="Simpanan Wajib">Simpanan Wajib (Rp 360.000 / 3 Thn)</option>
                  <option value="Simpanan Manasuka">Simpanan Manasuka / Sukarela</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Nominal Setoran (Rp) *</label>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Sumber Dana / Rekening</label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                >
                  <option value="Bank BSI">Bank Syariah Indonesia (BSI)</option>
                  <option value="Bank Mandiri">Bank Mandiri</option>
                  <option value="Kas Tunai">Kas Tunai Kantor</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Catatan / Keterangan</label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="Keterangan setoran tambahan"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsDepositOpen(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                  Simpan Setoran
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
