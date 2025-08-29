// dashboard.js
// Simple KPI dashboard using stored items/notes
import { MONTHS, readItems, readNotes, STATUSES, CATS } from './store.js';

function createTile(key, title, value, color) {
	const el = document.createElement('div');
	el.className = 'glass';
	el.style.padding = '16px';
	el.style.borderRadius = '14px';
	el.style.border = '1px solid rgba(255,255,255,0.12)';
	el.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))';
	el.style.boxShadow = '0 22px 48px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.08)';
	el.style.cursor = 'pointer';
	const h = document.createElement('div');
	h.style.fontSize = '12px';
	h.style.opacity = '0.9';
	h.textContent = title;
	const v = document.createElement('div');
	v.style.fontSize = '28px';
	v.style.fontWeight = '800';
	v.style.marginTop = '6px';
	v.style.color = color;
	v.textContent = value;
	el.appendChild(h);
	el.appendChild(v);
	el.dataset.key = key;
	return el;
}

function renderKPIs(items, notes) {
	const grid = document.getElementById('kpiGrid');
	const bar = document.getElementById('kpiBar');
	const container = bar || grid;
	if (!container) return;
	container.innerHTML = '';
	const total = items.length;
	const byStatus = STATUSES.reduce((acc, s) => (acc[s] = items.filter(i => (i.status || 'Planlagt') === s).length, acc), {});
	const monthsCovered = new Set(items.map(i => i.month)).size;
	const notesCount = Object.keys(notes || {}).filter(k => (notes[k] || '').trim().length > 0).length;
	const upcoming = (() => {
		const now = new Date();
		const curIdx = now.getMonth() * 4 + Math.floor((now.getDate() - 1) / 7);
		return items.filter(i => (MONTHS.indexOf(i.month) * 4 + (i.week - 1)) > curIdx).length;
	})();
	const byCat = CATS.map(c => ({ c, n: items.filter(i => i.cat === c).length }))
		.sort((a,b) => b.n - a.n)[0];

	// KPI set for single full-width row
	const config = [
		{ key: 'thisMonth', title: 'Aktiviteter denne måned', value: String(items.filter(i => i.month === MONTHS[new Date().getMonth()]).length), color: 'var(--text)' },
		{ key: 'upcoming', title: 'Kommende releases', value: String(upcoming), color: '#60A5FA' },
		{ key: 'noOwner', title: 'Aktiviteter uden ansvarlig', value: String(items.filter(i => !i.owner || String(i.owner).trim() === '').length), color: '#E4B7B2' },
		{ key: 'doneYear', title: 'Afsluttede aktiviteter i år', value: String(items.filter(i => (i.status || 'Planlagt') === 'Afsluttet').length), color: '#6EE7B7' }
	];
	config.forEach(k => container.appendChild(createTile(k.key, k.title, k.value, k.color)));
}

function renderInsights(items) {
	const el = document.getElementById('insights');
	if (!el) return;
	el.innerHTML = '';
	const tips = [];
	if (items.length === 0) tips.push('Ingen aktiviteter endnu. Start med at oprette de første i Årshjul.');
	const thisMonth = MONTHS[new Date().getMonth()];
	const countThisMonth = items.filter(i => i.month === thisMonth).length;
	if (countThisMonth === 0) tips.push(`Ingen aktiviteter for ${thisMonth}. Overvej at planlægge mindst én.`);
	const overdue = (() => {
		const now = new Date();
		const curIdx = now.getMonth() * 4 + Math.floor((now.getDate() - 1) / 7);
		return items.filter(i => (MONTHS.indexOf(i.month) * 4 + (i.week - 1)) < curIdx && (i.status || 'Planlagt') !== 'Afsluttet').length;
	})();
	if (overdue > 0) tips.push(`${overdue} planlagte aktiviteter ligger før nu og er ikke afsluttet.`);
	if (!tips.length) tips.push('Alt ser godt ud! Fortsæt med jævnt flow af aktiviteter.');
	
	tips.forEach(t => {
		const d = document.createElement('div');
		d.className = 'item glass';
		d.textContent = t;
		el.appendChild(d);
	});
}

document.addEventListener('DOMContentLoaded', () => {
	const items = readItems();
	const notes = readNotes();
	renderKPIs(items, notes);
	renderInsights(items);

	// KPI click filtering of activity list
	const list = document.getElementById('dashList');
	const clearBtn = document.getElementById('clearDashFilter');
	function renderListFiltered(arr) {
		list.innerHTML = '';
		if (!arr.length) {
			const empty = document.createElement('div');
			empty.className = 'item glass';
			empty.textContent = 'Ingen aktiviteter matcher filteret';
			list.appendChild(empty);
			return;
		}
		arr.sort((a,b) => {
			const ma = MONTHS.indexOf(a.month), mb = MONTHS.indexOf(b.month);
			if (ma !== mb) return ma - mb;
			if (a.week !== b.week) return a.week - b.week;
			return a.title.localeCompare(b.title);
		}).forEach(it => {
			const el = document.createElement('div');
			el.className = 'item glass';
			el.innerHTML = `<div class="item-content"><strong>${it.title}</strong><div class="meta">${it.month} · Uge ${it.week} · ${it.cat} · ${(it.status||'Planlagt')}</div>${it.note ? `<div class="note">${it.note}</div>` : ''}</div>`;
			list.appendChild(el);
		});
	}

	function applyFilter(key) {
		switch (key) {
			case 'thisMonth':
				return renderListFiltered(items.filter(i => i.month === MONTHS[new Date().getMonth()]));
			case 'upcoming': {
				const now = new Date();
				const curIdx = now.getMonth() * 4 + Math.floor((now.getDate() - 1) / 7);
				return renderListFiltered(items.filter(i => (MONTHS.indexOf(i.month) * 4 + (i.week - 1)) > curIdx));
			}
			case 'noOwner':
				return renderListFiltered(items.filter(i => !i.owner || String(i.owner).trim() === ''));
			case 'doneYear':
				return renderListFiltered(items.filter(i => (i.status || 'Planlagt') === 'Afsluttet'));
			default:
				return renderListFiltered(items);
		}
	}

	(document.getElementById('kpiBar') || document.getElementById('kpiGrid'))?.addEventListener('click', (e) => {
		const tile = e.target.closest('.glass');
		if (!tile || !tile.dataset.key) return;
		applyFilter(tile.dataset.key);
	});
	if (clearBtn) clearBtn.addEventListener('click', () => renderListFiltered(items));
	// initial list: show all
	renderListFiltered(items);
});
