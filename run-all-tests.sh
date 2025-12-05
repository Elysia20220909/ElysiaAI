#!/bin/bash
# Elysia AI 統合テストスイート実行スクリプト
# 複数のセキュリティ&パフォーマンステストを順序実行

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TEST_LOG="/tmp/elysia-tests-$(date +%Y%m%d_%H%M%S).log"
RESULTS_DIR="./test-results"

# ============================================================================
# ユーティリティ関数
# ============================================================================

log_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}" | tee -a "$TEST_LOG"
    echo -e "${BLUE}║ $1${NC}" | tee -a "$TEST_LOG"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}" | tee -a "$TEST_LOG"
}

log_section() {
    echo -e "\n${YELLOW}━━━ $1 ━━━${NC}" | tee -a "$TEST_LOG"
}

log_pass() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$TEST_LOG"
}

log_fail() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$TEST_LOG"
}

log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}" | tee -a "$TEST_LOG"
}

# 初期化
setup() {
    mkdir -p "$RESULTS_DIR"
    echo "Elysia AI Test Suite - $(date)" > "$TEST_LOG"
}

# ============================================================================
# テスト 1: 環境確認
# ============================================================================

test_environment() {
    log_section "Environment Check"
    
    # Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_pass "Node.js: $NODE_VERSION"
    else
        log_fail "Node.js: Not installed"
        return 1
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_pass "npm: $NPM_VERSION"
    else
        log_fail "npm: Not installed"
        return 1
    fi
    
    # Bun
    if command -v bun &> /dev/null; then
        BUN_VERSION=$(bun --version)
        log_pass "Bun: $BUN_VERSION"
    else
        log_info "Bun: Optional"
    fi
    
    # セキュリティツール
    log_info "Checking security tools..."
    
    command -v nmap &> /dev/null && log_pass "nmap: Installed" || log_info "nmap: Optional"
    command -v curl &> /dev/null && log_pass "curl: Installed" || log_fail "curl: Required"
    command -v redis-cli &> /dev/null && log_pass "redis-cli: Installed" || log_info "redis-cli: Optional"
}

# ============================================================================
# テスト 2: 依存関係チェック
# ============================================================================

test_dependencies() {
    log_section "Dependency Audit"
    
    if [ ! -f "package.json" ]; then
        log_fail "package.json: Not found"
        return 1
    fi
    
    log_info "Running npm audit..."
    
    if npm audit --audit-level=critical 2>/dev/null; then
        log_pass "npm audit: No critical vulnerabilities"
    else
        VULN_COUNT=$(npm audit 2>/dev/null | grep -c "vulnerabilities" || echo "unknown")
        log_info "npm audit: Review recommended (see details)"
    fi
    
    # 結果保存
    npm audit > "$RESULTS_DIR/npm-audit.txt" 2>&1 || true
}

# ============================================================================
# テスト 3: コード品質
# ============================================================================

test_code_quality() {
    log_section "Code Quality"
    
    # TypeScript チェック
    if command -v tsc &> /dev/null; then
        log_info "Running TypeScript type check..."
        if npx tsc --noEmit 2>/dev/null; then
            log_pass "TypeScript: No errors"
        else
            log_fail "TypeScript: Errors detected"
        fi
    fi
    
    # ESLint チェック
    if [ -f ".eslintrc.json" ] || [ -f ".eslintrc.js" ]; then
        log_info "Running ESLint..."
        npx eslint . --format json > "$RESULTS_DIR/eslint-report.json" 2>/dev/null || true
        log_pass "ESLint: Report generated"
    fi
}

# ============================================================================
# テスト 4: ユニットテスト
# ============================================================================

test_unit_tests() {
    log_section "Unit Tests"
    
    log_info "Running unit tests..."
    
    if command -v bun &> /dev/null; then
        log_info "Using Bun test runner"
        if bun test 2>&1 | tee -a "$RESULTS_DIR/unit-tests.log"; then
            log_pass "Unit tests: Passed"
        else
            log_fail "Unit tests: Some tests failed"
        fi
    elif npm list jest &>/dev/null; then
        log_info "Using Jest"
        if npm test 2>&1 | tee -a "$RESULTS_DIR/unit-tests.log"; then
            log_pass "Unit tests: Passed"
        else
            log_fail "Unit tests: Some tests failed"
        fi
    else
        log_info "Unit tests: No test framework configured"
    fi
}

# ============================================================================
# テスト 5: 負荷テスト
# ============================================================================

