import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRuntime } from "./portal-v2-doc-runtime.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tokens = JSON.parse(fs.readFileSync(path.join(rootDir, "data/design/portal-v2.tokens.json"), "utf8"));
const target = process.argv[2];
const configs = {
  components: {
    pageName: "03 Components",
    docKey: "components-index",
    title: "Components",
    description: "Atoms, cards, forms и navigation создаются по одному и используют variables, auto-layout и документированные состояния.",
    items: tokens.components_v1
  },
  utilities: {
    pageName: "04 Utilities",
    docKey: "utilities-index",
    title: "Utilities and QA",
    description: "Служебные страницы для accessibility-аудита, legal states, экранов и visual QA.",
    items: ["Accessibility and contrast", "Desktop screens", "Mobile screens", "Legal states", "Source attribution", "Visual QA screenshots"]
  }
};
if (!configs[target]) {
  console.error("Use components or utilities");
  process.exit(1);
}
const config = configs[target];
const body = `text(root, ${JSON.stringify(config.title)}, { name: "Title", font: black, size: 56, width: 1100 });
text(root, ${JSON.stringify(config.description)}, { name: "Description", size: 20, width: 1000, color: v("02 Semantic · Color", "text/muted") });
const list = auto("Index", "VERTICAL");
list.resize(1248, 760);
list.itemSpacing = 16;
root.appendChild(list);
for (const [index, label] of ${JSON.stringify(config.items)}.entries()) {
  const item = card(list, "Index / " + label, 1248);
  item.layoutMode = "HORIZONTAL";
  item.counterAxisAlignItems = "CENTER";
  text(item, String(index + 1).padStart(2, "0"), { name: "Number", font: black, size: 20, width: 72, color: v("02 Semantic · Color", "action/primary") });
  text(item, label, { name: "Label", font: bold, size: 18, width: 1000 });
}`;
process.stdout.write(buildRuntime({
  pageName: config.pageName,
  docKey: config.docKey,
  background: "background/page"
}, body));
