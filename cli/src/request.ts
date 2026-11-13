import { STATUS_CODES } from "node:http";

export async function request(
  url: URL,
  key: string | undefined,
  {
    headers,
    ...init
  }: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {}
) {
  const response = await fetch(url, {
    ...init,
    headers: { ...headers, ...(key && { "x-api-key": key }) },
  });

  console.error(`${response.status} ${STATUS_CODES[response.status]}`);

  if (!response.ok) {
    console.error(await response.text());
    process.exitCode = 1;

    return;
  }

  return response;
}
