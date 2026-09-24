// AQI CPCB color scale utilities

export const AQI_CATEGORIES = [
  { label: "Good",         min: 0,   max: 50,  color: "#2c7a7b", textColor: "#fff", cls: "aqi-good" },
  { label: "Satisfactory", min: 51,  max: 100, color: "#38a169", textColor: "#fff", cls: "aqi-satisfactory" },
  { label: "Moderate",     min: 101, max: 200, color: "#d69e2e", textColor: "#fff", cls: "aqi-moderate" },
  { label: "Poor",         min: 201, max: 300, color: "#dd6b20", textColor: "#fff", cls: "aqi-poor" },
  { label: "Very Poor",    min: 301, max: 400, color: "#c53030", textColor: "#fff", cls: "aqi-verypoor" },
  { label: "Severe",       min: 401, max: 999, color: "#805ad5", textColor: "#fff", cls: "aqi-severe" },
];

export function getAQIInfo(aqi) {
  if (aqi == null) return { label: "Unavailable", color: "#666", textColor: "#ccc", cls: "aqi-unavailable" };
  for (const cat of AQI_CATEGORIES) {
    if (aqi >= cat.min && aqi <= cat.max) return cat;
  }
  return { label: "Severe", color: "#805ad5", textColor: "#fff", cls: "aqi-severe" };
}

export function aqiGradient(aqi) {
  const info = getAQIInfo(aqi);
  return `linear-gradient(135deg, ${info.color}22, ${info.color}08)`;
}
