(() => {
  const script = document.currentScript?.src;
  const catalog = document.querySelector('[data-city-guide]');
  const passport = document.querySelector('[data-buyer-passport]');
  if (!script || (!catalog && !passport) || typeof window.fetch !== 'function') return;
  const base = new URL('../../', script);
  const profiles = ['prostornaya-4a', 'aerodromnaya-18g', 'sennaya-76'];
  const confirmed = new Set(['confirmed', 'verified']);
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const link = (text, href) => {
    const node = el('a', text); node.href = href; return node;
  };
  function date(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return 'дата не указана';
    return value.split('-').reverse().join('.');
  }
  async function read(relative) {
    const response = await fetch(new URL(relative, base), {cache: 'no-store'});
    if (!response.ok) throw new Error('Data unavailable');
    return response.json();
  }
  function accepted(profile) {
    return new Map((profile.claims || []).filter(claim =>
      claim.publication_allowed === true && confirmed.has(claim.verification_status)
    ).map(claim => [claim.field, claim]));
  }
  function project(slug, profile) {
    const claims = accepted(profile);
    const value = key => claims.get(key)?.value;
    const items = [];
    const add = (label, key, format = v => v) => {
      if (value(key) === undefined || value(key) === null) return;
      const text = format(value(key));
      if (typeof text === 'string' && text) items.push({label, text, checked: claims.get(key).checked_at});
    };
    add('Адрес', 'address');
    if (!items.length) return null;
    let name = value('complex_name') || value('public_name') || value('address');
    let note, checks, sections;
    if (slug === 'prostornaya-4a') {
      add('Застройщик', 'builder_name');
      add('Заявленный срок', 'handover');
      add('Отделка', 'finish_type');
      add('Отопление', 'house_boiler', v => v === true ? 'Общедомовая котельная' : '');
      add('Потолки', 'ceiling_height', v => `${String(v).replace('.', ',')} м`);
      add('Домов в опубликованном проекте', 'buildings_total', v => String(v));
      add('Квартир в комплексе', 'complex_apartments_total', v => String(v));
      add('Входит в отделку', 'finish_includes', v => Array.isArray(v) ? v.join(', ') : '');
      add('Двор', 'yard_area_m2', v => `${v} м²`);
      add('Парковочные места в проекте', 'parking_spaces', v => String(v));
      add('Способы покупки, заявленные застройщиком', 'purchase_methods', v => Array.isArray(v) ? v.join(', ') : '');
      note = 'Сведения — с официального сайта застройщика. Срок строительства и срок передачи ключей сверяются по выбранному дому и договору.';
      checks = ['Номер дома, секцию, этаж и площадь именно вашей квартиры.', 'Ведомость отделки и бюджет оставшихся работ.', 'Актуальную цену, доступность квартиры и срок передачи по договору.'];
      sections = [['Планировки', 'apartments'], ['Отделка', 'finish'], ['Документы', 'documents']];
    } else if (slug === 'aerodromnaya-18g') {
      name = `Аэродромная 18Г · рабочее название «Патриот»`;
      add('Застройщик на площадке', 'developer_attribution_statement');
      add('Материал по ЦИАН', 'building_type_statement');
      add('Этажность по ЦИАН', 'floor_range_statement');
      add('Потолки по ЦИАН', 'ceiling_height_statement');
      add('Отделка по ЦИАН', 'finish_statement');
      add('Территория по ЦИАН', 'territory_features_statement');
      note = 'Карточка ЦИАН использует другое название. Её общие характеристики не подтверждают конкретную секцию или квартиру; 18Б рассматривается отдельно.';
      checks = ['Точный адрес и секцию в документах, а не только в объявлении.', 'Документы о вводе выбранной части дома, продавца и условия расчётов.', 'Фактическую отделку и систему отопления квартиры на просмотре.'];
      sections = [['Характеристики', 'published'], ['Источники', 'sources']];
    } else {
      add('Фасад — по интервью', 'facade_material_statement');
      add('Кровля — по интервью', 'roof_material_statement');
      add('Отопление — по интервью', 'individual_heating_statement');
      add('Оснащение — по интервью', 'smart_home_statement');
      add('Безопасность — по интервью', 'video_surveillance_statement');
      note = 'Описание основано на интервью представителя проекта 2024 года. Оно помогает познакомиться с домом, а текущую комплектацию проверяют при осмотре.';
      checks = ['Комплектацию и работоспособность отопления и «умного дома».', 'Фактические платежи за содержание и обслуживание систем.', 'Документы по квартире, её продавца, цену и наличие на дату обращения.'];
      sections = [['Материалы', 'comfort'], ['Инженерия', 'engineering'], ['Источник', 'source']];
    }
    return {slug, name, items, note, checks, sections, sources: (profile.sources || []).filter(s => ['verified', 'accepted'].includes(s.status) && /^https:\/\//.test(s.reference || ''))};
  }
  function renderPassport(data) {
    if (!data) return;
    const target = passport.querySelector('[data-passport-content]');
    const layout = el('div', '', 'buyer-passport__layout');
    const facts = el('dl', '', 'buyer-passport__facts');
    data.items.slice(0, 6).forEach(item => {
      const row = el('div'); row.append(el('dt', item.label));
      const dd = el('dd', item.text);
      dd.append(el('small', `Проверено ${date(item.checked)}`, 'city-guide__source'));
      row.append(dd); facts.append(row);
    });
    const aside = el('aside', '', 'buyer-passport__aside');
    aside.append(el('h3', 'Перед просмотром уточните'));
    const checks = el('ul', '', 'list'); data.checks.forEach(item => checks.append(el('li', item)));
    aside.append(checks, el('p', data.note));
    if (data.items.length > 6) {
      const more = el('details', '', 'buyer-passport__more'); more.append(el('summary', 'Ещё характеристики'));
      data.items.slice(6).forEach(item => more.append(el('p', `${item.label}: ${item.text}`), el('small', `Проверено ${date(item.checked)}`, 'city-guide__source')));
      aside.append(more);
    }
    const sources = el('details'); sources.append(el('summary', 'Откуда сведения'));
    const list = el('ul', '', 'list');
    data.sources.forEach(source => {
      const item = el('li'); const anchor = link(source.title || 'Открыть источник', source.reference);
      anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
      item.append(anchor, el('small', `Проверка ${date(source.last_checked_at)}`, 'city-guide__source'));
      list.append(item);
    });
    sources.append(list); aside.append(sources);
    const action = link('Узнать цены и наличие', '#quick-lead'); action.className = 'button';
    action.dataset.trackAction = 'quick_consultation'; action.dataset.trackPlacement = 'buyer_passport';
    action.dataset.trackObject = data.slug;
    aside.append(action); layout.append(facts, aside); target.replaceChildren(layout);
    const nav = el('nav', '', 'buyer-section-nav'); nav.setAttribute('aria-label', 'Разделы о доме');
    [['Коротко о доме', 'passport'], ...data.sections, ['Задать вопрос', 'quick-lead']].forEach(([title,id]) => {
      if (document.getElementById(id)) nav.append(link(title, `#${id}`));
    });
    passport.before(nav); passport.dataset.passportLoaded = 'true';
  }
  function comparisonRecord(data) {
    const find = (...labels) => data.items.find(item => labels.includes(item.label))?.text || 'Уточняется';
    return {
      id: data.slug, name: data.name, sources: data.sources,
      values: [find('Адрес'), find('Застройщик', 'Застройщик на площадке'), find('Заявленный срок', 'Готовность'),
        find('Этажность', 'Этажность по ЦИАН'), find('Отделка', 'Отделка по ЦИАН'), find('Отопление', 'Отопление — по интервью')],
      note: data.note
    };
  }
  function referenceComparison(project) {
    if (project.commercial_role !== 'reference_catalog' || project.verification_status !== 'confirmed' || project.is_public_ready !== true || !project.sources?.length) return null;
    return comparisonRecord({
      slug: project.id, name: project.display_name, note: 'Наличие квартир и условия продажи проверяются отдельно.',
      items: [['Адрес', project.address], ['Застройщик', project.builder_name], ['Готовность', project.building_status], ['Этажность', project.floors]]
        .filter(([,text]) => typeof text === 'string' && text).map(([label,text]) => ({label,text})),
      sources: project.sources.filter(source => /^https:\/\//.test(source.url || '')).map(source => ({reference: source.url, title: source.title, last_checked_at: source.checked_at}))
    });
  }
  function mergeSelectionComment(current, previous, block) {
    let text = String(current || '');
    if (previous && text.includes(previous)) text = text.replace(previous, '').trim();
    return text.includes(block) ? text : [text.trim(), block].filter(Boolean).join('\n\n');
  }
  function setupComparison(entries) {
    const form = document.querySelector('form[data-form-id="catalog_priority_selection"]');
    const section = document.getElementById('lead');
    const selected = new Map();
    const buttons = new Map();
    const rowOpeners = new Map();
    let previousRequest = '';
    let lastOpener;
    const toolbar = el('div', '', 'buyer-compare');
    const instruction = el('p', 'Выберите два или три дома, чтобы сопоставить их по одним параметрам.');
    const status = el('p', '', 'buyer-compare__status'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    const chips = el('div', '', 'buyer-compare__chips');
    const actions = el('div', '', 'hero__actions');
    const open = el('button', 'Сравнить выбранные дома', 'button'); open.type = 'button'; open.disabled = true;
    const clear = el('button', 'Сбросить выбор', 'button button--ghost'); clear.type = 'button'; clear.disabled = true;
    const panel = el('section', '', 'buyer-compare__panel'); panel.id = 'buyer-comparison'; panel.hidden = true;
    panel.setAttribute('aria-labelledby','buyer-comparison-title'); panel.tabIndex = -1;
    const heading = el('h3','Сравнение выбранных домов'); heading.id = 'buyer-comparison-title';
    const close = el('button','Закрыть сравнение','button button--ghost'); close.type = 'button';
    const content = el('div');
    const request = link('Запросить подбор по этим домам', '#lead'); request.className = 'button';
    request.dataset.trackAction = 'quick_selection'; request.dataset.trackPlacement = 'catalog_compare_request';
    const help = el('p','Если точного подтверждения пока нет, в таблице указано «Уточняется». Цены, наличие и условия покупки проверяются по конкретной квартире.','city-guide__source');
    panel.append(heading,content,help,request,close);
    actions.append(open,clear); toolbar.append(instruction,chips,status,actions);
    catalog.before(toolbar,panel);

    function requestSelection(names, placement) {
      const comment = form?.querySelector('textarea[name="comment"]');
      const select = form?.querySelector('select[name="residential_complex"]');
      if (!form || !section || !comment || !select) return;
      let note = section.querySelector('[data-comparison-request-note]');
      if (!note) { note = el('p','','notice'); note.dataset.comparisonRequestNote = ''; note.setAttribute('role','status'); form.prepend(note); }
      const block = `Прошу подобрать и сравнить квартиры по следующим домам:\n${names.map(name=>`• ${name}`).join('\n')}`;
      const nextComment = mergeSelectionComment(comment.value,previousRequest,block);
      // Match the existing server's comment limit, preserving buyer text and attribution on failure.
      if (nextComment.length > 1500) {
        note.textContent = 'Список домов пока не добавлен: вместе с ним комментарий превышает 1500 символов. Сократите комментарий и нажмите кнопку ещё раз.';
        section.scrollIntoView({block:'start'});comment.focus();return;
      }
      // A list of homes is a general selection, not a single-object attribution.
      select.value = 'Общий подбор новостройки'; select.dispatchEvent(new Event('change',{bubbles:true}));
      comment.value = nextComment; previousRequest = block;
      comment.dispatchEvent(new Event('input',{bubbles:true}));
      form.dataset.placement = placement;
      note.textContent = 'Выбранные дома добавлены в комментарий. Укажите контакты и комнатность; список можно отредактировать.';
      section.scrollIntoView({block:'start'});
      const phone = form.querySelector('input[name="phone"]');
      (phone && !phone.value.trim() ? phone : comment).focus();
    }
    function renderTable() {
      const records = [...selected.values()];
      const scroll = el('div','','buyer-compare__scroll'); scroll.tabIndex = 0;
      scroll.setAttribute('role','region'); scroll.setAttribute('aria-label','Таблица сравнения домов; можно прокручивать по горизонтали');
      const table = el('table'); const caption = el('caption','Параметры и источники по выбранным домам');
      const head = el('thead'); const headRow = el('tr'); const first = el('th','Параметр'); first.scope = 'col'; headRow.append(first);
      records.forEach(record=>{const th=el('th',record.name);th.scope='col';headRow.append(th);});head.append(headRow);
      const body = el('tbody');
      ['Адрес','Застройщик','Срок / готовность','Этажность','Отделка','Отопление'].forEach((label,index)=>{
        const row=el('tr'); const th=el('th',label);th.scope='row';row.append(th);
        records.forEach(record=>row.append(el('td',record.values[index])));body.append(row);
      });
      const sourceRow=el('tr');const sourceHeading=el('th','Источники и даты');sourceHeading.scope='row';sourceRow.append(sourceHeading);
      records.forEach(record=>{
        const cell=el('td');cell.append(el('p',record.note));
        const details=el('details');details.append(el('summary','Показать источники'));
        record.sources.forEach(source=>{
          const anchor=link(source.title||'Открыть источник',source.reference);anchor.target='_blank';anchor.rel='noopener noreferrer';
          details.append(anchor,el('small',`Проверено ${date(source.last_checked_at)}`,'city-guide__source'));
        });cell.append(details);sourceRow.append(cell);
      });body.append(sourceRow);table.append(caption,head,body);scroll.append(table);
      content.replaceChildren(el('p','На небольшом экране таблицу можно прокручивать влево и вправо.','city-guide__source'),scroll);
    }
    function sync(message) {
      chips.replaceChildren();
      selected.forEach(record=>{
        const remove=el('button',`${record.name} ×`,'buyer-compare__chip');remove.type='button';remove.setAttribute('aria-label',`Убрать из сравнения: ${record.name}`);
        remove.addEventListener('click',()=>{
          selected.delete(record.id);sync();
          const button=buttons.get(record.id);
          if (button && !button.closest('[hidden]')) button.focus();
          else document.querySelector('[data-guide-search]')?.focus();
        });chips.append(remove);
      });
      buttons.forEach((button,id)=>{const active=selected.has(id);button.setAttribute('aria-pressed',String(active));button.textContent=active?'Добавлено в сравнение':'Сравнить';});
      rowOpeners.forEach((button,id)=>{button.hidden=!selected.has(id)||selected.size<2;button.textContent=`Сравнить ${selected.size} дома`;});
      status.textContent=message||`Выбрано ${selected.size} из 3 домов.`;open.disabled=selected.size<2;clear.disabled=!selected.size;
      if (selected.size<2) panel.hidden=true;
      else if (!panel.hidden) renderTable();
    }
    entries.forEach(({node,record})=>{
      if (!record) return;
      const button=el('button','Сравнить','button button--ghost buyer-compare__toggle');button.type='button';button.setAttribute('aria-pressed','false');
      button.setAttribute('aria-label',`Добавить или убрать из сравнения: ${record.name}`);buttons.set(record.id,button);
      button.addEventListener('click',()=>{
        if (selected.has(record.id)) selected.delete(record.id);
        else if (selected.size<3) selected.set(record.id,record);
        else {sync('Можно сравнить до трёх домов. Сначала уберите один из выбранных.');return;}
        sync();
      });node.lastElementChild.append(button);
      const opener=el('button','Открыть сравнение','button buyer-compare__open');opener.type='button';opener.hidden=true;
      opener.addEventListener('click',()=>openComparison(opener));rowOpeners.set(record.id,opener);node.lastElementChild.append(opener);
    });
    function openComparison(trigger) {if(selected.size<2)return;lastOpener=trigger;renderTable();panel.hidden=false;panel.focus();}
    open.addEventListener('click',()=>openComparison(open));
    close.addEventListener('click',()=>{panel.hidden=true;(lastOpener||open).focus();});
    clear.addEventListener('click',()=>{selected.clear();sync();});
    request.addEventListener('click',event=>{if(selected.size<2)return;event.preventDefault();requestSelection([...selected.values()].map(record=>record.name),'catalog_compare_request');});
    document.querySelector('[data-drawing-request]')?.addEventListener('click',event=>{event.preventDefault();requestSelection(['Аэродромная 18Б'],'catalog_18b_drawing');});
    sync();toolbar.dataset.comparisonReady='true';
  }
  function renderGuide(priority, references) {
    const list = el('div', '', 'city-guide__rows');
    const rows = [];
    priority.filter(Boolean).forEach(data => {
      const row = el('article', '', 'city-guide__row');
      const heading = el('div'); heading.append(el('span', 'Подробная карточка', 'eyebrow'));
      const h = el('h3'); h.append(link(data.name, `${data.slug}/#passport`)); heading.append(h);
      const facts = el('ul', '', 'list');
      const summaryLabels = new Set(['Заявленный срок', 'Отделка', 'Отопление', 'Материал по ЦИАН', 'Этажность по ЦИАН', 'Отделка по ЦИАН', 'Фасад — по интервью', 'Кровля — по интервью', 'Отопление — по интервью']);
      data.items.filter(item => summaryLabels.has(item.label)).slice(0,3).forEach(item => facts.append(el('li', `${item.label}: ${item.text}`)));
      const note = el('div'); note.append(el('p', data.note));
      const action = link('Смотреть дом →', `${data.slug}/#passport`); note.append(action);
      row.append(heading, facts, note); list.append(row);
      rows.push({node:row, record:comparisonRecord(data), search:[data.name,...data.items.map(i=>i.text)].join(' ')});
    });
    (references.projects || []).filter(p => p.commercial_role === 'reference_catalog' && p.verification_status === 'confirmed' && p.is_public_ready === true && p.sources?.length).forEach(p => {
      const row = el('article', '', 'city-guide__row');
      const heading = el('div'); heading.append(el('span', 'Сведения о проекте', 'eyebrow'));
      const h = el('h3'); h.append(link(p.display_name, `#reference-${p.id}`)); heading.append(h,el('p',p.address));
      const facts = el('ul','', 'list');
      [p.builder_name,p.building_status,p.floors && `Этажность: ${p.floors}`].filter(Boolean).forEach(text=>facts.append(el('li',text)));
      const action = el('div'); action.append(el('p','Наличие квартир и условия продажи уточняются отдельно.'),link('Особенности и источники →',`#reference-${p.id}`));
      row.append(heading,facts,action); list.append(row);
      rows.push({node:row, record:referenceComparison(p), search:[p.display_name,p.address,p.builder_name].join(' ')});
    });
    if (!rows.length) return;
    const drawing = document.getElementById('aerodromnaya-18b');
    if (drawing) rows.push({node:drawing, search:'Аэродромная 18Б Патриот этап 2 проектная схема колясочная котельная'});
    catalog.replaceChildren(list);
    setupComparison(rows);
    const search = document.querySelector('[data-guide-search]');
    const count = document.querySelector('[data-guide-count]');
    const normalize = value => String(value).toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    const empty = el('p','Дом не найден. Попробуйте название улицы или посмотрите все проекты.','notice');
    empty.hidden = true; catalog.append(empty);
    const filter = () => {
      const terms = normalize(search.value).split(' ').filter(Boolean); let visible = 0;
      rows.forEach(row => {row.node.hidden = !terms.every(term => normalize(row.search).includes(term)); if (!row.node.hidden) visible++;});
      count.textContent = `Показано ${visible} из ${rows.length} проектов`; empty.hidden = visible !== 0;
    };
    search.addEventListener('input', filter); document.querySelector('[data-guide-search-wrap]').hidden = false;
    filter(); catalog.dataset.guideLoaded = 'true';
  }
  async function start() {
    if (passport) {
      const slug = passport.dataset.buyerPassport;
      const profile = await read(`data/verification/${slug}.json`);
      renderPassport(project(slug, profile)); return;
    }
    const results = await Promise.allSettled([...profiles.map(slug=>read(`data/verification/${slug}.json`)),read('data/research/reference-projects.json')]);
    const priority = profiles.map((slug,i)=>results[i].status === 'fulfilled' ? project(slug,results[i].value) : null);
    renderGuide(priority,results[3].status === 'fulfilled' ? results[3].value : {projects:[]});
  }
  start().catch(() => { /* The existing factual page and source links remain available. */ });
})();
