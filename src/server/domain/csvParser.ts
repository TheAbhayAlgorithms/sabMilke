import { validateProductInput, validateSkuInput, CatalogueValidationError } from "./catalogueValidation";

export interface ValidatedCatalogueRow {
  rowNumber: number;
  categoryName: string;
  brand: string;
  name: string;
  isFood: boolean;
  fssaiNumber: string | null;
  hsnCode: string;
  gstRate: number;
  variantName: string;
  packSize: number;
  unit: string;
  mrpPaise: number;
}

export interface CsvRowError {
  row: number;
  field?: string;
  message: string;
  raw: string;
}

export interface CsvImportResult {
  totalRows: number;
  validRows: ValidatedCatalogueRow[];
  errors: CsvRowError[];
}

/**
 * Splits a CSV line handling quoted fields with internal commas.
 */
function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map((col) => col.replace(/^["']|["']$/g, "").trim());
}

/**
 * Parses and validates CSV content for bulk catalogue import.
 *
 * Expected header columns:
 * category,brand,name,isFood,fssaiNumber,hsnCode,gstRate,variantName,packSize,unit,mrpPaise
 */
export function parseCatalogueCsv(csvText: string): CsvImportResult {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      totalRows: 0,
      validRows: [],
      errors: [
        {
          row: 1,
          message: "CSV file is empty or missing data rows.",
          raw: csvText,
        },
      ],
    };
  }

  const headerLine = lines[0];
  const headers = splitCsvLine(headerLine).map((h) => h.toLowerCase());

  const requiredHeaders = [
    "category",
    "brand",
    "name",
    "isfood",
    "fssainumber",
    "hsncode",
    "gstrate",
    "variantname",
    "packsize",
    "unit",
    "mrppaise",
  ];

  const missingHeaders = requiredHeaders.filter(
    (rh) => !headers.includes(rh) && !(rh === "mrppaise" && headers.includes("mrprupees"))
  );

  if (missingHeaders.length > 0) {
    return {
      totalRows: lines.length - 1,
      validRows: [],
      errors: [
        {
          row: 1,
          message: `Missing required header column(s): ${missingHeaders.join(", ")}`,
          raw: headerLine,
        },
      ],
    };
  }

  const validRows: ValidatedCatalogueRow[] = [];
  const errors: CsvRowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const rowNumber = i + 1; // 1-indexed for human readability
    const columns = splitCsvLine(rawLine);

    if (columns.length < headers.length) {
      errors.push({
        row: rowNumber,
        message: `Expected ${headers.length} columns but found ${columns.length}.`,
        raw: rawLine,
      });
      continue;
    }

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = columns[idx] ?? "";
    });

    try {
      const categoryName = rowObj["category"]?.trim();
      if (!categoryName) {
        throw new CatalogueValidationError("Category is required.");
      }

      const isFood =
        rowObj["isfood"]?.toLowerCase() === "true" ||
        rowObj["isfood"]?.toLowerCase() === "yes" ||
        rowObj["isfood"] === "1";

      const validatedProduct = validateProductInput({
        name: rowObj["name"],
        brand: rowObj["brand"],
        categoryId: "placeholder", // will be matched to DB category by name
        isFood,
        fssaiNumber: rowObj["fssainumber"] || null,
        hsnCode: rowObj["hsncode"],
        gstRate: Number(rowObj["gstrate"]),
      });

      // Handle mrpPaise or mrpRupees
      let mrpPaise: number;
      if (rowObj["mrppaise"]) {
        mrpPaise = Number(rowObj["mrppaise"]);
      } else if (rowObj["mrprupees"]) {
        const rupees = Number(rowObj["mrprupees"]);
        if (!Number.isInteger(rupees)) {
          throw new CatalogueValidationError(
            `mrpRupees must be an integer, received: ${rowObj["mrprupees"]}. Rule 1: No float money.`
          );
        }
        mrpPaise = rupees * 100;
      } else {
        throw new CatalogueValidationError("Either mrpPaise or mrpRupees must be specified.");
      }

      const validatedSku = validateSkuInput({
        variantName: rowObj["variantname"],
        packSize: Number(rowObj["packsize"]),
        unit: rowObj["unit"],
        mrpPaise,
      });

      validRows.push({
        rowNumber,
        categoryName,
        brand: validatedProduct.brand,
        name: validatedProduct.name,
        isFood: validatedProduct.isFood,
        fssaiNumber: validatedProduct.fssaiNumber,
        hsnCode: validatedProduct.hsnCode,
        gstRate: validatedProduct.gstRate,
        variantName: validatedSku.variantName,
        packSize: validatedSku.packSize,
        unit: validatedSku.unit,
        mrpPaise: validatedSku.mrpPaise,
      });
    } catch (err: unknown) {
      errors.push({
        row: rowNumber,
        message: err instanceof Error ? err.message : "Validation failed",
        raw: rawLine,
      });
    }
  }

  return {
    totalRows: lines.length - 1,
    validRows,
    errors,
  };
}
