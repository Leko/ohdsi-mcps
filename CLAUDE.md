# ohdsi-mcps

OHDSI関連のMCPサーバを提供するmonorepo。`packages/*` 配下に個別のMCPサーバが入る。

## パッケージ管理ルール

- **依存の追加/更新は必ず `npm i` 経由で行うこと**。`package.json` を直接編集してから `npm install` する運用は禁止。
  - 理由: バージョン解決・lockfile整合・工数の二度手間を避けるため。
  - `@ohdsi-mcps/book-of-ohdsi` への追加なら `npm i -w @ohdsi-mcps/book-of-ohdsi <pkg>`。devDepなら `-D`。ワークスペース共通devDepならルートに `npm i -D <pkg> -w ohdsi-mcps`（または `--workspace-root`）。
- `package-lock.json` は必ずコミットする。

## 構成

- Node.js 24 LTS (`.nvmrc` 参照)
- npm workspaces でmonorepo管理
- TypeScript (NodeNext ESM, strict)
- The Book of OHDSI などの上流コンテンツは git submodule で vendoring し、ランタイムでネットワークに出ない方針
