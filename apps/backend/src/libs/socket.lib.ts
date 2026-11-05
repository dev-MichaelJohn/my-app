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
    // Ping/pong health checks to prune dead connections
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // 🛡️ Robust JWT Authentication Middleware for WebSockets
  io.use((socket: Socket, next) => {
    const rawToken =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization ||
      (socket.handshake.query?.token as string | undefined);

    if (!rawToken) {
      return next(new Error("Authentication token required."));
    }

    const cleanToken = rawToken.replace(/^bearer\s+/i, "").trim();

    try {
      const decoded = jwt.verify(cleanToken, env.JWT_SECRET) as GetUser;
      socket.data.user = decoded;
      return next();
    } catch (err: any) {
      logger.warn(`WebSocket handshake rejected: ${err.message}`);
      return next(new Error("Invalid session token."));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user: GetUser = socket.data.user;
    const roles = user.roles ?? [];
    const isSysAdmin = roles.includes("SYS_ADMIN");
    const isAdmin = roles.includes("ADMIN");

    // 1. Join room for Admins
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

    logger.debug(`Socket connected: User #${user.account.id} (${user.account.email})`);

    socket.on("disconnect", (reason) => {
      logger.debug(`Socket disconnected: User #${user.account.id} (${reason})`);
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
 * Emits an anonymous real-time pulse event with automatic deduplication across rooms.
 */
export const emitEvaluationPulse = (event: LiveEvaluationPulseEvent) => {
  if (!io) return;

  // 🛡️ FIX 1: Chain rooms in a single call to prevent duplicate packet delivery
  let broadcast = io.to("admin:pulse");

  if (event.collegeId && event.collegeId > 0) {
    broadcast = broadcast.to(`college:pulse:${event.collegeId}`);
  }

  if (event.programId && event.programId > 0) {
    broadcast = broadcast.to(`program:pulse:${event.programId}`);
  }

  broadcast.emit("evaluation:pulse", event);

  logger.debug(
    `Live Pulse broadcasted: ${event.type} for ${event.courseCode} (College #${event.collegeId}, Program #${event.programId})`,
  );
};
