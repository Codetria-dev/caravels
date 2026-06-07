/**
 * Extract country centroids from TopoJSON topology
 * Creates searchable country data for globe navigation
 */

export async function extractCountryCentroids() {
  try {
    const res = await fetch(
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'
    );
    const topoData = await res.json();

    // Simple country data with centroids calculated from bounds
    const topojson = await import('topojson-client');
    const countries = topojson.feature(topoData, topoData.objects.countries).features;

    const countryData = countries.map((feature, idx) => {
      const geom = feature.geometry;
      if (!geom) return null;

      // Calculate bounds and centroid
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

      const processBounds = (coords, depth = 0) => {
        if (Array.isArray(coords[0])) {
          if (typeof coords[0][0] === 'number') {
            // This is a point [lng, lat]
            const [lng, lat] = coords;
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          } else {
            coords.forEach((coord) => processBounds(coord, depth + 1));
          }
        }
      };

      if (geom.type === 'Polygon') {
        geom.coordinates.forEach((ring) => processBounds(ring));
      } else if (geom.type === 'MultiPolygon') {
        geom.coordinates.forEach((polygon) => {
          polygon.forEach((ring) => processBounds(ring));
        });
      }

      // Calculate centroid as midpoint of bounds
      const lat = (minLat + maxLat) / 2;
      const lng = (minLng + maxLng) / 2;

      return {
        id: idx,
        name: feature.properties?.name || `Country ${idx}`,
        lat: parseFloat(lat.toFixed(4)),
        lng: parseFloat(lng.toFixed(4)),
        type: 'country',
        searchTerms: [
          feature.properties?.name?.toLowerCase() || '',
        ],
      };
    }).filter(Boolean);

    return countryData;
  } catch (error) {
    console.error('Error extracting country centroids:', error);
    return [];
  }
}

/**
 * Create searchable index from countries array
 * Returns array of items with scores for ranking
 */
export function createSearchIndex(countries) {
  return countries.map((country) => ({
    ...country,
    lowerName: country.name.toLowerCase(),
    searchTerms: [
      country.name.toLowerCase(),
      ...country.searchTerms,
    ],
  }));
}

/**
 * Search countries with simple fuzzy/substring matching
 * Returns top N results ranked by relevance
 */
export function searchCountries(query, countriesIndex, limit = 10) {
  if (!query || query.length < 1) return [];

  const lowerQuery = query.toLowerCase();

  const scored = countriesIndex
    .map((country) => {
      let score = 0;

      // Exact match: highest score
      if (country.lowerName === lowerQuery) {
        score = 1000;
      }
      // Starts with query: high score
      else if (country.lowerName.startsWith(lowerQuery)) {
        score = 100 + (200 - country.lowerName.length); // Shorter names rank higher
      }
      // Contains query: medium score
      else if (country.lowerName.includes(lowerQuery)) {
        const index = country.lowerName.indexOf(lowerQuery);
        score = 50 - index; // Earlier position = higher score
      }
      // Fuzzy: low score
      else {
        const matches = country.searchTerms.filter((term) =>
          term.includes(lowerQuery)
        ).length;
        if (matches > 0) score = 10 * matches;
      }

      return { ...country, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((country) => {
    const result = { ...country };
    delete result.score;
    return result;
  });
}
