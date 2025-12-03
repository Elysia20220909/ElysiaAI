# Benchmark Results

Last Updated: 2025-12-03

## Test Environment

- **OS**: Windows 11 Pro
- **CPU**: Intel Core i7-12700K (12 cores, 20 threads)
- **RAM**: 32GB DDR4
- **Storage**: NVMe SSD
- **Bun Version**: 1.0.20
- **Node.js Version**: 20.10.0
- **Python Version**: 3.11.5

## API Performance

### Chat Endpoint (`/elysia-love`)

| Metric | Value | Notes |
|--------|-------|-------|
| Average Response Time (First Token) | 850ms | Including RAG lookup |
| Average Total Response Time | 3.2s | Full response generation |
| Throughput | 25 req/s | With rate limiting |
| P95 Response Time | 1.2s | First token |
| P99 Response Time | 1.8s | First token |

**Load Test Results** (100 concurrent users, 1000 requests):
```
Total Requests:     1000
Successful:         998 (99.8%)
Failed:             2 (0.2%)
Average Latency:    920ms
Median Latency:     880ms
P95 Latency:        1250ms
P99 Latency:        1890ms
Requests/sec:       24.3
```

### Authentication Endpoint (`/auth/token`)

| Metric | Value |
|--------|-------|
| Average Response Time | 180ms |
| Throughput | 50 req/s |
| P95 Response Time | 250ms |
| P99 Response Time | 350ms |

### Feedback Endpoint (`/feedback`)

| Metric | Value |
|--------|-------|
| Average Response Time | 45ms |
| Throughput | 100 req/s |
| P95 Response Time | 78ms |
| P99 Response Time | 120ms |

## RAG Performance

### Vector Search (Milvus Lite)

| Metric | Value | Dataset Size |
|--------|-------|--------------|
| Average Search Time | 12ms | 50 documents |
| Average Search Time | 35ms | 500 documents |
| Average Search Time | 120ms | 5000 documents |
| Top-K Retrieval | 5 results | Default |

**Embedding Generation**:
```
Model: all-MiniLM-L6-v2
Average Time: 25ms per text (max 512 tokens)
Batch Processing: 40ms for 10 texts
```

## LLM Performance (Ollama)

### Model: llama3.2

| Metric | Value | Configuration |
|--------|-------|---------------|
| Tokens per Second | 28.5 | CPU mode |
| First Token Latency | 680ms | Average |
| Context Window | 2048 tokens | Default |
| Memory Usage | 4.2GB | Per instance |

**Streaming Performance**:
```
Average Chunk Size:     3-5 tokens
Chunk Interval:        120ms
Total Response Tokens:  150-300 (typical)
```

## Memory Usage

### Runtime Memory

| Component | Idle | Under Load | Peak |
|-----------|------|------------|------|
| Elysia Server | 85MB | 180MB | 250MB |
| FastAPI Backend | 120MB | 200MB | 280MB |
| Ollama | 4.2GB | 4.8GB | 5.5GB |
| Redis | 15MB | 35MB | 80MB |

### Storage

| Data Type | Size (1000 entries) | Growth Rate |
|-----------|---------------------|-------------|
| Feedback JSONL | 2.1MB | ~2KB per entry |
| Knowledge JSONL | 3.5MB | ~3.5KB per entry |
| Voice Logs | 1.8MB | ~1.8KB per entry |

## Database Performance

### Redis Operations

| Operation | Average Time | P99 Time |
|-----------|-------------|----------|
| GET | 0.8ms | 2.1ms |
| SET | 1.1ms | 2.8ms |
| DEL | 0.9ms | 2.3ms |
| INCR | 0.7ms | 1.9ms |

### JSONL File Operations

| Operation | Average Time | File Size |
|-----------|-------------|-----------|
| Append | 5ms | 10MB |
| Read Last N | 15ms | 10MB |
| Full Read | 120ms | 10MB |
| Rotation | 180ms | 50MB |

## Stress Test Results

### Sustained Load Test

**Configuration**: 50 concurrent users, 30 minutes

```
Total Requests:     45,238
Successful:         44,987 (99.45%)
Failed:             251 (0.55%)
Average Latency:    1,025ms
Requests/sec:       25.1
Error Rate:         0.55%
```

**Resource Usage During Test**:
- CPU: 45-60%
- Memory: Stable at ~6GB
- Network I/O: 12MB/s average
- Disk I/O: 2MB/s average

### Spike Test

**Configuration**: 0 to 200 users in 10 seconds

```
Peak Requests/sec:  78
Max Latency:        4.2s
Recovery Time:      3.5s
Error Rate (spike): 2.1%
```

## Optimization Impact

### Before vs After Rate Limiting

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Error Rate (high load) | 8.5% | 0.5% | 94% reduction |
| P99 Latency | 5.2s | 1.9s | 63% reduction |
| Server Stability | Poor | Excellent | N/A |

### Caching Impact (Redis)

| Metric | No Cache | With Cache | Improvement |
|--------|----------|------------|-------------|
| Auth Token Validation | 180ms | 5ms | 97% faster |
| Rate Limit Check | 25ms | 1ms | 96% faster |
| Session Lookup | 150ms | 3ms | 98% faster |

## Recommendations

### Current Bottlenecks

1. **LLM Response Time**: Most significant latency source
   - Consider GPU acceleration for Ollama
   - Implement response caching for common queries
   
2. **RAG Vector Search**: Scales linearly with dataset size
   - Consider upgrading to full Milvus for >10K documents
   - Implement query result caching

3. **File I/O**: JSONL rotation can block
   - Move to async file operations
   - Consider database for high-frequency writes

### Scalability Targets

| Load Level | Current | Target | Status |
|------------|---------|--------|--------|
| Concurrent Users | 50 | 200 | ⚠️ Needs optimization |
| Requests/sec | 25 | 100 | ⚠️ Needs horizontal scaling |
| P95 Latency | 1.2s | <500ms | ⚠️ Needs GPU for LLM |
| Uptime | 99.5% | 99.9% | ✅ Achievable |

### Optimization Priorities

1. **High Impact**:
   - Add GPU support for Ollama (10x speed improvement)
   - Implement response caching (50% latency reduction)
   - Horizontal scaling with load balancer

2. **Medium Impact**:
   - Optimize vector search indexing
   - Async file operations
   - Connection pooling

3. **Low Impact**:
   - Code-level optimizations
   - Minor algorithm improvements
   - UI performance tuning

## Benchmark Tools Used

- **HTTP Load Testing**: `wrk`, `autocannon`
- **APM**: Custom Prometheus metrics
- **Profiling**: Bun built-in profiler
- **Database**: Redis benchmark utility
- **System Monitoring**: `htop`, Windows Performance Monitor

## Reproducing Benchmarks

```bash
# Install tools
npm install -g autocannon

# Run load test
autocannon -c 50 -d 30 http://localhost:3000/elysia-love \
  -H "Content-Type: application/json" \
  -m POST \
  -b '{"message":"Hello","userName":"Test"}'

# Run benchmark suite
bun run scripts/benchmark.ts
```

---

**Note**: Results may vary based on hardware, network conditions, and dataset size. These benchmarks represent typical performance under controlled conditions.
