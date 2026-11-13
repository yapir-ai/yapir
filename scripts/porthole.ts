import { z } from "zod";

const porthole = "http://127.0.0.1:5200";

const ExchangeSchema = z.object({
  id: z.number(),
  method: z.string(),
  path: z.string(),
  query: z.string(),
  body: z.string().nullable(),
  response: z
    .object({ status: z.number(), body: z.string().nullable() })
    .nullable(),
});

type PortholeRequest =
  | { name: string; direction: "outbound"; upstream: string }
  | { url: string }
  | { name: string };

async function request(method: string, route: string, body?: PortholeRequest) {
  const response = await fetch(`${porthole}/api${route}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body && JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(
      `porthole ${method} ${route}: ${response.status} ${await response.text()}`
    );
  }

  return response;
}

export const outboundUrl = (source: string) =>
  `${porthole}/_outbound/${source}`;

export async function createOutboundSource(name: string, upstream: string) {
  await request("POST", "/sources", {
    name,
    direction: "outbound",
    upstream,
  });
}

export async function deleteSource(name: string) {
  await request("DELETE", `/sources/${name}`);
}

export async function exchanges(source: string) {
  const response = await request(
    "GET",
    `/exchanges?source=${source}&after=0&limit=500`
  );

  return z.array(ExchangeSchema).parse(await response.json());
}

export async function replayLatest(
  source: string,
  eventName: string,
  url: string
) {
  const response = await request(
    "GET",
    `/exchanges?source=${source}&eventName=${eventName}&limit=1`
  );

  const [exchange] = z.array(ExchangeSchema).parse(await response.json());

  if (!exchange) {
    throw new Error(`porthole has no ${source} delivery of ${eventName}`);
  }

  const replay = await request("POST", `/exchanges/${exchange.id}/replay`, {
    url,
  });

  return {
    exchange: exchange.id,
    ...z
      .object({ status: z.number(), body: z.string() })
      .parse(await replay.json()),
  };
}

export async function nameService(port: number, name: string) {
  await request("PUT", `/services/${port}`, { name });
}

export const serviceUrl = (port: number) => {
  const { protocol, host } = new URL(process.env.PORTHOLE_URL!);

  return `${protocol}//${port}-${host}`;
};
