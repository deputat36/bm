import fs from "node:fs";

const path = "index.html";
let html = fs.readFileSync(path, "utf8");

const replacements = [
  [
    '<p class="lead">Сравните новые дома города и получите консультацию по выбору квартиры, ипотеке и другим способам покупки. Приоритетно работаем с обращениями по Просторной 4А, Аэродромной 18Г и Сенной 76.</p>',
    '<p class="lead">Выберите конкретный дом, получите общий подбор или предварительный расчёт покупки. Специалист проверит доступные документы и актуальные условия на дату обращения — без обещаний неподтверждённых цен и наличия.</p>'
  ],
  [
    '<a class="button" href="#quick-lead" data-track-action="quick_selection" data-track-placement="hero">Подобрать квартиру</a>',
    '<a class="button" href="#start" data-track-action="route_start" data-track-placement="homepage_hero_route_start">Выбрать сценарий</a>'
  ],
  [
    '<h2>Что вы получите до принятия решения</h2>',
    '<h2>Что решим за один разговор</h2>'
  ]
];

for (const [before, after] of replacements) {
  if (!html.includes(before)) throw new Error(`Expected homepage fragment not found: ${before.slice(0, 90)}`);
  html = html.replace(before, after);
}

const routesSection = `
    <section class="section--soft" id="start" data-homepage-routes>
      <div class="container">
        <div class="section__head"><span class="eyebrow">С чего начать</span><h2>Выберите свою задачу</h2><p>Портал направит к подходящему следующему шагу. Цена, наличие и применимость программы всё равно проверяются на дату обращения.</p></div>
        <div class="grid grid--3">
          <article class="card card--shadow"><h3>Интересует конкретный дом</h3><p>Перейдите к объектам, выберите адрес и запросите документы, статус или условия покупки.</p><div class="hero__actions"><a class="button" href="#objects" data-track-action="route_object" data-track-placement="homepage_route_object">Выбрать дом</a></div></article>
          <article class="card card--shadow"><h3>Нужен подбор новостройки</h3><p>Оставьте короткую заявку. Специалист уточнит бюджет, комнатность и подходящий способ покупки.</p><div class="hero__actions"><a class="button" href="#quick-lead" data-track-action="route_selection" data-track-placement="homepage_route_selection">Начать подбор</a></div></article>
          <article class="card card--shadow"><h3>Нужно рассчитать покупку</h3><p>Перейдите к предварительному расчёту ипотеки, взноса, платежа и доступных источников средств.</p><div class="hero__actions"><a class="button" href="ipoteka/#quick-lead" data-track-action="route_mortgage" data-track-placement="homepage_route_mortgage">Рассчитать покупку</a></div></article>
        </div>
      </div>
    </section>
`;

if (!html.includes("data-homepage-routes")) {
  const objectsSection = '    <section id="objects">';
  if (!html.includes(objectsSection)) throw new Error("Objects section anchor not found");
  html = html.replace(objectsSection, `${routesSection}\n${objectsSection}`);
}

const processSection = `
    <section data-homepage-consultation-process>
      <div class="container">
        <div class="section__head"><span class="eyebrow">Как проходит консультация</span><h2>От вопроса к понятному следующему шагу</h2><p>Без бронирования, фиксации цены и обязательств со стороны покупателя.</p></div>
        <div class="grid grid--3">
          <article class="card"><span class="eyebrow">Шаг 1</span><h3>Уточняем задачу</h3><p>Какой объект интересует, когда планируется покупка и что нужно проверить в первую очередь.</p></article>
          <article class="card"><span class="eyebrow">Шаг 2</span><h3>Сверяем информацию</h3><p>Отделяем подтверждённые сведения от рабочих данных и отмечаем недостающие документы.</p></article>
          <article class="card"><span class="eyebrow">Шаг 3</span><h3>Определяем действие</h3><p>Запросить документы, выполнить расчёт, подобрать альтернативу или дождаться обновления.</p></article>
        </div>
      </div>
    </section>
`;

if (!html.includes("data-homepage-consultation-process")) {
  const purchaseSection = '    <section><div class="container"><div class="section__head"><h2>Способы покупки</h2>';
  if (!html.includes(purchaseSection)) throw new Error("Purchase section anchor not found");
  html = html.replace(purchaseSection, `${processSection}\n${purchaseSection}`);
}

for (const placement of [
  "homepage_hero_route_start",
  "homepage_route_object",
  "homepage_route_selection",
  "homepage_route_mortgage"
]) {
  if ((html.split(`data-track-placement="${placement}"`).length - 1) !== 1) {
    throw new Error(`Expected unique placement: ${placement}`);
  }
}

if ((html.split("<form ").length - 1) !== 2) {
  throw new Error("Homepage form count must remain 2");
}

fs.writeFileSync(path, html, "utf8");
console.log("Homepage conversion routes applied.");