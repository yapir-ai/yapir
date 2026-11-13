import { isOrganizationAdmin } from "@server/lib/auth/access";
import { NetworkPolicyUpdateRequest } from "@server/lib/network-policy/network-policy-update.dto";
import { HostPatternSchema } from "@server/lib/network-policy/network-policy.dto";
import { useLiveSuspenseQuery } from "@tanstack/react-db";
import { createFileRoute } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { useAppForm } from "@web/components/form/app-form";
import { Badge } from "@web/components/ui/badge";
import { FormSection } from "@web/components/ui/form-section";
import { Page, PageHeader } from "@web/components/ui/page";
import { useSessionUser } from "@web/lib/auth/session";
import {
  networkPolicyCollection,
  networkPolicyKey,
} from "@web/lib/network-policy/network-policy.collection";
import { networkPolicyQuery } from "@web/lib/network-policy/network-policy.queries";
import { z } from "zod";

const hostLines = (hosts: string) =>
  hosts
    .split("\n")
    .map((host) => host.trim())
    .filter(Boolean);

const NetworkPolicyForm = NetworkPolicyUpdateRequest.required().extend({
  hosts: z
    .string()
    .refine(
      (hosts) => HostPatternSchema.array().safeParse(hostLines(hosts)).success,
      "Enter one host per line, such as example.com or *.example.com"
    ),
});

export const Route = createFileRoute("/network-policy")({
  loader: async ({ context }) =>
    await context.dbClient.preloadLiveQuery(networkPolicyQuery()),
  staticData: {
    breadcrumb: "Network policy",
    description:
      "The organization's network policy: the hosts that the executions may reach.",
  },
  component: NetworkPolicyPage,
});

function NetworkPolicyPage() {
  const { dbClient } = Route.useRouteContext();
  const networkPolicy = useLiveSuspenseQuery(networkPolicyQuery()).data!;
  const isAdmin = isOrganizationAdmin(useSessionUser());

  const form = useAppForm({
    validators: { onChange: NetworkPolicyForm },
    defaultValues: {
      enabled: networkPolicy.enabled,
      includeYapirHosts: networkPolicy.includeYapirHosts,
      hosts: networkPolicy.hosts.join("\n"),
    },
    onSubmit: async ({ value, formApi }) => {
      await dbClient
        .collection(networkPolicyCollection)
        .update(networkPolicyKey, (draft) => {
          Object.assign(draft, { ...value, hosts: hostLines(value.hosts) });
        })
        .when("settled");
      formApi.reset(value);
    },
  });

  const includeYapirHosts = useSelector(
    form.store,
    (state) => state.values.includeYapirHosts
  );

  return (
    <Page>
      <PageHeader
        title="Network policy"
        description="The hosts that the agents can reach in their executions. Each execution also reaches the hosts of its injected credentials and the services of its CI job."
      />
      <form.AppForm>
        <form.Form>
          <fieldset disabled={!isAdmin} className="grid">
            <FormSection
              title="Restriction"
              description="When on, executions reach only the allowed hosts."
            >
              <form.AppField name="enabled">
                {(field) => (
                  <field.SwitchField
                    label="Restrict the executions' hosts"
                    description="The CI jobs need the NET_ADMIN capability."
                    disabled={!isAdmin}
                  />
                )}
              </form.AppField>
            </FormSection>
            <FormSection title="Yapir's hosts">
              <form.AppField name="includeYapirHosts">
                {(field) => (
                  <field.SwitchField
                    label="Include Yapir's hosts"
                    disabled={!isAdmin}
                  />
                )}
              </form.AppField>
              {includeYapirHosts && (
                <div className="flex flex-wrap gap-1">
                  {networkPolicy.yapirHosts.map((host) => (
                    <Badge key={host} variant="secondary">
                      {host}
                    </Badge>
                  ))}
                </div>
              )}
            </FormSection>
            <FormSection title="Allowed hosts">
              <form.AppField name="hosts">
                {(field) => (
                  <field.CodeField
                    label="Allowed hosts"
                    description="One host per line. *.example.com allows its subdomains only."
                    example="registry.example.com"
                    placeholder={"registry.example.com\n*.example.com"}
                    multiline
                  />
                )}
              </form.AppField>
            </FormSection>
          </fieldset>
          {isAdmin && <form.SaveBar>Save network policy</form.SaveBar>}
        </form.Form>
      </form.AppForm>
    </Page>
  );
}
