import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Logo } from './Logo';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';

describe('Logo', () => {
  it('is a link to the home page', () => {
    render(
      <MemoryRouter initialEntries={['/about']}>
        <Logo />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /home page/i });
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveTextContent('Sunju');
  });

  it('can render without a link when already nested in one', () => {
    render(
      <MemoryRouter>
        <Logo to={null} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('Sunju')).toBeInTheDocument();
  });

  it('links to / from the public header and the footer', () => {
    render(
      <MemoryRouter initialEntries={['/vision']}>
        <PublicHeader />
        <PublicFooter />
      </MemoryRouter>,
    );
    const logos = screen.getAllByRole('link', { name: /home page/i });
    expect(logos).toHaveLength(2);
    logos.forEach((l) => expect(l).toHaveAttribute('href', '/'));
  });
});
