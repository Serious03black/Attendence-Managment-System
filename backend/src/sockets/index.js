import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io;

/**
 * Every socket authenticates with the same JWT access token used for REST
 * calls (passed via the Socket.IO auth handshake, not a query string, to
 * avoid leaking tokens into server logs). Each user joins a room keyed by
 * their own id (`user:<id>`) so notification.service.js can target them
 * directly without tracking socket ids itself, and faculty additionally
 * join a room per batch they're assigned to, so a new pending-attendance
 * submission can push straight to their approval queue.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, env.jwt.accessSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { _id, role } = socket.user;
    socket.join(`user:${_id}`);
    logger.debug(`Socket connected: user=${_id} role=${role} socket=${socket.id}`);

    // Faculty client explicitly subscribes to the batches it manages
    // (frontend calls this after loading the faculty's batch list) rather
    // than the server guessing which rooms to auto-join.
    socket.on('subscribe:batch', (batchId) => {
      socket.join(`batch:${batchId}`);
    });

    socket.on('unsubscribe:batch', (batchId) => {
      socket.leave(`batch:${batchId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: user=${_id} socket=${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO not initialized. Call initSocket(server) first.');
  return io;
}
