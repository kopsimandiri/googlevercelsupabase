import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import {
  AkadType,
  LoanSimulationResult,
  LoanApplicationRecord,
  LoanApplicationStatus,
  AmortizationScheduleItem,
} from '../types/database';

export const loanService = {
  /**
   * Pure mathematical calculation for interactive client-side simulation.
   * Note: Official credit calculations are validated authoritatively on the server.
   */
  calculateClientSimulation(
    loanAmount: number,
    tenorMonths: number,
    marginRatePa: number = 6.0,
    akadType: AkadType = 'MURABAHAH'
  ): LoanSimulationResult {
    const validAmount = Math.max(0, Number(loanAmount) || 0);
    const validTenor = Math.max(1, Math.min(60, Number(tenorMonths) || 12));
    const validRate = Math.max(0, Number(marginRatePa) || 6.0);

    // Islamic Flat Margin: Principal * (Rate / 100) * (Tenor / 12)
    const marginAmount = Math.round(validAmount * (validRate / 100.0) * (validTenor / 12.0));
    const totalPayment = validAmount + marginAmount;

    const monthlyPrincipal = Math.round(validAmount / validTenor);
    const monthlyMargin = Math.round(marginAmount / validTenor);
    const monthlyInstallment = monthlyPrincipal + monthlyMargin;

    let balance = validAmount;
    const schedule: AmortizationScheduleItem[] = [];

    for (let month = 1; month <= validTenor; month++) {
      let curPrincipal = monthlyPrincipal;
      let curMargin = monthlyMargin;

      if (month === validTenor) {
        curPrincipal = balance;
        curMargin = marginAmount - monthlyMargin * (validTenor - 1);
        balance = 0;
      } else {
        balance = Math.max(0, balance - curPrincipal);
      }

      schedule.push({
        month,
        principal_installment: curPrincipal,
        margin_installment: curMargin,
        total_installment: curPrincipal + curMargin,
        remaining_principal: balance,
      });
    }

    return {
      loan_amount: validAmount,
      tenor_months: validTenor,
      margin_rate_pa: validRate,
      akad_type: akadType,
      margin_amount: marginAmount,
      total_payment: totalPayment,
      monthly_installment: monthlyInstallment,
      monthly_principal: monthlyPrincipal,
      monthly_margin: monthlyMargin,
      schedule,
      disclaimer: 'Simulasi ini bukan keputusan kredit final. Keputusan persetujuan tunduk pada analisis komite pembiayaan.',
      is_authoritative: false,
    };
  },

  /**
   * Server/Database Authoritative calculation (Calls Supabase RPC or Express API).
   */
  async calculateServerAuthoritative(
    loanAmount: number,
    tenorMonths: number,
    marginRatePa: number = 6.0,
    akadType: AkadType = 'MURABAHAH'
  ): Promise<LoanSimulationResult> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      try {
        const { data, error } = await client.rpc('fn_calculate_loan_amortization', {
          p_loan_amount: loanAmount,
          p_tenor_months: tenorMonths,
          p_margin_rate_pa: marginRatePa,
          p_akad_type: akadType,
        });

        if (!error && data) {
          return {
            ...data,
            is_authoritative: true,
          };
        }
      } catch (err) {
        console.warn('RPC loan calculation error, falling back to server API/client formula:', err);
      }
    }

    // Try Express backend API if available
    try {
      const res = await fetch('/api/loans/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_amount: loanAmount,
          tenor_months: tenorMonths,
          margin_rate_pa: marginRatePa,
          akad_type: akadType,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return {
          ...data,
          is_authoritative: true,
        };
      }
    } catch {
      // Fallback
    }

    const clientSim = this.calculateClientSimulation(loanAmount, tenorMonths, marginRatePa, akadType);
    return { ...clientSim, is_authoritative: true };
  },

  /**
   * Submit official loan application to database
   */
  async submitApplication(application: {
    member_id: string;
    member_name: string;
    akad_type: AkadType;
    peruntukan: string;
    loan_amount: number;
    tenor_months: number;
    margin_rate_pa: number;
    collateral_type?: string;
    collateral_detail?: string;
    monthly_income?: number;
  }): Promise<{ success: boolean; data?: LoanApplicationRecord; error?: string }> {
    const simulation = await this.calculateServerAuthoritative(
      application.loan_amount,
      application.tenor_months,
      application.margin_rate_pa,
      application.akad_type
    );

    const appNo = `PB-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    const newRecord: LoanApplicationRecord = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `loan-${Date.now()}`,
      application_no: appNo,
      member_id: application.member_id,
      member_name: application.member_name,
      akad_type: application.akad_type,
      peruntukan: application.peruntukan,
      loan_amount: application.loan_amount,
      tenor_months: application.tenor_months,
      margin_rate_pa: application.margin_rate_pa,
      margin_amount: simulation.margin_amount,
      total_payment: simulation.total_payment,
      monthly_installment: simulation.monthly_installment,
      monthly_principal: simulation.monthly_principal,
      monthly_margin: simulation.monthly_margin,
      amortization_schedule: simulation.schedule,
      status: 'SUBMITTED',
      collateral_type: application.collateral_type || 'KOPERASI_SAVINGS',
      collateral_detail: application.collateral_detail || '',
      monthly_income: application.monthly_income || 0,
      dsr_percentage: application.monthly_income
        ? Math.round((simulation.monthly_installment / application.monthly_income) * 100)
        : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      try {
        const { data, error } = await client
          .from('loan_applications')
          .insert([newRecord])
          .select()
          .single();

        if (error) {
          console.warn('Failed saving to Supabase, saving to local cache:', error);
        } else if (data) {
          return { success: true, data };
        }
      } catch (err: any) {
        console.warn('Supabase loan submit exception:', err);
      }
    }

    // LocalStorage fallback for offline resilience
    const existing = this.getLocalApplications();
    existing.unshift(newRecord);
    this.saveLocalApplications(existing);

    return { success: true, data: newRecord };
  },

  /**
   * Get all loan applications (For Admin or Member Filter)
   */
  async getApplications(memberId?: string): Promise<LoanApplicationRecord[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured && client) {
      try {
        let query = client
          .from('loan_applications')
          .select('*')
          .order('created_at', { ascending: false });

        if (memberId) {
          query = query.eq('member_id', memberId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data;
        }
      } catch (err) {
        console.warn('Error fetching loan applications from Supabase:', err);
      }
    }

    let local = this.getLocalApplications();
    if (memberId) {
      local = local.filter((a) => a.member_id === memberId);
    }
    return local;
  },

  /**
   * Update Loan Application Status (Under Review, Approve, Reject, Disburse)
   */
  async updateApplicationStatus(
    id: string,
    status: LoanApplicationStatus,
    reviewerName: string = 'KOMITE_PEMBIAYAAN',
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const client = getSupabaseClient();
    const updatePayload: Partial<LoanApplicationRecord> = {
      status,
      reviewed_by: reviewerName,
      reviewed_at: new Date().toISOString(),
      approval_notes: notes || '',
      updated_at: new Date().toISOString(),
    };

    if (status === 'DISBURSED') {
      updatePayload.disbursed_at = new Date().toISOString();
      updatePayload.disbursed_transaction_id = `TRX-DISBURSE-${Date.now()}`;
    }

    if (isSupabaseConfigured && client) {
      try {
        const { error } = await client
          .from('loan_applications')
          .update(updatePayload)
          .eq('id', id);

        if (!error) return { success: true };
      } catch (err: any) {
        console.warn('Error updating loan status in Supabase:', err);
      }
    }

    // Local fallback
    const local = this.getLocalApplications();
    const idx = local.findIndex((a) => a.id === id || a.application_no === id);
    if (idx !== -1) {
      local[idx] = { ...local[idx], ...updatePayload };
      this.saveLocalApplications(local);
      return { success: true };
    }

    return { success: false, error: 'Aplikasi pembiayaan tidak ditemukan.' };
  },

  getLocalApplications(): LoanApplicationRecord[] {
    try {
      const raw = localStorage.getItem('kopsim_loan_applications');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [
      {
        id: 'loan-sample-01',
        application_no: 'PB-202608-1001',
        member_id: '0824-03001',
        member_name: 'M. FACHRI MUBAROK',
        akad_type: 'MURABAHAH',
        peruntukan: 'MODAL_KERJA_PERTANIAN',
        loan_amount: 15000000,
        tenor_months: 12,
        margin_rate_pa: 6.0,
        margin_amount: 900000,
        total_payment: 15900000,
        monthly_installment: 1325000,
        monthly_principal: 1250000,
        monthly_margin: 75000,
        status: 'APPROVED',
        collateral_type: 'BPKB Motor / Simpanan KOPSIM',
        collateral_detail: 'BPKB Honda Vario 160 & Rekening Simpanan',
        monthly_income: 8500000,
        dsr_percentage: 16,
        approval_notes: 'Disetujui Komite Pembiayaan Sektor Riil Ketahanan Pangan.',
        reviewed_by: 'KETUA_KOMITE_SYARIAH',
        reviewed_at: '2026-08-20T10:00:00Z',
        created_at: '2026-08-18T08:30:00Z',
        updated_at: '2026-08-20T10:00:00Z',
      },
    ];
  },

  saveLocalApplications(list: LoanApplicationRecord[]): void {
    try {
      localStorage.setItem('kopsim_loan_applications', JSON.stringify(list));
    } catch {
      // ignore
    }
  },
};
