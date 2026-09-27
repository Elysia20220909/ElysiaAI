# 実資料を分類する小型学習済みAgent

2026-09-27、リポジトリの開発資料から「独自カーネルの資料」を選ぶ分類Agentを追加した。
Ubuntuで学習・固定した整数モデルと、評価資料から抽出した特徴量を独立ELFへ渡す。
QEMUのRing 3で文書ID・スコア・分類を返し、ホストの計算と照合する。

これは、固定の手書き重みと合成入力から、実際の資料で学習したモデルへの一段階である。
本文の前処理・語彙抽出はUbuntu側で行う。ゲストは本文やパスを読み込まず、渡された特徴量を分類する。
自由な質問への回答、要約、LLM、RAG、汎用のファイル検索は今回の実装に含まれない。

## 一つの仕事と評価方法

仕事は「開発資料を独自カーネルとホストアプリに分類し、独自カーネル側の候補を返す」。
[document_corpus.json](../../experiments/agent_policy_lab/document_corpus.json)で資料20件を明示的に許可する。
学習12件は各クラス6件、評価8件は各クラス4件とし、文書単位で分ける。
`docs/native-os`の実装・検証資料と、API・音声・RAG・サービス設定などのホストアプリ資料を使う。
ラベルは人が文書の役割に基づいて付けた二値であり、自然言語の依頼から生成したものではない。

特徴量は本文中の英単語と日本語の文字bigramの有無。
パス・正解ラベルは入力せず、見出し・リンク先URL・コードブロック・インラインコードを除く。
学習文書だけの出現頻度差で64特徴を選び、二つのクラス中心を0〜255の整数へ量子化する。
中心までの二乗距離の差を整数内積として計算し、正なら独自カーネル、負ならホストアプリ、0なら棄権する。
スコアは距離差で、確率や信頼度ではない。

評価文書を読む前に語彙・重み・bias・学習文書のSHA-256を`frozen-model.json`へ固定する。
事前の品質目標は8件中6件以上正解、選んだカーネル候補の適合率0.75以上。
単純にすべてカーネルとする基準は4/8正解。
最初の評価後に語彙数・アルゴリズム・分割を調整していない。

この20件は同じリポジトリ内の関連文書であり、同じ用語や文書形式を共有する。
完全一致する内容の重複は拒否するが、近い文面や話題の類似を除いた独立評価ではない。
8/8という結果を一般的な文書分類精度やLLMの能力へ外挿しない。

## カーネルとの境界

新しい起動モード`agent-document-classify`（87）が、専用ELF`elysia-document-agent`をロードする。
Goalは`elysia:document-classifier:v0001`、Agent IDは2。
固定manifestはcontext・authority・tools・networkを0、arenaを1ページ、CPU上限を1024ticksにする。
文書サービスへの資料権限を渡さず、既存のサービスプロセスは権限拒否と終了・回収の検証に使う。
他のmanifestを受け付ける`ReadAgent::new`の権限上限は広げない。

モデル・特徴量のpacketは812bytes。正解ラベルとパスを含めない。
カーネルは未公開のデータページにコピーし、ユーザーELFが専用arenaへ移す。
版・形状・予約領域・チェックサム・Goal・識別欄・重み・bias・全8行を検査してから計算する。
最後の行が壊れている場合にも、それ以前の分類結果を出さない。
結果は各32bytesのログで返し、arenaを解放して終了する。

| 項目 | 制限・意味 |
| --- | --- |
| 重み | 64個、signed i16、各-510〜510 |
| bias | signed i32、-4,161,600〜4,161,600 |
| 特徴量 | 文書ごとに64個、0または255のみ |
| 文書ID | 正のu32、バッチ内で厳密に昇順 |
| 最大スコア絶対値 | 独立の最悪境界でも12,484,800。i32内 |
| 作業用arena | 1ページ＝4KiB。プロセスのページテーブル等を含む総量とは別 |
| CPU上限 | PIT割り込みで観測したユーザー実行ticks。精密なCPU時間ではない |
| ELF | 従来どおり64KiB以下、RX/RWの2セグメント、各最大4KiB |

このELFに限ってサイズ最適化・LTO・debug情報なしを指定し、ローダーの上限は緩めない。
専用linkerはログバッファを残し、未使用ライブラリのpanic metadataを捨てる。
他の推論ELFへ追加のmetadataを混ぜないため、`document-model` featureを専用ビルド時だけ有効にする。

