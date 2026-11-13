import type {
  CapabilityGrant,
  Trigger,
} from "@server/lib/automations/automation.dto";
import { scheduleEventType } from "@server/lib/schedules/schedule.trigger";
import { webhookEventType } from "@server/lib/webhooks/webhook.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { useSelector } from "@tanstack/react-store";
import { withFieldGroup } from "@web/components/form/app-form";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import { CatalogMessage, groupCatalog } from "@web/components/ui/catalog";
import {
  ConfigurationCode,
  ConfigurationMeta,
  ConfigurationSummary,
  ConfigurationTitle,
} from "@web/components/ui/configuration";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@web/components/ui/dialog";
import { FieldError } from "@web/components/ui/field";
import { FormSection } from "@web/components/ui/form-section";
import { ProviderIcon } from "@web/components/ui/provider-icon";
import { AssistantNudgeField } from "@web/lib/assistant/assistant-nudge";
import type { EventDefinition } from "@web/lib/events/event-catalog.collection";
import { Pencil, Plus } from "lucide-react";
import { Fragment, useState } from "react";

import type { AutomationCapability } from "./automation-catalog.queries";
import { deletedWebhooksQuery } from "./automation-catalog.queries";
import { CapabilityPicker, TriggerPicker } from "./automation-pickers";
import { AutomationTriggerForm, emptyTrigger } from "./automation.form";
import { CronNextRuns } from "./cron-next-runs";

type Picker =
  | { kind: "trigger"; index: number | null }
  | { kind: "capabilities" };

interface AutomationConfigurationValues {
  triggers: Trigger[];
  capabilities: CapabilityGrant[];
}

interface AutomationConfigurationProps {
  title: string;
  events: EventDefinition[];
  capabilities: AutomationCapability[];
  readOnly: boolean;
  hideUnknownTriggers?: boolean;
}

// The dialog holds the filter field: its trigger shows the error once the dialog closes.
const triggerError = (trigger: Trigger) =>
  AutomationTriggerForm.safeParse(trigger).error?.issues[0]?.message;

const defaultValues: AutomationConfigurationValues = {
  triggers: [],
  capabilities: [],
};

const props: AutomationConfigurationProps = {
  title: "",
  events: [],
  capabilities: [],
  readOnly: false,
};

