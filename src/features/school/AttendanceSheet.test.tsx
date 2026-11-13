import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendanceSheet } from './AttendanceSheet';
import { useAuthStore } from '@/lib/authStore';
import { todayIst } from '@/lib/dates';
import type { AttendanceRow } from '@/types/attendance';

vi.mock('@/lib/api/attendance', () => ({
  getAttendanceSheet: vi.fn(),
  saveAttendanceBulk: vi.fn(),
  listSchoolArrivals: vi.fn(),
}));
vi.mock('@/hooks/useLiveTopic', () => ({ useLiveTopic: vi.fn() }));

const rows: AttendanceRow[] = [
  { studentId: 1, name: 'Asha Verma', rollNo: '1', subscription: 'SUBSCRIBED', status: null, arrival: 'SAFE' },
  { studentId: 2, name: 'Ravi Kumar', rollNo: '2', subscription: 'NON_SUBSCRIBED', status: 'PRESENT', arrival: null },
  { studentId: 3, name: 'Meena Rao', rollNo: '3', subscription: 'SUBSCRIBED', status: null, arrival: 'ALERT' },
];

function renderSheet(props: Partial<{ classroomId: number; canMark: boolean }> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AttendanceSheet classroomId={props.classroomId ?? 9} canMark={props.canMark} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function rowFor(name: string) {
  return screen.getByText(name).closest('tr') as HTMLElement;
}

describe('AttendanceSheet', () => {
  beforeEach(async () => {
    useAuthStore.setState({ schoolId: 4, role: 'SCHOOL_ADMIN' });
    const api = await import('@/lib/api/attendance');
    vi.mocked(api.getAttendanceSheet).mockReset();
    vi.mocked(api.getAttendanceSheet).mockResolvedValue(rows);
    vi.mocked(api.listSchoolArrivals).mockReset();
    vi.mocked(api.listSchoolArrivals).mockResolvedValue({
      content: [
        {
          id: 50, tripId: 1, childId: 5, studentId: 3, childName: 'Meena Rao', kind: 'SCHOOL_DROP',
          driverEventAt: '2026-11-07T08:12:00Z', schoolConfirm: 'PRESENT', parentResponse: 'DISPUTED',
          outcome: 'ALERT', updatedAt: '2026-11-07T08:12:00Z', parentNote: 'She is home with me',
        },
      ],
      page: 0, size: 100, totalElements: 1, totalPages: 1, last: true,
    });
    vi.mocked(api.saveAttendanceBulk).mockReset();
    vi.mocked(api.saveAttendanceBulk).mockResolvedValue({ date: todayIst(), classroomId: 9, total: 3, inserted: 3, updated: 0, unchanged: 0 });
  });

  it('loads the sheet, shows summary tiles, arrival chips and the mismatch explanation', async () => {
    renderSheet();

    await screen.findByText('Asha Verma');
    const api = await import('@/lib/api/attendance');
    expect(api.getAttendanceSheet).toHaveBeenCalledWith(4, todayIst(), 9);
    await waitFor(() => expect(api.listSchoolArrivals).toHaveBeenCalledWith(4, { date: todayIst(), outcome: 'ALERT', page: 0, size: 100 }));

    const tiles = screen.getByRole('region', { name: 'School-wide summary for the selected date' });
    expect(within(tiles).getByText('Mismatches').nextElementSibling).toHaveTextContent('1');
    expect(within(tiles).getByText('Present').nextElementSibling).toHaveTextContent('1');

    expect(within(rowFor('Asha Verma')).getByText('Safe')).toBeInTheDocument();
    expect(within(rowFor('Meena Rao')).getByText('Alert')).toBeInTheDocument();
    expect(await within(rowFor('Meena Rao')).findByText('She is home with me')).toBeInTheDocument();
    expect(within(rowFor('Ravi Kumar')).getByText('Not on Sunju')).toBeInTheDocument();
  });

  it('marks one student per tap and bulk-saves only the changed entries', async () => {
    renderSheet();
    await screen.findByText('Asha Verma');
    const api = await import('@/lib/api/attendance');

    // Nothing edited yet: save is disabled.
    expect(screen.getByRole('button', { name: /Save attendance/ })).toBeDisabled();

    await userEvent.click(within(rowFor('Asha Verma')).getByRole('button', { name: 'Late' }));
    await userEvent.click(within(rowFor('Meena Rao')).getByRole('button', { name: 'Absent' }));
    expect(within(rowFor('Asha Verma')).getByRole('button', { name: 'Late' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /Save attendance/ }));

    await waitFor(() => expect(api.saveAttendanceBulk).toHaveBeenCalledTimes(1));
    expect(api.saveAttendanceBulk).toHaveBeenCalledWith(4, {
      date: todayIst(),
      classroomId: 9,
      entries: [
        { studentId: 1, status: 'LATE' },
        { studentId: 3, status: 'ABSENT' },
      ],
    });
  });

  it('"Mark all present" only fills unmarked students and never overwrites a saved ABSENT/LATE', async () => {
    const api = await import('@/lib/api/attendance');
    vi.mocked(api.getAttendanceSheet).mockResolvedValue([
      { studentId: 1, name: 'Asha Verma', rollNo: '1', subscription: 'SUBSCRIBED', status: null, arrival: null },
      { studentId: 2, name: 'Ravi Kumar', rollNo: '2', subscription: 'SUBSCRIBED', status: 'ABSENT', arrival: null },
      { studentId: 3, name: 'Meena Rao', rollNo: '3', subscription: 'SUBSCRIBED', status: 'LATE', arrival: null },
      { studentId: 4, name: 'Dev Nair', rollNo: '4', subscription: 'SUBSCRIBED', status: null, arrival: null },
    ]);
    renderSheet();
    await screen.findByText('Asha Verma');

    // Dev was already tapped Late this session: Mark all present must keep that too.
    await userEvent.click(within(rowFor('Dev Nair')).getByRole('button', { name: 'Late' }));
    await userEvent.click(screen.getByRole('button', { name: /Mark all present/ }));

    expect(within(rowFor('Asha Verma')).getByRole('button', { name: 'Present' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(rowFor('Ravi Kumar')).getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(rowFor('Meena Rao')).getByRole('button', { name: 'Late' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(rowFor('Dev Nair')).getByRole('button', { name: 'Late' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /Save attendance/ }));
    await waitFor(() => expect(api.saveAttendanceBulk).toHaveBeenCalledTimes(1));
    expect(api.saveAttendanceBulk).toHaveBeenCalledWith(4, {
      date: todayIst(),
      classroomId: 9,
      entries: [
        { studentId: 1, status: 'PRESENT' },
        { studentId: 4, status: 'LATE' },
      ],
    });
  });

  it('disables the status toggles when canMark is false (lecturer / read-only view)', async () => {
    renderSheet({ canMark: false });
    await screen.findByText('Asha Verma');

    expect(within(rowFor('Asha Verma')).getByRole('button', { name: 'Present' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save attendance/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mark all present/ })).not.toBeInTheDocument();
  });
});
