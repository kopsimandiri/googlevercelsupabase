import React, { useState, useEffect } from 'react';
import { reportService, COA_ACCOUNTS } from '../../services/reportService';
import { COAAccount, JournalEntry, LedgerEntry } from '../../types/database';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import {
  FileBarChart,
  BookOpen,
  Scale,
  TrendingUp,
  FileCheck,
  Printer,
  Download,
  Coins,
  RefreshCw,
} from 'lucide-react';

export type ReportSubTab = 'JURNAL' | 'BUKU_BESAR' | 'NERACA_SALDO' | 'LABA_RUGI' | 'NERACA' | 'SHU';

interface ReportsModuleProps {
  initialTab?: ReportSubTab;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ initialTab = 'JURNAL' }) => {
  const [activeTab, setActiveTab] = useState<ReportSubTab>(initialTab);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Accounting data states
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [selectedAccountCode, setSelectedAccountCode] = useState<string>('1110');
  const [ledgerData, setLedgerData] = useState<{ account: COAAccount; entries: LedgerEntry[]; finalSaldo: number } | null>(null);
  const [trialBalance, setTrialBalance] = useState<Array<{ kode: string; nama: string; debit: number; kredit: number }>>([]);
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [shuData, setShuData] = useState<any>(null);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [jEntries, tb, pl, bs, shu, ledg] = await Promise.all([
        reportService.getJournalEntries(),
        reportService.getTrialBalance(),
        reportService.getProfitLoss(),
        reportService.getBalanceSheet(),
        reportService.getSHUCalculation(),
        reportService.getLedger(selectedAccountCode),
      ]);

      setJournal(jEntries);
      setTrialBalance(tb);
      setProfitLoss(pl);
      setBalanceSheet(bs);
      setShuData(shu);
      setLedgerData(ledg);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [selectedAccountCode]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading && journal.length === 0) {
    return <LoadingState message="Menyusun Laporan Keuangan Standar Akuntansi Koperasi..." fullHeight />;
  }

  return (
    <div className="space-y-6" id="reports-module-root">
      {/* Report Type Selector Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-3 bg-white rounded-xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'JURNAL', label: 'Jurnal Umum' },
            { id: 'BUKU_BESAR', label: 'Buku Besar' },
            { id: 'NERACA_SALDO', label: 'Neraca Saldo' },
            { id: 'LABA_RUGI', label: 'Laba Rugi' },
            { id: 'NERACA', label: 'Neraca Keuangan' },
            { id: 'SHU', label: 'Alokasi SHU (25%)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportSubTab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadReportData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Sinkron
          </Button>
          <Button variant="gold" size="sm" onClick={handlePrint} leftIcon={<Printer className="w-3.5 h-3.5" />}>
            Cetak Laporan
          </Button>
        </div>
      </div>

      {/* Tab: JURNAL UMUM */}
      {activeTab === 'JURNAL' && (
        <Card title="Jurnal Umum (General Journal)" subtitle="Pencatatan debet & kredit mutasi transaksi">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Tanggal</th>
                  <th className="py-2.5 px-3">ID Ref</th>
                  <th className="py-2.5 px-3">Kode & Nama Akun</th>
                  <th className="py-2.5 px-3 text-right">Debet (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Kredit (Rp)</th>
                  <th className="py-2.5 px-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {journal.map((j, idx) => (
                  <tr key={idx} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 text-stone-600">{formatDateIndo(j.tanggal)}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-950">{j.id}</td>
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-stone-500 mr-1.5">{j.akun}</span>
                      <span className="font-medium text-stone-900">{j.namaAkun}</span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-800">
                      {j.debit > 0 ? formatRupiah(j.debit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-stone-800">
                      {j.kredit > 0 ? formatRupiah(j.kredit) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">{j.keterangan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: BUKU BESAR */}
      {activeTab === 'BUKU_BESAR' && (
        <Card
          title="Buku Besar (General Ledger)"
          subtitle="Rincian pergerakan saldo per kode akun COA"
          action={
            <select
              value={selectedAccountCode}
              onChange={(e) => setSelectedAccountCode(e.target.value)}
              className="px-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-hidden"
            >
              {COA_ACCOUNTS.map((acc) => (
                <option key={acc.kode} value={acc.kode}>
                  {acc.kode} — {acc.nama} ({acc.jenis})
                </option>
              ))}
            </select>
          }
        >
          {ledgerData && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-500 font-mono block">AKUN TERPILIH:</span>
                  <h4 className="text-sm font-bold text-stone-900">
                    {ledgerData.account.kode} — {ledgerData.account.nama}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-stone-500 font-mono block">SALDO AKHIR:</span>
                  <span className="text-base font-bold text-emerald-950 font-serif">
                    {formatRupiah(ledgerData.finalSaldo)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">ID Ref</th>
                      <th className="py-2.5 px-3">Uraian / Keterangan</th>
                      <th className="py-2.5 px-3 text-right">Debet</th>
                      <th className="py-2.5 px-3 text-right">Kredit</th>
                      <th className="py-2.5 px-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {ledgerData.entries.map((entry, idx) => (
                      <tr key={idx} className="hover:bg-stone-50">
                        <td className="py-2.5 px-3 text-stone-600">{formatDateIndo(entry.tanggal)}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-950">{entry.id}</td>
                        <td className="py-2.5 px-3 text-stone-800">{entry.keterangan}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{entry.debit > 0 ? formatRupiah(entry.debit) : '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{entry.kredit > 0 ? formatRupiah(entry.kredit) : '-'}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-950">
                          {formatRupiah(entry.saldo)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Tab: NERACA SALDO */}
      {activeTab === 'NERACA_SALDO' && (
        <Card title="Neraca Saldo (Trial Balance)" subtitle="Keseimbangan debet dan kredit seluruh akun COA">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-3">Kode Akun</th>
                  <th className="py-2.5 px-3">Nama Akun</th>
                  <th className="py-2.5 px-3 text-right">Debet (Rp)</th>
                  <th className="py-2.5 px-3 text-right">Kredit (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {trialBalance.map((item) => (
                  <tr key={item.kode} className="hover:bg-stone-50">
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-950">{item.kode}</td>
                    <td className="py-2.5 px-3 font-medium text-stone-900">{item.nama}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.debit > 0 ? formatRupiah(item.debit) : '-'}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{item.kredit > 0 ? formatRupiah(item.kredit) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab: LABA RUGI */}
      {activeTab === 'LABA_RUGI' && profitLoss && (
        <Card title="Laporan Laba Rugi (Income Statement)" subtitle="Pendapatan usaha vs beban operasional">
          <div className="space-y-6 text-xs">
            {/* Pendapatan */}
            <div>
              <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-sm mb-2">1. Pendapatan</h4>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl p-3 bg-stone-50">
                {profitLoss.pendapatan.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between py-2">
                    <span className="text-stone-700">{p.nama}</span>
                    <span className="font-mono font-bold text-stone-900">{formatRupiah(p.jumlah)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 pt-3 font-bold text-emerald-900 border-t border-stone-200">
                  <span>Total Pendapatan:</span>
                  <span className="font-serif text-sm">{formatRupiah(profitLoss.totalPendapatan)}</span>
                </div>
              </div>
            </div>

            {/* Beban */}
            <div>
              <h4 className="font-bold text-rose-950 uppercase tracking-wider text-sm mb-2">2. Beban Usaha</h4>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl p-3 bg-stone-50">
                {profitLoss.beban.map((b: any, i: number) => (
                  <div key={i} className="flex justify-between py-2">
                    <span className="text-stone-700">{b.nama}</span>
                    <span className="font-mono font-bold text-stone-900">{formatRupiah(b.jumlah)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2 pt-3 font-bold text-rose-900 border-t border-stone-200">
                  <span>Total Beban:</span>
                  <span className="font-serif text-sm">{formatRupiah(profitLoss.totalBeban)}</span>
                </div>
              </div>
            </div>

            {/* Net Profit */}
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between">
              <span className="font-bold text-emerald-950 text-sm">Laba Bersih Tahun Berjalan:</span>
              <span className="text-xl font-bold text-emerald-950 font-serif">
                {formatRupiah(profitLoss.labaBersih)}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: NERACA KEUANGAN */}
      {activeTab === 'NERACA' && balanceSheet && (
        <Card title="Neraca Keuangan (Balance Sheet)" subtitle="Posisi Aset, Liabilitas, dan Ekuitas Koperasi">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* ASET */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-3">
              <h4 className="font-bold text-emerald-950 uppercase tracking-wider text-sm">ASET</h4>
              <div className="divide-y divide-stone-200">
                {balanceSheet.aset.map((a: any, i: number) => (
                  <div key={i} className="flex justify-between py-2">
                    <span className="text-stone-700">{a.nama}</span>
                    <span className="font-mono font-bold">{formatRupiah(a.jumlah)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t-2 border-emerald-700 flex justify-between font-bold text-emerald-950">
                <span>TOTAL ASET:</span>
                <span className="font-serif text-sm">{formatRupiah(balanceSheet.totalAset)}</span>
              </div>
            </div>

            {/* LIABILITAS & EKUITAS */}
            <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-4">
              <div>
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-sm mb-2">LIABILITAS</h4>
                <div className="divide-y divide-stone-200">
                  {balanceSheet.liabilitas.length === 0 ? (
                    <div className="py-2 text-stone-500">Tidak ada hutang usaha tercatat.</div>
                  ) : (
                    balanceSheet.liabilitas.map((l: any, i: number) => (
                      <div key={i} className="flex justify-between py-2">
                        <span className="text-stone-700">{l.nama}</span>
                        <span className="font-mono font-bold">{formatRupiah(l.jumlah)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-stone-900 uppercase tracking-wider text-sm mb-2">EKUITAS</h4>
                <div className="divide-y divide-stone-200">
                  {balanceSheet.ekuitas.map((e: any, i: number) => (
                    <div key={i} className="flex justify-between py-2">
                      <span className="text-stone-700">{e.nama}</span>
                      <span className="font-mono font-bold">{formatRupiah(e.jumlah)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t-2 border-stone-700 flex justify-between font-bold text-stone-900">
                <span>TOTAL LIABILITAS & EKUITAS:</span>
                <span className="font-serif text-sm">{formatRupiah(balanceSheet.totalLiabilitas + balanceSheet.totalEkuitas)}</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Tab: SHU */}
      {activeTab === 'SHU' && shuData && (
        <Card
          title="Perhitungan & Alokasi Sisa Hasil Usaha (SHU)"
          subtitle="Sesuai Anggaran Dasar KOPSIM: 25% Cadangan Koperasi & 75% Bagian Anggota"
        >
          <div className="space-y-5 text-xs">
            <div className="p-4 bg-emerald-50/80 border border-emerald-300 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-stone-600 block">Total SHU Kotor (Laba Bersih Usaha):</span>
                <span className="text-xl font-bold text-emerald-950 font-serif">{formatRupiah(shuData.totalSHUKotor)}</span>
              </div>
              <Badge variant="gold" size="md">AD/ART Compliant</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase text-emerald-900 font-mono">1. CADANGAN KOPERASI (25%)</span>
                <p className="text-lg font-bold text-stone-900 font-serif">{formatRupiah(shuData.cadanganKoperasi)}</p>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Dana penguatan modal dan perlindungan likuiditas usaha koperasi jangka panjang.
                </p>
              </div>

              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <span className="text-[10px] font-bold uppercase text-amber-900 font-mono">2. SHU DIBAGIKAN KE ANGGOTA (75%)</span>
                <p className="text-lg font-bold text-stone-900 font-serif">{formatRupiah(shuData.shuBagianAnggota)}</p>
                <div className="pt-1 text-[11px] text-stone-600 space-y-1">
                  <div className="flex justify-between">
                    <span>• Jasa Modal (40%):</span>
                    <span className="font-semibold">{formatRupiah(shuData.jasaModal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Jasa Usaha / Transaksi (60%):</span>
                    <span className="font-semibold">{formatRupiah(shuData.jasaUsaha)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
