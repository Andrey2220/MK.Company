const tokenKey = 'mk_admin_token';

const loginCard = document.getElementById('admin-login-card');
const panel = document.getElementById('admin-panel');
const passwordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('admin-login-btn');
const loginStatus = document.getElementById('admin-login-status');

const tabButtons = Array.from(document.querySelectorAll('.admin-tab-btn'));
const tabPanels = Array.from(document.querySelectorAll('.admin-tab-panel'));

const commentsEnabled = document.getElementById('comments-enabled');
const saveConfigBtn = document.getElementById('save-config-btn');
const configStatus = document.getElementById('admin-config-status');

const uploadInput = document.getElementById('image-file');
const uploadBtn = document.getElementById('upload-image-btn');
const uploadStatus = document.getElementById('upload-status');
const uploadedImagePathInput = document.getElementById('uploaded-image-path');
const insertUploadedImageBtn = document.getElementById('insert-uploaded-image-btn');

const adminGalleryList = document.getElementById('admin-gallery-list');
const adminGalleryAddBtn = document.getElementById('admin-gallery-add-btn');
const adminGallerySaveBtn = document.getElementById('admin-gallery-save-btn');
const adminGalleryStatus = document.getElementById('admin-gallery-status');

const visualPageSelect = document.getElementById('visual-page-select');
const visualLoadBtn = document.getElementById('visual-load-btn');
const visualFrame = document.getElementById('visual-editor-frame');
const visualSelectedSelector = document.getElementById('visual-selected-selector');
const visualSelectedType = document.getElementById('visual-selected-type');
const visualSelectedValue = document.getElementById('visual-selected-value');
const visualSaveSelectedBtn = document.getElementById('visual-save-selected-btn');
const visualStatus = document.getElementById('visual-status');
const visualAutosaveEnabled = document.getElementById('visual-autosave-enabled');

let visualSelectedNode = null;
let visualSelectedInputHandler = null;
let visualFrameDoc = null;
let currentOverrides = [];
let currentGalleryItems = [];
let autosaveTimer = null;
let draggedGalleryItem = null;

function getToken() {
  return localStorage.getItem(tokenKey) || '';
}

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.hidden = false;
  element.textContent = message;
  element.classList.toggle('error', isError);
}

function hideStatus(element) {
  if (!element) return;
  element.hidden = true;
  element.textContent = '';
  element.classList.remove('error');
}

function upsertOverride(selector, type, value) {
  if (!selector) return;

  const existingIndex = currentOverrides.findIndex((item) => item.selector === selector);
  const payload = { selector, type, value };

  if (existingIndex === -1) {
    currentOverrides.push(payload);
  } else {
    currentOverrides[existingIndex] = payload;
  }
}

function activateTab(tabName) {
  tabButtons.forEach((button) => {
    const isActive = button.dataset.tab === tabName;
    button.classList.toggle('active', isActive);
  });

  tabPanels.forEach((panelItem) => {
    const isActive = panelItem.dataset.panel === tabName;
    panelItem.classList.toggle('active', isActive);
    panelItem.hidden = !isActive;
  });
}

async function uploadSelectedFile(file, statusElement = uploadStatus) {
  if (!file) {
    setStatus(statusElement, 'Выберите файл', true);
    return null;
  }

  const formData = new FormData();
  formData.append('image', file);

  const res = await adminFetch('/api/admin/upload', {
    method: 'POST',
    body: formData
  });
  const json = await res.json();

  if (!res.ok || !json.ok || !json.path) {
    setStatus(statusElement, (json && json.error) || 'Ошибка загрузки', true);
    return null;
  }

  return json.path;
}

