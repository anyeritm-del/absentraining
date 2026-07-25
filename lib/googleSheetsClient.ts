import { google, sheets_v4 } from "googleapis";

const SHEETS_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

let cachedAuth: InstanceType<typeof google.auth.JWT> | null = null;
let cachedClient: sheets_v4.Sheets | null = null;

export function getGoogleAuth() {
  if (cachedAuth) return cachedAuth;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY environment variables"
    );
  }
  cachedAuth = new google.auth.JWT({
    email,
    key: key.replace(/\\n/g, "\n"),
    scopes: SHEETS_SCOPES,
  });
  return cachedAuth;
}

export function getSheetsClient(): sheets_v4.Sheets {
  if (!cachedClient) {
    cachedClient = google.sheets({ version: "v4", auth: getGoogleAuth() });
  }
  return cachedClient;
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEET_ID environment variable");
  return id;
}

export type SheetRow = Record<string, string>;

function columnLetter(n: number): string {
  let s = "";
  let num = n;
  while (num > 0) {
    const m = (num - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

async function ensureTabExists(tab: string) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === tab);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tab } } }],
      },
    });
  }
}

/**
 * Creates the tab (if missing) and its header row (if missing). If the tab
 * already has headers but is missing some of the requested columns (e.g.
 * after adding a new field to a repository), the missing ones are appended
 * after the existing columns — existing columns and data keep their position.
 */
export async function ensureHeaders(tab: string, headers: string[]) {
  await ensureTabExists(tab);
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!1:1`,
  });
  const existing = res.data.values?.[0] ?? [];
  if (existing.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [headers] },
    });
    return;
  }
  const missing = headers.filter((h) => !existing.includes(h));
  if (missing.length > 0) {
    const startCol = existing.length + 1;
    const endCol = existing.length + missing.length;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!${columnLetter(startCol)}1:${columnLetter(endCol)}1`,
      valueInputOption: "RAW",
      requestBody: { values: [missing] },
    });
  }
}

/** Reads all rows of a tab, keyed by the header row. Empty rows are skipped. */
export async function getRows(tab: string): Promise<SheetRow[]> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:Z`,
  });
  const values = res.data.values ?? [];
  if (values.length < 2) return [];
  const [headers, ...rows] = values;
  return rows
    .filter((row) => row.some((cell) => cell !== undefined && cell !== ""))
    .map((row) => {
      const obj: SheetRow = {};
      headers.forEach((h: string, i: number) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });
}

/** Appends a new row at the end of a tab, in header order. */
export async function appendRow(
  tab: string,
  headers: string[],
  row: SheetRow
) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const values = headers.map((h) => row[h] ?? "");
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:Z`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [values] },
  });
}

/** Finds the row matching idColumn === id and overwrites it in place. */
export async function updateRowById(
  tab: string,
  headers: string[],
  idColumn: string,
  id: string,
  row: SheetRow
) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:Z`,
  });
  const values = res.data.values ?? [];
  const idIdx = values[0]?.indexOf(idColumn) ?? -1;
  if (idIdx === -1) throw new Error(`Column ${idColumn} not found in ${tab}`);
  const rowIndex = values.findIndex(
    (r: string[], i: number) => i > 0 && r[idIdx] === id
  );
  if (rowIndex === -1) {
    throw new Error(`Row with ${idColumn}=${id} not found in ${tab}`);
  }
  const rowValues = headers.map((h) => row[h] ?? "");
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${rowIndex + 1}:${columnLetter(headers.length)}${
      rowIndex + 1
    }`,
    valueInputOption: "RAW",
    requestBody: { values: [rowValues] },
  });
}

/** Deletes the row matching idColumn === id. */
export async function deleteRowById(
  tab: string,
  idColumn: string,
  id: string
) {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheet = meta.data.sheets?.find(
    (s) => s.properties?.title === tab
  );
  const sheetId = sheet?.properties?.sheetId;
  if (sheetId === undefined || sheetId === null) {
    throw new Error(`Tab ${tab} not found`);
  }
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A:Z`,
  });
  const values = res.data.values ?? [];
  const idIdx = values[0]?.indexOf(idColumn) ?? -1;
  if (idIdx === -1) throw new Error(`Column ${idColumn} not found in ${tab}`);
  const rowIndex = values.findIndex(
    (r: string[], i: number) => i > 0 && r[idIdx] === id
  );
  if (rowIndex === -1) {
    throw new Error(`Row with ${idColumn}=${id} not found in ${tab}`);
  }
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
}
