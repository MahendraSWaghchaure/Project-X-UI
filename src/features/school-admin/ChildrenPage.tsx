import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  autoAssignRoute,
  deactivateChild,
  listChildrenForRoute,
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
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { RouteFilterSelect } from '@/components/ui/RouteFilterSelect';
import { Select } from '@/components/ui/Select';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { optionalPhoneSchema } from '@/lib/validation';
import type { Child } from '@/types/people';

const CHILDREN_PAGE_SIZE = 25;

const inviteSchema = z.object({
  email: z.string().email('validation.email'),
  phone: optionalPhoneSchema,
});
type InviteFormValues = z.infer<typeof inviteSchema>;

const editChildSchema = z.object({
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
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
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
      toast.success(t('schoolRiders.studentUpdated'));
      onDone();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('schoolRiders.updateFailed'))),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
      className="grid grid-cols-1 gap-3 rounded-md border border-blue-200 bg-blue-50/40 p-3 sm:grid-cols-2"
    >
      <Input id={`child-first-name-${child.id}`} label={t('common.firstName')} required error={err(errors.firstName?.message)} {...register('firstName')} />
      <Input id={`child-last-name-${child.id}`} label={t('common.lastName')} required error={err(errors.lastName?.message)} {...register('lastName')} />
      <Input id={`child-dob-${child.id}`} label={t('schoolRiders.dob')} type="date" {...register('dateOfBirth')} />
      <div className="grid grid-cols-2 gap-3">
        <Select id={`child-class-level-${child.id}`} label={t('common.class')} {...register('classLevel')}>
          <option value="">{t('schoolRiders.select')}</option>
          {CLASS_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
        <Input id={`child-section-${child.id}`} label={t('schoolRiders.section')} placeholder={t('schoolRiders.sectionPlaceholder')} {...register('section')} />
      </div>
      <Select id={`child-blood-type-${child.id}`} label={t('schoolRiders.bloodType')} {...register('bloodType')}>
        <option value="">{t('common.unknown')}</option>
        {BLOOD_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </Select>
      <Input id={`child-emergency-name-${child.id}`} label={t('schoolRiders.emergencyName')} {...register('emergencyContactName')} />
      <Input id={`child-emergency-phone-${child.id}`} label={t('schoolRiders.emergencyPhone')} error={err(errors.emergencyContactPhone?.message)} {...register('emergencyContactPhone')} />
      <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 sm:col-span-2">
        {t('schoolRiders.allergies')}
        <textarea
          id={`child-allergies-${child.id}`}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          rows={2}
          placeholder={t('schoolRiders.allergiesPlaceholder')}
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

export function ChildrenPage() {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const schoolId = useAuthStore((state) => state.schoolId);
  const queryClient = useQueryClient();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingChildId, setEditingChildId] = useState<number | null>(null);
  const [childrenPage, setChildrenPage] = useState(0);
  const [routeFilter, setRouteFilter] = useState<number | undefined>(undefined);

  const { data: childrenPageData, isLoading } = useQuery({
    // 'roster' distinguishes this from DashboardPage's count-only query (different page/size args
    // against the same paginated endpoint must not share a cache entry) - InsurancePage now runs
    // its own separate full-list query instead of sharing this one, since it needs every child for
    // a dropdown while this page genuinely paginates.
    queryKey: ['children', schoolId, 'roster', childrenPage],
    queryFn: () => listChildrenForSchool(schoolId!, childrenPage, CHILDREN_PAGE_SIZE),
    enabled: schoolId != null && routeFilter == null,
  });
  const { data: routeChildren, isLoading: routeChildrenLoading } = useQuery({
    queryKey: ['children', schoolId, 'by-route', routeFilter],
    queryFn: () => listChildrenForRoute(schoolId!, routeFilter!),
    enabled: schoolId != null && routeFilter != null,
  });
  const children = routeFilter != null ? routeChildren : childrenPageData?.content;
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
      toast.success(t('schoolRiders.inviteCreated'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('schoolRiders.inviteFailed'))),
  });

  const deactivateChildMutation = useMutation({
    mutationFn: (childId: number) => deactivateChild(schoolId!, childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children', schoolId] });
      toast.success(t('schoolRiders.studentDeactivated'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('schoolRiders.deactivateStudentFailed'))),
  });

  const autoAssignMutation = useMutation({
    mutationFn: (childId: number) => autoAssignRoute(schoolId!, childId),
    onSuccess: (child) => {
      queryClient.invalidateQueries({ queryKey: ['children', schoolId] });
      toast.success(t('schoolRiders.assigned', { name: child.firstName, routeId: child.routeId }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('schoolRiders.autoAssignFailed'))),
  });

  const deactivateParentMutation = useMutation({
    mutationFn: (parentId: number) => deactivateParent(schoolId!, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parents', schoolId] });
      toast.success(t('schoolRiders.parentDeactivated'));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('schoolRiders.deactivateParentFailed'))),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{t('schoolRiders.title')}</h1>
        <Button onClick={() => setShowInviteModal(true)}>+ {t('schoolRiders.inviteParent')}</Button>
      </div>

      <Modal
        open={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteLink(null);
        }}
        title={t('schoolRiders.inviteParent')}
      >
        <p className="-mt-1 mb-4 text-sm text-slate-500">
          {t('schoolRiders.inviteHint')}
        </p>
        <form onSubmit={handleSubmit((values) => inviteMutation.mutate(values))} className="flex flex-wrap items-end gap-3">
          <Input label={t('schoolRiders.parentEmail')} type="email" required error={err(errors.email?.message)} {...register('email')} />
          <Input label={t('schoolRiders.parentPhone')} error={err(errors.phone?.message)} {...register('phone')} />
          <Button type="submit" isLoading={isSubmitting}>
            {t('schoolRiders.sendInvite')}
          </Button>
        </form>
        {inviteLink && (
          <p className="mt-3 break-all rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {t('schoolRiders.inviteLink')} <span className="font-mono">{inviteLink}</span>
          </p>
        )}
        {inviteMutation.isError && (
          <p className="mt-2 text-sm text-red-600">{backendErrorMessage(inviteMutation.error, t('schoolRiders.inviteFailed'))}</p>
        )}
      </Modal>

      <RouteFilterSelect schoolId={schoolId!} value={routeFilter} onChange={setRouteFilter} />

      <Card>
        <CardHeader>
          <CardTitle>{t('schoolRiders.enrolled')}</CardTitle>
        </CardHeader>
        <CardBody>
          {(isLoading || routeChildrenLoading) && <SkeletonTable rows={5} columns={3} />}
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
                    <p className="text-sm text-slate-500">{child.classSection ?? t('schoolRiders.noClass')}</p>
                    {(child.bloodType || child.allergies) && (
                      <p className="mt-1 text-xs text-slate-400">
                        {child.bloodType ? t('schoolRiders.bloodTypeValue', { type: child.bloodType }) : ''}
                        {child.bloodType && child.allergies ? ' · ' : ''}
                        {child.allergies ?? ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={child.status === 'ACTIVE' ? 'success' : 'warning'}>{t(`schoolRiders.childStatus.${child.status}`)}</Badge>
                    <span className="text-sm text-slate-500">{child.routeId ? t('driver.route', { id: child.routeId }) : t('schoolRiders.noRoute')}</span>
                    {child.insurancePolicyId ? (
                      <Badge tone="info">{t('schoolRiders.insured')}</Badge>
                    ) : (
                      <Badge tone="neutral">{t('schoolRiders.notInsured')}</Badge>
                    )}
                    {!child.routeId && (
                      <Button
                        variant="secondary"
                        isLoading={autoAssignMutation.isPending && autoAssignMutation.variables === child.id}
                        onClick={() => autoAssignMutation.mutate(child.id)}
                      >
                        {t('schoolRiders.autoAssign')}
                      </Button>
                    )}
                    <Button variant="secondary" onClick={() => setEditingChildId(child.id)}>
                      {t('common.edit')}
                    </Button>
                    {child.status === 'ACTIVE' && (
                      <Button
                        variant="danger"
                        isLoading={deactivateChildMutation.isPending && deactivateChildMutation.variables === child.id}
                        onClick={() => deactivateChildMutation.mutate(child.id)}
                      >
                        {t('schoolRiders.deactivate')}
                      </Button>
                    )}
                  </div>
                </li>
              ),
            )}
            {children?.length === 0 && (
              <p className="py-3 text-sm text-slate-500">
                {routeFilter != null ? t('schoolRiders.noChildrenOnRoute') : t('schoolRiders.noChildren')}
              </p>
            )}
          </ul>
          {routeFilter == null && childrenPageData && (
            <Pagination
              className="mt-4"
              page={childrenPage}
              totalPages={childrenPageData.totalPages}
              totalElements={childrenPageData.totalElements}
              pageSize={CHILDREN_PAGE_SIZE}
              onPageChange={setChildrenPage}
            />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('schoolRiders.parents')}</CardTitle>
        </CardHeader>
        <CardBody>
          {parentsLoading && <SkeletonTable rows={4} columns={2} />}
          <ul className="divide-y divide-slate-100">
            {parents?.map((parent) => (
              <li key={parent.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {parent.firstName || parent.lastName ? `${parent.firstName ?? ''} ${parent.lastName ?? ''}`.trim() : parent.email}
                  </p>
                  <p className="text-sm text-slate-500">{parent.email ?? t('schoolRiders.noEmail')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={parent.accountStatus === 'ACTIVE' ? 'success' : 'neutral'}>{t(`schoolRiders.accountStatus.${parent.accountStatus}`, { defaultValue: parent.accountStatus })}</Badge>
                  {parent.accountStatus !== 'DISABLED' && (
                    <Button
                      variant="danger"
                      isLoading={deactivateParentMutation.isPending && deactivateParentMutation.variables === parent.id}
                      onClick={() => deactivateParentMutation.mutate(parent.id)}
                    >
                      {t('schoolRiders.deactivate')}
                    </Button>
                  )}
                </div>
              </li>
            ))}
            {parents?.length === 0 && <p className="py-3 text-sm text-slate-500">{t('schoolRiders.noParents')}</p>}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
