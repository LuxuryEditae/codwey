# CodWay — codway.su

New React website with the supplied Background Paths component. The previous website has been replaced. Its recoverable snapshot is on branch `backup/pre-paths-redesign-20261021`.

The repository root is the compiled GitHub Pages website; custom domain: https://codway.su. Frontend source is in `source/` (Vite, React, TypeScript, Tailwind CSS, shadcn-style `components/ui`).

## Development

```sh
cd source
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm build
```

Reusable components: `source/components/ui/background-paths.tsx` and `button.tsx`. Styles: `source/src/styles.css`. Pricing: `source/shared/pricing.json`.

The order form on codway.su sends requests to https://api.codway.su/api/order. Backend and Telegram credentials are stored only on the VDS. Future static deployments must retain CNAME, .nojekyll, and the search engine verification files.
