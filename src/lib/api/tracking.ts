import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';
import type { CachedLocation, SosEvent } from '@/types/tracking';

export function getVehicleLocation(schoolId: number, vehicleId: number): Promise<CachedLocation> {
  return apiClient
    .get<ApiResponse<CachedLocation>>(`/schools/${schoolId}/vehicles/${vehicleId}/location`)
    .then(unwrap);
}

export function getMyChildVehicleLocation(childId: number): Promise<CachedLocation> {
  return apiClient
    .get<ApiResponse<CachedLocation>>(`/parents/me/children/${childId}/vehicle-location`)
    .then(unwrap);
}

export function triggerSos(tripId: number, note?: string): Promise<SosEvent> {
  return apiClient.post<ApiResponse<SosEvent>>(`/trips/${tripId}/sos`, note ? { note } : {}).then(unwrap);
}

export function resolveSos(sosEventId: number): Promise<SosEvent> {
  return apiClient.post<ApiResponse<SosEvent>>(`/sos/${sosEventId}/resolve`, {}).then(unwrap);
}

export function listActiveSos(schoolId: number): Promise<SosEvent[]> {
  return apiClient.get<ApiResponse<SosEvent[]>>(`/schools/${schoolId}/sos/active`).then(unwrap);
}
