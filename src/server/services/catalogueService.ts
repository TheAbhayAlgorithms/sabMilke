import { prisma } from "@/server/db/client";
import { recordAuditLog } from "@/server/services/auditService";
import { validateProductInput, validateSkuInput } from "@/server/domain/catalogueValidation";
import { parseCatalogueCsv, CsvImportResult } from "@/server/domain/csvParser";

export async function createCategory(actorId: string, name: string) {
  const cleanName = name.trim();
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const category = await prisma.category.create({
    data: {
      name: cleanName,
      slug,
    },
  });

  await recordAuditLog({
    actorId,
    action: "CATEGORY_CREATED",
    entity: "Category",
    entityId: category.id,
    after: { name: category.name, slug: category.slug },
  });

  return category;
}

export async function createProductAndSku(
  actorId: string,
  data: {
    categoryId: string;
    name: string;
    brand: string;
    isFood: boolean;
    fssaiNumber?: string | null;
    hsnCode: string;
    gstRate: number;
    variantName: string;
    packSize: number;
    unit: string;
    mrpPaise: number;
    marginPercent?: number;
    marginMinPaise?: number;
  }
) {
  const validatedProduct = validateProductInput({
    name: data.name,
    brand: data.brand,
    categoryId: data.categoryId,
    isFood: data.isFood,
    fssaiNumber: data.fssaiNumber,
    hsnCode: data.hsnCode,
    gstRate: data.gstRate,
  });

  const validatedSku = validateSkuInput({
    variantName: data.variantName,
    packSize: data.packSize,
    unit: data.unit,
    mrpPaise: data.mrpPaise,
    marginPercent: data.marginPercent,
    marginMinPaise: data.marginMinPaise,
  });

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        categoryId: validatedProduct.categoryId,
        name: validatedProduct.name,
        brand: validatedProduct.brand,
        isFood: validatedProduct.isFood,
        fssaiNumber: validatedProduct.fssaiNumber,
        hsnCode: validatedProduct.hsnCode,
        gstRate: validatedProduct.gstRate,
      },
    });

    const sku = await tx.sku.create({
      data: {
        productId: product.id,
        variantName: validatedSku.variantName,
        packSize: validatedSku.packSize,
        unit: validatedSku.unit,
        mrpPaise: validatedSku.mrpPaise,
        marginPercent: validatedSku.marginPercent,
        marginMinPaise: validatedSku.marginMinPaise,
      },
    });

    await recordAuditLog(
      {
        actorId,
        action: "PRODUCT_AND_SKU_CREATED",
        entity: "Sku",
        entityId: sku.id,
        after: {
          productId: product.id,
          skuId: sku.id,
          brand: product.brand,
          name: product.name,
          mrpPaise: sku.mrpPaise,
          isFood: product.isFood,
          fssaiNumber: product.fssaiNumber,
        },
      },
      tx
    );

    return { product, sku };
  });
}

export async function importCatalogueFromCsv(
  actorId: string,
  csvText: string
): Promise<CsvImportResult & { importedCount: number }> {
  const parseResult = parseCatalogueCsv(csvText);

  if (parseResult.validRows.length === 0) {
    return {
      ...parseResult,
      importedCount: 0,
    };
  }

  let importedCount = 0;

  for (const row of parseResult.validRows) {
    // Find or create category
    const slug = row.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    let category = await prisma.category.findUnique({ where: { slug } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: row.categoryName,
          slug,
        },
      });
    }

    // Check if product exists under brand and name, or create
    let product = await prisma.product.findFirst({
      where: {
        brand: row.brand,
        name: row.name,
      },
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          categoryId: category.id,
          name: row.name,
          brand: row.brand,
          isFood: row.isFood,
          fssaiNumber: row.fssaiNumber,
          hsnCode: row.hsnCode,
          gstRate: row.gstRate,
        },
      });
    }

    // Check if SKU exists
    const existingSku = await prisma.sku.findFirst({
      where: {
        productId: product.id,
        variantName: row.variantName,
      },
    });

    if (!existingSku) {
      await prisma.sku.create({
        data: {
          productId: product.id,
          variantName: row.variantName,
          packSize: row.packSize,
          unit: row.unit,
          mrpPaise: row.mrpPaise,
          marginPercent: 5.0,
          marginMinPaise: 1000,
        },
      });
      importedCount++;
    }
  }

  await recordAuditLog({
    actorId,
    action: "CATALOGUE_CSV_IMPORTED",
    entity: "Catalogue",
    entityId: "bulk-import",
    after: {
      totalRows: parseResult.totalRows,
      validRowsCount: parseResult.validRows.length,
      errorsCount: parseResult.errors.length,
      newSkusImported: importedCount,
    },
  });

  return {
    ...parseResult,
    importedCount,
  };
}

