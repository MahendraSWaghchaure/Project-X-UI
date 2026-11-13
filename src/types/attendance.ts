// Mirrors section 3 of PLAN-school-attendance.md (backend module-attendance). camelCase JSON, wrapped in ApiResponse<T>.
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';
export type Subscription = 'SUBSCRIBED' | 'NON_SUBSCRIBED';
export type ConsentStatus = 'NOT_REQUESTED' | 'SENT' | 'EXPIRED' | 'GRANTED' | 'DECLINED';
export type ArrivalKind = 'HOME_PICKUP' | 'SCHOOL_DROP' | 'SCHOOL_PICKUP';
export type SchoolConfirm = 'PENDING' | 'PRESENT' | 'ABSENT';
export type ParentResponse = 'PENDING' | 'APPROVED' | 'DISPUTED';
export type ArrivalOutcome = 'PENDING' | 'SAFE' | 'ALERT';

export interface Classroom {
  id: number;
  schoolId?: number;
  name: string;
  section: string | null;
  classTeacherId?: number | null;
  classTeacherName?: string | null;
  studentCount?: number;
  version?: number | null;
}

export interface CreateClassroomRequest {
  name: string;
  section?: string;
  /** Optional: make this teacher the class teacher at creation (a teacher can be class teacher of one class only). */
  classTeacherId?: number;
}

/** One row of the classrooms hub: class, class teacher, total students and the selected day's attendance counts. */
export interface ClassroomSummary {
  id: number;
  name: string;
  section: string | null;
  classTeacherId: number | null;
  classTeacherName: string | null;
  totalStudents: number;
  present: number;
  absent: number;
  late?: number;
  unmarked?: number;
}

export interface Student {
  id: number;
  schoolId: number;
  classroomId: number | null;
  rollNo: string | null;
  firstName: string;
  lastName: string;
  dob?: string | null;
  gender?: string | null;
  /** Guardian contact fields are null when the viewer is only a lecturer of the class (server strips them). */
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail?: string | null;
  marketingConsent: boolean;
  leadSource: string | null;
  subscription: Subscription;
  childId?: number | null;
  /** Optimistic-lock token: send back on PUT (stale -> 409). */
  version?: number;
  consentStatus?: ConsentStatus | null;
  consentExpiresAt?: string | null;
  consentAt?: string | null;
  consentSource?: string | null;
}

/** Body of POST/PUT /schools/{sid}/students. The server owns id, schoolId, subscription, childId and (when omitted) leadSource. */
export interface StudentInput {
  classroomId?: number | null;
  rollNo?: string;
  firstName: string;
  lastName: string;
  dob?: string;
  gender?: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail?: string;
  marketingConsent: boolean;
  leadSource?: string;
  version?: number;
}

/** E4: minimal search result for a parent's "pick the other student" grievance dialog - name + class only, no PII. */
export interface StudentSearchResult {
  studentId: number;
  name: string;
  className: string | null;
  section: string | null;
}

/** One row of the C2 cross-class "Students & Guardians" directory (GET /schools/{sid}/students/directory). */
export interface StudentDirectoryRow {
  studentId: number;
  studentName: string;
  classroomId: number | null;
  className: string | null;
  section: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  subscription: Subscription;
}

export interface StudentListParams {
  classroomId?: number;
  subscription?: Subscription;
  q?: string;
  page?: number;
  size?: number;
}

/** Response shape of POST /students/import is not pinned by the contract, so every field is optional and read defensively. */
export interface ImportStudentsResult {
  created?: number;
  updated?: number;
}

export interface AttendanceRow {
  studentId: number;
  name: string;
  rollNo: string | null;
  subscription: Subscription;
  status: AttendanceStatus | null;
  arrival: ArrivalOutcome | null;
}

export interface BulkAttendanceRequest {
  date: string;
  classroomId: number;
  entries: { studentId: number; status: AttendanceStatus }[];
}

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  subscribed: number;
  nonSubscribed: number;
  mismatches: number;
}

export interface Arrival {
  id: number;
  tripId: number;
  childId: number;
  studentId?: number | null;
  childName: string;
  kind: ArrivalKind;
  driverEventAt: string;
  schoolConfirm: SchoolConfirm;
  parentResponse: ParentResponse;
  outcome: ArrivalOutcome;
  updatedAt: string;
  schoolId?: number;
  parentNote?: string | null;
}

export interface RespondToArrivalRequest {
  response: 'APPROVED' | 'DISPUTED';
  note?: string;
}

export interface Assessment {
  id: number;
  studentId?: number;
  examName: string;
  subject: string;
  maxMarks: number;
  marksObtained: number;
  examDate: string;
}

export type CreateAssessmentRequest = Omit<Assessment, 'id' | 'studentId'>;

export interface StudentComment {
  id: number;
  studentId?: number;
  text: string;
  authorEmail?: string | null;
  createdAt?: string;
}

export interface BulkAttendanceResult {
  date: string;
  classroomId: number;
  total: number;
  inserted: number;
  updated: number;
  unchanged: number;
}

