import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PublicFooter } from './PublicFooter';
import { useToastStore } from '@/lib/toastStore';

const submitInquiry = vi.fn();
vi.mock('@/lib/api/inquiries', () => ({ submitInquiry: (...args: unknown[]) => submitInquiry(...args) }));

function renderFooter() {
  return render(
    <MemoryRouter>
      <PublicFooter />
    </MemoryRouter>,
  );
}

describe('PublicFooter contact + inquiry modal', () => {
  beforeEach(() => {
    submitInquiry.mockReset();
    useToastStore.setState({ toasts: [] });
  });

  it('shows the real phone and email as buttons', () => {
    renderFooter();
    expect(screen.getByRole('button', { name: /8329826990/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ejrsmse@gmail\.com/ })).toBeInTheDocument();
  });

  it('opens the inquiry modal (with tel: and mailto: fallbacks) from the phone button', async () => {
    renderFooter();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /8329826990/ }));

    const dialog = screen.getByRole('dialog', { name: 'Send us an inquiry' });
    expect(within(dialog).getByLabelText('Your name')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Phone or email')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Message')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /call/i })).toHaveAttribute('href', 'tel:+918329826990');
    expect(within(dialog).getByRole('link', { name: /email/i })).toHaveAttribute('href', 'mailto:ejrsmse@gmail.com');
  });

  it('opens the same modal from the email button', async () => {
    renderFooter();
    await userEvent.click(screen.getByRole('button', { name: /ejrsmse@gmail\.com/ }));
    expect(screen.getByRole('dialog', { name: 'Send us an inquiry' })).toBeInTheDocument();
  });

  it('validates, submits {name, contact, message}, toasts success and closes', async () => {
    submitInquiry.mockResolvedValue(undefined);
    renderFooter();
    await userEvent.click(screen.getByRole('button', { name: /8329826990/ }));
    const dialog = screen.getByRole('dialog');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Send inquiry' }));
    expect(await within(dialog).findByText('Please enter your name')).toBeInTheDocument();
    expect(submitInquiry).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText('Your name'), 'Asha Rao');
    await userEvent.type(within(dialog).getByLabelText('Phone or email'), 'not a contact');
    await userEvent.type(within(dialog).getByLabelText('Message'), 'Please call me about the bus.');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send inquiry' }));
    expect(await within(dialog).findByText('Enter a valid phone number or email address')).toBeInTheDocument();

    await userEvent.clear(within(dialog).getByLabelText('Phone or email'));
    await userEvent.type(within(dialog).getByLabelText('Phone or email'), '98765 43210');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send inquiry' }));

    await waitFor(() =>
      expect(submitInquiry).toHaveBeenCalledWith({
        name: 'Asha Rao',
        contact: '98765 43210',
        message: 'Please call me about the bus.',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useToastStore.getState().toasts.some((t) => t.tone === 'success')).toBe(true);
  });

  it('keeps the modal open and toasts an error when the request fails', async () => {
    submitInquiry.mockRejectedValue(new Error('boom'));
    renderFooter();
    await userEvent.click(screen.getByRole('button', { name: /8329826990/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Your name'), 'Asha');
    await userEvent.type(within(dialog).getByLabelText('Phone or email'), 'asha@example.com');
    await userEvent.type(within(dialog).getByLabelText('Message'), 'Hello');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send inquiry' }));

    await waitFor(() => expect(useToastStore.getState().toasts.some((t) => t.tone === 'error')).toBe(true));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
