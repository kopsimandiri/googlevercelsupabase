import { useState, useEffect, useCallback } from 'react';
import { reportService } from '../services/reportService';
import { transactionService } from '../services/transactionService';

export function useFinance() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [savingsSummary, setSavingsSummary] = useState<any>(null);
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [shuDistribution, setShuDistribution] = useState<any>(null);

  const fetchFinanceData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [savings, pl, shu] = await Promise.all([
        transactionService.getKoperasiSavingsSummary(),
        reportService.getProfitLoss(),
        reportService.getSHUCalculation(),
      ]);
      setSavingsSummary(savings);
      setProfitLoss(pl);
      setShuDistribution(shu);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat agregasi finansial');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  return {
    savingsSummary,
    profitLoss,
    shuDistribution,
    isLoading,
    error,
    refresh: fetchFinanceData,
  };
}
