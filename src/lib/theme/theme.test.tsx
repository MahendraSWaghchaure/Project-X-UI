import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './ThemeContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AUTO_REEVALUATE_MS, THEME_STORAGE_KEY, readStoredMode, resolveAutoTheme, resolveTheme } from './themeCore';

/** Local-time date (the rule is "local 06:00-18:00"), so tests are timezone independent. */
const at = (hour: number, minute = 0) => new Date(2026, 10, 8, hour, minute, 0);

describe('resolveAutoTheme', () => {
  it.each([
    [0, 'night'],
    [5, 'night'],
    [6, 'day'],
    [12, 'day'],
    [17, 'day'],
    [18, 'night'],
    [23, 'night'],
  ] as const)('hour %i is %s', (hour, expected) => {
    expect(resolveAutoTheme(at(hour))).toBe(expected);
  });

  it('is exact at the boundaries (05:59 night, 06:00 day, 17:59 day, 18:00 night)', () => {
    expect(resolveAutoTheme(at(5, 59))).toBe('night');
    expect(resolveAutoTheme(at(6, 0))).toBe('day');
    expect(resolveAutoTheme(at(17, 59))).toBe('day');
    expect(resolveAutoTheme(at(18, 0))).toBe('night');
  });

  it('resolveTheme lets a pinned mode win over the clock', () => {
    expect(resolveTheme('night', at(12))).toBe('night');
    expect(resolveTheme('day', at(23))).toBe('day');
    expect(resolveTheme('auto', at(23))).toBe('night');
  });
});

function Probe() {
  const { mode, theme } = useTheme();
  return (
    <p data-testid="probe">
      {mode}:{theme}
    </p>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto mode picks day at noon and sets data-theme on <html>', () => {
    vi.setSystemTime(at(12));
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('auto:day');
    expect(document.documentElement).toHaveAttribute('data-theme', 'day');
  });

  it('auto mode picks night at 22:00', () => {
    vi.setSystemTime(at(22));
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('auto:night');
    expect(document.documentElement).toHaveAttribute('data-theme', 'night');
  });

  it('re-evaluates on the interval when the clock crosses 18:00', () => {
    vi.setSystemTime(at(17, 59));
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'day');

    act(() => {
      vi.setSystemTime(at(18, 1));
      vi.advanceTimersByTime(AUTO_REEVALUATE_MS);
    });

    expect(screen.getByTestId('probe')).toHaveTextContent('auto:night');
    expect(document.documentElement).toHaveAttribute('data-theme', 'night');
  });

  it('re-evaluates when the tab becomes visible again', () => {
    vi.setSystemTime(at(5, 30));
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'night');

    act(() => {
      vi.setSystemTime(at(6, 5));
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(document.documentElement).toHaveAttribute('data-theme', 'day');
  });

  it('a manual override persists to localStorage, beats the clock, and is restored on the next load', async () => {
    vi.setSystemTime(at(12));
    const { unmount } = render(
      <ThemeProvider>
        <ThemeToggle />
        <Probe />
      </ThemeProvider>,
    );
    expect(document.documentElement).toHaveAttribute('data-theme', 'day');

    await act(async () => {
      screen.getByRole('radio', { name: 'Night' }).click();
    });
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night');
    expect(screen.getByTestId('probe')).toHaveTextContent('night:night');
    expect(document.documentElement).toHaveAttribute('data-theme', 'night');

    // Clock ticks do not override a pinned mode.
    act(() => {
      vi.advanceTimersByTime(AUTO_REEVALUATE_MS * 3);
    });
    expect(document.documentElement).toHaveAttribute('data-theme', 'night');

    unmount();
    document.documentElement.removeAttribute('data-theme');
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('night:night');
    expect(readStoredMode()).toBe('night');
  });

  it('choosing Auto removes the stored override', () => {
    vi.setSystemTime(at(12));
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night');
    render(
      <ThemeProvider>
        <ThemeToggle />
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByRole('radio', { name: 'Night' })).toHaveAttribute('aria-checked', 'true');
    act(() => {
      screen.getByRole('radio', { name: 'Auto' }).click();
    });
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('probe')).toHaveTextContent('auto:day');
  });

  it('survives localStorage throwing (private windows)', () => {
    vi.setSystemTime(at(22));
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('auto:night');
    spy.mockRestore();
  });
});
