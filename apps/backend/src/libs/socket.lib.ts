import { Server as SocketIOServer, type Socket } from "socket.io";
import type { Server as HTTPServer } from "node:http";
import jwt from "jsonwebtoken";
import env from "@/configs/env.config.js";
import { logger } from "./logger.lib.js";
import type { GetUser, LiveEvaluationPulseEvent } from "@my-app/shared";

let io: SocketIOServer | null = null;

export const InitializeSocketServer = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
    path: "/socket.io",
  });

  // JWT Authentication Middleware for WebSockets
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace(/^bearer\s+/i, "");

    if (!token) {
      return next(new Error("Authentication token required."));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as GetUser;
      socket.data.user = decoded;
      return next();
    } catch {
      return next(new Error("Invalid session token."));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user: GetUser = socket.data.user;
    const roles = user.roles ?? [];
    const isSysAdmin = roles.includes("SYS_ADMIN");
    const isAdmin = roles.includes("ADMIN");

    // 1. Join room based on roles
    if (isSysAdmin || isAdmin) {
      socket.join("admin:pulse");
    }

    // 2. Join Dean's College rooms
    user.offices?.deanships?.forEach((d) => {
      socket.join(`college:pulse:${d.id}`);
    });

    // 3. Join Program Chair rooms
    user.offices?.chairships?.forEach((c) => {
      socket.join(`program:pulse:${c.id}`);
    });

    logger.debug(`Socket client connected: User #${user.account.id} (${user.account.email})`);

    socket.on("disconnect", () => {
      logger.debug(`Socket client disconnected: User #${user.account.id}`);
    });
  });

  logger.info("Socket.io Real-Time Engine initialized successfully.");
  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error("Socket.io is not initialized yet. Call InitializeSocketServer first.");
  }
  return io;
};

/**
 * Emits an anonymous real-time pulse event to the authorized rooms.
 */
export const emitEvaluationPulse = (event: LiveEvaluationPulseEvent) => {
  if (!io) return;

  // Broadcast to Admins
  io.to("admin:pulse").emit("evaluation:pulse", event);

  // Broadcast to relevant College Dean
  io.to(`college:pulse:${event.collegeId}`).emit("evaluation:pulse", event);

  // Broadcast to relevant Program Chair
  io.to(`program:pulse:${event.programId}`).emit("evaluation:pulse", event);

  logger.debug(`Live Pulse broadcasted for ${event.courseCode} (${event.programCode})`);
};
