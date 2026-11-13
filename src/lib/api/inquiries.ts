import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse, PageResponse } from '@/types/api';

export interface InquiryRequest {
  name: string;
  /** Phone number or email address the team should reply to. */
  contact: string;
  message: string;
}

/** Public (unauthenticated, rate-limited) contact form - POST /public/inquiries. Resolves once the inquiry is stored. */
export function submitInquiry(request: InquiryRequest): Promise<void> {
  return apiClient.post<ApiResponse<unknown>>('/public/inquiries', request).then(() => undefined);
}

export type InquiryStatus = 'NEW' | 'HANDLED';

export interface Inquiry {
  id: number;
  name: string;
  contact: string;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  handledAt: string | null;
}

export function listInquiries(params: { status?: InquiryStatus; page?: number; size?: number }): Promise<PageResponse<Inquiry>> {
  return apiClient.get<ApiResponse<PageResponse<Inquiry>>>('/platform-admin/inquiries', { params }).then(unwrap);
}

export function updateInquiryStatus(inquiryId: number, status: InquiryStatus): Promise<Inquiry> {
  return apiClient.patch<ApiResponse<Inquiry>>(`/platform-admin/inquiries/${inquiryId}/status`, { status }).then(unwrap);
}
