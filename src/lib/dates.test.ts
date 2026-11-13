import { afterEach, describe, expect, it, vi } from 'vitest';
import { daysAgoIst, todayIst, toIstIsoDate } from './dates';

describe('IST dates', () => {
  afterEach(() => vi.useRealTimers());

  it('uses the Asia/Kolkata calendar day, not UTC or browser-local', () => {
    // 20:00 UTC on 6 Nov is already 01:30 on 7 Nov in India.
    expect(toIstIsoDate(new Date('2026-11-06T20:00:00Z'))).toBe('2026-11-07');
    // 18:29 UTC is 23:59 IST on the same day.
    expect(toIstIsoDate(new Date('2026-11-06T18:29:00Z'))).toBe('2026-11-06');
  });

  it('todayIst / daysAgoIst follow the clock and cross month boundaries', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-01T19:00:00Z')); // 00:30 IST on 2 Mar
    expect(todayIst()).toBe('2026-03-02');
    expect(daysAgoIst(0)).toBe('2026-03-02');
    expect(daysAgoIst(2)).toBe('2026-02-28');
  });
});
