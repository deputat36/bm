(() => {
  const REGISTRY_FILE = 'data/media/prostornaya-4a.json';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function buildUrl(basePath, relativePath) {
    return `${basePath || ''}${String(relativePath || '').replace(/^\/+/, '')}`;
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
    return `data:image/jpeg;base64,${base64}`;
  }

  async function loadPublicAssets(basePath) {
    const response = await fetch(buildUrl(basePath, REGISTRY_FILE), { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Media registry request failed: ${response.status}`);

    const registry = await response.json();
    const assets = Array.isArray(registry.assets) ? registry.assets : [];

    return assets.filter((item) => (
      item
      && item.is_public_ready === true
      && item.verification_status === 'confirmed'
      && item.rights_status === 'cleared'
      && typeof item.source_reference === 'string'
      && item.source_reference.trim() !== ''
      && Array.isArray(item.allowed_usage)
      && item.allowed_usage.length > 0
    ));
  }

  async function resolveImage(item, basePath) {
    const imageUrl = buildUrl(basePath, item.file);
    if (item.file && await fileExists(imageUrl)) {
      return { src: imageUrl, href: imageUrl, isReady: true };
    }

    if (item.fallback_file) {
      const fallbackUrl = buildUrl(basePath, item.fallback_file);
      const dataUrl = await base64ToDataUrl(fallbackUrl).catch(() => null);
      if (dataUrl) return { src: dataUrl, href: dataUrl, isReady: true };
    }

    return { src: '', href: '', isReady: false };
  }

  function emptyGalleryMessage(root) {
    const message = root.dataset.galleryEmptyMessage
      || 'Визуальные материалы проходят проверку источника, актуальности и права публикации.';

    return `<div class="render-gallery__empty"><strong>Галерея готовится</strong><p>${escapeHtml(message)}</p></div>`;
  }

  function placeholderCard(item) {
    return `<figure class="render-card render-card--placeholder"><div class="render-card__body"><strong>${escapeHtml(item.title || 'Изображение')}</strong><span>Файл временно недоступен</span></div></figure>`;
  }

  async function cardHtml(item, basePath, index) {
    const image = await resolveImage(item, basePath);
    if (!image.isReady) return placeholderCard(item);

    const wideClass = index === 0 ? ' render-card--wide' : '';
    const title = item.title || 'Визуальный материал';
    const alt = item.alt || title;

    return `<a class="render-card${wideClass}" href="${image.href}" target="_blank" rel="noopener"><img src="${image.src}" alt="${escapeHtml(alt)}" loading="lazy"><span class="render-card__body"><strong>${escapeHtml(title)}</strong><span>Открыть изображение</span></span></a>`;
  }

  async function renderGallery(root) {
    const basePath = root.dataset.galleryBase || '';
    const limit = Number(root.dataset.galleryLimit || 100);

    root.innerHTML = '<div class="render-gallery__loading">Проверяем доступные визуальные материалы...</div>';

    try {
      const assets = await loadPublicAssets(basePath);
      const items = assets.slice(0, Number.isFinite(limit) && limit > 0 ? limit : assets.length);

      if (!items.length) {
        root.innerHTML = emptyGalleryMessage(root);
        return;
      }

      const cards = await Promise.all(items.map((item, index) => cardHtml(item, basePath, index)));
      root.innerHTML = cards.join('');
    } catch (error) {
      console.warn('Gallery registry is unavailable', error);
      root.innerHTML = emptyGalleryMessage(root);
    }
  }

  async function renderHero(root) {
    const basePath = root.dataset.galleryBase || '';

    try {
      const assets = await loadPublicAssets(basePath);
      const firstAsset = assets[0];
      if (!firstAsset) {
        root.classList.add('is-empty');
        return;
      }

      const image = await resolveImage(firstAsset, basePath);
      if (!image.isReady) {
        root.classList.add('is-empty');
        return;
      }

      root.innerHTML = `<img src="${image.src}" alt="${escapeHtml(firstAsset.alt || firstAsset.title || 'Визуальный материал')}">`;
    } catch (error) {
      console.warn('Hero media registry is unavailable', error);
      root.classList.add('is-empty');
    }
  }

  document.querySelectorAll('[data-render-gallery]').forEach((root) => renderGallery(root));
  document.querySelectorAll('[data-hero-render]').forEach((root) => renderHero(root));
})();
