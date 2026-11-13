import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StudentDetailPage } from './StudentDetailPage';
import { useAuthStore } from '@/lib/authStore';
import type { Student } from '@/types/attendance';

vi.mock('@/lib/api/attendance', () => ({
  getStudent: vi.fn(),
  listClassrooms: vi.fn(),
  listMyClassrooms: vi.fn().mockResolvedValue([]),
  listAssessments: vi.fn(),
  listComments: vi.fn(),
  getAttendanceSheet: vi.fn(),
  createAssessment: vi.fn(),
  createComment: vi.fn(),
  updateStudent: vi.fn(),
  linkStudentToChild: vi.fn(),
  unlinkStudentFromChild: vi.fn(),
}));

const student: Student = {
  id: 21,
  schoolId: 4,
  classroomId: 9,
  rollNo: '12',
  firstName: 'Asha',
  lastName: 'Verma',
  guardianName: 'Rekha Verma',
  guardianPhone: '9876543210',
  marketingConsent: false,
  leadSource: 'SCHOOL_IMPORT',
  subscription: 'NON_SUBSCRIBED',
  childId: null,
  version: 3,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/school/students/21']}>
        <Routes>
          <Route path="/school/students/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentDetailPage roster management', () => {
  beforeEach(async () => {
    const api = await import('@/lib/api/attendance');
    for (const fn of [api.updateStudent, api.linkStudentToChild, api.unlinkStudentFromChild]) vi.mocked(fn).mockReset();
    vi.mocked(api.getStudent).mockResolvedValue(student);
    vi.mocked(api.listClassrooms).mockResolvedValue([{ id: 9, name: '5', section: 'A' }]);
    vi.mocked(api.listAssessments).mockResolvedValue([]);
    vi.mocked(api.listComments).mockResolvedValue([]);
  });

  it('hides edit and link controls from teachers', async () => {
    useAuthStore.setState({ schoolId: 4, role: 'TEACHER' });
    renderPage();
    await screen.findByRole('heading', { name: 'Asha Verma' });

    expect(screen.queryByRole('button', { name: /Edit student/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Sunju child link')).not.toBeInTheDocument();
  });

  it('lets a school admin edit with the current version and link a child', async () => {
    useAuthStore.setState({ schoolId: 4, role: 'SCHOOL_ADMIN' });
    const api = await import('@/lib/api/attendance');
    vi.mocked(api.updateStudent).mockResolvedValue({ ...student, firstName: 'Ashaa', version: 4 });
    vi.mocked(api.linkStudentToChild).mockResolvedValue({ ...student, childId: 77, subscription: 'SUBSCRIBED' });
    renderPage();
    await screen.findByRole('heading', { name: 'Asha Verma' });

    await userEvent.click(screen.getByRole('button', { name: /Edit student/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit student details' });
    const first = within(dialog).getByLabelText('First name');
    expect(first).toHaveValue('Asha');
    await userEvent.clear(first);
    await userEvent.type(first, 'Ashaa');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(api.updateStudent).toHaveBeenCalledTimes(1));
    const [sid, id, body] = vi.mocked(api.updateStudent).mock.calls[0];
    expect([sid, id]).toEqual([4, 21]);
    expect(body).toMatchObject({ firstName: 'Ashaa', lastName: 'Verma', guardianPhone: '9876543210', classroomId: 9, version: 3 });

    await userEvent.type(screen.getByLabelText('Sunju child ID'), '77');
    await userEvent.click(screen.getByRole('button', { name: 'Link child' }));
    await waitFor(() => expect(api.linkStudentToChild).toHaveBeenCalledWith(4, 21, 77));
  });

  it('confirms before unlinking a linked student', async () => {
    useAuthStore.setState({ schoolId: 4, role: 'SCHOOL_ADMIN' });
    const api = await import('@/lib/api/attendance');
    vi.mocked(api.getStudent).mockResolvedValue({ ...student, childId: 77, subscription: 'SUBSCRIBED' });
    vi.mocked(api.unlinkStudentFromChild).mockResolvedValue(student);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Unlink' }));
    expect(api.unlinkStudentFromChild).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unlink' }));

    await waitFor(() => expect(api.unlinkStudentFromChild).toHaveBeenCalledWith(4, 21));
  });
});
