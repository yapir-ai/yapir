import { createFileRoute } from "@tanstack/react-router";
import { Markdown } from "@web/components/markdown";
import { Page } from "@web/components/ui/page";
import { loadContent } from "@web/lib/content/content";

export const Route = createFileRoute("/guides/$")({
  loader: async ({ params }) => await loadContent(params._splat ?? ""),
  staticData: { breadcrumb: "Guide" },
  component: GuidePage,
});

function GuidePage() {
  return (
    <Page>
      <Markdown mode="static">{Route.useLoaderData()}</Markdown>
    </Page>
  );
}
