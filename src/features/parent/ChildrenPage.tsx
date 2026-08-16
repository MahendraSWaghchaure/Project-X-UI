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
  inviteSecondGuardian,
  type UpdateChildRequest,
} from '@/lib/api/children';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { CLASS_LEVELS, BLOOD_TYPES, combineClassSection, splitClassSection } from '@/lib/childFields';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Child } from '@/types/people';

const schema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  classLevel: z.string().optional(),
  section: z.string().optional(),
  bloodType: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
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
      toast.success('Child updated');
      onDone();
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not update child')),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
      className="grid grid-cols-1 gap-3 rounded-md border border-blue-200 bg-blue-50/40 p-3 sm:grid-cols-2"
    >
      <Input id={`my-child-first-name-${child.id}`} label="First name" error={errors.firstName?.message} {...register('firstName')} />
      <Input id={`my-child-last-name-${child.id}`} label="Last name" error={errors.lastName?.message} {...register('lastName')} />
      <Input id={`my-child-dob-${child.id}`} label="Date of birth" type="date" {...register('dateOfBirth')} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Class
          <select
            id={`my-child-class-level-${child.id}`}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            {...register('classLevel')}
          >
            <option value="">Select&hellip;</option>
            {CLASS_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <Input id={`my-child-section-${child.id}`} label="Section" placeholder="A, B, C…" {...register('section')} />
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Blood type
        <select
          id={`my-child-blood-type-${child.id}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          {...register('bloodType')}
        >
          <option value="">Unknown</option>
          {BLOOD_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>
      <Input
        id={`my-child-emergency-name-${child.id}`}
        label="Emergency contact name"
        {...register('emergencyContactName')}
      />
      <Input
        id={`my-child-emergency-phone-${child.id}`}
        label="Emergency contact phone"
        {...register('emergencyContactPhone')}
      />
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
        Allergies / medical notes
        <textarea
          id={`my-child-allergies-${child.id}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={2}
          placeholder="e.g. peanut allergy, asthma inhaler in bag"
          {...register('allergies')}
        />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" isLoading={isSubmitting}>
          Save
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
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
  const { data: token } = useQuery({ queryKey: ['child-qr-token', childId], queryFn: () => getMyChildQrToken(childId) });
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      QRCode.toDataURL(token, { width: 220 }).then(setDataUrl).catch(() => setDataUrl(null));
    }
  }, [token]);

  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-slate-200 p-3">
      <p className="text-sm text-slate-600">Show this to the driver to scan for boarding instead of a manual check-in.</p>
      {dataUrl ? <img src={dataUrl} alt="Child boarding QR code" width={220} height={220} /> : <p className="text-sm text-slate-400">Generating&hellip;</p>}
    </div>
  );
}

function ChildAbsencePanel({ childId }: { childId: number }) {
  const [date, setDate] = useState(tomorrow());
  const markMutation = useMutation({
    mutationFn: () => setChildAbsence(childId, date),
    onSuccess: () => toast.success(`Marked absent for ${date}`),
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not mark absence')),
  });
  const clearMutation = useMutation({
    mutationFn: () => clearChildAbsence(childId, date),
    onSuccess: () => toast.success(`Absence cleared for ${date}`),
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not clear absence')),
  });

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 p-3">
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Date
        <input
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
      </label>
      <Button isLoading={markMutation.isPending} onClick={() => markMutation.mutate()}>
        Not riding that day
      </Button>
      <Button variant="secondary" isLoading={clearMutation.isPending} onClick={() => clearMutation.mutate()}>
        Clear
      </Button>
    </div>
  );
}

function ChildAttendancePanel({ childId }: { childId: number }) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['attendance', childId],
    queryFn: () => getAttendanceHistory(childId, daysAgo(30), daysAgo(0)),
  });

  return (
    <div className="flex flex-col gap-1 rounded-md border border-slate-200 p-3">
      <p className="text-sm font-medium text-slate-700">Last 30 days</p>
      {isLoading && <p className="text-sm text-slate-500">Loading&hellip;</p>}
      <ul className="flex flex-col divide-y divide-slate-100 text-sm">
        {events?.map((event) => (
          <li key={event.id} className="flex items-center justify-between py-1.5">
            <span>{event.eventType.replace(/_/g, ' ').toLowerCase()}</span>
            <span className="text-slate-400">{new Date(event.occurredAt).toLocaleString()}</span>
          </li>
        ))}
        {events?.length === 0 && <li className="py-1.5 text-slate-500">No attendance events in this range yet.</li>}
      </ul>
    </div>
  );
}

