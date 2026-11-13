import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
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
const SchoolDetailPage = lazy(() =>
  import('@/features/platform-admin/SchoolDetailPage').then((m) => ({ default: m.SchoolDetailPage })),
);
const PartnersPage = lazy(() => import('@/features/platform-admin/PartnersPage').then((m) => ({ default: m.PartnersPage })));
const PlatformAdminGrievancesPage = lazy(() =>
  import('@/features/platform-admin/GrievancesPage').then((m) => ({ default: m.PlatformAdminGrievancesPage })),
);
const PlatformAdminPaymentsPage = lazy(() =>
  import('@/features/platform-admin/PaymentsPage').then((m) => ({ default: m.PlatformAdminPaymentsPage })),
);

const InquiriesPage = lazy(() => import('@/features/platform-admin/InquiriesPage').then((m) => ({ default: m.InquiriesPage })));
const ComplainantPage = lazy(() => import('@/features/grievances/ComplainantPage').then((m) => ({ default: m.ComplainantPage })));
const ConsentPage = lazy(() => import('@/features/public/ConsentPage').then((m) => ({ default: m.ConsentPage })));

const TeacherDashboardPage = lazy(() => import('@/features/teacher/TeacherPages').then((m) => ({ default: m.TeacherDashboardPage })));
const MyClassPage = lazy(() => import('@/features/teacher/TeacherPages').then((m) => ({ default: m.MyClassPage })));
const MyPeriodsPage = lazy(() => import('@/features/teacher/TeacherPages').then((m) => ({ default: m.MyPeriodsPage })));
const ExamsPage = lazy(() => import('@/features/teacher/TeacherPages').then((m) => ({ default: m.ExamsPage })));
const TeacherAlertsPage = lazy(() => import('@/features/teacher/TeacherPages').then((m) => ({ default: m.AlertsPage })));

const LeadsPage = lazy(() => import('@/features/platform-admin/LeadsPage').then((m) => ({ default: m.LeadsPage })));

// School attendance screens - shared by SCHOOL_ADMIN, TEACHER and PLATFORM_ADMIN (one route group below).
const ClassroomsPage = lazy(() => import('@/features/school/ClassroomsPage').then((m) => ({ default: m.ClassroomsPage })));
const ClassroomDetailPage = lazy(() =>
  import('@/features/school/ClassroomsPage').then((m) => ({ default: m.ClassroomDetailPage })),
);
const StudentDetailPage = lazy(() =>
  import('@/features/school/StudentDetailPage').then((m) => ({ default: m.StudentDetailPage })),
);
const ArrivalsPage = lazy(() => import('@/features/school/ArrivalsPage').then((m) => ({ default: m.ArrivalsPage })));

