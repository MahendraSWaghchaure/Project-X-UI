import { apiClient, unwrap } from '@/lib/apiClient';
import type { ApiResponse, PageResponse } from '@/types/api';
import type {
  Arrival,
  ArrivalOutcome,
  AttendanceRow,
  AttendanceSummary,
  Assessment,
  BulkAttendanceRequest,
  BulkAttendanceResult,
  CorrectionDecisionRequest,
  CorrectionRequest,
  CorrectionStatus,
  CreateCorrectionRequest,
  GenerateTimetableRequest,
  GenerateTimetableResult,
  Teacher,
  TeacherInvite,
  InviteTeacherRequest,
  UpdateTeacherRequest,
  Classroom,
  ClassroomSummary,
  ConsentLinkResponse,
  ConsentView,
  CreatePeriodRequest,
  DaySchedule,
  TeacherAlert,
  TeacherClassroom,
  TimetablePeriod,
  CreateAssessmentRequest,
  CreateClassroomRequest,
  ImportStudentsResult,
  Lead,
  RespondToArrivalRequest,
  Student,
  StudentComment,
  StudentDirectoryRow,
  StudentInput,
  StudentListParams,
  StudentSearchResult,
} from '@/types/attendance';

// --- Classrooms ---
export function listClassrooms(schoolId: number): Promise<Classroom[]> {
  return apiClient.get<ApiResponse<Classroom[]>>(`/schools/${schoolId}/classrooms`).then(unwrap);
}

export function createClassroom(schoolId: number, request: CreateClassroomRequest): Promise<Classroom> {
  return apiClient.post<ApiResponse<Classroom>>(`/schools/${schoolId}/classrooms`, request).then(unwrap);
}

/** Classrooms hub: one row per class with class teacher, total students and the day's present/absent counts. */
export function listClassroomSummary(schoolId: number, date: string): Promise<ClassroomSummary[]> {
  return apiClient
    .get<ApiResponse<ClassroomSummary[]>>(`/schools/${schoolId}/classrooms/summary`, { params: { date } })
    .then(unwrap);
}

/** `teacherId` null clears the class teacher. A teacher can be class teacher of at most one class (409 otherwise). */
export function assignClassTeacher(schoolId: number, classroomId: number, teacherId: number | null): Promise<Classroom> {
  return apiClient
    .put<ApiResponse<Classroom>>(`/schools/${schoolId}/classrooms/${classroomId}/class-teacher`, { teacherId })
    .then(unwrap);
}

// --- Students ---
export function listStudents(schoolId: number, params: StudentListParams): Promise<PageResponse<Student>> {
  return apiClient.get<ApiResponse<PageResponse<Student>>>(`/schools/${schoolId}/students`, { params }).then(unwrap);
}

/** C2: cross-class "Students & Guardians" directory - school-admin only. */
export function listStudentsDirectory(
  schoolId: number,
  params: { classroomId?: number; q?: string; page?: number; size?: number },
): Promise<PageResponse<StudentDirectoryRow>> {
  return apiClient
    .get<ApiResponse<PageResponse<StudentDirectoryRow>>>(`/schools/${schoolId}/students/directory`, { params })
    .then(unwrap);
}

/** E4: parent's "pick the other student" grievance dialog - scoped to a school their own child attends, minimal fields only. */
export function searchStudentsForParent(schoolId: number, q: string): Promise<StudentSearchResult[]> {
  return apiClient.get<ApiResponse<StudentSearchResult[]>>(`/schools/${schoolId}/students/search`, { params: { q } }).then(unwrap);
}

export function getStudent(schoolId: number, studentId: number): Promise<Student> {
  return apiClient.get<ApiResponse<Student>>(`/schools/${schoolId}/students/${studentId}`).then(unwrap);
}

export function createStudent(schoolId: number, request: StudentInput): Promise<Student> {
  return apiClient.post<ApiResponse<Student>>(`/schools/${schoolId}/students`, request).then(unwrap);
}

export function updateStudent(schoolId: number, studentId: number, request: StudentInput): Promise<Student> {
  return apiClient.put<ApiResponse<Student>>(`/schools/${schoolId}/students/${studentId}`, request).then(unwrap);
}

/** Up to 500 rows per call, all-or-nothing. Body `{ rows: [...] }` (the backend also accepts a bare array or `{ students }`). */
export function importStudents(schoolId: number, students: StudentInput[]): Promise<ImportStudentsResult> {
  return apiClient
    .post<ApiResponse<ImportStudentsResult>>(`/schools/${schoolId}/students/import`, { rows: students })
    .then(unwrap);
}

