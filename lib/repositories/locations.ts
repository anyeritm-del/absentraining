import { nanoid } from "nanoid";
import {
  appendRow,
  deleteRowById,
  ensureHeaders,
  getRows,
  SheetRow,
  updateRowById,
} from "../googleSheetsClient";

export const LOCATIONS_TAB = "Locations";
export const LOCATIONS_HEADERS = ["id", "name", "lat", "lng", "radius_m", "created_at"];

export interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
  created_at: string;
}

function parseLocation(row: SheetRow): Location {
  return {
    id: row.id,
    name: row.name,
    lat: Number(row.lat),
    lng: Number(row.lng),
    radius_m: Number(row.radius_m),
    created_at: row.created_at,
  };
}

function serializeLocation(location: Location): SheetRow {
  return {
    id: location.id,
    name: location.name,
    lat: String(location.lat),
    lng: String(location.lng),
    radius_m: String(location.radius_m),
    created_at: location.created_at,
  };
}

export async function ensureLocationsHeaders() {
  await ensureHeaders(LOCATIONS_TAB, LOCATIONS_HEADERS);
}

export async function listLocations(): Promise<Location[]> {
  const rows = await getRows(LOCATIONS_TAB);
  return rows.map(parseLocation);
}

export async function getLocationById(id: string): Promise<Location | null> {
  const list = await listLocations();
  return list.find((l) => l.id === id) ?? null;
}

export async function createLocation(data: {
  name: string;
  lat: number;
  lng: number;
  radius_m: number;
}): Promise<Location> {
  const location: Location = {
    id: nanoid(10),
    ...data,
    created_at: new Date().toISOString(),
  };
  await appendRow(LOCATIONS_TAB, LOCATIONS_HEADERS, serializeLocation(location));
  return location;
}

export async function updateLocation(
  id: string,
  data: { name: string; lat: number; lng: number; radius_m: number }
): Promise<Location> {
  const existing = await getLocationById(id);
  if (!existing) throw new Error("Location not found");
  const updated: Location = { ...existing, ...data };
  await updateRowById(LOCATIONS_TAB, LOCATIONS_HEADERS, "id", id, serializeLocation(updated));
  return updated;
}

export async function deleteLocation(id: string): Promise<void> {
  await deleteRowById(LOCATIONS_TAB, "id", id);
}
