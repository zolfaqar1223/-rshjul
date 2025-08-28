// main.js
// Entry point for KMD Årshjul. Sætter DOM‑elementer op, læser data
// fra localStorage og orkestrerer samarbejdet mellem under-modulerne.

import {
  MONTHS,
  CATS,
  readItems,
  writeItems,
  readNotes,
  writeNotes,
  readSettings,
  writeSettings,
  generateId
} from './store.js';
import { renderList } from './list.js';
import { drawWheel } from './wheel.js';
import { openModal } from './modal.js';
import { showToast } from './toast.js';

// Applikationens mutable tilstand
let items = [];
let notes = {};
let editingId = null;

// View state
let focusedMonth = null;
let activeCategory = 'Alle';
let zoomLevel = 1;
let settings = {};
// Pan state for wheel
let panX = 0;
let panY = 0;
let isPanMode = false;
let isPanning = false;
let lastMouseX = 0;
let lastMouseY = 0;

// DOM‑cache
const dateInput = document.getElementById('date');
const titleInput = document.getElementById('title');
const categorySelect = document.getElementById('category');
const notesInput = document.getElementById('notes');
const filesInput = document.getElementById('files');
const chipsContainer = document.getElementById('chips');
const listContainer = document.getElementById('list');
const wheelSvg = document.getElementById('wheel');

// ====== UI initialisering ======
function initSelects() {
  // Måned-felt fjernet – dato er nok
  CATS.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    categorySelect.appendChild(opt);
  });
}

function initChips() {
  CATS.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = cat;
    chip.dataset.t = cat;
    chip.dataset.c = cat;
    chip.addEventListener('click', () => {
      titleInput.value = chip.dataset.t;
      categorySelect.value = chip.dataset.c;
      titleInput.focus();
    });
    chipsContainer.appendChild(chip);
  });
}

// Filter chips for kategori
function initFilterChips() {
  const wrap = document.getElementById('filterChips');
  if (!wrap) return; // Mangler i DOM – skip uden at fejle
  wrap.innerHTML = '';
  const cats = ['Alle', ...CATS];
  cats.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = 'chip glow';
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      activeCategory = cat;
      settings.activeCategory = activeCategory;
      writeSettings(settings);
      updateFilterActive();
      render();
    });
    wrap.appendChild(chip);
  });
  updateFilterActive();
}
// Listefiltre i aktivitetssektionen
function initListFilters() {
  const wrap = document.getElementById('listFilters');
  if (!wrap) return;
  wrap.innerHTML = '';
  const cats = ['Alle', ...CATS];
  cats.forEach(cat => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = cat;
    chip.addEventListener('click', () => {
      activeCategory = cat;
      settings.activeCategory = activeCategory;
      writeSettings(settings);
      updateFilterActive();
      render();
    });
    wrap.appendChild(chip);
  });
}

function updateFilterActive() {
  const wrap = document.getElementById('filterChips');
  if (!wrap) return; // Ingen filterchips i denne visning
  const chips = [...wrap.querySelectorAll('.chip.glow')];
  chips.forEach(c => {
    if (c.textContent === activeCategory) c.classList.add('active');
    else c.classList.remove('active');
  });
}

function resetForm() {
  editingId = null;
  titleInput.value = '';
  notesInput.value = '';
  if (dateInput) dateInput.value = '';
}

function saveItem() {
  // Udled måned/uge ud fra valgt dato eller brug dags dato
  const baseDate = (dateInput && dateInput.value) ? new Date(dateInput.value) : new Date();
  const month = MONTHS[baseDate.getMonth()];
  const day = baseDate.getDate();
  const week = Math.max(1, Math.min(5, Math.ceil(day / 7)));
  const title = titleInput.value.trim();
  const cat = categorySelect.value;
  const note = notesInput.value.trim();
  const savedDateIso = baseDate.toISOString();
  // attachments: read files as base64 array (name + data)
  let attachments = [];
  if (filesInput && filesInput.files && filesInput.files.length > 0) {
    const fileList = Array.from(filesInput.files);
    attachments = fileList.map(f => ({ name: f.name }));
  }
  if (!title) {
    alert('Skriv en aktivitetstitel');
    return;
  }
  if (editingId) {
    const idx = items.findIndex(x => x.id === editingId);
    if (idx > -1) {
      items[idx] = { ...items[idx], month, week, title, cat, note, date: savedDateIso, attachments };
    }
    editingId = null;
  } else {
    const id = generateId();
    items.push({ id, month, week, title, cat, note, date: savedDateIso, attachments });
  }
  writeItems(items);
  resetForm();
  render();
  showToast('Aktivitet gemt', 'success');
}

