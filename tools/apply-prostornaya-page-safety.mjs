import fs from "node:fs";

const projectPath = "catalog/prostornaya-4a/index.html";
const catalogPath = "catalog/index.html";
let project = fs.readFileSync(projectPath, "utf8");
let catalog = fs.readFileSync(catalogPath, "utf8");

const replacements = [
  [
    '<meta name="description" content="Дом на Просторной 4А в Борисоглебске: известные характеристики, документы, квартирография, сроки и форма заявки на консультацию.">',
    '<meta name="description" content="Просторная 4А в Борисоглебске: проверка документов, статуса объекта и условий покупки, а также заявка на консультацию.">'
  ],
  [
    '<body data-schema-project="prostornaya-4a" data-schema-project-name="Дом на Просторной 4А" data-schema-address="ул. Просторная, 4А" data-schema-city="Борисоглебск" data-schema-region="Воронежская область" data-schema-floors="9">',
    '<body data-schema-project="prostornaya-4a" data-schema-project-name="Дом на Просторной 4А" data-schema-address="ул. Просторная, 4А" data-schema-city="Борисоглебск" data-schema-region="Воронежская область">'
  ],
  [
    'Дом, связанный с ЖК «Теллерманов сад». По опубликованным данным в доме предусмотрены студии, 1-, 2- и 3-комнатные квартиры. Можно запросить подтверждённую информацию по ценам, планировкам и условиям покупки.',
    'Собираем и проверяем сведения по адресу Просторная 4А. Можно запросить актуальный статус объекта, документы, возможные варианты квартир и условия покупки на дату обращения.'
  ],
  [
    '<section><div class="container"><div class="section__head"><span class="eyebrow">Рабочие сведения</span><h2>Что известно по объекту</h2><p>Характеристики приведены для предварительного знакомства и требуют повторной сверки с первичными публичными источниками перед принятием решения.</p></div><div class="grid grid--4"><article class="card"><h3>Адрес</h3><p>Воронежская область, г. Борисоглебск, ул. Просторная, 4А.</p></article><article class="card"><h3>Дом</h3><p>В рабочей карточке указаны 9 этажей, 1 подъезд, пассажирский лифт и кирпич / мелкоштучные каменные материалы.</p></article><article class="card"><h3>Квартиры</h3><p>В рабочей квартирографии указаны 70 квартир: студии, 1-, 2- и 3-комнатные варианты площадью от 27,71 до 63,76 м².</p></article><article class="card"><h3>Сроки</h3><p>В рабочей карточке указана планируемая сдача в I квартале 2028 года и передача ключей до 30.09.2028.</p></article></div></div></section>',
    '<section><div class="container"><div class="section__head"><span class="eyebrow">Данные уточняются</span><h2>Что проверяется по объекту</h2><p>Рабочие характеристики не публикуются как подтверждённые, пока портал не сохранит первичные ссылки и не завершит повторную проверку.</p></div><div class="grid grid--4"><article class="card"><h3>Статус и адрес</h3><p>Проверяем официальное наименование объекта, строительный адрес и текущий статус.</p></article><article class="card"><h3>Дом</h3><p>Уточняем этажность, секции, конструктив, инженерные системы и благоустройство.</p></article><article class="card"><h3>Квартиры</h3><p>Сверяем квартирографию, площади, планировки, отделку и фактическое наличие.</p></article><article class="card"><h3>Сроки</h3><p>Разделяем срок строительства, ввод в эксплуатацию, передачу квартир и фактическое заселение.</p></article></div></div></section>'
  ],
  [
    '<section id="documents"><div class="container"><div class="section__head"><span class="eyebrow">Документы и проверка</span><h2>Рабочие реквизиты объекта</h2><p>Сведения перенесены из старых документных страниц в единую карточку. Перед открытием страницы для индексации их нужно повторно сверить.</p></div><div class="grid grid--4"><article class="card"><h3>Проектная декларация</h3><p>Рабочий номер: 36-001139. Дата в профиле проекта: 26.06.2026.</p></article><article class="card"><h3>Карточка объекта</h3><p>Рабочий ID в ЕИСЖС / наш.дом.рф: 72480.</p></article><article class="card"><h3>Разрешение</h3><p>Рабочий номер: 36-04-13-2026 от 08.06.2026.</p></article><article class="card"><h3>Дата сверки</h3><p>Рабочая карточка проверялась 05.07.2026. Требуется повторная актуализация.</p></article></div><div class="notice">Эти реквизиты не заменяют актуальные документы. Перед сделкой нужно открыть первичный источник и проверить последнюю редакцию.</div><p><a class="button button--ghost" href="../../sources/">Как портал проверяет источники</a> <a class="button button--ghost" href="../../guides/">Справочник покупателя</a></p></div></section>',
    '<section id="documents"><div class="container"><div class="section__head"><span class="eyebrow">Документы и проверка</span><h2>Какие источники ещё нужны</h2><p>Номера из старой рабочей карточки не выводятся как публичные реквизиты без прямых ссылок на актуальные документы.</p></div><div class="grid grid--4"><article class="card"><h3>Карточка ЕИСЖС</h3><p>Нужна точная публичная ссылка на объект и повторная сверка изменяемых сведений.</p></article><article class="card"><h3>Проектная декларация</h3><p>Нужна актуальная редакция документа с датой проверки и связью с адресом.</p></article><article class="card"><h3>Разрешение</h3><p>Нужно подтвердить номер, дату, срок действия, заявителя и объект строительства.</p></article><article class="card"><h3>Права на материалы</h3><p>Для планировок и визуализаций необходимо подтвердить источник и допустимые каналы публикации.</p></article></div><div class="notice">До принятия источников точные характеристики, сроки и реквизиты остаются внутренней рабочей информацией.</div><p><a class="button button--ghost" href="../../sources/">Как портал проверяет источники</a> <a class="button button--ghost" href="../../guides/">Справочник покупателя</a></p></div></section>'
  ]
];

for (const [before, after] of replacements) {
  if (!project.includes(before)) {
    throw new Error(`Expected project fragment not found: ${before.slice(0, 80)}`);
  }
  project = project.replace(before, after);
}

const oldCatalog = '<span class="eyebrow">Данные частично подтверждены</span><h3>Просторная 4А</h3><p>Рабочая карточка содержит сведения о доме, квартирах, сроках и документах, которые требуют повторной сверки с первичными источниками.</p>';
const newCatalog = '<span class="eyebrow">Данные уточняются</span><h3>Просторная 4А</h3><p>Проверяем статус объекта, документы, характеристики и возможные условия покупки. Точные значения не публикуются без принятых источников.</p>';
if (!catalog.includes(oldCatalog)) throw new Error("Expected catalog card fragment not found");
catalog = catalog.replace(oldCatalog, newCatalog);

const forbidden = [
  'data-schema-floors="9"',
  'ЖК «Теллерманов сад»',
  '9 этажей',
  '70 квартир',
  '27,71',
  '63,76',
  'I квартале 2028',
  '30.09.2028',
  '36-001139',
  '72480',
  '36-04-13-2026',
  '08.06.2026'
];
for (const fragment of forbidden) {
  if (project.includes(fragment)) throw new Error(`Unverified public fragment remains: ${fragment}`);
}

fs.writeFileSync(projectPath, project, "utf8");
fs.writeFileSync(catalogPath, catalog, "utf8");
console.log("Prostornaya project page and catalog card made verification-safe.");