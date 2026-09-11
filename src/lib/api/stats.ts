import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';
import type { PlatformDashboardStats, SchoolDashboardStats } from '@/types/stats';

export function getPlatformDashboardStats(): Promise<PlatformDashboardStats> {
  return apiClient.get<ApiResponse<PlatformDashboardStats>>('/platform-admin/dashboard-stats').then(unwrap);
}

export function getSchoolDashboardStats(schoolId: number): Promise<SchoolDashboardStats> {
  return apiClient.get<ApiResponse<SchoolDashboardStats>>(`/schools/${schoolId}/dashboard-stats`).then(unwrap);
}
