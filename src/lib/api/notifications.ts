import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse, PageResponse } from '@/types/api';

export interface NotificationRecord {
  id: number;
  channel: 'SMS' | 'EMAIL' | 'PUSH';
  templateKey: string;
  status: 'SENT' | 'SKIPPED_NOT_CONFIGURED' | 'FAILED';
  createdAt: string;
}

export function listMyNotifications(page = 0, size?: number): Promise<PageResponse<NotificationRecord>> {
  return apiClient
    .get<ApiResponse<PageResponse<NotificationRecord>>>('/notifications/me', { params: { page, size } })
    .then(unwrap);
}
