import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedAdminClient: SupabaseClient | null | undefined = undefined;

function getSupabaseServerConfig(): {
  url: string;
  key: string;
  hasServiceRoleKey: boolean;
} {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const fallbackAnonKey = (
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const key = serviceKey || fallbackAnonKey;

  return {
    url,
    key,
    hasServiceRoleKey: Boolean(serviceKey),
  };
}

export function getSupabaseAdminClient(): {
  client: SupabaseClient | null;
  hasServiceRoleKey: boolean;
} {
  const { url, key, hasServiceRoleKey } = getSupabaseServerConfig();
  if (cachedAdminClient !== undefined) {
    return { client: cachedAdminClient, hasServiceRoleKey };
  }
  if (url && key && url !== 'https://your-project.supabase.co') {
    cachedAdminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } else {
    cachedAdminClient = null;
  }
  return { client: cachedAdminClient, hasServiceRoleKey };
}

function isUuidLike(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

function normalizePersonName(val: unknown): string {
  return String(val || '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[,;:/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePathRef(val: unknown): string {
  const s = String(val || '').trim();
  if (!s) return '';
  try {
    return decodeURIComponent(s).toLowerCase();
  } catch {
    return s.toLowerCase();
  }
}

export function parseStorageRef(
  rawInput: string,
  preferredBucket?: string
): { bucket: string; objectPath: string } | null {
  const trimmed = String(rawInput || '').trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return null;
  if (
    trimmed.toLowerCase().includes('drive.google.com') ||
    trimmed.toLowerCase().includes('docs.google.com') ||
    trimmed.toLowerCase().includes('googleusercontent.com')
  ) {
    return null;
  }

  let bucket = preferredBucket === 'bukti-transfer' ? 'bukti-transfer' : 'bukti_transfer';
  let objectPath = trimmed;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const u = new URL(trimmed);
      const match = u.pathname.match(
        /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^\/]+)\/(.*)/
      );
      if (match && match[1] && match[2]) {
        bucket = match[1];
        objectPath = decodeURIComponent(match[2]);
      } else {
        return null;
      }
    } catch {
      return null;
    }
  } else {
    objectPath = objectPath.replace(/^\/+/, '');
    if (objectPath.startsWith('bukti-transfer/')) {
      bucket = 'bukti-transfer';
      objectPath = objectPath.replace(/^bukti-transfer\/+/, '');
    } else if (objectPath.startsWith('bukti_transfer/')) {
      bucket = 'bukti_transfer';
      objectPath = objectPath.replace(/^bukti_transfer\/+/, '');
    }
  }

  objectPath = objectPath.replace(/^\/+|\/+$/g, '');
  if (!objectPath || objectPath.includes('..')) return null;
  if (bucket !== 'bukti-transfer' && bucket !== 'bukti_transfer') return null;

  return { bucket, objectPath };
}

function parseJsonBody(req: any): Record<string, any> {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
}

export async function handleUploadProofRequest(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { client: supabaseAdmin } = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return res.status(503).json({
        success: false,
        error: 'Supabase storage belum dikonfigurasi di server.',
      });
    }

    const body = parseJsonBody(req);
    const { path: rawPath, mimeType = 'image/webp', dataUrl } = body;
    const cleanPath = String(rawPath || '').trim().replace(/^\/+/, '');
    const allowedPrefixes = [
      'pendaftaran/',
      'investasi/',
      'setoran/',
      'avatar/',
      'berita/',
      'migrasi/',
    ];

    if (!cleanPath || !allowedPrefixes.some((p) => cleanPath.startsWith(p))) {
      return res.status(400).json({ success: false, error: 'Path penyimpanan tidak diizinkan.' });
    }

    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.includes(',')) {
      return res.status(400).json({ success: false, error: 'Payload berkas tidak valid.' });
    }

    const base64Data = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: 'Ukuran berkas melebihi batas 10 MB.' });
    }

    let usedBucket = 'bukti_transfer';
    let { data, error } = await supabaseAdmin.storage.from(usedBucket).upload(cleanPath, buffer, {
      contentType: mimeType,
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      usedBucket = 'bukti-transfer';
      const retry = await supabaseAdmin.storage.from(usedBucket).upload(cleanPath, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      return res.status(403).json({
        success: false,
        error: error?.message || 'Gagal mengunggah berkas ke Supabase Storage.',
      });
    }

    const finalPath = data.path || cleanPath;
    const { data: urlData } = supabaseAdmin.storage.from(usedBucket).getPublicUrl(finalPath);
    let signedUrl: string | null = null;
    try {
      const { data: signedData } = await supabaseAdmin.storage
        .from(usedBucket)
        .createSignedUrl(finalPath, 3600);
      signedUrl = signedData?.signedUrl || null;
    } catch {
      signedUrl = null;
    }

    return res.json({
      success: true,
      path: finalPath,
      publicUrl: urlData?.publicUrl,
      signedUrl,
      bucket: usedBucket,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Storage upload server error',
    });
  }
}

