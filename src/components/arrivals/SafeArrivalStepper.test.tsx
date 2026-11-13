import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SafeArrivalStepper } from './SafeArrivalStepper';
import { stepStates, type StepperArrival } from './stepStates';

const base: StepperArrival = { kind: 'SCHOOL_DROP', schoolConfirm: 'PENDING', parentResponse: 'PENDING' };

function states() {
  return screen.getAllByRole('listitem').map((li) => li.getAttribute('data-state'));
}

describe('SafeArrivalStepper', () => {
  it('shows only the driver step done while school and parent are pending', () => {
    render(<SafeArrivalStepper arrival={base} />);

    expect(states()).toEqual(['done', 'pending', 'pending']);
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Dropped')).toBeInTheDocument();
    expect(within(items[1]).getByText('School confirmed?')).toBeInTheDocument();
    expect(within(items[2]).getByText('Parent approved?')).toBeInTheDocument();
  });

  it('advances as the school then the parent confirm', () => {
    const { rerender } = render(<SafeArrivalStepper arrival={{ ...base, schoolConfirm: 'PRESENT' }} />);
    expect(states()).toEqual(['done', 'done', 'pending']);

    rerender(<SafeArrivalStepper arrival={{ ...base, schoolConfirm: 'PRESENT', parentResponse: 'APPROVED' }} />);
    expect(states()).toEqual(['done', 'done', 'done']);
    expect(screen.getByText('Parent approved')).toBeInTheDocument();
  });

  it('flags a school ABSENT mismatch and a parent dispute as alert steps, with text not just colour', () => {
    const { rerender } = render(<SafeArrivalStepper arrival={{ ...base, schoolConfirm: 'ABSENT' }} />);
    expect(states()).toEqual(['done', 'alert', 'pending']);
    expect(screen.getByText('School: absent')).toBeInTheDocument();

    rerender(<SafeArrivalStepper arrival={{ ...base, parentResponse: 'DISPUTED' }} />);
    expect(states()).toEqual(['done', 'pending', 'alert']);
    expect(screen.getByText('Parent: wrong')).toBeInTheDocument();
  });

  it('labels the first step by arrival kind', () => {
    render(<SafeArrivalStepper arrival={{ ...base, kind: 'HOME_PICKUP' }} />);
    expect(screen.getByText('Picked up')).toBeInTheDocument();
  });

  it('stepStates is a pure mapping', () => {
    expect(stepStates({ ...base, schoolConfirm: 'PRESENT', parentResponse: 'DISPUTED' })).toEqual(['done', 'done', 'alert']);
  });
});
