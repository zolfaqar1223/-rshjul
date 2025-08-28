// list.js
// Rendér aktivitetslisten. Modulet sorterer posterne og genererer
// DOM‑elementer ud fra en <template>. Event handlers kaldes via
// callback‑objektet, så listen forbliver ren og uafhængig.

import { sortItems } from './store.js';

/**
 * Render aktiviteter i en given container.
 * @param {HTMLElement} listEl Beholder hvor elementerne skal indsættes
 * @param {Array<Object>} items Liste over alle aktiviteter
 * @param {Object} callbacks Callback funktioner
 *   - onEdit(item)
 *   - onOpen(monthName)
 *   - onDelete(id)
 */
export function renderList(listEl, items, callbacks) {
  listEl.innerHTML = '';
  // find template
  const tpl = document.getElementById('itemTemplate');
  const sorted = sortItems(items);
  sorted.forEach(it => {
    const el = tpl.content.firstElementChild.cloneNode(true);
    el.classList.add('glass');
    el.dataset.id = it.id;
    el.querySelector('.title').textContent = it.title;
    el.querySelector('.meta').textContent = `${it.month} · Uge ${it.week} · ${it.cat}`;
    el.querySelector('.note').textContent = it.note || '';
    // Rediger
    el.querySelector('[data-act="edit"]').addEventListener('click', () => {
      callbacks.onEdit(it);
    });
    // Åbn måned
    el.querySelector('[data-act="open"]').addEventListener('click', () => {
      callbacks.onOpen(it.month);
    });
    // Slet
    el.querySelector('[data-act="del"]').addEventListener('click', () => {
      callbacks.onDelete(it.id);
    });
    // Drag & drop
    el.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', it.id);
    });
    listEl.appendChild(el);
  });
}
