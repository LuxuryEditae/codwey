import { createFileRoute, Outlet } from "@tanstack/react-router";
import { parseCatalogSearch } from "@/data/catalog";

export const Route = createFileRoute("/catalog")({
  validateSearch: parseCatalogSearch,
  component: CatalogLayout,
});

function CatalogLayout() {
  return <Outlet />;
}
