import { useDbClient } from "@tanstack/react-db";
import { Button } from "@web/components/ui/button";
import { Field, FieldLabel } from "@web/components/ui/field";
import { Switch } from "@web/components/ui/switch";
import { AutomationExecutionDialog } from "@web/lib/automations/automation-execution-dialog";
import type { Automation } from "@web/lib/automations/automation.collection";
import { automationsCollection } from "@web/lib/automations/automation.collection";
import { AutomationTriggerForm } from "@web/lib/automations/automation.form";
import { toastFailure } from "@web/lib/errors";
import { Play } from "lucide-react";
import { useId } from "react";

export function AutomationHeaderActions({
  automation,
  canWrite,
  isDirty,
}: {
  automation: Automation;
  canWrite: boolean;
  isDirty: boolean;
}) {
  const dbClient = useDbClient();
  const id = useId();

  if (automation.deletedAt) {
    return null;
  }

  const canEnable =
    automation.triggers.length > 0 &&
    automation.triggers.every(
      (trigger) => AutomationTriggerForm.safeParse(trigger).success
    );

  function setEnabled(enabled: boolean) {
    void toastFailure(
      dbClient
        .collection(automationsCollection(automation.projectId))
        .update(automation.id, (draft) => {
          draft.enabled = enabled;
        })
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-6">
      <Field orientation="horizontal">
        <FieldLabel htmlFor={id}>Enabled</FieldLabel>
        <Switch
          id={id}
          checked={automation.enabled}
          disabled={!canWrite || (!automation.enabled && !canEnable)}
          onCheckedChange={setEnabled}
        />
      </Field>
      {canWrite && (
        <AutomationExecutionDialog
          projectId={automation.projectId}
          automationId={automation.id}
          trigger={
            <Button variant="outline" disabled={isDirty}>
              <Play aria-hidden="true" />
              Start execution
            </Button>
          }
        />
      )}
    </div>
  );
}
