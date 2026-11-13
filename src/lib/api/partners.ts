import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse, PageResponse } from '@/types/api';
import type { Partner, PartnerRequest, PartnerType } from '@/types/partner';

export function listPartners(params: { type?: PartnerType; page?: number; size?: number } = {}): Promise<PageResponse<Partner>> {
  return apiClient.get<ApiResponse<PageResponse<Partner>>>('/platform-admin/partners', { params }).then(unwrap);
}

export function createPartner(request: PartnerRequest): Promise<Partner> {
  return apiClient.post<ApiResponse<Partner>>('/platform-admin/partners', request).then(unwrap);
}