export const AutomationConfigurationFields = withFieldGroup({
  defaultValues,
  props,
  // oxlint-disable-next-line eslint/func-name-matching TanStack Form renders it as a component, which hooks rules recognize by its capitalized name.
  render: function Render({
    group,
    title,
    events,
    capabilities,
    readOnly,
    hideUnknownTriggers,
  }) {
    const values = useSelector(group.store, (state) => state.values);

    const { data: deletedWebhooks } =
      useLiveSuspenseQuery(deletedWebhooksQuery);

    const deletedEventTypes = new Set(
      deletedWebhooks.map(({ id }) => webhookEventType(id))
    );

    const [picker, setPicker] = useState<Picker | null>(null);

    const required = [
      ...new Set(
        values.triggers.flatMap(
          (trigger) =>
            events.find((event) => event.type === trigger.type)?.capabilities ??
            []
        )
      ),
    ];

    const effectiveCapabilities = new Set([
      ...required,
      ...values.capabilities.map(({ name }) => name),
    ]);

    const capabilityGroups = groupCatalog(
      capabilities.filter((capability) =>
        effectiveCapabilities.has(capability.name)
      )
    );

    function removeTrigger(index: number) {
      void group.removeFieldValue("triggers", index);
      setPicker(null);
    }

    function triggerFilterField(index: number) {
      return values.triggers[index]?.type === scheduleEventType ? (
        <group.AppField name={`triggers[${index}].cron`}>
          {(field) => (
            <field.CodeField label="Cron (UTC)" example="0 9 * * 1-5">
              <CronNextRuns pattern={field.state.value} />
            </field.CodeField>
          )}
        </group.AppField>
      ) : (
        <group.AppField name={`triggers[${index}].expression`}>
          {(field) => (
            <AssistantNudgeField
              nudge={{
                message:
                  "I can help you listen to events. What are you trying to do?",
                context: `The user is filling the CEL condition of trigger ${index + 1} (event type ${values.triggers[index]?.type}) of "${title}".`,
              }}
            >
              <field.CodeField
                label="CEL condition"
                description="A true condition starts a task. Read the payload in event."
                example="yapir.task != null"
                multiline
              />
            </AssistantNudgeField>
          )}
        </group.AppField>
      );
    }

    return (
      <>
        <FormSection
          title="Triggers"
          description="The events that activate the agent."
        >
          <div>
            {values.triggers.map((trigger, index) => {
              const event = events.find((entry) => entry.type === trigger.type);

              if (!event && hideUnknownTriggers) {
                return null;
              }

              return (
                <Fragment key={index}>
                  <ConfigurationSummary
                    onClick={() => setPicker({ kind: "trigger", index })}
                  >
                    {event && <ProviderIcon provider={event.provider.id} />}
                    <span className="min-w-0 flex-1 space-y-1">
                      {event && (
                        <ConfigurationMeta>
                          {event.provider.label} · {event.resource.label}
                        </ConfigurationMeta>
                      )}
                      <ConfigurationTitle>
                        {event?.label ?? trigger.type}
                      </ConfigurationTitle>
                      <ConfigurationCode>
                        {"cron" in trigger ? trigger.cron : trigger.expression}
                      </ConfigurationCode>
                    </span>
                    <Pencil size={13} />
                  </ConfigurationSummary>
                  <FieldError>{triggerError(trigger)}</FieldError>
                </Fragment>
              );
            })}
            <Button
              type="button"
              variant="outline"
              className="mt-2 w-full"
              onClick={() => setPicker({ kind: "trigger", index: null })}
            >
              <Plus />
              Add trigger
            </Button>
          </div>
        </FormSection>
        <FormSection
          title="Capabilities"
          description="The tools that the agent can use."
        >
          <ConfigurationSummary
            onClick={() => setPicker({ kind: "capabilities" })}
          >
            <span className="flex-1 space-y-3">
              {capabilityGroups.map(({ provider, resources }) =>
                resources.map(({ resource, items }) => (
                  <span
                    key={`${provider.id}-${resource.id}`}
                    className="block space-y-1"
                  >
                    <ConfigurationMeta>
                      <ProviderIcon provider={provider.id} />
                      {provider.label} · {resource.label}
                    </ConfigurationMeta>
                    {items.map((capability) => (
                      <span
                        key={capability.name}
                        className="flex items-center gap-2"
                      >
                        <ConfigurationTitle>
                          {capability.label}
                        </ConfigurationTitle>
                        <Badge variant="secondary">
                          {required.includes(capability.name)
                            ? "Required"
                            : "Added"}
                        </Badge>
                        {values.capabilities.some(
                          ({ name, unscoped }) =>
                            name === capability.name && unscoped
                        ) && <Badge variant="outline">Unscoped</Badge>}
                      </span>
                    ))}
                  </span>
                ))
              )}
              {capabilityGroups.length === 0 && (
                <ConfigurationMeta>
                  Select additional capabilities
                </ConfigurationMeta>
              )}
            </span>
            <Pencil size={13} />
          </ConfigurationSummary>
        </FormSection>
        <Dialog
          open={!readOnly && picker !== null}
          onOpenChange={(open) => {
            if (!open) {
              setPicker(null);
            }
          }}
        >
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {picker?.kind === "trigger" ? "Trigger" : "Capabilities"}
              </DialogTitle>
              <DialogDescription>{title}</DialogDescription>
            </DialogHeader>
            {picker?.kind === "trigger" && (
              <TriggerPicker
                eventType={
                  picker.index === null
                    ? undefined
                    : values.triggers[picker.index]?.type
                }
                events={events}
                retiredTypes={deletedEventTypes}
                onSelect={(type) => {
                  if (picker.index === null) {
                    group.pushFieldValue("triggers", emptyTrigger(type));
                    setPicker({
                      kind: "trigger",
                      index: values.triggers.length,
                    });
                  } else {
                    void group.replaceFieldValue(
                      "triggers",
                      picker.index,
                      emptyTrigger(type)
                    );
                  }
                }}
                onRemove={
                  picker.index === null
                    ? undefined
                    : removeTrigger.bind(null, picker.index)
                }
              >
                {picker.index === null ? (
                  <CatalogMessage>
                    Select an event, then configure its filter here.
                  </CatalogMessage>
                ) : (
                  triggerFilterField(picker.index)
                )}
              </TriggerPicker>
            )}
            {picker?.kind === "capabilities" && (
              <group.AppField name="capabilities">
                {() => (
                  <CapabilityPicker
                    capabilities={capabilities}
                    required={required}
                  />
                )}
              </group.AppField>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  },
});
