// dashboard.js
// Simple KPI dashboard using stored items/notes
import { MONTHS, readItems, readNotes, STATUSES, CATS, readChangeLog } from './store.js';

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

	// Charts
	renderStatusDonut(items);
	renderCategoryBars(items);

	// Risks and resources
	renderRisks(items);
	renderResources(items);

	// Changelog
	renderChangeLog();
});

// ===== Charts =====
function renderStatusDonut(items) {
	const svg = document.getElementById('statusDonut');
	if (!svg) return;
	svg.innerHTML = '';
	const size = 160, cx = 80, cy = 80, r = 54, stroke = 16;
	const map = STATUSES.map(s => ({ s, n: items.filter(i => (i.status || 'Planlagt') === s).length }));
	const total = map.reduce((a,b) => a + b.n, 0) || 1;
	let start = -Math.PI/2;
	const colors = ['#6EE7B7', '#A78BFA', '#2C2C34'];
	map.forEach((seg, idx) => {
		const angle = (seg.n/total) * 2*Math.PI;
		const end = start + angle;
		const x1 = cx + r * Math.cos(start);
		const y1 = cy + r * Math.sin(start);
		const x2 = cx + r * Math.cos(end);
		const y2 = cy + r * Math.sin(end);
		const large = angle > Math.PI ? 1 : 0;
		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`);
		path.setAttribute('stroke', colors[idx % colors.length]);
		path.setAttribute('stroke-width', String(stroke));
		path.setAttribute('fill', 'none');
		path.setAttribute('opacity', '0.9');
		svg.appendChild(path);
		start = end;
	});
}

function renderCategoryBars(items) {
	const svg = document.getElementById('categoryBars');
	if (!svg) return;
	svg.innerHTML = '';
	const counts = CATS.map(c => ({ c, n: items.filter(i => i.cat === c).length }));
	const max = Math.max(1, ...counts.map(x => x.n));
	const w = 320, h = 160, pad = 18;
	counts.forEach((row, i) => {
		const barW = ((w - pad*2) * (row.n / max));
		const y = pad + i * ((h - pad*2) / counts.length) + 6;
		const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		bg.setAttribute('x', String(pad));
		bg.setAttribute('y', String(y));
		bg.setAttribute('width', String(w - pad*2));
		bg.setAttribute('height', '10');
		bg.setAttribute('rx', '5');
		bg.setAttribute('fill', 'rgba(255,255,255,0.08)');
		svg.appendChild(bg);
		const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		rect.setAttribute('x', String(pad));
		rect.setAttribute('y', String(y));
		rect.setAttribute('width', String(barW));
		rect.setAttribute('height', '10');
		rect.setAttribute('rx', '5');
		rect.setAttribute('fill', 'var(--accent)');
		svg.appendChild(rect);
		const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		label.setAttribute('x', String(pad));
		label.setAttribute('y', String(y - 4));
		label.setAttribute('fill', '#E6E6EB');
		label.setAttribute('font-size', '10');
		label.textContent = `${row.c} (${row.n})`;
		svg.appendChild(label);
	});
}

// ===== Risks & Resources =====
function renderRisks(items) {
	const el = document.getElementById('risks');
	if (!el) return;
	el.innerHTML = '';
	// risiko: mange aktiviteter i samme uge eller mangler ansvarlig
	const grouped = {};
	items.forEach(i => {
		const key = `${i.month}-${i.week}`;
		grouped[key] = grouped[key] || [];
		grouped[key].push(i);
	});
	const risks = [];
	Object.keys(grouped).forEach(k => {
		const arr = grouped[k];
		if (arr.length >= 3) risks.push({ t: `Høj belastning: ${k}`, d: `${arr.length} aktiviteter i samme uge`, link: arr[0] });
	});
	items.filter(i => !i.owner || String(i.owner).trim() === '').forEach(i => {
		risks.push({ t: 'Mangler ansvarlig', d: `${i.title} (${i.month} · uge ${i.week})`, link: i });
	});
	if (!risks.length) {
		const ok = document.createElement('div'); ok.className = 'item glass'; ok.textContent = 'Ingen risici fundet'; el.appendChild(ok); return;
	}
	risks.forEach(r => {
		const d = document.createElement('div');
		d.className = 'item glass';
		d.innerHTML = `<div class="item-content"><strong>${r.t}</strong><div class="meta">${r.d}</div></div>`;
		d.style.cursor = 'pointer';
		d.addEventListener('click', () => window.location.href = 'index.html');
		el.appendChild(d);
	});
}

function renderResources(items) {
	const el = document.getElementById('resources');
	if (!el) return;
	el.innerHTML = '';
	const map = {};
	items.forEach(i => {
		const o = (i.owner || 'Ukendt').trim() || 'Ukendt';
		map[o] = (map[o] || 0) + 1;
	});
	const rows = Object.keys(map).map(o => ({ o, n: map[o] })).sort((a,b) => b.n - a.n);
	rows.forEach(r => {
		const d = document.createElement('div');
		d.className = 'item glass';
		d.innerHTML = `<div class="item-content"><strong>${r.o}</strong><div class="meta">${r.n} aktiviteter</div></div>`;
		el.appendChild(d);
	});
}

function renderChangeLog() {
	const el = document.getElementById('changelog');
	if (!el) return;
	el.innerHTML = '';
	const entries = readChangeLog(10);
	if (!entries.length) {
		const d = document.createElement('div'); d.className = 'item glass'; d.textContent = 'Ingen nylige ændringer'; el.appendChild(d); return;
	}
	entries.forEach(e => {
		const d = document.createElement('div');
		d.className = 'item glass';
		const dt = new Date(e.t).toLocaleString('da-DK');
		d.innerHTML = `<div class="item-content"><strong>${e.m}</strong><div class="meta">${dt}</div></div>`;
		el.appendChild(d);
	});
}
