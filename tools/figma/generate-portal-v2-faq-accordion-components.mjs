import { buildComponentRuntime } from "./portal-v2-component-runtime.mjs";

const body = `const stage = auto("FAQ accordion variants", "VERTICAL");
stage.itemSpacing = 24;
root.appendChild(stage);
const variants = [];
for (const size of ["Desktop", "Mobile"]) {
  for (const state of ["Closed", "Open"]) {
    const isOpen = state === "Open";
    const isMobile = size === "Mobile";
    const node = component("State=" + state + ", Size=" + size, "VERTICAL");
    node.itemSpacing = 0;
    node.counterAxisSizingMode = "FIXED";
    node.resize(isMobile ? 360 : 760, 96);
    fill(node, semantic("surface/primary"));
    stroke(node, semantic(isOpen ? "border/strong" : "border/default"));
    radius(node, radiusToken("lg"));
    effect(node, isOpen ? "Effects/Card Hover" : "Effects/Card");
    stage.appendChild(node);

    const header = auto("FAQ header", "HORIZONTAL");
    header.itemSpacing = 16;
    header.counterAxisAlignItems = "CENTER";
    node.appendChild(header);
    header.layoutSizingHorizontal = "FILL";
    bind(header, "paddingTop", spacing(isMobile ? "md" : "lg"));
    bind(header, "paddingRight", spacing(isMobile ? "md" : "lg"));
    bind(header, "paddingBottom", spacing(isMobile ? "md" : "lg"));
    bind(header, "paddingLeft", spacing(isMobile ? "md" : "lg"));

    const defaultQuestion = "Почему на сайте нет неподтверждённой цены?";
    const questionProperty = property(node, "Question", "TEXT", defaultQuestion);
    const question = await text(header, defaultQuestion, {
      name: "Question",
      styleName: "Typography/Body",
      width: isMobile ? 280 : 664,
      color: semantic("text/primary")
    });
    question.fontName = black;
    question.lineHeight = { unit: "PERCENT", value: 135 };
    question.layoutSizingHorizontal = "FILL";
    bindTextProperty(question, questionProperty);

    const icon = auto("Toggle icon", "HORIZONTAL");
    icon.primaryAxisSizingMode = "FIXED";
    icon.counterAxisSizingMode = "FIXED";
    icon.primaryAxisAlignItems = "CENTER";
    icon.counterAxisAlignItems = "CENTER";
    icon.resize(32, 32);
    bind(icon, "width", spacing("xl"));
    bind(icon, "height", spacing("xl"));
    fill(icon, isOpen ? semantic("status/verified") : primitive("amber/100"));
    radius(icon, radiusToken("pill"));
    header.appendChild(icon);
    await text(icon, isOpen ? "−" : "+", {
      name: "Toggle glyph",
      font: bold,
      size: 21,
      width: 20,
      lineHeight: { unit: "PERCENT", value: 100 },
      color: isOpen ? semantic("text/inverse") : semantic("text/primary")
    });

    const answerWrap = auto("Answer area", "VERTICAL");
    node.appendChild(answerWrap);
    answerWrap.layoutSizingHorizontal = "FILL";
    bind(answerWrap, "paddingRight", spacing(isMobile ? "md" : "lg"));
    bind(answerWrap, "paddingBottom", spacing(isMobile ? "md" : "lg"));
    bind(answerWrap, "paddingLeft", spacing(isMobile ? "md" : "lg"));

    const defaultAnswer = "Цена и наличие быстро меняются. Перед консультацией они проверяются на конкретную дату и по конкретной квартире.";
    const answerProperty = property(node, "Answer", "TEXT", defaultAnswer);
    const answer = await text(answerWrap, defaultAnswer, {
      name: "Answer",
      styleName: "Typography/Body",
      width: isMobile ? 328 : 712,
      color: semantic("text/muted")
    });
    bindTextProperty(answer, answerProperty);
    answerWrap.visible = isOpen;

    node.description = isOpen
      ? "Открытое состояние: показывает проверяемый ответ без рекламных гарантий."
      : "Закрытое состояние: вопрос остаётся читаемым и имеет зону нажатия не меньше 48 px.";
    variants.push(node);
  }
}
const set = combine(variants, stage, "FAQ Accordion");
set.description = "Portal v2 FAQ Accordion · State × Size";
const notes = auto("Usage notes", "VERTICAL");
notes.itemSpacing = 12;
root.appendChild(notes);
await text(notes, "Правила использования", { name: "Notes title", styleName: "Typography/H3", width: 1080 });
await text(notes, "Один вопрос должен снимать одну конкретную неопределённость. Ответ не должен обещать актуальную цену, наличие, одобрение ипотеки или юридический результат без повторной проверки.", {
  name: "Notes body",
  styleName: "Typography/Body",
  width: 1080,
  color: semantic("text/body")
});`;

process.stdout.write(buildComponentRuntime({
  pageName: "08 Component · FAQ Accordion",
  componentKey: "faq-accordion",
  title: "FAQ Accordion",
  description: "Раскрывает ответы на вопросы о проверке объекта, цене, документах и роли независимого портала.",
  background: "background/soft"
}, body));
