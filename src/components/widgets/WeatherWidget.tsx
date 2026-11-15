import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets, MapPin, Check } from 'lucide-react';
import type { WidgetProps } from '../../types/widgets';

interface WeatherData {
  city: string;
  temp: number;
  apparentTemp: number;
  condition: string;
  code: number;
  humidity: number;
  windSpeed: number;
  hourly: Array<{ time: string; temp: number; code: number }>;
}

interface LocationConfig {
  city: string;
  lat: number;
  lon: number;
}

const DEFAULT_LOCATION: LocationConfig = {
  city: 'London',
  lat: 51.5072,
  lon: -0.1276,
};

const DEFAULT_WEATHER: WeatherData = {
  city: 'London',
  temp: 20,
  apparentTemp: 21,
  condition: 'Partly Cloudy',
  code: 2,
  humidity: 58,
  windSpeed: 14,
  hourly: [
    { time: 'Now', temp: 20, code: 2 },
    { time: '+1h', temp: 21, code: 1 },
    { time: '+2h', temp: 21, code: 3 },
    { time: '+3h', temp: 19, code: 61 },
    { time: '+4h', temp: 18, code: 3 },
  ],
};

function getWeatherIcon(code: number, className = 'w-5 h-5') {
  if (code === 0 || code === 1) return <Sun className={`${className} text-amber-300`} />;
  if (code >= 2 && code <= 3) return <Cloud className={`${className} text-slate-300`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${className} text-sky-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${className} text-indigo-200`} />;
  return <Cloud className={`${className} text-slate-300`} />;
}

export const WeatherWidget: React.FC<WidgetProps> = ({ size }) => {
  const [location, setLocation] = useState<LocationConfig>(() => {
    try {
      const saved = localStorage.getItem('desktop_overlay_weather_location');
      return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
    } catch {
      return DEFAULT_LOCATION;
    }
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string>('');

  const [data, setData] = useState<WeatherData>(() => {
    try {
      const cached = localStorage.getItem(`desktop_overlay_weather_${location.city}`);
      return cached ? JSON.parse(cached) : DEFAULT_WEATHER;
    } catch {
      return DEFAULT_WEATHER;
    }
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchWeather() {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_hours=6`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (!res.ok) return;
        const json = await res.json();
        if (!isMounted) return;

        const current = json.current;
        const hourlyList = (json.hourly?.time || []).slice(0, 5).map((_t: string, idx: number) => ({
          time: idx === 0 ? 'Now' : `+${idx}h`,
          temp: Math.round(json.hourly.temperature_2m[idx] ?? current.temperature_2m),
          code: json.hourly.weather_code[idx] ?? current.weather_code,
        }));

        const updated: WeatherData = {
          city: location.city,
          temp: Math.round(current.temperature_2m),
          apparentTemp: Math.round(current.apparent_temperature),
          condition: current.weather_code <= 1 ? 'Sunny' : current.weather_code <= 3 ? 'Partly Cloudy' : 'Rain',
          code: current.weather_code,
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          hourly: hourlyList,
        };

        setData(updated);
        localStorage.setItem(`desktop_overlay_weather_${location.city}`, JSON.stringify(updated));
      } catch {}
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [location]);

  const handleSaveLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = searchInput.trim();
    if (!trimmed) {
      setIsEditing(false);
      return;
    }

    setIsSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=en&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          const match = json.results[0];
          const newLoc: LocationConfig = {
            city: match.name,
            lat: match.latitude,
            lon: match.longitude,
          };
          setLocation(newLoc);
          localStorage.setItem('desktop_overlay_weather_location', JSON.stringify(newLoc));
          setIsEditing(false);
          setSearchInput('');
        } else {
          setSearchError('City not found');
        }
      } else {
        setSearchError('Search failed');
      }
    } catch {
      setSearchError('Network error');
    } finally {
      setIsSearching(false);
    }
  };

  // Location header bar with inline search trigger
  const LocationHeader = (
    <div className="flex items-center justify-between mb-1">
      {isEditing ? (
        <form onSubmit={handleSaveLocation} className="flex flex-col gap-0.5 w-full">
          <div className="flex items-center gap-1 w-full">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Enter city..."
              autoFocus
              className="flex-1 px-2 py-0.5 text-[11px] rounded bg-white/10 text-white placeholder-slate-400 border border-white/20 outline-none focus:border-sky-400"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="p-1 rounded bg-sky-500/30 hover:bg-sky-500/50 text-sky-200 cursor-pointer"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
          {searchError && <span className="text-[9px] text-rose-400 font-mono">{searchError}</span>}
        </form>
      ) : (
        <div className="flex items-center justify-between w-full">
          <button
            onClick={() => {
              setSearchInput(location.city);
              setIsEditing(true);
            }}
            title="Click to change city location"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <MapPin className="w-3 h-3 text-sky-400" />
            <span className="truncate max-w-[100px]">{location.city}</span>
          </button>
          <span className="text-[10px] text-slate-400 font-mono">Live</span>
        </div>
      )}
    </div>
  );

  // S: Compact Square (164x164)
  if (size === 'S') {
    return (
      <div className="flex flex-col justify-between h-full">
        {LocationHeader}
        <div className="flex items-center justify-between my-auto">
          <span className="text-3xl font-extrabold text-white tracking-tight">{data.temp}°</span>
          {getWeatherIcon(data.code, 'w-8 h-8')}
        </div>
        <div className="pt-1 border-t border-white/10">
          <div className="text-[11px] font-semibold text-slate-200 truncate">{data.condition}</div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5">
            <span>Feels {data.apparentTemp}°</span>
            <span>💧 {data.humidity}%</span>
          </div>
        </div>
      </div>
    );
  }

  // V: Vertical Portrait (164x344)
  if (size === 'V') {
    return (
      <div className="flex flex-col justify-between h-full py-0.5">
        {LocationHeader}

        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-3xl font-extrabold text-white tracking-tight">{data.temp}°</span>
            <div className="text-xs font-semibold text-slate-200 mt-0.5">{data.condition}</div>
            <div className="text-[10px] text-slate-400">Feels like {data.apparentTemp}°</div>
          </div>
          {getWeatherIcon(data.code, 'w-9 h-9')}
        </div>

        <div className="h-px bg-white/10 my-1.5" />

        <div className="flex flex-col gap-1.5 flex-1 justify-center">
          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Next 5 Hours</span>
          {data.hourly.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-0.5 px-2 rounded-lg bg-white/[0.04]">
              <span className="text-slate-400 font-mono text-[10px]">{h.time}</span>
              <div className="flex items-center gap-1.5">
                {getWeatherIcon(h.code, 'w-3 h-3')}
                <span className="font-semibold text-white text-[11px]">{h.temp}°</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/10 mt-1">
          <div className="flex items-center gap-1">
            <Droplets className="w-3 h-3 text-sky-400" />
            <span>{data.humidity}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Wind className="w-3 h-3 text-slate-400" />
            <span>{data.windSpeed} km/h</span>
          </div>
        </div>
      </div>
    );
  }

  // M & L: Landscape / Large
  return (
    <div className="flex flex-col justify-between h-full">
      {LocationHeader}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white tracking-tight">{data.temp}°</span>
            <span className="text-xs text-slate-300 font-medium">{data.condition}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Feels like {data.apparentTemp}° · Humidity {data.humidity}% · Wind {data.windSpeed} km/h
          </div>
        </div>
        {getWeatherIcon(data.code, 'w-9 h-9')}
      </div>

      <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-white/10 mt-1">
        {data.hourly.map((h, i) => (
          <div key={i} className="flex flex-col items-center p-1 rounded-lg bg-white/[0.04] text-center">
            <span className="text-[9px] text-slate-400 font-mono mb-0.5">{h.time}</span>
            {getWeatherIcon(h.code, 'w-3.5 h-3.5')}
            <span className="text-[11px] font-semibold text-white mt-0.5">{h.temp}°</span>
          </div>
        ))}
      </div>
    </div>
  );
};
