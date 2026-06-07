let cachedData = null;

/**
 * Fetch world TopoJSON data from Natural Earth 50m dataset
 * Contains accurate country boundaries
 */
export async function fetchWorldTopoJSON() {
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch(
      'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch TopoJSON: ${response.statusText}`);
    }

    cachedData = await response.json();
    return cachedData;
  } catch (error) {
    console.error('Error fetching world TopoJSON:', error);
    // Return empty structure as fallback
    return {
      objects: {
        countries: { type: 'GeometryCollection', geometries: [] },
      },
      arcs: [],
    };
  }
}

/**
 * Extract country features from TopoJSON topology
 * Compatible with three-globe polygonsData
 */
export function extractCountriesFromTopology(topology) {
  try {
    // Use a simple topoJSON parsing approach
    const objects = topology.objects.countries;
    if (!objects || !objects.geometries) {
      return [];
    }

    // Convert geometries to GeoJSON features
    return objects.geometries.map((geometry, idx) => ({
      type: 'Feature',
      properties: {
        id: idx,
        name: geometry.properties?.name || `Country ${idx}`,
      },
      geometry: geometry,
    }));
  } catch (error) {
    console.error('Error extracting countries from topology:', error);
    return [];
  }
}

/**
 * Create a country name lookup for easier interaction handling
 */
export function createCountryLookup(countries) {
  const lookup = {};
  countries.forEach((country) => {
    if (country.properties?.id) {
      lookup[country.properties.id] = country.properties.name;
    }
  });
  return lookup;
}
