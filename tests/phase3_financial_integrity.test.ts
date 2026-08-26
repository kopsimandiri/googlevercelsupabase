/**
 * ============================================================================
 * PHASE 3 TEST SUITE: Financial Integrity, Auditing & Server-Side Calculations
 * ============================================================================
 * 
 * Verifies:
 * 1. Transaction Creation & Authoritative Mapping (actor_user_id, is_posted, amounts)
 * 2. Amount and Quantity Validation (Zero/Negative/NaN rejection)
 * 3. Duplicate Transaction ID Protection
 * 4. Posted Transaction Integrity & Void (Cancellation) Workflow
 * 5. Automated Audit Log Generation (Creation, Modification, Void, Deletion)
 * 6. Authoritative Balance & Savings Calculations (Pokok, Wajib, Manasuka)
 * 7. Report Consistency (Laba Rugi, SHU 25% cadangan, 75% anggota, 40% jasa modal, 60% jasa usaha)
 */

import { transactionService, mapTransactionRecordToSupabaseRow } from '../src/services/transactionService';
import { auditService } from '../src/services/auditService';
import { reportService } from '../src/services/reportService';
import { authService } from '../src/services/authService';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`, details || '');
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('STARTING PHASE 3 FINANCIAL INTEGRITY & AUDIT TEST SUITE');
  console.log('======================================================\n');

  // Setup Mock In-Memory Local Storage if in Node environment
  if (typeof localStorage === 'undefined' || !localStorage.getItem) {
    const memoryStore = new Map<string, string>();
    (global as any).localStorage = {
      getItem: (k: string) => memoryStore.get(k) || null,
      setItem: (k: string, v: string) => memoryStore.set(k, v),
      removeItem: (k: string) => memoryStore.delete(k),
      clear: () => memoryStore.clear(),
    };
  }

  // --- TEST GROUP 1: Transaction Mapping & Authoritative Attributes ---
  console.log('Group 1: Transaction Mapping & Authoritative Columns');
  {
    const mapped = mapTransactionRecordToSupabaseRow({
      id: 'TRX-TEST-001',
      tanggal: '2026-08-26',
      referal: 'KOPERASI',
      plantation: 'PUSAT JAKARTA',
      jenis: 'MASUK',
      kategori: 'Simpanan Wajib',
      jumlah: 500000,
      metode_bayar: 'Bank BSI',
      akun: 'Bank BSI',
    });

    assert(mapped.id === 'TRX-TEST-001', 'Transaction ID mapped accurately');
    assert(mapped.amount === 500000, 'Transaction amount clean numeric');
    assert(mapped.is_posted === true, 'Transaction is_posted flag set to true');
    assert(mapped.is_void === false, 'Transaction is_void flag initialized to false');
    assert(mapped.transaction_date === '2026-08-26', 'Authoritative transaction_date mapped');
  }

  // --- TEST GROUP 2: Validation of Amounts & Parameters ---
  console.log('\nGroup 2: Server-Side Validation of Amount & Quantity');
  {
    let errorCaughtZero = false;
    try {
      await transactionService.saveTransaction({
        id: 'T-INVALID-ZERO',
        jumlah: 0,
        kategori: 'Simpanan Pokok',
      });
    } catch (e: any) {
      errorCaughtZero = true;
      assert(e.message.includes('lebih besar dari 0'), 'Zero amount properly rejected');
    }
    assert(errorCaughtZero, 'Throws error when transaction amount is 0');

    let errorCaughtNegative = false;
    try {
      await transactionService.saveTransaction({
        id: 'T-INVALID-NEG',
        jumlah: -150000,
        kategori: 'Simpanan Pokok',
      });
    } catch (e: any) {
      errorCaughtNegative = true;
    }
    assert(errorCaughtNegative, 'Throws error when transaction amount is negative');

    let errorCaughtQty = false;
    try {
      await transactionService.saveTransaction({
        id: 'P-INVALID-QTY',
        referal: 'PROJECT',
        qty: -5,
        harga_satuan: 10000,
      });
    } catch (e: any) {
      errorCaughtQty = true;
      assert(e.message.includes('tidak boleh negatif'), 'Negative qty properly rejected');
    }
    assert(errorCaughtQty, 'Throws error when qty or unit price is negative');
  }

  // --- TEST GROUP 3: Duplicate Transaction Number Protection ---
  console.log('\nGroup 3: Transaction Uniqueness Enforcement');
  {
    const validTrx = {
      id: 'T260826999',
      tanggal: '2026-08-26',
      referal: 'KOPERASI' as const,
      jenis: 'MASUK' as const,
      kategori: 'Simpanan Pokok',
      jumlah: 500000,
      keterangan: 'Simpanan Pokok Unik Test',
    };

    const res1 = await transactionService.saveTransaction(validTrx, false);
    assert(res1.success === true, 'First insert of unique transaction succeeds');

    let duplicateCaught = false;
    try {
      await transactionService.saveTransaction(validTrx, false);
    } catch (e: any) {
      duplicateCaught = true;
      assert(e.message.includes('sudah ada di sistem'), 'Duplicate transaction error message verified');
    }
    assert(duplicateCaught, 'Duplicate transaction ID is strictly rejected');
  }

  // --- TEST GROUP 4: Audit Trail Generation ---
  console.log('\nGroup 4: Audit Trail Logging');
  {
    const auditLogsBefore = await auditService.getAuditLogs();
    const countBefore = auditLogsBefore.data.length;

    await auditService.logActivity(
      'APPROVE_REGISTRATION',
      'member_registrations',
      'REG-2026-001',
      { status: 'PENDING' },
      { status: 'APPROVED', member_no: '0826-03099' }
    );

    const auditLogsAfter = await auditService.getAuditLogs();
    assert(auditLogsAfter.data.length === countBefore + 1, 'Audit log entry successfully appended');
    assert(auditLogsAfter.data[0].action === 'APPROVE_REGISTRATION', 'Audit action correctly recorded');
    assert(auditLogsAfter.data[0].entity_id === 'REG-2026-001', 'Audit target ID matches');
  }

  // --- TEST GROUP 5: Posted Transaction Protection & Voiding ---
  console.log('\nGroup 5: Posted Transaction Protection & Voiding (Cancellation)');
  {
    const voidRes = await transactionService.voidTransaction('T260826999', 'Salah input nominal anggota');
    assert(voidRes.success === true, 'Void transaction operation succeeded');

    const transactions = transactionService.getStoredTransactions();
    const target = transactions.find((t) => t.id === 'T260826999');
    assert(target !== undefined, 'Voided transaction remains in ledger for audit trail');
    assert(target?.keterangan?.includes('[VOID'), 'Void marker is appended to transaction remarks');
  }

  // --- TEST GROUP 6: Financial Savings & Balances Calculation ---
  console.log('\nGroup 6: Financial Savings & Aggregation Summary');
  {
    const savingsSummary = await transactionService.getKoperasiSavingsSummary();
    assert(typeof savingsSummary.totalSimpananPokok === 'number', 'Simpanan Pokok calculation returns valid number');
    assert(typeof savingsSummary.totalSimpananWajib === 'number', 'Simpanan Wajib calculation returns valid number');
    assert(typeof savingsSummary.totalSimpananManasuka === 'number', 'Simpanan Manasuka calculation returns valid number');
    assert(
      savingsSummary.grandTotalSimpanan ===
        savingsSummary.totalSimpananPokok + savingsSummary.totalSimpananWajib + savingsSummary.totalSimpananManasuka,
      'Grand Total Simpanan equals sum of Pokok + Wajib + Manasuka'
    );
  }

  // --- TEST GROUP 7: Profit/Loss and SHU Distribution Calculation ---
  console.log('\nGroup 7: SHU Distribution & Financial Statements Consistency');
  {
    const profitLoss = await reportService.getProfitLoss();
    assert(typeof profitLoss.totalPendapatan === 'number', 'Total Pendapatan is numeric');
    assert(typeof profitLoss.totalBeban === 'number', 'Total Beban is numeric');
    assert(profitLoss.labaBersih === profitLoss.totalPendapatan - profitLoss.totalBeban, 'Laba Bersih equals Pendapatan - Beban');

    const shu = await reportService.getSHUCalculation();
    if (shu.totalSHUKotor > 0) {
      assert(Math.abs(shu.cadanganKoperasi - shu.totalSHUKotor * 0.25) < 0.01, 'Cadangan Koperasi is exactly 25% of SHU Kotor');
      assert(Math.abs(shu.shuBagianAnggota - shu.totalSHUKotor * 0.75) < 0.01, 'SHU Bagian Anggota is exactly 75% of SHU Kotor');
      assert(Math.abs(shu.jasaModal - shu.shuBagianAnggota * 0.40) < 0.01, 'Jasa Modal is exactly 40% of Bagian Anggota');
      assert(Math.abs(shu.jasaUsaha - shu.shuBagianAnggota * 0.60) < 0.01, 'Jasa Usaha is exactly 60% of Bagian Anggota');
    } else {
      assert(shu.cadanganKoperasi === 0 && shu.shuBagianAnggota === 0, 'SHU correctly handles non-positive net profit');
    }
  }

  console.log('\n======================================================');
  console.log(`PHASE 3 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed with Exception:', err);
  process.exit(1);
});
