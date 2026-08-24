import React from 'react';
import { MemberRecord } from '../../types/database';
import { KTACard } from '../kta/KTACard';
import { renderCanonicalKTACard, KTAMemberData } from '../kta/ktaRenderer';

export interface IdCardModalProps {
  member: MemberRecord;
  onClose: () => void;
  onAvatarUpdated?: (newAvatarUrl: string) => void;
}

/**
 * Adapter function for batch KTA rendering in MembershipModule
 * Uses canonical 3:2 master ratio and exact PDF design authority
 */
export const renderMemberCardToCanvas = async (
  canvas: HTMLCanvasElement,
  member: MemberRecord,
  _templateImg?: HTMLImageElement | null,
  logoImg?: HTMLImageElement | null
): Promise<string> => {
  const ktaData: KTAMemberData = {
    member_no: member.id || (member as any).member_no || '',
    full_name: member.nama || (member as any).full_name || 'Anggota Koperasi',
    status: member.status || 'ANGGOTA',
    work_area: member.plantation || (member as any).work_area || member.area_jenis || 'KOPERASI PUSAT',
    registered_at: member.tgl_reg || (member as any).registered_at || new Date().toISOString().split('T')[0],
    avatar_url: member.avatar_url,
  };

  return await renderCanonicalKTACard(canvas, ktaData, {
    logoImage: logoImg,
  });
};

/**
 * Canonical KTA Modal
 */
export const IdCardModal: React.FC<IdCardModalProps> = ({ member, onClose }) => {
  return (
    <KTACard
      member={member}
      memberNo={member.id || (member as any).member_no}
      onClose={onClose}
    />
  );
};
