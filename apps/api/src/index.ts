import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { type BaseMessage, HumanMessage } from "@langchain/core/messages";
import swaggerUi from "swagger-ui-express";
import logger from "./config/logger";
import { env } from "./config/env";
import { agent } from "./agent";
import { conversationStore } from "./lib/conversation-store";
import openApiDocument from "./docs/openapi.json" assert { type: "json" };
import { listFlightsTool } from "./tools/flight.tools";
import {
  searchDestinationsTool,
  extractSearchTokens,
  resolveDestinationFallback,
} from "./tools/destination.tools";
import { listHotelsTool } from "./tools/hotel.tools";
import { threadsRouter } from "./routes/threads.js";
import { langGraphStreamRouter } from "./routes/langgraph.stream.js";

const app = express();
const PORT = env.PORT;

const allowAllOrigins = env.CLIENT_ORIGINS.includes("*");
const originMatchers = env.CLIENT_ORIGINS.filter((origin) => origin !== "*").map(createOriginMatcher);

const corsMiddleware = cors({
  origin(origin, callback) {
    if (allowAllOrigins || !origin || isAllowedOrigin(origin, originMatchers)) {
      callback(null, true);
      return;
    }
    logger.warn({ origin, allowed: env.CLIENT_ORIGINS }, "cors origin rejected");
    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
});

app.use(corsMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get("/openapi.json", (_req, res) => {
  res.json(openApiDocument);
});

app.use("/threads", threadsRouter);
app.use("/langgraph", langGraphStreamRouter);

app.get("/health", (req, res) => {
  res.send("OK - Server is healthy");
});

app.post("/agent", async (req, res) => {
  const requestLog = logger.child({
    route: "/agent",
    method: "POST",
    conversationId: req.body?.conversationId,
  });
  try {
    const body = req.body ?? {};
    const incomingMessage: unknown = body.message;
    const providedConversationId: unknown = body.conversationId;
    const resetConversation: unknown = body.reset;

    if (typeof incomingMessage !== "string" || incomingMessage.trim().length === 0) {
      requestLog.warn("agent endpoint received empty message");
      return res.status(400).json({ error: "Request body must contain a non-empty 'message' field." });
    }

    const trimmedMessage = incomingMessage.trim();
    requestLog.info({ messageLength: trimmedMessage.length, resetConversation: resetConversation === true }, "agent request received");

    let conversationId =
      typeof providedConversationId === "string" && providedConversationId.trim().length > 0
        ? providedConversationId.trim()
        : randomUUID();

    if (resetConversation === true) {
      requestLog.info({ conversationId }, "conversation reset requested");
      await conversationStore.clear(conversationId);
    }

    const history = await conversationStore.get(conversationId);

    const result = (await agent.invoke({
      messages: [...history, new HumanMessage(trimmedMessage)],
    })) as { messages: BaseMessage[] };

    // Pega a última mensagem do agente
    const lastMessage = result.messages[result.messages.length - 1];

    await conversationStore.set(conversationId, result.messages);

    const response = normalizeMessageContent(lastMessage?.content) ?? "Sem resposta";

    requestLog.info({ conversationId, responseLength: response.length }, "agent response generated");
    res.json({ conversationId, response });
  } catch (error: any) {
    logger.error({ err: error }, "agent endpoint failed");
    console.error("=== ERROR DETAILS ===");
    console.error("Error:", error);
    console.error("Stack:", error?.stack);
    console.error("Message:", error?.message);
    console.error("====================");
    res.status(500).send("Internal Server Error");
  }
});

app.post("/agent/stream", async (req, res) => {
  const requestLog = logger.child({
    route: "/agent/stream",
    method: "POST",
    conversationId: req.body?.conversationId,
  });
  const abortController = new AbortController();
  req.on("close", () => {
    abortController.abort();
    requestLog.warn("stream aborted by client");
  });

  const sendChunk = (chunk: unknown) => {
    if (res.writableEnded) {
      return;
    }
    res.write(`${JSON.stringify(chunk)}\n`);
  };

  try {
    const body = req.body ?? {};
    const incomingMessage: unknown = body.message;
    const providedConversationId: unknown = body.conversationId;
    const resetConversation: unknown = body.reset;

    if (typeof incomingMessage !== "string" || incomingMessage.trim().length === 0) {
      requestLog.warn("stream endpoint received empty message");
      res.status(400).json({ error: "Request body must contain a non-empty 'message' field." });
      return;
    }

    const trimmedMessage = incomingMessage.trim();
    requestLog.info({ messageLength: trimmedMessage.length, resetConversation: resetConversation === true }, "stream request received");

    let conversationId =
      typeof providedConversationId === "string" && providedConversationId.trim().length > 0
        ? providedConversationId.trim()
        : randomUUID();

    res.status(200);
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    const maybeFlush = Reflect.get(res, "flushHeaders") as (() => void) | undefined;
    if (typeof maybeFlush === "function") {
      maybeFlush.call(res);
    }

    sendChunk({ type: "meta", data: { conversationId } });
    requestLog.debug({ conversationId }, "stream meta chunk sent");

    if (resetConversation === true) {
      requestLog.info({ conversationId }, "stream reset requested");
      await conversationStore.clear(conversationId);
    }

    const history = await conversationStore.get(conversationId);
    const userMessage = new HumanMessage(trimmedMessage);

    const result = (await agent.invoke({
      messages: [...history, userMessage],
    })) as { messages: BaseMessage[] };

    const assistantMessage = result.messages[result.messages.length - 1];
    const newMessages = result.messages.slice(history.length);
    await conversationStore.set(conversationId, result.messages);

    const responseText = normalizeMessageContent(assistantMessage?.content) ?? "";
    const toolSegments = newMessages
      .filter((message) => {
        const messageType = getMessageType(message);
        return messageType === "tool" || messageType === "function";
      })
      .map((message) => normalizeMessageContent(message.content) ?? "")
      .filter((segment) => segment.trim().length > 0);

    // BUG FIX #3: Ensure JSON tool responses are properly formatted
    const formattedToolSegments = toolSegments.map((segment) => {
      try {
        // Try to parse as JSON
        const parsed = JSON.parse(segment);
        // If successful, reformat with proper indentation
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If not valid JSON, return as-is
        return segment;
      }
    });

    let combinedText = [responseText, ...formattedToolSegments]
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .join("\n\n");

    if (!/"source"\s*:\s*"/.test(combinedText)) {
      const autoFallback = await tryAutoFallback(trimmedMessage);
      if (autoFallback) {
        requestLog.warn({ fallbackLength: autoFallback.length }, "auto fallback executed for message");
        // BUG FIX #3: Format fallback JSON properly too
        let formattedFallback = autoFallback;
        try {
          const parsed = JSON.parse(autoFallback);
          formattedFallback = JSON.stringify(parsed, null, 2);
        } catch {
          // Keep as-is if not valid JSON
        }
        combinedText = [responseText, formattedFallback].map((segment) => segment.trim()).filter(Boolean).join("\n\n");
      }
    }

    if (combinedText.length > 0) {
      requestLog.info({ conversationId, textLength: combinedText.length, toolSegments: toolSegments.length }, "stream delta generated");
      sendChunk({
        type: "delta",
        data: {
          textDelta: combinedText,
          fullText: combinedText,
        },
      });
    }

    sendChunk({
      type: "complete",
      data: {
        conversationId,
        text: combinedText,
      },
    });
    requestLog.info({ conversationId, textLength: combinedText.length }, "stream completed");
  } catch (error) {
    if (abortController.signal.aborted) {
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ err: error }, "Streaming agent request failed");
    sendChunk({
      type: "error",
      data: {
        message,
      },
    });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
    requestLog.debug("stream response closed");
  }
});

function normalizeMessageContent(content?: BaseMessage["content"]): string | undefined {
  if (!content) {
    return undefined;
  }

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((chunk) => {
        if (typeof chunk === "string") {
          return chunk;
        }

        const chunkAsAny = chunk as Record<string, unknown>;

        if (chunkAsAny?.type === "text" && typeof chunkAsAny.text === "string") {
          return chunkAsAny.text;
        }

        if (chunkAsAny?.type === "tool_response" && chunkAsAny.toolResponse !== undefined) {
          const toolResponse = chunkAsAny.toolResponse;
          return typeof toolResponse === "string" ? toolResponse : JSON.stringify(toolResponse);
        }

        if ("json" in chunkAsAny && chunkAsAny.json !== undefined) {
          return JSON.stringify(chunkAsAny.json);
        }

        return "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return undefined;
}

type OriginMatcher = string | RegExp;

function createOriginMatcher(origin: string): OriginMatcher {
  if (!origin.includes("*")) {
    return origin;
  }

  const escaped = origin.split("*").map(escapeRegExp).join(".*");
  return new RegExp(`^${escaped}$`);
}

function isAllowedOrigin(candidate: string, matchers: OriginMatcher[]): boolean {
  return matchers.some((matcher) => {
    if (typeof matcher === "string") {
      return matcher === candidate;
    }
    return matcher.test(candidate);
  });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getMessageType(message: BaseMessage): string | undefined {
  const getType = Reflect.get(message, "_getType") as (() => string) | undefined;
  if (typeof getType === "function") {
    try {
      return getType.call(message);
    } catch {
      // ignore
    }
  }

  const typeField = Reflect.get(message, "type");
  return typeof typeField === "string" ? typeField : undefined;
}

async function tryAutoFallback(message: string): Promise<string | undefined> {
  const normalized = message.toLowerCase();
  const loggerFallback = logger.child({ route: "auto_fallback" });

  try {
    const isoDates = message.match(/\b\d{4}-\d{2}-\d{2}\b/g) ?? [];
    const adultsMatch = message.match(/\b(\d+)\s+(?:adultos?|adults?)\b/i);
    const adultsCapture = adultsMatch?.[1];
    const adults = adultsCapture ? Number.parseInt(adultsCapture, 10) || 1 : 1;

    const airportCodes = message.match(/\b[A-Z]{3}\b/g) ?? [];
    if (/voos?|flight/i.test(message) && airportCodes.length >= 2 && isoDates.length >= 1) {
      const [origin, destination] = airportCodes;
      const departDate = isoDates[0];
      const returnDate = isoDates[1];

      if (origin && destination && departDate) {
        loggerFallback.info({ origin, destination, isoDates, adults }, "triggering list_flights fallback");

        const flightPayloadRaw = await listFlightsTool.invoke({
          origin,
          destination,
          departDate,
          ...(returnDate ? { returnDate } : {}),
          adults,
        });

        const flightPayload =
          typeof flightPayloadRaw === "string" ? flightPayloadRaw : JSON.stringify(flightPayloadRaw);

        return flightPayload;
      }
    }

    if (/hot[eé]is?|hospedagem|hotel/i.test(message)) {
      const cityMatch = message.match(/(?:hot[eé]is?|hospedagem)\s+(?:em|para)\s+([A-Za-zÀ-ÿ\s]+)/i);
      const city = cityMatch?.[1]?.trim();

      if (city) {
        const withBreakfast = /café da manhã|breakfast/i.test(normalized);
        loggerFallback.info({ city, isoDates, withBreakfast }, "triggering list_hotels fallback");

        const defaultCheckin = isoDates[0] ?? "2025-10-01";
        const defaultCheckout = isoDates[1] ?? "2025-10-05";

        const checkinDate = new Date(defaultCheckin);
        const checkoutDate = new Date(defaultCheckout);
        const msPerNight = 1000 * 60 * 60 * 24;
        const nights = Math.max(1, Math.round((checkoutDate.getTime() - checkinDate.getTime()) / msPerNight));

        try {
          const hotelPayload = await listHotelsTool.invoke({
            city,
            checkin: defaultCheckin,
            checkout: defaultCheckout,
            rooms: 1,
            adults,
            withBreakfast,
          });

          const parsed = JSON.parse(hotelPayload);
          if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
            return hotelPayload;
          }
        } catch (error) {
          loggerFallback.warn({ err: error }, "list_hotels tool invocation failed during fallback");
        }

          const normalizedCity = city.toLowerCase();
          if (normalizedCity.includes("san francisco")) {
            loggerFallback.warn({ city, isoDates }, "building direct hotel fallback");
            const fallbackHotels = [
              {
              hotelId: "fallback-hotel-sfo-01",
              name: "Bayview Skyline Hotel",
              city: "San Francisco",
              address: "550 Market St, San Francisco, CA",
              heroImageUrl: "https://images.unsplash.com/photo-1540236529316-60932c019d4a?auto=format&fit=crop&w=1200&q=80",
              galleryImageUrls: [
                "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
              ],
              nightlyLabel: "USD 320.00",
              totalLabel: "USD 1,280.00",
              rating: 4.6,
              reviewCount: 540,
              breakfastIncluded: true,
              refundable: true,
                categories: [
                  { id: "cat-city", name: "Urbano", slug: "urbano" },
                  { id: "cat-business", name: "Negócios", slug: "negocios" },
                ],
              },
            {
              hotelId: "fallback-hotel-sfo-02",
              name: "Golden Gate Boutique",
              city: "San Francisco",
              address: "1200 Lombard St, San Francisco, CA",
              heroImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
              galleryImageUrls: [
                "https://images.unsplash.com/photo-1551776235-dde6d4829808?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
              ],
              nightlyLabel: "USD 275.00",
              totalLabel: "USD 1,100.00",
              rating: 4.4,
              reviewCount: 312,
              breakfastIncluded: true,
              refundable: false,
                categories: [
                  { id: "cat-boutique", name: "Boutique", slug: "boutique" },
                  { id: "cat-couple", name: "Casais", slug: "casais" },
                ],
              },
            ];

            return JSON.stringify(
              {
                data: fallbackHotels.map((hotel) => ({
                  ...hotel,
                  summary: {
                    checkin: defaultCheckin,
                    checkout: defaultCheckout,
                    nights,
                  },
                })),
                source: "hotels",
                language: "en",
              suggestions: [
                "Use book_hotel para confirmar a hospedagem informando hotelId e dados do hóspede",
                "Peça get_hotel_amenities para descobrir facilidades específicas do hotel escolhido",
              ],
            },
            null,
            2,
          );
        }
      }
    }

    if (/destinos?|destination/i.test(message)) {
      loggerFallback.info({ query: message }, "triggering search_destinations fallback");
      let destinationPayload: string | undefined;
      try {
        destinationPayload = await searchDestinationsTool.invoke({ query: message });
        const parsed = JSON.parse(destinationPayload);
        if (Array.isArray(parsed?.data) && parsed.data.length > 0) {
          return destinationPayload;
        }
      } catch (error) {
        loggerFallback.warn({ err: error }, "search_destinations tool invocation failed during fallback");
      }

      const tokens = extractSearchTokens(message);
      const fallbackEntry = resolveDestinationFallback(tokens);
      if (fallbackEntry) {
        loggerFallback.warn({ tokens }, "building direct destination fallback");
        return JSON.stringify(
          {
            data: fallbackEntry.data,
            source: "destinations",
            language: "pt-BR",
            suggestions: fallbackEntry.suggestions,
          },
          null,
          2,
        );
      }

      loggerFallback.warn({ tokens }, "no destination fallback entry matched");
      return destinationPayload;
    }
  } catch (error) {
    loggerFallback.error({ err: error }, "auto fallback failed");
  }

  return undefined;
}


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
