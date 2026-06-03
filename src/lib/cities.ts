export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
  tz: string; // IANA timezone
}

// A curated, popular list. Users can also enter custom coordinates.
export const CITIES: City[] = [
  { name: "Pristina", country: "Kosovo", lat: 42.6629, lon: 21.1655, tz: "Europe/Belgrade" },
  { name: "London", country: "UK", lat: 51.5074, lon: -0.1278, tz: "Europe/London" },
  { name: "Paris", country: "France", lat: 48.8566, lon: 2.3522, tz: "Europe/Paris" },
  { name: "Berlin", country: "Germany", lat: 52.5200, lon: 13.4050, tz: "Europe/Berlin" },
  { name: "Madrid", country: "Spain", lat: 40.4168, lon: -3.7038, tz: "Europe/Madrid" },
  { name: "Rome", country: "Italy", lat: 41.9028, lon: 12.4964, tz: "Europe/Rome" },
  { name: "Vienna", country: "Austria", lat: 48.2082, lon: 16.3738, tz: "Europe/Vienna" },
  { name: "Athens", country: "Greece", lat: 37.9838, lon: 23.7275, tz: "Europe/Athens" },
  { name: "Istanbul", country: "Turkey", lat: 41.0082, lon: 28.9784, tz: "Europe/Istanbul" },
  { name: "Moscow", country: "Russia", lat: 55.7558, lon: 37.6173, tz: "Europe/Moscow" },
  { name: "New York", country: "USA", lat: 40.7128, lon: -74.0060, tz: "America/New_York" },
  { name: "Los Angeles", country: "USA", lat: 34.0522, lon: -118.2437, tz: "America/Los_Angeles" },
  { name: "Chicago", country: "USA", lat: 41.8781, lon: -87.6298, tz: "America/Chicago" },
  { name: "Toronto", country: "Canada", lat: 43.6532, lon: -79.3832, tz: "America/Toronto" },
  { name: "Mexico City", country: "Mexico", lat: 19.4326, lon: -99.1332, tz: "America/Mexico_City" },
  { name: "São Paulo", country: "Brazil", lat: -23.5505, lon: -46.6333, tz: "America/Sao_Paulo" },
  { name: "Buenos Aires", country: "Argentina", lat: -34.6037, lon: -58.3816, tz: "America/Argentina/Buenos_Aires" },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lon: 139.6503, tz: "Asia/Tokyo" },
  { name: "Beijing", country: "China", lat: 39.9042, lon: 116.4074, tz: "Asia/Shanghai" },
  { name: "Hong Kong", country: "China", lat: 22.3193, lon: 114.1694, tz: "Asia/Hong_Kong" },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lon: 103.8198, tz: "Asia/Singapore" },
  { name: "Mumbai", country: "India", lat: 19.0760, lon: 72.8777, tz: "Asia/Kolkata" },
  { name: "Delhi", country: "India", lat: 28.7041, lon: 77.1025, tz: "Asia/Kolkata" },
  { name: "Dubai", country: "UAE", lat: 25.2048, lon: 55.2708, tz: "Asia/Dubai" },
  { name: "Tehran", country: "Iran", lat: 35.6892, lon: 51.3890, tz: "Asia/Tehran" },
  { name: "Cairo", country: "Egypt", lat: 30.0444, lon: 31.2357, tz: "Africa/Cairo" },
  { name: "Lagos", country: "Nigeria", lat: 6.5244, lon: 3.3792, tz: "Africa/Lagos" },
  { name: "Cape Town", country: "South Africa", lat: -33.9249, lon: 18.4241, tz: "Africa/Johannesburg" },
  { name: "Sydney", country: "Australia", lat: -33.8688, lon: 151.2093, tz: "Australia/Sydney" },
  { name: "Melbourne", country: "Australia", lat: -37.8136, lon: 144.9631, tz: "Australia/Melbourne" },
  { name: "Auckland", country: "New Zealand", lat: -36.8485, lon: 174.7633, tz: "Pacific/Auckland" },
  { name: "Reykjavik", country: "Iceland", lat: 64.1466, lon: -21.9426, tz: "Atlantic/Reykjavik" },
  { name: "Stockholm", country: "Sweden", lat: 59.3293, lon: 18.0686, tz: "Europe/Stockholm" },
  { name: "Oslo", country: "Norway", lat: 59.9139, lon: 10.7522, tz: "Europe/Oslo" },
  { name: "Helsinki", country: "Finland", lat: 60.1699, lon: 24.9384, tz: "Europe/Helsinki" },
  { name: "Tirana", country: "Albania", lat: 41.3275, lon: 19.8187, tz: "Europe/Tirane" },
  { name: "Skopje", country: "North Macedonia", lat: 41.9981, lon: 21.4254, tz: "Europe/Skopje" },
  { name: "Belgrade", country: "Serbia", lat: 44.7866, lon: 20.4489, tz: "Europe/Belgrade" },
  { name: "Sarajevo", country: "Bosnia", lat: 43.8563, lon: 18.4131, tz: "Europe/Sarajevo" },
  { name: "Zagreb", country: "Croatia", lat: 45.8150, lon: 15.9819, tz: "Europe/Zagreb" },
];