export function linkStudentToChild(schoolId: number, studentId: number, childId: number): Promise<Student> {
  return apiClient
    .post<ApiResponse<Student>>(`/schools/${schoolId}/students/${studentId}/link-child`, { childId })
    .then(unwrap);
}

export function unlinkStudentFromChild(schoolId: number, studentId: number): Promise<Student> {
  return apiClient.delete<ApiResponse<Student>>(`/schools/${schoolId}/students/${studentId}/link-child`).then(unwrap);
}

// --- Daily attendance ---
export function getAttendanceSheet(schoolId: number, date: string, classroomId: number): Promise<AttendanceRow[]> {
  return apiClient
    .get<ApiResponse<AttendanceRow[]>>(`/schools/${schoolId}/attendance`, { params: { date, classroomId } })
    .then(unwrap);
}

export function saveAttendanceBulk(schoolId: number, request: BulkAttendanceRequest): Promise<BulkAttendanceResult> {
  return apiClient.put<ApiResponse<BulkAttendanceResult>>(`/schools/${schoolId}/attendance/bulk`, request).then(unwrap);
}

export function getAttendanceSummary(schoolId: number, date: string): Promise<AttendanceSummary> {
  return apiClient
    .get<ApiResponse<AttendanceSummary>>(`/schools/${schoolId}/attendance/summary`, { params: { date } })
    .then(unwrap);
}

// --- C3 attendance correction requests ---
export function createCorrectionRequest(schoolId: number, request: CreateCorrectionRequest): Promise<CorrectionRequest> {
  return apiClient
    .post<ApiResponse<CorrectionRequest>>(`/schools/${schoolId}/attendance/correction-requests`, request)
    .then(unwrap);
}

export function listCorrectionRequests(
  schoolId: number,
  params: { status?: CorrectionStatus; page?: number; size?: number } = {},
): Promise<PageResponse<CorrectionRequest>> {
  return apiClient
    .get<ApiResponse<PageResponse<CorrectionRequest>>>(`/schools/${schoolId}/attendance/correction-requests`, { params })
    .then(unwrap);
}

export function decideCorrectionRequest(schoolId: number, id: number, request: CorrectionDecisionRequest): Promise<CorrectionRequest> {
  return apiClient
    .patch<ApiResponse<CorrectionRequest>>(`/schools/${schoolId}/attendance/correction-requests/${id}`, request)
    .then(unwrap);
}

// --- Arrivals ---
export function listSchoolArrivals(
  schoolId: number,
  params: { date: string; outcome?: ArrivalOutcome; page?: number; size?: number },
): Promise<PageResponse<Arrival>> {
  return apiClient
    .get<ApiResponse<PageResponse<Arrival>>>(`/schools/${schoolId}/arrivals`, { params })
    .then(unwrap);
}

export function listTripArrivals(tripId: number): Promise<Arrival[]> {
  return apiClient.get<ApiResponse<Arrival[]>>(`/trips/${tripId}/arrivals`).then(unwrap);
}

export function listMyPendingArrivals(): Promise<Arrival[]> {
  return apiClient.get<ApiResponse<Arrival[]>>('/parents/me/arrivals/pending').then(unwrap);
}

export function respondToArrival(arrivalId: number, request: RespondToArrivalRequest): Promise<Arrival> {
  return apiClient.post<ApiResponse<Arrival>>(`/parents/me/arrivals/${arrivalId}/respond`, request).then(unwrap);
}

// --- Academic records ---
export function listAssessments(schoolId: number, studentId: number): Promise<Assessment[]> {
  return apiClient.get<ApiResponse<Assessment[]>>(`/schools/${schoolId}/students/${studentId}/assessments`).then(unwrap);
}

export function createAssessment(
  schoolId: number,
  studentId: number,
  request: CreateAssessmentRequest,
): Promise<Assessment> {
  return apiClient
    .post<ApiResponse<Assessment>>(`/schools/${schoolId}/students/${studentId}/assessments`, request)
    .then(unwrap);
}

export function listComments(schoolId: number, studentId: number): Promise<StudentComment[]> {
  return apiClient.get<ApiResponse<StudentComment[]>>(`/schools/${schoolId}/students/${studentId}/comments`).then(unwrap);
}

export function createComment(schoolId: number, studentId: number, text: string): Promise<StudentComment> {
  return apiClient
    .post<ApiResponse<StudentComment>>(`/schools/${schoolId}/students/${studentId}/comments`, { text })
    .then(unwrap);
}

// --- Teachers (SCHOOL_ADMIN / PLATFORM_ADMIN) ---
export function listTeachers(schoolId: number): Promise<Teacher[]> {
  return apiClient.get<ApiResponse<Teacher[]>>(`/schools/${schoolId}/teachers`).then(unwrap);
}

