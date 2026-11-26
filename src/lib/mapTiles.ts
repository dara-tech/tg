export type CartoBasemapStyle = 'voyager' | 'dark_all' | 'light_all';

export function latLngToTile(lat: number, lon: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const xFloat = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yFloat = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const x = Math.floor(xFloat);
  const y = Math.floor(yFloat);
  return {
    x,
    y,
    fracX: xFloat - x,
    fracY: yFloat - y,
  };
}

export function getCartoTileUrl(
  x: number,
  y: number,
  zoom: number,
  style: CartoBasemapStyle = 'voyager'
): string {
  // CartoDB CDN returns an API-key watermark for cb1_ keys and OSM blocks localhost referrers;
  // ArcGIS World Street Map / Light Gray Base serves crisp street tiles with CORS enabled.
  if (style === 'light_all') {
    return `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/${zoom}/${y}/${x}`;
  }
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zoom}/${y}/${x}`;
}
