import { describe, it, expect } from "vitest";
import { parseCatalogueCsv } from "@/server/domain/csvParser";

describe("Catalogue CSV Import Parser & Error Reporter", () => {
  it("parses valid CSV with food and non-food items", () => {
    const csv = `category,brand,name,isFood,fssaiNumber,hsnCode,gstRate,variantName,packSize,unit,mrpPaise
Rice & Grains,India Gate,Classic Basmati Rice,true,10012011000123,1006,0,5 kg Bag,5,kg,65000
Household Cleaning,Lizol,Disinfectant Surface Cleaner,false,,3808,18,5 L Can,5,L,89000`;

    const result = parseCatalogueCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows).toHaveLength(2);
    expect(result.validRows[0].brand).toBe("India Gate");
    expect(result.validRows[0].fssaiNumber).toBe("10012011000123");
    expect(result.validRows[1].isFood).toBe(false);
    expect(result.validRows[1].fssaiNumber).toBeNull();
  });

  it("handles mrpRupees column by converting to integer paise", () => {
    const csv = `category,brand,name,isFood,fssaiNumber,hsnCode,gstRate,variantName,packSize,unit,mrpRupees
Atta & Flours,Aashirvaad,Shudh Chakki Whole Wheat Atta,true,10012011000126,1101,0,10 kg Bag,10,kg,490`;

    const result = parseCatalogueCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.validRows[0].mrpPaise).toBe(49000); // 490 * 100 paise
  });

  it("reports line-by-line validation errors with row numbers", () => {
    const csvWithErrors = `category,brand,name,isFood,fssaiNumber,hsnCode,gstRate,variantName,packSize,unit,mrpPaise
Rice & Grains,India Gate,Classic Basmati Rice,true,,1006,0,5 kg Bag,5,kg,65000
Atta & Flours,Fortune,Chakki Fresh Atta,true,10012011000127,1101,0,10 kg Bag,10,invalid_unit,46000
Edible Oils,Dhara,Mustard Oil,true,10012011000129,1514,5,5 L Can,5,L,invalid_price`;

    const result = parseCatalogueCsv(csvWithErrors);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors).toHaveLength(3);

    // Row 2: Missing FSSAI on food item
    expect(result.errors[0].row).toBe(2);
    expect(result.errors[0].message).toContain("FSSAI license number is mandatory");

    // Row 3: Invalid unit
    expect(result.errors[1].row).toBe(3);
    expect(result.errors[1].message).toContain("Allowed units");

    // Row 4: Invalid price
    expect(result.errors[2].row).toBe(4);
    expect(result.errors[2].message).toContain("MRP must be a positive integer in paise");
  });

  it("reports missing headers error", () => {
    const badHeaders = `category,brand,name
Rice,BrandA,ItemA`;

    const result = parseCatalogueCsv(badHeaders);
    expect(result.validRows).toHaveLength(0);
    expect(result.errors[0].message).toContain("Missing required header column");
  });
});
