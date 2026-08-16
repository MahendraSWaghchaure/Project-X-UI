import { useEffect, useState } from 'react';
import type { IMessage } from '@stomp/stompjs';
import { createStompClient } from '@/lib/wsClient';
import type { SosEvent } from '@/types/tracking';

/** Live SOS state for one trip - the red banner a parent or school admin should never miss. */
export function useSosSubscription(tripId: number | null) {
  const [sosEvent, setSosEvent] = useState<SosEvent | null>(null);

  useEffect(() => {
    if (tripId == null) {
      return;
    }

    const client = createStompClient();
    client.onConnect = () => {
      client.subscribe(`/topic/trips/${tripId}/sos`, (message: IMessage) => {
        setSosEvent(JSON.parse(message.body) as SosEvent);
      });
    };
    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [tripId]);

  return sosEvent;
}
