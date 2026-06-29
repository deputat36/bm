(() => {
  const renders = [
    {
      file: 'assets/img/gallery-b64/zhk-prostornaya-4a-obshchiy-vid.b64',
      title: 'Общий вид проекта',
      alt: 'Рендер жилого комплекса на Просторной 4А в Борисоглебске — общий вид фасадов и закрытой территории'
    },
    {
      file: 'assets/img/gallery-b64/zhk-prostornaya-4a-fasad.b64',
      title: 'Фасад дома',
      alt: 'Фронтальный рендер 9-этажного кирпичного дома на Просторной 4А'
    }
  ];

  async function toDataUrl(file) {
    const response = await fetch(file, { cache: 'force-cache' });
    if (!response.ok) throw new Error('Не удалось загрузить изображение: ' + file);
    const base64 = (await response.text()).trim();
    return 'data:image/jpeg;base64,' + base64;
  }

  async function renderGallery(root) {
    const basePath = root.dataset.galleryBase || '';
    const limit = Number(root.dataset.galleryLimit || renders.length);
    const items = renders.slice(0, limit);
    root.innerHTML = '<div class="render-gallery__loading">Загружаем рендеры проекта...</div>';

    const cards = await Promise.all(items.map(async (item) => {
      const src = await toDataUrl(basePath + item.file);
      return `<figure class="render-card"><img src="${src}" alt="${item.alt}" loading="lazy"><figcaption>${item.title}</figcaption></figure>`;
    }));

    root.innerHTML = cards.join('');
  }

  async function renderHero(root) {
    const basePath = root.dataset.galleryBase || '';
    const item = renders[0];
    try {
      const src = await toDataUrl(basePath + item.file);
      root.innerHTML = `<img src="${src}" alt="${item.alt}">`;
    } catch (error) {
      root.classList.add('is-empty');
    }
  }

  document.querySelectorAll('[data-render-gallery]').forEach((root) => renderGallery(root));
  document.querySelectorAll('[data-hero-render]').forEach((root) => renderHero(root));
})();
