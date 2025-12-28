# Elysia AI Mobile - クロスプラットフォームビルドガイド

## サポートプラットフォーム

### iOS
- **iPhone**: iOS 13.0以降
- **iPad**: iPadOS 13.0以降
- **アーキテクチャ**: ARM64（iPhone 5s以降）

### Android
- **最小バージョン**: Android 6.0 (API 23)
- **推奨バージョン**: Android 10.0 (API 29) 以降
- **アーキテクチャ**: ARM64-v8a, ARMv7, x86, x86_64

---

## 必要要件

### 開発環境
- **Node.js**: 18.x以降（または **Bun**: 1.0以降）
- **Expo CLI**: 5.2.0以降
- **EAS CLI**: `npm install -g eas-cli`

### iOS開発（オプション）
- **macOS**: 13.0以降
- **Xcode**: 15.0以降（App Store配布時のみ）
- **iOS Simulator**: Xcode付属

### Android開発（オプション）
- **Android Studio**: 最新版
- **Android SDK**: API 23-34
- **Java**: JDK 17以降

---

## セットアップ

### 1. 依存関係インストール

```bash
cd mobile

# npmの場合
npm install

# bunの場合（推奨）
bun install
```

### 2. Expoアカウント作成

```bash
# EAS CLIインストール
npm install -g eas-cli

# ログイン（アカウント作成も可能）
eas login
```

### 3. プロジェクト設定

```bash
# EASプロジェクトとして設定
eas build:configure
```

---

## ビルド方法

### ローカル開発（デバイス不要）

#### 開発サーバー起動
```bash
# Expoサーバー起動
npm start
# または
bun start
```

#### プラットフォーム別起動
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android

# Webブラウザ
npm run web
```

### クラウドビルド（EAS Build）

#### Android APK（テスト配布用）
```bash
# プレビュービルド（APK形式）
npm run build:android:apk
# または
eas build --platform android --profile preview
```

完了後、QRコードまたはダウンロードリンクが生成されます。

#### iOS Simulator用
```bash
# シミュレーター用ビルド（macOSのみ）
npm run build:ios:simulator
# または
eas build --platform ios --profile development
```

#### 本番ビルド（App Store / Google Play）

##### Android（AAB形式）
```bash
npm run build:android
# または
eas build --platform android --profile production
```

##### iOS（IPA形式）
```bash
npm run build:ios
# または
eas build --platform ios --profile production
```

##### 両プラットフォーム同時
```bash
npm run build:all
# または
eas build --platform all --profile production
```

---

## 配布方法

### テスト配布（内部テスト）

#### Android APK配布
1. ビルド完了後のリンクをテスターに共有
2. テスターはリンクからAPKをダウンロード
3. 「提供元不明のアプリ」を許可してインストール

#### iOS Ad Hoc配布
1. Apple Developer Program登録（年間99ドル）
2. デバイスUDID登録
3. Ad Hoc Provisioning Profile作成
4. ビルドしてIPAファイル配布

#### TestFlight（推奨）
```bash
# iOSビルド後、TestFlightに自動アップロード可能
eas submit --platform ios
```

### ストア配布（本番リリース）

#### Google Play Store

```bash
# Android App Bundle (AAB) を自動アップロード
npm run submit:android
# または
eas submit --platform android
```

**事前準備:**
1. Google Play Console登録（初回25ドル）
2. サービスアカウントキー取得
3. `mobile/secrets/google-service-account.json`に配置
4. `eas.json`に設定

#### Apple App Store

```bash
# IPAファイルを自動アップロード
npm run submit:ios
# または
eas submit --platform ios
```

**事前準備:**
1. Apple Developer Program登録（年間99ドル）
2. App Store Connectでアプリ作成
3. Apple ID、ASC App ID、Team IDを取得
4. `eas.json`に設定

---

## ビルド設定（eas.json）

### プロファイル説明

#### `development`
- 開発用ビルド
- Expo Go不要の開発クライアント
- iOS Simulator / Android Emulator用

#### `preview`
- テスト配布用
- Android: APK形式（簡単インストール）
- iOS: Ad Hoc or TestFlight

#### `production`
- ストア配布用
- Android: AAB形式（Google Play推奨）
- iOS: IPA形式（App Store用）

---

## トラブルシューティング

### iOS

#### Provisioning Profile エラー
```bash
# Apple Developer証明書を再生成
eas credentials
```

#### Simulator起動失敗
```bash
# Xcodeコマンドラインツール確認
xcode-select -p

# インストール
xcode-select --install
```

### Android

#### Gradleビルドエラー
```bash
# キャッシュクリア
cd android
./gradlew clean

# 再ビルド
cd ..
npm run android
```

#### APKインストールエラー
- 端末設定で「提供元不明のアプリ」を許可
- 署名証明書の競合確認（既存アプリをアンインストール）

### EAS Build

#### ビルド失敗
```bash
# ログ確認
eas build:list
# 特定ビルドのログ
eas build:view <build-id>
```

#### タイムアウト
- 無料プランは30分制限
- 有料プラン（$29/月）で無制限

---

## ローカルビルド（オプション）

EAS Buildを使わずローカルでビルドも可能：

### Android
```bash
# 開発ビルド
npx expo run:android

# リリースビルド
cd android
./gradlew assembleRelease
# 出力: android/app/build/outputs/apk/release/app-release.apk
```

### iOS
```bash
# macOSのみ
npx expo run:ios

# Xcodeでビルド
npx expo prebuild
open ios/*.xcworkspace
```

---

## パフォーマンス最適化

### アプリサイズ削減

```json
// app.json
{
  "expo": {
    "android": {
      "enableProguardInReleaseBuilds": true,
      "enableShrinkResourcesInReleaseBuilds": true
    },
    "ios": {
      "bitcode": false
    }
  }
}
```

### アーキテクチャ指定（Android）

```json
// app.json
{
  "expo": {
    "android": {
      "buildVariant": "release",
      "abiFilters": ["arm64-v8a", "armeabi-v7a"]
    }
  }
}
```

---

## CI/CD統合

### GitHub Actions例

```yaml
name: EAS Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g eas-cli
      - run: cd mobile && npm install
      - run: eas build --platform all --non-interactive --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

---

## コスト

### EAS Build価格

| プラン | 月額 | ビルド時間 | 同時ビルド |
|--------|------|-----------|----------|
| Free | $0 | 30分/月 | 1 |
| Developer | $29 | 無制限 | 2 |
| Team | $99 | 無制限 | 5 |

### ストア登録費用

| ストア | 費用 |
|--------|------|
| Google Play | 初回25ドル（一度のみ） |
| Apple App Store | 年間99ドル |

---

## 関連リンク

- [Expo公式ドキュメント](https://docs.expo.dev/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Submit](https://docs.expo.dev/submit/introduction/)
- [React Native公式](https://reactnative.dev/)
- [メインREADME](README.md)

---

**Last Updated**: 2025-12-25  
**Version**: 1.0.0
