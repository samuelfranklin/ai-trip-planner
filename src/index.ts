import express from "express";
import dotenv from "dotenv";
import logger from "./config/logger";
import { agent } from "./agent";
import type { BaseMessage } from "@langchain/core/messages";
    
dotenv.config();

const app = express();
const PORT = process.env.PORT;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.send("OK - Server is healthy");
});

app.post("/agent", async (req, res) => {
  try {
    const result = await agent.invoke({
      messages: [{ role: "user", content: req.body.message }]
    }) as { messages: BaseMessage[] };

    // Pega a última mensagem do agente
    const lastMessage = result.messages[result.messages.length - 1];
    const response = lastMessage?.content || "Sem resposta";
    
    logger.debug(response);
    res.send(response);
  } catch (error: any) {
    logger.error("Error occurred:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
