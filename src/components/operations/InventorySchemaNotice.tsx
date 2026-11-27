import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { InventorySchemaStatus } from '../../types/inventory';

interface InventorySchemaNoticeProps {
  onStatusChange?: (status: InventorySchemaStatus) => void;
}

export const InventorySchemaNotice: React.FC<InventorySchemaNoticeProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<InventorySchemaStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await inventoryService.checkSchemaStatus();
      setStatus(res);
      onStatusChange?.(res);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    runCheck();
  }, []);

  if (!status || status.ready) return null;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-900">
            Migrasi Database Inventory Belum Dijalankan di Supabase
          </p>
          <p className="text-amber-800 leading-relaxed">
            Jalankan file migrasi{' '}
            <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200">
              supabase/migrations/20261127000001_ambon_fishery_inventory_schema.sql
            </code>{' '}
            di SQL Editor Supabase agar seluruh tabel ({status.missingTables.join(', ')}) aktif.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={runCheck}
        disabled={checking}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold shrink-0 transition-colors disabled:opacity-60"
      >
        {checking ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5" />
        )}
        <span>{checking ? 'Memeriksa...' : 'Cek Ulang Skema'}</span>
      </button>
    </div>
  );
};