packet内のモデル・入力SHA-256は識別子であり、ゲスト内の署名検証ではない。
FNVチェックサムも暗号的な改ざん防止ではない。
統合runnerは信頼済みホスト上で、許可リストの原本から学習・特徴量・packet全bytes・評価結果を再構築して照合する。
再計算済みチェックサムを持つ変更でも原本と異なれば実行前に拒否する。
信頼していない配布モデルを安全に受け付ける機構とは扱わない。

この最初の実験では、分類は読み取り専用の候補生成であり、承認を要するツール実行へ接続していない。
操作状態は`Empty`、実行数は0、journalは全bytes不変を検査する。
このAgentの分類履歴を永続化すること、モデル・入力IDと予算拒否・再計画・再起動を一つのjobに結び付けることは次の工程である。
既存のサイズ別推論の再試行journalを、新しいAgentへ汎用化したとは数えない。

## 再現

リポジトリrootから実行する。新規の出力先を指定し、既存成果物は上書きしない。
Python標準ライブラリだけを使い、追加の依存・モデル・ネットワークは必要としない。

```sh
# Ubuntu
python3 experiments/agent_policy_lab/document_classifier.py \
  --output experiments/agent_policy_lab/out/document-classifier-ubuntu-new
python3 -m unittest discover -s experiments/agent_policy_lab
python3 -m unittest discover -s native-os/tools
```

```powershell
# Windows。既存の固定版QEMU/firmwareを指定する。
python native-os/tools/validate_document_agent.py `
  --experiment experiments/agent_policy_lab/out/document-classifier-ubuntu-new `
  --output native-os/out/document-agent-new `
  --qemu <QEMUの絶対パス> --firmware-dir <firmwareの絶対ディレクトリ>
```

`--comparison-experiment`で別ホストの実験ディレクトリも指定すると、モデル・packetの完全一致を確認する。
単発の低水準試験は`boot_test.py --case agent-document-classify --document-bundle <packet>`。
低水準試験だけでは原本文書との照合を行わないため、実資料に対する成果の検証には統合runnerを使う。
`--case all`でbundleを指定しない場合、この明示入力を要する試験だけを除外する。

統合試験は正常・チェックサム不良・形状違反・重み範囲外・最終行の特徴量違反・Goal違い・重複ID・識別欄欠落・切り詰めの9起動。
終了コードだけでなく、結果全件と順序、権限、arenaの実測、解放、全フレーム回収、journal不変を確認する。
report・serial・起動時識別情報・packet・UEFI loaderをケース別に保存する。
中途失敗時は`summary.json`の`completed`をfalseのまま残す。

今回の結果は`native-os/out/document-agent-20260927/summary.json`に、学習結果は
`experiments/agent_policy_lab/out/document-classifier-ubuntu-20260927/`に保存する。
これらの生成物はGit管理対象外である。

## 実測結果

| 確認項目 | 2026-09-27の結果 |
| --- | --- |
| Ubuntu・Windowsの学習と評価 | どちらも8/8正解。カーネル候補4件の適合率・再現率は各1.0 |
| ホスト間の再現性 | 固定モデルとpacketが全bytes一致 |
| QEMUの正常分類 | 8件すべてのID・整数スコア・分類がUbuntuの結果と一致 |
| 不正packet | 8種類すべてを拒否。部分的な分類結果なし |
| 資源と副作用 | 全9起動でarena1ページ、全フレーム回収、操作0回、journal不変 |
| 既存の回帰 | サイズ別0/11、推論承認/拒否、メモリ予算拒否、永続完了の6ケース合格 |
| 既存の再起動 | `infer-size-0 / insufficient / retry`の一連の反復・破損検査も合格 |
| 単体試験 | Rust 88件。Pythonはnative tooling 63件・研究30件がWindows/Ubuntu双方で合格 |
| 静的確認 | host/guest/UEFIのClippy、Rustfmt、対象PythonのRuff、差分検査が合格 |
| 秘密情報の検査 | 今回変更・追加したファイルのGitleaks検査で検出なし。リポジトリ全体の監査ではない |

ELFは9,912bytes、RXは1,663bytes、RWは48bytesで従来の制約内に収まった。
CPU時間や高速化率は今回測定していない。
回帰記録は`native-os/out/document-agent-regression-20260927/`。
Ubuntuは検証後に起動前の停止状態へ戻し、WSLの資源設定は変更していない。

続く[分類結果の永続化・追加評価・承認付き保存](DOCUMENT_WORKFLOW_VALIDATION.md)では、
同じGoal・モデル・入力の完了結果を再利用し、別の8文書による評価と、限定された日本語の依頼から承認付き保存までを接続した。
サイズ別推論の予算再試行journalとの統合は引き続き対象外である。