export async function handleSignedUrlRequest(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { client: supabaseAdmin, hasServiceRoleKey } = getSupabaseAdminClient();
    if (!supabaseAdmin) {
      return res.status(503).json({
        success: false,
        code: 'API_UNAVAILABLE',
        error: 'Supabase storage belum dikonfigurasi di server.',
      });
    }

    const body = parseJsonBody(req);
    const {
      pathOrUrl,
      bucket: preferredBucket,
      expiresIn = 3600,
      memberNo,
      memberName,
      transactionNo,
    } = body;

    const parsed = parseStorageRef(String(pathOrUrl || ''), preferredBucket);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        code: 'INVALID_REF',
        error: 'Referensi berkas storage tidak valid.',
      });
    }

    let isAuthorized = false;
    let isAdminOrDir = false;
    let jwtMemberNo = '';
    const authHeader = String(req.headers?.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

    if (token) {
      try {
        const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (!userErr && userData?.user) {
          isAuthorized = true;
          const email = (userData.user.email || '').toLowerCase();
          const metaRole = String(
            userData.user.app_metadata?.role || userData.user.user_metadata?.role || ''
          ).toUpperCase();
          if (
            email === 'koperasi.simandiri@gmail.com' ||
            email.startsWith('admin@') ||
            ['ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS'].includes(metaRole)
          ) {
            isAdminOrDir = true;
          } else {
            const rawMetaNo = String(
              userData.user.app_metadata?.member_no ||
                userData.user.user_metadata?.member_no ||
                (email.endsWith('@anggota.kopsim.id') ? email.split('@')[0] : '')
            ).trim();
            if (rawMetaNo) {
              jwtMemberNo = rawMetaNo.toLowerCase();
            }
          }
        }
      } catch {
        // lanjut cek identitas anggota di bawah
      }
    }

    if (!isAdminOrDir && hasServiceRoleKey) {
      const requestedMemberNo = String(memberNo || '').trim().toLowerCase();
      const cleanMemberNo = jwtMemberNo || requestedMemberNo;
      const cleanMemberName = String(memberName || '').trim().toLowerCase();
      const normMemberName = normalizePersonName(memberName);
      const obj = parsed.objectPath;
      const normObj = normalizePathRef(obj);

      if (jwtMemberNo && requestedMemberNo && jwtMemberNo !== requestedMemberNo) {
        return res.status(403).json({
          success: false,
          code: 'FORBIDDEN',
          error: 'Akses ditolak: Identitas anggota tidak sesuai dengan sesi login.',
        });
      }

      if (!cleanMemberNo && !cleanMemberName) {
        if (!isAuthorized) {
          return res.status(401).json({
            success: false,
            code: 'UNAUTHORIZED',
            error: 'Autentikasi diperlukan untuk mengakses bukti transfer.',
          });
        }
      } else {
        let owned = false;
        if (
          cleanMemberNo &&
          (normObj.startsWith(`avatar/${cleanMemberNo}`) ||
            normObj.startsWith(`setoran/${cleanMemberNo}`) ||
            normObj.startsWith(`investasi/${cleanMemberNo}`))
        ) {
          owned = true;
        }

        if (!owned && (cleanMemberNo || cleanMemberName)) {
          const { data: trxRows } = await supabaseAdmin.rpc('get_member_portal_transactions', {
            p_member_no: cleanMemberNo,
            p_member_name: cleanMemberName,
          });
          if (
            Array.isArray(trxRows) &&
            trxRows.some((r: any) => {
              const bUrl = normalizePathRef(r?.bukti_url);
              const fUrl = normalizePathRef(r?.file_url);
              if ((bUrl && bUrl.includes(normObj)) || (fUrl && fUrl.includes(normObj))) {
                return true;
              }
              // Jika baris transaksi sudah terverifikasi milik anggota, cocokkan nomor transaksinya pada nama file di bucket
              const rowTrxNo = String(r?.transaction_no || r?.id || '').trim().toLowerCase();
              const normAcc = normalizePersonName(r?.account_name_legacy || r?.customer_name);
              const nameMatchesRow =
                normMemberName.length >= 3 &&
                normAcc.length >= 3 &&
                (normAcc.includes(normMemberName) || normMemberName.includes(normAcc));
              if (
                rowTrxNo.length >= 6 &&
                (normObj.includes(`/${rowTrxNo}-`) ||
                  normObj.includes(`/${rowTrxNo}.`) ||
                  normObj.startsWith(`${rowTrxNo}-`) ||
                  normObj.startsWith(`${rowTrxNo}.`))
              ) {
                return Boolean(cleanMemberNo || nameMatchesRow || trxRows.length > 0);
              }
              return false;
            })
          ) {
            owned = true;
          }
        }

        if (!owned && cleanMemberNo) {
          const { data: invRows } = await supabaseAdmin
            .from('investment_transactions')
            .select('bukti_url, payment_proof_url')
            .ilike('member_no', cleanMemberNo);
          if (
            Array.isArray(invRows) &&
            invRows.some((r: any) => {
              const bUrl = normalizePathRef(r?.bukti_url);
              const pUrl = normalizePathRef(r?.payment_proof_url);
              return (bUrl && bUrl.includes(normObj)) || (pUrl && pUrl.includes(normObj));
            })
          ) {
            owned = true;
          }
        }

        if (!owned && (cleanMemberNo || cleanMemberName)) {
          const { data: regProof } = await supabaseAdmin.rpc('get_member_registration_proof', {
            p_member_no: cleanMemberNo,
            p_member_name: cleanMemberName,
          });
          if (typeof regProof === 'string' && normalizePathRef(regProof).includes(normObj)) {
            owned = true;
          }
        }

        if (!owned && cleanMemberNo) {
          let mRow: any = null;
          if (isUuidLike(cleanMemberNo) || /^\d+$/.test(cleanMemberNo)) {
            const { data } = await supabaseAdmin
              .from('members')
              .select('avatar_url')
              .eq('id', cleanMemberNo)
              .limit(1)
              .maybeSingle();
            mRow = data;
          }
          if (!mRow) {
            const { data } = await supabaseAdmin
              .from('members')
              .select('avatar_url')
              .ilike('member_no', cleanMemberNo)
              .limit(1)
              .maybeSingle();
            mRow = data;
          }
          if (mRow?.avatar_url && normalizePathRef(mRow.avatar_url).includes(normObj)) {
            owned = true;
          }
        }

        if (owned) {
          isAuthorized = true;
        } else if (!isAuthorized) {
          return res.status(403).json({
            success: false,
            code: 'FORBIDDEN',
            error: 'Akses ditolak: Anda tidak berhak mengakses berkas bukti transaksi ini.',
          });
        } else {
          return res.status(403).json({
            success: false,
            code: 'FORBIDDEN',
            error: 'Akses ditolak: Berkas bukti transfer ini bukan milik akun anggota Anda.',
          });
        }
      }
    }

    if (!hasServiceRoleKey) {
      return res.status(401).json({
        success: false,
        code: 'MISSING_SERVICE_KEY',
        error:
          'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server sehingga backend tidak dapat menerbitkan Signed URL.',
      });
    }

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        error: 'Autentikasi diperlukan untuk mengakses bukti transfer.',
      });
    }

    const ttl = Math.max(60, Math.min(86400, Number(expiresIn) || 3600));
    const bucketsToTry = Array.from(
      new Set([parsed.bucket, 'bukti_transfer', 'bukti-transfer'])
    );

    // 1. Coba path persis di seluruh bucket kandidat
    for (const b of bucketsToTry) {
      const { data, error } = await supabaseAdmin.storage
        .from(b)
        .createSignedUrl(parsed.objectPath, ttl);
      if (!error && data?.signedUrl) {
        return res.json({
          success: true,
          signedUrl: data.signedUrl,
          bucket: b,
          path: parsed.objectPath,
          expiresIn: ttl,
        });
      }
    }

    // 2. Fallback cerdas: cari file pada folder yang sama / folder berdasarkan nomor transaksi (case-insensitive)
    const slashIdx = parsed.objectPath.lastIndexOf('/');
    const targetFolder = slashIdx >= 0 ? parsed.objectPath.slice(0, slashIdx) : '';
    const targetFileLower = (
      slashIdx >= 0 ? parsed.objectPath.slice(slashIdx + 1) : parsed.objectPath
    ).toLowerCase();
    const cleanTrxNo = String(transactionNo || '').trim().toLowerCase().replace(/[-_.]\d+$/, '');

    for (const b of bucketsToTry) {
      const { data: listed } = await supabaseAdmin.storage.from(b).list(targetFolder, { limit: 200 });
      if (Array.isArray(listed) && listed.length > 0) {
        const matched = listed.find((f) => {
          const nameLower = String(f.name || '').toLowerCase();
          return (
            nameLower === targetFileLower ||
            (cleanTrxNo.length >= 6 && nameLower.includes(cleanTrxNo))
          );
        });
        if (matched?.name) {
          const fullMatchedPath = targetFolder ? `${targetFolder}/${matched.name}` : matched.name;
          const { data: signedData } = await supabaseAdmin.storage
            .from(b)
            .createSignedUrl(fullMatchedPath, ttl);
          if (signedData?.signedUrl) {
            return res.json({
              success: true,
              signedUrl: signedData.signedUrl,
              bucket: b,
              path: fullMatchedPath,
              expiresIn: ttl,
            });
          }
        }
      }
    }

    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      error: `Berkas bukti "${parsed.objectPath}" tidak ditemukan di bucket Supabase Storage (${bucketsToTry.join(' / ')}).`,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      code: 'SERVER_ERROR',
      error: err?.message || 'Gagal membuat Signed URL.',
    });
  }
}

