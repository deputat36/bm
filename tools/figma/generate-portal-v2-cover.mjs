import { buildRuntime } from "./portal-v2-doc-runtime.mjs";

const body = `text(root, "DESIGN SYSTEM · 2026", {
  name: "Eyebrow",
  font: bold,
  size: 14,
  width: 900,
  color: v("02 Semantic · Color", "focus/ring")
});
text(root, "Новостройки\\nБорисоглебска", {
  name: "Title",
  font: black,
  size: 80,
  lineHeight: { unit: "PERCENT", value: 98 },
  width: 1080,
  color: v("02 Semantic · Color", "text/inverse")
});
text(root, "Городской навигатор для выбора и проверки новостроек. Независимый сервис, а не официальный сайт одного застройщика.", {
  name: "Positioning",
  font: medium,
  size: 22,
  width: 920,
  color: v("02 Semantic · Color", "text/inverse")
});
const row = auto("Principles", "HORIZONTAL");
row.resize(1248, 64);
row.itemSpacing = 12;
root.appendChild(row);
for (const label of ["Доверие", "Проверка источников", "Без давления", "Mobile first"]) {
  const badge = auto("Badge / " + label, "HORIZONTAL");
  badge.resize(244, 52);
  badge.primaryAxisAlignItems = "CENTER";
  badge.counterAxisAlignItems = "CENTER";
  badge.paddingLeft = 16;
  badge.paddingRight = 16;
  fill(badge, v("02 Semantic · Color", "surface/primary"));
  radius(badge, v("04 Dimensions · Radius", "pill"));
  row.appendChild(badge);
  text(badge, label, { name: "Label", font: bold, size: 14, width: 196 });
}`;

process.stdout.write(buildRuntime({
  pageName: "00 Cover",
  docKey: "cover",
  background: "background/hero"
}, body));
