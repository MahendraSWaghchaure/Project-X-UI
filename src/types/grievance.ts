import type { Role } from './auth';

/** Legacy coarse category (still returned and accepted by the server). New code uses `GrievanceType`. */
export type GrievanceCategory = 'SAFETY' | 'VEHICLE_CONDITION' | 'DRIVER_CONDUCT' | 'PAYMENT' | 'DELAY' | 'OTHER';
export type GrievanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export type GrievanceType =
  | 'VEHICLE_CONDITION'
  | 'DRIVER_BEHAVIOR'
  | 'ROUTE_DELAY'
  | 'SAFETY_CONCERN'
  | 'PAYMENT_ISSUE'
  | 'STUDENT_PARENT_BEHAVIOR'
  | 'SCHOOL_COORDINATION'
  | 'OTHER';

/** Types a driver may raise (the server validates the allowed set per submitter role). */
export const DRIVER_GRIEVANCE_TYPES: GrievanceType[] = [
  'VEHICLE_CONDITION',
  'ROUTE_DELAY',
  'SAFETY_CONCERN',
  'PAYMENT_ISSUE',
  'STUDENT_PARENT_BEHAVIOR',
  'SCHOOL_COORDINATION',
  'OTHER',
];

/** Types a parent may raise. */
export const PARENT_GRIEVANCE_TYPES: GrievanceType[] = [
  'VEHICLE_CONDITION',
  'DRIVER_BEHAVIOR',
  'ROUTE_DELAY',
  'SAFETY_CONCERN',
  'PAYMENT_ISSUE',
  'SCHOOL_COORDINATION',
  'OTHER',
];

export interface GrievanceTimelineEntry {
  status: GrievanceStatus;
  note: string | null;
  actorUserId: number | null;
  at: string;
}

export interface Grievance {
  id: number;
  schoolId: number | null;
  raisedByUserId: number;
  raisedByRole: Role;
  raisedByEmail: string;
  category: GrievanceCategory;
  subject: string;
  description: string;
  status: GrievanceStatus;
  resolutionNote: string | null;
  resolvedByUserId: number | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  type?: GrievanceType | null;
  otherDescription?: string | null;
  vehicleId?: number | null;
  driverId?: number | null;
  childId?: number | null;
  tripId?: number | null;
  complainantName?: string | null;
  driverName?: string | null;
  vehicleNo?: string | null;
  childName?: string | null;
  schoolName?: string | null;
  /** Whole days from creation to resolution (or to now while still open). */
  daysOpen?: number;
  /** Only filled by the detail endpoint. */
  timeline?: GrievanceTimelineEntry[];
}

/** Profile card behind the "complainant" link on the grievances table. */
export interface UserProfileSummary {
  userId?: number;
  role: Role;
  name: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
  schoolName?: string | null;
  children?: { id: number; name: string; schoolName?: string | null; className?: string | null }[];
  /** Present when the user is a driver. */
  driver?: {
    licenseNumber?: string | null;
    licenseExpiry?: string | null;
    vehicleNo?: string | null;
    employmentStatus?: string | null;
  } | null;
}