function createGalleryRow(item = { image: '', alt: '', title: '', description: '' }) {
  if (!adminGalleryList) return null;

  const allImages = Array.isArray(item.images) && item.images.length
    ? item.images.filter((img) => typeof img === 'string' && img.trim())
    : (item.image ? [item.image] : []);
  const coverImage = allImages[0] || item.image || '';
  const extraImages = allImages.slice(1);

  const row = document.createElement('div');
  row.className = 'admin-gallery-item';
  row.draggable = true;
  row.innerHTML = `
    <div class="admin-gallery-item-grid">
      <img class="admin-gallery-item-preview admin-gallery-full" src="${String(coverImage).replaceAll('"', '&quot;')}" alt="preview">
      <label class="admin-gallery-full">
        <span>Путь к фото (например: /img/uploads/your-photo.jpg)</span>
        <div class="gallery-file-line">
          <input type="text" class="gallery-image" value="${String(coverImage).replaceAll('"', '&quot;')}">
          <div class="gallery-file-actions">
            <input type="file" class="gallery-image-file" accept="image/*">
            <button type="button" class="btn gallery-mini-btn gallery-image-upload-btn">Загрузить</button>
          </div>
        </div>
      </label>
      <label>
        <span>Alt текст</span>
        <input type="text" class="gallery-alt" value="${String(item.alt || '').replaceAll('"', '&quot;')}">
      </label>
      <label>
        <span>Заголовок</span>
        <input type="text" class="gallery-title" value="${String(item.title || '').replaceAll('"', '&quot;')}">
      </label>
      <label class="admin-gallery-full">
        <span>Описание</span>
        <input type="text" class="gallery-description" value="${String(item.description || '').replaceAll('"', '&quot;')}">
      </label>
      <div class="admin-gallery-extra-block admin-gallery-full">
        <div class="admin-gallery-extra-header">
          <span>Доп. фото этой карточки (показываются только при клике на карточку)</span>
          <button type="button" class="btn gallery-mini-btn gallery-add-extra-btn">+ Фото</button>
        </div>
        <div class="gallery-extra-list"></div>
      </div>
      <div class="admin-gallery-full">
        <div class="admin-gallery-actions">
          <span class="admin-gallery-drag-hint" title="Перетащите карточку мышкой">⠿ Перетащить</span>
          <button type="button" class="btn gallery-up-btn">↑ Выше</button>
          <button type="button" class="btn gallery-down-btn">↓ Ниже</button>
          <button type="button" class="btn gallery-remove-btn">Удалить</button>
        </div>
      </div>
    </div>
  `;

  const removeBtn = row.querySelector('.gallery-remove-btn');
  const upBtn = row.querySelector('.gallery-up-btn');
  const downBtn = row.querySelector('.gallery-down-btn');
  const imageInput = row.querySelector('.gallery-image');
  const preview = row.querySelector('.admin-gallery-item-preview');
  const imageFileInput = row.querySelector('.gallery-image-file');
  const imageUploadBtn = row.querySelector('.gallery-image-upload-btn');
  const addExtraBtn = row.querySelector('.gallery-add-extra-btn');
  const extraList = row.querySelector('.gallery-extra-list');

  function appendExtraImageRow(value = '') {
    const extraRow = document.createElement('div');
    extraRow.className = 'gallery-extra-row';
    extraRow.innerHTML = `
      <input type="text" class="gallery-extra-image" placeholder="/img/uploads/another-photo.jpg" value="${String(value).replaceAll('"', '&quot;')}">
      <input type="file" class="gallery-extra-file" accept="image/*">
      <button type="button" class="btn gallery-mini-btn gallery-extra-upload">Загрузить</button>
      <button type="button" class="btn gallery-mini-btn gallery-extra-remove">Удалить</button>
    `;

    const removeExtraBtn = extraRow.querySelector('.gallery-extra-remove');
    const uploadExtraBtn = extraRow.querySelector('.gallery-extra-upload');
    const extraInput = extraRow.querySelector('.gallery-extra-image');
    const extraFileInput = extraRow.querySelector('.gallery-extra-file');

    uploadExtraBtn.addEventListener('click', async () => {
      hideStatus(adminGalleryStatus);
      const uploadedPath = await uploadSelectedFile(extraFileInput.files && extraFileInput.files[0], adminGalleryStatus);
      if (!uploadedPath) return;

      extraInput.value = uploadedPath;
      setStatus(adminGalleryStatus, `Доп. фото загружено: ${uploadedPath}`);
    });

    removeExtraBtn.addEventListener('click', () => {
      extraRow.remove();
    });

    extraList.appendChild(extraRow);
  }

  extraImages.forEach((img) => appendExtraImageRow(img));
  addExtraBtn.addEventListener('click', () => appendExtraImageRow(''));

  imageInput.addEventListener('input', () => {
    preview.src = imageInput.value.trim();
  });

  imageUploadBtn.addEventListener('click', async () => {
    hideStatus(adminGalleryStatus);
    const uploadedPath = await uploadSelectedFile(imageFileInput.files && imageFileInput.files[0], adminGalleryStatus);
    if (!uploadedPath) return;

    imageInput.value = uploadedPath;
    preview.src = uploadedPath;
    setStatus(adminGalleryStatus, `Фото карточки загружено: ${uploadedPath}`);
  });

  row.addEventListener('dragstart', (event) => {
    draggedGalleryItem = row;
    row.classList.add('is-dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', 'gallery-item');
    }
  });

  row.addEventListener('dragend', () => {
    row.classList.remove('is-dragging');
    draggedGalleryItem = null;
    clearGalleryDropMarkers();
  });

  row.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (!draggedGalleryItem || draggedGalleryItem === row) return;

    const rect = row.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;
    row.classList.toggle('drop-before', before);
    row.classList.toggle('drop-after', !before);
  });

  row.addEventListener('dragleave', () => {
    row.classList.remove('drop-before', 'drop-after');
  });

  row.addEventListener('drop', (event) => {
    event.preventDefault();
    if (!draggedGalleryItem || draggedGalleryItem === row) return;

    const rect = row.getBoundingClientRect();
    const before = event.clientY < rect.top + rect.height / 2;

    if (before) {
      adminGalleryList.insertBefore(draggedGalleryItem, row);
    } else {
      adminGalleryList.insertBefore(draggedGalleryItem, row.nextSibling);
    }

    clearGalleryDropMarkers();
  });

  upBtn.addEventListener('click', () => {
    const prev = row.previousElementSibling;
    if (prev) {
      adminGalleryList.insertBefore(row, prev);
    }
  });

  downBtn.addEventListener('click', () => {
    const next = row.nextElementSibling;
    if (next) {
      adminGalleryList.insertBefore(next, row);
    }
  });

  removeBtn.addEventListener('click', () => {
    row.remove();
  });

  adminGalleryList.appendChild(row);
  return row;
}

