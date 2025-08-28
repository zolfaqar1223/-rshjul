// list.js
// Rendér aktivitetslisten. Modulet sorterer posterne og genererer
// DOM‑elementer ud fra en <template>. Event handlers kaldes via
// callback‑objektet, så listen forbliver ren og uafhængig.

import { sortItems, CAT_COLORS } from './store.js';

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
    // Sikr at glass-stil altid tilføjes (også hvis template ikke er opdateret)
    el.classList.add('glass');
    el.dataset.id = it.id;
    el.querySelector('.title').textContent = it.title;
    const meta = el.querySelector('.meta');
    const badge = document.createElement('span');
    badge.className = 'chip';
    badge.textContent = it.cat;
    badge.style.marginRight = '10px';
    const color = CAT_COLORS[it.cat] || 'var(--accent)';
    badge.style.background = color;
    badge.style.borderColor = color;
    meta.innerHTML = '';
    meta.appendChild(badge);
    const dateStr = new Date().toLocaleDateString('da-DK');
    meta.append(`${it.month} · ${dateStr}`);
    el.querySelector('.note').textContent = it.note || '';
    // more breathing room between tag and meta
    el.querySelector('.item-content').style.display = 'grid';
    el.querySelector('.item-content').style.gridTemplateColumns = 'auto 1fr';
    el.querySelector('.item-content').style.gap = '10px 14px';
    // Rediger
    el.querySelector('[data-act="edit"]').addEventListener('click', () => {
      callbacks.onEdit(it);
    });
    // Åbn måned knap fjernet – edit åbner direkte
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
