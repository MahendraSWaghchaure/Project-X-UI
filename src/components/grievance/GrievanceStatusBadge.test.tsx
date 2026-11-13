import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GrievanceStatusBadge } from './GrievanceStatusBadge';

describe('GrievanceStatusBadge', () => {
  it('renders the localised status label', () => {
    render(<GrievanceStatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it.each([
    ['OPEN', 'Open', 'bg-amber-100'],
    ['IN_PROGRESS', 'In progress', 'bg-info-100'],
    ['RESOLVED', 'Resolved', 'bg-green-100'],
    ['REJECTED', 'Rejected', 'bg-red-100'],
  ] as const)('gives %s the expected tone color', (status, label, expectedClass) => {
    render(<GrievanceStatusBadge status={status} />);
    expect(screen.getByText(label)).toHaveClass(expectedClass);
  });
});
