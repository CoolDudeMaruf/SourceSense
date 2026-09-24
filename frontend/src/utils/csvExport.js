// CSV export utility — matches original hardware schema + quality_flag column

export function exportReadingsToCSV(readings, filename = 'sourcesense_export.csv') {
  const headers = [
    'Timestamp', 'Temperature_C', 'Humidity_Percent',
    'PM1.0', 'PM2.5', 'PM10',
    'MQ2', 'MQ4', 'MQ6', 'MQ7', 'MQ8', 'MQ131', 'MQ135',
    'PM2.5_corrected', 'PM10_corrected',
    'AQI', 'AQI_category',
    'classifier_label', 'classifier_confidence',
    'relay_state', 'quality_flags',
  ];

  const rows = readings.map(r => [
    r.timestamp,
    r.temperature_c ?? '',
    r.humidity_percent ?? '',
    r.pm1_0_raw ?? '',
    r.pm2_5_raw ?? '',
    r.pm10_raw ?? '',
    r.mq2 ?? '', r.mq4 ?? '', r.mq6 ?? '', r.mq7 ?? '', r.mq8 ?? '', r.mq131 ?? '', r.mq135 ?? '',
    r.pm2_5_corrected ?? '',
    r.pm10_corrected ?? '',
    r.aqi ?? '',
    r.aqi_category ?? '',
    r.classifier_label ?? '',
    r.classifier_confidence ?? '',
    r.relay_state ? 'true' : 'false',
    JSON.stringify(r.quality_flags ?? {}),
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
