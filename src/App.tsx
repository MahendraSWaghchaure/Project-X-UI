import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ScrollToTop } from '@/components/layout/ScrollToTop';
import { Toaster } from '@/components/ui/Toaster';

import { HomePage } from '@/features/public/HomePage';
import { LoginPage } from '@/features/auth/LoginPage';
import { NotFoundPage } from '@/features/public/NotFoundPage';

// Everything below is code-split per role, so e.g. a parent's first load never downloads
// platform-admin/school-admin/driver code - only Home/Login/NotFound (the routes every visitor's
// first paint can hit) stay in the main bundle. See PageLoading's fallback below.
const AboutPage = lazy(() => import('@/features/public/AboutPage').then((m) => ({ default: m.AboutPage })));
const VisionPage = lazy(() => import('@/features/public/VisionPage').then((m) => ({ default: m.VisionPage })));
const BenefitsPage = lazy(() => import('@/features/public/BenefitsPage').then((m) => ({ default: m.BenefitsPage })));
const UnauthorizedPage = lazy(() =>
  import('@/features/public/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })),
);
const DriverRegisterPage = lazy(() =>
  import('@/features/public/DriverRegisterPage').then((m) => ({ default: m.DriverRegisterPage })),
);
const AcceptInvitePage = lazy(() =>
  import('@/features/auth/AcceptInvitePage').then((m) => ({ default: m.AcceptInvitePage })),
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);

const PlatformAdminDashboardPage = lazy(() =>
  import('@/features/platform-admin/DashboardPage').then((m) => ({ default: m.PlatformAdminDashboardPage })),
);
const SchoolsPage = lazy(() => import('@/features/platform-admin/SchoolsPage').then((m) => ({ default: m.SchoolsPage })));
const PlatformAdminGrievancesPage = lazy(() =>
  import('@/features/platform-admin/GrievancesPage').then((m) => ({ default: m.PlatformAdminGrievancesPage })),
);
const PlatformAdminPaymentsPage = lazy(() =>
  import('@/features/platform-admin/PaymentsPage').then((m) => ({ default: m.PlatformAdminPaymentsPage })),
);

const SchoolAdminDashboardPage = lazy(() =>
  import('@/features/school-admin/DashboardPage').then((m) => ({ default: m.SchoolAdminDashboardPage })),
);
const VehiclesPage = lazy(() => import('@/features/school-admin/VehiclesPage').then((m) => ({ default: m.VehiclesPage })));
const DriversPage = lazy(() => import('@/features/school-admin/DriversPage').then((m) => ({ default: m.DriversPage })));
const SchoolAdminRoutesPage = lazy(() =>
  import('@/features/school-admin/RoutesPage').then((m) => ({ default: m.RoutesPage })),
);
const SchoolAdminChildrenPage = lazy(() =>
  import('@/features/school-admin/ChildrenPage').then((m) => ({ default: m.ChildrenPage })),
);
const TripsPage = lazy(() => import('@/features/school-admin/TripsPage').then((m) => ({ default: m.TripsPage })));
const SchoolAdminGrievancesPage = lazy(() =>
  import('@/features/school-admin/GrievancesPage').then((m) => ({ default: m.GrievancesPage })),
);
const SchoolAdminPaymentsPage = lazy(() =>
  import('@/features/school-admin/PaymentsPage').then((m) => ({ default: m.PaymentsPage })),
);
const SchoolAdminInsurancePage = lazy(() =>
  import('@/features/school-admin/InsurancePage').then((m) => ({ default: m.InsurancePage })),
);

const DriverDashboardPage = lazy(() =>
  import('@/features/driver/DashboardPage').then((m) => ({ default: m.DriverDashboardPage })),
);
const DriverTripsPage = lazy(() => import('@/features/driver/DriverTripsPage').then((m) => ({ default: m.DriverTripsPage })));
const DriverGrievancesPage = lazy(() =>
  import('@/features/driver/GrievancesPage').then((m) => ({ default: m.DriverGrievancesPage })),
);
const DriverPayrollPage = lazy(() => import('@/features/driver/PayrollPage').then((m) => ({ default: m.DriverPayrollPage })));

const ParentDashboardPage = lazy(() =>
  import('@/features/parent/DashboardPage').then((m) => ({ default: m.ParentDashboardPage })),
);
const TrackBusPage = lazy(() => import('@/features/parent/TrackBusPage').then((m) => ({ default: m.TrackBusPage })));
const ParentChildrenPage = lazy(() =>
  import('@/features/parent/ChildrenPage').then((m) => ({ default: m.ParentChildrenPage })),
);
const NotificationsPage = lazy(() =>
  import('@/features/parent/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const CompleteProfilePage = lazy(() =>
  import('@/features/parent/CompleteProfilePage').then((m) => ({ default: m.CompleteProfilePage })),
);
const ParentProfilePage = lazy(() => import('@/features/parent/ProfilePage').then((m) => ({ default: m.ParentProfilePage })));
const ParentGrievancesPage = lazy(() =>
  import('@/features/parent/GrievancesPage').then((m) => ({ default: m.ParentGrievancesPage })),
);
const ParentPaymentsPage = lazy(() =>
  import('@/features/parent/PaymentsPage').then((m) => ({ default: m.ParentPaymentsPage })),
);

function PageLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/vision" element={<VisionPage />} />
          <Route path="/benefits" element={<BenefitsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
          <Route path="/driver/register" element={<DriverRegisterPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Parent completes their profile right after accepting an invite, before the normal shell/nav applies */}
          <Route element={<ProtectedRoute allowedRoles={['PARENT']} />}>
            <Route path="/parent/complete-profile" element={<CompleteProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['PLATFORM_ADMIN']} />}>
            <Route element={<AppShell />}>
              <Route path="/platform-admin/dashboard" element={<PlatformAdminDashboardPage />} />
              <Route path="/platform-admin/schools" element={<SchoolsPage />} />
              <Route path="/platform-admin/grievances" element={<PlatformAdminGrievancesPage />} />
              <Route path="/platform-admin/payments" element={<PlatformAdminPaymentsPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['SCHOOL_ADMIN', 'PLATFORM_ADMIN']} />}>
            <Route element={<AppShell />}>
              <Route path="/school-admin/dashboard" element={<SchoolAdminDashboardPage />} />
              <Route path="/school-admin/vehicles" element={<VehiclesPage />} />
              <Route path="/school-admin/drivers" element={<DriversPage />} />
              <Route path="/school-admin/routes" element={<SchoolAdminRoutesPage />} />
              <Route path="/school-admin/children" element={<SchoolAdminChildrenPage />} />
              <Route path="/school-admin/trips" element={<TripsPage />} />
              <Route path="/school-admin/grievances" element={<SchoolAdminGrievancesPage />} />
              <Route path="/school-admin/payments" element={<SchoolAdminPaymentsPage />} />
              <Route path="/school-admin/insurance" element={<SchoolAdminInsurancePage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['DRIVER']} />}>
            <Route element={<AppShell />}>
              <Route path="/driver/dashboard" element={<DriverDashboardPage />} />
              <Route path="/driver/trips" element={<DriverTripsPage />} />
              <Route path="/driver/grievances" element={<DriverGrievancesPage />} />
              <Route path="/driver/payroll" element={<DriverPayrollPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['PARENT']} />}>
            <Route element={<AppShell />}>
              <Route path="/parent/dashboard" element={<ParentDashboardPage />} />
              <Route path="/parent/track" element={<TrackBusPage />} />
              <Route path="/parent/children" element={<ParentChildrenPage />} />
              <Route path="/parent/notifications" element={<NotificationsPage />} />
              <Route path="/parent/profile" element={<ParentProfilePage />} />
              <Route path="/parent/grievances" element={<ParentGrievancesPage />} />
              <Route path="/parent/payments" element={<ParentPaymentsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      <Toaster />
    </>
  );
}
