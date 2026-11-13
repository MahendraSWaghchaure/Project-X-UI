import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import {
  createChildAsParent,
  listMyChildren,
  updateChildAsParent,
  setChildAbsence,
  clearChildAbsence,
  getAttendanceHistory,
  getMyChildQrToken,
  inviteGuardian,
  type UpdateChildRequest,
} from '@/lib/api/children';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { CLASS_LEVELS, BLOOD_TYPES, combineClassSection, splitClassSection } from '@/lib/childFields';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import type { Child } from '@/types/people';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { optionalPhoneSchema } from '@/lib/validation';
import { useTranslation } from 'react-i18next';
import { listMyPendingArrivals } from '@/lib/api/attendance';
import { PENDING_ARRIVALS_KEY, useRespondToArrival } from '@/hooks/useParentArrivals';
import { SafeArrivalStepper } from '@/components/arrivals/SafeArrivalStepper';
import { StatusChip } from '@/components/ui/StatusChip';
import { formatTime } from '@/lib/dates';
import type { Arrival } from '@/types/attendance';

const schema = z.object({
  firstName: z.string().min(1, 'validation.required'),
  lastName: z.string().min(1, 'validation.required'),
  dateOfBirth: z.string().optional(),
  classLevel: z.string().optional(),
  section: z.string().optional(),
  bloodType: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: optionalPhoneSchema,
  allergies: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function toRequest(values: FormValues): UpdateChildRequest {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    dateOfBirth: values.dateOfBirth,
    classSection: combineClassSection(values.classLevel, values.section),
    bloodType: values.bloodType || undefined,
    emergencyContactName: values.emergencyContactName || undefined,
    emergencyContactPhone: values.emergencyContactPhone || undefined,
    allergies: values.allergies || undefined,
  };
}

function EditChildRow({ child, onDone }: { child: Child; onDone: () => void }) {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const queryClient = useQueryClient();
  const { classLevel, section } = splitClassSection(child.classSection);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: child.firstName,
      lastName: child.lastName,
      dateOfBirth: child.dateOfBirth ?? undefined,
      classLevel,
      section,
      bloodType: child.bloodType ?? undefined,
      emergencyContactName: child.emergencyContactName ?? undefined,
      emergencyContactPhone: child.emergencyContactPhone ?? undefined,
      allergies: child.allergies ?? undefined,
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) => updateChildAsParent(child.id, toRequest(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-children'] });
      toast.success(t('parentChildren.updated'));
      onDone();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('parentChildren.updateFailed'))),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
      className="grid grid-cols-1 gap-3 rounded-md border border-blue-200 bg-blue-50/40 p-3 sm:grid-cols-2"
    >
      <Input id={`my-child-first-name-${child.id}`} label={t('common.firstName')} required error={err(errors.firstName?.message)} {...register('firstName')} />
      <Input id={`my-child-last-name-${child.id}`} label={t('common.lastName')} required error={err(errors.lastName?.message)} {...register('lastName')} />
      <Input id={`my-child-dob-${child.id}`} label={t('parentChildren.dateOfBirth')} type="date" {...register('dateOfBirth')} />
      <div className="grid grid-cols-2 gap-3">
        <Select id={`my-child-class-level-${child.id}`} label={t('common.class')} {...register('classLevel')}>
          <option value="">{t('parentChildren.select')}</option>
          {CLASS_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
        <Input id={`my-child-section-${child.id}`} label={t('parentChildren.section')} placeholder={t('parentChildren.sectionPlaceholder')} {...register('section')} />
      </div>
      <Select id={`my-child-blood-type-${child.id}`} label={t('parentChildren.bloodType')} {...register('bloodType')}>
        <option value="">{t('common.unknown')}</option>
        {BLOOD_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </Select>
      <Input
        id={`my-child-emergency-name-${child.id}`}
        label={t('parentChildren.emergencyName')}
        {...register('emergencyContactName')}
      />
      <Input
        id={`my-child-emergency-phone-${child.id}`}
        label={t('parentChildren.emergencyPhone')}
        {...register('emergencyContactPhone')}
      />
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
        {t('parentChildren.allergies')}
        <textarea
          id={`my-child-allergies-${child.id}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={2}
          placeholder={t('parentChildren.allergiesPlaceholder')}
          {...register('allergies')}
        />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" isLoading={isSubmitting}>
          {t('common.save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
}

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function ChildQrPanel({ childId }: { childId: number }) {
  const { t } = useTranslation();
  const { data: token } = useQuery({ queryKey: ['child-qr-token', childId], queryFn: () => getMyChildQrToken(childId) });
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      QRCode.toDataURL(token, { width: 220 }).then(setDataUrl).catch(() => setDataUrl(null));
    }
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-slate-200 p-3">
      <p className="text-sm text-slate-600">{t('parentChildren.qrHint')}</p>
      {dataUrl ? (
        <img src={dataUrl} alt={t('parentChildren.qrAlt')} width={220} height={220} />
      ) : (
        <p className="text-sm text-slate-400">{t('parentChildren.generating')}</p>
      )}
    </div>
  );
}

function ChildAbsencePanel({ childId }: { childId: number }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(tomorrow());
  const markMutation = useMutation({
    mutationFn: () => setChildAbsence(childId, date),
    onSuccess: () => toast.success(t('parentChildren.markedAbsent', { date })),
    onError: (error) => toast.error(backendErrorMessage(error, t('parentChildren.absenceFailed'))),
  });
  const clearMutation = useMutation({
    mutationFn: () => clearChildAbsence(childId, date),
    onSuccess: () => toast.success(t('parentChildren.absenceCleared', { date })),
    onError: (error) => toast.error(backendErrorMessage(error, t('parentChildren.clearFailed'))),
  });

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 p-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        {t('common.date')}
        <input
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <Button isLoading={markMutation.isPending} onClick={() => markMutation.mutate()}>
        {t('attendance.notRiding')}
      </Button>
      <Button variant="secondary" isLoading={clearMutation.isPending} onClick={() => clearMutation.mutate()}>
        {t('attendance.clear')}
      </Button>
    </div>
  );
}

function ChildAttendancePanel({ childId }: { childId: number }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN';
  const { data: events, isLoading } = useQuery({
    queryKey: ['attendance', childId],
    queryFn: () => getAttendanceHistory(childId, daysAgo(30), daysAgo(0)),
  });

  return (
    <div className="flex flex-col gap-1 rounded-md border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-700">{t('attendance.last30Days')}</p>
      {isLoading && <SkeletonTable rows={4} columns={3} />}
      <ul className="flex flex-col divide-y divide-slate-100 text-sm">
        {events?.map((event) => (
          <li key={event.id} className="flex items-center justify-between py-1.5">
            <span>{t(`driver.action.${event.eventType}`, { defaultValue: event.eventType.replace(/_/g, ' ').toLowerCase() })}</span>
            <span className="text-slate-400">{new Date(event.occurredAt).toLocaleString(locale)}</span>
          </li>
        ))}
        {events?.length === 0 && <li className="py-1.5 text-slate-500">{t('parentChildren.noEvents')}</li>}
      </ul>
    </div>
  );
}

function ChildGuardianInvitePanel({ childId }: { childId: number }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const inviteMutation = useMutation({
    mutationFn: () => inviteGuardian(childId, email),
    onSuccess: (response) => {
      setInviteLink(`${window.location.origin}/accept-invite/${response.inviteToken}`);
      toast.success(t('parentChildren.inviteCreated'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('parentChildren.inviteFailed'))),
  });

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
      <p className="text-sm text-slate-600">{t('parentChildren.inviteHint')}</p>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder={t('parentChildren.inviteEmailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <Button isLoading={inviteMutation.isPending} disabled={!email} onClick={() => inviteMutation.mutate()}>
          {t('parentChildren.invite')}
        </Button>
      </div>
      {inviteLink && (
        <p className="break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          {t('parentChildren.inviteLink')} <span className="font-mono">{inviteLink}</span>
        </p>
      )}
    </div>
  );
}

/** Live arrival status for one child: an arrival still waiting for this parent's confirmation, with the same two answers as the app-wide popup. */
function ChildArrivalStatus({ arrival }: { arrival: Arrival }) {
  const { t } = useTranslation();
  const respond = useRespondToArrival();
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-pending-200 bg-pending-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StatusChip tone="pending">{t('approval.waiting')}</StatusChip>
        <span className="text-xs text-pending-700">
          {t(`arrival.kind.${arrival.kind}`)} &middot; {formatTime(arrival.driverEventAt)}
        </span>
      </div>
      <SafeArrivalStepper arrival={arrival} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="safe"
          size="lg"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ arrivalId: arrival.id, response: 'APPROVED' })}
        >
          {t('approval.safe')}
        </Button>
        <Button
          variant="danger"
          size="lg"
          disabled={respond.isPending}
          onClick={() => respond.mutate({ arrivalId: arrival.id, response: 'DISPUTED' })}
        >
          {t('approval.wrong')}
        </Button>
      </div>
    </div>
  );
}

function ChildExtras({ child }: { child: Child }) {
  const { t } = useTranslation();
  const [panel, setPanel] = useState<'qr' | 'absence' | 'attendance' | 'invite' | null>(null);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <Button variant="ghost" className="text-xs" onClick={() => setPanel(panel === 'qr' ? null : 'qr')}>
          {t('attendance.boardingQr')}
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => setPanel(panel === 'absence' ? null : 'absence')}>
          {t('attendance.markAbsent')}
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => setPanel(panel === 'attendance' ? null : 'attendance')}>
          {t('attendance.title')}
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => setPanel(panel === 'invite' ? null : 'invite')}>
          {t('attendance.inviteGuardian')}
        </Button>
      </div>
      {panel === 'qr' && <ChildQrPanel childId={child.id} />}
      {panel === 'absence' && <ChildAbsencePanel childId={child.id} />}
      {panel === 'attendance' && <ChildAttendancePanel childId={child.id} />}
      {panel === 'invite' && <ChildGuardianInvitePanel childId={child.id} />}
    </div>
  );
}

export function ParentChildrenPage() {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const { data: children, isLoading } = useQuery({ queryKey: ['my-children'], queryFn: listMyChildren });
  // Same key/fn as the AppShell popup's query: that one owns the live STOMP subscription and invalidates this key.
  const { data: pendingArrivals } = useQuery({
    queryKey: PENDING_ARRIVALS_KEY,
    queryFn: listMyPendingArrivals,
    retry: false,
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const createMutation = useMutation({
    mutationFn: (values: FormValues) => createChildAsParent(toRequest(values)),
    onSuccess: (child) => {
      queryClient.invalidateQueries({ queryKey: ['my-children'] });
      reset();
      setShowRegisterModal(false);
      toast.success(t('parentChildren.added', { name: child.firstName }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('parentChildren.addFailed'))),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('parentChildren.title')}</h1>
        <Button onClick={() => setShowRegisterModal(true)}>{t('parentChildren.registerButton')}</Button>
      </div>

      <Modal open={showRegisterModal} onClose={() => setShowRegisterModal(false)} title={t('parentChildren.registerTitle')}>
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Input label={t('common.firstName')} required error={err(errors.firstName?.message)} {...register('firstName')} />
          <Input label={t('common.lastName')} required error={err(errors.lastName?.message)} {...register('lastName')} />
          <Input label={t('parentChildren.dateOfBirth')} type="date" {...register('dateOfBirth')} />
          <div className="grid grid-cols-2 gap-4">
            <Select label={t('common.class')} {...register('classLevel')}>
              <option value="">{t('parentChildren.select')}</option>
              {CLASS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
            <Input label={t('parentChildren.section')} placeholder={t('parentChildren.sectionPlaceholder')} {...register('section')} />
          </div>
          <Select label={t('parentChildren.bloodType')} {...register('bloodType')}>
            <option value="">{t('common.unknown')}</option>
            {BLOOD_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Input label={t('parentChildren.emergencyName')} {...register('emergencyContactName')} />
          <Input label={t('parentChildren.emergencyPhone')} {...register('emergencyContactPhone')} />
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
            {t('parentChildren.allergies')}
            <textarea
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              rows={2}
              placeholder={t('parentChildren.allergiesPlaceholder')}
              {...register('allergies')}
            />
          </label>
          {createMutation.isError && (
            <p className="sm:col-span-2 text-sm text-red-600">{backendErrorMessage(createMutation.error, t('parentChildren.addFailedInline'))}</p>
          )}
          <Button type="submit" isLoading={isSubmitting} className="sm:col-span-2 sm:w-fit">
            {t('parentChildren.addChild')}
          </Button>
        </form>
      </Modal>

      <Card>
        <CardHeader>
          <CardTitle>{t('parentChildren.cardTitle')}</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <SkeletonTable rows={4} columns={3} />}
          <ul className="flex flex-col divide-y divide-slate-100">
            {children?.map((child) =>
              editingId === child.id ? (
                <li key={child.id} className="py-3">
                  <EditChildRow child={child} onDone={() => setEditingId(null)} />
                </li>
              ) : (
                <li key={child.id} className="flex flex-col gap-2 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-900">
                        {child.firstName} {child.lastName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {child.classSection ? `${child.classSection} · ` : ''}
                        {child.routeId ? t('parentChildren.assignedRoute', { id: child.routeId }) : t('parentChildren.notAssigned')}
                      </p>
                      {(child.bloodType || child.allergies) && (
                        <p className="mt-1 text-xs text-slate-400">
                          {child.bloodType ? t('parentChildren.bloodTypeLine', { type: child.bloodType }) : ''}
                          {child.bloodType && child.allergies ? ' · ' : ''}
                          {child.allergies ?? ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={child.insurancePolicyId ? 'info' : 'neutral'}>
                        {child.insurancePolicyId ? t('parentChildren.insured') : t('parentChildren.notInsured')}
                      </Badge>
                      <Button variant="secondary" onClick={() => setEditingId(child.id)}>
                        {t('common.edit')}
                      </Button>
                    </div>
                  </div>
                  {pendingArrivals
                    ?.filter((a) => a.childId === child.id && a.parentResponse === 'PENDING')
                    .map((a) => <ChildArrivalStatus key={a.id} arrival={a} />)}
                  <ChildExtras child={child} />
                </li>
              ),
            )}
            {children?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('parentChildren.empty')}</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
