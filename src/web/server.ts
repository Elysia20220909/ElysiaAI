import express from "express";
import { chat } from "../core/chatEngine.js";
import path from "path";

const app = express();
app.use(express.json());
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, "public")));

app.post("/chat", async (req, res) => {
  const reply = await chat(req.body.message);
  res.json({ reply });
});

app.listen(3000, () => {
  console.log("Webサーバー起動: http://localhost:3000");
});
