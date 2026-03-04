// CSV parser and validator for landslide dataset uploads
import { DatasetRow } from "./model";

// Required columns for the landslide dataset
const REQUIRED_COLUMNS = [
  "rainfall",
  "slope",
  "soil_type",
  "elevation",
  "ndvi",
  "distance_to_river",
  "landslide_label",
];

// Map alternative column names to standard names
const COLUMN_ALIASES: Record<string, string> = {
  rainfall_mm: "rainfall",
  slope_angle: "slope",
  soil_saturation: "ndvi", // proxy
  vegetation_cover: "ndvi",
  earthquake_activity: "elevation", // proxy
  proximity_to_water: "distance_to_river",
  landslide: "landslide_label",
  soil_type_gravel: "soil_type",
  soil_type_sand: "soil_type",
  soil_type_silt: "soil_type",
};

export interface ParseResult {
  success: boolean;
  data: DatasetRow[];
  columns: string[];
  rowCount: number;
  error?: string;
  mappedColumns: Record<string, string>;
}

/**
 * Parse a CSV string into structured dataset rows
 * Handles column name mapping and validation
 */
export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) {
    return { success: false, data: [], columns: [], rowCount: 0, error: "CSV must have at least a header and one data row", mappedColumns: {} };
  }

  // Parse header
  const rawHeaders = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));

  // Try to map columns
  const mappedColumns: Record<string, string> = {};
  const headerMap: Record<number, string> = {};

  for (let i = 0; i < rawHeaders.length; i++) {
    const raw = rawHeaders[i];
    if (REQUIRED_COLUMNS.includes(raw)) {
      headerMap[i] = raw;
      mappedColumns[raw] = raw;
    } else if (COLUMN_ALIASES[raw]) {
      // Only map if we haven't already mapped this target
      if (!Object.values(headerMap).includes(COLUMN_ALIASES[raw])) {
        headerMap[i] = COLUMN_ALIASES[raw];
        mappedColumns[raw] = COLUMN_ALIASES[raw];
      }
    }
  }

  // Check for soil_type encoding columns
  const soilTypeGravelIdx = rawHeaders.indexOf("soil_type_gravel");
  const soilTypeSandIdx = rawHeaders.indexOf("soil_type_sand");
  const soilTypeSiltIdx = rawHeaders.indexOf("soil_type_silt");
  const hasSoilEncoding = soilTypeGravelIdx >= 0 || soilTypeSandIdx >= 0 || soilTypeSiltIdx >= 0;

  // Parse data rows
  const data: DatasetRow[] = [];
  for (let lineIdx = 1; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx].trim();
    if (!line) continue;
    const values = line.split(",").map((v) => v.trim());

    const row: Partial<DatasetRow> = {};

    for (const [idxStr, field] of Object.entries(headerMap)) {
      const idx = parseInt(idxStr);
      const val = parseFloat(values[idx]);
      if (!isNaN(val)) {
        (row as any)[field] = val;
      }
    }

    // Handle soil type encoding
    if (hasSoilEncoding) {
      const gravel = soilTypeGravelIdx >= 0 ? parseFloat(values[soilTypeGravelIdx]) || 0 : 0;
      const sand = soilTypeSandIdx >= 0 ? parseFloat(values[soilTypeSandIdx]) || 0 : 0;
      const silt = soilTypeSiltIdx >= 0 ? parseFloat(values[soilTypeSiltIdx]) || 0 : 0;
      if (gravel === 1) row.soil_type = 0;
      else if (sand === 1) row.soil_type = 1;
      else if (silt === 1) row.soil_type = 2;
      else row.soil_type = 3; // clay/other
    }

    // Default missing fields with reasonable values
    if (row.rainfall === undefined && row.slope !== undefined) row.rainfall = 150;
    if (row.slope === undefined) row.slope = 25;
    if (row.soil_type === undefined) row.soil_type = 1;
    if (row.elevation === undefined) row.elevation = 500;
    if (row.ndvi === undefined) row.ndvi = 0.4;
    if (row.distance_to_river === undefined) row.distance_to_river = 2;
    if (row.landslide_label === undefined) continue; // skip rows without label

    data.push(row as DatasetRow);
  }

  if (data.length === 0) {
    return { success: false, data: [], columns: rawHeaders, rowCount: 0, error: "No valid data rows found. Check column names.", mappedColumns };
  }

  return {
    success: true,
    data,
    columns: rawHeaders,
    rowCount: data.length,
    mappedColumns,
  };
}
