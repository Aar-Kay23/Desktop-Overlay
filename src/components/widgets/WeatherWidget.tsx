import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudSnow, Wind, Droplets } from 'lucide-react';
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

const DEFAULT_WEATHER: WeatherData = {
  city: 'Local Weather',
  temp: 24,
  apparentTemp: 25,
  condition: 'Partly Cloudy',
  code: 2,
  humidity: 55,
  windSpeed: 12,
  hourly: [
    { time: 'Now', temp: 24, code: 2 },
    { time: '+1h', temp: 25, code: 1 },
    { time: '+2h', temp: 24, code: 3 },
    { time: '+3h', temp: 22, code: 61 },
    { time: '+4h', temp: 21, code: 3 },
  ],
};

function getWeatherIcon(code: number, className = 'w-6 h-6') {
  if (code === 0 || code === 1) return <Sun className={`${className} text-amber-300`} />;
  if (code >= 2 && code <= 3) return <Cloud className={`${className} text-slate-300`} />;
  if (code >= 51 && code <= 67) return <CloudRain className={`${className} text-sky-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${className} text-indigo-200`} />;
  return <Cloud className={`${className} text-slate-300`} />;
}

export const WeatherWidget: React.FC<WidgetProps> = ({ size }) => {
  const [data, setData] = useState<WeatherData>(() => {
    try {
      const cached = localStorage.getItem('desktop_overlay_weather_cache');
      return cached ? JSON.parse(cached) : DEFAULT_WEATHER;
    } catch {
      return DEFAULT_WEATHER;
    }
  });

  useEffect(() => {
    let isMounted = true;
    async function fetchWeather() {
      try {
        // Free Open-Meteo endpoint (defaults to current lat/lon or sensible default)
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=28.6139&longitude=77.2090&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_hours=6'
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
          city: 'Current Area',
          temp: Math.round(current.temperature_2m),
          apparentTemp: Math.round(current.apparent_temperature),
          condition: current.weather_code <= 1 ? 'Sunny' : current.weather_code <= 3 ? 'Cloudy' : 'Rain',
          code: current.weather_code,
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          hourly: hourlyList,
        };

        setData(updated);
        localStorage.setItem('desktop_overlay_weather_cache', JSON.stringify(updated));
      } catch {
        // Keep cached
      }
    }

    fetchWeather();
    const interval = setInterval(fetchWeather, 20 * 60 * 1000); // 20m
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // S: Compact Square (164x164)
  if (size === 'S') {
    return (
      <div className="flex flex-col justify-between h-full pt-1">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-extrabold text-white tracking-tight">{data.temp}°</span>
          {getWeatherIcon(data.code, 'w-8 h-8')}
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-200">{data.condition}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Feels like {data.apparentTemp}°</div>
        </div>
      </div>
    );
  }

  // V: Vertical Portrait (164x344)
  if (size === 'V') {
    return (
      <div className="flex flex-col justify-between h-full py-1">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-4xl font-extrabold text-white tracking-tight">{data.temp}°</span>
            {getWeatherIcon(data.code, 'w-10 h-10')}
          </div>
          <div className="text-xs font-semibold text-slate-200 mt-1">{data.condition}</div>
          <div className="text-[10px] text-slate-400">Feels like {data.apparentTemp}°</div>
        </div>

        <div className="h-px bg-white/10 my-2" />

        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Hourly Forecast</span>
          {data.hourly.map((h, i) => (
            <div key={i} className="flex items-center justify-between text-xs py-1 px-1.5 rounded-lg bg-white/[0.04]">
              <span className="text-slate-400 font-mono text-[10px]">{h.time}</span>
              <div className="flex items-center gap-1.5">
                {getWeatherIcon(h.code, 'w-3.5 h-3.5')}
                <span className="font-semibold text-white">{h.temp}°</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
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

  // M: Landscape (344x164)
  return (
    <div className="flex flex-col justify-between h-full">
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
        {getWeatherIcon(data.code, 'w-10 h-10')}
      </div>

      <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/10">
        {data.hourly.map((h, i) => (
          <div key={i} className="flex flex-col items-center p-1.5 rounded-lg bg-white/[0.04] text-center">
            <span className="text-[10px] text-slate-400 font-mono mb-1">{h.time}</span>
            {getWeatherIcon(h.code, 'w-4 h-4')}
            <span className="text-xs font-semibold text-white mt-1">{h.temp}°</span>
          </div>
        ))}
      </div>
    </div>
  );
};
