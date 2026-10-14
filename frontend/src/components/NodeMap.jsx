import React, { useState, useMemo } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getAQIInfo } from '../utils/aqiColors';
import { Layers, MapPin } from 'lucide-react';

export default function NodeMap({ nodes = [], latestReadings = {}, selectedNodeId, onSelectNode }) {
  const [viewState, setViewState] = useState({
    longitude: 90.4125,
    latitude: 23.8103,
    zoom: 12,
    pitch: 0,
    bearing: 0
  });

  const [popupInfo, setPopupInfo] = useState(null);
  const [mapType, setMapType] = useState('street');

  // Using custom raster style for MapLibre so we don't need API keys
  const mapStyle = useMemo(() => {
    const tileUrl = mapType === 'satellite'
      ? 'https://mt1.google.com/vt/lyrs=y&hl=en&x={x}&y={y}&z={z}'
      : 'https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}';

    return {
      version: 8,
      sources: {
        osm: {
          type: 'raster',
          tiles: [tileUrl],
          tileSize: 256,
          attribution: 'Map data &copy; Google'
        }
      },
      layers: [
        {
          id: 'osm',
          type: 'raster',
          source: 'osm',
          minzoom: 0,
          maxzoom: 22
        }
      ]
    };
  }, [mapType]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/80 shadow-inner" style={{ height: 490 }}>
      {/* Frosted Map Layer Toggle */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/85 backdrop-blur-md p-1 rounded-xl border border-slate-200/80 shadow-md">
        <button
          onClick={() => setMapType('street')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
            mapType === 'street'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Street
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
            mapType === 'satellite'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Satellite
        </button>
      </div>

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapLib={maplibregl}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%', background: '#f1f5f9' }}
      >
        {nodes.map(node => {
          const reading = latestReadings[node.id];
          const aqi = reading?.aqi;
          const info = getAQIInfo(aqi);
          const isSelected = node.id === selectedNodeId;
          const isSpike = aqi >= 250;
          const isRelayOn = reading?.relay_state;

          return (
            <Marker
              key={node.id}
              longitude={node.location_lon}
              latitude={node.location_lat}
              anchor="center"
              onClick={e => {
                e.originalEvent.stopPropagation();
                onSelectNode?.(node.id);
                setPopupInfo(node);
              }}
            >
              <div className="relative cursor-pointer group">
                {/* Node Beacon Circle */}
                <div
                  style={{
                    width: isSelected ? 36 : 24,
                    height: isSelected ? 36 : 24,
                    backgroundColor: info.color,
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#ffffff' : 'rgba(255,255,255,0.8)'}`,
                    boxShadow: isSelected
                      ? `0 0 0 4px rgba(14, 165, 233, 0.4), 0 4px 10px rgba(0,0,0,0.2)`
                      : `0 2px 6px rgba(0,0,0,0.15)`,
                    transform: 'translate(-50%, -50%)',
                    transition: 'all 0.25s ease',
                  }}
                  className={isSpike || isRelayOn ? 'animate-pulse' : ''}
                />

                {/* Micro Label on Hover or Selected */}
                {isSelected && (
                  <div className="absolute left-1/2 -top-8 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white text-[10px] font-mono px-2 py-0.5 rounded-md shadow-md whitespace-nowrap pointer-events-none">
                    {node.name} • {aqi ?? '—'} AQI
                  </div>
                )}
              </div>
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            longitude={popupInfo.location_lon}
            latitude={popupInfo.location_lat}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={false}
            offset={20}
          >
            {(() => {
              const reading = latestReadings[popupInfo.id];
              const aqi = reading?.aqi;
              const info = getAQIInfo(aqi);
              const pm25SI = reading?.aqi_pm25_subindex;
              const pm10SI = reading?.aqi_pm10_subindex;
              const pm25Driving = pm25SI != null && pm10SI != null && pm25SI >= pm10SI;
              const pm10Driving = pm25SI != null && pm10SI != null && pm10SI > pm25SI;
              const spikeDriver = pm25Driving ? 'PM2.5' : pm10Driving ? 'PM10' : null;
              return (
                <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-xl p-3 shadow-xl min-w-[210px] text-slate-800 font-sans">
                  <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-slate-100">
                    <span className="font-extrabold text-xs text-slate-900 truncate">{popupInfo.name}</span>
                    <button
                      onClick={() => setPopupInfo(null)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold leading-none"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2 font-mono text-xs">
                    <span
                      className="px-2 py-0.5 rounded text-white font-bold text-[11px]"
                      style={{ backgroundColor: info.color }}
                    >
                      {aqi ?? '—'} AQI
                    </span>
                    <span className="text-[11px] font-medium text-slate-600">{info.label}</span>
                  </div>
                  {aqi >= 200 && spikeDriver && (
                    <div className="text-[10px] bg-rose-50 border border-rose-200 rounded p-1 mb-2 text-rose-700 font-bold">
                      ⚡ {spikeDriver} sub-index driving spike
                    </div>
                  )}
                  {reading && (
                    <div className="space-y-1 text-[11px] font-mono">
                      <div className="flex justify-between text-slate-600">
                        <span>PM1.0:</span><strong className="text-slate-900">{reading.pm1_0_raw?.toFixed(1) ?? '—'} µg</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>PM2.5:</span><strong className="text-slate-900">{reading.pm2_5_corrected?.toFixed(1) ?? '—'} µg</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>PM10:</span><strong className="text-slate-900">{reading.pm10_corrected?.toFixed(1) ?? '—'} µg</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-100 text-[10px]">
                        <span>Actuator:</span>
                        <span className={`font-bold ${reading.relay_state ? 'text-rose-600' : 'text-slate-400'}`}>
                          {reading.relay_state ? 'ENGAGED' : 'IDLE'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </Popup>
        )}
      </Map>
    </div>
  );
}