function deleteItem(id) {
  items = items.filter(x => x.id !== id);
  writeItems(items);
  render();
  showToast('Aktivitet slettet', 'success');
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (Array.isArray(data)) {
        items = data;
        writeItems(items);
        render();
      } else {
        alert('Ugyldig JSON-fil');
      }
    } catch (err) {
      alert('Kunne ikke læse JSON');
    }
  };
  reader.readAsText(file);
}

function exportJson() {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'årshjul.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Eksporterede til JSON', 'success');
}

function handleSaveNotes(monthName, text) {
  notes[monthName] = text;
  writeNotes(notes);
}

// ====== Del kunde-version modal ======
function openShareModal() {
  const m = document.getElementById('shareModal');
  m.style.display = 'flex';
}
function closeShareModal() {
  const m = document.getElementById('shareModal');
  m.style.display = 'none';
}
function setupShareModal() {
  const btnShare = document.getElementById('btnShare');
  const btnShareClose = document.getElementById('btnShareClose');
  const btnSharePdf = document.getElementById('btnSharePdf');
  const btnShareLink = document.getElementById('btnShareLink');
  const btnShareCopy = document.getElementById('btnShareCopy');
  if (!btnShare || !btnShareClose || !btnSharePdf || !btnShareLink) return; // Share UI findes ikke her
  btnShare.addEventListener('click', openShareModal);
  btnShareClose.addEventListener('click', closeShareModal);
  btnSharePdf.addEventListener('click', () => {
    const data = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ items, notes })))));
    window.open(`customer.html?data=${data}&print=1`, '_blank');
    closeShareModal();
  });
  btnShareLink.addEventListener('click', () => {
    const data = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ items, notes })))));
    window.open(`customer.html?data=${data}`, '_blank');
    closeShareModal();
  });
  if (btnShareCopy) {
    btnShareCopy.addEventListener('click', async () => {
      const data = encodeURIComponent(btoa(unescape(encodeURIComponent(JSON.stringify({ items, notes })))));
      const url = new URL(location.origin + location.pathname.replace('index.html','') + 'customer.html');
      url.searchParams.set('data', data);
      try {
        await navigator.clipboard.writeText(url.toString());
        showToast('Link kopieret', 'success');
      } catch (e) {
        showToast('Kunne ikke kopiere link', 'error');
      }
    });
  }
}

// ====== Zoom controls ======
function setupZoomControls() {
  const wrap = document.querySelector('.wheel-wrap');
  let zc = wrap.querySelector('.zoom-controls');
  if (!zc) {
    zc = document.createElement('div');
    zc.className = 'zoom-controls';
    const btnMinus = document.createElement('button');
    btnMinus.textContent = '−';
    const btnPlus = document.createElement('button');
    btnPlus.textContent = '+';
    const btnPan = document.createElement('button');
    btnPan.textContent = 'Pan';
    zc.appendChild(btnMinus);
    zc.appendChild(btnPlus);
    zc.appendChild(btnPan);
    wrap.appendChild(zc);
    btnMinus.addEventListener('click', () => {
      zoomLevel = Math.max(0.6, Math.round((zoomLevel - 0.1) * 10) / 10);
      applyTransform();
    });
    btnPlus.addEventListener('click', () => {
      zoomLevel = Math.min(1.8, Math.round((zoomLevel + 0.1) * 10) / 10);
      applyTransform();
    });
    btnPan.addEventListener('click', () => {
      isPanMode = !isPanMode;
      wrap.style.cursor = isPanMode ? 'grab' : '';
    });
    wrap.addEventListener('mousedown', e => {
      if (!isPanMode) return;
      isPanning = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      wrap.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', e => {
      if (!isPanning) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      panX += dx;
      panY += dy;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      applyTransform();
    });
    window.addEventListener('mouseup', () => {
      if (!isPanning) return;
      isPanning = false;
      wrap.style.cursor = isPanMode ? 'grab' : '';
      applyTransform();
    });
  }
}
function applyTransform() {
  wheelSvg.style.transformOrigin = '50% 50%';
  wheelSvg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
  settings.zoomLevel = zoomLevel;
  settings.panX = panX;
  settings.panY = panY;
  writeSettings(settings);
}

