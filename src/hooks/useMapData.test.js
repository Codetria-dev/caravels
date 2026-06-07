import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMapData } from './useMapData';

vi.mock('../utils/countryDataExtractor', () => ({
  extractCountryCentroids: vi.fn().mockResolvedValue([
    { name: 'Germany', lat: 51.1657, lng: 10.4515 },
    { name: 'France', lat: 46.6034, lng: 1.8883 },
  ]),
  createSearchIndex: vi.fn().mockReturnValue([
    { id: 0, name: 'Germany', lowerName: 'germany', lat: 51.1657, lng: 10.4515, type: 'country' },
    { id: 1, name: 'France', lowerName: 'france', lat: 46.6034, lng: 1.8883, type: 'country' },
  ]),
}));

describe('useMapData', () => {
  it('should return initial loading state', () => {
    const { result } = renderHook(() => useMapData());

    expect(result.current.loading).toBe(true);
    expect(result.current.locations).toEqual([]);
  });

  it('should load locations after timeout', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    }, { timeout: 500 });

    expect(result.current.locations.length).toBe(12);
  });

  it('should have correct region labels', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const labels = result.current.locations.map(loc => loc.label);
    expect(labels).toContain('Europe');
    expect(labels).toContain('Asia');
    expect(labels).toContain('North America');
    expect(labels).toContain('Africa');
    expect(labels).toContain('Oceania');
  });

  it('should have valid lat/lng coordinates for all regions', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.locations.forEach(location => {
      expect(location.lat).toBeDefined();
      expect(location.lng).toBeDefined();
      expect(typeof location.lat).toBe('number');
      expect(typeof location.lng).toBe('number');
      expect(location.lat).toBeGreaterThanOrEqual(-90);
      expect(location.lat).toBeLessThanOrEqual(90);
      expect(location.lng).toBeGreaterThanOrEqual(-180);
      expect(location.lng).toBeLessThanOrEqual(180);
    });
  });

  it('should have distinct colors for all regions', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const colors = result.current.locations.map(loc => loc.color);
    const uniqueColors = new Set(colors);

    // All colors should be unique (no duplicates)
    expect(uniqueColors.size).toBe(colors.length);
  });

  it('should have valid hex color codes', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.locations.forEach(location => {
      expect(location.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('should have reasonable size values', async () => {
    const { result } = renderHook(() => useMapData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    result.current.locations.forEach(location => {
      expect(location.size).toBeDefined();
      expect(typeof location.size).toBe('number');
      expect(location.size).toBeGreaterThan(0);
    });
  });
});