function clearGalleryDropMarkers() {
  if (!adminGalleryList) return;
  adminGalleryList.querySelectorAll('.admin-gallery-item').forEach((item) => {
    item.classList.remove('drop-before', 'drop-after');
  });
}

function renderGalleryEditor() {
  if (!adminGalleryList) return;
  adminGalleryList.innerHTML = '';

  if (!currentGalleryItems.length) {
    createGalleryRow();
    return;
  }

  currentGalleryItems.forEach((item) => createGalleryRow(item));
}

function collectGalleryItems() {
  if (!adminGalleryList) return [];

  const rows = Array.from(adminGalleryList.querySelectorAll('.admin-gallery-item'));
  return rows
    .map((row) => {
      const image = row.querySelector('.gallery-image')?.value.trim() || '';
      const extraImages = Array.from(row.querySelectorAll('.gallery-extra-image'))
        .map((input) => input.value.trim())
        .filter((value) => !!value);
      const images = [image, ...extraImages].filter((value) => !!value);

      return {
        image,
        images,
        alt: row.querySelector('.gallery-alt')?.value || '',
        title: row.querySelector('.gallery-title')?.value || '',
        description: row.querySelector('.gallery-description')?.value || ''
      };
    })
    .filter((item) => item.image);
}

async function adminFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}), 'x-admin-token': token };
  return fetch(url, { ...options, headers });
}

async function loadConfig() {
  hideStatus(configStatus);
  hideStatus(visualStatus);
  hideStatus(adminGalleryStatus);

  const res = await adminFetch('/api/admin/config');
  const json = await res.json();

  if (!res.ok || !json.ok) {
    throw new Error((json && json.error) || 'Error loading config');
  }

  commentsEnabled.checked = !!json.config.commentsEnabled;
  currentOverrides = Array.isArray(json.config.overrides) ? [...json.config.overrides] : [];
  currentGalleryItems = Array.isArray(json.config.galleryItems) ? [...json.config.galleryItems] : [];
  renderGalleryEditor();
}

async function login() {
  hideStatus(loginStatus);

  const password = passwordInput.value;
  if (!password) {
    setStatus(loginStatus, 'Введите пароль', true);
    return;
  }

  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  const json = await res.json();

  if (!res.ok || !json.ok || !json.token) {
    setStatus(loginStatus, (json && json.error) || 'Ошибка входа', true);
    return;
  }

  localStorage.setItem(tokenKey, json.token);
  passwordInput.value = '';
  loginCard.hidden = true;
  panel.hidden = false;
  activateTab('editor');
  await loadConfig();
  loadVisualPage();
}

