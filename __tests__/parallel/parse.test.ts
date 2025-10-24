import { formatOhms, parseOhms } from '../../lib/parallel/parse';

describe('parallel parse utilities', () => {
  describe('parseOhms', () => {
    it.each([
      ['820', 820],
      ['1.2k', 1_200],
      [' 1 M ', 1_000_000],
    ])('parses %s as %d', (input, expected) => {
      const result = parseOhms(input);
      expect(result).toBe(expected);
    });

    it.each(['', '  '])('requires a value for %s', (input) => {
      const result = parseOhms(input);
      expect(result).toBeInstanceOf(Error);
      if (result instanceof Error) {
        expect(result.message).toMatch(/please enter a value/i);
      }
    });

    it.each(['1K', '3 g'])('rejects unsupported suffix for %s', (input) => {
      const result = parseOhms(input);
      expect(result).toBeInstanceOf(Error);
    });

    it.each(['0', '-10'])('rejects non-positive input %s', (input) => {
      const result = parseOhms(input);
      expect(result).toBeInstanceOf(Error);
      if (result instanceof Error) {
        expect(result.message).toBe('Please enter a value greater than zero.');
      }
    });
  });

  describe('formatOhms', () => {
    it('formats kilohms with up to three significant digits', () => {
      expect(formatOhms(1_200)).toBe('1.2kΩ');
    });

    it('formats megaohms with trailing zeros when needed', () => {
      expect(formatOhms(1_000_000)).toBe('1.00MΩ');
    });

    it('keeps ohms without suffix when below 1k', () => {
      expect(formatOhms(820)).toBe('820Ω');
    });
  });
});
