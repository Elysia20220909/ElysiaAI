
const BASE_URL = 'http://localhost:3001';

async function prompt(query: string): Promise<string> {
  process.stdout.write(query);
  return (await Bun.stdin.stream.readLine())?.trim() ?? '';
}

async function main() {
  console.log('=== Elysia Network Game CLI (Bun専用) ===');
  const userId = await prompt('あなたのユーザーID: ');
  const opponentId = await prompt('相手ユーザーID: ');

  // ゲーム初期化
  await fetch(`${BASE_URL}/game/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nodes: [ {id:'A',connected:['B']}, {id:'B',connected:['A','C']}, {id:'C',connected:['B']} ],
      agents: [ {id:'P1',position:'A',userId,score:0}, {id:'P2',position:'C',userId:opponentId,score:0} ]
    })
  });
  console.log('ゲームを開始しました。');

  while (true) {
    const res = await fetch(`${BASE_URL}/game/state`);
    const state = await res.json();
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
    await fetch(`${BASE_URL}/game/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agent.id, to, userId })
    });
  }
}

main();
