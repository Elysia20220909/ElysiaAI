const readline = require('readline');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const BASE_URL = 'http://localhost:3000';

function prompt(query) {
  return new Promise((resolve) => rl.question(query, (ans) => resolve(ans.trim())));
}

function printBoard(board) {
  console.log('  0 1 2 3 4 5 6 7');
  for (let i = 0; i < 8; i++) {
    let row = i + ' ';
    for (let j = 0; j < 8; j++) {
      row += board[i][j] === 0 ? '. ' : board[i][j] === 1 ? '● ' : '○ ';
    }
    console.log(row);
  }
}

async function main() {
  console.log('=== オセロCLI (Node.js/Windows対応) ===');
  function randomUser() {
    return 'user_' + Math.random().toString(36).slice(2, 8);
  }
  let user1 = (await prompt('ユーザー1名: ')).trim();
  let user2 = (await prompt('ユーザー2名/AI名: ')).trim();
  if (!user1) user1 = randomUser();
  if (!user2) user2 = randomUser();
  const mode = await prompt('モード選択: 1=対人 2=AI(ランダム) 3=AI(強い) 4=観戦 r=ランキング > ');
  if (mode === 'r') {
    const res = await fetch(`${BASE_URL}/game/ranking`);
    const ranking = await res.json();
    console.log('--- ランキング ---');
    ranking.forEach((r, i) => {
      console.log(`${i + 1}. ${r.user}: ${r.score}`);
    });
    rl.close();
    return;
  }
  // ...（以降のゲームロジックは省略）...
  rl.close();
}

main();
