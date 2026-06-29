(() => {
  const renders = [
    {
      file: 'assets/img/gallery-b64/Borisoglebsk_002.b64',
      image: 'assets/img/gallery/Borisoglebsk_002.jpg',
      title: 'Общий вид комплекса',
      alt: 'ЖК Теллерманов сад в Борисоглебске — общий вид жилого комплекса'
    },
    {
      file: 'assets/img/gallery-b64/Borisoglebsk_003.b64',
      image: 'assets/img/gallery/Borisoglebsk_003.jpg',
      title: 'Фронтальный фасад',
      alt: 'Фронтальный фасад дома ЖК Теллерманов сад'
    },
    {
      file: 'assets/img/gallery-b64/Borisoglebsk_007.b64',
      image: 'assets/img/gallery/Borisoglebsk_007.jpg',
      title: 'Вид сверху на территорию',
      alt: 'Вид сверху на территорию ЖК Теллерманов сад'
    },
    {
      file: 'assets/img/gallery-b64/Borisoglebsk_005.b64',
      image: 'assets/img/gallery/Borisoglebsk_005.jpg',
      title: 'Фасад и двор',
      alt: 'Фасад дома и благоустроенный двор ЖК Теллерманов сад'
    },
    {
      file: 'assets/img/gallery-b64/Borisoglebsk_006.b64',
      image: 'assets/img/gallery/Borisoglebsk_006.jpg',
      title: 'Дворовая перспектива',
      alt: 'Дворовая перспектива ЖК Теллерманов сад'
    },
    {
      file: 'assets/img/gallery-b64/Borisoglebsk_004.b64',
      image: 'assets/img/gallery/Borisoglebsk_004.jpg',
      title: 'Аэровид комплекса',
      alt: 'Аэровид домов и благоустройства ЖК Теллерманов сад'
    },
    {
      file: 'assets/img/gallery-b64/Borisoglebsk_001.b64',
      image: 'assets/img/gallery/Borisoglebsk_001.jpg',
      title: 'Вид сверху и парковка',
      alt: 'Вид сверху на дома, двор и парковку ЖК Теллерманов сад'
    }
  ];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  async function fileExists(url) {
    try {
      const response = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async function base64ToDataUrl(url) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) return null;
    const base64 = (await response.text()).trim();
    if (!base64) return null;
    return 'data:image/jpeg;base64,' + base64;
  }

  async function resolveImage(item, basePath) {
    const b64Url = basePath + item.file;
    const jpgUrl = basePath + item.image;

    const dataUrl = await base64ToDataUrl(b64Url).catch(() => null);
    if (dataUrl) return { src: dataUrl, href: dataUrl, isReady: true };

    if (await fileExists(jpgUrl)) return { src: jpgUrl, href: jpgUrl, isReady: true };

    return { src: '', href: '', isReady: false };
  }

  function placeholderCard(item) {
    return `<figure class="render-card render-card--placeholder"><div class="render-card__body"><strong>${escapeHtml(item.title)}</strong><span>Изображение готовится к публикации</span></div></figure>`;
  }

  async function cardHtml(item, basePath, index) {
    const image = await resolveImage(item, basePath);
    if (!image.isReady) return placeholderCard(item);

    const wideClass = index === 0 ? ' render-card--wide' : '';

    return `<a class="render-card${wideClass}" href="${image.href}" target="_blank" rel="noopener"><img src="${image.src}" alt="${escapeHtml(item.alt)}" loading="lazy"><span class="render-card__body"><strong>${escapeHtml(item.title)}</strong><span>Открыть изображение</span></span></a>`;
  }

  async function renderGallery(root) {
    const basePath = root.dataset.galleryBase || '';
    const limit = Number(root.dataset.galleryLimit || renders.length);
    const items = renders.slice(0, limit);

    root.innerHTML = '<div class="render-gallery__loading">Загружаем рендеры проекта...</div>';

    const cards = await Promise.all(items.map((item, index) => cardHtml(item, basePath, index)));
    root.innerHTML = cards.join('');
  }

  async function renderHero(root) {
    const basePath = root.dataset.galleryBase || '';
    const image = await resolveImage(renders[0], basePath);
    if (!image.isReady) {
      root.classList.add('is-empty');
      return;
    }
    root.innerHTML = `<img src="${image.src}" alt="${escapeHtml(renders[0].alt)}">`;
  }

  document.querySelectorAll('[data-render-gallery]').forEach((root) => renderGallery(root));
  document.querySelectorAll('[data-hero-render]').forEach((root) => renderHero(root));
})();
