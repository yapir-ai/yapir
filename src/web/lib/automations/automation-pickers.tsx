import type { CapabilityGrant } from "@server/lib/automations/automation.dto";
import { useFieldPresentation } from "@web/components/form/app-form";
import { Button } from "@web/components/ui/button";
import { ButtonGroup } from "@web/components/ui/button-group";
import {
  Catalog,
  CatalogMessage,
  groupCatalog,
} from "@web/components/ui/catalog";
import { Checkbox } from "@web/components/ui/checkbox";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@web/components/ui/combobox";
import { DialogFooter } from "@web/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@web/components/ui/field";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { OpenLink } from "@web/components/ui/open-link";
import { ProviderIcon } from "@web/components/ui/provider-icon";
import { Switch } from "@web/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@web/components/ui/tooltip";
import type { EventDefinition } from "@web/lib/events/event-catalog.collection";
import { Info, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useId, useState } from "react";

import type { AutomationCapability } from "./automation-catalog.queries";

export function TriggerPicker({
  eventType,
  events,
  retiredTypes,
  onSelect,
  onRemove,
  children,
}: {
  eventType?: string;
  events: EventDefinition[];
  // Event types no new trigger selects, such as a deleted webhook's: the current one still shows.
  retiredTypes: ReadonlySet<string>;
  onSelect: (type: string) => void;
  onRemove?: () => void;
  children: ReactNode;
}) {
  const id = useId();
  const selected = events.find((event) => event.type === eventType);

  const groups = groupCatalog(
    events.filter(({ type }) => type === eventType || !retiredTypes.has(type))
  ).flatMap(({ provider, resources }) =>
    resources.map(({ resource, items }) => ({
      id: `${provider.id}-${resource.id}`,
      label: `${provider.label} · ${resource.label}`,
      items,
    }))
  );

  return (
    <div className="space-y-5">
      <Field>
        <FieldLabel htmlFor={id}>Event</FieldLabel>
        <Combobox
          items={groups}
          value={selected ?? null}
          itemToStringLabel={(event) =>
            `${event.provider.label} · ${event.resource.label} · ${event.label}`
          }
          isItemEqualToValue={(event, value) => event.type === value.type}
          onValueChange={(event) => {
            if (event) {
              onSelect(event.type);
            }
          }}
        >
          <ButtonGroup className="w-full">
            <ComboboxTrigger
              id={id}
              render={<Button type="button" variant="outline" />}
              className="min-w-0 flex-1 justify-between"
            >
              <span className="flex min-w-0 items-center gap-2">
                {selected && <ProviderIcon provider={selected.provider.id} />}
                <span className="truncate">
                  <ComboboxValue placeholder="Select an event" />
                </span>
              </span>
            </ComboboxTrigger>
            {selected?.webhookId && (
              <OpenLink
                to="/connections/webhooks/$webhookId"
                params={{ webhookId: selected.webhookId }}
                aria-label="Open webhook"
              />
            )}
          </ButtonGroup>
          <ComboboxContent>
            <ComboboxInput
              aria-label="Search events"
              placeholder="Search events…"
              showTrigger={false}
            />
            <ComboboxEmpty>No events found.</ComboboxEmpty>
            <ComboboxList>
              {(group: (typeof groups)[number]) => (
                <ComboboxGroup key={group.id} items={group.items}>
                  <ComboboxLabel>{group.label}</ComboboxLabel>
                  <ComboboxCollection>
                    {(event: EventDefinition) => (
                      <ComboboxItem key={event.type} value={event}>
                        {event.label}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxGroup>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Field>
      {children}
      {onRemove && (
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onRemove}>
            <Trash2 />
            Remove trigger
          </Button>
        </DialogFooter>
      )}
    </div>
  );
}

export function CapabilityPicker({
  capabilities,
  required,
}: {
  capabilities: AutomationCapability[];
  required: string[];
}) {
  const { field, errors, controlProps } =
    useFieldPresentation<CapabilityGrant[]>();

  const [search, setSearch] = useState("");
  const id = useId();
  const grants = field.state.value;

  const others = (name: string) =>
    grants.filter((grant) => grant.name !== name);

  return (
    <div className="space-y-5">
      <Input
        aria-label="Search capabilities"
        placeholder="Search capabilities…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <CatalogMessage>
        Capabilities required by triggers are included automatically.
      </CatalogMessage>
      <Catalog
        entries={capabilities}
        search={search}
        emptyMessage="No capabilities found."
      >
        {(capability) => {
          const requiredCapability = required.includes(capability.name);
          const grant = grants.find(({ name }) => name === capability.name);
          const optionId = `${id}-${capability.name}`;

          return (
            <div key={capability.name} className="flex items-center gap-2">
              <Checkbox
                {...controlProps}
                id={optionId}
                checked={requiredCapability || grant !== undefined}
                disabled={requiredCapability}
                onCheckedChange={(checked) =>
                  field.handleChange(
                    checked
                      ? [...grants, { name: capability.name, unscoped: false }]
                      : others(capability.name)
                  )
                }
              />
              <Label htmlFor={optionId}>
                {capability.label}
                {requiredCapability && " · required"}
              </Label>
              <Tooltip>
                <TooltipTrigger
                  type="button"
                  aria-label={`About ${capability.label}`}
                >
                  <Info size={13} />
                </TooltipTrigger>
                <TooltipContent>{capability.description}</TooltipContent>
              </Tooltip>
              {capability.scopable &&
                (requiredCapability || grant !== undefined) && (
                  <span className="ml-auto flex items-center gap-2">
                    <Label htmlFor={`${optionId}-unscoped`}>Unscoped</Label>
                    <Tooltip>
                      <TooltipTrigger type="button" aria-label="About Unscoped">
                        <Info size={13} />
                      </TooltipTrigger>
                      <TooltipContent>
                        Scoped: the resources of the automation&apos;s Tasks.
                        Unscoped: every resource.
                      </TooltipContent>
                    </Tooltip>
                    <Switch
                      id={`${optionId}-unscoped`}
                      size="sm"
                      checked={grant?.unscoped ?? false}
                      onCheckedChange={(unscoped) =>
                        field.handleChange(
                          requiredCapability && !unscoped
                            ? others(capability.name)
                            : [
                                ...others(capability.name),
                                { name: capability.name, unscoped },
                              ]
                        )
                      }
                    />
                  </span>
                )}
            </div>
          );
        }}
      </Catalog>
      {errors.length > 0 && (
        <FieldError id={controlProps["aria-describedby"]} errors={errors} />
      )}
    </div>
  );
}
