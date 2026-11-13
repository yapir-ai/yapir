import { createFileRoute } from "@tanstack/react-router";
import { Markdown } from "@web/components/markdown";
import { Badge } from "@web/components/ui/badge";
import { Page, PageHeader } from "@web/components/ui/page";
import { loadContent } from "@web/lib/content/content";

export const Route = createFileRoute("/changelog")({
  loader: async () => await loadContent("changelog.md"),
  staticData: { breadcrumb: "Changelog" },
  component: ChangelogPage,
});

function releases(changelog: string) {
  return changelog
    .split(/^## /mu)
    .slice(1)
    .map((section) => {
      const [heading = "", ...notes] = section.split("\n");
      const [version, date = ""] = heading.split(" - ");

      return { version, date, notes: notes.join("\n") };
    });
}

function ChangelogPage() {
  return (
    <Page>
      <PageHeader
        title="Changelog"
        description="What you can do with each Yapir release."
      />
      <ol>
        {releases(Route.useLoaderData()).map((release, index) => (
          <li
            key={release.version}
            className="grid gap-4 md:grid-cols-[9rem_1fr] md:gap-8"
          >
            <header className="flex items-center gap-3 self-start md:sticky md:top-[calc(var(--app-header-height)+1rem)] md:flex-col md:items-start md:gap-1">
              <h2 className="text-lg font-semibold tracking-tight">
                {release.version}
              </h2>
              <time dateTime={release.date} className="text-muted-foreground">
                {new Date(release.date).toLocaleDateString("en", {
                  dateStyle: "long",
                  timeZone: "UTC",
                })}
              </time>
              {index === 0 && <Badge className="md:mt-2">Latest</Badge>}
            </header>
            <div className="border-border relative border-l pb-12 pl-8">
              <span
                aria-hidden="true"
                className="bg-primary ring-background absolute top-2.5 left-0 size-2.5 -translate-x-1/2 rounded-full ring-4"
              />
              <Markdown mode="static">{release.notes}</Markdown>
            </div>
          </li>
        ))}
      </ol>
    </Page>
  );
}
