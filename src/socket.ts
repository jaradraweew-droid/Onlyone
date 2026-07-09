import { io } from 'socket.io-client';

// Connect to same origin (works both locally and on Cloud Run).
// Start with polling first (works on all HTTP/2 proxies incl. Cloud Run),
// then upgrade to WebSocket if the server supports it.
export const socket = io({
  transports: ['polling', 'websocket'],
  upgrade: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1500,
  timeout: 20000,
});
