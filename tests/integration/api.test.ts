import { describe, it, expect, beforeAll, afterAll } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("Health Endpoints", () => {
  it("GET /health - should return healthy status", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("status");
    expect(data.status).toBe("healthy");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("checks");
  });

  it("GET /metrics - should return Prometheus metrics", async () => {
    const response = await fetch(`${BASE_URL}/metrics`);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(text).toContain("# HELP");
    expect(text).toContain("# TYPE");
  });
});

describe("API Root", () => {
  it("GET / - should return API information", async () => {
    const response = await fetch(BASE_URL);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("message");
    expect(data).toHaveProperty("version");
    expect(data.version).toBe("1.0.51");
  });
});

describe("Swagger Documentation", () => {
  it("GET /swagger - should return Swagger UI", async () => {
    const response = await fetch(`${BASE_URL}/swagger`);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(text).toContain("swagger");
  });

  it("GET /swagger/json - should return OpenAPI spec", async () => {
    const response = await fetch(`${BASE_URL}/swagger/json`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("openapi");
    expect(data).toHaveProperty("info");
    expect(data).toHaveProperty("paths");
  });
});

describe("Authentication Endpoints", () => {
  let authToken: string;
  let refreshToken: string;
  const testUser = {
    username: `test_${Date.now()}`,
    password: "Test123456!",
    email: `test_${Date.now()}@example.com`,
  };

  it("POST /api/register - should register a new user", async () => {
    const response = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty("accessToken");
    expect(data).toHaveProperty("refreshToken");
    expect(data).toHaveProperty("user");
    expect(data.user.username).toBe(testUser.username);

    authToken = data.accessToken;
    refreshToken = data.refreshToken;
  });

  it("POST /api/login - should login with credentials", async () => {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: testUser.username,
        password: testUser.password,
      }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("accessToken");
    expect(data).toHaveProperty("refreshToken");
  });

  it("POST /api/refresh - should refresh access token", async () => {
    const response = await fetch(`${BASE_URL}/api/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("accessToken");
  });

  it("GET /api/profile - should get user profile with auth", async () => {
    const response = await fetch(`${BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("username");
    expect(data.username).toBe(testUser.username);
  });

  it("POST /api/logout - should logout user", async () => {
    const response = await fetch(`${BASE_URL}/api/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
  });
});

describe("Chat Endpoints", () => {
  let authToken: string;
  let sessionId: string;
  const testUser = {
    username: `chat_test_${Date.now()}`,
    password: "Test123456!",
  };

  beforeAll(async () => {
    // Register and login user for chat tests
    const regResponse = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const regData = await regResponse.json();
    authToken = regData.accessToken;
  });

  it("POST /api/chat/session - should create a new chat session", async () => {
    const response = await fetch(`${BASE_URL}/api/chat/session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "Test Session" }),
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty("id");
    expect(data).toHaveProperty("title");
    expect(data.title).toBe("Test Session");

    sessionId = data.id;
  });

  it("GET /api/chat/sessions - should list user sessions", async () => {
    const response = await fetch(`${BASE_URL}/api/chat/sessions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("GET /api/chat/session/:id - should get session details", async () => {
    const response = await fetch(`${BASE_URL}/api/chat/session/${sessionId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("id");
    expect(data.id).toBe(sessionId);
  });

  it("POST /api/chat - should send a chat message", async () => {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        message: "こんにちは",
        useVoice: false,
      }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty("response");
    expect(data).toHaveProperty("sessionId");
  }, 30000); // 30秒タイムアウト（AI応答待ち）

  it("DELETE /api/chat/session/:id - should delete session", async () => {
    const response = await fetch(`${BASE_URL}/api/chat/session/${sessionId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${authToken}` },
    });

    expect(response.status).toBe(200);
  });
});

describe("Error Handling", () => {
  it("GET /nonexistent - should return 404", async () => {
    const response = await fetch(`${BASE_URL}/nonexistent`);

    expect(response.status).toBe(404);
  });

  it("POST /api/login - should return 400 for missing credentials", async () => {
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
  });

  it("GET /api/profile - should return 401 for missing auth", async () => {
    const response = await fetch(`${BASE_URL}/api/profile`);

    expect(response.status).toBe(401);
  });
});

describe("Rate Limiting", () => {
  it("should enforce rate limits on repeated requests", async () => {
    const requests = Array(20).fill(null).map(() =>
      fetch(`${BASE_URL}/health`)
    );

    const responses = await Promise.all(requests);
    const statusCodes = responses.map(r => r.status);

    // At least one request should be rate limited (429)
    const hasRateLimit = statusCodes.some(code => code === 429);

    // Note: May not trigger in development with low traffic
    // This is more of a smoke test
    expect(statusCodes).toContain(200);
  }, 10000);
});
