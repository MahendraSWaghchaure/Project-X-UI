import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse, PageResponse } from '@/types/api';
import type { Child, ChildDriver } from '@/types/people';
import type { ChildTripEvent } from '@/types/tracking';

export interface CreateChildRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  classSection?: string;
  primaryParentId?: number;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
}

/**
 * Paginated - a large school can have hundreds of children. `size` defaults to the backend's own
 * default (50) when omitted; pass a large size (e.g. 1000) for call sites that just need a full
 * roster for a dropdown/count rather than a paged list, until those get real pagination controls.
 */
export function listChildrenForSchool(schoolId: number, page = 0, size?: number): Promise<PageResponse<Child>> {
  return apiClient
    .get<ApiResponse<PageResponse<Child>>>(`/schools/${schoolId}/children`, { params: { page, size } })
    .then(unwrap);
}

export function listChildrenForRoute(schoolId: number, routeId: number): Promise<Child[]> {
  return apiClient.get<ApiResponse<Child[]>>(`/schools/${schoolId}/routes/${routeId}/children`).then(unwrap);
}

export function createChildAsSchoolAdmin(schoolId: number, request: CreateChildRequest): Promise<Child> {
  return apiClient.post<ApiResponse<Child>>(`/schools/${schoolId}/children`, request).then(unwrap);
}

export function listMyChildren(): Promise<Child[]> {
  return apiClient.get<ApiResponse<Child[]>>('/parents/me/children').then(unwrap);
}

export function createChildAsParent(request: CreateChildRequest): Promise<Child> {
  return apiClient.post<ApiResponse<Child>>('/parents/me/children', request).then(unwrap);
}

export function getMyChildDriver(childId: number): Promise<ChildDriver> {
  return apiClient.get<ApiResponse<ChildDriver>>(`/parents/me/children/${childId}/driver`).then(unwrap);
}

export function setChildAbsence(childId: number, date: string): Promise<void> {
  return apiClient.put<ApiResponse<void>>(`/parents/me/children/${childId}/absence`, { date }).then(unwrap);
}

export function clearChildAbsence(childId: number, date: string): Promise<void> {
  return apiClient
    .delete<ApiResponse<void>>(`/parents/me/children/${childId}/absence`, { params: { date } })
    .then(unwrap);
}

export function getAttendanceHistory(childId: number, from: string, to: string): Promise<ChildTripEvent[]> {
  return apiClient
    .get<ApiResponse<ChildTripEvent[]>>(`/parents/me/children/${childId}/attendance`, { params: { from, to } })
    .then(unwrap);
}

export function getMyChildQrToken(childId: number): Promise<string> {
  return apiClient.get<ApiResponse<string>>(`/parents/me/children/${childId}/qr-token`).then(unwrap);
}

export function inviteSecondGuardian(childId: number, email: string, phone?: string) {
  return apiClient
    .post<ApiResponse<{ parentProfileId: number; email: string; inviteToken: string }>>(
      `/parents/me/children/${childId}/invite-guardian`,
      { email, phone },
    )
    .then(unwrap);
}

export function assignChildRouteStop(
  schoolId: number,
  childId: number,
  routeId: number,
  routeStopId: number,
): Promise<Child> {
  return apiClient
    .put<ApiResponse<Child>>(`/schools/${schoolId}/children/${childId}/route-stop`, { routeId, routeStopId })
    .then(unwrap);
}

export interface UpdateChildRequest {
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  classSection?: string;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies?: string;
}

export function updateChildAsSchoolAdmin(schoolId: number, childId: number, request: UpdateChildRequest): Promise<Child> {
  return apiClient.patch<ApiResponse<Child>>(`/schools/${schoolId}/children/${childId}`, request).then(unwrap);
}

export function deactivateChild(schoolId: number, childId: number): Promise<void> {
  return apiClient.delete<ApiResponse<void>>(`/schools/${schoolId}/children/${childId}`).then(unwrap);
}

export function updateChildAsParent(childId: number, request: UpdateChildRequest): Promise<Child> {
  return apiClient.patch<ApiResponse<Child>>(`/parents/me/children/${childId}`, request).then(unwrap);
}

/** Zone-based auto-allocation: picks the route/stop nearest the child's home among routes whose radius band covers it. */
export function autoAssignRoute(schoolId: number, childId: number): Promise<Child> {
  return apiClient.post<ApiResponse<Child>>(`/schools/${schoolId}/children/${childId}/auto-assign-route`, {}).then(unwrap);
}
