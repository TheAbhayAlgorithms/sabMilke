export class CatalogueValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogueValidationError";
  }
}

export interface ValidateProductInput {
  name: string;
  brand: string;
  categoryId: string;
  isFood: boolean;
  fssaiNumber?: string | null;
  hsnCode: string;
  gstRate: number;
}

export interface ValidateSkuInput {
  variantName: string;
  packSize: number;
  unit: string;
  mrpPaise: number;
  marginPercent?: number;
  marginMinPaise?: number;
}

export function validateProductInput(input: ValidateProductInput): {
  name: string;
  brand: string;
  categoryId: string;
  isFood: boolean;
  fssaiNumber: string | null;
  hsnCode: string;
  gstRate: number;
} {
  const name = input.name?.trim();
  if (!name || name.length < 2) {
    throw new CatalogueValidationError("Product name is required (min 2 characters).");
  }

  const brand = input.brand?.trim();
  if (!brand || brand.length < 2) {
    throw new CatalogueValidationError("Brand name is required.");
  }

  const categoryId = input.categoryId?.trim();
  if (!categoryId) {
    throw new CatalogueValidationError("Category is required.");
  }

  const isFood = Boolean(input.isFood);
  let fssaiNumber: string | null = null;

  // RULE: Food SKU needs FSSAI
  if (isFood) {
    const rawFssai = input.fssaiNumber?.trim().replace(/\s+/g, "");
    if (!rawFssai) {
      throw new CatalogueValidationError(
        "FSSAI license number is mandatory for all food products."
      );
    }
    // FSSAI license numbers in India are 14 digits
    if (!/^\d{14}$/.test(rawFssai)) {
      throw new CatalogueValidationError(
        `Invalid FSSAI license number: '${rawFssai}'. Must be a 14-digit registration number.`
      );
    }
    fssaiNumber = rawFssai;
  }

  const hsnCode = input.hsnCode?.trim();
  if (!hsnCode || !/^\d{2,8}$/.test(hsnCode)) {
    throw new CatalogueValidationError(
      `Invalid HSN code: '${hsnCode}'. HSN code must be 2 to 8 digits.`
    );
  }

  const gstRate = Number(input.gstRate);
  const validGstRates = [0, 5, 12, 18, 28];
  if (!validGstRates.includes(gstRate)) {
    throw new CatalogueValidationError(
      `Invalid GST rate: ${gstRate}%. Allowed rates: 0%, 5%, 12%, 18%, 28%.`
    );
  }

  return {
    name,
    brand,
    categoryId,
    isFood,
    fssaiNumber,
    hsnCode,
    gstRate,
  };
}

export function validateSkuInput(input: ValidateSkuInput): {
  variantName: string;
  packSize: number;
  unit: string;
  mrpPaise: number;
  marginPercent: number;
  marginMinPaise: number;
} {
  const variantName = input.variantName?.trim();
  if (!variantName) {
    throw new CatalogueValidationError("Variant name is required (e.g. '5 kg Bag').");
  }

  const packSize = Number(input.packSize);
  if (isNaN(packSize) || packSize <= 0) {
    throw new CatalogueValidationError("Pack size must be a positive number.");
  }

  const unit = input.unit?.trim().toLowerCase();
  const allowedUnits = ["kg", "g", "l", "ml", "piece", "pack"];
  if (!unit || !allowedUnits.includes(unit)) {
    throw new CatalogueValidationError(
      `Invalid unit: '${unit}'. Allowed units: ${allowedUnits.join(", ")}.`
    );
  }

  const mrpPaise = Number(input.mrpPaise);
  if (!Number.isInteger(mrpPaise) || mrpPaise <= 0) {
    throw new CatalogueValidationError(
      `MRP must be a positive integer in paise (received: ${mrpPaise}). Never use floats for money.`
    );
  }

  const marginPercent = input.marginPercent !== undefined ? Number(input.marginPercent) : 5.0;
  if (isNaN(marginPercent) || marginPercent < 0 || marginPercent > 100) {
    throw new CatalogueValidationError("Platform margin % must be between 0 and 100.");
  }

  const marginMinPaise = input.marginMinPaise !== undefined ? Number(input.marginMinPaise) : 1000;
  if (!Number.isInteger(marginMinPaise) || marginMinPaise < 0) {
    throw new CatalogueValidationError("Minimum margin must be a non-negative integer in paise.");
  }

  return {
    variantName,
    packSize,
    unit,
    mrpPaise,
    marginPercent,
    marginMinPaise,
  };
}

