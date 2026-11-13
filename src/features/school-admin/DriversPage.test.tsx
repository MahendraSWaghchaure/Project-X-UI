import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DriversPage } from './DriversPage';
import { useAuthStore } from '@/lib/authStore';
import type { Driver } from '@/types/people';

vi.mock('@/lib/api/drivers', () => ({
  listDrivers: vi.fn(),
  createDriver: vi.fn(),
  updateDriver: vi.fn(),
  updateDriverEmploymentStatus: vi.fn(),
  updateDriverVerification: vi.fn(),
  claimDriver: vi.fn(),
  listIndependentDrivers: vi.fn(),
}));

vi.mock('@/lib/api/routes', () => ({
  listRoutes: vi.fn().mockResolvedValue([]),
}));

const activeDriver: Driver = {
  id: 1,
  schoolId: 4,
  firstName: 'Ramesh',
  lastName: 'Patil',
  phone: '9876543210',
  licenseNumber: 'MH-1',
  licenseExpiry: null,
  insurancePolicyId: null,
  baseSalaryMonthly: null,
  vehicleId: null,
  employmentStatus: 'ACTIVE',
  verificationStatus: 'PENDING',
  verifiedAt: null,
};

const independentDriver: Driver = {
  ...activeDriver,
  id: 2,
  schoolId: null,
  firstName: 'Suresh',
  lastName: 'Kumar',
  vehicleId: 9,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DriversPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DriversPage', () => {
  beforeEach(async () => {
    // Without this, a mock's call history (and any mockResolvedValue override) leaks across tests
    // in this file - caught by the "blocks terminating with no reason" test seeing the previous
    // test's call to updateDriverEmploymentStatus.
    vi.clearAllMocks();
    useAuthStore.setState({ schoolId: 4 });
    const drivers = await import('@/lib/api/drivers');
    vi.mocked(drivers.listDrivers).mockResolvedValue([activeDriver]);
    vi.mocked(drivers.listIndependentDrivers).mockResolvedValue([independentDriver]);
  });

  it('lists the school roster and the independent driver pool', async () => {
    renderPage();

    expect(await screen.findByText('Ramesh Patil')).toBeInTheDocument();
    expect(await screen.findByText('Suresh Kumar')).toBeInTheDocument();
    expect(screen.getByText('has their own vehicle', { exact: false })).toBeInTheDocument();
  });

  it('terminates a driver via the required-reason modal and refreshes the roster', async () => {
    const drivers = await import('@/lib/api/drivers');
    vi.mocked(drivers.updateDriverEmploymentStatus).mockResolvedValue({ ...activeDriver, employmentStatus: 'TERMINATED' });
    renderPage();
    await screen.findByText('Ramesh Patil');

    // DataTable renders a real <table> in jsdom (useMediaQuery's fallback is desktop - see its own
    // doc comment), so each driver is a table row, not an <li> (that shape is mobile-card-only).
    const row = screen.getByRole('row', { name: /Ramesh Patil/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Terminate' }));

    // Terminating requires a reason (StatusReasonModal) - it no longer fires on a single click.
    // The modal's own submit button has the same accessible name as the row's trigger button, so
    // everything past this point is scoped to the dialog to avoid ambiguity.
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Reason'), 'Repeated late arrivals');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Terminate' }));

    await waitFor(() => expect(drivers.updateDriverEmploymentStatus).toHaveBeenCalledWith(4, 1, 'TERMINATED', 'Repeated late arrivals'));
  });

  it('blocks terminating a driver with no reason entered', async () => {
    const drivers = await import('@/lib/api/drivers');
    renderPage();
    await screen.findByText('Ramesh Patil');

    const row = screen.getByRole('row', { name: /Ramesh Patil/ });
    await userEvent.click(within(row).getByRole('button', { name: 'Terminate' }));

    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Terminate' }));

    expect(await within(dialog).findByText('A reason is required')).toBeInTheDocument();
    expect(drivers.updateDriverEmploymentStatus).not.toHaveBeenCalled();
  });

  it('hires an independent driver, moving them out of the pool', async () => {
    const drivers = await import('@/lib/api/drivers');
    vi.mocked(drivers.claimDriver).mockResolvedValue({ ...independentDriver, schoolId: 4 });
    renderPage();
    await screen.findByText('Suresh Kumar');

    await userEvent.click(screen.getByRole('button', { name: 'Hire' }));

    await waitFor(() => expect(drivers.claimDriver).toHaveBeenCalledWith(4, 2));
  });

  it('opens an edit form pre-filled with the driver’s details', async () => {
    renderPage();
    await screen.findByText('Ramesh Patil');
    const row = screen.getByRole('row', { name: /Ramesh Patil/ });

    await userEvent.click(within(row).getByRole('button', { name: 'Edit' }));

    expect(screen.getByDisplayValue('Ramesh')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Patil')).toBeInTheDocument();
    expect(screen.getByDisplayValue('MH-1')).toBeInTheDocument();
  });
});
