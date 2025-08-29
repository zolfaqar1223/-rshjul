// dashboard.js
// Simple KPI dashboard using stored items/notes
import { MONTHS, readItems, readNotes, STATUSES, CATS } from './store.js';

function createTile(title, value, color) {
	const el = document.createElement('div');
	el.className = 'glass';
	el.style.padding = '16px';
	el.style.borderRadius = '14px';
	el.style.border = '1px solid rgba(255,255,255,0.12)';
	el.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.08))';
	el.style.boxShadow = '0 22px 48px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.08)';
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
	return el;
}

function renderKPIs(items, notes) {
	const grid = document.getElementById('kpiGrid');
	if (!grid) return;
	grid.innerHTML = '';
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

	grid.appendChild(createTile('Aktiviteter i alt', String(total), 'var(--text)'));
	grid.appendChild(createTile('Planlagt', String(byStatus['Planlagt'] || 0), '#6EE7B7'));
	grid.appendChild(createTile('Igangværende', String(byStatus['Igangværende'] || 0), '#A78BFA'));
	grid.appendChild(createTile('Afsluttet', String(byStatus['Afsluttet'] || 0), '#2C2C34'));
	grid.appendChild(createTile('Måneder dækket', String(monthsCovered), 'var(--text)'));
	grid.appendChild(createTile('Månedsnoter', String(notesCount), '#D4AF37'));
	grid.appendChild(createTile('Kommende aktiviteter', String(upcoming), '#60A5FA'));
	if (byCat) grid.appendChild(createTile('Største kategori', `${byCat.c} (${byCat.n})`, '#E4B7B2'));
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
});
