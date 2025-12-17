import { Database } from "bun:sqlite";
import { existsSync } from "fs";

const dbPath = "./dev.db";

console.log("🔧 データベースの永続化を設定しています...");
console.log(`📁 データベースパス: ${dbPath}`);

try {
  // SQLiteファイルを作成
  if (existsSync(dbPath)) {
    console.log("ℹ️  データベースファイルは既に存在します");
  } else {
    console.log("1️⃣ SQLiteファイルを作成中...");
    const db = new Database(dbPath, { create: true });
    db.close();
    console.log("✅ SQLiteファイルを作成しました");
  }

  console.log("\n✅ セットアップ完了！");
  console.log("\n📝 次のステップ:");
  console.log("   1. .envファイルにDATABASE_URL=file:./dev.dbが設定されていることを確認");
  console.log("   2. サーバーを起動: bun start-server.ts");
  console.log("   3. データベースは永続化モードで動作します！");
  console.log("\n💡 ヒント:");
  console.log("   - データベースファイルが作成されたので、再起動してもデータは保持されます");
  console.log("   - Prismaがテーブルを自動管理します");

} catch (error) {
  console.error("❌ エラーが発生しました:", error);
  process.exit(1);
}
