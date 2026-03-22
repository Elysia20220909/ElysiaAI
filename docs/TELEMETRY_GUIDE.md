# 🔍 OpenTelemetry Distributed Tracing

## Overview

Lightweight distributed tracing implementation compatible with W3C Trace Context specification and OpenTelemetry.

## Features

- ✅ W3C Trace Context support
- ✅ Distributed tracing across services
- ✅ Span lifecycle management
- ✅ Span events and attributes
- ✅ Error tracking
- ✅ Performance profiling
- ✅ Trace export for collectors

## Quick Start

### Basic Span Creation

```typescript
import { telemetry } from "./lib/telemetry";

// Start a span
const span = telemetry.startSpan("database.query", {
  attributes: {
    "db.system": "redis",
    "db.operation": "get",
  },
});

// Do work...

// End span
telemetry.endSpan(span.spanId, { code: "OK" });
```

### Trace Functions

```typescript
// Automatic span management
const result = await telemetry.trace("processData", async (span) => {
  span.attributes["data.size"] = data.length;

  // Your logic here
  const processed = await process(data);

  // Add events
  telemetry.addEvent(span.spanId, "processing.complete", {
    "result.count": processed.length,
  });

  return processed;
});
```

### HTTP Request Tracing

```typescript
import { getTraceContextFromRequest, telemetry } from "./lib/telemetry";

app.use(async ({ request, path, set }) => {
  // Extract parent trace context
  const parentContext = getTraceContextFromRequest(request);

  // Start span
  const span = telemetry.startSpan(`HTTP ${request.method} ${path}`, {
    parentContext: parentContext || undefined,
    attributes: {
      "http.method": request.method,
      "http.url": request.url,
      "http.route": path,
    },
  });

  // Add trace context to response
  set.headers["traceparent"] = telemetry.createTraceContext(span.traceId, span.spanId);

  try {
    // Continue request processing
    return;
  } finally {
    // End span on response
    telemetry.endSpan(span.spanId);
  }
});
```

### Nested Spans

```typescript
app.post("/api/process", async ({ body, request }) => {
  const parentContext = getTraceContextFromRequest(request);

  return await telemetry.trace(
    "api.process",
    async (parentSpan) => {
      // Nested span
      const childSpan = telemetry.startSpan("database.query", {
        parentContext: {
          traceId: parentSpan.traceId,
          spanId: parentSpan.spanId,
          traceFlags: 1,
        },
      });

      const data = await fetchFromDB();
      telemetry.endSpan(childSpan.spanId);

      // Another nested span
      await telemetry.trace(
        "processing.transform",
        async (transformSpan) => {
          transformSpan.attributes["data.count"] = data.length;
          return transform(data);
        },
        {
          parentContext: {
            traceId: parentSpan.traceId,
            spanId: parentSpan.spanId,
            traceFlags: 1,
          },
        },
      );

      return { success: true };
    },
    { parentContext: parentContext || undefined },
  );
});
```

## Span Attributes

### HTTP Attributes

```typescript
span.attributes = {
  "http.method": "POST",
  "http.url": "https://api.example.com/chat",
  "http.status_code": 200,
  "http.route": "/chat",
  "http.scheme": "https",
  "http.target": "/chat?mode=sweet",
};
```

### Database Attributes

```typescript
span.attributes = {
  "db.system": "redis",
  "db.operation": "get",
  "db.statement": "GET user:123",
  "db.connection_string": "redis://localhost:6379",
};
```

### Custom Attributes

```typescript
span.attributes = {
  "user.id": "user-123",
  "chat.mode": "sweet",
  "rag.query": "What is AI?",
  "llm.model": "llama3.2",
  "llm.temperature": 0.7,
};
```

## Span Events

```typescript
// Add event to span
telemetry.addEvent(span.spanId, "cache.hit", {
  "cache.key": "user:123",
  "cache.ttl": 3600,
});

telemetry.addEvent(span.spanId, "rag.query.start");
telemetry.addEvent(span.spanId, "rag.query.complete", {
  "query.duration_ms": 250,
  "results.count": 5,
});
```

