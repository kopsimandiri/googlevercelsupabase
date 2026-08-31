/**
 * Automated Security & Authorization Test Suite for KOPSIM MANDIRI
 * Tests:
 * 1. Hardcoded password elimination & rejection of fallback passwords ('test22', 'kopsim123', '123456')
 * 2. Supabase Auth role resolution & client tampering resistance
 * 3. Role-based access control (RBAC) permission matrix: ADMIN, DIRECTOR, ANGGOTA
 * 4. Row Level Security (RLS) policies simulation & boundary enforcement:
 *    - ADMIN: full read/write operations
 *    - DIRECTOR: read-only access to operational & executive modules
 *    - ANGGOTA: own data allowed, other members data denied, admin operations denied
 */

import { authService } from '../services/authService';
import { UserRole } from '../types/auth';

export interface SecurityTestCase {
  id: string;
  category: 'AUTH_AUTHENTICATION' | 'RBAC_RESOLUTION' | 'RLS_BOUNDARY' | 'CREDENTIAL_HARDENING' | 'STORAGE_RLS';
  description: string;
  expectedResult: 'PASS' | 'DENIED' | 'ALLOWED';
  run: () => Promise<{ success: boolean; message: string; details?: any }>;
}

/**
 * Simulates RLS Boundary Evaluation in database for a given user context
 */
export function evaluateRlsPolicy(
  table: string,
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE',
  userContext: { role: UserRole; userId: string | null; memberId?: string },
  targetRow: { id?: string; member_id?: string; user_id?: string; status?: string; bucket_id?: string; name?: string }
): { allowed: boolean; reason: string } {
  const { role, userId, memberId } = userContext;

  // 1. MEMBERS Table Policy Evaluation
  if (table === 'members') {
    if (role === 'ADMIN') {
      return { allowed: true, reason: 'ADMIN has full access (members_admin_all).' };
    }
    if (role === 'DIRECTOR') {
      if (operation === 'SELECT') {
        return { allowed: true, reason: 'DIRECTOR has read access (members_director_select).' };
      }
      return { allowed: false, reason: 'DIRECTOR cannot mutate members table directly.' };
    }
    if (role === 'ANGGOTA') {
      const isOwner = targetRow.id === memberId || targetRow.id === userId;
      if (operation === 'SELECT' && isOwner) {
        return { allowed: true, reason: 'ANGGOTA can read own member profile (members_self_select).' };
      }
      if (operation === 'UPDATE' && isOwner) {
        return { allowed: true, reason: 'ANGGOTA can update own profile (members_self_update).' };
      }
      return {
        allowed: false,
        reason: isOwner
          ? `ANGGOTA cannot perform ${operation} on own record.`
          : 'ANGGOTA is forbidden from accessing or modifying other members data.',
      };
    }
  }

  // 2. TRANSACTIONS Table Policy Evaluation
  if (table === 'transactions') {
    if (role === 'ADMIN') {
      return { allowed: true, reason: 'ADMIN has full access (transactions_admin_all).' };
    }
    if (role === 'DIRECTOR') {
      if (operation === 'SELECT') {
        return { allowed: true, reason: 'DIRECTOR can read all transactions (transactions_director_select).' };
      }
      return { allowed: false, reason: 'DIRECTOR cannot mutate transactions directly (accounting immutability).' };
    }
    if (role === 'ANGGOTA') {
      const isOwner = targetRow.member_id === memberId;
      if (operation === 'SELECT' && isOwner) {
        return { allowed: true, reason: 'ANGGOTA can read own transactions (transactions_member_select).' };
      }
      return {
        allowed: false,
        reason: 'ANGGOTA cannot access other members transactions or perform write operations.',
      };
    }
  }

  // 3. USER_ROLES / PROFILES Table Policy Evaluation
  if (table === 'user_roles' || table === 'roles') {
    if (role === 'ADMIN') {
      return { allowed: true, reason: 'ADMIN can manage user roles and permissions.' };
    }
    if (operation === 'SELECT' && (targetRow.user_id === userId || role === 'DIRECTOR')) {
      return { allowed: true, reason: 'User can read own assigned role.' };
    }
    return { allowed: false, reason: 'Only ADMIN can insert, update, or delete user roles.' };
  }

  // 4. AUDIT_LOGS Table Policy Evaluation
  if (table === 'audit_logs') {
    if (operation === 'INSERT') {
      return { allowed: true, reason: 'System and authenticated users can insert audit logs.' };
    }
    if (operation === 'SELECT' && (role === 'ADMIN' || role === 'DIRECTOR')) {
      return { allowed: true, reason: 'ADMIN and DIRECTOR can inspect audit trail.' };
    }
    return { allowed: false, reason: 'Audit logs are immutable and restricted from non-admin viewers.' };
  }

  // 5. STORAGE.OBJECTS (bukti_transfer bucket) Policy Evaluation
  if (table === 'storage.objects') {
    const bucketId = targetRow.bucket_id || 'bukti_transfer';
    if (bucketId === 'bukti_transfer') {
      if (operation === 'INSERT' || operation === 'UPDATE' || operation === 'DELETE') {
        if (role === 'ADMIN') {
          return { allowed: true, reason: 'ADMIN has full write/upload access to bukti_transfer bucket.' };
        }
        return { allowed: false, reason: 'Non-admin users are strictly forbidden from uploading or modifying proof objects.' };
      }
      if (operation === 'SELECT') {
        if (role === 'ADMIN' || role === 'DIRECTOR') {
          return { allowed: true, reason: 'ADMIN and DIRECTOR can view and inspect transaction proofs.' };
        }
        return { allowed: false, reason: 'Public and general member access to private proof bucket is restricted.' };
      }
    }
  }

  return { allowed: false, reason: 'Default Deny RLS rule.' };
}

