import { isOrganizationAdmin } from "@server/lib/auth/access";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import {
  ListNoResults,
  ListPagination,
  ListSearch,
  ListToolbar,
} from "@web/components/list-controls";
import { RoleSelect } from "@web/components/role-select";
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
  searchFilters,
} from "@web/lib/lists/list.route";
import { UserAvatar } from "@web/lib/users/user-avatar";
import { usersCollection } from "@web/lib/users/user.collection";
import { organizationRoleOptions } from "@web/lib/users/user.options";
import { userListQuery } from "@web/lib/users/user.queries";

export const Route = createFileRoute("/users")({
  ...listRouteSearch(ListRouteSearch),
  loader: async ({ context }) =>
    await context.dbClient.preloadLiveQuery(userListQuery()),
  staticData: {
    breadcrumb: "Users",
    description: "Users of the organization and their Organization roles.",
  },
  component: UsersPage,
});

function UsersPage() {
  const { dbClient } = Route.useRouteContext();
  const { search, offset } = Route.useSearch();
  const { data } = useLiveSuspenseQuery(userListQuery(search));
  const shownUsers = listPage(data, offset);
  const isAdmin = isOrganizationAdmin(useSessionUser());
  const users = dbClient.collection(usersCollection);

  return (
    <Page width="wide">
      <PageHeader
        title="Users"
        description="Users of the organization and their Organization roles."
      />
      <ListToolbar>
        <ListSearch label="Search users" value={search} />
      </ListToolbar>
      {shownUsers.length === 0 ? (
        <ListNoResults noun="users" filters={searchFilters(search)} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shownUsers.map((user) => (
              <TableRow key={user.id}>
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
                    value={user.role}
                    options={organizationRoleOptions}
                    editable={isAdmin}
                    onChange={(role) => {
                      void toastFailure(
                        users.update(user.id, (draft) => {
                          draft.role = role;
                        })
                      );
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ListPagination
        offset={offset}
        shown={shownUsers.length}
        total={data.length}
        noun={["user", "users"]}
      />
    </Page>
  );
}
