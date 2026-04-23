import express from "express";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { createProxyMiddleware } from "http-proxy-middleware";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const PYTHON_PORT = 8001;

  console.log("🚀 Starting X-KODCUM Orchestrator...");

  // 1. Setup Python Backend
  const startPython = () => {
    console.log(`🐍 Starting Python process on port ${PYTHON_PORT}...`);
    const pythonProcess = spawn("python3", ["main.py"], {
      env: { ...process.env, PYTHON_PORT: PYTHON_PORT.toString() },
    });

    pythonProcess.stdout.on("data", (data) => {
      console.log(`[Python] ${data.toString().trim()}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error(`[Python-Error] ${data.toString().trim()}`);
    });

    pythonProcess.on("close", (code) => {
      console.log(`[Python] Process exited with code ${code}. Restarting...`);
      setTimeout(startPython, 5000);
    });

    return pythonProcess;
  };

  // Check if we need to install python deps (only in cloud env if possible)
  if (fs.existsSync("requirements.txt")) {
     console.log("📦 Installing Python dependencies...");
     const pip = spawn("pip3", ["install", "-r", "requirements.txt"]);
     pip.stdout.on("data", (data) => console.log(`[pip] ${data}`));
     pip.on("close", () => {
       console.log("✅ Python dependencies installed.");
       startPython();
     });
  } else {
    startPython();
  }

  // 2. Proxy API requests to Python
  app.use(
    ["/auth", "/actions", "/data", "/api", "/boost", "/proxy"],
    createProxyMiddleware({
      target: `http://127.0.0.1:${PYTHON_PORT}`,
      changeOrigin: true,
    })
  );

  // 3. Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🌐 Orchestrator running on http://localhost:${PORT}`);
    console.log(`🔗 Proxying API to Python on port ${PYTHON_PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
