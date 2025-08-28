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
import { renderMonthCalendar, renderWeekAgenda } from './calendar.js';
import { renderUpcoming } from './upcoming.js';
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

// DOM‑cache
const monthSelect = document.getElementById('month');
const weekInput = document.getElementById('week');
const titleInput = document.getElementById('title');
const categorySelect = document.getElementById('category');
const notesInput = document.getElementById('notes');
const chipsContainer = document.getElementById('chips');
const listContainer = document.getElementById('list');
const wheelSvg = document.getElementById('wheel');
const upcomingEl = document.getElementById('upcoming');
const calMonthEl = document.getElementById('calendarMonth');
const calWeekEl = document.getElementById('calendarWeek');

// ====== UI initialisering ======
function initSelects() {
  MONTHS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    monthSelect.appendChild(opt);
  });
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
  weekInput.value = '1';
}

function saveItem() {
  const month = monthSelect.value;
  const weekVal = parseInt(weekInput.value || '1', 10);
  const week = Math.max(1, Math.min(5, weekVal));
  const title = titleInput.value.trim();
  const cat = categorySelect.value;
  const note = notesInput.value.trim();
  if (!title) {
    alert('Skriv en aktivitetstitel');
    return;
  }
  if (editingId) {
    const idx = items.findIndex(x => x.id === editingId);
    if (idx > -1) {
      items[idx] = { ...items[idx], month, week, title, cat, note };
    }
    editingId = null;
  } else {
    const id = generateId();
    items.push({ id, month, week, title, cat, note });
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
  if (!btnShare || !btnShareClose || !btnSharePdf || !btnShareLink) return; // Share UI findes ikke her
  btnShare.addEventListener('click', openShareModal);
  btnShareClose.addEventListener('click', closeShareModal);
  btnSharePdf.addEventListener('click', () => {
    window.open('customer.html?print=1', '_blank');
    closeShareModal();
  });
  btnShareLink.addEventListener('click', () => {
    window.open('customer.html', '_blank');
    closeShareModal();
  });
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
    zc.appendChild(btnMinus);
    zc.appendChild(btnPlus);
    wrap.appendChild(zc);
    btnMinus.addEventListener('click', () => {
      zoomLevel = Math.max(0.6, Math.round((zoomLevel - 0.1) * 10) / 10);
      applyZoom();
    });
    btnPlus.addEventListener('click', () => {
      zoomLevel = Math.min(1.8, Math.round((zoomLevel + 0.1) * 10) / 10);
      applyZoom();
    });
  }
}
function applyZoom() {
  wheelSvg.style.transformOrigin = '50% 50%';
  wheelSvg.style.transform = `scale(${zoomLevel})`;
  settings.zoomLevel = zoomLevel;
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
      applyZoom();
    }
  }, { passive: false });
}

// ====== Render-funktion ======
function render() {
  // Filter
  const filtered = activeCategory === 'Alle' ? items : items.filter(x => x.cat === activeCategory);

  // Listen
  renderList(listContainer, filtered, {
    onEdit: item => {
      editingId = item.id;
      monthSelect.value = item.month;
      weekInput.value = item.week;
      titleInput.value = item.title;
      categorySelect.value = item.cat;
      notesInput.value = item.note || '';
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

  applyZoom();

  // Upcoming
  if (upcomingEl) {
    renderUpcoming(upcomingEl, filtered, {
      openMonth: monthName => {
        focusedMonth = monthName;
        openModal(monthName, items, notes, { onSaveNotes: handleSaveNotes });
        render();
      }
    });
  }

  // Calendar tabs
  const tabMonth = document.getElementById('tabMonth');
  const tabWeek = document.getElementById('tabWeek');
  if (tabMonth && tabWeek && calMonthEl && calWeekEl) {
    // active tab styling
    const setTab = which => {
      if (which === 'month') {
        tabMonth.classList.add('active');
        tabWeek.classList.remove('active');
        calMonthEl.style.display = '';
        calWeekEl.style.display = 'none';
      } else {
        tabWeek.classList.add('active');
        tabMonth.classList.remove('active');
        calWeekEl.style.display = '';
        calMonthEl.style.display = 'none';
      }
    };
    if (!tabMonth.onclick) tabMonth.onclick = () => setTab('month');
    if (!tabWeek.onclick) tabWeek.onclick = () => setTab('week');
    // Render month calendar for focused or first month
    const monthName = focusedMonth || MONTHS[0];
    renderMonthCalendar(calMonthEl, filtered, {
      monthName,
      onOpen: m => { focusedMonth = m; render(); },
      onEdit: item => {
        editingId = item.id;
        monthSelect.value = item.month;
        weekInput.value = item.week;
        titleInput.value = item.title;
        categorySelect.value = item.cat;
        notesInput.value = item.note || '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onCreate: (m, w) => {
        monthSelect.value = m;
        weekInput.value = String(w);
        titleInput.focus();
      }
    });
    // Render week agenda for focused month and selected week
    const weekNum = Number(weekInput.value || '1');
    renderWeekAgenda(calWeekEl, filtered, {
      monthName,
      week: Math.max(1, Math.min(5, weekNum)),
      onEdit: item => {
        editingId = item.id;
        monthSelect.value = item.month;
        weekInput.value = item.week;
        titleInput.value = item.title;
        categorySelect.value = item.cat;
        notesInput.value = item.note || '';
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      onCreate: (m, w) => {
        monthSelect.value = m;
        weekInput.value = String(w);
        titleInput.focus();
      }
    });
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
  // setup UI
  initSelects();
  initChips();
  initFilterChips();
  setupShareModal();
  setupZoomControls();
  setupWheelScrollZoom();
  // knapper
  document.getElementById('btnSave').addEventListener('click', saveItem);
  document.getElementById('btnReset').addEventListener('click', resetForm);
  document.getElementById('btnJson').addEventListener('click', exportJson);
  document.getElementById('fileJson').addEventListener('change', e => {
    const f = e.target.files && e.target.files[0];
    if (f) importJson(f);
    e.target.value = '';
  });
  document.getElementById('btnCloseModal').addEventListener('click', () => {
    const modal = document.getElementById('monthModal');
    if (modal) modal.classList.remove('open');
  });
  // Render første gang
  render();
});
