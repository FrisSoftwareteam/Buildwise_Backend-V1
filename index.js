function jsonErrorApp(detail) {
  const express = require("express");
  const app = express();
  const body = {
    error: "Backend failed to start",
    detail,
  };
  app.use((_req, res) => {
    res.status(500).json(body);
  });
  return app;
}

function loadApp() {
  try {
    const mod = require("./Backend/api-server/dist/index.cjs");
    const app = typeof mod === "function" ? mod : mod && mod.default;
    if (typeof app !== "function") {
      throw new Error("API bundle did not export an Express app");
    }
    return app;
  } catch (err) {
    return jsonErrorApp(err && err.message ? err.message : String(err));
  }
}

const app = loadApp();

module.exports = (req, res) => {
  try {
    const result = app(req, res);
    if (result && typeof result.catch === "function") {
      result.catch((err) => {
        if (res.headersSent) return;
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            error: err && err.message ? err.message : "Server error",
          }),
        );
      });
    }
  } catch (err) {
    if (res.headersSent) return;
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        error: err && err.message ? err.message : "Server error",
      }),
    );
  }
};
