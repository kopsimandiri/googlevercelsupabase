import { useState, useEffect, useCallback } from 'react';
import { transactionService } from '../services/transactionService';
import { TransactionRecord } from '../types/database';

export function useTransactions(initialTab?: 'PUSAT' | 'CABANG' | 'PROJECT') {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (tabFilter?: 'PUSAT' | 'CABANG' | 'PROJECT') => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await transactionService.getTransactions(tabFilter || initialTab);
      setTransactions(list);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat daftar transaksi');
    } finally {
      setIsLoading(false);
    }
  }, [initialTab]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const saveTransaction = async (
    trxData: Partial<TransactionRecord>,
    isEditExplicit?: boolean
  ) => {
    const res = await transactionService.saveTransaction(trxData, isEditExplicit);
    await fetchTransactions();
    return res;
  };

  const deleteTransaction = async (id: string) => {
    const res = await transactionService.deleteTransaction(id);
    await fetchTransactions();
    return res;
  };

  const voidTransaction = async (id: string, reason: string) => {
    const res = await transactionService.voidTransaction(id, reason);
    await fetchTransactions();
    return res;
  };

  return {
    transactions,
    isLoading,
    error,
    refresh: fetchTransactions,
    saveTransaction,
    deleteTransaction,
    voidTransaction,
  };
}
