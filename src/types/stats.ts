export interface PlatformDashboardStats {
  schoolsTotal: number;
  schoolsActive: number;
  schoolsSuspended: number;
  independentDriversUnclaimed: number;
  openGrievances: number;
  pendingWaivers: number;
}

export interface SchoolDashboardStats {
  vehiclesTotal: number;
  vehiclesActive: number;
  driversTotal: number;
  driversVerified: number;
  independentDriversAvailable: number;
  routesTotal: number;
  studentsTotal: number;
  tripsToday: number;
  tripsInProgress: number;
  tripsDelayed: number;
  openGrievances: number;
  revenueThisMonth: number;
  payrollPending: number;
  payrollFailed: number;
}
