import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';
import type { PageResponse } from '@/types/api';
import type { School, SchoolOverview, SchoolStatus, SchoolStatusCounts } from '@/types/school';

export interface CreateSchoolRequest {
  name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  districtId?: number;
  contactPhone?: string;
  contactEmail?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
  dismissalTime?: string; // "HH:mm:ss"
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;
}

export function listSchools(districtIds?: number[]): Promise<School[]> {
  return apiClient
    .get<ApiResponse<School[]>>('/schools', { params: districtIds?.length ? { districtIds } : undefined })
    .then(unwrap);
}

export function getSchool(schoolId: number): Promise<School> {
  return apiClient.get<ApiResponse<School>>(`/schools/${schoolId}`).then(unwrap);
}

export function createSchool(request: CreateSchoolRequest): Promise<School> {
  return apiClient.post<ApiResponse<School>>('/schools', request).then(unwrap);
}

export interface UpdateSchoolRequest {
  name: string;
  address: string;
  city: string;
  state?: string;
  pincode?: string;
  contactPhone?: string;
  contactEmail?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadiusMeters?: number;
  dismissalTime?: string;
}

export function updateSchool(schoolId: number, request: UpdateSchoolRequest): Promise<School> {
  return apiClient.patch<ApiResponse<School>>(`/schools/${schoolId}`, request).then(unwrap);
}

/** `reason` is required by the server when suspending (shown on the schools list); ignored when re-activating. */
export function setSchoolStatus(schoolId: number, status: SchoolStatus, reason?: string): Promise<School> {
  return apiClient.patch<ApiResponse<School>>(`/schools/${schoolId}/status`, { status, reason }).then(unwrap);
}

export interface PlatformSchoolsParams {
  status?: SchoolStatus;
  q?: string;
  districtIds?: number[];
  page?: number;
  size?: number;
}

/** Platform-admin schools list with the All | Active | Suspended tab filter applied server-side. */
export function listPlatformSchools(params: PlatformSchoolsParams): Promise<PageResponse<School>> {
  return apiClient
    .get<ApiResponse<PageResponse<School>>>('/platform-admin/schools', {
      params: { ...params, districtIds: params.districtIds?.length ? params.districtIds : undefined },
    })
    .then(unwrap);
}

export function getSchoolStatusCounts(): Promise<SchoolStatusCounts> {
  return apiClient.get<ApiResponse<SchoolStatusCounts>>('/platform-admin/schools/status-counts').then(unwrap);
}

/** B1: everything the platform-admin school-detail page needs in one call. */
export function getSchoolOverview(schoolId: number): Promise<SchoolOverview> {
  return apiClient.get<ApiResponse<SchoolOverview>>(`/platform-admin/schools/${schoolId}/overview`).then(unwrap);
}
