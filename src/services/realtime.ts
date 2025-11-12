import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const getSocketBaseURL = () => {
  const api = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  try {
    const url = new URL(api);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'http://localhost:5000';
  }
};

export const connectSocket = () => {
  if (!socket) {
    socket = io(getSocketBaseURL(), { withCredentials: true });
  }
  return socket;
};

export const getSocket = () => socket;
