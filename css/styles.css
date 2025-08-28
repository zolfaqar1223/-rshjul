// store.js
// Fælles data og persistens-funktioner for KMD Årshjul. Her defineres
// konstante værdier som måneder og kategorier samt hjælpefunktioner
// til at læse og skrive til browserens localStorage.

export const MONTHS = [
  'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'December'
];

export const CATS = [
  'Releasemøde',
  'Roadmapmøde',
  'Netværksmøde',
  'KTU',
  'Onboarding',
  'Rapportmøde',
  'Andet'
];

const ITEMS_KEY = 'aarshjul.admin.items';
const NOTES_KEY = 'aarshjul.admin.notes';

/**
 * Læs aktiviteter fra localStorage.
 * @returns {Array<Object>} Listen af aktiviteter
 */
export function readItems() {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Kunne ikke læse items fra localStorage', err);
    return [];
  }
}

/**
 * Gem aktiviteter til localStorage.
 * @param {Array<Object>} data
 */
export function writeItems(data) {
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Kunne ikke skrive items til localStorage', err);
  }
}

/**
 * Læs noter pr. måned fra localStorage.
 * @returns {Object}
 */
export function readNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Kunne ikke læse noter fra localStorage', err);
    return {};
  }
}

/**
 * Gem noter til localStorage.
 * @param {Object} notes
 */
export function writeNotes(notes) {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Kunne ikke skrive noter til localStorage', err);
  }
}

/**
 * Generer en unik ID til en aktivitet. Bruger native crypto.randomUUID
 * hvis tilgængelig, ellers falder tilbage til tidsstempel.
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString();
}

/**
 * Hjælpefunktion til at sortere aktiviteter efter måned, uge og titel.
 * @param {Array<Object>} items
 * @returns {Array<Object>} sorteret liste
 */
export function sortItems(items) {
  return [...items].sort((a, b) => {
    const ma = MONTHS.indexOf(a.month);
    const mb = MONTHS.indexOf(b.month);
    if (ma !== mb) return ma - mb;
    if (a.week !== b.week) return a.week - b.week;
    return a.title.localeCompare(b.title);
  });
}