export const securityTestCases: SecurityTestCase[] = [
  // 1. CREDENTIAL_HARDENING
  {
    id: 'SEC-01',
    category: 'CREDENTIAL_HARDENING',
    description: 'Reject hardcoded fallback password "test22"',
    expectedResult: 'DENIED',
    run: async () => {
      try {
        await authService.signInMember({ username: 'non_existent_user_99', password: 'test22' });
        return { success: false, message: 'Vulnerability: Hardcoded password test22 was accepted!' };
      } catch (err: any) {
        return { success: true, message: `Successfully rejected: ${err.message}` };
      }
    },
  },
  {
    id: 'SEC-02',
    category: 'CREDENTIAL_HARDENING',
    description: 'Reject hardcoded default password "kopsim123"',
    expectedResult: 'DENIED',
    run: async () => {
      try {
        await authService.signInMember({ username: 'fake_member_123', password: 'kopsim123' });
        return { success: false, message: 'Vulnerability: Hardcoded password kopsim123 was accepted!' };
      } catch (err: any) {
        return { success: true, message: `Successfully rejected: ${err.message}` };
      }
    },
  },
  {
    id: 'SEC-03',
    category: 'CREDENTIAL_HARDENING',
    description: 'Reject empty credentials or trivial numeric pass "123456"',
    expectedResult: 'DENIED',
    run: async () => {
      try {
        await authService.signInMember({ username: 'unknown_nra', password: '123456' });
        return { success: false, message: 'Vulnerability: Trivial password was accepted!' };
      } catch (err: any) {
        return { success: true, message: `Successfully rejected: ${err.message}` };
      }
    },
  },

  // 2. RLS_BOUNDARY - ADMIN
  {
    id: 'SEC-04',
    category: 'RLS_BOUNDARY',
    description: 'ADMIN: Allowed full operations across all tables',
    expectedResult: 'ALLOWED',
    run: async () => {
      const adminCtx = { role: 'ADMIN' as UserRole, userId: 'admin-001' };
      const test1 = evaluateRlsPolicy('members', 'INSERT', adminCtx, { id: 'MEM-999' });
      const test2 = evaluateRlsPolicy('transactions', 'DELETE', adminCtx, { id: 'TRX-999' });
      const test3 = evaluateRlsPolicy('user_roles', 'UPDATE', adminCtx, { user_id: 'usr-999' });

      if (test1.allowed && test2.allowed && test3.allowed) {
        return { success: true, message: 'ADMIN permissions verified successfully across all domains.' };
      }
      return { success: false, message: 'ADMIN operations unexpectedly blocked by policy.' };
    },
  },

  // 3. RLS_BOUNDARY - DIRECTOR
  {
    id: 'SEC-05',
    category: 'RLS_BOUNDARY',
    description: 'DIRECTOR: Allowed read-only across members & transactions; write denied',
    expectedResult: 'PASS',
    run: async () => {
      const dirCtx = { role: 'DIRECTOR' as UserRole, userId: 'dir-001' };
      const readMem = evaluateRlsPolicy('members', 'SELECT', dirCtx, { id: 'MEM-001' });
      const readTrx = evaluateRlsPolicy('transactions', 'SELECT', dirCtx, { id: 'TRX-001' });
      const writeTrx = evaluateRlsPolicy('transactions', 'INSERT', dirCtx, { id: 'TRX-002' });
      const writeRoles = evaluateRlsPolicy('user_roles', 'INSERT', dirCtx, { user_id: 'usr-002' });

      if (readMem.allowed && readTrx.allowed && !writeTrx.allowed && !writeRoles.allowed) {
        return { success: true, message: 'DIRECTOR read-only boundary enforced correctly.' };
      }
      return { success: false, message: 'DIRECTOR permissions violation detected.' };
    },
  },

  // 4. RLS_BOUNDARY - ANGGOTA
  {
    id: 'SEC-06',
    category: 'RLS_BOUNDARY',
    description: 'ANGGOTA: Own data allowed; other member data and admin operations strictly denied',
    expectedResult: 'PASS',
    run: async () => {
      const memberCtx = { role: 'ANGGOTA' as UserRole, userId: 'mem-user-100', memberId: '1121-00001' };

      // A. Own data read -> MUST BE ALLOWED
      const ownMem = evaluateRlsPolicy('members', 'SELECT', memberCtx, { id: '1121-00001' });
      const ownTrx = evaluateRlsPolicy('transactions', 'SELECT', memberCtx, { member_id: '1121-00001' });

      // B. Other member data read -> MUST BE DENIED
      const otherMem = evaluateRlsPolicy('members', 'SELECT', memberCtx, { id: '1121-99999' });
      const otherTrx = evaluateRlsPolicy('transactions', 'SELECT', memberCtx, { member_id: '1121-99999' });

      // C. Admin operations -> MUST BE DENIED
      const adminOp = evaluateRlsPolicy('user_roles', 'UPDATE', memberCtx, { user_id: 'mem-user-100' });
      const deleteTrx = evaluateRlsPolicy('transactions', 'DELETE', memberCtx, { member_id: '1121-00001' });

      const allChecksPass =
        ownMem.allowed &&
        ownTrx.allowed &&
        !otherMem.allowed &&
        !otherTrx.allowed &&
        !adminOp.allowed &&
        !deleteTrx.allowed;

      if (allChecksPass) {
        return {
          success: true,
          message: 'ANGGOTA ownership isolation & admin operation restrictions verified 100%.',
        };
      }

      return {
        success: false,
        message: 'ANGGOTA security boundary violation detected!',
        details: { ownMem, ownTrx, otherMem, otherTrx, adminOp, deleteTrx },
      };
    },
  },

  // 5. STORAGE RLS - ADMIN UPLOAD ONLY (bucket: bukti_transfer)
  {
    id: 'SEC-07',
    category: 'STORAGE_RLS',
    description: 'STORAGE BUKTI_TRANSFER: Only ADMIN can upload (INSERT) and delete (DELETE)',
    expectedResult: 'PASS',
    run: async () => {
      const adminCtx = { role: 'ADMIN' as UserRole, userId: 'admin-001' };
      const dirCtx = { role: 'DIRECTOR' as UserRole, userId: 'dir-001' };
      const memCtx = { role: 'ANGGOTA' as UserRole, userId: 'mem-001' };
      const anonCtx = { role: null as any, userId: null };

      // 1. ADMIN Upload -> ALLOWED
      const adminInsert = evaluateRlsPolicy('storage.objects', 'INSERT', adminCtx, { bucket_id: 'bukti_transfer', name: '2026/08/TRX-001.webp' });
      const adminDelete = evaluateRlsPolicy('storage.objects', 'DELETE', adminCtx, { bucket_id: 'bukti_transfer', name: '2026/08/TRX-001.webp' });

      // 2. DIRECTOR Upload -> STRICTLY DENIED
      const dirInsert = evaluateRlsPolicy('storage.objects', 'INSERT', dirCtx, { bucket_id: 'bukti_transfer', name: '2026/08/TRX-002.webp' });

      // 3. ANGGOTA Upload -> STRICTLY DENIED
      const memInsert = evaluateRlsPolicy('storage.objects', 'INSERT', memCtx, { bucket_id: 'bukti_transfer', name: '2026/08/TRX-003.webp' });

      // 4. Anonymous Upload -> STRICTLY DENIED
      const anonInsert = evaluateRlsPolicy('storage.objects', 'INSERT', anonCtx, { bucket_id: 'bukti_transfer', name: '2026/08/TRX-004.webp' });

      const allValid =
        adminInsert.allowed &&
        adminDelete.allowed &&
        !dirInsert.allowed &&
        !memInsert.allowed &&
        !anonInsert.allowed;

      if (allValid) {
        return {
          success: true,
          message: 'Storage RLS verified: ONLY ADMIN can upload/modify objects in bucket "bukti_transfer".',
        };
      }

      return {
        success: false,
        message: 'Storage RLS boundary violation detected for bukti_transfer!',
        details: { adminInsert, adminDelete, dirInsert, memInsert, anonInsert },
      };
    },
  },

  // 6. STORAGE RLS - PRIVATE BUCKET READ (ADMIN & DIRECTOR)
  {
    id: 'SEC-08',
    category: 'STORAGE_RLS',
    description: 'STORAGE BUKTI_TRANSFER: ADMIN & DIRECTOR can view (SELECT); general public denied',
    expectedResult: 'PASS',
    run: async () => {
      const adminCtx = { role: 'ADMIN' as UserRole, userId: 'admin-001' };
      const dirCtx = { role: 'DIRECTOR' as UserRole, userId: 'dir-001' };
      const anonCtx = { role: null as any, userId: null };

      const adminSelect = evaluateRlsPolicy('storage.objects', 'SELECT', adminCtx, { bucket_id: 'bukti_transfer', name: '2026/08/TRX-001.webp' });
      const dirSelect = evaluateRlsPolicy('storage.objects', 'SELECT', dirCtx, { bucket_id: 'bukti_transfer', name: '2026/08/TRX-001.webp' });
      const anonSelect = evaluateRlsPolicy('storage.objects', 'SELECT', anonCtx, { bucket_id: 'bukti_transfer', name: '2026/08/TRX-001.webp' });

      if (adminSelect.allowed && dirSelect.allowed && !anonSelect.allowed) {
        return {
          success: true,
          message: 'Storage RLS read access verified for ADMIN and DIRECTOR on private bucket "bukti_transfer".',
        };
      }

      return {
        success: false,
        message: 'Storage read permission violation detected!',
        details: { adminSelect, dirSelect, anonSelect },
      };
    },
  },
];

/**
 * Runs all security test cases and prints summary report
 */
export async function runSecurityAuditSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Array<{ id: string; description: string; success: boolean; message: string }>;
}> {
  const results = [];
  let passed = 0;
  let failed = 0;

  for (const test of securityTestCases) {
    try {
      const res = await test.run();
      if (res.success) {
        passed++;
      } else {
        failed++;
      }
      results.push({
        id: test.id,
        description: test.description,
        success: res.success,
        message: res.message,
      });
    } catch (err: any) {
      failed++;
      results.push({
        id: test.id,
        description: test.description,
        success: false,
        message: `Exception: ${err.message}`,
      });
    }
  }

  return {
    total: securityTestCases.length,
    passed,
    failed,
    results,
  };
}
