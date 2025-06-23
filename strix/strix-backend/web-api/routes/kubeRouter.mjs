import express from "express";

export function createKubeRoutes() {
  const router = express.Router();
  
  let podIsReady = false;
  let podIsAlive = false;

  const gracePeriod = parseInt(process.env.POD_READINESS_GRACE_PERIOD) || 5000;
  setTimeout(() => {
    podIsReady = true;
    podIsAlive = true;
  }, gracePeriod);

  router.get("/pod/isReady", (req, res) => {
    res.status(podIsReady ? 200 : 500).json({ success: podIsReady });
  });

  router.get("/pod/isAlive", (req, res) => {
    res.status(podIsAlive ? 200 : 500).json({ success: podIsAlive });
  });

  router.use((err, req, res, next) => {
    console.error("Kube router error:", req.originalUrl, err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  return router;
}