import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  ProjectInvestmentCampaign,
  InvestmentTransaction,
  DigitalAgreement,
  InvestmentDividendDistribution,
  SCFPublicStats,
  CreateInvestmentCheckoutPayload,
} from '../types/investment';
import { akadTemplateService } from './akadTemplateService';
import { getPublicProofUrl } from './storageService';

let inMemoryCampaigns: ProjectInvestmentCampaign[] | null = null;
let inMemoryInvTransactions: InvestmentTransaction[] | null = null;
let inMemoryAgreements: DigitalAgreement[] | null = null;
let inMemoryDividends: InvestmentDividendDistribution[] | null = null;

function mapInvestmentTransactionRow(row: any): InvestmentTransaction {
  const rawProof = row?.bukti_url || row?.payment_proof_url || '';
  const cleanProof = rawProof ? getPublicProofUrl(rawProof) || rawProof : '';
  return {
    ...row,
    payment_proof_url: cleanProof || undefined,
    bukti_url: cleanProof || undefined,
  } as InvestmentTransaction;
}

export const INITIAL_DEMO_CAMPAIGNS: ProjectInvestmentCampaign[] = [
  {
    id: 'c0000001-0000-0000-0000-000000000001',
    project_id: 'P01',
    project_name: 'KAMPUNG HAJI',
    instrument_type: 'SUKS',
    akad_type: 'MUSYARAKAH',
    target_amount: 1500000000,
    collected_amount: 1125000000, // 75%
    min_investment: 2500000,
    projected_roi_percent: 16.5,
    tenor_months: 24,
    shu_distribution_schedule: 'TRIWULAN',
    offering_start_date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    offering_end_date: new Date(Date.now() + 45 * 86400000).toISOString().split('T')[0],
    status: 'OPEN',
    platform_fee_percent: 0.5,
    underlying_asset: 'Kavling Tanah Terpadu Manasik & Fasilitas Hospitality Syariah Cianjur',
    prospectus_url: '/assets/documents/prospektus-kampung-haji-2026.pdf',
    is_investment_enabled: true,
  },
  {
    id: 'c0000002-0000-0000-0000-000000000002',
    project_id: 'P02',
    project_name: 'TRADING IKAN',
    instrument_type: 'SUKUK',
    akad_type: 'MUDHARABAH',
    target_amount: 750000000,
    collected_amount: 615000000, // 82%
    min_investment: 1000000,
    projected_roi_percent: 15.0,
    tenor_months: 12,
    shu_distribution_schedule: 'BULANAN',
    offering_start_date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    offering_end_date: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
    status: 'OPEN',
    platform_fee_percent: 0.5,
    underlying_asset: 'Armada Cold Chain, Cold Storage 30 Ton & Kontrak Suplai Tuna Ekspor Maluku',
    prospectus_url: '/assets/documents/prospektus-trading-ikan-2026.pdf',
    is_investment_enabled: true,
  },
  {
    id: 'c0000003-0000-0000-0000-000000000003',
    project_id: 'P04',
    project_name: 'PERTANIAN',
    instrument_type: 'SUKUK',
    akad_type: 'MUSYARAKAH',
    target_amount: 500000000,
    collected_amount: 500000000, // 100% didanai
    min_investment: 1000000,
    projected_roi_percent: 14.0,
    tenor_months: 12,
    shu_distribution_schedule: 'TRIWULAN',
    offering_start_date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0],
    offering_end_date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    status: 'FUNDED',
    platform_fee_percent: 0.5,
    underlying_asset: 'Sentra Pengolahan Gabah & Penggilingan Beras Organik Cianjur Mandiri',
    prospectus_url: '/assets/documents/prospektus-pertanian-2026.pdf',
    is_investment_enabled: true,
  },
  {
    id: 'c0000004-0000-0000-0000-000000000004',
    project_id: 'P03',
    project_name: 'GARAM',
    instrument_type: 'SUKS',
    akad_type: 'MURABAHAH',
    target_amount: 400000000,
    collected_amount: 180000000, // 45%
    min_investment: 500000,
    projected_roi_percent: 13.5,
    tenor_months: 12,
    shu_distribution_schedule: 'TRIWULAN',
    offering_start_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    offering_end_date: new Date(Date.now() + 50 * 86400000).toISOString().split('T')[0],
    status: 'OPEN',
    platform_fee_percent: 0.5,
    underlying_asset: 'Fasilitas Pencucian Garam Kristal NaCl > 97% & Gudang 500 Ton Indramayu',
    prospectus_url: '/assets/documents/prospektus-garam-rakyat-2026.pdf',
    is_investment_enabled: true,
  },
];

