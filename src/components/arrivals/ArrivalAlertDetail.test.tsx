import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArrivalAlertDetail } from './ArrivalAlertDetail';
import { alertReason } from './alertReason';

describe('alertReason', () => {
  it('distinguishes school-absent, parent-disputed and both', () => {
    expect(alertReason({ schoolConfirm: 'ABSENT', parentResponse: 'PENDING' })).toBe('SCHOOL_ABSENT');
    expect(alertReason({ schoolConfirm: 'PENDING', parentResponse: 'DISPUTED' })).toBe('PARENT_DISPUTED');
    expect(alertReason({ schoolConfirm: 'ABSENT', parentResponse: 'DISPUTED' })).toBe('BOTH');
    expect(alertReason({ schoolConfirm: 'PRESENT', parentResponse: 'APPROVED' })).toBe('UNKNOWN');
  });
});

describe('ArrivalAlertDetail', () => {
  it('a parent-only dispute never says the school disagrees, and shows the parent note', () => {
    render(
      <ArrivalAlertDetail
        arrival={{ outcome: 'ALERT', schoolConfirm: 'PRESENT', parentResponse: 'DISPUTED', parentNote: 'He is home with me' }}
      />,
    );
    expect(screen.getByTestId('alert-reason')).toHaveTextContent(/Parent disputed/);
    expect(screen.getByTestId('alert-reason')).not.toHaveTextContent(/school (disagrees|marked)/i);
    expect(screen.getByText('He is home with me')).toBeInTheDocument();
  });

  it('a school-absent mismatch says so and has no parent note line', () => {
    render(<ArrivalAlertDetail arrival={{ outcome: 'ALERT', schoolConfirm: 'ABSENT', parentResponse: 'PENDING', parentNote: null }} />);
    expect(screen.getByTestId('alert-reason')).toHaveTextContent(/School marked absent/);
    expect(screen.queryByText(/note/i)).not.toBeInTheDocument();
  });

  it('renders nothing for a safe arrival without a note', () => {
    const { container } = render(
      <ArrivalAlertDetail arrival={{ outcome: 'SAFE', schoolConfirm: 'PRESENT', parentResponse: 'APPROVED', parentNote: null }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
