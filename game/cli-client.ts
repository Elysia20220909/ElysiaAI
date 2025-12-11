import readline from 'readline';
import axios from 'axios';

const BASE_URL = 'http://localhost:3001';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function prompt(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('=== Elysia Network Game CLI ===');
  const userId = await prompt('あなたのユーザーID: ');
  const opponentId = await prompt('相手ユーザーID: ');

  // ゲーム初期化
  await axios.post(`${BASE_URL}/game/start`, {
    nodes: [ {id:'A',connected:['B']}, {id:'B',connected:['A','C']}, {id:'C',connected:['B']} ],
    agents: [ {id:'P1',position:'A',userId,score:0}, {id:'P2',position:'C',userId:opponentId,score:0} ]
  });
  console.log('ゲームを開始しました。');

  while (true) {
    const res = await axios.get(`${BASE_URL}/game/state`);
    const state = res.data;
    console.log(`\nターン: ${state.turn}`);
    state.agents.forEach((a: any) => {
      console.log(`エージェント: ${a.id} (ユーザー: ${a.userId}) 位置: ${a.position} スコア: ${a.score}`);
    });
    if (state.winner) {
      console.log(`\n=== 勝者: ${state.winner} ===`);
      break;
    }
    console.log('履歴:');
    state.history.slice(-5).forEach((h: string) => console.log('  ' + h));
    // 自分のエージェント
    const agent = state.agents.find((a: any) => a.userId === userId);
    const currentNode = state.nodes.find((n: any) => n.id === agent.position);
    console.log(`現在位置: ${agent.position}  移動可能: ${currentNode.connected.join(', ')}`);
    const to = await prompt('どこに移動しますか？: ');
    await axios.post(`${BASE_URL}/game/action`, { agentId: agent.id, to, userId });
  }
  rl.close();
}

main();