const TeachersPage = lazy(() => import('@/features/school/TeachersPage').then((m) => ({ default: m.TeachersPage })));
const CorrectionRequestsPage = lazy(() =>
  import('@/features/school/CorrectionRequestsPage').then((m) => ({ default: m.CorrectionRequestsPage })),
);
const TimetableAdminPage = lazy(() =>
  import('@/features/school/TimetableAdminPage').then((m) => ({ default: m.TimetableAdminPage })),
);
const StudentsDirectoryPage = lazy(() =>
  import('@/features/school/StudentsDirectoryPage').then((m) => ({ default: m.StudentsDirectoryPage })),
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
          <Route path="/consent/:token" element={<ConsentPage />} />

          {/* Parent completes their profile right after accepting an invite, before the normal shell/nav applies */}
          <Route element={<ProtectedRoute allowedRoles={['PARENT']} />}>
            <Route path="/parent/complete-profile" element={<CompleteProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['PLATFORM_ADMIN']} />}>
            <Route element={<AppShell />}>
              <Route path="/platform-admin/dashboard" element={<PlatformAdminDashboardPage />} />
              <Route path="/platform-admin/schools" element={<SchoolsPage />} />
              <Route path="/platform-admin/schools/:id" element={<SchoolDetailPage />} />
              <Route path="/platform-admin/partners" element={<PartnersPage />} />
              <Route path="/platform-admin/grievances" element={<PlatformAdminGrievancesPage />} />
              <Route path="/platform-admin/payments" element={<PlatformAdminPaymentsPage />} />
              <Route path="/platform-admin/leads" element={<LeadsPage />} />
              <Route path="/platform-admin/inquiries" element={<InquiriesPage />} />
              <Route path="/platform-admin/users/:userId" element={<ComplainantPage backTo="/platform-admin/grievances" />} />
            </Route>
          </Route>

          {/* Student detail is shared by the school admin and teachers (the server limits what a teacher may see). */}
          <Route element={<ProtectedRoute allowedRoles={['SCHOOL_ADMIN', 'TEACHER', 'PLATFORM_ADMIN']} />}>
            <Route element={<AppShell />}>
              <Route path="/school/students/:id" element={<StudentDetailPage />} />
            </Route>
          </Route>

          {/* Old standalone screens now live inside the classrooms hub. */}
          <Route path="/school/classrooms" element={<Navigate to="/school-admin/classrooms" replace />} />
          <Route path="/school/students" element={<Navigate to="/school-admin/classrooms" replace />} />
          <Route path="/school/attendance" element={<Navigate to="/school-admin/classrooms" replace />} />
          <Route path="/school-admin/insurance" element={<Navigate to="/school-admin/dashboard" replace />} />
          <Route path="/school-admin/payments" element={<Navigate to="/school-admin/dashboard" replace />} />

          {/* C4 fix (phase 3): PLATFORM_ADMIN was previously included here with no school context - useAuthStore().schoolId
              is null for a platform admin (not scoped to any one school), so every query guarded by `schoolId != null`
              never ran and these pages were a silent, permanent dead end for that role (e.g. Classrooms always showed
              "No classrooms yet", and "Add class" would have posted to `/schools/null/classrooms`). No PLATFORM_ADMIN nav
              item ever linked here (see navConfig.ts), so nothing depended on this access - it was reachable only by typing
              the URL. Platform admin now gets its own purpose-built `/platform-admin/schools/:id` overview page (B1) instead
              of this school-scoped shell. */}
          <Route element={<ProtectedRoute allowedRoles={['SCHOOL_ADMIN']} />}>
            <Route element={<AppShell />}>
              <Route path="/school-admin/dashboard" element={<SchoolAdminDashboardPage />} />
              <Route path="/school-admin/classrooms" element={<ClassroomsPage />} />
              <Route path="/school-admin/classrooms/:id" element={<ClassroomDetailPage />} />
              <Route path="/school/arrivals" element={<ArrivalsPage />} />
              <Route path="/school-admin/teachers" element={<TeachersPage />} />
              <Route path="/school-admin/users/:userId" element={<ComplainantPage backTo="/school-admin/grievances" />} />
              <Route path="/school-admin/vehicles" element={<VehiclesPage />} />
              <Route path="/school-admin/drivers" element={<DriversPage />} />
              <Route path="/school-admin/routes" element={<SchoolAdminRoutesPage />} />
              <Route path="/school-admin/children" element={<SchoolAdminChildrenPage />} />
              <Route path="/school-admin/students/directory" element={<StudentsDirectoryPage />} />
              <Route path="/school-admin/trips" element={<TripsPage />} />
              <Route path="/school-admin/grievances" element={<SchoolAdminGrievancesPage />} />
              <Route path="/school-admin/attendance/corrections" element={<CorrectionRequestsPage />} />
              <Route path="/school-admin/timetable" element={<TimetableAdminPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['TEACHER']} />}>
            <Route element={<AppShell />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
              <Route path="/teacher/class" element={<MyClassPage />} />
              <Route path="/teacher/periods" element={<MyPeriodsPage />} />
              <Route path="/teacher/exams" element={<ExamsPage />} />
              <Route path="/teacher/alerts" element={<TeacherAlertsPage />} />
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
