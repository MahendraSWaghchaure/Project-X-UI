import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api';
import type { OwnershipType, Vehicle, VehicleStatus, VehicleType } from '@/types/school';

export interface CreateVehicleRequest {
  registrationNumber: string;
  type: VehicleType;
  seatCapacity: number;
  gpsDeviceId?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  ownershipType?: OwnershipType;
  /** Allocates one of the school's drivers to this vehicle in the same call. */
  assignedDriverId?: number;
}

export function listVehicles(schoolId: number): Promise<Vehicle[]> {
  return apiClient.get<ApiResponse<Vehicle[]>>(`/schools/${schoolId}/vehicles`).then(unwrap);
}

export function createVehicle(schoolId: number, request: CreateVehicleRequest): Promise<Vehicle> {
  return apiClient.post<ApiResponse<Vehicle>>(`/schools/${schoolId}/vehicles`, request).then(unwrap);
}

export function updateVehicleStatus(schoolId: number, vehicleId: number, status: VehicleStatus): Promise<Vehicle> {
  return apiClient
    .patch<ApiResponse<Vehicle>>(`/schools/${schoolId}/vehicles/${vehicleId}/status`, { status })
    .then(unwrap);
}

export interface UpdateVehicleRequest {
  registrationNumber: string;
  type: VehicleType;
  seatCapacity: number;
  gpsDeviceId?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerAddress?: string;
  ownershipType?: OwnershipType;
  /** Omit to leave the allocation unchanged; use assignVehicleDriver(null) to unassign. */
  assignedDriverId?: number;
}

export function updateVehicle(schoolId: number, vehicleId: number, request: UpdateVehicleRequest): Promise<Vehicle> {
  return apiClient.patch<ApiResponse<Vehicle>>(`/schools/${schoolId}/vehicles/${vehicleId}`, request).then(unwrap);
}

export function retireVehicle(schoolId: number, vehicleId: number): Promise<void> {
  return apiClient.delete<ApiResponse<void>>(`/schools/${schoolId}/vehicles/${vehicleId}`).then(unwrap);
}

/** `driverId` null unassigns whichever driver currently holds the vehicle. */
export function assignVehicleDriver(schoolId: number, vehicleId: number, driverId: number | null): Promise<Vehicle> {
  return apiClient.put<ApiResponse<Vehicle>>(`/schools/${schoolId}/vehicles/${vehicleId}/driver`, { driverId }).then(unwrap);
}
