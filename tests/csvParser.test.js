const { parseCSV } = require('../scripts/csvParser');

describe('parseCSV', () => {
  test('parses simple CSV file', () => {
    expect(parseCSV('123,John Doe')).toEqual([[ '123', 'John Doe' ]]);
  });

  test('handles quoted commas', () => {
    expect(parseCSV('"123","Doe, John"')).toEqual([[ '123', 'Doe, John' ]]);
  });

  test('parses CRLF line endings', () => {
    const csv = '123,John Doe\r\n';
    expect(parseCSV(csv)).toEqual([[ '123', 'John Doe' ]]);
  });

  test('parses embedded newlines within quoted fields', () => {
    const csv = '"1","John\nDoe"\n"2","Jane\r\nSmith"';
    expect(parseCSV(csv)).toEqual([
      ['1', 'John\nDoe'],
      ['2', 'Jane\r\nSmith']
    ]);
  });
});

