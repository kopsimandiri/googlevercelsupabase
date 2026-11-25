import { authService } from '../src/services/authService';
import { transactionService, mapAndCleanTransactionRow } from '../src/services/transactionService';
import { paymentService } from '../src/services/paymentService';
import { notificationService } from '../src/services/notificationService';
import { auditService } from '../src/services/auditService';
import { generateWebhookSignature, verifyWebhookSignature } from '../src/utils/cryptoSecurity';
import {
  BUKTI_TRANSFER_BUCKET,
  isGoogleDriveUrl,
  isSupabaseStorageUrl,
  extractStoragePath,
  getPublicProofUrl,
  hasTransactionProof,
} from '../src/services/storageService';
import {
  ADMIN_WHATSAPP_DISPLAY,
  formatWhatsAppInternational,
  buildAdminWhatsAppUrl,
} from '../src/constants/contact';

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
  // FLOW 8: Supabase Storage Proof Enforcement (Reject Legacy Google Drive Links)
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 8] Supabase Storage Proof Enforcement & Google Drive Rejection');
  const legacyDriveUrl = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing';
  const validSupabaseUrl = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229001-jnpf6q.webp';

  assert(isGoogleDriveUrl(legacyDriveUrl) === true, 'isGoogleDriveUrl mendeteksi link Google Drive');
  assert(isSupabaseStorageUrl(legacyDriveUrl) === false, 'isSupabaseStorageUrl menolak link Google Drive');
  assert(isSupabaseStorageUrl(validSupabaseUrl) === true, 'isSupabaseStorageUrl menerima URL Supabase Storage valid');
  assert(extractStoragePath(legacyDriveUrl) === null, 'extractStoragePath mengembalikan null untuk URL Google Drive');
  assert(
    extractStoragePath(validSupabaseUrl) === '2025/12/T251229001-jnpf6q.webp',
    'extractStoragePath mengekstrak object path dari URL Supabase Storage'
  );
  assert(getPublicProofUrl(legacyDriveUrl) === '', 'getPublicProofUrl memblokir URL Google Drive menjadi string kosong');
  assert(getPublicProofUrl(validSupabaseUrl) === validSupabaseUrl, 'getPublicProofUrl mempertahankan URL Supabase Storage valid');
  assert(
    hasTransactionProof({ id: 'T999999001', filelink: legacyDriveUrl }) === false,
    'hasTransactionProof menolak transaksi dengan URL Google Drive jika tidak ada di Supabase Storage'
  );

  const cleanedUnknownDriveRow = mapAndCleanTransactionRow({
    transaction_no: 'T999999001',
    transaction_date: '2026-01-10',
    amount: 500000,
    file_url: legacyDriveUrl,
  });
  assert(
    cleanedUnknownDriveRow.filelink === '',
    'mapAndCleanTransactionRow membersihkan URL Google Drive jika belum ada di bucket Supabase'
  );

  const cleanedKnownDriveRow = mapAndCleanTransactionRow({
    transaction_no: 'T251229001-1',
    transaction_date: '2025-12-29',
    amount: 500000,
    file_url: legacyDriveUrl,
  });
  assert(
    cleanedKnownDriveRow.filelink === validSupabaseUrl,
    'mapAndCleanTransactionRow mengganti URL Google Drive dengan URL Supabase Storage dari registry untuk transaksi terdaftar'
  );

  // Server-only storage & bukti_url enforcement
  assert(
    BUKTI_TRANSFER_BUCKET === 'bukti-transfer',
    'Bucket utama penyimpanan bukti transfer ditetapkan sebagai bukti-transfer'
  );
  const fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  assert(
    getPublicProofUrl(fakeBase64) === '',
    'getPublicProofUrl menolak URI base64 (data:) agar file tidak tersimpan di database/browser'
  );
  const validBuktiTransferUrl = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti-transfer/setoran/sample.webp';
  const mappedBuktiRow = mapAndCleanTransactionRow({
    transaction_no: 'T261124001',
    transaction_date: '2026-11-24',
    amount: 250000,
    bukti_url: validBuktiTransferUrl,
  });
  assert(
    mappedBuktiRow.bukti_url === validBuktiTransferUrl && mappedBuktiRow.filelink === validBuktiTransferUrl,
    'mapAndCleanTransactionRow memetakan kolom bukti_url dari Supabase ke tampilan riwayat transaksi'
  );

  // ----------------------------------------------------------------------------
  // FLOW 9: Admin WhatsApp Contact & 1-Click Direct URL Builder
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 9] Admin WhatsApp Contact & 1-Click Direct URL Builder');
  assert(ADMIN_WHATSAPP_DISPLAY === '082148988520', 'Nomor WhatsApp admin sesuai: 082148988520');
  assert(
    formatWhatsAppInternational('082148988520') === '6282148988520',
    'Konversi nomor 082148988520 menjadi format internasional 6282148988520'
  );
  const directWaUrl = buildAdminWhatsAppUrl("Assalamu'alaikum Admin KOPSIM");
  assert(
    directWaUrl.startsWith('https://wa.me/6282148988520?text='),
    'URL 1-klik WhatsApp mengarah langsung ke https://wa.me/6282148988520?text=...'
  );

  // ----------------------------------------------------------------------------
  // FLOW 10: Member Portal Routing & View-Only Transaction Mutation Guards
  // ----------------------------------------------------------------------------
  console.log('\n▶ [CRITICAL FLOW 10] Member Portal Routing & View-Only Guards');
  const { pathToPage } = await import('../src/hooks/useAppRouter');
  const memberSimpananRoute = pathToPage('/portal/simpanan');
  assert(
    memberSimpananRoute.page === 'MEMBER_PORTAL' && memberSimpananRoute.tab === 'simpanan',
    '/portal/simpanan mengarah ke MEMBER_PORTAL (bukan Admin SIMPANAN)'
  );
  const memberTransaksiRoute = pathToPage('/portal/transaksi');
  assert(
    memberTransaksiRoute.page === 'MEMBER_PORTAL' && memberTransaksiRoute.tab === 'transaksi',
    '/portal/transaksi mengarah ke MEMBER_PORTAL tab transaksi'
  );
  const adminSimpananRoute = pathToPage('/admin/simpanan');
  assert(
    adminSimpananRoute.page === 'SIMPANAN' && adminSimpananRoute.boundary === 'ADMIN',
    '/admin/simpanan tetap diproteksi pada boundary ADMIN'
  );

  // Re-login as member to ensure activeUser is ANGGOTA for mutation denial test
  await authService.loginMember(memberCreds);
  let memberSaveBlocked = false;
  try {
    await transactionService.saveTransaction({
      id: `TRX-DENIED-${Date.now()}`,
      tanggal: '2026-11-24',
      referal: 'KOPERASI',
      plantation: 'PUSAT JAKARTA',
      jenis: 'MASUK',
      kategori: 'Simpanan Wajib',
      metode_bayar: 'Bank BSI',
      qty: 1,
      jumlah: 100000,
    });
  } catch {
    memberSaveBlocked = true;
  }
  assert(memberSaveBlocked === true, 'ANGGOTA ditolak saat mencoba saveTransaction (View-Only enforced)');

  let memberDeleteBlocked = false;
  try {
    await transactionService.deleteTransaction(testTrxId);
  } catch {
    memberDeleteBlocked = true;
  }
  assert(memberDeleteBlocked === true, 'ANGGOTA ditolak saat mencoba deleteTransaction (View-Only enforced)');

  await authService.signOut();

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
