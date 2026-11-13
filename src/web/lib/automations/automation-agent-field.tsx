import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useFieldPresentation } from "@web/components/form/app-form";
import { Button } from "@web/components/ui/button";
import { ButtonGroup } from "@web/components/ui/button-group";
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
import { Field, FieldError, FieldLabel } from "@web/components/ui/field";
import { OpenLink } from "@web/components/ui/open-link";
import { AgentIcon } from "@web/lib/agents/agent-icon";
import { agentListQuery } from "@web/lib/agents/agent.queries";

export function AutomationAgentField() {
  const { field, id, errors, controlProps } = useFieldPresentation<string>();
  const { data: agents } = useLiveSuspenseQuery(agentListQuery("", true));
  const selected = agents.find((agent) => agent.id === field.state.value);
  // A deleted agent stays displayed as the current value but cannot be picked.
  const options = agents.filter((agent) => agent.deletedAt === null);

  return (
    <Field data-invalid={errors.length > 0}>
      <FieldLabel htmlFor={id}>Agent</FieldLabel>
      <Combobox
        items={options}
        value={selected ?? null}
        itemToStringLabel={(agent) => agent.name}
        isItemEqualToValue={(agent, value) => agent.id === value.id}
        limit={10}
        onValueChange={(agent) => {
          if (agent) {
            field.handleChange(agent.id);
            controlProps.onBlur();
          }
        }}
      >
        <ButtonGroup className="w-full">
          <ComboboxTrigger
            {...controlProps}
            render={<Button type="button" variant="outline" />}
            // oxlint-disable-next-line shadcn/no-restyle align icon y & left
            className="min-w-0 flex-1 justify-between pl-1.5"
          >
            <span className="flex min-w-0 items-center gap-2">
              {selected && <AgentIcon agent={selected} size="xs" />}
              <span className="truncate">
                <ComboboxValue placeholder="Select an agent" />
              </span>
            </span>
          </ComboboxTrigger>
          {selected && (
            <OpenLink
              to="/agents/$agentId"
              params={{ agentId: selected.id }}
              aria-label="Open agent"
            />
          )}
        </ButtonGroup>
        <ComboboxContent>
          <ComboboxInput
            aria-label="Search agents"
            placeholder="Search agents…"
            showTrigger={false}
          />
          <ComboboxEmpty>No agents found.</ComboboxEmpty>
          <ComboboxList>
            {(agent: (typeof options)[number]) => (
              <ComboboxItem key={agent.id} value={agent}>
                <AgentIcon agent={agent} size="xs" />
                <span className="truncate">{agent.name}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      {errors.length > 0 && <FieldError id={`${id}-error`} errors={errors} />}
    </Field>
  );
}
