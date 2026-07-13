// NOAA/NWS current-conditions lookup: https://www.weather.gov/documentation/services-web-api
// Flow: lat/lon -> nearest grid point -> nearest observation stations -> latest observation.
// The API requires an identifying User-Agent and returns SI units, which we convert here.

const USER_AGENT = "minigolf-app (https://github.com/LightingNomad/esh)";
const HEADERS = { "User-Agent": USER_AGENT, Accept: "application/geo+json" };

export interface WeatherConditions {
  temperatureF: number | null;
  humidityPct: number | null;
  windSpeedMph: number | null;
  barometricPressureInHg: number | null;
  dewpointF: number | null;
  visibilityMi: number | null;
  heatIndexF: number | null;
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
  const stationId = stations.features?.[0]?.properties?.stationIdentifier;
  if (!stationId) throw new Error("No nearby NOAA weather station found");

  const observation = (await fetchJson(
    `https://api.weather.gov/stations/${stationId}/observations/latest`
  )) as {
    properties?: {
      temperature?: { value?: number | null };
      relativeHumidity?: { value?: number | null };
      windSpeed?: { value?: number | null };
      barometricPressure?: { value?: number | null };
      dewpoint?: { value?: number | null };
      visibility?: { value?: number | null };
      heatIndex?: { value?: number | null };
    };
  };
  const p = observation.properties ?? {};

  return {
    temperatureF: celsiusToF(p.temperature?.value),
    humidityPct: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
    windSpeedMph: kmhToMph(p.windSpeed?.value),
    barometricPressureInHg: paToInHg(p.barometricPressure?.value),
    dewpointF: celsiusToF(p.dewpoint?.value),
    visibilityMi: metersToMiles(p.visibility?.value),
    heatIndexF: celsiusToF(p.heatIndex?.value),
  };
}
