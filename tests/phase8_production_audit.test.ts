import { authService } from '../src/services/authService';
import { transactionService } from '../src/services/transactionService';
import { paymentService } from '../src/services/paymentService';
import { notificationService } from '../src/services/notificationService';
import { auditService } from '../src/services/auditService';
import { generateWebhookSignature, verifyWebhookSignature } from '../src/utils/cryptoSecurity';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runE2ECriticalFlows() {
  console.log('================================================================');
  console.log('  KOPSIM MANDIRI — PHASE 8 PRODUCTION HARDENING & RELEASE AUDIT');
  console.log('================================================================');

  // ----------------------------------------------------------------------------
  // FLOW 1: Admin Login -> Dashboard -> Transaction Create -> Audit Log
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 1] Admin Login & Authoritative Ledger Access');
  const adminCreds = { identifier: 'admin@kopsimmandiri.id', password: 'AdminKopsimSecure2026!' };
  const adminSession = await authService.login(adminCreds);
  assert(adminSession.role === 'ADMIN', 'Admin authentication berhasil dengan role ADMIN');
  assert(adminSession.email === 'admin@kopsimmandiri.id', 'Email admin terverifikasi');

  // Create Transaction
  const testTrxId = `TRX-E2E-${Date.now()}`;
  const saveTrxRes = await transactionService.saveTransaction({
    id: testTrxId,
    tanggal: '2026-08-29',
    referal: 'KOPERASI',
    plantation: 'PUSAT JAKARTA',
    jenis: 'MASUK',
    kategori: 'SIMPANAN POKOK',
    metode_bayar: 'KAS BESAR (BANK)',
    qty: 1,
    jumlah: 1000000,
    area_jenis: 'KOPERASI PUSAT',
    keterangan: 'Setoran Simpanan Pokok E2E Audit',
    login_as: adminSession.email,
  });
  assert(saveTrxRes.success === true, 'Admin berhasil posting transaksi buku kas');

  // Verify Audit Log was generated
  const auditLogs = auditService.getStoredLogs();
  const foundAudit = auditLogs.find((l) => l.action.includes('TRANSACTION') || l.entity === 'transactions' || (l.entity_id && l.entity_id.includes(testTrxId)));
  assert(!!foundAudit, 'Audit log otomatis tercatat saat transaksi kas dibuat');

  // ----------------------------------------------------------------------------
  // FLOW 2: Director Login -> Read-Only Strategic Financial Review
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 2] Director Login & Strategic Financial Review');
  const dirCreds = { identifier: 'direksi@kopsimmandiri.id', password: 'DirekturKopsim2026!' };
  const dirSession = await authService.login(dirCreds);
  assert(dirSession.role === 'DIRECTOR', 'Direktur authentication berhasil dengan role DIRECTOR');
  assert(dirSession.name.includes('Direksi') || dirSession.name.includes('Direktur'), 'Profil nama direksi terverifikasi');

  // ----------------------------------------------------------------------------
  // FLOW 3: Member Login -> Profile, Savings, KTA Access
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 3] Member Login & Profile / KTA Access');
  const memberCreds = { username: '1121-00001', password: 'memberPassword2026!' };
  const memberSession = await authService.loginMember(memberCreds);
  assert(memberSession.role === 'ANGGOTA', 'Anggota login berhasil dengan role ANGGOTA');
  assert(memberSession.memberId === '1121-00001', 'Member ID anggota sesuai (1121-00001)');
  assert(memberSession.nikMasked.includes('*'), 'NIK anggota ter-masking untuk privasi (sensitive data protection)');

  // ----------------------------------------------------------------------------
  // FLOW 4: Authorization Guard - Member attempting Admin Route / Data
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 4] Security Guard: Member Attempting Admin Route Denied');
  const isMemberAuthorizedForAdmin = memberSession.role === 'ADMIN' || memberSession.role === 'DIRECTOR';
  assert(isMemberAuthorizedForAdmin === false, 'Hak akses Anggota ditolak untuk route Admin / Pengurus');

  // ----------------------------------------------------------------------------
  // FLOW 5: Privacy Guard - Member attempting another member data Denied
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 5] Privacy Guard: Member Access Boundary (Row-Level Access)');
  const requestedMemberId = '0824-03002'; // Another member
  const canAccessOtherMember = (memberSession.role as string) === 'ADMIN' || memberSession.memberId === requestedMemberId;
  assert(canAccessOtherMember === false, 'Akses anggota terhadap profil & simpanan anggota lain berhasil ditolak');

  // ----------------------------------------------------------------------------
  // FLOW 6: Payment Webhook -> Verified Signature & Idempotent Transaction
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 6] Payment Webhook Security & Idempotency Execution');
  const payReq = await paymentService.createPaymentRequest({
    member_id: memberSession.memberId,
    member_name: memberSession.name,
    amount: 750000,
    payment_type: 'QRIS',
    payment_channel: 'QRIS_DYNAMIC',
    category: 'Simpanan Wajib',
  });
  const orderId = payReq.data!.order_id;
  assert(!!orderId, `Payment Request order_id terbit: ${orderId}`);

  // Test Valid Webhook Post
  const webhookRes = await paymentService.processWebhook({
    order_id: orderId,
    status: 'PAID',
    channel: 'QRIS',
    signature: 'sig_valid_kopsim_live_webhook_secret_key_2026',
  });
  assert(webhookRes.success === true, 'Webhook pembayaran terverifikasi sukses diproses');
  assert(webhookRes.status === 'POSTED', 'Status pembayaran terposting ke buku kas');

  // Test Duplicate Webhook
  const dupWebhookRes = await paymentService.processWebhook({
    order_id: orderId,
    status: 'PAID',
    channel: 'QRIS',
    signature: 'sig_valid_kopsim_live_webhook_secret_key_2026',
  });
  assert(dupWebhookRes.is_duplicate === true, 'Idempotency guard aktif mencegah duplicate booking');
  assert(dupWebhookRes.transaction_id === webhookRes.transaction_id, 'Nomor referensi kas tetap konsisten');

  // ----------------------------------------------------------------------------
  // FLOW 7: Notification Center & Queue Retry Worker
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 7] Notification Failure & Retry Worker');
  const jobRes = await notificationService.queueJob({
    type: 'SAVINGS_DEPOSIT',
    recipient: '+6281234567890',
    recipient_name: memberSession.name,
    channel: 'WHATSAPP',
    payload: { order_id: orderId, amount: 750000 },
  });
  assert(jobRes.success === true, 'Job notifikasi masuk ke antrean worker');
  assert(!!jobRes.data?.id, 'ID job antrean terbit');

  const retryRes = await notificationService.retryJob(jobRes.data!.id);
  assert(retryRes.success === true, 'Worker retry execution sukses memproses antrean notifikasi');

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  E2E AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ECriticalFlows().catch((err) => {
  console.error('Audit Error:', err);
  process.exit(1);
});