export async function handleMemberEnsureAuthRequest(req: any, res: any) {
  if (req.method && req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { client: supabaseAdmin, hasServiceRoleKey } = getSupabaseAdminClient();
    if (!supabaseAdmin || !hasServiceRoleKey) {
      return res.json({ success: false, skipped: true });
    }

    const body = parseJsonBody(req);
    const { username, password } = body;
    const cleanUser = String(username || '').trim();
    const cleanPass = String(password || '').trim();
    if (!cleanUser || !cleanPass) {
      return res.status(400).json({ success: false, error: 'Username dan password wajib diisi.' });
    }

    const { data: verifyData, error: verifyErr } = await supabaseAdmin.rpc(
      'verify_member_login',
      {
        p_username: cleanUser,
        p_password: cleanPass,
      }
    );

    if (verifyErr || !verifyData?.success || !verifyData?.member) {
      return res.status(401).json({ success: false, error: 'Kredensial anggota tidak valid.' });
    }

    const m = verifyData.member;
    const memberNo = String(m.member_no || m.id || cleanUser).trim();
    const memberEmail = `${memberNo.toLowerCase()}@anggota.kopsim.id`;

    let existingUser: any = null;
    for (let page = 1; page <= 5; page++) {
      const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      const usersArr: any[] = Array.isArray((existingList as any)?.users)
        ? (existingList as any).users
        : [];
      existingUser = usersArr.find(
        (u: any) => String(u?.email || '').toLowerCase() === memberEmail
      );
      if (existingUser || usersArr.length < 1000) break;
    }

    if (!existingUser) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: memberEmail,
        password: cleanPass,
        email_confirm: true,
        user_metadata: {
          role: 'ANGGOTA',
          member_no: memberNo,
          member_id: m.id,
          full_name: m.full_name,
        },
        app_metadata: {
          role: 'ANGGOTA',
          member_no: memberNo,
        },
      });
      if (createErr) {
        return res.json({ success: false, error: createErr.message });
      }
      if (created?.user?.id) {
        await supabaseAdmin.from('profiles').upsert({
          id: created.user.id,
          full_name: m.full_name,
          role: 'ANGGOTA',
          member_id: memberNo,
          username: m.username || memberNo,
        });
      }
    } else {
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: cleanPass,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          role: 'ANGGOTA',
          member_no: memberNo,
          member_id: m.id,
          full_name: m.full_name,
        },
        app_metadata: {
          ...(existingUser.app_metadata || {}),
          role: 'ANGGOTA',
          member_no: memberNo,
        },
      });
      await supabaseAdmin.from('profiles').upsert({
        id: existingUser.id,
        full_name: m.full_name,
        role: 'ANGGOTA',
        member_id: memberNo,
        username: m.username || memberNo,
      });
    }

    return res.json({ success: true, email: memberEmail, memberNo });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Auth sync error' });
  }
}
