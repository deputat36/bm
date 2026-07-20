const pageOrder = [
  "00 Cover",
  "01 Getting Started",
  "02 Foundations",
  "— Components",
  "03 Components",
  "— Utilities",
  "04 Utilities"
];

const code = `const PAGE_ORDER = ${JSON.stringify(pageOrder)};
const createdNodeIds = [];
const mutatedNodeIds = [];
if (figma.editorType !== "figma") throw new Error("Portal v2 requires a Figma Design file");
const pages = [];
for (const pageName of PAGE_ORDER) {
  let page = figma.root.children.find((item) => item.name === pageName);
  if (!page) {
    page = figma.createPage();
    page.name = pageName;
    createdNodeIds.push(page.id);
  }
  pages.push(page);
}
for (let index = 0; index < pages.length; index += 1) {
  figma.root.insertChild(index, pages[index]);
  mutatedNodeIds.push(pages[index].id);
}
return {
  runId: "portal-v2-page-skeleton-v1",
  createdNodeIds,
  mutatedNodeIds,
  pageIds: pages.map((page) => page.id),
  pageNames: PAGE_ORDER
};
`;

process.stdout.write(code);
