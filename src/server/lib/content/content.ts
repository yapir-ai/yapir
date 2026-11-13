import { parse } from "yaml";
import { z } from "zod";

import { frontmatter } from "./frontmatter";

const Frontmatter = z.object({ description: z.string() });

function description(document: string) {
  return Frontmatter.parse(parse(frontmatter(document).data)).description;
}

// The documents of src/content, by their path from the repository root.
export function createContent(files: Record<string, string>) {
  const documents = new Map(
    Object.entries(files).map(([file, text]) => [
      file.replace("/src/content/", ""),
      text,
    ])
  );

  const index = `# Yapir content

Documents about Yapir, for people and agents.

${[...documents]
  .map(
    ([path, document]) =>
      `- [${path}]({{origin}}/api/content/${path}): ${description(document)}`
  )
  .join("\n")}
`;

  return {
    glossary: frontmatter(documents.get("GLOSSARY.md")!).body,
    info: (path: string, origin: string) =>
      documents.get(path)?.replaceAll("{{origin}}", origin),
    list: (origin: string) => index.replaceAll("{{origin}}", origin),
  };
}

export type Content = ReturnType<typeof createContent>;
