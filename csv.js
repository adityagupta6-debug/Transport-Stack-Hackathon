// Dependency-free CSV reader. Handles quoted commas, escaped quotes, LF/CRLF rows, and a UTF-8 BOM.
export function parseCSV(input) {
 const text = String(input ?? '').replace(/^\uFEFF/, '');
 const rows = [];
 let row = [], cell = '', quoted = false;

 for (let i = 0; i < text.length; i++) {
  const c = text[i], next = text[i + 1];

  if (c === '"' && quoted && next === '"') {
   cell += '"';
   i++;
  } else if (c === '"') {
   quoted = !quoted;
  } else if (c === ',' && !quoted) {
   row.push(cell);
   cell = '';
  } else if ((c === '\n' || c === '\r') && !quoted) {
   if (c === '\r' && next === '\n') i++;
   row.push(cell);
   if (row.some(value => value.trim() !== '')) rows.push(row);
   row = [];
   cell = '';
  } else {
   cell += c;
  }
 }

 if (quoted) throw new Error('CSV contains an unclosed quoted field.');
 row.push(cell);
 if (row.some(value => value.trim() !== '')) rows.push(row);
 if (rows.length < 2) return { headers: [], records: [] };

 const headers = rows[0].map(header => header.trim());
 if (headers.some(header => !header)) throw new Error('CSV contains an empty column name.');

 return {
  headers,
  records: rows.slice(1).map(values =>
   Object.fromEntries(headers.map((header, index) => [header, (values[index] ?? '').trim()]))
  )
 };
}

const normalizeKey = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
const pick = (record, aliases) => {
 const wanted = new Set(aliases.map(normalizeKey));
 const key = Object.keys(record).find(name => wanted.has(normalizeKey(name)));
 return key ? record[key] : '';
};

export function summarizeUploadedRows(records) {
 const routes = new Set();
 const dates = [];
 const hours = Array(24).fill(0);

 for (const record of records) {
  const route = pick(record, ['route', 'route_no', 'route_id', 'route_number']);
  if (route) routes.add(route);

  const rawDate = pick(record, ['timestamp', 'datetime', 'journey_time', 'ticket_time', 'time', 'date']);
  if (rawDate) {
   const date = new Date(rawDate);
   if (!Number.isNaN(date.getTime())) {
    hours[date.getHours()]++;
    dates.push(date);
   }
  }
 }

 const minDate = dates.length ? new Date(Math.min(...dates.map(date => date.getTime()))) : null;
 const maxDate = dates.length ? new Date(Math.max(...dates.map(date => date.getTime()))) : null;
 return {
  total: records.length,
  routeCount: routes.size,
  hours,
  min: minDate ? minDate.toLocaleDateString() : 'Not detected',
  max: maxDate ? maxDate.toLocaleDateString() : 'Not detected'
 };
}
