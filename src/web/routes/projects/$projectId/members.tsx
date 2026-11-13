import { isOrganizationAdmin } from "@server/lib/auth/access";
import { ProjectRoleSchema } from "@server/lib/auth/role.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { ListPagination } from "@web/components/list-controls";
import { RoleSelect } from "@web/components/role-select";
import { Button } from "@web/components/ui/button";
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
} from "@web/components/ui/table";
import { useSessionUser } from "@web/lib/auth/session";
import { toastFailure } from "@web/lib/errors";
import {
  listPage,
  listRouteSearch,
  ListRouteSearch,
} from "@web/lib/lists/list.route";
import { ProjectMemberPicker } from "@web/lib/project-members/project-member-picker";
import { projectMembersCollection } from "@web/lib/project-members/project-member.collection";
import { projectRoleOptions } from "@web/lib/project-members/project-member.options";
import {
  projectMemberListQuery,
  projectNonMemberListQuery,
} from "@web/lib/project-members/project-member.queries";
import { UserAvatar } from "@web/lib/users/user-avatar";
import { Users } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId/members")({
  ...listRouteSearch(ListRouteSearch.pick({ offset: true })),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.dbClient.preloadLiveQuery(
        projectMemberListQuery(params.projectId)
      ),
      context.dbClient.preloadLiveQuery(
        projectNonMemberListQuery(params.projectId)
      ),
    ]);
  },
  staticData: {
    breadcrumb: "Members",
    description:
      "Members of a project and their project roles. Organization Admins manage them.",
  },
  component: MembersPage,
});

function MembersPage() {
  const { projectId } = Route.useParams();
  const { dbClient } = Route.useRouteContext();

  const { data: rows } = useLiveSuspenseQuery(
    projectMemberListQuery(projectId)
  );

  const { offset } = Route.useSearch();
  const page = listPage(rows, offset);

  const canWrite = isOrganizationAdmin(useSessionUser());

  const members = dbClient.collection(projectMembersCollection(projectId));

  return (
    <Page width="wide">
      <PageHeader
        title="Members"
        description="Project Admins edit the project's instructions and automations. Project Users read the project."
      >
        {canWrite && (
          <ProjectMemberPicker
            projectId={projectId}
            onSelect={(userId) => {
              void toastFailure(
                members.insert({
                  projectId,
                  userId,
                  role: ProjectRoleSchema.enum.User,
                })
              );
            }}
          />
        )}
      </PageHeader>
      {rows.length === 0 ? (
        <Empty variant="outline">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No members yet</EmptyTitle>
            <EmptyDescription>
              Organization Admins access every project without being members.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              {canWrite && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {page.map(({ member, user }) => (
              <TableRow key={member.userId}>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <UserAvatar
                      size="sm"
                      seed={user.email}
                      image={user.image}
                    />
                    {user.name}
                  </span>
                </TableCell>
                <TableCell variant="muted" grow>
                  {user.email}
                </TableCell>
                <TableCell>
                  <RoleSelect
                    ariaLabel={`Role of ${user.name}`}
                    value={member.role}
                    options={projectRoleOptions}
                    editable={canWrite}
                    onChange={(role) => {
                      void toastFailure(
                        members.update(member.userId, (draft) => {
                          draft.role = role;
                        })
                      );
                    }}
                  />
                </TableCell>
                {canWrite && (
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void toastFailure(members.delete(member.userId));
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={page.length}
        total={rows.length}
        noun={["member", "members"]}
      />
    </Page>
  );
}
