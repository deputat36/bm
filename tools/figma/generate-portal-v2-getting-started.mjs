import { buildRuntime } from "./portal-v2-doc-runtime.mjs";

const body = `text(root, "Как использовать систему", {
  name: "Title",
  font: black,
  size: 56,
  width: 1100
});
text(root, "Figma повторяет production-код. Токены и юридически значимые состояния нельзя менять отдельно от репозитория.", {
  name: "Description",
  size: 20,
  width: 1000,
  color: v("02 Semantic · Color", "text/muted")
});
const row = auto("Rules", "HORIZONTAL");
row.resize(1248, 360);
row.itemSpacing = 24;
root.appendChild(row);
const rules = [
  ["01", "Источник правды", "portal-v2.tokens.json и production CSS. Расхождения сначала исправляются в коде."],
  ["02", "Проверка данных", "Подтверждённые и ожидающие проверки сведения всегда имеют разные semantic-статусы."],
  ["03", "Безопасные CTA", "Не использовать ложный дефицит, гарантии, неподтверждённые цены и доступность квартир."]
];
for (const [number, title, description] of rules) {
  const item = card(row, "Rule / " + title, 400);
  text(item, number, { name: "Number", font: black, size: 38, width: 320, color: v("02 Semantic · Color", "action/primary") });
  text(item, title, { name: "Title", font: black, size: 22, width: 320 });
  text(item, description, { name: "Body", size: 16, width: 320, color: v("02 Semantic · Color", "text/body") });
}
const source = card(root, "Source map", 1248);
text(source, "Связанные файлы", { name: "Title", font: black, size: 22, width: 1100 });
text(source, "portal-v2.tokens.json → portal-v2.tokens.css → Figma variables → components → screens", {
  name: "Flow",
  font: medium,
  size: 18,
  width: 1100,
  color: v("02 Semantic · Color", "text/body")
});`;

process.stdout.write(buildRuntime({
  pageName: "01 Getting Started",
  docKey: "getting-started",
  background: "background/page"
}, body));
