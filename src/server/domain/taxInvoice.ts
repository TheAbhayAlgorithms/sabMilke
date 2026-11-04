import { formatINR } from "@/lib/money";

export interface InvoiceLineItemInput {
  skuId: string;
  productName: string;
  variantName: string;
  hsnCode: string;
  gstRatePercent: number;
  quantity: number;
  unitPricePaise: number; // GST-inclusive final consumer price
  shortSuppliedQty?: number;
}

export interface ComputedInvoiceLine {
  skuId: string;
  productName: string;
  variantName: string;
  hsnCode: string;
  gstRatePercent: number;
  billedQuantity: number;
  grossAmountPaise: number;
  taxableAmountPaise: number;
  totalTaxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
}

export interface ComputedInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  isCreditNote: boolean;
  originalInvoiceNumber?: string;
  lines: ComputedInvoiceLine[];
  totalGrossPaise: number;
  totalTaxablePaise: number;
  totalCgstPaise: number;
  totalSgstPaise: number;
  totalIgstPaise: number;
  totalAmountPaise: number;
  legalEntity: {
    companyName: string;
    registeredAddress: string;
    gstin: string;
    pan: string;
    cin: string;
    fssaiLicense: string;
    grievanceOfficer: string;
    grievanceEmail: string;
  };
}

/**
 * Computes GST tax breakup from GST-inclusive gross prices in integer paise.
 * In India, consumer grocery prices are all-inclusive of statutory taxes.
 */
export function computeGstBreakup(
  grossAmountPaise: number,
  gstRatePercent: number,
  isInterState = false
): {
  taxableAmountPaise: number;
  totalTaxPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
} {
  if (grossAmountPaise <= 0 || gstRatePercent <= 0) {
    return {
      taxableAmountPaise: grossAmountPaise,
      totalTaxPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    };
  }

  // Taxable = (Gross * 10,000) / (10,000 + GST_Rate * 100)
  const rateFactor = Math.round(gstRatePercent * 100);
  const taxableAmountPaise = Math.round(
    (grossAmountPaise * 10000) / (10000 + rateFactor)
  );
  const totalTaxPaise = grossAmountPaise - taxableAmountPaise;

  if (isInterState) {
    return {
      taxableAmountPaise,
      totalTaxPaise,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: totalTaxPaise,
    };
  }

  const cgstPaise = Math.floor(totalTaxPaise / 2);
  const sgstPaise = totalTaxPaise - cgstPaise;

  return {
    taxableAmountPaise,
    totalTaxPaise,
    cgstPaise,
    sgstPaise,
    igstPaise: 0,
  };
}

/**
 * Generates an itemized resident tax invoice snapshot with statutory placeholders marked TODO_LEGAL.
 */
export function generateTaxInvoiceData(
  invoiceNumber: string,
  items: InvoiceLineItemInput[],
  isInterState = false,
  isCreditNote = false,
  originalInvoiceNumber?: string
): ComputedInvoice {
  const lines: ComputedInvoiceLine[] = [];
  let totalGross = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

  for (const item of items) {
    const netQty = Math.max(0, item.quantity - (item.shortSuppliedQty ?? 0));
    if (netQty <= 0 && !isCreditNote) continue;

    const qty = isCreditNote ? item.shortSuppliedQty ?? item.quantity : netQty;
    const grossAmountPaise = qty * item.unitPricePaise;
    const tax = computeGstBreakup(grossAmountPaise, item.gstRatePercent, isInterState);

    lines.push({
      skuId: item.skuId,
      productName: item.productName,
      variantName: item.variantName,
      hsnCode: item.hsnCode || "TODO_LEGAL_HSN",
      gstRatePercent: item.gstRatePercent,
      billedQuantity: qty,
      grossAmountPaise,
      taxableAmountPaise: tax.taxableAmountPaise,
      totalTaxPaise: tax.totalTaxPaise,
      cgstPaise: tax.cgstPaise,
      sgstPaise: tax.sgstPaise,
      igstPaise: tax.igstPaise,
    });

    totalGross += grossAmountPaise;
    totalTaxable += tax.taxableAmountPaise;
    totalCgst += tax.cgstPaise;
    totalSgst += tax.sgstPaise;
    totalIgst += tax.igstPaise;
  }

  return {
    invoiceNumber,
    invoiceDate: new Date().toISOString(),
    isCreditNote,
    originalInvoiceNumber,
    lines,
    totalGrossPaise: totalGross,
    totalTaxablePaise: totalTaxable,
    totalCgstPaise: totalCgst,
    totalSgstPaise: totalSgst,
    totalIgstPaise: totalIgst,
    totalAmountPaise: totalGross,
    legalEntity: {
      companyName: "SocietyBuy Technologies Private Limited (TODO_LEGAL)",
      registeredAddress:
        "Tower C, Outer Ring Road, Bellandur, Bengaluru, Karnataka 560103 (TODO_LEGAL)",
      gstin: "29AAAAA0000A1Z5 (TODO_LEGAL)",
      pan: "AAAAA0000A (TODO_LEGAL)",
      cin: "U72200KA2026PTC000000 (TODO_LEGAL)",
      fssaiLicense: "11223344556677 (TODO_LEGAL)",
      grievanceOfficer: "Shri R. K. Nair, Grievance Redressal Officer (TODO_LEGAL)",
      grievanceEmail: "grievance@societybuy.in (TODO_LEGAL)",
    },
  };
}

