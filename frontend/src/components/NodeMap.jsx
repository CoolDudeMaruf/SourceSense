import React, { useState, useMemo } from 'react';
import Map, { Marker, Popup } from 'react-map-gl/maplibre';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getAQIInfo } from '../utils/aqiColors';

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

  // Using a custom raster style for MapLibre so we don't need API keys
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
    <div className="glass-card overflow-hidden relative" style={{ height: 500 }}>
      {/* Map Type Toggle */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, display: 'flex', gap: '4px', background: 'rgba(10, 15, 26, 0.8)', padding: '4px', borderRadius: '8px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={() => setMapType('street')}
          style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: mapType === 'street' ? 'var(--brand-500, #38bdf8)' : 'transparent', color: mapType === 'street' ? '#fff' : '#aaa', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
        >
          Street
        </button>
        <button 
          onClick={() => setMapType('satellite')}
          style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4px', border: 'none', background: mapType === 'satellite' ? 'var(--brand-500, #38bdf8)' : 'transparent', color: mapType === 'satellite' ? '#fff' : '#aaa', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}
        >
          Satellite
        </button>
      </div>

      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapLib={maplibregl}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%', background: '#0a0f1a' }}
      >
        {nodes.map(node => {
          const reading = latestReadings[node.id];
          const aqi = reading?.aqi;
          const info = getAQIInfo(aqi);
          const isSelected = node.id === selectedNodeId;
          // Trigger spike visually when AQI is Severe/Hazardous (>=300)
          const isSpike = aqi >= 300;
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
              <div style={{ position: 'relative' }}>
                {/* Node Circle */}
                <div
                  style={{
                    width: isSelected ? 40 : 28,
                    height: isSelected ? 40 : 28,
                    backgroundColor: info.color,
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? '#fff' : 'rgba(255,255,255,0.5)'}`,
                    opacity: 0.9,
                    transform: 'translate(-50%, -50%)',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '--pulse-color': info.color,
                  }}
                  className={isSpike ? "pulse-node" : "live-pulse"}
                />
                
                {/* Dust Animation for high AQI */}
                {isSpike && (
                  <div className="dust-container" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                    <div className="dust-particle" style={{ '--tx': '30px', '--ty': '-40px', '--duration': '3s', '--delay': '0s' }}></div>
                    <div className="dust-particle" style={{ '--tx': '-20px', '--ty': '-35px', '--duration': '2.5s', '--delay': '0.5s' }}></div>
                    <div className="dust-particle" style={{ '--tx': '40px', '--ty': '10px', '--duration': '3.5s', '--delay': '1s' }}></div>
                    <div className="dust-particle" style={{ '--tx': '-30px', '--ty': '20px', '--duration': '2.8s', '--delay': '0.2s' }}></div>
                    <div className="dust-particle" style={{ '--tx': '10px', '--ty': '-50px', '--duration': '3.2s', '--delay': '0.8s' }}></div>
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
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 190, color: '#222' }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.85rem' }}>{popupInfo.name}</div>
                  <div style={{ color: info.color, fontWeight: 700, fontSize: '0.82rem', marginBottom: 6 }}>
                    AQI: {aqi ?? '—'} — {info.label}
                  </div>
                  {aqi >= 200 && spikeDriver && (
                    <div style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 4, padding: '3px 7px', marginBottom: 6, color: '#c00', fontWeight: 600 }}>
                      ⚡ {spikeDriver} spike driving AQI
                    </div>
                  )}
                  {reading && (
                    <>
                      <div style={{ fontSize: '0.75rem', color: '#444', display: 'flex', justifyContent: 'space-between' }}>
                        <span>PM1.0</span><span style={{ fontWeight: 600 }}>{reading.pm1_0_raw?.toFixed(1) ?? '—'} µg/m³</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: pm25Driving ? '#c00' : '#444', display: 'flex', justifyContent: 'space-between' }}>
                        <span>PM2.5 {pm25Driving ? '▲' : ''}</span><span style={{ fontWeight: 600 }}>{reading.pm2_5_corrected?.toFixed(1) ?? '—'} µg/m³</span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: pm10Driving ? '#c00' : '#444', display: 'flex', justifyContent: 'space-between' }}>
                        <span>PM10 {pm10Driving ? '▲' : ''}</span><span style={{ fontWeight: 600 }}>{reading.pm10_corrected?.toFixed(1) ?? '—'} µg/m³</span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: '0.73rem', color: '#666', borderTop: '1px solid #eee', paddingTop: 4 }}>
                        Source: {reading.classifier_label ?? '—'}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#666' }}>
                        Relay: {reading.relay_state ? '🔴 ON' : '⚫ OFF'}
                      </div>
                    </>
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
