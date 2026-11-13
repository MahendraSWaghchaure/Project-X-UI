import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

/** Re-renders on every keystroke and hands Modal a brand-new inline onClose each time - the exact shape that used to re-focus the panel. */
function NoteHarness({ onClose = () => {} }: { onClose?: () => void }) {
  const [note, setNote] = useState('');
  return (
    <Modal open onClose={() => onClose()} title="Approve arrival" descriptionId="desc">
      <p id="desc">Asha was dropped at school.</p>
      <label>
        Note
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <button>Other</button>
    </Modal>
  );
}

describe('Modal', () => {
  it('keeps focus in the note field while typing across re-renders with a fresh inline onClose', async () => {
    render(<NoteHarness />);
    const note = screen.getByLabelText('Note');
    await userEvent.click(note);
    expect(note).toHaveFocus();

    await userEvent.keyboard('hello world');

    expect(note).toHaveValue('hello world');
    expect(note).toHaveFocus();
  });

  it('is labelled and described for assistive tech, and focuses the panel on open', () => {
    render(<NoteHarness />);
    const dialog = screen.getByRole('dialog', { name: 'Approve arrival' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Asha was dropped at school.');
    expect(dialog).toHaveFocus();
  });

  it('traps Tab inside the panel in both directions', async () => {
    render(<NoteHarness />);
    const close = screen.getByRole('button', { name: 'Close' });
    const other = screen.getByRole('button', { name: 'Other' });

    other.focus();
    await userEvent.tab();
    expect(close).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(other).toHaveFocus();
  });

  it('closes on Escape using the latest onClose and restores focus to the opener', async () => {
    const onClose = vi.fn();
    function Opener() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onClose={() => { onClose(); setOpen(false); }} title="T">
            <button>Inside</button>
          </Modal>
        </>
      );
    }
    render(<Opener />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await userEvent.click(opener);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });
});
