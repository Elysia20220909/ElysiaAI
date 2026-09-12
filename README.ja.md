# ElysiaAI // INFINITE RESONANCE

ElysiaAI は、カーネルから設計する独自の AI-Native OS を目指す長期開発プロジェクトです。
日本語の主要な案内は [README.md](README.md) にまとめています。

現在は、Ring 3 のユーザー空間に、資源回収とタイマーによる強制切替を加えた M2c の段階です。
固定した 2 プロセスで、ログ・実行権の譲渡・終了と、不正なプロセスの停止後の継続を検証しています。
無限ループの停止と、正常終了・故障を含む 64 世代の回収を Windows 上の QEMU で検証しています。
IPC、任意のアプリのロード、独自 OS 上の AI 推論、実機対応は未実装・未検証です。
既存の Bun / Python / Tauri アプリはホスト OS 上で動く別の開発基盤です。

- [構想・現在地・開発の入口](README.md)
- [独自 OS の設計](docs/native-os/README.md) と [ビルド・試験手順](native-os/README.md)
- [行動規範](.github/CODE_OF_CONDUCT.md)
- [開発への参加](CONTRIBUTING.md)
- [ライセンス：MIT OR Apache-2.0](LICENSE)
- [セキュリティ方針と報告方法](SECURITY.md)
- [English overview](README.en.md)

ローカル処理を重視しますが、外部通信やデータ保存の範囲は設定と利用機能に依存します。
実装状況と検証条件は、主要 README からリンクする記録で確認してください。
