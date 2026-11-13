import { useEffect, useRef } from 'react';
import { createStompClient } from '@/lib/wsClient';

/**
 * Subscribes to one or more STOMP topics and invokes onMessage for every frame - used where the
 * UI just needs to know "something changed, refetch" rather than caring about the payload shape
 * (e.g. re-running a TanStack Query on a grievance update pushed from GrievanceBroadcaster).
 *
 * STOMP topics are fire-and-forget: frames sent while the socket was down (or between the page's
 * initial fetch and the subscription) are never replayed. Pass `refetchOnConnect` where a missed
 * frame would hide something important and onMessage is an idempotent "refetch": it is then also
 * invoked on every (re)connect, right after subscribing.
 */
export function useLiveTopic(
  topics: (string | null | undefined)[],
  onMessage: () => void,
  options: { refetchOnConnect?: boolean } = {},
) {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const refetchOnConnectRef = useRef(options.refetchOnConnect ?? false);
  refetchOnConnectRef.current = options.refetchOnConnect ?? false;

  const activeTopics = topics.filter((t): t is string => !!t);
  const topicsKey = activeTopics.join('|');

  useEffect(() => {
    if (activeTopics.length === 0) {
      return;
    }

    const client = createStompClient();
    client.onConnect = () => {
      activeTopics.forEach((topic) => {
        client.subscribe(topic, () => onMessageRef.current());
      });
      if (refetchOnConnectRef.current) onMessageRef.current();
    };
    client.activate();

    return () => {
      void client.deactivate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicsKey]);
}
