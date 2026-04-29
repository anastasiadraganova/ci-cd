const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const { Pool } = require("pg");
require("dotenv").config();

const PORT = Number(process.env.PORT || 3000);

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "todo_user",
  password: process.env.DB_PASSWORD || "todo_pass",
  database: process.env.DB_NAME || "todo_db"
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

async function createTableIfMissing() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      text VARCHAR(500) NOT NULL,
      completed BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function getAllTodos() {
  const result = await pool.query(
    "SELECT id, text, completed, created_at FROM todos ORDER BY id ASC"
  );
  return result.rows;
}

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime()
  });
});

app.get("/api/todos", async (_req, res) => {
  try {
    const todos = await getAllTodos();
    res.status(200).json(todos);
  } catch (error) {
    console.error("GET /api/todos error:", error);
    res.status(500).json({ error: "Failed to fetch todos" });
  }
});

app.post("/api/todos", async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Field 'text' is required" });
    }

    const result = await pool.query(
      "INSERT INTO todos (text) VALUES ($1) RETURNING id, text, completed, created_at",
      [text]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /api/todos error:", error);
    return res.status(500).json({ error: "Failed to create todo" });
  }
});

app.put("/api/todos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid todo id" });
    }

    const fields = [];
    const values = [];

    if (typeof req.body.text === "string") {
      fields.push(`text = $${fields.length + 1}`);
      values.push(req.body.text);
    }
    if (typeof req.body.completed === "boolean") {
      fields.push(`completed = $${fields.length + 1}`);
      values.push(req.body.completed);
    }

    if (fields.length === 0) {
      return res
        .status(400)
        .json({ error: "Provide at least one of: text, completed" });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE todos SET ${fields.join(", ")} WHERE id = $${
        values.length
      } RETURNING id, text, completed, created_at`,
      values
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("PUT /api/todos/:id error:", error);
    return res.status(500).json({ error: "Failed to update todo" });
  }
});

app.delete("/api/todos/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: "Invalid todo id" });
    }

    const result = await pool.query("DELETE FROM todos WHERE id = $1", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Todo not found" });
    }

    return res.status(200).json({ message: "deleted" });
  } catch (error) {
    console.error("DELETE /api/todos/:id error:", error);
    return res.status(500).json({ error: "Failed to delete todo" });
  }
});

io.on("connection", async (socket) => {
  try {
    const todos = await getAllTodos();
    socket.emit("todos:init", todos);
  } catch (error) {
    console.error("Socket init error:", error);
  }

  socket.on("todo:add", async (payload) => {
    try {
      const text = payload && payload.text;
      if (!text || typeof text !== "string") {
        return;
      }

      const result = await pool.query(
        "INSERT INTO todos (text) VALUES ($1) RETURNING id, text, completed, created_at",
        [text]
      );
      io.emit("todo:added", result.rows[0]);
    } catch (error) {
      console.error("Socket todo:add error:", error);
    }
  });

  socket.on("todo:update", async (payload) => {
    try {
      const id = Number(payload && payload.id);
      if (!Number.isInteger(id)) {
        return;
      }

      const fields = [];
      const values = [];

      if (typeof payload.text === "string") {
        fields.push(`text = $${fields.length + 1}`);
        values.push(payload.text);
      }
      if (typeof payload.completed === "boolean") {
        fields.push(`completed = $${fields.length + 1}`);
        values.push(payload.completed);
      }
      if (fields.length === 0) {
        return;
      }

      values.push(id);
      const result = await pool.query(
        `UPDATE todos SET ${fields.join(", ")} WHERE id = $${
          values.length
        } RETURNING id, text, completed, created_at`,
        values
      );

      if (result.rowCount > 0) {
        io.emit("todo:updated", result.rows[0]);
      }
    } catch (error) {
      console.error("Socket todo:update error:", error);
    }
  });

  socket.on("todo:delete", async (payload) => {
    try {
      const id = Number(payload && payload.id);
      if (!Number.isInteger(id)) {
        return;
      }

      const result = await pool.query("DELETE FROM todos WHERE id = $1", [id]);
      if (result.rowCount > 0) {
        io.emit("todo:deleted", { id });
      }
    } catch (error) {
      console.error("Socket todo:delete error:", error);
    }
  });
});

async function start() {
  try {
    await createTableIfMissing();
    server.listen(PORT, () => {
      console.log(`Backend started on port ${PORT}`);
    });
  } catch (error) {
    console.error("Startup error:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await pool.end();
  process.exit(0);
});

start();
