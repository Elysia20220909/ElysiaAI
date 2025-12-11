import { Elysia, t } from 'elysia';
import { openapi, fromTypes } from '@elysiajs/openapi';
import { cors } from '@elysiajs/cors';

// 型定義
export type Node = { id: string; connected: string[] };
export type Agent = { id: string; position: string; userId: string; score: number; lastAction?: number };
export type GameState = { nodes: Node[]; agents: Agent[]; turn: number; history: string[]; winner?: string; lastMoveUser?: string };

let state: GameState = { nodes: [], agents: [], turn: 0, history: [] };
let clients: Set<any> = new Set();

const app = new Elysia()
  .use(cors({
    origin: '*',
    allowedHeaders: ['Content-Type'],
    methods: ['GET', 'POST'],
  }))
  .onAfterHandle(({ set }) => {
    set.headers['X-Content-Type-Options'] = 'nosniff';
    set.headers['X-Frame-Options'] = 'DENY';
    set.headers['X-XSS-Protection'] = '1; mode=block';
  })
  .use(openapi({ path: '/swagger', references: fromTypes() }))
  .get('/game/state', () => state)
  .post('/game/start', ({ body }) => {
    state = { ...body, turn: 0, history: [], winner: undefined };
    clients.clear();
    return state;
  }, {
    body: t.Object({
      nodes: t.Array(t.Object({ id: t.String(), connected: t.Array(t.String()) })),
      agents: t.Array(t.Object({ id: t.String(), position: t.String(), userId: t.String(), score: t.Number() }))
    })
  })
  .post('/game/action', ({ body }) => {
    if (state.winner) return state;
    const agent = state.agents.find(a => a.id === body.agentId && a.userId === body.userId);
    // ターン制: 直前のユーザーと同じならスキップ
    if (state.lastMoveUser === body.userId) {
      state.history.push(`Turn skipped: ${body.userId}`);
      return state;
    }
    if (agent && state.nodes.some(n => n.id === body.to)) {
      agent.position = body.to;
      agent.score += 1;
      agent.lastAction = state.turn;
      state.turn++;
      state.lastMoveUser = body.userId;
      state.history.push(`${agent.id} moved to ${body.to} (user: ${body.userId})`);
      // 特殊ルール例: 連続同じノード移動でペナルティ
      if (state.history.length >= 2) {
        const prev = state.history[state.history.length-2];
        if (prev.includes(`${agent.id} moved to ${body.to}`)) {
          agent.score -= 1;
          state.history.push(`Penalty: ${agent.id} repeated move`);
        }
      }
      // 勝利条件例: スコア10点で勝利
      if (agent.score >= 10) {
        state.winner = agent.userId;
        state.history.push(`Winner: ${agent.userId}`);
      }
      clients.forEach(ws => ws.send(JSON.stringify(state)));
    }
    return state;
  }, {
    body: t.Object({ agentId: t.String(), to: t.String(), userId: t.String() })
  })
  .ws('/game/ws', {
    open(ws) {
      clients.add(ws);
      ws.send(JSON.stringify(state));
      // WebSocket keepalive
      (ws.data.store as any).keepAlive = setInterval(() => {
        try { ws.send(JSON.stringify({ type: 'ping' })); } catch {}
      }, 30000);
    },
    close(ws) {
      clients.delete(ws);
      if ((ws.data.store as any).keepAlive) clearInterval((ws.data.store as any).keepAlive);
    },
    message(ws, msg) {
      try {
        const action = JSON.parse(typeof msg === 'string' ? msg : '');
        if (action.type === 'ping') return;
        const agent = state.agents.find(a => a.id === action.agentId && a.userId === action.userId);
        if (state.lastMoveUser === action.userId) {
          state.history.push(`Turn skipped: ${action.userId}`);
          return;
        }
        if (agent && state.nodes.some(n => n.id === action.to)) {
          agent.position = action.to;
          agent.score += 1;
          agent.lastAction = state.turn;
          state.turn++;
          state.lastMoveUser = action.userId;
          state.history.push(`${agent.id} moved to ${action.to} (user: ${action.userId})`);
          if (state.history.length >= 2) {
            const prev = state.history[state.history.length-2];
            if (prev.includes(`${agent.id} moved to ${action.to}`)) {
              agent.score -= 1;
              state.history.push(`Penalty: ${agent.id} repeated move`);
            }
          }
          if (agent.score >= 10) {
            state.winner = agent.userId;
            state.history.push(`Winner: ${agent.userId}`);
          }
          clients.forEach(c => {
            if (c.readyState === 1) c.send(JSON.stringify(state));
          });
        }
      } catch {}
    }
  })
  .listen(3001);

// ...existing code...
