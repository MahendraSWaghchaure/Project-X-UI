import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';
import type { Country, District, Region, State } from '@/types/geo';

export function listCountries(): Promise<Country[]> {
  return apiClient.get<ApiResponse<Country[]>>('/geo/countries').then(unwrap);
}

export function listStates(countryId: number): Promise<State[]> {
  return apiClient.get<ApiResponse<State[]>>('/geo/states', { params: { countryId } }).then(unwrap);
}

export function listRegions(stateId: number): Promise<Region[]> {
  return apiClient.get<ApiResponse<Region[]>>('/geo/regions', { params: { stateId } }).then(unwrap);
}

export function listDistricts(params: { stateId?: number; regionId?: number }): Promise<District[]> {
  return apiClient.get<ApiResponse<District[]>>('/geo/districts', { params }).then(unwrap);
}

export function searchDistricts(query: string): Promise<District[]> {
  return apiClient.get<ApiResponse<District[]>>('/geo/districts/search', { params: { q: query } }).then(unwrap);
}

export function getDistrict(districtId: number): Promise<District> {
  return apiClient.get<ApiResponse<District>>(`/geo/districts/${districtId}`).then(unwrap);
}
