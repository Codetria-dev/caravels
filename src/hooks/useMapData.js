import { useState, useEffect } from 'react';
import { extractCountryCentroids, createSearchIndex } from '../utils/countryDataExtractor';

// 12 global regions with accurate coordinates and vibrant distinct colors
const REGIONS = [
  { id: 'region-1', label: 'Europe', lat: 54.5260, lng: 15.2551, color: '#4ade80', size: 8, type: 'region' },
  { id: 'region-2', label: 'North America', lat: 56.1304, lng: -106.3468, color: '#06d6a0', size: 9, type: 'region' },
  { id: 'region-3', label: 'South America', lat: -8.7832, lng: -55.4915, color: '#00d9a3', size: 7, type: 'region' },
  { id: 'region-4', label: 'Africa', lat: -11.2027, lng: 21.8387, color: '#22c55e', size: 7, type: 'region' },
  { id: 'region-5', label: 'Middle East', lat: 34.8516, lng: 46.2619, color: '#ff4757', size: 6, type: 'region' },
  { id: 'region-6', label: 'Central Asia', lat: 48.0196, lng: 66.9237, color: '#ffa502', size: 6, type: 'region' },
  { id: 'region-7', label: 'Asia', lat: 34.0479, lng: 100.6197, color: '#00d4ff', size: 10, type: 'region' },
  { id: 'region-8', label: 'East Asia', lat: 35.9078, lng: 127.7669, color: '#d946ef', size: 8, type: 'region' },
  { id: 'region-9', label: 'Southeast Asia', lat: 9.0765, lng: 105.6681, color: '#14b8a6', size: 8, type: 'region' },
  { id: 'region-10', label: 'Japan', lat: 36.2048, lng: 138.2529, color: '#f59e0b', size: 6, type: 'region' },
  { id: 'region-11', label: 'Oceania', lat: -25.2744, lng: 133.7751, color: '#eab308', size: 5, type: 'region' },
  { id: 'region-12', label: 'UK', lat: 55.3781, lng: -3.4360, color: '#06b6d4', size: 6, type: 'region' },
];

export function useMapData() {
  const [locations, setLocations] = useState([]);
  const [countries, setCountries] = useState([]);
  const [countriesIndex, setCountriesIndex] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Fetch and extract country centroids
        const countriesData = await extractCountryCentroids();
        setCountries(countriesData);

        // Create searchable index
        const index = createSearchIndex(countriesData);
        setCountriesIndex(index);
      } catch (error) {
        console.error('Error loading geographic data:', error);
      }

      // Load regions
      setLocations(REGIONS);
      setLoading(false);
    }

    loadData();
  }, []);

  return { locations, countries, countriesIndex, loading };
}
