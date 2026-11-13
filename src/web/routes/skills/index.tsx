import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { CreateLink } from "@web/components/create-link";
import {
  ListNoResults,
  ListPagination,
  ListSearch,
  ListToolbar,
  ShowDeletedFilter,
} from "@web/components/list-controls";
import { DeletedBadge } from "@web/components/soft-delete-controls";
import { buttonVariants } from "@web/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@web/components/ui/empty";
import { Page, PageHeader } from "@web/components/ui/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableRowLink,
} from "@web/components/ui/table";
import {
  listPage,
  searchFilters,
  listRouteSearch,
  SoftDeleteListRouteSearch,
} from "@web/lib/lists/list.route";
import { SkillInstallButton } from "@web/lib/skills/skill-install-button";
import { skillListQuery } from "@web/lib/skills/skill.queries";
import { UserAvatar } from "@web/lib/users/user-avatar";
import { NotebookText } from "lucide-react";

export const Route = createFileRoute("/skills/")({
  ...listRouteSearch(SoftDeleteListRouteSearch),
  loaderDeps: ({ search: { showDeleted } }) => ({ showDeleted }),
  loader: async ({ context, deps }) =>
    await context.dbClient.preloadLiveQuery(
      skillListQuery("", deps.showDeleted)
    ),
  staticData: {
    description:
      "Skills of the organization: instructions users share, install in their own coding agent, and give to agents.",
  },
  component: SkillsPage,
});

function SkillsPage() {
  const { search, offset, showDeleted } = Route.useSearch();
  const { data } = useLiveSuspenseQuery(skillListQuery(search, showDeleted));
  const skills = listPage(data, offset);

  const emptyState = search ? (
    <ListNoResults noun="skills" filters={searchFilters(search)} />
  ) : (
    <Empty variant="outline">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <NotebookText aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>No skills yet</EmptyTitle>
        <EmptyDescription>
          A skill shares instructions with the coding agents of the
          organization.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );

  return (
    <Page width="wide">
      <PageHeader
        title="Skills"
        description="Instructions shared with the organization. Yapir agents do not get them: install them in your coding agent."
      >
        <CreateLink to="/skills/create" className={buttonVariants()}>
          Create skill
        </CreateLink>
      </PageHeader>
      <ListToolbar>
        <ListSearch label="Search skills" value={search} />
        <ShowDeletedFilter value={showDeleted} />
      </ListToolbar>
      {skills.length === 0 ? (
        emptyState
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skills.map(({ skill, author }) => (
              <TableRow key={skill.id}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <TableRowLink
                      to="/skills/$skillId"
                      params={{ skillId: skill.id }}
                    >
                      {skill.name}
                    </TableRowLink>
                    <DeletedBadge deletedAt={skill.deletedAt} />
                  </span>
                </TableCell>
                <TableCell variant="muted" grow>
                  {skill.description}
                </TableCell>
                <TableCell variant="muted">
                  <span className="flex items-center gap-2">
                    <UserAvatar
                      size="sm"
                      seed={author.email}
                      image={author.image}
                    />
                    {author.name}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <SkillInstallButton skill={skill} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={skills.length}
        total={data.length}
        noun={["skill", "skills"]}
      />
    </Page>
  );
}
