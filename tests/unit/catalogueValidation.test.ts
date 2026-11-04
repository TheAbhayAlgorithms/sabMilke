import { describe, it, expect } from "vitest";
import {
  validateProductInput,
  validateSkuInput,
  CatalogueValidationError,
} from "@/server/domain/catalogueValidation";

describe("Catalogue & FSSAI Compliance Validation", () => {
  it("validates food product with valid 14-digit FSSAI license", () => {
    const valid = validateProductInput({
      name: "Toor Dal",
      brand: "Tata Sampann",
      categoryId: "cat_123",
      isFood: true,
      fssaiNumber: "10012011000133",
      hsnCode: "0713",
      gstRate: 0,
    });

    expect(valid.isFood).toBe(true);
    expect(valid.fssaiNumber).toBe("10012011000133");
  });

  it("throws CatalogueValidationError if food product lacks FSSAI", () => {
    expect(() =>
      validateProductInput({
        name: "Toor Dal",
        brand: "Tata Sampann",
        categoryId: "cat_123",
        isFood: true,
        fssaiNumber: "", // Missing FSSAI!
        hsnCode: "0713",
        gstRate: 0,
      })
    ).toThrow(CatalogueValidationError);

    expect(() =>
      validateProductInput({
        name: "Toor Dal",
        brand: "Tata Sampann",
        categoryId: "cat_123",
        isFood: true,
        fssaiNumber: undefined,
        hsnCode: "0713",
        gstRate: 0,
      })
    ).toThrow(/FSSAI license number is mandatory for all food products/);
  });

  it("throws CatalogueValidationError if food FSSAI is not 14 digits", () => {
    expect(() =>
      validateProductInput({
        name: "Toor Dal",
        brand: "Tata Sampann",
        categoryId: "cat_123",
        isFood: true,
        fssaiNumber: "12345", // too short
        hsnCode: "0713",
        gstRate: 0,
      })
    ).toThrow(/Must be a 14-digit registration number/);
  });

  it("allows non-food products without FSSAI", () => {
    const nonFood = validateProductInput({
      name: "Matic Detergent",
      brand: "Surf Excel",
      categoryId: "cat_det",
      isFood: false,
      fssaiNumber: null,
      hsnCode: "3402",
      gstRate: 18,
    });

    expect(nonFood.isFood).toBe(false);
    expect(nonFood.fssaiNumber).toBeNull();
  });

  it("validates SKU integer paise MRP and units", () => {
    const validSku = validateSkuInput({
      variantName: "5 kg Bag",
      packSize: 5,
      unit: "kg",
      mrpPaise: 49000,
    });
    expect(validSku.mrpPaise).toBe(49000);
    expect(validSku.unit).toBe("kg");

    // Float paise rejection (Rule 1)
    expect(() =>
      validateSkuInput({
        variantName: "5 kg Bag",
        packSize: 5,
        unit: "kg",
        mrpPaise: 490.5,
      })
    ).toThrow(CatalogueValidationError);

    // Invalid unit rejection
    expect(() =>
      validateSkuInput({
        variantName: "5 kg Bag",
        packSize: 5,
        unit: "invalid_unit",
        mrpPaise: 49000,
      })
    ).toThrow(/Allowed units/);
  });
});

