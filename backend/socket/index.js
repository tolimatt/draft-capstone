import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { createOriginChecker } from "../utils/corsOrigins.js";

let ioInstance = null;
const { isAllowedOrigin } = createOriginChecker();

const getTokenFromCookieHeader = (cookieHeader = "") => {
  if (!cookieHeader) return "";

  const tokenPair = String(cookieHeader)
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("token="));

  if (!tokenPair) return "";

  const rawValue = tokenPair.slice("token=".length).trim();
  if (!rawValue) return "";

  try {
    return decodeURIComponent(rawValue);
  } catch {
    return rawValue;
  }
};

export const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error(`Origin ${origin || "(unknown)"} is not allowed by Socket CORS`), false);
      },
      credentials: true,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = getTokenFromCookieHeader(socket.handshake.headers?.cookie || "");

      if (!token) {
        return next(new Error("Authentication required."));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id role");
      if (!user) {
        return next(new Error("User not found."));
      }

      socket.user = { id: user._id.toString(), role: user.role };
      next();
    } catch {
      next(new Error("Invalid token."));
    }
  });

  ioInstance.on("connection", (socket) => {
    const userId = socket.user?.id;
    if (!userId) {
      socket.disconnect(true);
      return;
    }

    socket.join(`user:${userId}`);

    socket.on("chat:join", ({ conversationId }) => {
      if (conversationId) {
        socket.join(`chat:${conversationId}`);
      }
    });

    socket.on("chat:leave", ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`chat:${conversationId}`);
      }
    });
  });

  return ioInstance;
};

export const getIo = () => ioInstance;

export const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${String(userId)}`).emit(event, payload);
};

