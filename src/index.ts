import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import 'dotenv/config';

// system prompt 読み込み
const systemPrompt = fs.readFileSync(path.join(__dirname, '../prompts/system.txt'), 'utf-8').trim();

const apiKey = process.env.OPENAI_API_KEY || '';
const model = process.env.MODEL || 'gpt-4.1-mini';

if (!apiKey) {
  console.error('OPENAI_API_KEYが設定されていません。.envを確認してください。');
  process.exit(1);
}

// 会話履歴（直近10件）
const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
  { role: 'system', content: systemPrompt }
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('AIチャットを開始します。終了は Ctrl+C');

async function chatLoop() {
  rl.question('> ', async (input) => {
    if (!input.trim()) {
      return chatLoop();
    }
    messages.push({ role: 'user', content: input });
    if (messages.length > 11) messages.splice(1, 1); // system以外10件
    console.log('USER:', input);

    // --- ここでAPI呼び出し ---
    // 実際はopenai API等を使う。ここではダミー返答。
    const response = await fakeOpenAI(messages);
    messages.push({ role: 'assistant', content: response });
    if (messages.length > 11) messages.splice(1, 1);
    console.log('AI:', response);
    chatLoop();
  });
}

// ダミーAI関数（本番はAPI呼び出しに置換）
async function fakeOpenAI(_msgs: typeof messages) {
  return '（ここにAIの返答が入ります）';
}

chatLoop();
