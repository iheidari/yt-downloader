// Parses the table/column set a schema.sql file defines, so dbInit's
// drift assertion can be derived from schema.sql itself instead of a
// hand-maintained list that silently falls behind (0XC-129). Only presence
// is parsed — not types, defaults, or constraints.

const CREATE_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s*\(/gi;
const ALTER_ADD_COLUMN_RE =
  /ALTER\s+TABLE\s+"?(\w+)"?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?/gi;

// Table-level constraint lines start with one of these instead of a column
// name — e.g. `PRIMARY KEY (a, b)`, `UNIQUE (x)`, `FOREIGN KEY (...) REFERENCES …`.
const TABLE_CONSTRAINT_KEYWORDS = new Set([
  'primary',
  'unique',
  'check',
  'foreign',
  'constraint',
  'exclude',
  'like',
]);

function stripComments(sql) {
  return sql.replace(/--.*$/gm, '');
}

// Returns the substring between the '(' just consumed (at `openIndex`) and
// its matching close, honoring nested parens (e.g. `numeric(10,2)`) and
// single-quoted string literals (so a paren inside a DEFAULT string isn't
// counted).
function readBalancedParens(sql, openIndex) {
  let depth = 1;
  let inString = false;
  for (let i = openIndex; i < sql.length; i++) {
    const char = sql[i];
    if (inString) {
      if (char === "'") inString = false;
      continue;
    }
    if (char === "'") {
      inString = true;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
      if (depth === 0) return sql.slice(openIndex, i);
    }
  }
  throw new Error('schema.sql parser: unbalanced parentheses in a CREATE TABLE body');
}

// Splits a CREATE TABLE body into its comma-separated column/constraint
// entries, respecting nested parens and string literals so an internal
// comma (`numeric(10,2)`, `DEFAULT 'a,b'`) never causes a false split.
function splitTopLevel(body) {
  const parts = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  for (let i = 0; i < body.length; i++) {
    const char = body[i];
    if (inString) {
      if (char === "'") inString = false;
      continue;
    }
    if (char === "'") {
      inString = true;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      parts.push(body.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(body.slice(start));
  return parts;
}

function columnNameFromEntry(entry) {
  const trimmed = entry.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^"?(\w+)"?/);
  if (!match) return null;
  if (TABLE_CONSTRAINT_KEYWORDS.has(match[1].toLowerCase())) return null;
  return match[1];
}

// Parses `sql` (a schema.sql file's contents) into `{ table: [column, …] }`.
// Throws if it finds zero columns across every table — a parser that
// silently matches nothing must fail loudly rather than pass vacuously.
function parseSchemaColumns(sql) {
  const cleaned = stripComments(sql);
  const columnsByTable = {};
  const addColumn = (table, column) => {
    if (!columnsByTable[table]) columnsByTable[table] = new Set();
    columnsByTable[table].add(column);
  };

  CREATE_TABLE_RE.lastIndex = 0;
  let match = CREATE_TABLE_RE.exec(cleaned);
  while (match) {
    const table = match[1];
    const openIndex = CREATE_TABLE_RE.lastIndex;
    const body = readBalancedParens(cleaned, openIndex);
    CREATE_TABLE_RE.lastIndex = openIndex + body.length + 1;
    for (const entry of splitTopLevel(body)) {
      const column = columnNameFromEntry(entry);
      if (column) addColumn(table, column);
    }
    match = CREATE_TABLE_RE.exec(cleaned);
  }

  ALTER_ADD_COLUMN_RE.lastIndex = 0;
  match = ALTER_ADD_COLUMN_RE.exec(cleaned);
  while (match) {
    addColumn(match[1], match[2]);
    match = ALTER_ADD_COLUMN_RE.exec(cleaned);
  }

  const result = {};
  let totalColumns = 0;
  for (const [table, columns] of Object.entries(columnsByTable)) {
    result[table] = [...columns];
    totalColumns += columns.size;
  }
  if (totalColumns === 0) {
    throw new Error('schema.sql parser found zero columns — refusing to silently pass');
  }
  return result;
}

module.exports = { parseSchemaColumns };
