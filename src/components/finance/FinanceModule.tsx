import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { transactionService } from '../../services/transactionService';
import { memberService, KoperasiPusatBankAccounts, DEFAULT_KOPERASI_PUSAT_ACCOUNTS } from '../../services/memberService';
import { DashboardMetrics, TransactionRecord } from '../../types/database';
import { formatDateIndo, formatRupiah } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { LoadingState } from '../common/LoadingState';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Building,
  Briefcase,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  RefreshCw,
  Landmark,
} from 'lucide-react';

export const FinanceModule: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedEntity, setSelectedEntity] = useState<'ALL' | 'PUSAT' | 'CABANG' | 'PROJECT'>('ALL');
  const [pusatAccounts, setPusatAccounts] = useState<KoperasiPusatBankAccounts>(DEFAULT_KOPERASI_PUSAT_ACCOUNTS);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [data, accounts] = await Promise.all([
        dashboardService.getDashboardMetrics('ALL'),
        memberService.getKoperasiPusatAccounts(),
      ]);
      setMetrics(data);
      if (accounts) {
        setPusatAccounts(accounts);
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

  if (isLoading && !metrics) {
    return <LoadingState message="Memuat Arus Keuangan & Likuiditas..." fullHeight />;
  }

  const fin = metrics?.financial;

  return (
    <div className="space-y-6" id="finance-module-root">
      {/* Entity Switcher Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-white rounded-xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900">
              Klasifikasi Finansial Entitas
            </h3>
            <p className="text-[11px] text-stone-500">Pusat, Wilayah Cabang, dan Sektor Riil 8 Proyek</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={loadData} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
          Sinkron Saldo
        </Button>
      </div>

      {/* 3 Main Entity Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KOPERASI PUSAT */}
        <Card
          title="Koperasi Pusat (Jakarta)"
          subtitle="Kas utama & simpanan pusat"
          className="border-t-4 border-t-emerald-800"
          action={<Badge variant="success" size="sm">Pusat</Badge>}
        >
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-mono">Saldo Efektif:</span>
              <p className="text-2xl font-bold text-emerald-950 font-serif">
                {formatRupiah(fin?.totalKoperasi ?? (fin?.koperasi ? fin.koperasi.masuk - fin.koperasi.keluar : 0))}
              </p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-emerald-800">
                <span>Penerimaan Simpanan Pokok:</span>
                <span className="font-semibold">{formatRupiah(fin?.simpanan.pokok || 0)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Penerimaan Simpanan Wajib:</span>
                <span className="font-semibold">{formatRupiah(fin?.simpanan.wajib || 0)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* KOPERASI CABANG */}
        <Card
          title="Koperasi Wilayah Cabang"
          subtitle="Operasional regional & mitra daerah"
          className="border-t-4 border-t-amber-600"
          action={<Badge variant="gold" size="sm">Regional</Badge>}
        >
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-mono">Saldo Efektif:</span>
              <p className="text-2xl font-bold text-amber-950 font-serif">
                {formatRupiah(fin?.totalKoperasi ?? (fin?.koperasi ? fin.koperasi.masuk - fin.koperasi.keluar : 0))}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-amber-900">
                <span>Simpanan Sukarela Daerah:</span>
                <span className="font-semibold">{formatRupiah(fin?.simpanan.manasuka || 0)}</span>
              </div>
              <div className="flex justify-between text-amber-900">
                <span>Cabang Aktif:</span>
                <span className="font-semibold">Jabar, Jatim, Jateng</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 8 STRATEGIC PROJECTS */}
        <Card
          title="8 Strategic Projects"
          subtitle="Arus modal trading komoditas riil"
          className="border-t-4 border-t-teal-700"
          action={<Badge variant="primary" size="sm">Sektor Riil</Badge>}
        >
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-stone-500 uppercase font-mono">Saldo Bersih Project:</span>
              <p className="text-2xl font-bold text-teal-950 font-serif">
                {formatRupiah(fin?.totalProject ?? (fin?.project ? fin.project.masuk - fin.project.keluar : 0))}
              </p>
            </div>
            <div className="p-3 bg-teal-50 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-teal-900">
                <span>Total Penjualan Komoditas:</span>
                <span className="font-semibold">{formatRupiah(fin?.project.masuk || 0)}</span>
              </div>
              <div className="flex justify-between text-teal-900">
                <span>Total HPP / Bahan Baku:</span>
                <span className="font-semibold">{formatRupiah(fin?.project.keluar || 0)}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Rekening Kas & Bank Resmi Entitas KOPERASI PUSAT */}
      <Card
        title="Rekening Resmi Entitas: KOPERASI PUSAT (Tabel public.areas)"
        action={
          <span className="text-[11px] font-mono text-stone-500">
            Sumber Data: Supabase public.areas
          </span>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Rekening Simpanan Anggota: BSI 3331239991 - KOPSIM */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 font-mono flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                BANK SYARIAH INDONESIA (BSI)
              </span>
              <h4 className="text-sm font-bold text-stone-900 mt-1 font-mono">
                {pusatAccounts.simpananAnggota || 'BSI 3331239991 - KOPSIM'}
              </h4>
              <p className="text-xs text-stone-600">Atas Nama: KOPSIM (Koperasi Syarikat Islam Mandiri)</p>
              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-200/90 text-emerald-950 border border-emerald-300">
                  Peruntukan: Khusus Simpanan Anggota (Pokok, Wajib & Sukarela)
                </span>
              </div>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-800 shrink-0" />
          </div>

          {/* Rekening Proyek, Investasi & Operasional: MANDIRI 1230050002809 - KOPSIM */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 font-mono flex items-center gap-1.5">
                <Landmark className="w-3.5 h-3.5 text-amber-700" />
                BANK MANDIRI
              </span>
              <h4 className="text-sm font-bold text-stone-900 mt-1 font-mono">
                {pusatAccounts.projectInvestasiOperasional || 'MANDIRI 1230050002809 - KOPSIM'}
              </h4>
              <p className="text-xs text-stone-600">Atas Nama: KOPSIM (Koperasi Syarikat Islam Mandiri)</p>
              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-200/90 text-amber-950 border border-amber-300">
                  Peruntukan: Khusus Proyek, Investasi & Biaya Operasional
                </span>
              </div>
            </div>
            <Landmark className="w-6 h-6 text-amber-800 shrink-0" />
          </div>
        </div>
      </Card>
    </div>
  );
};
