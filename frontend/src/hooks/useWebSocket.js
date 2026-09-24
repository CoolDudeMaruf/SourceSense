import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_BASE } from '../utils/api';

/**
 * useWebSocket – connects to /ws/live/{nodeId} and streams live readings.
 * Reconnects automatically on disconnect.
 */
export function useWebSocket(nodeId) {
  const [lastReading, setLastReading] = useState(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!nodeId) return;
    const ws = new WebSocket(`${WS_BASE}/ws/live/${nodeId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLastReading(data);
      } catch {}
    };

    ws.onerror = () => setConnected(false);

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 5 seconds
      reconnectTimer.current = setTimeout(connect, 5000);
    };
  }, [nodeId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

  return { lastReading, connected };
}
