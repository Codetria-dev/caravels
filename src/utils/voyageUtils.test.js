import { describe, it, expect } from 'vitest';
import { addToVoyageHistory } from './voyageUtils';

describe('addToVoyageHistory', () => {
  it('adds a new entry to empty history', () => {
    const result = addToVoyageHistory([], { name: 'France', lat: 46, lng: 2 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('France');
  });

  it('skips consecutive duplicate names', () => {
    const prev = [{ name: 'France', lat: 46, lng: 2 }];
    const result = addToVoyageHistory(prev, { name: 'France', lat: 46, lng: 2 });
    expect(result).toHaveLength(1);
  });

  it('allows same name if not consecutive', () => {
    const prev = [
      { name: 'France', lat: 46, lng: 2 },
      { name: 'Japan', lat: 36, lng: 138 },
    ];
    const result = addToVoyageHistory(prev, { name: 'France', lat: 46, lng: 2 });
    expect(result).toHaveLength(3);
  });

  it('caps at maxEntries', () => {
    const prev = Array.from({ length: 20 }, (_, i) => ({ name: `Place${i}` }));
    const result = addToVoyageHistory(prev, { name: 'NewPlace' }, 20);
    expect(result).toHaveLength(20);
    expect(result[19].name).toBe('NewPlace');
    expect(result[0].name).toBe('Place1');
  });
});
