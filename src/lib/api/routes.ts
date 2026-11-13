import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';
import type { Route } from '@/types/school';

export interface RouteStopRequest {
  sequenceNumber: number;
  label: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  /** On update only: id of an existing stop to keep (children stay attached); absent = new stop. */
  id?: number;
  /** Planned arrival, "HH:mm" or "HH:mm:ss". */
  scheduledTime?: string;
}

export interface CreateRouteRequest {
  name: string;
  stops: RouteStopRequest[];
  zoneMinRadiusMeters?: number;
  zoneMaxRadiusMeters?: number;
}

export function listRoutes(schoolId: number): Promise<Route[]> {
  return apiClient.get<ApiResponse<Route[]>>(`/schools/${schoolId}/routes`).then(unwrap);
}

export function createRoute(schoolId: number, request: CreateRouteRequest): Promise<Route> {
  return apiClient.post<ApiResponse<Route>>(`/schools/${schoolId}/routes`, request).then(unwrap);
}

export function assignRoute(schoolId: number, routeId: number, vehicleId: number, driverId: number): Promise<Route> {
  return apiClient
    .put<ApiResponse<Route>>(`/schools/${schoolId}/routes/${routeId}/assignment`, { vehicleId, driverId })
    .then(unwrap);
}

export function updateRouteZone(
  schoolId: number,
  routeId: number,
  zoneMinRadiusMeters: number,
  zoneMaxRadiusMeters: number,
): Promise<Route> {
  return apiClient
    .put<ApiResponse<Route>>(`/schools/${schoolId}/routes/${routeId}/zone`, { zoneMinRadiusMeters, zoneMaxRadiusMeters })
    .then(unwrap);
}

export interface UpdateRouteRequest extends CreateRouteRequest {
  active?: boolean;
}

/** Full replace of the route's name, zone and ordered stop list. */
export function updateRoute(schoolId: number, routeId: number, request: UpdateRouteRequest): Promise<Route> {
  return apiClient.put<ApiResponse<Route>>(`/schools/${schoolId}/routes/${routeId}`, request).then(unwrap);
}
