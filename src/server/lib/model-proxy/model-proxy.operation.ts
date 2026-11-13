import { forbidden } from "@server/lib/errors/error.factory";
import { credentialHeaders } from "@server/lib/executions/credential-headers";
import { basePath } from "@server/lib/executions/runner-path";
import type { ModelProviderResolveOperation } from "@server/lib/model-providers/model-provider-resolve.operation";

// The API key stays in the server: the execution's token stands in for it.
export function modelProxyOperation({
  modelProviderResolveOperation,
}: {
  modelProviderResolveOperation: ModelProviderResolveOperation;
}) {
  async function execute(
    request: Request,
    suffix: string,
    modelProviderId: string,
    token: string
  ) {
    const {
      modelProvider: { baseUrl, apiKey },
      endpoints,
    } = await modelProviderResolveOperation.execute(modelProviderId);

    const upstream = upstreamUrl(
      baseUrl,
      endpoints,
      suffix,
      new URL(request.url).search
    );

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cookie");

    for (const name of credentialHeaders) {
      const value = headers.get(name);

      if (value !== null) {
        headers.set(
          name,
          value.replace(token, () => apiKey)
        );
      }
    }

    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.body,
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw forbidden("MODEL_UPSTREAM_REDIRECT");
    }

    return response;
  }

  return { execute };
}

// The proxy path mirrors the path of the base URL or of an endpoint, which bounds the reachable endpoints.
function upstreamUrl(
  baseUrl: string,
  endpoints: { baseUrl: string }[],
  suffix: string,
  search: string
) {
  const base = new URL(baseUrl);
  const url = new URL(`${suffix}${search}`, `${base.origin}/`);

  const paths = [
    base,
    ...endpoints.map((endpoint) => new URL(endpoint.baseUrl)),
  ].map(basePath);

  if (
    url.origin !== base.origin ||
    !paths.some(
      (path) => url.pathname === path || url.pathname.startsWith(`${path}/`)
    )
  ) {
    throw forbidden("MODEL_PATH_FORBIDDEN");
  }

  return url;
}
