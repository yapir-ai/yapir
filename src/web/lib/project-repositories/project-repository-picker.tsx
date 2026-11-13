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
import { ProviderIcon } from "@web/components/ui/provider-icon";
import type { Repository } from "@web/lib/repositories/repository.collection";

import {
  projectNonRepositoryListQuery,
  projectRepositoryListQuery,
} from "./project-repository.queries";

// The repositories of a project share one Git host.
export function ProjectRepositoryPicker({
  projectId,
  onSelect,
}: {
  projectId: string;
  onSelect: (repositoryId: string) => void;
}) {
  const { data: candidates } = useLiveSuspenseQuery(
    projectNonRepositoryListQuery(projectId)
  );

  const {
    data: [linked],
  } = useLiveSuspenseQuery(projectRepositoryListQuery(projectId));

  const repositories = linked
    ? candidates.filter(
        ({ provider, host }) =>
          provider === linked.provider && host === linked.host
      )
    : candidates;

  return (
    <Combobox<Repository>
      items={repositories}
      value={null}
      itemToStringLabel={(repository) => repository.path}
      limit={10}
      onValueChange={(repository) => {
        if (repository) {
          onSelect(repository.id);
        }
      }}
    >
      <ComboboxTrigger
        aria-label="Add repository"
        render={<Button variant="outline" />}
        className="w-72 justify-between"
      >
        <ComboboxValue placeholder="Add repository" />
      </ComboboxTrigger>
      <ComboboxContent>
        <ComboboxInput
          aria-label="Search repositories"
          placeholder="Search repositories…"
          showTrigger={false}
        />
        <ComboboxEmpty>No repositories found.</ComboboxEmpty>
        <ComboboxList>
          {(repository: Repository) => (
            <ComboboxItem key={repository.id} value={repository}>
              <ProviderIcon provider={repository.provider} />
              <ItemContent className="min-w-0">
                <ItemTitle>{repository.path}</ItemTitle>
                <ItemDescription>{repository.host}</ItemDescription>
              </ItemContent>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
