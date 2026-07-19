// NOAA/NWS current-conditions lookup: https://www.weather.gov/documentation/services-web-api
// Flow: lat/lon -> nearest grid point -> nearest observation stations -> latest observation.
// The API requires an identifying User-Agent and returns SI units, which we convert here.

const USER_AGENT = "minigolf-app (https://github.com/LightingNomad/esh)";
const HEADERS = { "User-Agent": USER_AGENT, Accept: "application/geo+json" };

// NOAA's station list is ordered by distance only, not by data quality or
// uptime -- the single nearest station is sometimes a private/CWOP or
// unmanned site that reports few or no fields, while an ASOS airport station
// a bit further out reports everything. Try a few of the nearest candidates
// and skip past any with no usable reading instead of trusting features[0].
const MAX_STATION_CANDIDATES = 5;

export interface WeatherConditions {
  temperatureF: number | null;
  humidityPct: number | null;
  windSpeedMph: number | null;
  barometricPressureInHg: number | null;
  dewpointF: number | null;
  visibilityMi: number | null;
  heatIndexF: number | null;
  weatherDescription: string | null;
}

function celsiusToF(c: number | null | undefined): number | null {
  return c == null ? null : Math.round((c * 9) / 5 + 32);
}

function kmhToMph(kmh: number | null | undefined): number | null {
  return kmh == null ? null : Math.round((kmh / 1.60934) * 10) / 10;
}

function paToInHg(pa: number | null | undefined): number | null {
  return pa == null ? null : Math.round((pa / 3386.39) * 100) / 100;
}

function metersToMiles(m: number | null | undefined): number | null {
  return m == null ? null : Math.round((m / 1609.34) * 10) / 10;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`NOAA request to ${url} failed: ${res.status}`);
  }
  return res.json();
}

interface ObservationProperties {
  temperature?: { value?: number | null };
  relativeHumidity?: { value?: number | null };
  windSpeed?: { value?: number | null };
  barometricPressure?: { value?: number | null };
  dewpoint?: { value?: number | null };
  visibility?: { value?: number | null };
  heatIndex?: { value?: number | null };
  textDescription?: string | null;
}

async function fetchObservation(stationId: string): Promise<ObservationProperties | null> {
  try {
    const observation = (await fetchJson(
      `https://api.weather.gov/stations/${stationId}/observations/latest`
    )) as { properties?: ObservationProperties };
    return observation.properties ?? null;
  } catch {
    return null;
  }
}

export async function fetchCurrentWeather(
  latitude: number,
  longitude: number
): Promise<WeatherConditions> {
  const point = (await fetchJson(
    `https://api.weather.gov/points/${latitude},${longitude}`
  )) as { properties?: { observationStations?: string } };

  const stationsUrl = point.properties?.observationStations;
  if (!stationsUrl) throw new Error("NOAA didn't return an observation stations list");

  const stations = (await fetchJson(stationsUrl)) as {
    features?: { properties?: { stationIdentifier?: string } }[];
  };
  const candidates = (stations.features ?? [])
    .map((f) => f.properties?.stationIdentifier)
    .filter((id): id is string => Boolean(id));
  if (candidates.length === 0) throw new Error("No nearby NOAA weather station found");

  let p: ObservationProperties = {};
  for (const stationId of candidates.slice(0, MAX_STATION_CANDIDATES)) {
    const properties = await fetchObservation(stationId);
    if (!properties) continue;
    if (Object.keys(p).length === 0) p = properties; // keep as a fallback even if sparse
    if (properties.temperature?.value != null) {
      p = properties;
      break;
    }
  }

  return {
    temperatureF: celsiusToF(p.temperature?.value),
    humidityPct: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
    windSpeedMph: kmhToMph(p.windSpeed?.value),
    barometricPressureInHg: paToInHg(p.barometricPressure?.value),
    dewpointF: celsiusToF(p.dewpoint?.value),
    visibilityMi: metersToMiles(p.visibility?.value),
    heatIndexF: celsiusToF(p.heatIndex?.value),
    weatherDescription: p.textDescription || null,
  };
}
