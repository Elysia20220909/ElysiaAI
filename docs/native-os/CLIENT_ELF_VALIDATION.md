# M3f: クライアント ELF と役割別の起動権限

基点は PR #119、コミット `c09cdf8bdfc1f5fec0afe9edfbacd22761d23a20`。
復旧クライアントを `apps/document-client` に移し、カーネル内の recovery_program.S を除去した。
クライアントは初回だけ、サービスは初回と各再起動でそれぞれの ELF を検査・ロードする。

## 起動時の権限

両者に自身の送信・受信ハンドルを r8 / r9 で渡す。資料権限 r11 は client のみ、service は 0。
相手ハンドルに使っていた r10 / r14 はゼロ。r12 / r13 / r15 は PID・試験モード・世代で、権限ではない。
残りの汎用レジスターはゼロ。CPU の entry・stack・保護属性はカーネルが設定する。
資料の発行も client のみにし、サービス側の資料権限表にはエントリーを作らない。
起動契約を満たさない場合はメモリ確保前に拒否する。

トークンを知っているだけでは操作できない。カーネルの所有者・操作・世代の検査を維持する。
サービスは受信要求にひも付いた実際の依頼者の権限で資料を処理し、認可判断と資料バイトはカーネル側に置く。
再接続応答は client 自身の新しい send / receive / document の 3 語で、相手の権限は含めない。

## 検証

[native-os の手順](../../native-os/README.md)の `--case all` を実行する。
双方の ELF で未発行ハンドル・送受信の取り違えを試し、client からのサービス専用操作も拒否する。
再接続後は古い資料権限とゼロ権限を拒否し、応答に資料バイトが残らないことを client が確認する。
認可済み資料の読み取り、client の状態保持、8 回の再起動、CPU 上限、途中の確保失敗と回収を確認する。
ホストテストは role ごとのレジスター内容、サービスに資料権限を発行しないこと、推測したトークンの拒否を検証する。

3 つの対照試験では、相手ハンドルを起動レジスターへ戻す、サービスへ client 資料権限を渡す、
client の ELF を service の ELF に取り違える変更を一つずつ注入した。すべてゲスト 255 / runner 1 で検出した。
元のソースへ戻して全件を再実行した。過去の検証記録は当時の証拠として変更しない。

## 境界

対象は recovery-* の 6 ケース。旧 M3a/M3b は負の検証用の相手ハンドルを渡す従来の試験経路を維持する。
ELF は RX / RW 各 1 ページの固定配置。実行時の任意 spawn、権限委譲、動的リンク、ディスク読み込みは対象外。
RAM bundle の差し替えには再ビルドが必要。log / yield / exit、PID 限定の serve / reconnect は既存 ABI のまま。
実機、新規マシン全体の環境構築、AI 推論、任意の第三者 ELF の安全性は未検証。

## 最終結果

記録日時 (UTC): 2026-09-13T03:37:52.284065+00:00

QEMU 45/45、Rust 51/51、Python classifier 24/24 が成功。
fmt、host/kernel/probe/service/client/UEFI Clippy (-D warnings)、UTF-8、Git hygiene、staged gitleaks も通過。
ゲスト構成は QEMU 11.1.0、pc-q35-11.1、TCG、1 CPU、256 MiB、ネットワークなし。

- native_os_source_sha256: `bd0d7f1e35a8c681e6783834fd630955bcbb38796f4a4d451dceddb8d81090d0`
- kernel_sha256: `32f8adb76cb1e0dce772bc247f6ba4b4a4fb70532ffadce0ce1c8325d87db9fd`
- user_elf_sha256: `c07fb276cd64960fe2610762618930fad6febfc06ea39d2351282b6c94302e04`
- service_elf_sha256: `2deb7765255909762895faff49095306805e469dcb09df222b50d832efe0b1b5`
- client_elf_sha256: `7fbf18c16625f464d0aa3f6e877c2edd7d5e38db8a051b2fab3127bf10c8ee6d`
