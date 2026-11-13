import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Link2, MessageSquare, Pencil } from 'lucide-react';
import {
  createComment,
  getAttendanceSheet,
  getStudent,
  listClassrooms,
  linkStudentToChild,
  listComments,
  listMyClassrooms,
  unlinkStudentFromChild,
} from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/authStore';
import { classroomLabel } from '@/lib/classroom';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { daysAgoIst } from '@/lib/dates';
import { listInsurancePolicies } from '@/lib/api/insurance';
import { formatDate, useIntlLocale } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton';
import { StatusChip, type StatusTone } from '@/components/ui/StatusChip';
import { StudentFormModal } from './components/StudentFormModal';
import { SubscriptionBadge } from './components/SubscriptionBadge';
import { AssessmentsPanel } from './components/AssessmentsPanel';
import { ConsentChip, SendConsentButton } from './components/ConsentControls';
import type { AttendanceStatus, Student } from '@/types/attendance';

const HISTORY_DAYS = 7;
const STATUS_TONE: Record<AttendanceStatus, StatusTone> = { PRESENT: 'safe', LATE: 'pending', ABSENT: 'alert' };


function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children || '—'}</dd>
    </div>
  );
}

function AttendanceHistory({ schoolId, studentId, classroomId }: { schoolId: number; studentId: number; classroomId: number }) {
  const { t } = useTranslation();
  const days = Array.from({ length: HISTORY_DAYS }, (_, i) => daysAgoIst(i));
  const results = useQueries({
    queries: days.map((d) => ({
      queryKey: ['attendance-sheet', schoolId, d, classroomId],
      queryFn: () => getAttendanceSheet(schoolId, d, classroomId),
      staleTime: 60_000,
    })),
  });

  return (
    <ul className="grid grid-cols-7 gap-2 text-center" aria-label={t('student.attendanceHistory')}>
      {days.map((d, i) => {
        const result = results[i];
        const row = result.data?.find((r) => r.studentId === studentId);
        const date = new Date(`${d}T00:00:00`);
        return (
          <li key={d} className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-medium text-slate-500">
              {date.toLocaleDateString([], { weekday: 'short' })}
              <span className="block text-slate-400">{date.getDate()}</span>
            </span>
            {result.isLoading ? (
              <Skeleton className="h-6 w-full" />
            ) : row?.status ? (
              <StatusChip tone={STATUS_TONE[row.status]} size="sm">
                {t(`sheet.statusShort.${row.status}`)}
              </StatusChip>
            ) : (
              <span className="text-xs text-slate-400">{t('student.notMarked')}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** SCHOOL_ADMIN only: ties a roster student to a Sunju child profile (or removes the tie). */
function ChildLinkCard({ schoolId, student }: { schoolId: number; student: Student }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [childId, setChildId] = useState('');
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const linked = student.childId != null;
  const parsedChildId = Number(childId);
  const validChildId = childId.trim() !== '' && Number.isInteger(parsedChildId) && parsedChildId > 0;

  const done = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ['student', schoolId, student.id] });
    queryClient.invalidateQueries({ queryKey: ['students', schoolId] });
    toast.success(message);
  };
  const linkMutation = useMutation({
    mutationFn: () => linkStudentToChild(schoolId, student.id, parsedChildId),
    onSuccess: () => {
      setChildId('');
      done(t('student.link.linkedOk'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('student.link.failed'))),
  });
  const unlinkMutation = useMutation({
    mutationFn: () => unlinkStudentFromChild(schoolId, student.id),
    onSuccess: () => {
      setConfirmUnlink(false);
      done(t('student.link.unlinkedOk'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('student.link.failed'))),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('student.link.title')}</CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col gap-3">
        {linked ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm text-slate-800">
              <Link2 className="h-4 w-4 text-safe-700" aria-hidden="true" />
              {t('student.link.linked', { childId: student.childId })}
            </p>
            <Button variant="secondary" onClick={() => setConfirmUnlink(true)}>
              {t('student.link.unlink')}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validChildId) linkMutation.mutate();
            }}
            className="flex flex-col gap-2"
          >
            <p className="text-sm text-slate-500">{t('student.link.notLinked')}</p>
            <div className="flex flex-wrap items-end gap-3">
              <Input
                label={t('student.link.childId')}
                type="number"
                min={1}
                inputMode="numeric"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
              />
              <Button type="submit" isLoading={linkMutation.isPending} disabled={!validChildId}>
                {t('student.link.link')}
              </Button>
            </div>
            <p className="text-xs text-slate-500">{t('student.link.childIdHelp')}</p>
          </form>
        )}
      </CardBody>
      <Modal
        open={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        title={t('student.link.unlink')}
        size="sm"
        descriptionId="unlink-confirm-text"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmUnlink(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" isLoading={unlinkMutation.isPending} onClick={() => unlinkMutation.mutate()}>
              {t('student.link.unlink')}
            </Button>
          </>
        }
      >
        <p id="unlink-confirm-text" className="text-sm text-slate-700">
          {t('student.link.confirmUnlink')}
        </p>
      </Modal>
    </Card>
  );
}

/**
 * Read-only insurance number + status of the policy covering the student's linked Sunju child. Insurance is
 * managed by the platform, so the school only sees it here (there is no insurance screen in the school nav).
 */
function InsuranceCard({ schoolId, student }: { schoolId: number; student: Student }) {
  const { t } = useTranslation();
  const locale = useIntlLocale();
  const { data: policies, isLoading } = useQuery({
    queryKey: ['insurance-policies', schoolId],
    queryFn: () => listInsurancePolicies(schoolId),
    enabled: student.childId != null,
    retry: false,
  });
  const policy = policies?.find((p) => p.subjectType === 'CHILD' && p.subjectId === student.childId);
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('student.insurance.title')}</CardTitle>
      </CardHeader>
      <CardBody>
        {student.childId == null ? (
          <p className="text-sm text-slate-500">{t('student.insurance.notLinked')}</p>
        ) : isLoading ? (
          <SkeletonText lines={2} />
        ) : policy ? (
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <ProfileField label={t('student.insurance.number')}>{policy.policyNumber}</ProfileField>
            <ProfileField label={t('common.status')}>
              <StatusChip tone={policy.status === 'ACTIVE' ? 'safe' : 'alert'} size="sm">
                {t(`student.insurance.status.${policy.status}`)}
              </StatusChip>
            </ProfileField>
            <ProfileField label={t('student.insurance.provider')}>{policy.provider}</ProfileField>
            <ProfileField label={t('student.insurance.validUntil')}>{formatDate(policy.endDate, locale)}</ProfileField>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">{t('student.insurance.none')}</p>
        )}
      </CardBody>
    </Card>
  );
}

export function StudentDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const studentId = Number(id);
  const schoolId = useAuthStore((s) => s.schoolId);
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [comment, setComment] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  // Roster edits and Sunju linking are SCHOOL_ADMIN-only on the backend (teachers get 403), so teachers never see the controls.
  const role = useAuthStore((s) => s.role);
  const canManage = role === 'SCHOOL_ADMIN';

  const { data: student, isLoading, isError } = useQuery({
    queryKey: ['student', schoolId, studentId],
    queryFn: () => getStudent(schoolId!, studentId),
    enabled: schoolId != null && Number.isFinite(studentId),
  });
  const { data: classrooms } = useQuery({
    queryKey: ['classrooms', schoolId],
    queryFn: () => listClassrooms(schoolId!),
    enabled: schoolId != null,
  });
  // A teacher is either the class teacher of this student's class (full access) or only a lecturer there (assessments only, no guardian contact, no comments).
  const { data: myClassrooms } = useQuery({
    queryKey: ['my-classrooms'],
    queryFn: listMyClassrooms,
    enabled: role === 'TEACHER',
  });
  const teacherRole = role === 'TEACHER' ? myClassrooms?.find((m) => m.classroom.id === student?.classroomId)?.role : undefined;
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['student-comments', schoolId, studentId],
    queryFn: () => listComments(schoolId!, studentId),
    enabled: schoolId != null && Number.isFinite(studentId) && !(role === 'TEACHER' && teacherRole !== 'CLASS_TEACHER'),
  });

  const commentMutation = useMutation({
    mutationFn: () => createComment(schoolId!, studentId, comment.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-comments', schoolId, studentId] });
      setComment('');
      toast.success(t('student.commentAdded'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('student.commentFailed'))),
  });

  const classroom = classrooms?.find((c) => c.id === student?.classroomId);
  // Staff with full access: admins, and the class teacher of this student's class. A lecturer only works with assessments.
  const isLecturer = role === 'TEACHER' && teacherRole === 'LECTURER';
  const fullAccess = !isLecturer;
  const backTo = role === 'TEACHER' ? '/teacher/class' : student?.classroomId != null ? `/school-admin/classrooms/${student.classroomId}` : '/school-admin/classrooms';

  return (
    <div className="flex flex-col gap-6">
      <Link to={role === 'TEACHER' && isLecturer ? '/teacher/exams' : backTo} className="flex w-fit items-center gap-1 text-sm font-semibold text-primary-text hover:underline">
        <ArrowLeft className="h-4 w-4" />
        {t('student.back')}
      </Link>

      {isLoading && (
        <Card>
          <CardBody>
            <SkeletonText lines={4} />
          </CardBody>
        </Card>
      )}
      {isError && (
        <Card>
          <EmptyState title={t('student.notFoundTitle')} description={t('student.notFoundBody')} />
        </Card>
      )}

      {student && (
        <>
          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 font-display text-lg font-semibold text-white">
                    {student.firstName[0]}
                    {student.lastName[0]}
                  </span>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {student.firstName} {student.lastName}
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <SubscriptionBadge subscription={student.subscription} />
                  {canManage && (
                    <Button variant="secondary" onClick={() => setShowEdit(true)}>
                      <Pencil className="h-4 w-4" />
                      {t('student.edit')}
                    </Button>
                  )}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <ProfileField label={t('students.class')}>{classroom ? classroomLabel(classroom) : null}</ProfileField>
                <ProfileField label={t('students.rollNo')}>{student.rollNo}</ProfileField>
                <ProfileField label={t('students.dob')}>{student.dob}</ProfileField>
                <ProfileField label={t('student.gender')}>{student.gender}</ProfileField>
                {fullAccess && (
                  <>
                    <ProfileField label={t('students.guardianName')}>{student.guardianName}</ProfileField>
                    <ProfileField label={t('students.guardianPhone')}>{student.guardianPhone}</ProfileField>
                    <ProfileField label={t('students.guardianEmail')}>{student.guardianEmail}</ProfileField>
                    <ProfileField label={t('student.contactConsent')}>
                      <div className="flex flex-col items-start gap-1.5">
                        <ConsentChip student={student} />
                        {canManage && schoolId != null && <SendConsentButton schoolId={schoolId} student={student} />}
                      </div>
                    </ProfileField>
                  </>
                )}
              </dl>
            </CardBody>
          </Card>

          {canManage && schoolId != null && <ChildLinkCard schoolId={schoolId} student={student} />}
          {canManage && schoolId != null && <InsuranceCard schoolId={schoolId} student={student} />}
          {canManage && (
            <StudentFormModal open={showEdit} onClose={() => setShowEdit(false)} classrooms={classrooms ?? []} student={student} />
          )}

          {fullAccess && (
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{t('student.attendanceHistory')}</CardTitle>
              {!showHistory && student.classroomId != null && (
                <Button variant="secondary" onClick={() => setShowHistory(true)}>
                  {t('student.showLast7Days')}
                </Button>
              )}
            </CardHeader>
            <CardBody>
              {showHistory && schoolId != null && student.classroomId != null ? (
                <AttendanceHistory schoolId={schoolId} studentId={student.id} classroomId={student.classroomId} />
              ) : (
                <p className="text-sm text-slate-500">
                  {student.classroomId == null ? t('student.noClassForHistory') : t('student.historyHint')}
                </p>
              )}
            </CardBody>
          </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>{t('student.assessments')}</CardTitle>
            </CardHeader>
            <CardBody>{schoolId != null && <AssessmentsPanel schoolId={schoolId} studentId={studentId} />}</CardBody>
          </Card>

          {fullAccess && (
          <Card>
            <CardHeader>
              <CardTitle>{t('student.comments')}</CardTitle>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              {commentsLoading && <SkeletonText lines={3} />}
              {comments && comments.length > 0 && (
                <ul className="flex flex-col gap-3">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm text-slate-800">{c.text}</p>
                      {(c.authorEmail || c.createdAt) && (
                        <p className="mt-1.5 text-xs text-slate-500">
                          {[c.authorEmail, c.createdAt && new Date(c.createdAt).toLocaleDateString()].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {comments?.length === 0 && (
                <EmptyState icon={MessageSquare} title={t('student.noCommentsTitle')} description={t('student.noCommentsBody')} />
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (comment.trim()) commentMutation.mutate();
                }}
                className="flex flex-col gap-2"
              >
                <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                  {t('student.newComment')}
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder={t('student.commentPlaceholder')}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-normal"
                  />
                </label>
                <Button type="submit" className="w-fit" isLoading={commentMutation.isPending} disabled={!comment.trim()}>
                  {t('student.addComment')}
                </Button>
              </form>
            </CardBody>
          </Card>
          )}
        </>
      )}
    </div>
  );
}
