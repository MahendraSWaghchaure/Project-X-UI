import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLiveTopic } from './useLiveTopic';

interface FakeClient {
  onConnect?: () => void;
  subscribe: ReturnType<typeof vi.fn>;
  activate: ReturnType<typeof vi.fn>;
  deactivate: ReturnType<typeof vi.fn>;
}
let client: FakeClient;
vi.mock('@/lib/wsClient', () => ({ createStompClient: () => client }));

describe('useLiveTopic', () => {
  beforeEach(() => {
    client = { subscribe: vi.fn(), activate: vi.fn(), deactivate: vi.fn().mockResolvedValue(undefined) };
  });

  it('subscribes on every (re)connect and, with refetchOnConnect, refetches each time', () => {
    const onMessage = vi.fn();
    renderHook(() => useLiveTopic(['/topic/parent/1/arrivals'], onMessage, { refetchOnConnect: true }));

    client.onConnect!();
    expect(client.subscribe).toHaveBeenCalledTimes(1);
    expect(onMessage).toHaveBeenCalledTimes(1);

    // The socket dropped and stompjs reconnected: frames sent meanwhile were lost, so refetch again.
    client.onConnect!();
    expect(client.subscribe).toHaveBeenCalledTimes(2);
    expect(onMessage).toHaveBeenCalledTimes(2);
  });

  it('does not refetch on connect by default, only on frames', () => {
    const onMessage = vi.fn();
    renderHook(() => useLiveTopic(['/topic/x'], onMessage));

    client.onConnect!();
    expect(onMessage).not.toHaveBeenCalled();

    const frameHandler = client.subscribe.mock.calls[0][1] as () => void;
    frameHandler();
    expect(onMessage).toHaveBeenCalledOnce();
  });
});
