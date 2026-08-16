export type TripDirection = 'MORNING_PICKUP' | 'AFTERNOON_DROP';
export type TripStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';

export interface Trip {
  id: number;
  schoolId: number;
  routeId: number;
  vehicleId: number;
  driverId: number;
  direction: TripDirection;
  tripDate: string;
  status: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
}

export type ChildTripEventType =
  | 'BOARDED'
  | 'DROPPED_AT_SCHOOL'
  | 'PICKED_FROM_SCHOOL'
  | 'DROPPED_AT_HOME'
  | 'ABSENT';

export interface ChildTripEvent {
  id: number;
  tripId: number;
  childId: number;
  eventType: ChildTripEventType;
  confirmedByUserId: number;
  occurredAt: string;
}

export interface TripManifestEntry {
  childId: number;
  firstName: string;
  lastName: string;
  absentToday: boolean;
}

// Matches backend/module-tracking/.../cache/CachedLocation.java - what both the REST fallback and
// the /topic/vehicles/{id}/location STOMP messages carry.
export interface CachedLocation {
  vehicleId: number;
  tripId: number | null;
  latitude: number;
  longitude: number;
  speedKmh: number | null;
  headingDegrees: number | null;
  recordedAt: string;
}

// Matches backend/module-tracking/.../dto/SosEventResponse.java - also what the
// /topic/trips/{id}/sos STOMP messages carry.
export interface SosEvent {
  id: number;
  tripId: number;
  vehicleId: number;
  schoolId: number;
  routeId: number;
  triggeredByUserId: number;
  note: string | null;
  triggeredAt: string;
  resolvedAt: string | null;
  resolved: boolean;
}

export type SafetyEventType = 'OVERSPEED' | 'HARSH_BRAKING';

export interface SafetyEvent {
  id: number;
  tripId: number;
  vehicleId: number;
  type: SafetyEventType;
  speedKmh: number | null;
  occurredAt: string;
}