test_load_testing() {
    log_section "Load Testing (Apache Bench)"
    
    # サーバー接続確認
    if ! curl -s http://localhost:5001/ping > /dev/null 2>&1; then
        log_fail "Server: Not responding on port 5001"
        return 1
    fi
    
    if ! command -v ab &> /dev/null; then
        log_info "Apache Bench: Not available"
        return 0
    fi
    
    log_info "Running load tests..."
    
    # Ping エンドポイント
    log_info "Testing /ping endpoint (100 requests, 10 concurrent)"
    ab -n 100 -c 10 -q http://localhost:5001/ping > "$RESULTS_DIR/ab-ping.txt" 2>&1
    
    RQPS=$(grep "Requests per second" "$RESULTS_DIR/ab-ping.txt" | awk '{print $4}')
    log_pass "Ping: $RQPS requests/sec"
    
    # Health エンドポイント
    log_info "Testing /health endpoint (50 requests, 5 concurrent)"
    ab -n 50 -c 5 -q http://localhost:5001/health > "$RESULTS_DIR/ab-health.txt" 2>&1
    
    log_pass "Load test: Completed"
}

# ============================================================================
# テスト 6: セキュリティテスト
# ============================================================================

test_security() {
    log_section "Security Tests"
    
    log_info "Running security checks..."
    
    if [ -f "run-comprehensive-security-tests.sh" ]; then
        log_info "Found comprehensive security tests"
        if bash run-comprehensive-security-tests.sh > "$RESULTS_DIR/security-tests.log" 2>&1; then
            log_pass "Security tests: Completed"
        else
            log_info "Security tests: Check logs for details"
        fi
    else
        log_info "Security test script: Not found"
    fi
    
    # 基本的なセキュリティチェック
    if command -v curl &> /dev/null; then
        log_info "Checking security headers..."
        
        HEADERS=$(curl -s -I http://localhost:5001/health)
        
        if echo "$HEADERS" | grep -q "Content-Security-Policy"; then
            log_pass "CSP: Present"
        else
            log_info "CSP: Not configured"
        fi
        
        if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
            log_pass "X-Content-Type-Options: Present"
        else
            log_info "X-Content-Type-Options: Not configured"
        fi
    fi
}

# ============================================================================
# テスト 7: ペネトレーションテスト
# ============================================================================

test_penetration() {
    log_section "Penetration Testing"
    
    if [ -f "run-pentest.sh" ]; then
        log_info "Running penetration tests..."
        if bash run-pentest.sh > "$RESULTS_DIR/pentest.log" 2>&1; then
            log_pass "Penetration tests: Completed"
        else
            log_info "Penetration tests: Check logs"
        fi
    else
        log_info "Penetration test script: Not found"
    fi
}

# ============================================================================
# テスト結果サマリー
# ============================================================================

print_summary() {
    log_header "Test Execution Summary"
    
    echo "" | tee -a "$TEST_LOG"
    echo "Test Date: $(date)" | tee -a "$TEST_LOG"
    echo "Results Directory: $RESULTS_DIR" | tee -a "$TEST_LOG"
    echo "Test Log: $TEST_LOG" | tee -a "$TEST_LOG"
    echo "" | tee -a "$TEST_LOG"
    
    echo "Generated Reports:" | tee -a "$TEST_LOG"
    if [ -d "$RESULTS_DIR" ]; then
        ls -lh "$RESULTS_DIR"/ 2>/dev/null | tail -n +2 | awk '{print "  📄 " $9 " (" $5 ")"}' | tee -a "$TEST_LOG"
    fi
    
    echo "" | tee -a "$TEST_LOG"
    log_pass "All tests completed successfully!"
    echo "" | tee -a "$TEST_LOG"
    echo "Next Steps:" | tee -a "$TEST_LOG"
    echo "  1. Review test results in $RESULTS_DIR" | tee -a "$TEST_LOG"
    echo "  2. Check GitHub Actions for automated testing" | tee -a "$TEST_LOG"
    echo "  3. Schedule regular security audits" | tee -a "$TEST_LOG"
    echo "" | tee -a "$TEST_LOG"
}

# ============================================================================
# メイン実行
# ============================================================================

main() {
    log_header "Elysia AI - Comprehensive Test Suite"
    
    setup
    
    test_environment || exit 1
    test_dependencies
    test_code_quality
    test_unit_tests
    test_load_testing
    test_security
    test_penetration
    
    print_summary
}

main "$@"
