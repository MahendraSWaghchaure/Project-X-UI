import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArrivalApprovalDialog } from './ArrivalApprovalDialog';
import { ParentArrivalApproval } from './ParentArrivalApproval';
import { useAuthStore } from '@/lib/authStore';
import type { Arrival } from '@/types/attendance';

vi.mock('@/lib/api/attendance', () => ({
  listMyPendingArrivals: vi.fn(),
  respondToArrival: vi.fn(),
}));
// The live-topic hook opens a real SockJS/STOMP connection; here we only capture the topic it was asked to follow.
const liveTopic = vi.fn();
vi.mock('@/hooks/useLiveTopic', () => ({
  useLiveTopic: (topics: (string | null)[], cb: () => void, opts?: unknown) => liveTopic(topics, cb, opts),
}));

const arrival: Arrival = {
  id: 7,
  tripId: 3,
  childId: 11,
  studentId: 21,
  childName: 'Asha Verma',
  kind: 'SCHOOL_DROP',
  driverEventAt: '2026-11-07T08:12:00',
  schoolConfirm: 'PENDING',
  parentResponse: 'PENDING',
  outcome: 'PENDING',
  updatedAt: '2026-11-07T08:12:00',
};

describe('ArrivalApprovalDialog', () => {
  it('renders nothing without an arrival', () => {
    render(<ArrivalApprovalDialog arrival={null} onRespond={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('approves with "Yes, child is safe" and no note', async () => {
    const onRespond = vi.fn();
    render(<ArrivalApprovalDialog arrival={arrival} onRespond={onRespond} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Asha Verma was dropped at school/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yes, child is safe' }));

    expect(onRespond).toHaveBeenCalledWith('APPROVED', undefined);
  });

  it('disputes with "This is wrong" and sends the typed note', async () => {
    const onRespond = vi.fn();
    render(<ArrivalApprovalDialog arrival={arrival} onRespond={onRespond} onClose={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Add a note (optional)'), '  Child is at home  ');
    await userEvent.click(screen.getByRole('button', { name: 'This is wrong' }));

    expect(onRespond).toHaveBeenCalledWith('DISPUTED', 'Child is at home');
  });

  it('keeps focus in the note field when the parent re-renders with a fresh inline onClose', async () => {
    const { rerender } = render(<ArrivalApprovalDialog arrival={arrival} onRespond={vi.fn()} onClose={() => {}} />);
    const note = screen.getByLabelText('Add a note (optional)');
    await userEvent.click(note);
    await userEvent.type(note, 'Child is');
    rerender(<ArrivalApprovalDialog arrival={arrival} onRespond={vi.fn()} onClose={() => {}} />);
    await userEvent.type(note, ' at home');

    expect(note).toHaveValue('Child is at home');
    expect(note).toHaveFocus();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/Asha Verma was dropped at school/);
  });

  it('"Decide later" closes without responding', async () => {
    const onRespond = vi.fn();
    const onClose = vi.fn();
    render(<ArrivalApprovalDialog arrival={arrival} moreWaiting={2} onRespond={onRespond} onClose={onClose} />);

    expect(screen.getByText('2 more waiting')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Decide later' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(onRespond).not.toHaveBeenCalled();
  });
});

describe('ParentArrivalApproval (app-wide container)', () => {
  beforeEach(async () => {
    liveTopic.mockClear();
    useAuthStore.setState({ userId: 42 });
    const api = await import('@/lib/api/attendance');
    vi.mocked(api.listMyPendingArrivals).mockReset();
    vi.mocked(api.respondToArrival).mockReset();
  });

  function renderContainer() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <ParentArrivalApproval />
      </QueryClientProvider>,
    );
  }

  it('opens from the pending-on-load list and posts the parent answer, then closes', async () => {
    const api = await import('@/lib/api/attendance');
    vi.mocked(api.listMyPendingArrivals).mockResolvedValueOnce([arrival]).mockResolvedValue([]);
    vi.mocked(api.respondToArrival).mockResolvedValue({ ...arrival, parentResponse: 'APPROVED' });

    renderContainer();
    await userEvent.click(await screen.findByRole('button', { name: 'Yes, child is safe' }));

    await waitFor(() => expect(api.respondToArrival).toHaveBeenCalled());
    expect(vi.mocked(api.respondToArrival).mock.calls[0]).toEqual([7, { response: 'APPROVED', note: undefined }]);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('stays closed when nothing is pending and follows the parent topic for live frames', async () => {
    const api = await import('@/lib/api/attendance');
    vi.mocked(api.listMyPendingArrivals).mockResolvedValue([]);

    renderContainer();

    await waitFor(() => expect(api.listMyPendingArrivals).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // refetchOnConnect so an arrival that landed while the socket was down still opens the prompt.
    expect(liveTopic).toHaveBeenCalledWith(['/topic/parent/42/arrivals'], expect.any(Function), { refetchOnConnect: true });
  });
});
