# Friendly Curves

普通人能看懂的基于Curve25519 + AES-GCM的加密通信小工具，适合用于不是太严格的场景，例如临时在普通社交媒体上发布有一定保密需要的个人信息，如一些账号密码等。这里假定用户不是高价值目标，社交媒体不会发起中间人攻击，只是避免直接传递明文信息，增加一些安全性。

## Development

To add components to your app, run the following command:

```bash
bunx --bun shadcn@latest add button
```

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

Add this to `.vscode/settings.json` to auto-import from ShadCN UI instead of Radix UI:

```json
{
  "js/ts.preferences.autoImportFileExcludePatterns": [
    "**/node_modules/radix-ui/**",
    "**/node_modules/@base-ui/**"
  ],
  "editor.tabSize": 2
}
```
