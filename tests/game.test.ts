import { describe, test, expect } from "bun:test";
import axios from "axios";

const BASE_URL = "http://localhost:3001";

describe("Elysia Network Game API", () => {
  test("ゲーム初期化APIが正常に動作する", async () => {
    const res = await axios.post(`${BASE_URL}/game/start`, {
      nodes: [ {id:'A',connected:['B']}, {id:'B',connected:['A','C']}, {id:'C',connected:['B']} ],
      agents: [ {id:'P1',position:'A',userId:'user1',score:0}, {id:'P2',position:'C',userId:'user2',score:0} ]
    });
    expect(res.status).toBe(200);
    expect(res.data.nodes.length).toBe(3);
    expect(res.data.agents.length).toBe(2);
    expect(res.data.turn).toBe(0);
  });

  test("エージェント移動でターン・履歴・スコアが更新される", async () => {
    await axios.post(`${BASE_URL}/game/start`, {
      nodes: [ {id:'A',connected:['B']}, {id:'B',connected:['A','C']}, {id:'C',connected:['B']} ],
      agents: [ {id:'P1',position:'A',userId:'user1',score:0}, {id:'P2',position:'C',userId:'user2',score:0} ]
    });
    const res = await axios.post(`${BASE_URL}/game/action`, {
      agentId: 'P1', to: 'B', userId: 'user1'
    });
    expect(res.status).toBe(200);
    expect(res.data.turn).toBe(1);
    expect(res.data.history[0]).toContain('moved to B');
    expect(res.data.agents[0].score).toBe(1);
  });

  test("スコア10点で勝者が決定する", async () => {
    await axios.post(`${BASE_URL}/game/start`, {
      nodes: [ {id:'A',connected:['B']}, {id:'B',connected:['A','C']}, {id:'C',connected:['B']} ],
      agents: [ {id:'P1',position:'A',userId:'user1',score:9}, {id:'P2',position:'C',userId:'user2',score:0} ]
    });
    const res = await axios.post(`${BASE_URL}/game/action`, {
      agentId: 'P1', to: 'B', userId: 'user1'
    });
    expect(res.status).toBe(200);
    expect(res.data.winner).toBe('user1');
    expect(res.data.history.some(h=>h.includes('Winner: user1'))).toBe(true);
  });
});
