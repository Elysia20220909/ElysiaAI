/**
 * Neuro Integration Routes for Elysia AI
 * Neuro モジュール統合ルート
 *
 * Bridges communication between Elysia server and Python FastAPI/Neuro backend
 * メモリ検索、RAG、チャット機能を統合
 */

import { Elysia, t } from "elysia";
import axios, { AxiosError } from "axios";

// ==================== Configuration ====================
const FASTAPI_HOST = process.env.DATABASE_CONFIG?.RAG_API_URL || "http://127.0.0.1:8000";

// ==================== Type Definitions ====================
interface MemoryResponse {
  id: string;
  document: string;
  metadata: Record<string, unknown>;
  distance?: number;
}

interface MemoriesResult {
  memories: MemoryResponse[];
  query?: string;
  count: number;
}

interface CreateMemoryRequest {
  document: string;
  metadata?: Record<string, unknown>;
}

interface QueryMemoriesRequest {
  query: string;
  limit?: number;
}

// ==================== Error Handling ====================
const handleApiError = (error: unknown, context: string) => {
  const err = error as AxiosError;
  const statusCode = err?.response?.status || 500;
  const message = (err?.response?.data as any)?.detail ||
                  err?.message ||
                  `${context} failed`;

  console.error(`❌ ${context}:`, message);
  return {
    error: message,
    status: statusCode,
  };
};

// ==================== Neuro Routes ====================
export const neuroRoutes = new Elysia({ prefix: "/api/neuro" })

  // ==================== Memory Query ====================
  .post(
    "/memory/query",
    async ({ body }: { body: QueryMemoriesRequest }) => {
      try {
        const response = await axios.post<MemoriesResult>(
          `${FASTAPI_HOST}/neuro/memory/query`,
          body,
          { timeout: 10000 }
        );
        return response.data;
      } catch (error) {
        return handleApiError(error, "Memory query");
      }
    },
    {
      body: t.Object({
        query: t.String(),
        limit: t.Optional(t.Number()),
      }),
      detail: {
        tags: ["Neuro Memory"],
        description: "Query Neuro memories using semantic search",
      },
    }
  )

  // ==================== Create Memory ====================
  .post(
    "/memory/create",
    async ({ body }: { body: CreateMemoryRequest }) => {
      try {
        const response = await axios.post(
          `${FASTAPI_HOST}/neuro/memory/create`,
          body,
          { timeout: 10000 }
        );
        return response.data;
      } catch (error) {
        return handleApiError(error, "Memory creation");
      }
    },
    {
      body: t.Object({
        document: t.String(),
        metadata: t.Optional(t.Record(t.String(), t.Any())),
      }),
      detail: {
        tags: ["Neuro Memory"],
        description: "Create a new memory entry",
      },
    }
  )

  // ==================== Delete Memory ====================
  .delete(
    "/memory/:id",
    async ({ params }: { params: { id: string } }) => {
      try {
        const response = await axios.delete(
          `${FASTAPI_HOST}/neuro/memory/${params.id}`,
          { timeout: 10000 }
        );
        return response.data;
      } catch (error) {
        return handleApiError(error, "Memory deletion");
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        tags: ["Neuro Memory"],
        description: "Delete a memory by ID",
      },
    }
  )

  // ==================== Get All Memories ====================
  .get(
    "/memory/all",
    async () => {
      try {
        const response = await axios.get<MemoriesResult>(
          `${FASTAPI_HOST}/neuro/memory/all`,
          { timeout: 10000 }
        );
        return response.data;
      } catch (error) {
        return handleApiError(error, "Fetch all memories");
      }
    },
    {
      detail: {
        tags: ["Neuro Memory"],
        description: "Retrieve all memories",
      },
    }
  )

  // ==================== Clear Memories ====================
  .post(
    "/memory/clear",
    async ({ query }: { query?: { type?: string } }) => {
      try {
        const params = new URLSearchParams();
        if (query?.type) {
          params.append("memory_type", query.type);
        }

        const response = await axios.post(
          `${FASTAPI_HOST}/neuro/memory/clear?${params.toString()}`,
          {},
          { timeout: 10000 }
        );
        return response.data;
      } catch (error) {
        return handleApiError(error, "Clear memories");
      }
    },
    {
      detail: {
        tags: ["Neuro Memory"],
        description: "Clear memories by type or all",
      },
    }
  )

  // ==================== Export Memories ====================
  .post(
    "/memory/export",
    async ({ query }: { query?: { path?: string } }) => {
      try {
        const params = new URLSearchParams();
        if (query?.path) {
          params.append("output_path", query.path);
        }

        const response = await axios.post(
          `${FASTAPI_HOST}/neuro/memory/export?${params.toString()}`,
          {},
          { timeout: 10000 }
        );
        return response.data;
      } catch (error) {
        return handleApiError(error, "Export memories");
      }
    },
    {
      detail: {
        tags: ["Neuro Memory"],
        description: "Export memories to JSON",
      },
    }
  )

  // ==================== Import Memories ====================
  .post(
    "/memory/import",
    async ({ query }: { query?: { path?: string } }) => {
      try {
        if (!query?.path) {
          return { error: "path parameter is required", status: 400 };
        }

        const params = new URLSearchParams();
        params.append("input_path", query.path);

        const response = await axios.post(
          `${FASTAPI_HOST}/neuro/memory/import?${params.toString()}`,
          {},
          { timeout: 10000 }
        );
        return response.data;
      } catch (error) {
        return handleApiError(error, "Import memories");
      }
    },
    {
      detail: {
        tags: ["Neuro Memory"],
        description: "Import memories from JSON",
      },
    }
  )

  // ==================== Health Check ====================
  .get(
    "/health",
    async () => {
      try {
        const response = await axios.get(
          `${FASTAPI_HOST}/docs`,
          { timeout: 5000 }
        );
        return {
          status: "ok",
          backend: "fastapi",
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          status: "error",
          message: "FastAPI backend is unavailable",
          timestamp: new Date().toISOString(),
        };
      }
    },
    {
      detail: {
        tags: ["Neuro Health"],
        description: "Check Neuro backend health",
      },
    }
  );

export default neuroRoutes;
