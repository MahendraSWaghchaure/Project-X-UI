import type { GeoPoint } from './school';

export type DriverEmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
export type DriverVerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface Driver {
  id: number;
  schoolId: number | null;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string | null;
  insurancePolicyId: number | null;
  baseSalaryMonthly: string | null;
  vehicleId: number | null;
  employmentStatus: DriverEmploymentStatus;
  verificationStatus: DriverVerificationStatus;
  verifiedAt: string | null;
}

/** What a parent is allowed to see about the driver assigned to their child's vehicle. */
export interface ChildDriver {
  driverId: number;
  firstName: string;
  lastName: string;
  phone: string;
  verificationStatus: DriverVerificationStatus;
  verifiedAt: string | null;
}

export interface Parent {
  id: number;
  invitedBySchoolId: number;
  email: string | null;
  accountStatus: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  homeLocation: GeoPoint | null;
}

export type ChildStatus = 'ACTIVE' | 'INACTIVE';

export interface Child {
  id: number;
  schoolId: number;
  primaryParentId: number;
  secondaryParentId: number | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  classSection: string | null;
  routeId: number | null;
  routeStopId: number | null;
  insurancePolicyId: number | null;
  bloodType: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  allergies: string | null;
  status: ChildStatus;
}
