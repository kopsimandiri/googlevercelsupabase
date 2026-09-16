export type InvestmentInstrument = 'SUKS' | 'SUKUK' | 'SAHAM';

export type ShariaAkadType = 'MUSYARAKAH' | 'MUDHARABAH' | 'WAKALAH' | 'MURABAHAH';

export type InvestmentCampaignStatus =
  | 'DRAFT'
  | 'COMING_SOON'
  | 'OPEN'
  | 'FUNDED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CLOSED';

export type InvestmentTrxStatus =
  | 'PENDING'
  | 'PAYMENT_CONFIRMED'
  | 'APPROVED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'REJECTED';

export type DistributionSchedule = 'BULANAN' | 'TRIWULAN' | 'SEMESTER' | 'TAHUNAN';

export interface ProjectInvestmentCampaign {
  id: string;
  project_id: string; // Kode Proyek (P01, P02, dll.)
  project_name: string;
  instrument_type: InvestmentInstrument;
  akad_type: ShariaAkadType;
  target_amount: number;
  collected_amount: number;
  min_investment: number;
  max_investment?: number;
  projected_roi_percent: number; // % p.a.
  tenor_months: number;
  shu_distribution_schedule: DistributionSchedule;
  offering_start_date: string;
  offering_end_date: string;
  status: InvestmentCampaignStatus;
  platform_fee_percent: number; // default 0.5%
  underlying_asset?: string;
  prospectus_url?: string;
  is_investment_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface InvestmentTransaction {
  id: string;
  transaction_no: string;
  campaign_id: string;
  project_id: string;
  member_no: string;
  investor_name: string;
  investor_email?: string;
  investor_phone?: string;
  amount: number;
  units_count: number;
  platform_fee: number;
  total_payment: number;
  payment_method: 'TRANSFER_BANK' | 'SIMPANAN_SUKARELA' | 'VIRTUAL_ACCOUNT';
  payment_proof_url?: string;
  status: InvestmentTrxStatus;
  notes?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
  updated_at?: string;
  // Attached relations
  campaign?: ProjectInvestmentCampaign;
  agreement?: DigitalAgreement;
}

export interface DigitalAgreement {
  id: string;
  agreement_no: string;
  transaction_id: string;
  campaign_id: string;
  member_no: string;
  investor_name: string;
  akad_type: ShariaAkadType;
  agreement_text: string;
  digital_signature_hash: string;
  ip_address?: string;
  signed_at: string;
  status: 'SIGNED' | 'REVOKED';
  created_at?: string;
}

export interface InvestmentDividendDistribution {
  id: string;
  campaign_id: string;
  period_label: string;
  distribution_date: string;
  gross_profit_shared: number;
  roi_rate_actual: number;
  status: 'PLANNED' | 'DISTRIBUTED' | 'CANCELLED';
  notes?: string;
  created_at?: string;
}

export interface SCFPublicStats {
  totalDanaTersalurkan: number;
  totalInvestorAktif: number;
  totalPengembalianDana: number;
  rataRataRoi: number; // % p.a.
  totalProyekTerdanai: number;
  tingkatKeberhasilanPenggalangan: number; // %
}

export interface CreateInvestmentCheckoutPayload {
  campaignId: string;
  memberNo: string;
  investorName: string;
  investorEmail?: string;
  investorPhone?: string;
  amount: number;
  paymentMethod: 'TRANSFER_BANK' | 'SIMPANAN_SUKARELA' | 'VIRTUAL_ACCOUNT';
  paymentProofUrl?: string;
  akadAgreementConfirmed: boolean;
  wakalahAgreementConfirmed: boolean;
}
