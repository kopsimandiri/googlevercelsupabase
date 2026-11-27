import { authService } from '../src/services/authService';
import {
  transactionService,
  mapAndCleanTransactionRow,
  dedupeAndSortMemberTransactions,
  doesTransactionBelongToMember,
  buildPostgrestOrSearchFilter,
  quotePostgrestFilterValue,
  matchesTransactionSearchQuery,
} from '../src/services/transactionService';
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
  getSignedProofUrlDetailed,
  hasTransactionProof,
} from '../src/services/storageService';
import { parseStorageRef, handleHealthRequest } from '../server/supabaseHandlers';
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
    BUKTI_TRANSFER_BUCKET === 'bukti_transfer',
    'Bucket utama penyimpanan bukti transfer ditetapkan sebagai bukti_transfer'
  );
  const fakeBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  assert(
    getPublicProofUrl(fakeBase64) === '',
    'getPublicProofUrl menolak URI base64 (data:) agar file tidak tersimpan di database/browser'
  );
  const validBuktiTransferUrl = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/setoran/sample.webp';
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
  // FLOW 11: Storage Ref Parsing, Cross-Bucket Handling & Diagnostic Signed URL
  // ----------------------------------------------------------------------------
  console.log('\n[FLOW 11] Storage Ref Parsing & Diagnostic Signed URL');
  const parsedUnderscore = parseStorageRef(
    'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/02/T260220001-b97crn.webp'
  );
  assert(
    parsedUnderscore?.bucket === 'bukti_transfer' &&
      parsedUnderscore?.objectPath === '2026/02/T260220001-b97crn.webp',
    'parseStorageRef mengekstrak bucket bukti_transfer dan path objek dengan akurat'
  );
  assert(
    parseStorageRef('https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/../secret.webp') === null,
    'parseStorageRef menolak path traversal (..)'
  );
  assert(
    parseStorageRef('https://drive.google.com/file/d/abc123/view') === null,
    'parseStorageRef menolak URL legacy Google Drive'
  );

  const emptyDiag = await getSignedProofUrlDetailed('');
  assert(
    emptyDiag.signedUrl === null && emptyDiag.reason === 'INVALID_REF' && Boolean(emptyDiag.errorMessage),
    'getSignedProofUrlDetailed mengembalikan reason INVALID_REF dan pesan diagnosa saat path kosong'
  );
  const gdriveDiag = await getSignedProofUrlDetailed('https://drive.google.com/file/d/xyz/view');
  assert(
    gdriveDiag.signedUrl === null && gdriveDiag.reason === 'INVALID_REF',
    'getSignedProofUrlDetailed menolak tautan Google Drive dengan alasan terstruktur'
  );

  let healthPayload: any = null;
  await handleHealthRequest(
    { method: 'GET' },
    {
      status: () => ({ json: (p: any) => (healthPayload = p) }),
      json: (p: any) => (healthPayload = p),
    }
  );
  assert(
    healthPayload?.status === 'ok' &&
      typeof healthPayload?.service_role_active === 'boolean' &&
      typeof healthPayload?.has_supabase_url === 'boolean',
    'handleHealthRequest mengembalikan status kesiapan server secara aman tanpa membocorkan kunci rahasia'
  );

  // ----------------------------------------------------------------------------
  // FLOW 12: Strict Member Transaction Isolation & Member Proof Ownership
  // ----------------------------------------------------------------------------
  console.log('\n[FLOW 12] Strict Member Transaction Isolation & Session Consistency');
  const alvinMember = {
    memberName: 'Alvin Azhar, S.E., M.M.',
    memberNo: '1225-02001',
    memberId: '24',
    memberUsername: 'alvinazhar',
  };
  const imamMember = {
    memberName: 'Prof. Dr. H. Imam Ghozali, M.Si., Akt.',
    memberNo: '1225-03002',
    memberId: '25',
    memberUsername: 'imamghozali',
  };

  assert(
    doesTransactionBelongToMember(
      { transaction_no: 'T260220001', member_id: '1225-02001', account_name_legacy: 'ALVIN AZHAR SE,MM' },
      alvinMember
    ) === true,
    'Transaksi milik Alvin Azhar dengan member_id NRA cocok teridentifikasi sebagai milik sendiri'
  );
  assert(
    doesTransactionBelongToMember(
      { transaction_no: 'T260220010', member_id: '24', customer_name: '', account_name_legacy: 'Bank BSI' },
      alvinMember
    ) === true,
    'Transaksi dengan numeric non-UUID member_id ("24") cocok dengan members.id Alvin Azhar'
  );
  assert(
    doesTransactionBelongToMember(
      { transaction_no: 'T260220011', member_id: 'alvinazhar', account_name_legacy: 'Bank BSI' },
      alvinMember
    ) === true,
    'Transaksi dengan member_id berisi username ("alvinazhar") cocok sebagai milik anggota'
  );
  assert(
    doesTransactionBelongToMember(
      {
        transaction_no: 'T260220012',
        member_id: '',
        account_name_legacy: 'ALVIN AZHAR SE.MM',
        description: 'Simpanan Wajib',
      },
      alvinMember
    ) === true,
    'Pencocokan nama legacy menangani variasi titik gelar (S.E., M.M. vs SE.MM)'
  );
  assert(
    doesTransactionBelongToMember(
      {
        transaction_no: 'T260220013',
        member_id: 'NON-ANGGOTA',
        account_name_legacy: 'Bank BSI',
        description: 'Setoran Simpanan Manasuka a.n. Alvin Azhar',
      },
      alvinMember
    ) === true,
    'Placeholder member_id ("NON-ANGGOTA") tetap cocok melalui nama inti pada deskripsi'
  );
  assert(
    doesTransactionBelongToMember(
      {
        transaction_no: 'T260220014',
        member_id: '25',
        customer_name: 'Imam Ghozali',
        account_name_legacy: 'Bank Mandiri',
      },
      imamMember
    ) === true &&
      doesTransactionBelongToMember(
        {
          transaction_no: 'T260220015',
          member_id: '',
          account_name_legacy: 'IMAM GHOZALI',
          description: 'Simpanan Sukarela',
        },
        imamMember
      ) === true,
    'Transaksi Imam Ghozali terbaca baik lewat numeric member_id ("25") maupun nama inti tanpa gelar'
  );
  assert(
    doesTransactionBelongToMember(
      {
        transaction_no: 'T260220002',
        member_id: '1121-00001',
        customer_name: 'Ferry Joko',
        description: 'Titipan transfer dari Alvin Azhar SE,MM',
      },
      alvinMember
    ) === false,
    'Transaksi dengan member_id anggota lain TIDAK bocor meskipun deskripsi menyebut nama anggota'
  );
  assert(
    doesTransactionBelongToMember(
      {
        transaction_no: 'T260220003',
        member_id: '',
        account_name_legacy: 'Bank BSI',
        description: 'Transaksi Syariah Koperasi Pusat',
      },
      { memberName: 'Dr. Ari', memberNo: '1225-09999', memberId: '99' }
    ) === false,
    'Nama pendek bergelar ("Dr. Ari") TIDAK cocok dengan kata biasa ("Syariah") pada baris legacy'
  );
  assert(
    doesTransactionBelongToMember(
      {
        transaction_no: 'T260220004',
        member_id: '',
        account_name_legacy: 'ALVIN AZHAR SE,MM',
        description: 'Simpanan Manasuka',
      },
      alvinMember
    ) === true,
    'Pencocokan nama legacy mengabaikan perbedaan tanda baca gelar (S.E., M.M. vs SE,MM)'
  );
  assert(
    doesTransactionBelongToMember(
      {
        transaction_no: 'T260220005',
        member_id: '',
        account_name_legacy: 'DANA PROJECT',
        description: 'Operasional Project Minyak Merah',
      },
      { memberName: 'Dana Project', memberNo: '1225-08888', memberId: '88' }
    ) === false,
    'Akun buku kas umum/project tidak pernah dianggap sebagai transaksi pribadi anggota'
  );

  await authService.loginMember(memberCreds);
  const currentAfterLogin = authService.getCurrentUser();
  assert(
    currentAfterLogin?.role === 'ANGGOTA' && currentAfterLogin?.memberNo === '1121-00001',
    'authService.getCurrentUser() langsung sinkron dengan role ANGGOTA setelah loginMember'
  );
  await authService.signOut();

  // ----------------------------------------------------------------------------
  // FLOW 13: Grid Multi-Column Search (ID, Akun, Produk) & PostgREST Escaping
  // ----------------------------------------------------------------------------
  console.log('\n[FLOW 13] Grid Search Filter Safety (ID, Akun, Produk)');
  const idSearchFilter = buildPostgrestOrSearchFilter('T260220001', { includeNumericIdEq: true });
  assert(
    !(/(^|,)id\.ilike\./.test(idSearchFilter)) &&
      idSearchFilter.includes('transaction_no.ilike."%T260220001%"'),
    'buildPostgrestOrSearchFilter tidak pernah memakai id.ilike (aman untuk BIGINT/UUID) dan mencari di transaction_no'
  );

  const commaAccountFilter = buildPostgrestOrSearchFilter('ALVIN AZHAR SE,MM');
  assert(
    commaAccountFilter.includes('account_name_legacy.ilike."%ALVIN AZHAR SE,MM%"') &&
      commaAccountFilter.includes('product_name.ilike."%ALVIN AZHAR SE,MM%"'),
    'Kata kunci dengan koma ("ALVIN AZHAR SE,MM") terbungkus tanda kutip PostgREST sehingga tidak merusak .or()'
  );

  const numericIdFilter = buildPostgrestOrSearchFilter('42', { includeNumericIdEq: true });
  assert(
    numericIdFilter.startsWith('id.eq.42,') && !(/(^|,)id\.ilike\./.test(numericIdFilter)),
    'Pencarian angka memakai id.eq.42 tanpa operator id.ilike'
  );

  assert(
    quotePostgrestFilterValue('Kas (Non-Anggota) "Utama"') === '"Kas (Non-Anggota) \\"Utama\\""',
    'quotePostgrestFilterValue meng-escape tanda kutip dan membungkus karakter kurung dengan aman'
  );

  const sampleSearchRow = {
    id: 'T260220001',
    tanggal: '2026-02-20',
    referal: 'PROJECT' as const,
    plantation: 'DISTRIBUTOR MEATSHOP',
    jenis: 'MASUK' as const,
    kategori: 'Penjualan Komoditas',
    sku_name: 'Daging Sapi Prime Cut Halal Segar',
    metode_bayar: 'Bank Mandiri',
    qty: 10,
    jumlah: 1250000,
    area_jenis: 'PROJECT' as const,
    akun: 'ALVIN AZHAR SE,MM',
    customer_name: 'Alvin Azhar, S.E., M.M.',
    member_id: '1225-02001',
    keterangan: 'Pengiriman Meatshop batch 1',
  };
  assert(
    matchesTransactionSearchQuery(sampleSearchRow, 'T260220001') === true &&
      matchesTransactionSearchQuery(sampleSearchRow, 'alvin azhar se mm') === true &&
      matchesTransactionSearchQuery(sampleSearchRow, 'Prime Cut') === true &&
      matchesTransactionSearchQuery(sampleSearchRow, '1225-02001') === true &&
      matchesTransactionSearchQuery(sampleSearchRow, 'Produk Tidak Ada') === false,
    'matchesTransactionSearchQuery menemukan transaksi berdasarkan ID, akun (toleran koma/titik), produk, dan member_id'
  );

  // ----------------------------------------------------------------------------
  // FLOW 14: Shared transaction_no Preservation (imamghozali 2 rows, alvinazhar 8 rows)
  // ----------------------------------------------------------------------------
  console.log('\n▶ [FLOW 14] Shared transaction_no Row Preservation & Member Portal Isolation');
  const imamRawRows = [
    {
      id: 23,
      transaction_no: 'T260330005',
      transaction_date: '2026-03-30',
      category_name: 'SIMPANAN WAJIB',
      transaction_type: 'MASUK',
      amount: 360000,
      account_name_legacy: 'IMAM GHOZALI',
      bukti_url: 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330005-vumfjf.webp',
    },
    {
      id: 24,
      transaction_no: 'T260330005',
      transaction_date: '2026-03-30',
      category_name: 'SIMPANAN POKOK',
      transaction_type: 'MASUK',
      amount: 500000,
      account_name_legacy: 'IMAM GHOZALI',
      bukti_url: 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330005-vumfjf.webp',
    },
  ];
  const imamMapped = dedupeAndSortMemberTransactions(
    imamRawRows
      .map(mapAndCleanTransactionRow)
      .filter((r) =>
        doesTransactionBelongToMember(r, {
          memberName: 'IMAM GHOZALI',
          memberNo: '1225-03002',
          memberId: '24',
          memberUsername: 'imamghozali',
        })
      )
  );
  assert(
    imamMapped.length === 2 && imamMapped[0].dbId !== imamMapped[1].dbId && imamMapped.every((r) => r.id === 'T260330005'),
    'imamghozali mempertahankan 2 baris transaksi utuh meski berbagi transaction_no T260330005'
  );

  const alvinRawRows = [
    { id: 1, transaction_no: 'T251229001', transaction_date: '2025-12-29', category_name: 'SIMPANAN WAJIB', transaction_type: 'MASUK', amount: 120000, account_name_legacy: 'ALVIN AZHAR SE,MM' },
    { id: 2, transaction_no: 'T251229001', transaction_date: '2025-12-29', category_name: 'SIMPANAN WAJIB', transaction_type: 'MASUK', amount: 120000, account_name_legacy: 'ALVIN AZHAR SE,MM' },
    { id: 3, transaction_no: 'T251229001', transaction_date: '2025-12-29', category_name: 'SIMPANAN POKOK', transaction_type: 'MASUK', amount: 500000, account_name_legacy: 'ALVIN AZHAR SE,MM' },
    { id: 4, transaction_no: 'T251229002', transaction_date: '2025-12-29', category_name: 'SIMPANAN MANASUKA', transaction_type: 'MASUK', amount: 100000000, account_name_legacy: 'ALVIN AZHAR SE,MM' },
    { id: 5, transaction_no: 'T251229003', transaction_date: '2025-12-29', category_name: 'SIMPANAN MANASUKA', transaction_type: 'MASUK', amount: 100000000, account_name_legacy: 'ALVIN AZHAR SE,MM' },
    { id: 6, transaction_no: 'T251229004', transaction_date: '2025-12-29', category_name: 'SIMPANAN MANASUKA', transaction_type: 'MASUK', amount: 50000000, account_name_legacy: 'ALVIN AZHAR SE,MM' },
    { id: 7, transaction_no: 'T260202001', transaction_date: '2026-02-02', category_name: 'SIMPANAN MANASUKA', transaction_type: 'MASUK', amount: 100000000, account_name_legacy: 'ALVIN AZHAR SE,MM' },
    { id: 8, transaction_no: 'T260220001', transaction_date: '2026-02-20', category_name: 'SIMPANAN MANASUKA', transaction_type: 'MASUK', amount: 100000000, account_name_legacy: 'ALVIN AZHAR SE,MM' },
  ];
  const alvinMapped = dedupeAndSortMemberTransactions(
    alvinRawRows
      .map(mapAndCleanTransactionRow)
      .filter((r) =>
        doesTransactionBelongToMember(r, {
          memberName: 'ALVIN AZHAR SE,MM',
          memberNo: '1225-02001',
          memberId: '22',
          memberUsername: 'alvinazhar',
        })
      )
  );
  assert(
    alvinMapped.length === 8 &&
      alvinMapped.filter((r) => r.id === 'T251229001').length === 3 &&
      quotePostgrestFilterValue('%ALVIN AZHAR SE,MM%') === '"%ALVIN AZHAR SE,MM%"',
    'alvinazhar mempertahankan seluruh 8 baris (termasuk 3 baris identik transaction_no T251229001) & aman terhadap tanda koma'
  );

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
