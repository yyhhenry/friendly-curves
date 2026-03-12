# React + TypeScript + Vite + shadcn/ui

This is a template for a new Vite project with React, TypeScript, and shadcn/ui.

## Adding components

To add components to your app, run the following command:

```bash
pnpm dlx shadcn@latest add button
```

This will place the ui components in the `src/components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```

## Development

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
