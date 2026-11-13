import { describe, expect, it } from 'vitest';
import { parseStudentCsv, splitCsvLine } from './studentCsv';
import type { Classroom } from '@/types/attendance';

const classrooms: Classroom[] = [
  { id: 1, name: '5', section: 'A' },
  { id: 2, name: '5', section: 'B' },
];

const HEADER = 'firstName,lastName,rollNo,classroom,guardianName,guardianPhone,guardianEmail,marketingConsent';

describe('parseStudentCsv', () => {
  it('maps valid rows to StudentInput, resolving the classroom by name+section', () => {
    const result = parseStudentCsv(`${HEADER}\nAsha,Verma,12,5 A,Rekha Verma,9876543210,rekha@example.com,yes\nRavi,Kumar,,,Sita Kumar,+919812345678,,`, classrooms);

    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      {
        firstName: 'Asha',
        lastName: 'Verma',
        rollNo: '12',
        classroomId: 1,
        guardianName: 'Rekha Verma',
        guardianPhone: '9876543210',
        guardianEmail: 'rekha@example.com',
        marketingConsent: true,
      },
      {
        firstName: 'Ravi',
        lastName: 'Kumar',
        rollNo: undefined,
        classroomId: undefined,
        guardianName: 'Sita Kumar',
        guardianPhone: '+919812345678',
        guardianEmail: undefined,
        marketingConsent: false,
      },
    ]);
  });

  it('reports per-line problems instead of importing partial garbage', () => {
    const result = parseStudentCsv(
      `${HEADER}\nAsha,,1,5 A,Rekha,9876543210,,\nRavi,Kumar,2,5 A,Sita,12ab,,\nMeena,Rao,3,9 Z,Geeta,9876543210,,`,
      classrooms,
    );

    expect(result.rows).toHaveLength(0);
    expect(result.errors.map((e) => [e.line, e.code])).toEqual([
      [2, 'required'],
      [3, 'phone'],
      [4, 'unknownClassroom'],
    ]);
  });

  it('requires the key columns and caps the batch at 500 rows', () => {
    expect(parseStudentCsv('firstName,lastName\nA,B', classrooms).errors[0].code).toBe('missingColumns');

    const body = Array.from({ length: 501 }, (_, i) => `S${i},T,,,G,9876543210,,`).join('\n');
    expect(parseStudentCsv(`${HEADER}\n${body}`, classrooms).tooMany).toBe(true);
  });
});

describe('splitCsvLine', () => {
  it('honours quoted commas and escaped quotes', () => {
    expect(splitCsvLine('a,"b, c","say ""hi"""')).toEqual(['a', 'b, c', 'say "hi"']);
  });
});