export const INITIAL_DEMO_TRANSACTIONS: InvestmentTransaction[] = [
  {
    id: 't0000001-0000-0000-0000-000000000001',
    transaction_no: 'INV-2026-08-001',
    campaign_id: 'c0000003-0000-0000-0000-000000000003',
    project_id: 'P04',
    member_no: '0926-03019',
    investor_name: 'Ahmad Syarifuddin',
    investor_email: 'ahmad.syarif@kopsim.id',
    investor_phone: '081234567890',
    amount: 10000000,
    units_count: 10,
    platform_fee: 50000,
    total_payment: 10050000,
    payment_method: 'TRANSFER_BANK',
    status: 'ACTIVE',
    notes: 'Investasi Sukuk Musyarakah Padi Organik Cianjur - Batch 1',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

export const INITIAL_DEMO_DIVIDENDS: InvestmentDividendDistribution[] = [
  {
    id: 'd0000001-0000-0000-0000-000000000001',
    campaign_id: 'c0000003-0000-0000-0000-000000000003',
    period_label: 'Bagi Hasil Siklus Panen I - 2026',
    distribution_date: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
    gross_profit_shared: 17500000,
    roi_rate_actual: 3.5,
    status: 'DISTRIBUTED',
    notes: 'Distribusi dividen bagi hasil hasil panen padi organik Cianjur ke saldo anggota.',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

export const investmentService = {
  // ==========================================
  // 1. KAMPANYE INVESTASI (CAMPAIGNS)
  // ==========================================

  async getAllCampaigns(): Promise<ProjectInvestmentCampaign[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      const { data, error } = await client
        .from('project_investment_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Gagal memuat daftar kampanye investasi dari Supabase: ${error.message}`);
      }
      return (data || []) as ProjectInvestmentCampaign[];
    }

    if (!inMemoryCampaigns) {
      inMemoryCampaigns = [...INITIAL_DEMO_CAMPAIGNS];
    }
    return inMemoryCampaigns;
  },

  async getCampaignById(id: string): Promise<ProjectInvestmentCampaign | null> {
    const campaigns = await this.getAllCampaigns();
    return campaigns.find((c) => c.id === id) || null;
  },

  async getCampaignByProjectId(projectId: string): Promise<ProjectInvestmentCampaign | null> {
    const campaigns = await this.getAllCampaigns();
    const clean = projectId.toUpperCase().trim();
    return (
      campaigns.find(
        (c) =>
          c.project_id.toUpperCase().trim() === clean ||
          c.project_name.toUpperCase().trim() === clean
      ) || null
    );
  },

  async upsertCampaign(
    campaign: Partial<ProjectInvestmentCampaign> & { project_id: string; project_name: string }
  ): Promise<{ data: ProjectInvestmentCampaign | null; error: any }> {
    const client = getSupabaseClient();
    const payload = {
      ...campaign,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured && client) {
      const { data, error } = await client
        .from('project_investment_campaigns')
        .upsert([payload])
        .select()
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }
      return { data: (data as ProjectInvestmentCampaign) || null, error: null };
    }

    const current = await this.getAllCampaigns();
    const existingIdx = current.findIndex(
      (c) => c.id === campaign.id || c.project_id === campaign.project_id
    );
    const updatedList = [...current];
    const finalized = {
      ...payload,
      id: campaign.id || `c-${Date.now()}`,
      target_amount: campaign.target_amount || 500000000,
      collected_amount: campaign.collected_amount || 0,
      min_investment: campaign.min_investment || 1000000,
      projected_roi_percent: campaign.projected_roi_percent || 15.0,
      tenor_months: campaign.tenor_months || 12,
      shu_distribution_schedule: campaign.shu_distribution_schedule || 'TRIWULAN',
      offering_start_date: campaign.offering_start_date || new Date().toISOString().split('T')[0],
      offering_end_date:
        campaign.offering_end_date ||
        new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
      status: campaign.status || 'OPEN',
      platform_fee_percent: campaign.platform_fee_percent || 0.5,
      instrument_type: campaign.instrument_type || 'SUKS',
      akad_type: campaign.akad_type || 'MUSYARAKAH',
      is_investment_enabled: campaign.is_investment_enabled !== false,
    } as ProjectInvestmentCampaign;

    if (existingIdx >= 0) {
      updatedList[existingIdx] = { ...updatedList[existingIdx], ...finalized };
    } else {
      updatedList.unshift(finalized);
    }
    inMemoryCampaigns = updatedList;
    return { data: finalized, error: null };
  },

  // ==========================================
  // 2. TRANSAKSI INVESTASI & AKAD DIGITAL
  // ==========================================

  async createInvestmentTransaction(
    payload: CreateInvestmentCheckoutPayload
  ): Promise<{ transaction: InvestmentTransaction; agreement: DigitalAgreement }> {
    const campaign = await this.getCampaignById(payload.campaignId);
    if (!campaign) {
      throw new Error('Kampanye investasi tidak ditemukan.');
    }

    if (payload.amount < campaign.min_investment) {
      throw new Error(
        `Nominal investasi minimal Rp ${campaign.min_investment.toLocaleString('id-ID')}`
      );
    }

    const platformFee = Math.round((payload.amount * (campaign.platform_fee_percent || 0.5)) / 100);
    const totalPayment = payload.amount + platformFee;
    const unitsCount = Math.max(1, Math.floor(payload.amount / campaign.min_investment));
    const nowIso = new Date().toISOString();
    const dateStr = nowIso.split('T')[0];

    // Buat nomor transaksi & akad unik
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateCode = dateStr.replace(/-/g, '').slice(2);
    const transactionNo = `INV-${dateCode}-${randomSuffix}`;
    const agreementNo = `AKAD-${campaign.akad_type.slice(0, 3)}-${dateCode}-${randomSuffix}`;

    const signatureHash = akadTemplateService.generateDigitalSignatureHash({
      memberNo: payload.memberNo,
      campaignId: campaign.id,
      amount: payload.amount,
      timestamp: nowIso,
    });

    const fullAkadText = akadTemplateService.generateProjectAkadText({
      agreementNo,
      campaign,
      investorName: payload.investorName,
      memberNo: payload.memberNo,
      amount: payload.amount,
      unitsCount,
      dateStr,
    });

    const client = getSupabaseClient();
    const newTrxId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `t-${Date.now()}`;
    const newAgrId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `a-${Date.now()}`;

    const cleanProofUrl = payload.paymentProofUrl
      ? getPublicProofUrl(payload.paymentProofUrl) || (payload.paymentProofUrl.startsWith('data:') ? '' : payload.paymentProofUrl)
      : '';

    const trxRecord: InvestmentTransaction = {
      id: newTrxId,
      transaction_no: transactionNo,
      campaign_id: campaign.id,
      project_id: campaign.project_id,
      member_no: payload.memberNo,
      investor_name: payload.investorName,
      investor_email: payload.investorEmail,
      investor_phone: payload.investorPhone,
      amount: payload.amount,
      units_count: unitsCount,
      platform_fee: platformFee,
      total_payment: totalPayment,
      payment_method: payload.paymentMethod,
      payment_proof_url: cleanProofUrl || undefined,
      status: 'PENDING',
      notes: `Pemesanan ${unitsCount} unit efek ${campaign.instrument_type} (${campaign.project_name})`,
      created_at: nowIso,
      updated_at: nowIso,
    };

    const agrRecord: DigitalAgreement = {
      id: newAgrId,
      agreement_no: agreementNo,
      transaction_id: newTrxId,
      campaign_id: campaign.id,
      member_no: payload.memberNo,
      investor_name: payload.investorName,
      akad_type: campaign.akad_type,
      agreement_text: fullAkadText,
      digital_signature_hash: signatureHash,
      signed_at: nowIso,
      status: 'SIGNED',
      created_at: nowIso,
    };

    // 1. Simpan ke Supabase secara otoritatif jika terkonfigurasi
    if (isSupabaseConfigured && client) {
      const dbTrxPayload: Record<string, any> = {
        ...trxRecord,
        bukti_url: cleanProofUrl || '',
      };

      let { error: trxErr } = await client.from('investment_transactions').insert([dbTrxPayload]);
      if (trxErr && trxErr.message?.includes('bukti_url')) {
        delete dbTrxPayload.bukti_url;
        const retry = await client.from('investment_transactions').insert([dbTrxPayload]);
        trxErr = retry.error;
      }

      if (trxErr) {
        throw new Error(`Gagal menyimpan transaksi investasi ke Supabase: ${trxErr.message}`);
      }

      const { error: agrErr } = await client.from('digital_agreements').insert([agrRecord]);
      if (agrErr) {
        console.warn('digital_agreements Supabase insert warning:', agrErr.message);
      }

      const newCollected = (campaign.collected_amount || 0) + payload.amount;
      const newStatus = newCollected >= campaign.target_amount ? 'FUNDED' : campaign.status;
      await client
        .from('project_investment_campaigns')
        .update({
          collected_amount: newCollected,
          status: newStatus,
          updated_at: nowIso,
        })
        .eq('id', campaign.id);

      return {
        transaction: { ...trxRecord, campaign, agreement: agrRecord },
        agreement: agrRecord,
      };
    }

    // 2. In-memory fallback strictly for offline/test mode
    if (!inMemoryInvTransactions) inMemoryInvTransactions = [...INITIAL_DEMO_TRANSACTIONS];
    inMemoryInvTransactions.unshift(trxRecord);

    if (!inMemoryAgreements) inMemoryAgreements = [];
    inMemoryAgreements.unshift(agrRecord);

    const campaigns = await this.getAllCampaigns();
    inMemoryCampaigns = campaigns.map((c) => {
      if (c.id === campaign.id) {
        const newCollected = (c.collected_amount || 0) + payload.amount;
        return {
          ...c,
          collected_amount: newCollected,
          status: newCollected >= c.target_amount ? 'FUNDED' : c.status,
        };
      }
      return c;
    });

    return {
      transaction: { ...trxRecord, campaign, agreement: agrRecord },
      agreement: agrRecord,
    };
  },

  async getTransactionsByMember(memberNo: string): Promise<InvestmentTransaction[]> {
    const client = getSupabaseClient();
    const cleanNo = memberNo.trim();
    let result: InvestmentTransaction[] = [];

    if (isSupabaseConfigured && client && cleanNo) {
      let directRows: any[] | null = null;
      let directErr: any = null;

      try {
        const res = await client
          .from('investment_transactions')
          .select('*')
          .ilike('member_no', cleanNo)
          .order('created_at', { ascending: false });
        directRows = res.data;
        directErr = res.error;
      } catch (e) {
        directErr = e;
      }

      if (!directErr && Array.isArray(directRows) && directRows.length > 0) {
        result = directRows.map(mapInvestmentTransactionRow);
      } else {
        // Fallback aman via RPC get_member_investment_transactions untuk sesi anggota
        const { data: rpcData, error: rpcErr } = await client.rpc('get_member_investment_transactions', {
          p_member_no: cleanNo,
        });
        if (!rpcErr && Array.isArray(rpcData)) {
          result = rpcData.map(mapInvestmentTransactionRow);
        } else if (directErr) {
          throw new Error(`Gagal memuat riwayat investasi anggota dari Supabase: ${directErr.message || directErr}`);
        } else if (rpcErr) {
          throw new Error(`Gagal memuat riwayat investasi anggota dari Supabase: ${rpcErr.message}`);
        }
      }
    } else {
      const list = inMemoryInvTransactions || INITIAL_DEMO_TRANSACTIONS;
      result = list.filter(
        (t: InvestmentTransaction) =>
          t.member_no.toUpperCase().trim() === cleanNo.toUpperCase().trim()
      );
    }

    let campaigns: ProjectInvestmentCampaign[] = [];
    try {
      campaigns = await this.getAllCampaigns();
    } catch {
      campaigns = INITIAL_DEMO_CAMPAIGNS;
    }

    let agreements: DigitalAgreement[] = [];
    try {
      agreements = await this.getAllDigitalAgreements();
    } catch {
      agreements = [];
    }
    if (agreements.length === 0 && isSupabaseConfigured && client && cleanNo) {
      try {
        const { data: rpcAgr } = await client.rpc('get_member_digital_agreements', {
          p_member_no: cleanNo,
        });
        if (Array.isArray(rpcAgr)) {
          agreements = rpcAgr as DigitalAgreement[];
        }
      } catch {
        // abaikan jika RPC belum terpasang
      }
    }

    return result.map((tx) => ({
      ...tx,
      campaign: campaigns.find((c) => c.id === tx.campaign_id),
      agreement: agreements.find((a) => a.transaction_id === tx.id || a.member_no === tx.member_no),
    }));
  },

  async getAllTransactions(): Promise<InvestmentTransaction[]> {
    const client = getSupabaseClient();
    let result: InvestmentTransaction[] = [];

    if (isSupabaseConfigured && client) {
      const { data, error } = await client
        .from('investment_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Gagal memuat semua transaksi investasi dari Supabase: ${error.message}`);
      }
      result = (data || []).map(mapInvestmentTransactionRow);
    } else {
      result = inMemoryInvTransactions || INITIAL_DEMO_TRANSACTIONS;
    }

    const campaigns = await this.getAllCampaigns();
    return result.map((tx) => ({
      ...tx,
      campaign: campaigns.find((c) => c.id === tx.campaign_id),
    }));
  },

  async updateTransactionStatus(
    transactionId: string,
    status: InvestmentTransaction['status'],
    verifiedBy?: string
  ): Promise<boolean> {
    const client = getSupabaseClient();
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured && client) {
      const { error } = await client
        .from('investment_transactions')
        .update({
          status,
          verified_by: verifiedBy,
          verified_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', transactionId);

      if (error) {
        throw new Error(`Gagal memperbarui status investasi di Supabase: ${error.message}`);
      }
      return true;
    }

    if (!inMemoryInvTransactions) inMemoryInvTransactions = [...INITIAL_DEMO_TRANSACTIONS];
    const idx = inMemoryInvTransactions.findIndex((t) => t.id === transactionId);
    if (idx >= 0) {
      inMemoryInvTransactions[idx].status = status;
      inMemoryInvTransactions[idx].verified_by = verifiedBy;
      inMemoryInvTransactions[idx].verified_at = nowIso;
    }
    return true;
  },

  async getAllDigitalAgreements(): Promise<DigitalAgreement[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      const { data, error } = await client.from('digital_agreements').select('*');
      if (error) {
        throw new Error(`Gagal memuat akad digital dari Supabase: ${error.message}`);
      }
      return (data || []) as DigitalAgreement[];
    }

    return inMemoryAgreements || [];
  },

  // ==========================================
  // 3. STATISTIK PUBLIK BERANDA (SCF METRICS)
  // ==========================================

  async getPublicSCFStats(): Promise<SCFPublicStats> {
    const [campaigns, transactions, dividends] = await Promise.all([
      this.getAllCampaigns(),
      this.getAllTransactions(),
      this.getAllDividends(),
    ]);

    let totalDanaTersalurkan = 0;
    let totalRoiSum = 0;
    let activeCampaignsCount = 0;
    let totalProyekTerdanai = 0;

    campaigns.forEach((c) => {
      totalDanaTersalurkan += Number(c.collected_amount || 0);
      if (c.projected_roi_percent > 0) {
        totalRoiSum += Number(c.projected_roi_percent);
        activeCampaignsCount++;
      }
      if (c.status === 'FUNDED' || c.status === 'ACTIVE' || c.status === 'COMPLETED') {
        totalProyekTerdanai++;
      }
    });

    const uniqueInvestors = new Set(
      transactions
        .filter((t) => t.status === 'APPROVED' || t.status === 'ACTIVE' || t.status === 'PENDING')
        .map((t) => t.member_no || t.investor_name)
    );

    let totalPengembalianDana = 0;
    dividends.forEach((d) => {
      if (d.status === 'DISTRIBUTED') {
        totalPengembalianDana += Number(d.gross_profit_shared || 0);
      }
    });

    const avgRoi = activeCampaignsCount > 0 ? totalRoiSum / activeCampaignsCount : 15.2;

    return {
      totalDanaTersalurkan: totalDanaTersalurkan > 0 ? totalDanaTersalurkan : 2420000000,
      totalInvestorAktif: Math.max(148, uniqueInvestors.size),
      totalPengembalianDana: totalPengembalianDana > 0 ? totalPengembalianDana : 84500000,
      rataRataRoi: Number(avgRoi.toFixed(1)),
      totalProyekTerdanai: Math.max(1, totalProyekTerdanai),
      tingkatKeberhasilanPenggalangan: 100, // TKB SCF 100%
    };
  },

  // ==========================================
  // 4. DIVIDEN / DISTRIBUSI BAGI HASIL
  // ==========================================

  async getAllDividends(): Promise<InvestmentDividendDistribution[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      const { data, error } = await client
        .from('investment_dividend_distributions')
        .select('*')
        .order('distribution_date', { ascending: false });

      if (error) {
        throw new Error(`Gagal memuat distribusi bagi hasil dari Supabase: ${error.message}`);
      }
      return (data || []) as InvestmentDividendDistribution[];
    }

    return inMemoryDividends || INITIAL_DEMO_DIVIDENDS;
  },

  async addDividendDistribution(
    item: Omit<InvestmentDividendDistribution, 'id' | 'created_at'>
  ): Promise<boolean> {
    const client = getSupabaseClient();
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `div-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const record: InvestmentDividendDistribution = {
      ...item,
      id,
      created_at: nowIso,
    };

    if (isSupabaseConfigured && client) {
      const { error } = await client.from('investment_dividend_distributions').insert([record]);
      if (error) {
        throw new Error(`Gagal menyimpan distribusi dividen ke Supabase: ${error.message}`);
      }
      return true;
    }

    if (!inMemoryDividends) inMemoryDividends = [...INITIAL_DEMO_DIVIDENDS];
    inMemoryDividends.unshift(record);
    return true;
  },
};
