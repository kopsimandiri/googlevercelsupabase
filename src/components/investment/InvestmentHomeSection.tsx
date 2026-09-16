import React, { useState, useEffect } from 'react';
import {
  ProjectInvestmentCampaign,
  SCFPublicStats,
  InvestmentTransaction,
} from '../../types/investment';
import { investmentService } from '../../services/investmentService';
import { InvestmentCampaignCard } from './InvestmentCampaignCard';
import { InvestmentCheckoutModal } from './InvestmentCheckoutModal';
import { InvestmentComplianceModal } from './InvestmentComplianceModal';
import { formatRupiah } from '../../utils/formatters';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import {
  Coins,
  TrendingUp,
  ShieldCheck,
  Building2,
  Users,
  CheckCircle2,
  Filter,
  Sparkles,
  Info,
} from 'lucide-react';

interface InvestmentHomeSectionProps {
  onSelectProjectDetail?: (projectId: string) => void;
}

export const InvestmentHomeSection: React.FC<InvestmentHomeSectionProps> = ({
  onSelectProjectDetail,
}) => {
  const [campaigns, setCampaigns] = useState<ProjectInvestmentCampaign[]>([]);
  const [stats, setStats] = useState<SCFPublicStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCampaignForInvest, setSelectedCampaignForInvest] =
    useState<ProjectInvestmentCampaign | null>(null);
  const [showComplianceModal, setShowComplianceModal] = useState<boolean>(false);

  // Filter state
  const [filterInstrument, setFilterInstrument] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  useEffect(() => {
    loadPublicData();
  }, []);

  const loadPublicData = async () => {
    setIsLoading(true);
    try {
      const [campList, statsData] = await Promise.all([
        investmentService.getAllCampaigns(),
        investmentService.getPublicSCFStats(),
      ]);
      setCampaigns(campList.filter((c) => c.is_investment_enabled !== false));
      setStats(statsData);
    } catch (err) {
      console.error('Error loading public investment section:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    if (filterInstrument !== 'ALL' && c.instrument_type !== filterInstrument) {
      return false;
    }
    if (filterStatus !== 'ALL') {
      if (filterStatus === 'OPEN' && c.status !== 'OPEN') return false;
      if (filterStatus === 'FUNDED' && c.status !== 'FUNDED' && c.status !== 'ACTIVE') return false;
    }
    return true;
  });

  return (
    <section id="investment-home-section" className="space-y-8 animate-fadeIn">
      {/* 1. SCF METRICS BANNER (Inspirasi Shafiq.id & Plazadana) */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-stone-900 text-white p-6 sm:p-8 shadow-xl border border-emerald-800/60 relative overflow-hidden">
        {/* Background Subtle Accent */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-accent-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-800/80 pb-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-accent-gold/20 text-accent-gold border border-accent-gold/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                  Securities Crowdfunding Syariah (SCF)
                </span>
                <span className="text-emerald-300 text-xs font-mono">
                  Unit Strategic Projects KOPSIM
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                Peluang Investasi Proyek Sektor Riil
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Penyertaan modal langsung pada 8 rantai pasok strategis koperasi dengan akad syariah
                murni (SUKS & Sukuk), diawasi Dewan Pengawas Syariah, dan berorientasi dampak ekonomi
                umat.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowComplianceModal(true)}
              className="border-emerald-600 text-emerald-100 hover:bg-emerald-900/60 text-xs font-medium shrink-0 self-start md:self-auto"
              leftIcon={<ShieldCheck className="w-4 h-4 text-accent-gold" />}
            >
              Kepatuhan & Fatwa DSN-MUI
            </Button>
          </div>

          {/* 4 Public Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-left">
            <div className="p-3.5 rounded-2xl bg-emerald-900/50 border border-emerald-800/60">
              <span className="text-[11px] text-emerald-300 font-mono block">
                Total Dana Tersalurkan
              </span>
              <span className="text-xl sm:text-2xl font-bold font-serif text-accent-gold mt-1 block">
                {formatRupiah(stats?.totalDanaTersalurkan || 2420000000)}
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                Ke 8 unit usaha riil koperasi
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-900/50 border border-emerald-800/60">
              <span className="text-[11px] text-emerald-300 font-mono block">
                Rata-rata Proyeksi ROI
              </span>
              <span className="text-xl sm:text-2xl font-bold font-serif text-white mt-1 block">
                {stats?.rataRataRoi || 15.2}% p.a.
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                Bagi hasil SHU berkala
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-900/50 border border-emerald-800/60">
              <span className="text-[11px] text-emerald-300 font-mono block">
                Investor Anggota Aktif
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white mt-1 block">
                {stats?.totalInvestorAktif || 148}+
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                Pemegang efek terdaftar
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-900/50 border border-emerald-800/60">
              <span className="text-[11px] text-emerald-300 font-mono block">
                Tingkat Keberhasilan (TKB)
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                {stats?.tingkatKeberhasilanPenggalangan || 100}%
              </span>
              <span className="text-[10px] text-stone-400 mt-1 block">
                {stats?.totalProyekTerdanai || 4} Kampanye Sukses
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. FILTER & LISTING HEADER */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold font-serif text-stone-900">
              Daftar Penawaran Efek Berjalan
            </h3>
            <p className="text-xs text-stone-500">
              Pilih peluang investasi proyek untuk meninjau prospektus, akad syariah, dan proyeksi hasil
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
              {['ALL', 'SUKS', 'SUKUK'].map((inst) => (
                <button
                  key={inst}
                  onClick={() => setFilterInstrument(inst)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    filterInstrument === inst
                      ? 'bg-white text-emerald-950 font-bold shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {inst === 'ALL' ? 'Semua Efek' : inst}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterStatus === 'ALL'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs'
                    : 'text-stone-600'
                }`}
              >
                Semua Status
              </button>
              <button
                onClick={() => setFilterStatus('OPEN')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterStatus === 'OPEN'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs'
                    : 'text-stone-600'
                }`}
              >
                Sedang Buka
              </button>
              <button
                onClick={() => setFilterStatus('FUNDED')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  filterStatus === 'FUNDED'
                    ? 'bg-white text-emerald-950 font-bold shadow-xs'
                    : 'text-stone-600'
                }`}
              >
                Terdanai 100%
              </button>
            </div>
          </div>
        </div>

        {/* 3. CAMPAIGN CARDS GRID */}
        {isLoading ? (
          <div className="p-12 text-center text-stone-500 text-xs">
            Memuat daftar penawaran efek syariah...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-300 text-xs text-stone-500">
            Tidak ada kampanye investasi yang sesuai dengan filter saat ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCampaigns.map((camp) => (
              <InvestmentCampaignCard
                key={camp.id}
                campaign={camp}
                onInvest={(c) => setSelectedCampaignForInvest(c)}
                onViewDetail={() => {
                  if (onSelectProjectDetail) {
                    onSelectProjectDetail(camp.project_id);
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL CHECKOUT INVESTASI & AKAD */}
      {selectedCampaignForInvest && (
        <InvestmentCheckoutModal
          campaign={selectedCampaignForInvest}
          onClose={() => setSelectedCampaignForInvest(null)}
          onSuccess={() => {
            loadPublicData();
          }}
        />
      )}

      {/* MODAL KEPATUHAN & TRANSPARANSI */}
      {showComplianceModal && (
        <InvestmentComplianceModal onClose={() => setShowComplianceModal(false)} />
      )}
    </section>
  );
};
