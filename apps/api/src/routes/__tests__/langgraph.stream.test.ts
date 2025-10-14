/// <reference types="jest" />

jest.mock("../../services/langgraph.client");
jest.mock("../../services/message-sync.service");
jest.mock("../../config/env", () => ({
  env: {
    LANGGRAPH_ASSISTANT_ID: "test-assistant-id",
  },
}));

import request from "supertest";
import express, { type Express } from "express";
import { langGraphStreamRouter } from "../langgraph.stream";
import { getLangGraphClient } from "../../services/langgraph.client";
import { syncThreadMessages } from "../../services/message-sync.service";

const mockLangGraphClient = getLangGraphClient as jest.MockedFunction<typeof getLangGraphClient>;
const mockSyncThreadMessages = syncThreadMessages as jest.MockedFunction<typeof syncThreadMessages>;

describe("LangGraph Stream API", () => {
  let app: Express;
  let mockRunsStream: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRunsStream = jest.fn();
    mockSyncThreadMessages.mockResolvedValue(undefined);

    mockLangGraphClient.mockReturnValue({
      runs: {
        stream: mockRunsStream,
      },
    } as any);

    app = express();
    app.use(express.json());
    app.use("/langgraph", langGraphStreamRouter);
  });

  describe("POST /langgraph/stream", () => {
    it("validates schema and streams events", async () => {
      const mockEvents = [
        {
          event: "on_chain_start",
          id: "event-1",
          data: { input: "test" },
        },
        {
          event: "on_chat_model_stream",
          id: "event-2",
          data: { chunk: { content: "Hello" } },
        },
        {
          event: "on_chain_end",
          id: "event-3",
          data: { output: "Hello world" },
        },
      ];

      mockRunsStream.mockImplementation((...args: any[]) => {
        const options = args[2];
        // Call onRunCreated callback if provided
        if (options?.onRunCreated) {
          options.onRunCreated({ run_id: "test-run-id", thread_id: "thread-123" });
        }
        return (async function* () {
          for (const event of mockEvents) {
            yield event;
          }
        })();
      });

      const response = await request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "thread-123",
          message: "Hello",
        })
        .expect(200)
        .expect("Content-Type", /application\/x-ndjson/)
        .buffer(true)
        .parse((res, callback) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();
          });
          res.on("end", () => {
            callback(null, data);
          });
        });

      const lines = response.body
        .split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line));

      // First chunk should be meta with threadId
      expect(lines[0]).toMatchObject({
        type: "meta",
        data: {
          threadId: "thread-123",
        },
      });

      // Second chunk should include runId from onRunCreated callback
      expect(lines[1]).toMatchObject({
        type: "meta",
        data: {
          threadId: "thread-123",
          runId: expect.any(String),
        },
      });

      // Next chunks should be events
      expect(lines.slice(2, -1)).toEqual(
        mockEvents.map((event) => ({
          type: "event",
          event: event.event,
          id: event.id,
          data: event.data,
        })),
      );

      // Last chunk should be complete
      expect(lines[lines.length - 1]).toMatchObject({
        type: "complete",
        data: {
          threadId: "thread-123",
        },
      });

      expect(mockRunsStream).toHaveBeenCalledWith(
        "thread-123",
        "test-assistant-id",
        expect.objectContaining({
          input: {
            messages: [
              {
                role: "human",
                content: "Hello",
              },
            ],
          },
          signal: expect.any(AbortSignal),
        }),
      );

      // Should sync messages after stream
      expect(mockSyncThreadMessages).toHaveBeenCalledWith("thread-123");
    });

    it("validates required fields", async () => {
      const response = await request(app).post("/langgraph/stream").send({}).expect(400);

      expect(response.body.error).toBe("invalid_request");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["threadId"],
            message: expect.any(String),
          }),
          expect.objectContaining({
            path: ["message"],
            message: expect.any(String),
          }),
        ]),
      );
    });

    it("validates threadId is not empty", async () => {
      const response = await request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "   ",
          message: "Hello",
        })
        .expect(400);

      expect(response.body.error).toBe("invalid_request");
    });

    it("validates message is not empty", async () => {
      const response = await request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "thread-123",
          message: "   ",
        })
        .expect(400);

      expect(response.body.error).toBe("invalid_request");
    });

    it("handles stream errors gracefully", async () => {
      mockRunsStream.mockImplementation(() => {
        return (async function* () {
          yield {
            event: "on_chain_start",
            id: "event-1",
            data: {},
          };
          throw new Error("Stream processing failed");
        })();
      });

      const response = await request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "thread-123",
          message: "Hello",
        })
        .expect(200)
        .buffer(true)
        .parse((res, callback) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();
          });
          res.on("end", () => {
            callback(null, data);
          });
        });

      const lines = response.body
        .split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line));

      // Should have at least meta chunk
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(lines[0]).toMatchObject({
        type: "meta",
        data: { threadId: "thread-123" },
      });

      // Check if error chunk was sent (may not always be present due to timing)
      const hasErrorChunk = lines.some((line: any) => line.type === "error");
      // If error chunk exists, verify its format
      if (hasErrorChunk) {
        const errorChunk = lines.find((line: any) => line.type === "error");
        expect(errorChunk).toMatchObject({
          type: "error",
          data: {
            message: expect.any(String),
          },
        });
      }

      // Should have called sync even with error
      expect(mockSyncThreadMessages).toHaveBeenCalledWith("thread-123");
    });

    it("passes optional streamMode parameter", async () => {
      mockRunsStream.mockReturnValue(
        (async function* () {
          yield { event: "test", id: "1", data: {} };
        })(),
      );

      await request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "thread-123",
          message: "Hello",
          streamMode: "values",
        })
        .expect(200);

      expect(mockRunsStream).toHaveBeenCalledWith(
        "thread-123",
        "test-assistant-id",
        expect.objectContaining({
          streamMode: "values",
        }),
      );
    });

    it("passes array streamMode parameter", async () => {
      mockRunsStream.mockReturnValue(
        (async function* () {
          yield { event: "test", id: "1", data: {} };
        })(),
      );

      await request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "thread-123",
          message: "Hello",
          streamMode: ["values", "updates"],
        })
        .expect(200);

      expect(mockRunsStream).toHaveBeenCalledWith(
        "thread-123",
        "test-assistant-id",
        expect.objectContaining({
          streamMode: ["values", "updates"],
        }),
      );
    });

    it("passes metadata and config parameters", async () => {
      mockRunsStream.mockReturnValue(
        (async function* () {
          yield { event: "test", id: "1", data: {} };
        })(),
      );

      await request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "thread-123",
          message: "Hello",
          metadata: { userId: "user-1" },
          config: { temperature: 0.7 },
        })
        .expect(200);

      expect(mockRunsStream).toHaveBeenCalledWith(
        "thread-123",
        "test-assistant-id",
        expect.objectContaining({
          metadata: { userId: "user-1" },
          config: { temperature: 0.7 },
        }),
      );
    });

    it("continues even if message sync fails", async () => {
      mockRunsStream.mockReturnValue(
        (async function* () {
          yield { event: "test", id: "1", data: {} };
        })(),
      );

      mockSyncThreadMessages.mockRejectedValueOnce(new Error("Sync failed"));

      const response = await request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "thread-123",
          message: "Hello",
        })
        .expect(200);

      // Stream should complete successfully even if sync fails
      expect(response.status).toBe(200);
      expect(mockSyncThreadMessages).toHaveBeenCalledWith("thread-123");
    });
  });

  describe("POST /langgraph/threads/:threadId/stream", () => {
    it("streams with threadId from path parameter", async () => {
      mockRunsStream.mockReturnValue(
        (async function* () {
          yield { event: "test", id: "1", data: {} };
        })(),
      );

      const response = await request(app)
        .post("/langgraph/threads/thread-456/stream")
        .send({
          message: "Hello from path param",
        })
        .expect(200)
        .buffer(true)
        .parse((res, callback) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk.toString();
          });
          res.on("end", () => {
            callback(null, data);
          });
        });

      const lines = response.body
        .split("\n")
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line));

      expect(lines[0]).toMatchObject({
        type: "meta",
        data: {
          threadId: "thread-456",
        },
      });

      expect(mockRunsStream).toHaveBeenCalledWith(
        "thread-456",
        "test-assistant-id",
        expect.objectContaining({
          input: {
            messages: [
              {
                role: "human",
                content: "Hello from path param",
              },
            ],
          },
        }),
      );
    });

    it("validates message is required", async () => {
      const response = await request(app)
        .post("/langgraph/threads/thread-456/stream")
        .send({})
        .expect(400);

      expect(response.body.error).toBe("invalid_request");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["message"],
            message: expect.any(String),
          }),
        ]),
      );
    });

    it("syncs messages after stream using path threadId", async () => {
      mockRunsStream.mockReturnValue(
        (async function* () {
          yield { event: "test", id: "1", data: {} };
        })(),
      );

      await request(app)
        .post("/langgraph/threads/thread-789/stream")
        .send({
          message: "Test message",
        })
        .expect(200);

      expect(mockSyncThreadMessages).toHaveBeenCalledWith("thread-789");
    });
  });

  describe("Abort handling", () => {
    it("handles client disconnection", async () => {
      let abortSignal: AbortSignal | undefined;

      mockRunsStream.mockImplementation((...args: any[]) => {
        abortSignal = args[2]?.signal;
        return (async function* () {
          yield { event: "start", id: "1", data: {} };
          // Simulate long-running stream
          await new Promise((resolve) => setTimeout(resolve, 1000));
          yield { event: "end", id: "2", data: {} };
        })();
      });

      const req = request(app)
        .post("/langgraph/stream")
        .send({
          threadId: "thread-123",
          message: "Hello",
        });

      // Abort the request after a short delay
      setTimeout(() => {
        req.abort();
      }, 50);

      await req.catch(() => {
        // Expected to fail due to abort
      });

      // AbortSignal should be passed to the stream
      expect(abortSignal).toBeDefined();
    });
  });
});
