import { formatOhms, formatVolts, parseOhms, parseVolts } from '../../lib/potbias/parse';

describe('potentiometer bias parsing', () => {
  describe('parseOhms', () => {
    it('parses kilo-ohm suffix', () => {
      expect(parseOhms('10k')).toBe(10_000);
    });

    it('parses mega-ohm suffix with spaces', () => {
      expect(parseOhms('1 M')).toBe(1_000_000);
    });

    it('rejects uppercase suffix', () => {
      const result = parseOhms('10K');
      expect(result).toBeInstanceOf(Error);
    });

    it('rejects unsupported suffix', () => {
      const result = parseOhms('5 g');
      expect(result).toBeInstanceOf(Error);
    });

    it('rejects zero resistance values', () => {
      const result = parseOhms('0');
      expect(result).toBeInstanceOf(Error);
    });

    it('requires a non-empty value', () => {
      const result = parseOhms('   ');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('parseVolts', () => {
    it('parses decimal voltage strings', () => {
      expect(parseVolts('3.30')).toBeCloseTo(3.3, 6);
    });

    it('parses negative voltage values', () => {
      expect(parseVolts('-1.5')).toBeCloseTo(-1.5, 6);
    });

    it('rejects invalid voltage strings', () => {
      const result = parseVolts('abc');
      expect(result).toBeInstanceOf(Error);
    });
  });

  describe('formatters', () => {
    it('formats resistance with 3 significant figures', () => {
      expect(formatOhms(2857)).toBe('2.86kΩ');
    });

    it('formats mega-ohm values without trimming zeros', () => {
      expect(formatOhms(1_500_000)).toBe('1.50MΩ');
    });

    it('formats voltage with 3 significant figures', () => {
      expect(formatVolts(3.3)).toBe('3.30 V');
    });

    it('formats sub-volt values without trimming necessary digits', () => {
      expect(formatVolts(0.1234)).toBe('0.123 V');
    });

    it('formats non-finite values as em dash', () => {
      expect(formatVolts(Number.NaN)).toBe('—');
      expect(formatOhms(Number.POSITIVE_INFINITY)).toBe('—');
    });
  });
});
