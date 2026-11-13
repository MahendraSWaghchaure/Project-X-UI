import type { Grievance } from './grievance';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface School {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string | null;
  pincode: string | null;
  districtId: number | null;
  contactPhone: string | null;
  contactEmail: string | null;
  location: GeoPoint | null;
  geofenceRadiusMeters: number;
  dismissalTime: string | null; // "HH:mm:ss"
  status: SchoolStatus;
  /** Why the school was suspended (required by the backend when suspending). */
  statusReason?: string | null;
  statusChangedAt?: string | null;
}

export type SchoolStatus = 'ACTIVE' | 'SUSPENDED';

export interface SchoolStatusCounts {
  all: number;
  active: number;
  suspended: number;
}

export type DriverVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

/** B1: one driver row on the platform-admin school-detail page. */
export interface SchoolOverviewDriver {
  driverId: number;
  name: string;
  phone: string | null;
  verificationStatus: DriverVerificationStatus;
  vehicleRegistrationNumber: string | null;
}

/** B1: GET /platform-admin/schools/{id}/overview - everything the school-detail page needs in one call. */
export interface SchoolOverview {
  school: School;
  drivers: SchoolOverviewDriver[];
  vehicleCount: number;
  studentCount: number;
  subscribedCount: number;
  openGrievances: number;
  /** Newest 5, additive beyond the plan's literal shape. */
  recentGrievances: Grievance[];
}

export type VehicleType = 'VAN' | 'BUS';
export type VehicleStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'RETIRED';

export interface Vehicle {
  id: number;
  schoolId: number;
  registrationNumber: string;
  type: VehicleType;
  seatCapacity: number;
  gpsDeviceId: string | null;
  insurancePolicyId: number | null;
  status: VehicleStatus;
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerAddress?: string | null;
  ownershipType?: OwnershipType | null;
  assignedDriverId?: number | null;
  driverName?: string | null;
  routeName?: string | null;
  /** Children assigned to this vehicle via its routes. */
  studentCount?: number;
}

export type OwnershipType = 'SCHOOL' | 'PRIVATE';

export interface RouteStop {
  id: number;
  sequenceNumber: number;
  label: string;
  location: GeoPoint;
  radiusMeters: number;
  /** Planned arrival, "HH:mm:ss". */
  scheduledTime?: string | null;
}

export interface Route {
  id: number;
  schoolId: number;
  name: string;
  vehicleId: number | null;
  driverId: number | null;
  active: boolean;
  zoneMinRadiusMeters: number | null;
  zoneMaxRadiusMeters: number | null;
  stops: RouteStop[];
  vehicleRegistrationNumber?: string | null;
  stopCount?: number;
  status?: 'ACTIVE' | 'INACTIVE';
}
