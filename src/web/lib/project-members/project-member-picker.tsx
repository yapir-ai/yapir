import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { Button } from "@web/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@web/components/ui/combobox";
import {
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@web/components/ui/item";
import { UserAvatar } from "@web/lib/users/user-avatar";
import type { User } from "@web/lib/users/user.collection";

import { projectNonMemberListQuery } from "./project-member.queries";

export function ProjectMemberPicker({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (userId: string) => void;
}) {
  const { data: users } = useLiveSuspenseQuery(
    projectNonMemberListQuery(projectId)
  );

  return (
    <Combobox<User>
      items={users}
      value={null}
      itemToStringLabel={(user) => user.name}
      limit={10}
      onValueChange={(user) => {
        if (user) {
          onSelect(user.id);
        }
      }}
    >
      <ComboboxTrigger
        aria-label="Add member"
        render={<Button variant="outline" />}
        className="w-72 justify-between"
      >
        <ComboboxValue placeholder="Add member" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput
          aria-label="Search users"
          placeholder="Search users…"
          showTrigger={false}
        />
        <ComboboxEmpty>No users found.</ComboboxEmpty>
        <ComboboxList>
          {(user: User) => (
            <ComboboxItem key={user.id} value={user}>
              <UserAvatar size="sm" seed={user.email} image={user.image} />
              <ItemContent className="min-w-0">
                <ItemTitle>{user.name}</ItemTitle>
                <ItemDescription>{user.email}</ItemDescription>
              </ItemContent>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
