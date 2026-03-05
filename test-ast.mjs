import tseslint from "typescript-eslint";

const examples = [
  `const x: string = "hi"`,
  `const x: number = 1`,
  `const x: boolean = true`,
  `const x: string[] = []`,
  `const x: Array<string> = []`,
  `const x: Record<string, number> = {}`,
  `const x: MyType = foo`,
  `const x: { name: string } = { name: "hi" }`,
  `const x: { name: TFoo } = { name: foo }`,
  `const x: Promise<TFoo> = foo`,
  `const x: string | number = 1`,
  `const x: TFoo | TBar = foo`,
];

for (const code of examples) {
  const ast = tseslint.parser.parseForESLint(code, { range: true, loc: true, jsx: true }).ast;
  const ann = ast.body[0].declarations[0].id.typeAnnotation.typeAnnotation;
  const refs = [];
  collectRefs(ann, refs);
  console.log(`${code.padEnd(50)} -> refs: [${refs.join(", ")}]  (type: ${ann.type})`);
}

function collectRefs(node, refs) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const n of node) collectRefs(n, refs); return; }
  if (node.type === "TSTypeReference" && node.typeName && node.typeName.type === "Identifier") {
    refs.push(node.typeName.name);
  }
  const SKIP = new Set(["parent", "loc", "range", "start", "end"]);
  for (const k of Object.keys(node)) {
    if (SKIP.has(k)) continue;
    if (node[k] && typeof node[k] === "object") collectRefs(node[k], refs);
  }
}
