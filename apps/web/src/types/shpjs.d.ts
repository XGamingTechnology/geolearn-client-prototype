declare module "shpjs" {
  type FeatureCollection = {
    type: "FeatureCollection";
    features: unknown[];
    fileName?: string;
  };

  export default function shp(input: ArrayBuffer): Promise<FeatureCollection | FeatureCollection[]>;
}
