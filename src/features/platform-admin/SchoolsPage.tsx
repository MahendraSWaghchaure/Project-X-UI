import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSchool,
  getSchoolStatusCounts,
  listPlatformSchools,
  setSchoolStatus,
  updateSchool,
  type CreateSchoolRequest,
  type UpdateSchoolRequest,
} from '@/lib/api/schools';
import { getDistrict, listCountries, listDistricts, listStates } from '@/lib/api/geo';
import { toast } from '@/lib/toastStore';
import { backendErrorMessage } from '@/lib/errorMessage';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { DataTable, type DataColumn } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { Tabs } from '@/components/ui/Tabs';
import { LocationPicker } from '@/components/ui/LocationPicker';
import { Modal } from '@/components/ui/Modal';
import { GeoFilterBar, type GeoSelection } from '@/components/ui/GeoFilterBar';
import { useResolvedDistrictIds } from '@/lib/hooks/useResolvedDistrictIds';
import type { School, SchoolStatus } from '@/types/school';
import { optionalPhoneSchema, phoneSchema } from '@/lib/validation';

const PAGE_SIZE = 20;
type StatusTab = 'ALL' | SchoolStatus;

function DistrictAssignmentPicker({
  districtId,
  onChange,
  onGeoResolved,
}: {
  districtId: number | undefined;
  onChange: (districtId: number | undefined) => void;
  /** B3: fires with the best available fly-to point (district's own coords, else its state's) whenever the
   * selection resolves to one - null while nothing is resolved yet. Optional: callers that don't need the map
   * to fly (e.g. the edit form) can omit it. */
  onGeoResolved?: (point: { latitude: number; longitude: number } | null) => void;
}) {
  const { t } = useTranslation();
  const [countryId, setCountryId] = useState<number | undefined>();
  const [stateId, setStateId] = useState<number | undefined>();
  const [prefilled, setPrefilled] = useState(false);

  const { data: prefillDistrict } = useQuery({
    queryKey: ['geo', 'district-prefill', districtId],
    queryFn: () => getDistrict(districtId!),
    enabled: !!districtId && !prefilled,
  });
  useEffect(() => {
    if (prefillDistrict && !prefilled) {
      setCountryId(prefillDistrict.countryId);
      setStateId(prefillDistrict.stateId);
      setPrefilled(true);
    }
  }, [prefillDistrict, prefilled]);

  const { data: countries } = useQuery({ queryKey: ['geo', 'countries'], queryFn: listCountries });
  const { data: states } = useQuery({
    queryKey: ['geo', 'states', countryId],
    queryFn: () => listStates(countryId!),
    enabled: !!countryId,
  });
  const { data: districts } = useQuery({
    queryKey: ['geo', 'districts', stateId],
    queryFn: () => listDistricts({ stateId }),
    enabled: !!stateId,
  });

  // B3: resolve the best fly-to point as soon as a district is selected (its own coords, else its state's) and
  // report it upward; nothing resolved yet -> null, so the caller knows not to fly.
  useEffect(() => {
    if (!onGeoResolved) return;
    const selected = districts?.find((d) => d.id === districtId);
    if (!selected) {
      onGeoResolved(null);
      return;
    }
    const latitude = selected.latitude ?? selected.stateLatitude;
    const longitude = selected.longitude ?? selected.stateLongitude;
    onGeoResolved(latitude != null && longitude != null ? { latitude, longitude } : null);
  }, [districtId, districts, onGeoResolved]);

  return (
    <>
      <Select
        label={t('platformSchools.country')}
        required
        value={countryId ?? ''}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : undefined;
          setCountryId(id);
          setStateId(undefined);
          onChange(undefined);
        }}
      >
        <option value="">{t('platformSchools.selectCountry')}</option>
        {countries?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        label={t('platformSchools.state')}
        required
        value={stateId ?? ''}
        disabled={!countryId}
        onChange={(e) => {
          const id = e.target.value ? Number(e.target.value) : undefined;
          setStateId(id);
          onChange(undefined);
        }}
      >
        <option value="">{t('platformSchools.selectState')}</option>
        {states?.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select
        label={t('platformSchools.district')}
        required
        value={districtId ?? ''}
        disabled={!stateId}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
      >
        <option value="">{t('platformSchools.selectDistrict')}</option>
        {districts?.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
    </>
  );
}

// B2: name/city/address/country+state+district/contact email/contact phone are all required on the onboarding form.
const schema = z.object({
  name: z.string().min(1, 'validation.required'),
  address: z.string().min(1, 'validation.required'),
  city: z.string().min(1, 'validation.required'),
  districtId: z.number({ required_error: 'validation.required', invalid_type_error: 'validation.required' }),
  contactPhone: phoneSchema,
  contactEmail: z.string().min(1, 'validation.required').email('validation.email'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  adminFirstName: z.string().min(1, 'validation.required'),
  adminLastName: z.string().min(1, 'validation.required'),
  adminEmail: z.string().email('validation.email'),
  adminPassword: z.string().min(8, 'validation.passwordMin'),
});
type FormValues = z.infer<typeof schema>;

const editSchema = z.object({
  name: z.string().min(1, 'validation.required'),
  address: z.string().min(1, 'validation.required'),
  city: z.string().min(1, 'validation.required'),
  state: z.string().optional(),
  pincode: z.string().optional(),
  districtId: z.number().optional(),
  contactPhone: optionalPhoneSchema,
  contactEmail: z.string().email('validation.email').optional().or(z.literal('')),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});
type EditFormValues = z.infer<typeof editSchema>;

function EditSchoolForm({ school, onDone }: { school: School; onDone: () => void }) {
  const { t } = useTranslation();
  const err = (m?: string) => (m ? t(m) : undefined);
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: school.name,
      address: school.address,
      city: school.city,
      state: school.state ?? '',
      pincode: school.pincode ?? '',
      districtId: school.districtId ?? undefined,
      contactPhone: school.contactPhone ?? '',
      contactEmail: school.contactEmail ?? '',
      latitude: school.location?.latitude,
      longitude: school.location?.longitude,
    },
  });
  const latitude = watch('latitude');
  const longitude = watch('longitude');
  const districtId = watch('districtId');

  const updateMutation = useMutation({
    mutationFn: (values: UpdateSchoolRequest) => updateSchool(school.id, values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success(t('platformSchools.updated'));
      onDone();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('platformSchools.updateFailed'))),
  });

  return (
    <form
      onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      <Input id={`school-name-${school.id}`} label={t('platformSchools.schoolName')} error={err(errors.name?.message)} {...register('name')} />
      <Input id={`school-city-${school.id}`} label={t('platformSchools.city')} error={err(errors.city?.message)} {...register('city')} />
      <Input
        id={`school-address-${school.id}`}
        label={t('common.address')}
        className="sm:col-span-2"
        error={err(errors.address?.message)}
        {...register('address')}
      />
      <Input id={`school-state-${school.id}`} label={t('platformSchools.state')} {...register('state')} />
      <Input id={`school-pincode-${school.id}`} label={t('platformSchools.pincode')} {...register('pincode')} />
      <DistrictAssignmentPicker districtId={districtId} onChange={(id) => setValue('districtId', id)} />
      <Input
        id={`school-contact-phone-${school.id}`}
        label={t('platformSchools.contactPhone')}
        error={err(errors.contactPhone?.message)}
        {...register('contactPhone')}
      />
      <Input
        id={`school-contact-email-${school.id}`}
        label={t('platformSchools.contactEmail')}
        type="email"
        error={err(errors.contactEmail?.message)}
        {...register('contactEmail')}
      />
      <LocationPicker
        label={t('platformSchools.location')}
        latitude={latitude}
        longitude={longitude}
        onChange={(point) => {
          setValue('latitude', point.latitude);
          setValue('longitude', point.longitude);
        }}
        height={220}
      />
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

/** Suspending needs a reason (shown in the list and required by the server); reactivating does not. */
function SuspendSchoolModal({ school, onClose }: { school: School | null; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (school) {
      setReason('');
      setTouched(false);
    }
  }, [school]);

  const mutation = useMutation({
    mutationFn: () => setSchoolStatus(school!.id, 'SUSPENDED', reason.trim()),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success(t('platformSchools.suspendedToast', { name: updated.name }));
      onClose();
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('platformSchools.statusFailed'))),
  });

  const missing = touched && reason.trim().length === 0;
  return (
    <Modal open={school !== null} onClose={onClose} title={t('platformSchools.suspendTitle', { name: school?.name ?? '' })}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTouched(true);
          if (reason.trim().length > 0) mutation.mutate();
        }}
      >
        <p className="text-sm text-slate-600">{t('platformSchools.suspendHelp')}</p>
        <Textarea
          label={t('platformSchools.suspensionReason')}
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
          error={missing ? t('common.reasonRequired') : undefined}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="danger" isLoading={mutation.isPending}>
            {t('platformSchools.suspend')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function SchoolsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const err = (m?: string) => (m ? t(m) : undefined);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<StatusTab>('ALL');
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<School | null>(null);
  const [suspending, setSuspending] = useState<School | null>(null);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [geoSelection, setGeoSelection] = useState<GeoSelection>({});
  const { districtIds } = useResolvedDistrictIds(geoSelection);
  const status = tab === 'ALL' ? undefined : tab;

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['schools', status ?? 'ALL', districtIds, page],
    queryFn: () => listPlatformSchools({ status, districtIds, page, size: PAGE_SIZE }),
  });
  const { data: counts } = useQuery({ queryKey: ['schools', 'counts'], queryFn: getSchoolStatusCounts });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });
  const newSchoolLatitude = watch('latitude');
  const newSchoolLongitude = watch('longitude');
  const newSchoolDistrictId = watch('districtId');
  // B3: the map flies here once country+state+district resolve to coordinates (district's own, else its state's).
  const [newSchoolFlyTo, setNewSchoolFlyTo] = useState<{ latitude: number; longitude: number } | null>(null);

  const createMutation = useMutation({
    mutationFn: (values: CreateSchoolRequest) => createSchool(values),
    onSuccess: (school) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      reset();
      setShowOnboardModal(false);
      toast.success(t('platformSchools.created', { name: school.name }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('platformSchools.createFailed'))),
  });

  const reactivateMutation = useMutation({
    mutationFn: (schoolId: number) => setSchoolStatus(schoolId, 'ACTIVE'),
    onSuccess: (school) => {
      queryClient.invalidateQueries({ queryKey: ['schools'] });
      toast.success(t('platformSchools.reactivatedToast', { name: school.name }));
    },
    onError: (error) => toast.error(backendErrorMessage(error, t('platformSchools.statusFailed'))),
  });

  const changeTab = (next: string) => {
    setTab(next as StatusTab);
    setPage(0);
  };

  const columns: DataColumn<School>[] = [
    {
      key: 'name',
      header: t('common.school'),
      primary: true,
      cell: (s) => (
        <div>
          <p className="font-medium text-slate-900">{s.name}</p>
          <p className="text-xs text-slate-500">{s.address ? `${s.city} — ${s.address}` : s.city}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      cell: (s) => <Badge tone={s.status === 'ACTIVE' ? 'success' : 'warning'}>{t(`enums.schoolStatus.${s.status}`, { defaultValue: s.status })}</Badge>,
    },
    {
      key: 'reason',
      header: t('platformSchools.suspensionReason'),
      cell: (s) => (s.status === 'SUSPENDED' ? (s.statusReason ?? t('platformSchools.noReason')) : '—'),
    },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      actions: true,
      className: 'text-right',
      cell: (s) => (
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={(e) => {
              e.stopPropagation();
              setEditing(s);
            }}
          >
            {t('common.edit')}
          </Button>
          {s.status === 'ACTIVE' ? (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                setSuspending(s);
              }}
            >
              {t('platformSchools.suspend')}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              isLoading={reactivateMutation.isPending && reactivateMutation.variables === s.id}
              onClick={(e) => {
                e.stopPropagation();
                reactivateMutation.mutate(s.id);
              }}
            >
              {t('platformSchools.reactivate')}
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('platformSchools.title')}
        actions={<Button onClick={() => setShowOnboardModal(true)}>{t('platformSchools.onboard')}</Button>}
      />

      <Modal open={showOnboardModal} onClose={() => setShowOnboardModal(false)} title={t('platformSchools.onboardTitle')} size="lg">
        <form
          onSubmit={handleSubmit((values) => createMutation.mutate(values))}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <Input label={t('platformSchools.schoolName')} required error={err(errors.name?.message)} {...register('name')} />
          <Input label={t('platformSchools.city')} required error={err(errors.city?.message)} {...register('city')} />
          <Input label={t('common.address')} required className="sm:col-span-2" error={err(errors.address?.message)} {...register('address')} />
          <DistrictAssignmentPicker
            districtId={newSchoolDistrictId}
            onChange={(id) => setValue('districtId', id as number, { shouldValidate: errors.districtId != null })}
            onGeoResolved={setNewSchoolFlyTo}
          />
          {errors.districtId && <p className="-mt-2 text-xs font-medium text-red-600 sm:col-span-2">{err(errors.districtId.message)}</p>}
          <Input label={t('platformSchools.contactPhone')} required error={err(errors.contactPhone?.message)} {...register('contactPhone')} />
          <Input label={t('platformSchools.contactEmail')} type="email" required error={err(errors.contactEmail?.message)} {...register('contactEmail')} />
          <LocationPicker
            label={t('platformSchools.location')}
            latitude={newSchoolLatitude}
            longitude={newSchoolLongitude}
            flyTo={newSchoolFlyTo}
            onChange={(point) => {
              setValue('latitude', point.latitude);
              setValue('longitude', point.longitude);
            }}
            height={220}
          />
          <div className="border-t border-slate-100 pt-4 text-sm font-medium text-slate-500 sm:col-span-2">
            {t('platformSchools.firstAdmin')}
          </div>
          <Input label={t('platformSchools.adminFirstName')} required error={err(errors.adminFirstName?.message)} {...register('adminFirstName')} />
          <Input label={t('platformSchools.adminLastName')} required error={err(errors.adminLastName?.message)} {...register('adminLastName')} />
          <Input label={t('platformSchools.adminEmail')} type="email" required error={err(errors.adminEmail?.message)} {...register('adminEmail')} />
          <Input
            label={t('platformSchools.adminPassword')}
            type="password"
            required
            error={err(errors.adminPassword?.message)}
            {...register('adminPassword')}
          />
          {createMutation.isError && (
            <p className="text-sm text-red-600 sm:col-span-2">
              {backendErrorMessage(createMutation.error, t('platformSchools.createFailedHelp'))}
            </p>
          )}
          <Button type="submit" isLoading={isSubmitting} className="sm:col-span-2 sm:w-fit">
            {t('platformSchools.create')}
          </Button>
        </form>
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={t('platformSchools.editTitle')} size="lg">
        {editing && <EditSchoolForm key={editing.id} school={editing} onDone={() => setEditing(null)} />}
      </Modal>

      <SuspendSchoolModal school={suspending} onClose={() => setSuspending(null)} />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label={t('platformSchools.statusFilter')}
          value={tab}
          onChange={changeTab}
          tabs={[
            { id: 'ALL', label: t('common.all'), count: counts?.all },
            { id: 'ACTIVE', label: t('enums.schoolStatus.ACTIVE'), count: counts?.active },
            { id: 'SUSPENDED', label: t('enums.schoolStatus.SUSPENDED'), count: counts?.suspended },
          ]}
        />
      </div>
      <GeoFilterBar
        value={geoSelection}
        onChange={(next) => {
          setGeoSelection(next);
          setPage(0);
        }}
      />

      <DataTable
        caption={t('platformSchools.listTitle')}
        columns={columns}
        rows={pageData?.content}
        isLoading={isLoading}
        getRowKey={(s) => s.id}
        onRowClick={(s) => navigate(`/platform-admin/schools/${s.id}`)}
        empty={
          <EmptyState
            icon={Building2}
            title={tab === 'ALL' ? t('platformSchools.emptyTitle') : t('platformSchools.emptyFilteredTitle', { status: t(`enums.schoolStatus.${tab}`) })}
          />
        }
      />
      <Pagination
        page={pageData?.page ?? 0}
        totalPages={pageData?.totalPages ?? 0}
        totalElements={pageData?.totalElements}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
