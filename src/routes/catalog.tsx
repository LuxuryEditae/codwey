import { createFileRoute, Outlet } from "@tanstack/react-router";

type CatalogSearch = {
  cat?: string;
};

export const Route = createFileRoute("/catalog")({
  validateSearch: (search: Record<string, unknown>): CatalogSearch => ({
    cat: typeof search.cat === "string" ? search.cat : undefined,
  }),
  component: CatalogLayout,
});

function CatalogLayout() {
  return <Outlet />;
}
