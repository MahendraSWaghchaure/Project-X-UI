// F1: lightweight "Partner" lead-capture concept - platform-admin only, always status COMING_SOON for now.
export type PartnerType = 'INSURANCE_COMPANY' | 'LEGAL_ADVISOR' | 'RTO_AGENT';
export type PartnerStatus = 'COMING_SOON';

export interface Partner {
  id: number;
  type: PartnerType;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  status: PartnerStatus;
  createdAt: string;
}

export interface PartnerRequest {
  type: PartnerType;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export const PARTNER_TYPES: PartnerType[] = ['INSURANCE_COMPANY', 'LEGAL_ADVISOR', 'RTO_AGENT'];
