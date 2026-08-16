import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createChildAsParent, listMyChildren, updateChildAsParent, type UpdateChildRequest } from '@/lib/api/children';
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
                <li key={child.id} className="flex items-center justify-between gap-4 py-3">
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
