import type { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export const setIO = (instance: SocketIOServer) => {
  io = instance;
};

export const getIO = (): SocketIOServer | null => io;