function ChildGuardianInvitePanel({ childId }: { childId: number }) {
  const [email, setEmail] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const inviteMutation = useMutation({
    mutationFn: () => inviteSecondGuardian(childId, email),
    onSuccess: (response) => {
      setInviteLink(`${window.location.origin}/accept-invite/${response.inviteToken}`);
      toast.success('Invite created');
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not invite guardian')),
  });

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
      <p className="text-sm text-slate-600">Invite a second parent or guardian for this child.</p>
      <div className="flex gap-2">
        <input
          type="email"
          placeholder="guardian@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <Button isLoading={inviteMutation.isPending} disabled={!email} onClick={() => inviteMutation.mutate()}>
          Invite
        </Button>
      </div>
      {inviteLink && (
        <p className="break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">
          Invite link: <span className="font-mono">{inviteLink}</span>
        </p>
      )}
    </div>
  );
}

function ChildExtras({ child }: { child: Child }) {
  const [panel, setPanel] = useState<'qr' | 'absence' | 'attendance' | 'invite' | null>(null);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <Button variant="ghost" className="text-xs" onClick={() => setPanel(panel === 'qr' ? null : 'qr')}>
          Boarding QR code
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => setPanel(panel === 'absence' ? null : 'absence')}>
          Mark absent
        </Button>
        <Button variant="ghost" className="text-xs" onClick={() => setPanel(panel === 'attendance' ? null : 'attendance')}>
          Attendance history
        </Button>
        {!child.secondaryParentId && (
          <Button variant="ghost" className="text-xs" onClick={() => setPanel(panel === 'invite' ? null : 'invite')}>
            Invite second guardian
          </Button>
        )}
      </div>
      {panel === 'qr' && <ChildQrPanel childId={child.id} />}
      {panel === 'absence' && <ChildAbsencePanel childId={child.id} />}
      {panel === 'attendance' && <ChildAttendancePanel childId={child.id} />}
      {panel === 'invite' && <ChildGuardianInvitePanel childId={child.id} />}
    </div>
  );
}

export function ParentChildrenPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const { data: children, isLoading } = useQuery({ queryKey: ['my-children'], queryFn: listMyChildren });
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
      toast.success(`${child.firstName} added`);
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not add child')),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">My Children</h1>

      <Card>
        <CardHeader>
          <CardTitle>Register a child</CardTitle>
        </CardHeader>
        <CardBody>
          <form
            onSubmit={handleSubmit((values) => createMutation.mutate(values))}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Input label="First name" error={errors.firstName?.message} {...register('firstName')} />
            <Input label="Last name" error={errors.lastName?.message} {...register('lastName')} />
            <Input label="Date of birth" type="date" {...register('dateOfBirth')} />
            <div className="grid grid-cols-2 gap-4">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
                Class
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" {...register('classLevel')}>
                  <option value="">Select&hellip;</option>
                  {CLASS_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </label>
              <Input label="Section" placeholder="A, B, C…" {...register('section')} />
            </div>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
              Blood type
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" {...register('bloodType')}>
                <option value="">Unknown</option>
                {BLOOD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <Input label="Emergency contact name" {...register('emergencyContactName')} />
            <Input label="Emergency contact phone" {...register('emergencyContactPhone')} />
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
              Allergies / medical notes
              <textarea
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                rows={2}
                placeholder="e.g. peanut allergy, asthma inhaler in bag"
                {...register('allergies')}
              />
            </label>
            {createMutation.isError && (
              <p className="sm:col-span-2 text-sm text-red-600">{backendErrorMessage(createMutation.error, 'Could not add child.')}</p>
            )}
            <Button type="submit" isLoading={isSubmitting} className="sm:col-span-2 sm:w-fit">
              Add child
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Children</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <p className="text-sm text-slate-500">Loading&hellip;</p>}
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
                        {child.routeId ? `Assigned to route #${child.routeId}` : 'Not yet assigned to a route by the school'}
                      </p>
                      {(child.bloodType || child.allergies) && (
                        <p className="mt-1 text-xs text-slate-400">
                          {child.bloodType ? `Blood type ${child.bloodType}` : ''}
                          {child.bloodType && child.allergies ? ' · ' : ''}
                          {child.allergies ?? ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={child.insurancePolicyId ? 'info' : 'neutral'}>
                        {child.insurancePolicyId ? 'Insured' : 'Not insured'}
                      </Badge>
                      <Button variant="secondary" onClick={() => setEditingId(child.id)}>
                        Edit
                      </Button>
                    </div>
                  </div>
                  <ChildExtras child={child} />
                </li>
              ),
            )}
            {children?.length === 0 && <p className="py-3 text-sm text-slate-500">No children registered yet.</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
