# 楽天ROOM自動発掘ツール v2.1

## 目的
v1.xで使っていたブラウザJSONP方式を廃止し、Cloudflare Workerを固定のAPI中継にします。
楽天APIのHTTPステータスとレスポンス本文を取得できるため、403/429/400を画面で判別できます。

構成:
GitHub Pages
  -> Cloudflare Worker
      -> Rakuten Web Service API

楽天の商品検索APIの現行エンドポイントは 2026-07-01。
Access Keyはクエリまたはヘッダーで送れます。
WorkerのSecretに保存し、GitHubには置きません。

## 1. GitHub Pages
`site/index.html` を、既存BLASHリポジトリのルート `index.html` として配置してください。

最終:
BLASH/
  index.html

## 2. Cloudflare Worker
このフォルダで以下を実行します。

npm install -g wrangler
npx wrangler login

Application ID:
npx wrangler secret put RAKUTEN_APP_ID

Access Key:
npx wrangler secret put RAKUTEN_ACCESS_KEY

デプロイ:
npx wrangler deploy

Worker URL:
https://rakuten-room-worker.<あなたのCloudflareアカウント>.workers.dev

## 3. ツール設定
GitHub Pagesの画面で:
APIプロキシURL = Worker URL
Application ID = 楽天のApplication ID
Affiliate ID = 必要なら入力

Access Keyは入力しません。

## 4. 必ずこの順番
① 接続チェック
→ Workerの設定状態を確認

② 楽天API診断
→ 実際に楽天APIへ問い合わせ

③ 自動発掘
→ 商品検索を複数キーワードで実行

## 5. Worker診断で分かること
- RAKUTEN_APP_ID未設定
- RAKUTEN_ACCESS_KEY未設定
- Origin不一致
- 楽天HTTP 400
- 楽天HTTP 403
- 楽天HTTP 429
- 楽天HTTP 500/503
- 楽天レスポンス本文

## 6. セキュリティ
Access KeyをHTML、GitHub、README、wrangler.tomlに書かないでください。
CloudflareのSecretとして保存してください。
今回の会話にAccess Keyを貼った場合、そのキーは楽天側で再発行してください。

## 7. 重要
このツールは楽天APIの仕様上、楽天アプリのアクセス制御設定とApplication ID/Access Keyの組み合わせが正しいことが前提です。
楽天公式APIは2026年版でOrigin等のリクエストコンテキストを検証するケースがあります。
WorkerはOriginとRefererを明示して楽天へ送ります。

## 8. GitHubへの反映
PowerShell例:
Copy-Item .\site\index.html .\index.html -Force
git add .
git commit -m "Deploy Rakuten ROOM v2.1"
git push

