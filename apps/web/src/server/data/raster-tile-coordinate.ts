export function normalizeRasterTileCoordinate(value:string,allowPngSuffix=false):string|null{
  const normalized=allowPngSuffix&&value.endsWith(".png")?value.slice(0,-4):value;
  return /^\d+$/.test(normalized)?normalized:null;
}
