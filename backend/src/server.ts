import app from "./app";
import { createServer } from "http";
import { initializeSocket } from "./config/socket";

const PORT = process.env.PORT || 4000;

const httpServer = createServer(app);
initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;