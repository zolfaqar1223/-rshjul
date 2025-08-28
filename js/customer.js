// Kundevisning: read-only rendering af hjul og liste
import { MONTHS, readItems, readNotes } from './store.js';
import { drawWheel } from './wheel.js';

const wheelSvg = document.getElementById('wheel');
const listContainer = document.getElementById('list');
const viewerModal = document.getElementById('viewerModal');
const viewerTitle = document.getElementById('viewerTitle');
const viewerMeta = document.getElementById('viewerMeta');
const viewerNote = document.getElementById('viewerNote');

let items = [];
let notes = {};

function renderListReadOnly(listEl, itemsToShow) {
  listEl.innerHTML = '';
  if (itemsToShow.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'item glass';
    empty.textContent = 'Ingen aktiviteter';
    listEl.appendChild(empty);
    return;
  }
  // sort by month then week then title
  const ordered = [...itemsToShow].sort((a,b) => {
    const ma = MONTHS.indexOf(a.month);
    const mb = MONTHS.indexOf(b.month);
    if (ma !== mb) return ma - mb;
    if (a.week !== b.week) return a.week - b.week;
    return a.title.localeCompare(b.title);
  });
  let currentMonth = null;
  ordered.forEach(it => {
    if (it.month !== currentMonth) {
      currentMonth = it.month;
      const m = document.createElement('div');
      m.className = 'group-title';
      m.textContent = currentMonth;
      listEl.appendChild(m);
    }
    const el = document.createElement('div');
    el.className = 'item glass';
    const content = document.createElement('div');
    content.className = 'item-content';
    const title = document.createElement('strong');
    title.className = 'title';
    title.textContent = it.title;
    const meta = document.createElement('div');
    meta.className = 'meta';
    const badge = `<span class="chip" style="background:#0f2f2a;border-color:var(--muted);margin-right:6px;">${it.cat}</span>`;
    meta.innerHTML = `${badge}${it.month} · Uge ${it.week}`;
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = it.note || '';
    content.appendChild(title);
    content.appendChild(meta);
    if (it.note) content.appendChild(note);
    el.appendChild(content);
    el.style.cursor = 'pointer';
    el.addEventListener('click', () => openViewer(it));
    listEl.appendChild(el);
  });
}

function openViewer(item) {
  if (!viewerModal) return;
  viewerTitle.textContent = item.title;
  viewerMeta.textContent = `${item.month} · Uge ${item.week} · ${item.cat}`;
  viewerNote.textContent = item.note || '';
  viewerModal.classList.add('open');
}

function closeViewer() {
  if (!viewerModal) return;
  viewerModal.classList.remove('open');
}

function render(focusedMonth = null) {
  const callbacks = {
    openMonth: monthName => {
      render(monthName);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    moveItemToMonth: () => {},
    moveItemToMonthWeek: () => {}
  };
  drawWheel(wheelSvg, items, callbacks, { focusedMonth });
  const listItems = focusedMonth ? items.filter(x => x.month === focusedMonth) : items;
  renderListReadOnly(listContainer, listItems);
  // Collapsible activities (customer view)
  const aToggle = document.getElementById('activitiesToggle');
  const listEl = document.getElementById('list');
  if (aToggle && listEl && !aToggle.dataset.bound) {
    aToggle.dataset.bound = '1';
    aToggle.addEventListener('click', () => {
      listEl.style.display = listEl.style.display === 'none' ? '' : 'none';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const dataParam = params.get('data');
  if (dataParam) {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(dataParam)))));
      if (Array.isArray(decoded.items)) items = decoded.items;
      if (decoded.notes && typeof decoded.notes === 'object') notes = decoded.notes;
    } catch (e) {
      items = readItems();
      notes = readNotes();
    }
  } else {
    items = readItems();
    notes = readNotes();
  }

  document.getElementById('btnPrintCustomer').addEventListener('click', () => {
    window.print();
  });
  const vc = document.getElementById('viewerClose');
  if (vc) vc.addEventListener('click', closeViewer);
  if (viewerModal) {
    viewerModal.addEventListener('click', (e) => {
      if (e.target === viewerModal) closeViewer();
    });
  }

  render(null);
  if (params.get('print') === '1') {
    setTimeout(() => window.print(), 400);
  }
});