// Ctrl+Scroll zoom
function setupWheelScrollZoom() {
  const container = document.querySelector('.wheel-wrap');
  if (!container) return;
  container.addEventListener('wheel', e => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      zoomLevel = Math.max(0.6, Math.min(1.8, Math.round((zoomLevel + delta) * 10) / 10));
      applyTransform();
    }
  }, { passive: false });
}

// Animated collapse helper
function setActivitiesExpanded(expanded) {
  const wrap = document.getElementById('activitiesBody');
  const btn = document.getElementById('activitiesToggle');
  if (!wrap || !btn) return;
  btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  const label = btn.querySelector('.label');
  if (label) label.textContent = expanded ? 'Skjul' : 'Vis';
  // Measure content height for smooth animation
  if (expanded) {
    wrap.style.display = '';
    const h = wrap.scrollHeight;
    wrap.style.maxHeight = h + 'px';
    setTimeout(() => { wrap.style.maxHeight = ''; }, 230);
  } else {
    const h = wrap.scrollHeight;
    wrap.style.maxHeight = h + 'px';
    // force reflow
    void wrap.offsetHeight;
    wrap.style.maxHeight = '0px';
    setTimeout(() => { wrap.style.display = 'none'; }, 230);
  }
  settings.activitiesExpanded = expanded;
  writeSettings(settings);
}

// ====== Render-funktion ======
function render() {
  // Filter
  const filtered = activeCategory === 'Alle' ? items : items.filter(x => x.cat === activeCategory);

  // Listen
  renderList(listContainer, filtered, {
    onEdit: item => {
      editingId = item.id;
      titleInput.value = item.title;
      categorySelect.value = item.cat;
      notesInput.value = item.note || '';
      if (dateInput) dateInput.value = '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onOpen: monthName => {
      focusedMonth = monthName;
      openModal(monthName, items, notes, { onSaveNotes: handleSaveNotes });
      // Fokus bevares i wheel via options
      render();
    },
    onDelete: id => {
      deleteItem(id);
    }
  });

  // Hjulet
  drawWheel(wheelSvg, filtered, {
    openMonth: monthName => {
      focusedMonth = monthName;
      openModal(monthName, items, notes, { onSaveNotes: handleSaveNotes });
      render();
    },
    openWeek: (monthName, week) => {
      focusedMonth = monthName;
      openModal(monthName, items, notes, { onSaveNotes: handleSaveNotes }, { week });
      render();
    },
    moveItemToMonth: (id, monthName) => {
      const idx = items.findIndex(x => x.id === id);
      if (idx > -1) {
        items[idx].month = monthName;
        items[idx].week = Math.max(1, Math.min(5, items[idx].week));
        writeItems(items);
        render();
      }
    },
    moveItemToMonthWeek: (id, monthName, week) => {
      const idx = items.findIndex(x => x.id === id);
      if (idx > -1) {
        items[idx].month = monthName;
        items[idx].week = Math.max(1, Math.min(5, week));
        writeItems(items);
        render();
      }
    }
  }, { focusedMonth });

  applyTransform();

  // Collapsible activities with animation
  const aToggle = document.getElementById('activitiesToggle');
  const body = document.getElementById('activitiesBody');
  if (aToggle && body && !aToggle.dataset.bound) {
    aToggle.dataset.bound = '1';
    aToggle.addEventListener('click', () => {
      const expanded = aToggle.getAttribute('aria-expanded') !== 'false';
      setActivitiesExpanded(!expanded);
    });
    // initial state
    const expandedInit = settings.activitiesExpanded !== false;
    setActivitiesExpanded(expandedInit);
  }
}

// ====== Initialiser hele appen ======
document.addEventListener('DOMContentLoaded', () => {
  // hent data
  items = readItems();
  notes = readNotes();
  settings = readSettings();
  if (settings.activeCategory) activeCategory = settings.activeCategory;
  if (settings.zoomLevel) zoomLevel = settings.zoomLevel;
  if (typeof settings.panX === 'number') panX = settings.panX;
  if (typeof settings.panY === 'number') panY = settings.panY;
  if (typeof settings.activitiesExpanded === 'undefined') settings.activitiesExpanded = true;
  // setup UI
  initSelects();
  initChips();
  initFilterChips();
  initListFilters();
  setupShareModal();
  setupZoomControls();
  setupWheelScrollZoom();
  // knapper
  document.getElementById('btnSave').addEventListener('click', saveItem);
  document.getElementById('btnReset').addEventListener('click', resetForm);
  document.getElementById('btnCloseModal').addEventListener('click', () => {
    const modal = document.getElementById('monthModal');
    if (modal) modal.classList.remove('open');
  });
  // Render første gang
  render();
});
