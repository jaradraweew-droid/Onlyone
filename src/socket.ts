import { io } from 'socket.io-client';

// In development or production, it will connect to the same origin
export const socket = io();
