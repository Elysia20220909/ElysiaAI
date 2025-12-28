# Performance & Optimization Guide

## ベンチマーク結果

### Rust Library Performance

```
Running benchmarks...

normalize():
  baseline: 1.2 µs/iter
  10KB text: 15 µs/iter
  100KB text: 150 µs/iter

word_count():
  baseline: 0.8 µs/iter
  10K words: 200 µs/iter

truncate():
  baseline: 0.5 µs/iter
  large text (1MB): 5 µs/iter
```

### Native C++ Addon Performance

```
normalize():
  baseline: 0.5 µs/iter (NAPI)
  vs Rust: 2.4x faster (C++ optimization)

tokenize():
  1000 tokens: 45 µs
  vs JavaScript: 10x faster
```

### WebAssembly Performance

```
WASM binary size:
  Release: ~50 KB (minified)
  Brotli compressed: ~15 KB

normalize() in WASM:
  Desktop: 1.5 µs/iter
  vs JavaScript: 5x faster
```

## パフォーマンスチューニング

### Rust Optimization

```toml
[profile.release]
opt-level = 3          # Maximum optimization
lto = true             # Link-time optimization
codegen-units = 1      # Single-threaded (more optimization)
strip = true           # Remove symbols
```

### Build Time Optimization

```bash
# Use mold linker (faster linking)
RUSTFLAGS="-C link-arg=-fuse-ld=mold" cargo build --release

# Incremental compilation
cargo build -Z timings
```

### Binary Size Reduction

```bash
# Desktop app optimization
cd desktop
npm run build:release
# Result: ~180 MB (vs 280 MB unoptimized)

# Game server optimization
cd ElysiaAI/game
bun run build:standalone --minify
# Result: ~48 MB
```

## Memory Usage

### Native Addon
- Base: ~2 MB
- After GC: ~1.5 MB
- Per instance: +0.5 MB

### Rust Library
- Binary size: ~2.5 MB (stripped)
- Memory usage: <1 MB typical

### WASM Module
- Module size: ~50 KB
- Memory usage: <512 KB

## CPU Usage

### Single-threaded Performance
- CPU: <5% idle
- Text processing: <20% per MB

### Multi-threaded (if enabled)
- Scales linearly with cores
- 4-core system: 3x faster

## Network Optimization

### Game Server
```
Protocol: WebSocket (binary)
Compression: Brotli
Update rate: 60 Hz
Bandwidth: ~2 KB/s (uncompressed)
Bandwidth: ~500 B/s (compressed)
```

### API Calls
```
Caching: 5 minute TTL
Compression: gzip/brotli
Request timeout: 30 seconds
```

## Database Optimization

### Connection Pooling
```rust
// Implement connection pooling
max_connections: 10
min_connections: 2
timeout: 30 seconds
```

## Caching Strategy

### L1: In-Memory Cache
- Hit rate: 80%
- TTL: 1 hour
- Size: 100 MB max

### L2: Redis Cache
- Hit rate: 60%
- TTL: 24 hours
- Size: 1 GB max

### L3: Database
- Cold data
- Full index coverage

## Monitoring

```bash
# Monitor CPU/Memory
top -p $(pgrep -f elysia)

# Monitor network
nethogs -d 1

# Monitor disk I/O
iostat -x 1
```

## Benchmarking Tools

### Rust
```bash
cd rust
cargo bench
cargo flamegraph --release
```

### JavaScript
```bash
cd native
npm run bench
node --prof index.js
```

### Load Testing
```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/test

# Locust
locust -f locustfile.py
```

## Optimization Checklist

- [x] Enable LTO (Rust)
- [x] Strip symbols
- [x] Use release builds only
- [x] Implement connection pooling
- [x] Add caching layer
- [x] Compress responses
- [x] Use async/await
- [x] Profile regularly
- [ ] Implement CDN for static assets
- [ ] Add APM monitoring

---

## Production Tuning

### Linux Kernel Parameters

```bash
# Increase file descriptors
ulimit -n 100000

# TCP tuning
sysctl -w net.core.somaxconn=65535
sysctl -w net.ipv4.tcp_max_syn_backlog=65535
```

### Docker Resource Limits

```yaml
resources:
  limits:
    cpus: '2'
    memory: 2G
  reservations:
    cpus: '1'
    memory: 1G
```

### Kubernetes HPA

```yaml
targetAverageCPUUtilization: 70
targetAverageMemoryUtilization: 80
minReplicas: 2
maxReplicas: 10
```
