import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse, PageResponse } from '@/types/api';
import type {
  Grievance,
  GrievanceCategory,
  GrievanceStatus,
  GrievanceType,
  UserProfileSummary,
} from '@/types/grievance';

export interface CreateGrievanceRequest {
  schoolId?: number;
  /** Legacy; prefer `type`. */
  category?: GrievanceCategory;
  type?: GrievanceType;
  /** Required when type is OTHER. */
  otherDescription?: string;
  vehicleId?: number;
  driverId?: number;
  childId?: number;
  tripId?: number;
  subject?: string;
  description: string;
}

export function raiseGrievance(request: CreateGrievanceRequest): Promise<Grievance> {
  return apiClient.post<ApiResponse<Grievance>>('/grievances', request).then(unwrap);
}

export function listMyGrievances(): Promise<Grievance[]> {
  return apiClient.get<ApiResponse<Grievance[]>>('/grievances/mine').then(unwrap);
}

export function listGrievancesForSchool(schoolId: number): Promise<Grievance[]> {
  return apiClient.get<ApiResponse<Grievance[]>>(`/schools/${schoolId}/grievances`).then(unwrap);
}

export function listAllGrievances(): Promise<Grievance[]> {
  return apiClient.get<ApiResponse<Grievance[]>>('/grievances').then(unwrap);
}

export interface GrievanceSearchParams {
  status?: GrievanceStatus;
  type?: GrievanceType;
  page?: number;
  size?: number;
}

/** Platform admin: every school (optionally one), paged + filtered server-side. */
export function searchAllGrievances(params: GrievanceSearchParams & { schoolId?: number }): Promise<PageResponse<Grievance>> {
  return apiClient.get<ApiResponse<PageResponse<Grievance>>>('/platform-admin/grievances', { params }).then(unwrap);
}

/** School admin (or platform admin): one school, paged + filtered server-side. */
export function searchSchoolGrievances(schoolId: number, params: GrievanceSearchParams): Promise<PageResponse<Grievance>> {
  return apiClient
    .get<ApiResponse<PageResponse<Grievance>>>(`/schools/${schoolId}/grievances/search`, { params })
    .then(unwrap);
}

/** Full record including the status timeline. */
export function getGrievance(grievanceId: number): Promise<Grievance> {
  return apiClient.get<ApiResponse<Grievance>>(`/grievances/${grievanceId}`).then(unwrap);
}

export function updateGrievanceStatus(
  grievanceId: number,
  status: GrievanceStatus,
  resolutionNote?: string,
): Promise<Grievance> {
  return apiClient
    .patch<ApiResponse<Grievance>>(`/grievances/${grievanceId}/status`, { status, resolutionNote })
    .then(unwrap);
}

/** Complainant detail: parent profile + their children, or driver profile. */
export function getUserProfileSummary(userId: number): Promise<UserProfileSummary> {
  return apiClient.get<ApiResponse<UserProfileSummary>>(`/platform-admin/users/${userId}/profile-summary`).then(unwrap);
}
