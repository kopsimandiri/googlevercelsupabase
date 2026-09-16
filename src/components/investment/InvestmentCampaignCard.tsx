import React from 'react';
import { ProjectInvestmentCampaign } from '../../types/investment';
import { formatRupiah } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Calendar,
  Clock,
  Coins,
  ShieldCheck,
  TrendingUp,
  FileText,
  Building2,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface InvestmentCampaignCardProps {
  campaign: ProjectInvestmentCampaign;
  onInvest: (campaign: ProjectInvestmentCampaign) => void;
  onViewDetail?: (campaign: ProjectInvestmentCampaign) => void;
}

export const InvestmentCampaignCard: React.FC<InvestmentCampaignCardProps> = ({
  campaign,
  onInvest,
  onViewDetail,
}) => {
  const percentage = Math.min(
    100,
    Math.round(((campaign.collected_amount || 0) / campaign.target_amount) * 100)
  );

  // Calculate remaining days
  const endDate = new Date(campaign.offering_end_date);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const isFunded = campaign.status === 'FUNDED' || percentage >= 100;
  const isClosed = campaign.status === 'CLOSED' || campaign.status === 'COMPLETED';

  return (
    <div
      id={`campaign-card-${campaign.id}`}
      className="bg-surface rounded-2xl border border-stone-200/90 shadow-2xs hover:border-emerald-700/60 hover:shadow-md transition-all duration-300 flex flex-col justify-between overflow-hidden group"
    >
      {/* Header Badges */}
      <div className="p-5 pb-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-emerald-900 text-emerald-100 border border-emerald-700 shadow-2xs">
              {campaign.instrument_type}
            </span>
            <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-900 border border-amber-200/80">
              Akad {campaign.akad_type}
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-mono font-semibold text-stone-500">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            {isFunded ? (
              <span className="text-emerald-700 font-bold">Terpenuhi 100%</span>
            ) : isClosed ? (
              <span className="text-stone-500">Ditutup</span>
            ) : (
              <span>Sisa {diffDays} Hari</span>
            )}
          </div>
        </div>

        {/* Project Title & Code */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500 font-mono">
            <span className="font-bold text-emerald-800">{campaign.project_id}</span>
            <span>•</span>
            <span>Strategic Project</span>
          </div>
          <h4 className="text-lg font-bold font-serif text-stone-900 group-hover:text-emerald-950 transition-colors mt-0.5">
            {campaign.project_name}
          </h4>
          {campaign.underlying_asset && (
            <p className="text-xs text-stone-600 line-clamp-2 mt-1 leading-relaxed">
              {campaign.underlying_asset}
            </p>
          )}
        </div>

        {/* Progress Bar & Funding Numbers */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-700">Dana Terkumpul</span>
            <span className="font-mono font-bold text-emerald-900 text-sm">
              {percentage}%
            </span>
          </div>
          <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200/70">
            <div
              className={`h-full transition-all duration-700 rounded-full ${
                isFunded
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-500'
                  : 'bg-gradient-to-r from-emerald-800 via-emerald-700 to-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
            <span className="font-medium text-stone-800">
              {formatRupiah(campaign.collected_amount || 0)}
            </span>
            <span>Target {formatRupiah(campaign.target_amount)}</span>
          </div>
        </div>

        {/* 4 Financial Parameters Grid */}
        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-stone-50/80 border border-stone-200/70 text-xs">
          <div>
            <span className="text-[10px] text-stone-500 block">Proyeksi ROI / Thn</span>
            <span className="text-sm font-bold text-emerald-900 font-serif flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-accent-gold" />
              {campaign.projected_roi_percent}% p.a.
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block">Tenor Pembiayaan</span>
            <span className="text-xs font-semibold text-stone-800 font-mono">
              {campaign.tenor_months} Bulan
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block">Jadwal Dividen / SHU</span>
            <span className="text-xs font-semibold text-stone-800">
              {campaign.shu_distribution_schedule}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-stone-500 block">Min. Investasi</span>
            <span className="text-xs font-bold text-stone-900 font-mono">
              {formatRupiah(campaign.min_investment)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 pt-0 border-t border-stone-100 flex items-center justify-between gap-2 mt-2">
        {onViewDetail && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetail(campaign)}
            className="text-xs text-stone-600 hover:text-stone-900"
            leftIcon={<FileText className="w-3.5 h-3.5" />}
          >
            Prospektus
          </Button>
        )}

        <Button
          variant={isFunded ? 'outline' : 'gold'}
          size="sm"
          disabled={isFunded || isClosed}
          onClick={() => onInvest(campaign)}
          className={`text-xs ml-auto shadow-xs ${
            isFunded
              ? 'border-emerald-300 text-emerald-800 bg-emerald-50/50 cursor-default'
              : 'font-bold'
          }`}
          leftIcon={
            isFunded ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            ) : (
              <Coins className="w-3.5 h-3.5" />
            )
          }
        >
          {isFunded ? 'Pendanaan Selesai' : 'Investasi Sekarang'}
        </Button>
      </div>
    </div>
  );
};
