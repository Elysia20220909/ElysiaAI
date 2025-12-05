// 公式Node Redis クライアントでテスト
// redis-cli互換の接続方法
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const redisUrl = "redis://default:Hr7pQ66mbyxnu9M2QTPyy31fYC1l97wV@redis-10200.c54.ap-northeast-1-2.ec2.cloud.redislabs.com:10200";

console.log('🔍 redis-cli互換テストを実行...');
console.log('URL:', redisUrl);

(async () => {
  try {
    // PINGテスト
    console.log('🔄 PING実行...');
    const { stdout: ping } = await execAsync(`npx redis-cli -u "${redisUrl}" PING`, {
      timeout: 10000
    });
    console.log('✅ PING:', ping.trim());

    // INFO取得
    console.log('🔄 INFO SERVER取得...');
    const { stdout: info } = await execAsync(`npx redis-cli -u "${redisUrl}" INFO server`, {
      timeout: 10000
    });
    const lines = info.split('\n').filter((l: string) => !l.startsWith('#')).slice(0, 5);
    console.log('✅ Info:', lines.join('\n'));

    console.log('✅ テスト完了');
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', (error as Error).message);
    process.exit(1);
  }
})();
