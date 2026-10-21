# CodWay — codway.su

The repository root is the compiled GitHub Pages website; custom domain: https://codway.su.
Frontend source is in `source/` (Vite, React, TypeScript, Tailwind CSS, shadcn-style `components/ui`).

The previous website is preserved on branch `backup/pre-paths-redesign-20261021`.

## Development

```sh
cd source
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm build
```

Reusable components: `source/components/ui/background-paths.tsx` and `button.tsx`.
Styles: `source/src/styles.css`. Pricing: `source/shared/pricing.json`.

The order form on codway.su sends requests to https://api.codway.su/api/order.
Backend and Telegram credentials are stored only on the VDS. Future static
deployments must retain CNAME, .nojekyll, and the search engine verification files.
