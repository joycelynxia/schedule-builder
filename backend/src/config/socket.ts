import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "../utils/auth";
import { prisma } from "./db";

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer) => {
  // Support multiple origins: localhost for dev and Vercel URL for production
  const allowedOrigins = [
    "http://localhost:5173", // Local Vite dev server
    process.env.FRONTEND_URL, // Vercel production URL
  ].filter(Boolean) as string[]; // Remove undefined values

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication error: No token"));
      }

      const payload = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          userName: true,
          email: true,
          isManager: true,
          companyId: true,
        },
      });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.data.user = user;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log(`User ${user.userName} (${user.id}) connected`);

    // Join room for user's company to receive company-wide updates
    socket.join(`company:${user.companyId}`);

    socket.on("disconnect", () => {
      console.log(`User ${user.userName} (${user.id}) disconnected`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized. Call initializeSocket first.");
  }
  return io;
};
