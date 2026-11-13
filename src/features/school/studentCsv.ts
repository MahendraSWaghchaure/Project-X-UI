import { PHONE_REGEX } from '@/lib/validation';
import type { Classroom, StudentInput } from '@/types/attendance';

/** Header names accepted (case-insensitive, spaces/underscores ignored). Order in the file does not matter. */
export const CSV_HEADER = 'firstName,lastName,rollNo,classroom,guardianName,guardianPhone,guardianEmail,marketingConsent';

export const MAX_IMPORT_ROWS = 500;

export interface CsvRowError {
  /** 1-based line number in the pasted text (header is line 1). */
  line: number;
  /** i18n key under `students.import.errors`. */
  code: 'missingColumns' | 'required' | 'phone' | 'unknownClassroom';
  /** Extra detail for the message, e.g. the offending column or classroom name. */
  detail?: string;
}

export interface CsvParseResult {
  rows: StudentInput[];
  errors: CsvRowError[];
  tooMany: boolean;
}

/** Splits one CSV line, honouring double-quoted fields (with "" as an escaped quote). */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, '');
const TRUTHY = new Set(['true', 'yes', 'y', '1']);

/** Matches "5", "5 A", "5-A" or "5A" against classrooms by name, or name+section. */
export function findClassroom(label: string, classrooms: Classroom[]): Classroom | undefined {
  const key = norm(label);
  if (!key) return undefined;
  return (
    classrooms.find((c) => norm(`${c.name}${c.section ?? ''}`) === key) ??
    classrooms.find((c) => norm(c.name) === key && classrooms.filter((o) => norm(o.name) === key).length === 1)
  );
}

export function parseStudentCsv(text: string, classrooms: Classroom[]): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l, i) => ({ raw: l, line: i + 1 }))
    .filter((l) => l.raw.trim() !== '');
  const result: CsvParseResult = { rows: [], errors: [], tooMany: false };
  if (lines.length === 0) return result;

  const header = splitCsvLine(lines[0].raw).map(norm);
  const col = (name: string) => header.indexOf(norm(name));
  const required = ['firstName', 'lastName', 'guardianName', 'guardianPhone'];
  const missing = required.filter((r) => col(r) === -1);
  if (missing.length > 0) {
    result.errors.push({ line: lines[0].line, code: 'missingColumns', detail: missing.join(', ') });
    return result;
  }

  const body = lines.slice(1);
  if (body.length > MAX_IMPORT_ROWS) {
    result.tooMany = true;
    return result;
  }

  for (const { raw, line } of body) {
    const cells = splitCsvLine(raw);
    const get = (name: string) => (col(name) === -1 ? '' : (cells[col(name)] ?? '').trim());

    const emptyRequired = required.find((r) => !get(r));
    if (emptyRequired) {
      result.errors.push({ line, code: 'required', detail: emptyRequired });
      continue;
    }
    const phone = get('guardianPhone');
    if (!PHONE_REGEX.test(phone)) {
      result.errors.push({ line, code: 'phone', detail: phone });
      continue;
    }
    let classroomId: number | undefined;
    const classroomLabel = get('classroom');
    if (classroomLabel) {
      const match = findClassroom(classroomLabel, classrooms);
      if (!match) {
        result.errors.push({ line, code: 'unknownClassroom', detail: classroomLabel });
        continue;
      }
      classroomId = match.id;
    }

    result.rows.push({
      firstName: get('firstName'),
      lastName: get('lastName'),
      rollNo: get('rollNo') || undefined,
      classroomId,
      guardianName: get('guardianName'),
      guardianPhone: phone,
      guardianEmail: get('guardianEmail') || undefined,
      marketingConsent: TRUTHY.has(get('marketingConsent').toLowerCase()),
    });
  }
  return result;
}