## Error Tracking

```typescript
try {
  const result = await riskyOperation();
  telemetry.endSpan(span.spanId, { code: "OK" });
} catch (error) {
  telemetry.endSpan(span.spanId, {
    code: "ERROR",
    message: error instanceof Error ? error.message : "Unknown error",
  });

  telemetry.addEvent(span.spanId, "exception", {
    "exception.type": error.constructor.name,
    "exception.message": error.message,
    "exception.stacktrace": error.stack,
  });

  throw error;
}
```

## Exporting Traces

```typescript
// Export completed spans every 10 seconds
setInterval(() => {
  const spans = telemetry.exportSpans();

  if (spans.length > 0) {
    // Send to OpenTelemetry collector
    fetch("http://localhost:4318/v1/traces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spans }),
    });
  }
}, 10000);
```

## W3C Trace Context

### Request Headers

```
traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01
```

Format: `version-traceId-spanId-traceFlags`

### Creating Trace Context

```typescript
const traceparent = telemetry.createTraceContext(
  span.traceId,
  span.spanId,
  true, // sampled
);

// Add to response headers
set.headers["traceparent"] = traceparent;
```

## Telemetry Statistics

```typescript
// Get stats
const stats = telemetry.getStats();

console.log(stats);
/*
{
  totalSpans: 1250,
  activeSpans: 12,
  completedSpans: 1238,
  averageDuration: 125.5,
  traces: 450
}
*/
```

## Configuration

```typescript
import { Telemetry } from "./lib/telemetry";

const telemetry = new Telemetry(process.env.TELEMETRY_ENABLED !== "false");

// Disable in development
if (process.env.NODE_ENV === "development") {
  telemetry.setEnabled(false);
}
```

## Environment Variables

```bash
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
OTEL_SERVICE_NAME=elysia-ai
OTEL_SERVICE_VERSION=1.0.0
```

## Best Practices

1. **Always end spans**: Use try/finally or the `trace()` helper
2. **Add meaningful attributes**: Include relevant context
3. **Use semantic conventions**: Follow OpenTelemetry naming
4. **Propagate context**: Pass trace context across service boundaries
5. **Sample appropriately**: Don't trace every request in production
6. **Export regularly**: Send spans to collector periodically

## Integration with Monitoring

### Prometheus Integration

```typescript
// Track span metrics
app.get("/metrics", () => {
  const stats = telemetry.getStats();

  return `
# HELP traces_total Total number of traces
# TYPE traces_total counter
traces_total ${stats.traces}

# HELP spans_total Total number of spans
# TYPE spans_total counter
spans_total ${stats.totalSpans}

# HELP span_duration_avg Average span duration
# TYPE span_duration_avg gauge
span_duration_avg ${stats.averageDuration}
	`.trim();
});
```

### Grafana Visualization

Create dashboard queries:

- Trace duration distribution
- Error rate by span
- Request latency by endpoint
- Service dependency graph

## Testing

```typescript
import { describe, expect, it } from "bun:test";
import { telemetry } from "./lib/telemetry";

describe("telemetry", () => {
  beforeEach(() => {
    telemetry.clear();
  });

  it("should create and end span", () => {
    const span = telemetry.startSpan("test");
    expect(span.spanId).toBeDefined();

    telemetry.endSpan(span.spanId);
    const retrieved = telemetry.getSpan(span.spanId);
    expect(retrieved?.endTime).toBeDefined();
    expect(retrieved?.duration).toBeGreaterThan(0);
  });

  it("should trace async function", async () => {
    const result = await telemetry.trace("async-test", async (span) => {
      span.attributes["test"] = true;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "success";
    });

    expect(result).toBe("success");
  });

  it("should handle errors", async () => {
    try {
      await telemetry.trace("error-test", async () => {
        throw new Error("Test error");
      });
    } catch (error) {
      // Expected
    }

    const spans = telemetry.exportSpans();
    expect(spans[0].status.code).toBe("ERROR");
  });
});
```
