export function frontmatter(document: string) {
  const { data = "", body = document } =
    /^---\n(?<data>[\s\S]*?)\n---\n+(?<body>[\s\S]*)$/u.exec(document)
      ?.groups ?? {};

  return { data, body };
}