async function saveConfig() {
  hideStatus(configStatus);

  const res = await adminFetch('/api/admin/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commentsEnabled: commentsEnabled.checked })
  });
  const json = await res.json();

  if (!res.ok || !json.ok) {
    setStatus(configStatus, (json && json.error) || 'Не удалось сохранить', true);
    return;
  }

  setStatus(configStatus, 'Настройки сохранены');
}

async function saveOverrides(statusElement = visualStatus) {
  hideStatus(statusElement);

  const overrides = currentOverrides.filter((item) => item && item.selector);
  const res = await adminFetch('/api/admin/overrides', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides })
  });
  const json = await res.json();

  if (!res.ok || !json.ok) {
    setStatus(statusElement, (json && json.error) || 'Не удалось сохранить изменения', true);
    return false;
  }

  setStatus(statusElement, `Сохранено изменений: ${overrides.length}`);
  return true;
}

async function uploadImage() {
  hideStatus(uploadStatus);

  const uploadedPath = await uploadSelectedFile(uploadInput.files && uploadInput.files[0], uploadStatus);
  if (!uploadedPath) {
    return;
  }

  setStatus(uploadStatus, `Загружено: ${uploadedPath}`);
  if (uploadedImagePathInput) {
    uploadedImagePathInput.value = uploadedPath;
  }
}

async function saveGalleryItems() {
  hideStatus(adminGalleryStatus);

  const galleryItems = collectGalleryItems();
  const res = await adminFetch('/api/admin/gallery', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ galleryItems })
  });
  const json = await res.json();

  if (!res.ok || !json.ok) {
    setStatus(adminGalleryStatus, (json && json.error) || 'Не удалось сохранить галерею', true);
    return;
  }

  currentGalleryItems = Array.isArray(json.config && json.config.galleryItems)
    ? [...json.config.galleryItems]
    : galleryItems;
  renderGalleryEditor();
  setStatus(adminGalleryStatus, `Галерея сохранена: ${currentGalleryItems.length} фото`);
}

function buildUniqueSelector(element) {
  if (!element || !element.ownerDocument) return '';

  if (element.id) {
    return `#${element.id}`;
  }

  const parts = [];
  let current = element;

  while (current && current.nodeType === 1 && current.tagName.toLowerCase() !== 'html') {
    const tag = current.tagName.toLowerCase();
    const parent = current.parentElement;

    if (!parent) {
      parts.unshift(tag);
      break;
    }

    const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(current) + 1;
      parts.unshift(`${tag}:nth-of-type(${index})`);
    } else {
      parts.unshift(tag);
    }

    if (parent.tagName.toLowerCase() === 'body') {
      parts.unshift('body');
      break;
    }

    current = parent;
  }

  return parts.join(' > ');
}

function setVisualSelected(node) {
  if (!visualFrameDoc) return;

  if (visualSelectedNode) {
    visualSelectedNode.classList.remove('admin-visual-selected');
    if (visualSelectedInputHandler) {
      visualSelectedNode.removeEventListener('input', visualSelectedInputHandler);
    }
    visualSelectedNode.removeAttribute('contenteditable');
  }

  visualSelectedNode = node;
  visualSelectedNode.classList.add('admin-visual-selected');

  const selector = buildUniqueSelector(node);
  visualSelectedSelector.value = selector;

  if (node.tagName.toLowerCase() === 'img') {
    visualSelectedType.value = 'src';
    visualSelectedValue.value = node.getAttribute('src') || '';
    return;
  }

  if (visualSelectedType.value === 'src') {
    visualSelectedType.value = 'text';
  }

  visualSelectedNode.setAttribute('contenteditable', 'true');
  visualSelectedValue.value = visualSelectedNode.textContent || '';
  visualSelectedNode.focus();

  visualSelectedInputHandler = () => {
    if (visualSelectedType.value === 'text') {
      visualSelectedValue.value = visualSelectedNode.textContent || '';
    } else if (visualSelectedType.value === 'html') {
      visualSelectedValue.value = visualSelectedNode.innerHTML || '';
    }
  };

  visualSelectedNode.addEventListener('input', visualSelectedInputHandler);
}

function injectVisualStyles(doc) {
  const style = doc.createElement('style');
  style.textContent = `
    .admin-visual-selected {
      outline: 2px solid #E85C0D !important;
      outline-offset: 2px;
      background-color: rgba(232, 92, 13, 0.08) !important;
    }
  `;
  doc.head.appendChild(style);
}

