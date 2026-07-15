import fs from "node:fs";

const path = "index.html";
const source = fs.readFileSync(path, "utf8");

const oldFragment = '<article class="card card--shadow"><span class="eyebrow">Строится · данные частично подтверждены</span><h3>Просторная 4А</h3><p>Дом, связанный с ЖК «Теллерманов сад». По опубликованным данным: 9 этажей, 70 квартир, студии, 1-, 2- и 3-комнатные варианты.</p><ul class="list"><li>Площади: 27,71–63,76 м².</li><li>Планируемая сдача: I квартал 2028 года.</li><li>Ключи: до 30.09.2028.</li></ul><div class="hero__actions"><a class="button" href="catalog/prostornaya-4a/#quick-lead" data-track-action="object_quick_consultation" data-track-placement="homepage_object_card" data-track-object="prostornaya-4a">Оставить заявку</a><a class="button button--ghost" href="catalog/prostornaya-4a/" data-track-action="object_details" data-track-placement="homepage_object_card" data-track-object="prostornaya-4a">Подробнее</a></div></article>';

const newFragment = '<article class="card card--shadow"><span class="eyebrow">Данные уточняются</span><h3>Просторная 4А</h3><p>Собираем предварительные обращения и проверяем первичные сведения об объекте, документах, сроках, характеристиках и возможностях покупки.</p><ul class="list"><li>Карточка включена в приоритет проверки.</li><li>Точные характеристики не публикуются без первичных источников.</li><li>Специалист сообщит, какие данные подтверждены на момент обращения.</li></ul><div class="hero__actions"><a class="button" href="catalog/prostornaya-4a/#quick-lead" data-track-action="object_quick_consultation" data-track-placement="homepage_object_card" data-track-object="prostornaya-4a">Оставить заявку</a><a class="button button--ghost" href="catalog/prostornaya-4a/" data-track-action="object_details" data-track-placement="homepage_object_card" data-track-object="prostornaya-4a">Подробнее</a></div></article>';

if (source.includes(newFragment) && !source.includes(oldFragment)) {
  console.log("Homepage verification-safe card is already applied.");
  process.exit(0);
}

if (!source.includes(oldFragment)) {
  throw new Error("Expected unverified homepage fragment was not found");
}

const updated = source.replace(oldFragment, newFragment);
const forbidden = [
  "Строится · данные частично подтверждены",
  "9 этажей",
  "70 квартир",
  "27,71–63,76 м²",
  "I квартал 2028 года",
  "30.09.2028",
  "Дом, связанный с ЖК «Теллерманов сад»"
];

for (const fragment of forbidden) {
  if (updated.includes(fragment)) throw new Error(`Unverified fragment remains: ${fragment}`);
}

fs.writeFileSync(path, updated, "utf8");
console.log("Homepage verification-safe card applied.");