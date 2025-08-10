const { parseCSVLine } = require('../scripts/csvParser');

describe('parseCSVLine', () => {
  test('parses simple CSV line', () => {
    expect(parseCSVLine('123,John Doe')).toEqual(['123', 'John Doe']);
  });

  test('handles quoted commas', () => {
    expect(parseCSVLine('"123","Doe, John"')).toEqual(['123', 'Doe, John']);
  });

  test('parses line ending with \r\n', () => {
    const line = '123,John Doe\r\n'.split('\n')[0];
    expect(parseCSVLine(line)).toEqual(['123', 'John Doe']);
  });
});
