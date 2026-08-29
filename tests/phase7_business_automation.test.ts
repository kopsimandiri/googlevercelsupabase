import { loanService } from '../src/services/loanService';
import { notificationService } from '../src/services/notificationService';
import { paymentService } from '../src/services/paymentService';
import { generateWebhookSignature, verifyWebhookSignature } from '../server';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('  KOPSIM MANDIRI — PHASE 7 BUSINESS AUTOMATION INTEGRATION TESTS');
  console.log('================================================================\n');

  // ============================================================================
  // TEST GROUP 1: LOAN SIMULATOR & AMORTIZATION
  // ============================================================================
  console.log('▶ [GROUP 1] Loan Simulator & Islamic Amortization Calculation');

  const clientSim = loanService.calculateClientSimulation(12000000, 12, 6.0, 'MURABAHAH');
  assert(clientSim.loan_amount === 12000000, 'Plafon pinjaman sesuai input (12 Juta)');
  assert(clientSim.tenor_months === 12, 'Tenor 12 bulan');
  assert(clientSim.margin_amount === 720000, 'Total margin 6% flat p.a. = Rp 720.000');
  assert(clientSim.total_payment === 12720000, 'Total kewajiban pengembalian = Rp 12.720.000');
  assert(clientSim.monthly_installment === 1060000, 'Angsuran bulanan = Rp 1.060.000/bln');
  assert(clientSim.schedule.length === 12, 'Tabel jadwal angsuran memiliki 12 baris bulan');
  assert(
    clientSim.disclaimer.includes('Simulasi ini bukan keputusan kredit final'),
    'Disclaimer resmi wajib ditampilkan pada hasil simulasi'
  );

  // Test Server Authoritative Calculation
  const serverSim = await loanService.calculateServerAuthoritative(24000000, 24, 6.0, 'MURABAHAH');
  assert(serverSim.total_payment === 26880000, 'Server calculation matches authoritative financial formula');
  assert(serverSim.is_authoritative === true, 'Response ditandai sebagai authoritative oleh server');

  // Test Application Submission
  const applyRes = await loanService.submitApplication({
    member_id: '0824-03001',
    member_name: 'M. FACHRI MUBAROK',
    akad_type: 'MURABAHAH',
    peruntukan: 'MODAL_KERJA_PERTANIAN',
    loan_amount: 10000000,
    tenor_months: 12,
    margin_rate_pa: 6.0,
    collateral_type: 'BPKB_MOTOR',
    collateral_detail: 'BPKB Vario 160 No Pol B-1234-XYZ',
    monthly_income: 8000000,
  });
  assert(applyRes.success === true, 'Pengajuan pembiayaan berhasil disubmit');
  assert(!!applyRes.data?.application_no, `No Pengajuan dihasilkan: ${applyRes.data?.application_no}`);
  assert(applyRes.data?.status === 'SUBMITTED', 'Status awal pengajuan adalah SUBMITTED');

  // ============================================================================
  // TEST GROUP 2: NOTIFICATION CENTER & MULTI-CHANNEL QUEUE
  // ============================================================================
  console.log('\n▶ [GROUP 2] Notification Center & Background Queue Worker');

  const notifJobRes = await notificationService.queueJob({
    type: 'TRANSACTION_SUCCESS',
    recipient: '+6281234567890',
    recipient_name: 'M. FACHRI MUBAROK',
    channel: 'WHATSAPP',
    payload: {
      title: 'Setoran Simpanan Sukses',
      amount: 500000,
      trx_id: 'TRX-TEST-001',
    },
  });
  assert(notifJobRes.success === true, 'Job notifikasi berhasil di-enqueue ke antrean server');
  assert(notifJobRes.data?.channel === 'WHATSAPP', 'Channel WhatsApp terkonfigurasi');
  assert(notifJobRes.data?.status === 'SENT' || notifJobRes.data?.status === 'PENDING', 'Status job aktif dalam antrean');

  // In-app notifications
  const userNotifs = await notificationService.getUserNotifications('0824-03001');
  assert(userNotifs.length > 0, 'In-app user notifications tersedia di inbox anggota');

  // Mark as read
  if (userNotifs.length > 0) {
    await notificationService.markAsRead(userNotifs[0].id);
    const updated = await notificationService.getUserNotifications('0824-03001');
    const target = updated.find((n) => n.id === userNotifs[0].id);
    assert(target?.is_read === true, 'Notifikasi berhasil ditandai telah dibaca');
  }

  // ============================================================================
  // TEST GROUP 3: PAYMENT GATEWAY, HMAC WEBHOOK & IDEMPOTENCY
  // ============================================================================
  console.log('\n▶ [GROUP 3] Payment Gateway, Webhook Security & Idempotency');

  // 1. Create Payment
  const payReq = await paymentService.createPaymentRequest({
    member_id: '0824-03001',
    member_name: 'M. FACHRI MUBAROK',
    amount: 500000,
    payment_type: 'QRIS',
    payment_channel: 'QRIS_DYNAMIC',
    category: 'Simpanan Wajib Anggota',
  });
  assert(payReq.success === true, 'Payment request QRIS berhasil dibuat');
  assert(payReq.data?.status === 'PENDING', 'Status awal pembayaran adalah PENDING');
  const orderId = payReq.data!.order_id;
  assert(!!orderId, `Order ID dibuat: ${orderId}`);

  // 2. Webhook Signature Verification Test
  const secretKey = 'kopsim_live_webhook_secret_key_2026';
  const testPayload = JSON.stringify({ order_id: orderId, status: 'PAID' });
  const validSig = generateWebhookSignature(testPayload, secretKey);
  assert(verifyWebhookSignature(testPayload, validSig, secretKey) === true, 'HMAC SHA256 valid signature terverifikasi');
  assert(verifyWebhookSignature(testPayload, 'FAKE_SIGNATURE', secretKey) === false, 'Tampered HMAC signature ditolak');

  // 3. Process Valid Webhook
  const webhookRes = await paymentService.processWebhook({
    order_id: orderId,
    status: 'PAID',
    channel: 'QRIS',
    signature: 'sig_valid_kopsim_live_webhook_secret_key_2026',
  });
  assert(webhookRes.success === true, 'Webhook pembayaran berhasil diproses dan diverifikasi');
  assert(webhookRes.status === 'POSTED', 'Status pembayaran bermutasi menjadi POSTED di pembukuan');
  assert(!!webhookRes.transaction_id, `Ledger Transaction ID terbit: ${webhookRes.transaction_id}`);

  // 4. Duplicate Webhook (Idempotency Protection Test)
  const duplicateWebhookRes = await paymentService.processWebhook({
    order_id: orderId,
    status: 'PAID',
    channel: 'QRIS',
    signature: 'sig_valid_kopsim_live_webhook_secret_key_2026',
  });
  assert(
    duplicateWebhookRes.is_duplicate === true || duplicateWebhookRes.status === 'POSTED',
    'Idempotency guard sukses mencegah double posting transaksi pada duplikasi webhook'
  );
  assert(
    duplicateWebhookRes.transaction_id === webhookRes.transaction_id,
    'Transaction ID konsisten dan tidak menciptakan entri buku kas kedua'
  );

  // 5. Financial Reconciliation
  const reconRes = await paymentService.reconcileTransactions();
  assert(reconRes.discrepancyCount === 0, 'Rekonsiliasi total settlement gateway vs ledger memiliki 0 selisih');

  console.log('\n================================================================');
  console.log(`  INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test Suite Exception:', err);
  process.exit(1);
});
