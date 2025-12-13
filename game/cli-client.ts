

const BASE_URL = 'http://localhost:3001';

async function prompt(query: string): Promise<string> {
  process.stdout.write(query);
  return (await Bun.stdin.stream.readLine())?.trim() ?? '';
}

function printBoard(board: number[][]) {
  console.log('  0 1 2 3 4 5 6 7');
  for (let y = 0; y < 8; ++y) {
    let row = '' + y + ' ';
    for (let x = 0; x < 8; ++x) {
      row += board[y][x] === 1 ? '● ' : board[y][x] === 2 ? '○ ' : '. ';
    }
    console.log(row);
  }
}

async function main() {
  console.log('=== オセロCLI (Bun専用) ===');
  const user1 = await prompt('ユーザー1名: ');
  const user2 = await prompt('ユーザー2名/AI名: ');
  const mode = await prompt('モード選択: 1=対人 2=AI(ランダム) 3=AI(強い) 4=観戦 r=ランキング > ');
  if (mode === 'r') {
    const res = await fetch(`${BASE_URL}/game/ranking`);
    const ranking = await res.json();
    console.log('--- ランキング ---');
    Object.entries(ranking).forEach(([user, rec]: any) => {
      console.log(`${user}: 勝${rec.win} 敗${rec.lose} 引分${rec.draw}`);
    });
    return;
  }
  let userIds = [user1 || 'user1', user2 || 'user2'];
  if (mode === '2' || mode === '3') {
    const aiLevel = mode === '3' ? 'strong' : 'random';
    userIds[1] = user2 && user2 !== 'user2' ? user2 : 'AI';
    await fetch(`${BASE_URL}/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aiEnabled: true, aiLevel, userIds })
    });
    console.log(`AI対戦(${aiLevel === 'strong' ? '強いAI' : 'ランダム'})で開始。黒(●)が先手です。`);
  } else if (mode === '4') {
    console.log('観戦モード。盤面のみ表示します。');
  } else {
    await fetch(`${BASE_URL}/game/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIds })
    });
    console.log('対人モードで開始。黒(●)が先手です。');
  }

  while (true) {
    const res = await fetch(`${BASE_URL}/game/state`);
    const state = await res.json();
    printBoard(state.board);
    if (state.winner) {
      console.log(`\n=== 勝者: ${state.winner} ===`);
      break;
    }
    console.log(`ターン: ${state.turn === 1 ? '黒(●)' : '白(○)'}`);
    console.log('履歴:');
    state.history.slice(-5).forEach((h: string) => console.log('  ' + h));
    if (mode === '3') {
      await new Promise(r=>setTimeout(r,1500));
      continue;
    }
    const input = await prompt('着手座標 x y（例: 2 3）: ');
    const [x, y] = input.split(/\s+/).map(Number);
    if (isNaN(x) || isNaN(y) || x < 0 || x > 7 || y < 0 || y > 7) {
      console.log('座標は0～7の数字で入力してください。');
      continue;
    }
    await fetch(`${BASE_URL}/game/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x, y, player: state.turn })
    });
  }
}

main();
