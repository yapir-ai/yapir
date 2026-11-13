import { OpenLink } from "@web/components/ui/open-link";

export function modelProviderOpenLink(modelProviderId: string) {
  return (
    modelProviderId && (
      <OpenLink
        to="/model-providers/$modelProviderId"
        params={{ modelProviderId }}
        aria-label="Open model provider"
      />
    )
  );
}
