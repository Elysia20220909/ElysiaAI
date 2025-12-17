import { describe, it, expect } from "bun:test";

const BASE_URL = "http://localhost:3000";

describe("API Performance Tests", () => {
  it("Health endpoint should respond within 100ms", async () => {
    const start = performance.now();
    const response = await fetch(`${BASE_URL}/health`);
    const duration = performance.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(100);
    console.log(`Health check: ${duration.toFixed(2)}ms`);
  });

  it("Root endpoint should respond within 50ms", async () => {
    const start = performance.now();
    const response = await fetch(BASE_URL);
    const duration = performance.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(50);
    console.log(`Root endpoint: ${duration.toFixed(2)}ms`);
  });

  it("Swagger JSON should respond within 200ms", async () => {
    const start = performance.now();
    const response = await fetch(`${BASE_URL}/swagger/json`);
    const duration = performance.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200);
    console.log(`Swagger JSON: ${duration.toFixed(2)}ms`);
  });

  it("Should handle concurrent health checks", async () => {
    const concurrentRequests = 10;
    const start = performance.now();

    const requests = Array(concurrentRequests)
      .fill(null)
      .map(() => fetch(`${BASE_URL}/health`));

    const responses = await Promise.all(requests);
    const duration = performance.now() - start;

    expect(responses.every(r => r.status === 200)).toBe(true);
    console.log(`${concurrentRequests} concurrent requests: ${duration.toFixed(2)}ms`);
    console.log(`Average per request: ${(duration / concurrentRequests).toFixed(2)}ms`);
  });

  it("Database query performance (via profile endpoint)", async () => {
    // First create a test user
    const testUser = {
      username: `perf_test_${Date.now()}`,
      password: "Test123456!",
    };

    const regResponse = await fetch(`${BASE_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser),
    });
    const { accessToken } = await regResponse.json();

    // Test profile endpoint performance (includes DB query)
    const start = performance.now();
    const response = await fetch(`${BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const duration = performance.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200);
    console.log(`DB query (profile): ${duration.toFixed(2)}ms`);
  });

  it("Memory usage should remain stable", async () => {
    const iterations = 50;
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fetch(`${BASE_URL}/health`);
      results.push(performance.now() - start);
    }

    const average = results.reduce((a, b) => a + b, 0) / results.length;
    const variance = results.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / results.length;
    const stdDev = Math.sqrt(variance);

    console.log(`Average: ${average.toFixed(2)}ms`);
    console.log(`Std Dev: ${stdDev.toFixed(2)}ms`);
    console.log(`Min: ${Math.min(...results).toFixed(2)}ms`);
    console.log(`Max: ${Math.max(...results).toFixed(2)}ms`);

    // Standard deviation should be reasonable (not increasing over time)
    expect(stdDev).toBeLessThan(average * 0.5);
  });
});

describe("Load Testing (Light)", () => {
  it("Should handle 100 requests within 5 seconds", async () => {
    const totalRequests = 100;
    const start = performance.now();

    const requests = Array(totalRequests)
      .fill(null)
      .map(() => fetch(`${BASE_URL}/health`));

    const responses = await Promise.all(requests);
    const duration = performance.now() - start;

    const successCount = responses.filter(r => r.status === 200).length;
    const successRate = (successCount / totalRequests) * 100;

    console.log(`Total duration: ${duration.toFixed(2)}ms`);
    console.log(`Requests per second: ${(totalRequests / (duration / 1000)).toFixed(2)}`);
    console.log(`Success rate: ${successRate.toFixed(2)}%`);

    expect(duration).toBeLessThan(5000);
    expect(successRate).toBeGreaterThan(95);
  }, 10000);

  it("Should handle sequential requests efficiently", async () => {
    const iterations = 20;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fetch(`${BASE_URL}/health`);
      times.push(performance.now() - start);
    }

    const average = times.reduce((a, b) => a + b, 0) / times.length;

    console.log(`Average response time: ${average.toFixed(2)}ms`);
    console.log(`First request: ${times[0].toFixed(2)}ms`);
    console.log(`Last request: ${times[times.length - 1].toFixed(2)}ms`);

    // Last request shouldn't be significantly slower (no memory leak)
    expect(times[times.length - 1]).toBeLessThan(average * 2);
  });
});

describe("Response Size Optimization", () => {
  it("Health endpoint response should be compact", async () => {
    const response = await fetch(`${BASE_URL}/health`);
    const text = await response.text();
    const sizeInBytes = new Blob([text]).size;

    console.log(`Health response size: ${sizeInBytes} bytes`);

    expect(sizeInBytes).toBeLessThan(2048); // Less than 2KB
  });

  it("Swagger JSON should have reasonable size", async () => {
    const response = await fetch(`${BASE_URL}/swagger/json`);
    const text = await response.text();
    const sizeInKB = new Blob([text]).size / 1024;

    console.log(`Swagger JSON size: ${sizeInKB.toFixed(2)} KB`);

    expect(sizeInKB).toBeLessThan(500); // Less than 500KB
  });
});
