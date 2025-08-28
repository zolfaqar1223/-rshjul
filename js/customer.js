// Kundevisning: read-only rendering af hjul og liste
import { MONTHS, readItems, readNotes } from './store.js';
import { drawWheel } from './wheel.js';

const wheelSvg = document.getElementById('wheel');
const listContainer = document.getElementById('list');

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
  itemsToShow.forEach(it => {
    const el = document.createElement('div');
    el.className = 'item glass';
    const content = document.createElement('div');
    content.className = 'item-content';
    const title = document.createElement('strong');
    title.className = 'title';
    title.textContent = it.title;
    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${it.month} · Uge ${it.week} · ${it.cat}`;
    const note = document.createElement('div');
    note.className = 'note';
    note.textContent = it.note || '';
    content.appendChild(title);
    content.appendChild(meta);
    if (it.note) content.appendChild(note);
    el.appendChild(content);
    listEl.appendChild(el);
  });
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

  render(null);
  if (params.get('print') === '1') {
    setTimeout(() => window.print(), 400);
  }
});
