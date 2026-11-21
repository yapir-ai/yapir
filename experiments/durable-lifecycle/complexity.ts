import { parseSync, traverse } from "@babel/core";

// Usage: bun experiments/durable-lifecycle/complexity.ts <file>...
// Prints, per file: code lines without imports, functions, decision points, and
// the cyclomatic complexity of the worst function (its decision points + 1).

const decisions = new Set([
  "IfStatement",
  "ConditionalExpression",
  "ForStatement",
  "ForInStatement",
  "ForOfStatement",
  "WhileStatement",
  "DoWhileStatement",
  "SwitchCase",
  "CatchClause",
  "LogicalExpression",
]);

function measure(path: string) {
  const text = require("node:fs").readFileSync(path, "utf-8") as string;

  const ast = parseSync(text, {
    filename: path,
    babelrc: false,
    configFile: false,
    parserOpts: { plugins: ["typescript", "decorators"] },
  })!;

  const functions: { name: string; decisions: number }[] = [];
  const stack: { name: string; decisions: number }[] = [];
  let importLines = 0;

  traverse(ast, {
    ImportDeclaration({ node }) {
      importLines += node.loc!.end.line - node.loc!.start.line + 1;
    },
    Function: {
      enter({ node, parent }) {
        const named =
          ("key" in node && node.key) ||
          ("id" in node && node.id) ||
          ("id" in parent && parent.id) ||
          ("key" in parent && parent.key);

        const name =
          named && "name" in named ? String(named.name) : "(anonymous)";

        const entry = { name, decisions: 0 };
        functions.push(entry);
        stack.push(entry);
      },
      exit() {
        stack.pop();
      },
    },
    enter({ node }) {
      const scope = stack.at(-1);

      if (scope && decisions.has(node.type)) {
        scope.decisions += 1;
      }
    },
  });

  const codeLines = text
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("//"));

  const [worst] = functions.toSorted((a, b) => b.decisions - a.decisions);

  return {
    file: path.split("durable-lifecycle/").at(-1),
    lines: codeLines.length - importLines,
    functions: functions.length,
    decisions: functions.reduce((sum, fn) => sum + fn.decisions, 0),
    worst: worst ? `${worst.name} (${worst.decisions + 1})` : "-",
  };
}

const rows = process.argv.slice(2).map(measure);

console.table([
  ...rows,
  {
    file: "TOTAL",
    lines: rows.reduce((sum, row) => sum + row.lines, 0),
    functions: rows.reduce((sum, row) => sum + row.functions, 0),
    decisions: rows.reduce((sum, row) => sum + row.decisions, 0),
    worst: "",
  },
]);
