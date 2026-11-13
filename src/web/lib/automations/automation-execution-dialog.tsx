import { useNavigate } from "@tanstack/react-router";
import { useAppForm } from "@web/components/form/app-form";
import { Button } from "@web/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@web/components/ui/dialog";
import { client } from "@web/lib/api";
import { parseResponse } from "hono/client";
import type { ReactElement } from "react";

export function AutomationExecutionDialog({
  projectId,
  automationId,
  trigger,
}: {
  projectId: string;
  automationId: string;
  trigger: ReactElement;
}) {
  const navigate = useNavigate();

  const form = useAppForm({
    defaultValues: { message: "" },
    onSubmit: async ({ value }) => {
      const { taskId } = await parseResponse(
        client.api.automations[":automationId"].executions.$post({
          param: { automationId },
          json: value,
        })
      );

      await navigate({
        to: "/projects/$projectId/tasks/$taskId",
        params: { projectId, taskId },
      });
    },
  });

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start execution</DialogTitle>
          <DialogDescription>
            Starts a new task for this automation.
          </DialogDescription>
        </DialogHeader>
        <form.AppForm>
          <form.Form>
            <form.AppField name="message">
              {(field) => (
                <field.TextField
                  label="Message"
                  placeholder="Comment is optional"
                  multiline
                />
              )}
            </form.AppField>
            <form.FormError />
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancel
              </DialogClose>
              <form.SubmitButton>Start</form.SubmitButton>
            </DialogFooter>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