export function inviteTeacher(schoolId: number, request: InviteTeacherRequest): Promise<TeacherInvite> {
  return apiClient.post<ApiResponse<TeacherInvite>>(`/schools/${schoolId}/teachers`, request).then(unwrap);
}

export function updateTeacher(schoolId: number, teacherId: number, request: UpdateTeacherRequest): Promise<Teacher> {
  return apiClient.patch<ApiResponse<Teacher>>(`/schools/${schoolId}/teachers/${teacherId}`, request).then(unwrap);
}

/** Re-issues the invitation of a teacher who has not accepted yet (INVITED or EXPIRED); the old link stops working. */
export function resendTeacherInvite(schoolId: number, teacherId: number): Promise<TeacherInvite> {
  return apiClient.post<ApiResponse<TeacherInvite>>(`/schools/${schoolId}/teachers/${teacherId}/resend-invite`, {}).then(unwrap);
}

// --- Timetable periods (admin) ---
export function listClassroomPeriods(schoolId: number, classroomId: number): Promise<TimetablePeriod[]> {
  return apiClient.get<ApiResponse<TimetablePeriod[]>>(`/schools/${schoolId}/classrooms/${classroomId}/periods`).then(unwrap);
}

export function addClassroomPeriod(schoolId: number, classroomId: number, request: CreatePeriodRequest): Promise<TimetablePeriod> {
  return apiClient.post<ApiResponse<TimetablePeriod>>(`/schools/${schoolId}/classrooms/${classroomId}/periods`, request).then(unwrap);
}

export function deletePeriod(schoolId: number, periodId: number): Promise<void> {
  return apiClient.delete<ApiResponse<void>>(`/schools/${schoolId}/periods/${periodId}`).then(unwrap);
}

export function listTeacherPeriods(schoolId: number, teacherId: number): Promise<TimetablePeriod[]> {
  return apiClient.get<ApiResponse<TimetablePeriod[]>>(`/schools/${schoolId}/teachers/${teacherId}/periods`).then(unwrap);
}

// --- C5 automatic timetable generator (admin) ---
/** Dry run - computes the proposed grid and any unfilled slots without writing anything. */
export function previewTimetable(schoolId: number, request: GenerateTimetableRequest): Promise<GenerateTimetableResult> {
  return apiClient
    .post<ApiResponse<GenerateTimetableResult>>(`/schools/${schoolId}/classrooms/timetable/preview`, request)
    .then(unwrap);
}

/** Writes TimetablePeriod rows for every targeted classroom + a report of any slot it could not fill. */
export function generateTimetable(schoolId: number, request: GenerateTimetableRequest): Promise<GenerateTimetableResult> {
  return apiClient
    .post<ApiResponse<GenerateTimetableResult>>(`/schools/${schoolId}/classrooms/timetable/generate`, request)
    .then(unwrap);
}

// --- Teacher portal (TEACHER) ---
export function listMyPeriods(): Promise<DaySchedule[]> {
  return apiClient.get<ApiResponse<DaySchedule[]>>('/teachers/me/periods').then(unwrap);
}

export function listMyClassrooms(): Promise<TeacherClassroom[]> {
  return apiClient.get<ApiResponse<TeacherClassroom[]>>('/teachers/me/classrooms').then(unwrap);
}

export function listMyAlerts(date?: string): Promise<TeacherAlert[]> {
  return apiClient.get<ApiResponse<TeacherAlert[]>>('/teachers/me/alerts', { params: date ? { date } : undefined }).then(unwrap);
}

// --- Guardian consent ---
/** Creates a 48-hour single-use token and SMSes the link to the guardian's phone. */
export function sendConsentLink(schoolId: number, studentId: number): Promise<ConsentLinkResponse> {
  return apiClient.post<ApiResponse<ConsentLinkResponse>>(`/schools/${schoolId}/students/${studentId}/consent-link`, {}).then(unwrap);
}

/** Public (no auth): who is asking, for the /consent/:token page. 410 when the link expired or was already used. */
export function getConsentRequest(token: string): Promise<ConsentView> {
  return apiClient.get<ApiResponse<ConsentView>>(`/public/consent/${encodeURIComponent(token)}`).then(unwrap);
}

export function respondToConsent(token: string, consent: boolean): Promise<{ consent: boolean }> {
  return apiClient
    .post<ApiResponse<{ consent: boolean }>>(`/public/consent/${encodeURIComponent(token)}/respond`, { consent })
    .then(unwrap);
}

// --- Platform admin ---
export function listLeads(params: { page?: number; size?: number }): Promise<PageResponse<Lead>> {
  return apiClient.get<ApiResponse<PageResponse<Lead>>>('/platform-admin/leads', { params }).then(unwrap);
}