function setupVisualFrame() {
  if (!visualFrame || !visualFrame.contentDocument) return;

  const doc = visualFrame.contentDocument;
  visualFrameDoc = doc;
  injectVisualStyles(doc);

  doc.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target.closest('h1, h2, h3, h4, h5, h6, p, span, li, a, button, label, strong, small, em, img');
    if (!target) return;

    setVisualSelected(target);
  }, true);
}

function loadVisualPage() {
  if (!visualFrame) return;

  const selectedPage = visualPageSelect.value || '/index.html';
  visualSelectedSelector.value = '';
  visualSelectedValue.value = '';
  hideStatus(visualStatus);

  visualFrame.src = selectedPage;
}

async function saveSelectedVisualElement() {
  hideStatus(visualStatus);

  if (!visualSelectedNode || !visualFrameDoc) {
    setStatus(visualStatus, 'Сначала кликните по элементу на странице', true);
    return;
  }

  const selector = visualSelectedSelector.value.trim();
  const type = visualSelectedType.value;
  let value = visualSelectedValue.value;

  if (type === 'src') {
    visualSelectedNode.setAttribute('src', value);
  } else if (type === 'html') {
    visualSelectedNode.innerHTML = value;
  } else {
    if (visualSelectedNode.textContent !== value) {
      visualSelectedNode.textContent = value;
    }
    value = visualSelectedNode.textContent || '';
  }

  upsertOverride(selector, type, value);
  const saved = await saveOverrides(visualStatus);
  if (saved) {
    setStatus(visualStatus, 'Изменение применено и сохранено');
  }
}

function scheduleAutosaveFromPanel() {
  if (!visualAutosaveEnabled || !visualAutosaveEnabled.checked) {
    return;
  }
  if (!visualSelectedNode || !visualSelectedSelector.value.trim()) {
    return;
  }

  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
  }

  autosaveTimer = window.setTimeout(() => {
    saveSelectedVisualElement();
  }, 700);
}

function insertUploadedPathIntoSelected() {
  if (!uploadedImagePathInput || !uploadedImagePathInput.value.trim()) {
    setStatus(uploadStatus, 'Сначала загрузите фото, чтобы получить путь', true);
    return;
  }

  visualSelectedType.value = 'src';
  visualSelectedValue.value = uploadedImagePathInput.value.trim();
  scheduleAutosaveFromPanel();
}

if (visualFrame) {
  visualFrame.addEventListener('load', setupVisualFrame);
}

tabButtons.forEach((button) => {
  button.addEventListener('click', () => activateTab(button.dataset.tab));
});

loginBtn.addEventListener('click', login);
saveConfigBtn.addEventListener('click', saveConfig);
uploadBtn.addEventListener('click', uploadImage);
if (visualLoadBtn) {
  visualLoadBtn.addEventListener('click', loadVisualPage);
}
if (visualSaveSelectedBtn) {
  visualSaveSelectedBtn.addEventListener('click', saveSelectedVisualElement);
}
if (insertUploadedImageBtn) {
  insertUploadedImageBtn.addEventListener('click', insertUploadedPathIntoSelected);
}
if (adminGalleryAddBtn) {
  adminGalleryAddBtn.addEventListener('click', () => createGalleryRow());
}
if (adminGallerySaveBtn) {
  adminGallerySaveBtn.addEventListener('click', saveGalleryItems);
}
if (visualSelectedType) {
  visualSelectedType.addEventListener('change', () => {
    if (!visualSelectedNode) return;

    if (visualSelectedType.value === 'src') {
      visualSelectedValue.value = visualSelectedNode.getAttribute('src') || '';
    } else if (visualSelectedType.value === 'html') {
      visualSelectedValue.value = visualSelectedNode.innerHTML || '';
    } else {
      visualSelectedValue.value = visualSelectedNode.textContent || '';
    }

    scheduleAutosaveFromPanel();
  });
}
if (visualSelectedValue) {
  visualSelectedValue.addEventListener('input', scheduleAutosaveFromPanel);
}

document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();

    const editorPanel = document.querySelector('[data-panel="editor"]');

    if (!panel.hidden && editorPanel && !editorPanel.hidden) {
      saveSelectedVisualElement();
    }
  }
});

(async function bootstrap() {
  if (!getToken()) return;

  try {
    loginCard.hidden = true;
    panel.hidden = false;
    activateTab('editor');
    await loadConfig();
    loadVisualPage();
  } catch {
    localStorage.removeItem(tokenKey);
    loginCard.hidden = false;
    panel.hidden = true;
  }
})();