export interface TeacherInvite {
  userId: number;
  email: string;
  inviteToken: string;
}

export type InviteStatus = 'INVITED' | 'ACTIVE' | 'EXPIRED';

export interface Teacher {
  userId: number;
  email: string;
  phone: string | null;
  status: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  qualification?: string | null;
  inviteStatus?: InviteStatus | null;
  inviteExpiresAt?: string | null;
  classTeacherOfClassroomId?: number | null;
  classTeacherOfClassroomName?: string | null;
  periodsPerWeek?: number;
}

export interface InviteTeacherRequest {
  email: string;
  phone?: string;
  name?: string;
  qualification?: string;
  classTeacherOfClassroomId?: number;
}

export interface UpdateTeacherRequest {
  name: string;
  phone?: string;
  qualification?: string;
  classTeacherOfClassroomId?: number | null;
}

export interface TimetablePeriod {
  id: number;
  classroomId: number;
  classroomName: string | null;
  teacherId: number;
  teacherName: string | null;
  subject: string;
  /** 1 = Monday ... 7 = Sunday */
  dayOfWeek: number;
  startTime: string; // "HH:mm:ss"
  endTime: string;
}

export interface CreatePeriodRequest {
  teacherId: number;
  subject: string;
  dayOfWeek: number;
  startTime: string; // "HH:mm"
  endTime: string;
}

export interface DaySchedule {
  dayOfWeek: number;
  periods: TimetablePeriod[];
}

export type TeacherClassroomRole = 'CLASS_TEACHER' | 'LECTURER';

export interface TeacherClassroom {
  classroom: Classroom;
  role: TeacherClassroomRole;
  subjects: string[];
}

/** Driver dropped a child at school but the school register does not show them present. */
export interface TeacherAlert {
  arrivalId: number;
  studentId: number;
  studentName: string;
  classroomId: number;
  classroomName: string | null;
  droppedAt: string;
  date: string;
  driverName: string | null;
  vehicleNo: string | null;
  /** Only sent to the class teacher. */
  guardianName?: string | null;
  guardianPhone?: string | null;
}

export interface ConsentLinkResponse {
  studentId: number;
  consentStatus: ConsentStatus;
  expiresAt: string | null;
  sentTo: string | null;
  /** Only populated in dev when no SMS provider is configured. */
  devLink?: string | null;
}

export interface ConsentView {
  studentFirstName: string;
  schoolName: string;
  expiresAt: string | null;
}

// --- C3 attendance correction requests ---
export type CorrectionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type CorrectionDecision = 'APPROVE' | 'REJECT';

export interface CorrectionRequest {
  id: number;
  schoolId: number;
  classroomId: number;
  classroomName: string | null;
  date: string;
  studentId: number;
  studentName: string | null;
  previousStatus: AttendanceStatus | null;
  requestedStatus: AttendanceStatus;
  reason: string;
  status: CorrectionStatus;
  requestedByUserId: number;
  decidedByUserId: number | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export interface CreateCorrectionRequest {
  classroomId: number;
  date: string;
  studentId: number;
  requestedStatus: AttendanceStatus;
  reason: string;
}

export interface CorrectionDecisionRequest {
  decision: CorrectionDecision;
  note?: string;
}

// --- C5 automatic timetable generator (field names mirror backend TimetableGenerateDtos exactly) ---
export interface TimetableBreak {
  start: string; // "HH:mm"
  durationMinutes: number;
}

export interface TimetableTeacherInput {
  teacherId: number;
  subjects: string[];
}

export interface TimetableSubjectLoad {
  className: string;
  subject: string;
  periodsPerWeek: number;
}

export interface GenerateTimetableRequest {
  periodLengthMinutes: number;
  firstPeriodStart: string; // "HH:mm"
  lastPeriodEnd: string; // "HH:mm"
  breaks: TimetableBreak[];
  /** 1 = Monday ... 7 = Sunday. null/empty defaults to Mon-Sat server-side. */
  workingDays: number[];
  teachers: TimetableTeacherInput[];
  /** Whole classes by `Classroom.name` (every section sharing that name is included), not section ids. */
  classNames: string[];
  subjectLoads: TimetableSubjectLoad[];
}

/** `classroomName` is already the "Grade 3-A" display form (name + section). */
export interface GeneratedTimetablePeriod {
  classroomId: number;
  classroomName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  teacherId: number | null;
  teacherName: string | null;
  subject: string;
  classTeacherPeriod: boolean;
}

/** `dayOfWeek`/`startTime`/`endTime` are null for a classroom-level "ran out of week" shortfall, not one specific slot. */
export interface UnfilledTimetableSlot {
  classroomId: number;
  classroomName: string;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  subject: string | null;
  reason: string;
}

/** `written` is false for /preview (dry run) and true for /generate. */
export interface GenerateTimetableResult {
  periods: GeneratedTimetablePeriod[];
  unfilled: UnfilledTimetableSlot[];
  written: boolean;
}

export interface Lead {
  studentId?: number;
  schoolId?: number;
  name: string;
  phone: string;
  email: string | null;
  school: string;
  leadSource: string;
}
