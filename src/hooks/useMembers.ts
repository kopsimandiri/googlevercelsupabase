import { useState, useEffect, useCallback } from 'react';
import { memberService } from '../services/memberService';
import { MemberRecord, RegistrationPayload } from '../types/database';

export function useMembers() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await memberService.getMembers();
      setMembers(list);
    } catch (err: any) {
      setError(err?.message || 'Gagal memuat data anggota');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveMember = async (memberData: Partial<MemberRecord>, extraPayload: any = {}) => {
    const res = await memberService.saveMember(memberData, extraPayload);
    await fetchAll();
    return res;
  };

  const deleteMember = async (id: string) => {
    const res = await memberService.deleteMember(id);
    await fetchAll();
    return res;
  };

  const registerNewMember = async (payload: RegistrationPayload) => {
    const res = await memberService.registerNewMember(payload);
    await fetchAll();
    return res;
  };

  return {
    members,
    isLoading,
    error,
    refresh: fetchAll,
    saveMember,
    deleteMember,
    registerNewMember,
  };
}
