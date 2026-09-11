import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  autoAssignRoute,
  deactivateChild,
  listChildrenForSchool,
  updateChildAsSchoolAdmin,
  type UpdateChildRequest,
} from '@/lib/api/children';
import { deactivateParent, inviteParent, listParentsForSchool } from '@/lib/api/parents';
import { useAuthStore } from '@/lib/authStore';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { CLASS_LEVELS, BLOOD_TYPES, combineClassSection, splitClassSection } from '@/lib/childFields';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Child } from '@/types/people';

const inviteSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
});
type InviteFormValues = z.infer<typeof inviteSchema>;

const editChildSchema = z.object({
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
type EditChildFormValues = z.infer<typeof editChildSchema>;

function toRequest(values: EditChildFormValues): UpdateChildRequest {
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

function EditChildRow({ schoolId, child, onDone }: { schoolId: number; child: Child; onDone: () => void }) {
  const queryClient = useQueryClient();
  const { classLevel, section } = splitClassSection(child.classSection);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditChildFormValues>({
    resolver: zodResolver(editChildSchema),
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
    mutationFn: (values: EditChildFormValues) => updateChildAsSchoolAdmin(schoolId, child.id, toRequest(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children', schoolId] });
      toast.success('Student updated');
      onDone();
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not update student')),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
      className="grid grid-cols-1 gap-3 rounded-md border border-blue-200 bg-blue-50/40 p-3 sm:grid-cols-2"
    >
      <Input id={`child-first-name-${child.id}`} label="First name" error={errors.firstName?.message} {...register('firstName')} />
      <Input id={`child-last-name-${child.id}`} label="Last name" error={errors.lastName?.message} {...register('lastName')} />
      <Input id={`child-dob-${child.id}`} label="Date of birth" type="date" {...register('dateOfBirth')} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
          Class
          <select
            id={`child-class-level-${child.id}`}
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
        <Input id={`child-section-${child.id}`} label="Section" placeholder="A, B, C…" {...register('section')} />
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
        Blood type
        <select
          id={`child-blood-type-${child.id}`}
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
      <Input id={`child-emergency-name-${child.id}`} label="Emergency contact name" {...register('emergencyContactName')} />
      <Input id={`child-emergency-phone-${child.id}`} label="Emergency contact phone" {...register('emergencyContactPhone')} />
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
        Allergies / medical notes
        <textarea
          id={`child-allergies-${child.id}`}
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

export function ChildrenPage() {
  const schoolId = useAuthStore((state) => state.schoolId);
  const queryClient = useQueryClient();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [editingChildId, setEditingChildId] = useState<number | null>(null);

  const { data: children, isLoading } = useQuery({
    // 'roster' distinguishes this from DashboardPage's count-only query (different page/size args
    // against the same now-paginated endpoint must not share a cache entry) and from
    // InsurancePage's own full-roster query, which intentionally uses this exact same key+args to
    // correctly share the cache instead of double-fetching.
    queryKey: ['children', schoolId, 'roster'],
    // 200 comfortably covers a real school's roster for now; a real Pagination control lands
    // with the visual redesign pass, this just keeps today's "show the whole roster" behavior
    // working against the now-paginated endpoint instead of silently truncating to its default.
    queryFn: () => listChildrenForSchool(schoolId!, 0, 200),
    select: (page) => page.content,
    enabled: schoolId != null,
  });
  const { data: parents, isLoading: parentsLoading } = useQuery({
    queryKey: ['parents', schoolId],
    queryFn: () => listParentsForSchool(schoolId!),
    enabled: schoolId != null,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({ resolver: zodResolver(inviteSchema) });

  const inviteMutation = useMutation({
    mutationFn: (values: InviteFormValues) => inviteParent(schoolId!, values.email, values.phone),
    onSuccess: (response) => {
      setInviteLink(`${window.location.origin}/accept-invite/${response.inviteToken}`);
      queryClient.invalidateQueries({ queryKey: ['parents', schoolId] });
      reset();
      toast.success('Invite created');
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not send invite')),
  });

  const deactivateChildMutation = useMutation({
    mutationFn: (childId: number) => deactivateChild(schoolId!, childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children', schoolId] });
      toast.success('Student deactivated');
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not deactivate student')),
  });

  const autoAssignMutation = useMutation({
    mutationFn: (childId: number) => autoAssignRoute(schoolId!, childId),
    onSuccess: (child) => {
      queryClient.invalidateQueries({ queryKey: ['children', schoolId] });
      toast.success(`${child.firstName} assigned to route #${child.routeId}`);
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not auto-assign a route')),
  });

  const deactivateParentMutation = useMutation({
    mutationFn: (parentId: number) => deactivateParent(schoolId!, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents', schoolId] });
      toast.success('Parent deactivated');
    },
    onError: (error) => toast.error(backendErrorMessage(error, 'Could not deactivate parent')),
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-slate-900">Students &amp; Parents</h1>

      <Card>
        <CardHeader>
          <CardTitle>Invite a parent</CardTitle>
          <p className="mt-1 text-sm text-slate-500">
            Parents register their own children once they accept their invite. SMS/email delivery isn't wired up with
            real credentials yet, so share the generated link with them directly for now.
          </p>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSubmit((values) => inviteMutation.mutate(values))} className="flex flex-wrap items-end gap-3">
            <Input label="Parent email" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Parent phone (optional)" {...register('phone')} />
            <Button type="submit" isLoading={isSubmitting}>
              Send invite
            </Button>
          </form>
          {inviteLink && (
            <p className="mt-3 break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              Invite link: <span className="font-mono">{inviteLink}</span>
            </p>
          )}
          {inviteMutation.isError && (
            <p className="mt-2 text-sm text-red-600">{backendErrorMessage(inviteMutation.error, 'Could not send invite.')}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrolled children</CardTitle>
        </CardHeader>
        <CardBody>
          {isLoading && <p className="text-sm text-slate-500">Loading&hellip;</p>}
          <ul className="flex flex-col divide-y divide-slate-100">
            {children?.map((child) =>
              editingChildId === child.id ? (
                <li key={child.id} className="py-3">
                  <EditChildRow schoolId={schoolId!} child={child} onDone={() => setEditingChildId(null)} />
                </li>
              ) : (
                <li key={child.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {child.firstName} {child.lastName}
                    </p>
                    <p className="text-sm text-slate-500">{child.classSection ?? 'No class recorded'}</p>
                    {(child.bloodType || child.allergies) && (
                      <p className="mt-1 text-xs text-slate-400">
                        {child.bloodType ? `Blood type ${child.bloodType}` : ''}
                        {child.bloodType && child.allergies ? ' · ' : ''}
                        {child.allergies ?? ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={child.status === 'ACTIVE' ? 'success' : 'warning'}>{child.status}</Badge>
                    <span className="text-sm text-slate-500">{child.routeId ? `Route #${child.routeId}` : 'No route yet'}</span>
                    {child.insurancePolicyId ? (
                      <Badge tone="info">Insured</Badge>
                    ) : (
                      <Link to="/school-admin/insurance">
                        <Badge tone="neutral" className="cursor-pointer hover:bg-slate-200">
                          Not insured
                        </Badge>
                      </Link>
                    )}
                    {!child.routeId && (
                      <Button
                        variant="secondary"
                        isLoading={autoAssignMutation.isPending && autoAssignMutation.variables === child.id}
                        onClick={() => autoAssignMutation.mutate(child.id)}
                      >
                        Auto-assign route
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => setEditingChildId(child.id)}>
                      Edit
                    </Button>
                    {child.status === 'ACTIVE' && (
                      <Button
                        variant="danger"
                        isLoading={deactivateChildMutation.isPending && deactivateChildMutation.variables === child.id}
                        onClick={() => deactivateChildMutation.mutate(child.id)}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </li>
              ),
            )}
            {children?.length === 0 && <p className="py-3 text-sm text-slate-500">No children enrolled yet.</p>}
          </ul>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parents</CardTitle>
        </CardHeader>
        <CardBody>
          {parentsLoading && <p className="text-sm text-slate-500">Loading&hellip;</p>}
          <ul className="divide-y divide-slate-100">
            {parents?.map((parent) => (
              <li key={parent.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {parent.firstName || parent.lastName ? `${parent.firstName ?? ''} ${parent.lastName ?? ''}`.trim() : parent.email}
                  </p>
                  <p className="text-sm text-slate-500">{parent.email ?? 'No email on file'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={parent.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>{parent.accountStatus}</Badge>
                  {parent.accountStatus !== 'DISABLED' && (
                    <Button
                      variant="danger"
                      isLoading={deactivateParentMutation.isPending && deactivateParentMutation.variables === parent.id}
                      onClick={() => deactivateParentMutation.mutate(parent.id)}
                    >
                      Deactivate
                    </Button>
                  )}
                </div>
              </li>
            ))}
            {parents?.length === 0 && <p className="py-3 text-sm text-slate-500">No parents invited yet.</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
