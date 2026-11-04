import {
  PrismaClient,
  Role,
  MembershipStatus,
  CycleStatus,
  OrderStatus,
  PurchaseOrderStatus,
  TicketStatus,
  WalletTxType,
  NotificationChannel,
} from "@prisma/client";
import { resetDatabase } from "./reset";

const prisma = new PrismaClient();

export async function seedDatabase() {
  await resetDatabase();
  console.log("🌱 Starting SocietyBuy database seed...");

  // 1. Create Demo Society
  const society = await prisma.society.create({
    data: {
      name: "Green Glen Heights",
      slug: "green-glen-heights",
      joinCode: "GGH100",
      addressLine: "Sarjapur Road, Bellandur",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560103",
      minSocietyValuePaise: 5000000, // Rs 50,000 min pool threshold
      minHouseholds: 10,
      rebatePercent: 1.5,
    },
  });

  // 2. Create Society Drop Point
  const dropPoint = await prisma.dropPoint.create({
    data: {
      societyId: society.id,
      name: "Clubhouse Main Drop Zone",
      description: "Basement 1 near Lift Lobby A",
      instructions: "Suppliers must check in with security gate 1 and proceed to B1 loading dock.",
    },
  });

  // 3. Create 100 Flats (Tower A: A-101 to A-510, Tower B: B-101 to B-510)
  const flats: { id: string; flatNumber: string }[] = [];
  for (let floor = 1; floor <= 5; floor++) {
    for (let unit = 1; unit <= 10; unit++) {
      const flatNumA = `A-${floor}${unit.toString().padStart(2, "0")}`;
      const flatA = await prisma.flat.create({
        data: {
          societyId: society.id,
          flatNumber: flatNumA,
          tower: "Tower A",
        },
      });
      flats.push({ id: flatA.id, flatNumber: flatA.flatNumber });

      const flatNumB = `B-${floor}${unit.toString().padStart(2, "0")}`;
      const flatB = await prisma.flat.create({
        data: {
          societyId: society.id,
          flatNumber: flatNumB,
          tower: "Tower B",
        },
      });
      flats.push({ id: flatB.id, flatNumber: flatB.flatNumber });
    }
  }
  console.log(`✓ Created ${flats.length} flats for society ${society.name}`);

  // 4. Create Platform Admin (Ananya Roy)
  const platformAdmin = await prisma.user.create({
    data: {
      phone: "9876543200",
      name: "Ananya Roy (Platform Admin)",
      isPhoneVerified: true,
      wallet: { create: { balancePaise: 0 } },
      memberships: {
        create: {
          societyId: society.id,
          flatId: flats[0].id,
          role: Role.PLATFORM_ADMIN,
          status: MembershipStatus.APPROVED,
        },
      },
    },
  });

  // 5. Create Captain (Vikram Sharma - Flat A-402)
  const flatA402 = flats.find((f) => f.flatNumber === "A-402") ?? flats[1];
  const captain = await prisma.user.create({
    data: {
      phone: "9876543210",
      name: "Vikram Sharma (Captain)",
      isPhoneVerified: true,
      wallet: { create: { balancePaise: 150000 } }, // Rs 1,500 captain reward
      memberships: {
        create: {
          societyId: society.id,
          flatId: flatA402.id,
          role: Role.CAPTAIN,
          status: MembershipStatus.APPROVED,
        },
      },
    },
  });

  // 6. Create Society Admin (Ramesh Gupta - Flat B-201)
  const flatB201 = flats.find((f) => f.flatNumber === "B-201") ?? flats[2];
  const societyAdmin = await prisma.user.create({
    data: {
      phone: "9876543299",
      name: "Ramesh Gupta (RWA Secretary)",
      isPhoneVerified: true,
      wallet: { create: { balancePaise: 0 } },
      memberships: {
        create: {
          societyId: society.id,
          flatId: flatB201.id,
          role: Role.SOCIETY_ADMIN,
          status: MembershipStatus.APPROVED,
        },
      },
    },
  });

  // 7. Create 30 Residents across 30 flats (phones: 9876543211 to 9876543240)
  const residentUsers = [];
  for (let i = 1; i <= 30; i++) {
    const phone = `98765432${(10 + i).toString()}`;
    const flat = flats[i + 2]; // unique flat
    const resident = await prisma.user.create({
      data: {
        phone,
        name: `Resident ${i} (${flat.flatNumber})`,
        isPhoneVerified: true,
        wallet: { create: { balancePaise: i * 5000 } }, // Some seed wallet credits
        memberships: {
          create: {
            societyId: society.id,
            flatId: flat.id,
            role: Role.RESIDENT,
            status: MembershipStatus.APPROVED,
          },
        },
      },
    });
    residentUsers.push(resident);
  }
  console.log(`✓ Created 30 residents, 1 captain, 1 RWA admin, 1 platform admin`);

  // 8. Create 3 Wholesale Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: "Apex Agro Wholesale",
      legalName: "Apex Agro Essentials Private Limited",
      gstin: "29ABCDE1234F1Z5",
      fssaiNumber: "11223344556677",
      phone: "9876543301",
      email: "orders@apexagro.in",
      rating: 4.8,
    },
  });

  const supplier2 = await prisma.supplier.create({
    data: {
      name: "Metro Bulk Essentials",
      legalName: "Metro Bulk Distribution India LLP",
      gstin: "29FGHIJ5678K1Z2",
      fssaiNumber: "11223344556688",
      phone: "9876543302",
      email: "wholesale@metrobulk.in",
      rating: 4.6,
    },
  });

  const supplier3 = await prisma.supplier.create({
    data: {
      name: "Bharat Staples Wholesalers",
      legalName: "Bharat Commodities Corporation Ltd",
      gstin: "29KLMNO9012P1Z9",
      fssaiNumber: "11223344556699",
      phone: "9876543303",
      email: "supply@bharatstaples.com",
      rating: 4.4,
    },
  });

  // Link Supplier Users for portal logins
  for (const [idx, s] of [supplier1, supplier2, supplier3].entries()) {
    const sUser = await prisma.user.create({
      data: {
        phone: s.phone,
        name: `${s.name} Rep`,
        isPhoneVerified: true,
      },
    });
    await prisma.supplierUser.create({
      data: {
        userId: sUser.id,
        supplierId: s.id,
      },
    });
  }

  // 9. Categories & 25 SKUs
  const categoriesData = [
    { name: "Rice & Grains", slug: "rice-grains" },
    { name: "Atta & Flours", slug: "atta-flours" },
    { name: "Edible Oils", slug: "edible-oils" },
    { name: "Ghee & Dairy", slug: "ghee-dairy" },
    { name: "Pulses & Dals", slug: "pulses-dals" },
    { name: "Sugar & Jaggery", slug: "sugar-jaggery" },
    { name: "Tea & Beverages", slug: "tea-beverages" },
    { name: "Laundry & Detergents", slug: "laundry-detergents" },
    { name: "Dishwash & Kitchen Care", slug: "dishwash-kitchen" },
    { name: "Household Cleaning", slug: "household-cleaning" },
  ];

  const categoryMap = new Map<string, string>();
  for (const cat of categoriesData) {
    const c = await prisma.category.create({ data: cat });
    categoryMap.set(cat.slug, c.id);
  }

  interface SeedSkuConfig {
    categorySlug: string;
    productName: string;
    brand: string;
    isFood: boolean;
    fssaiNumber: string | null;
    hsnCode: string;
    gstRate: number;
    variantName: string;
    packSize: number;
    unit: string;
    mrpPaise: number;
    baseWholesalePaise: number;
  }

  const skusConfig: SeedSkuConfig[] = [
    // Rice (3)
    {
      categorySlug: "rice-grains",
      productName: "Classic Basmati Rice",
      brand: "India Gate",
      isFood: true,
      fssaiNumber: "10012011000123",
      hsnCode: "1006",
      gstRate: 0,
      variantName: "5 kg Bag",
      packSize: 5,
      unit: "kg",
      mrpPaise: 65000, // Rs 650
      baseWholesalePaise: 48000,
    },
    {
      categorySlug: "rice-grains",
      productName: "Rozana Super Basmati",
      brand: "Daawat",
      isFood: true,
      fssaiNumber: "10012011000124",
      hsnCode: "1006",
      gstRate: 0,
      variantName: "5 kg Bag",
      packSize: 5,
      unit: "kg",
      mrpPaise: 47500, // Rs 475
      baseWholesalePaise: 35000,
    },
    {
      categorySlug: "rice-grains",
      productName: "Sona Masoori Raw Rice Premium",
      brand: "Royal Harvest",
      isFood: true,
      fssaiNumber: "10012011000125",
      hsnCode: "1006",
      gstRate: 0,
      variantName: "10 kg Bag",
      packSize: 10,
      unit: "kg",
      mrpPaise: 78000, // Rs 780
      baseWholesalePaise: 58000,
    },
    // Atta (2)
    {
      categorySlug: "atta-flours",
      productName: "Shudh Chakki Whole Wheat Atta",
      brand: "Aashirvaad",
      isFood: true,
      fssaiNumber: "10012011000126",
      hsnCode: "1101",
      gstRate: 0,
      variantName: "10 kg Bag",
      packSize: 10,
      unit: "kg",
      mrpPaise: 49000, // Rs 490
      baseWholesalePaise: 37500,
    },
    {
      categorySlug: "atta-flours",
      productName: "Chakki Fresh Atta",
      brand: "Fortune",
      isFood: true,
      fssaiNumber: "10012011000127",
      hsnCode: "1101",
      gstRate: 0,
      variantName: "10 kg Bag",
      packSize: 10,
      unit: "kg",
      mrpPaise: 46000, // Rs 460
      baseWholesalePaise: 35000,
    },
    // Oil (3)
    {
      categorySlug: "edible-oils",
      productName: "Sunlite Refined Sunflower Oil",
      brand: "Fortune",
      isFood: true,
      fssaiNumber: "10012011000128",
      hsnCode: "1512",
      gstRate: 5,
      variantName: "5 L Can",
      packSize: 5,
      unit: "L",
      mrpPaise: 75000, // Rs 750
      baseWholesalePaise: 56000,
    },
    {
      categorySlug: "edible-oils",
      productName: "Kachi Ghani Mustard Oil",
      brand: "Dhara",
      isFood: true,
      fssaiNumber: "10012011000129",
      hsnCode: "1514",
      gstRate: 5,
      variantName: "5 L Can",
      packSize: 5,
      unit: "L",
      mrpPaise: 82500, // Rs 825
      baseWholesalePaise: 62000,
    },
    {
      categorySlug: "edible-oils",
      productName: "Gold Pro Healthy Blend Oil",
      brand: "Saffola",
      isFood: true,
      fssaiNumber: "10012011000130",
      hsnCode: "1517",
      gstRate: 5,
      variantName: "5 L Can",
      packSize: 5,
      unit: "L",
      mrpPaise: 92000, // Rs 920
      baseWholesalePaise: 71000,
    },
    // Ghee (2)
    {
      categorySlug: "ghee-dairy",
      productName: "Pure Cow Ghee",
      brand: "Amul",
      isFood: true,
      fssaiNumber: "10012011000131",
      hsnCode: "0405",
      gstRate: 12,
      variantName: "1 L Tin",
      packSize: 1,
      unit: "L",
      mrpPaise: 65000, // Rs 650
      baseWholesalePaise: 53000,
    },
    {
      categorySlug: "ghee-dairy",
      productName: "Desi Ghee",
      brand: "Mother Dairy",
      isFood: true,
      fssaiNumber: "10012011000132",
      hsnCode: "0405",
      gstRate: 12,
      variantName: "1 L Pouch",
      packSize: 1,
      unit: "L",
      mrpPaise: 62000, // Rs 620
      baseWholesalePaise: 50500,
    },
    // Pulses & Dals (4)
    {
      categorySlug: "pulses-dals",
      productName: "Unpolished Toor Dal",
      brand: "Tata Sampann",
      isFood: true,
      fssaiNumber: "10012011000133",
      hsnCode: "0713",
      gstRate: 0,
      variantName: "2 kg Pouch",
      packSize: 2,
      unit: "kg",
      mrpPaise: 36000, // Rs 360
      baseWholesalePaise: 27000,
    },
    {
      categorySlug: "pulses-dals",
      productName: "Yellow Moong Dal Split",
      brand: "Tata Sampann",
      isFood: true,
      fssaiNumber: "10012011000134",
      hsnCode: "0713",
      gstRate: 0,
      variantName: "2 kg Pouch",
      packSize: 2,
      unit: "kg",
      mrpPaise: 31000, // Rs 310
      baseWholesalePaise: 23500,
    },
    {
      categorySlug: "pulses-dals",
      productName: "Chana Dal Premium",
      brand: "Tata Sampann",
      isFood: true,
      fssaiNumber: "10012011000135",
      hsnCode: "0713",
      gstRate: 0,
      variantName: "2 kg Pouch",
      packSize: 2,
      unit: "kg",
      mrpPaise: 24000, // Rs 240
      baseWholesalePaise: 18000,
    },
    {
      categorySlug: "pulses-dals",
      productName: "Besan 100% Chana Dal",
      brand: "Fortune",
      isFood: true,
      fssaiNumber: "10012011000136",
      hsnCode: "1106",
      gstRate: 0,
      variantName: "1 kg Pouch",
      packSize: 1,
      unit: "kg",
      mrpPaise: 11500, // Rs 115
      baseWholesalePaise: 8500,
    },
    // Sugar (2)
    {
      categorySlug: "sugar-jaggery",
      productName: "Pure & Hygienic Refined Sugar",
      brand: "Madhur",
      isFood: true,
      fssaiNumber: "10012011000137",
      hsnCode: "1701",
      gstRate: 5,
      variantName: "5 kg Bag",
      packSize: 5,
      unit: "kg",
      mrpPaise: 28000, // Rs 280
      baseWholesalePaise: 21500,
    },
    {
      categorySlug: "sugar-jaggery",
      productName: "Organic Jaggery Powder",
      brand: "24 Mantra",
      isFood: true,
      fssaiNumber: "10012011000138",
      hsnCode: "1701",
      gstRate: 5,
      variantName: "1 kg Pouch",
      packSize: 1,
      unit: "kg",
      mrpPaise: 12000, // Rs 120
      baseWholesalePaise: 9200,
    },
    // Tea (2)
    {
      categorySlug: "tea-beverages",
      productName: "Tea Gold Premium Leaf",
      brand: "Tata Tea",
      isFood: true,
      fssaiNumber: "10012011000139",
      hsnCode: "0902",
      gstRate: 5,
      variantName: "1 kg Pouch",
      packSize: 1,
      unit: "kg",
      mrpPaise: 55000, // Rs 550
      baseWholesalePaise: 43000,
    },
    {
      categorySlug: "tea-beverages",
      productName: "Natural Care Tea with 5 Ayurvedic Herbs",
      brand: "Red Label",
      isFood: true,
      fssaiNumber: "10012011000140",
      hsnCode: "0902",
      gstRate: 5,
      variantName: "1 kg Pouch",
      packSize: 1,
      unit: "kg",
      mrpPaise: 58000, // Rs 580
      baseWholesalePaise: 45000,
    },
    // Detergent (3) - Non-food
    {
      categorySlug: "laundry-detergents",
      productName: "Matic Front Load Washing Powder",
      brand: "Surf Excel",
      isFood: false,
      fssaiNumber: null,
      hsnCode: "3402",
      gstRate: 18,
      variantName: "4 kg Box",
      packSize: 4,
      unit: "kg",
      mrpPaise: 87500, // Rs 875
      baseWholesalePaise: 67000,
    },
    {
      categorySlug: "laundry-detergents",
      productName: "Matic Top Load Liquid Detergent",
      brand: "Ariel",
      isFood: false,
      fssaiNumber: null,
      hsnCode: "3402",
      gstRate: 18,
      variantName: "2 L Pouch",
      packSize: 2,
      unit: "L",
      mrpPaise: 49500, // Rs 495
      baseWholesalePaise: 38000,
    },
    {
      categorySlug: "laundry-detergents",
      productName: "Plus Extra Power Detergent Powder",
      brand: "Tide",
      isFood: false,
      fssaiNumber: null,
      hsnCode: "3402",
      gstRate: 18,
      variantName: "5 kg Bag",
      packSize: 5,
      unit: "kg",
      mrpPaise: 59900, // Rs 599
      baseWholesalePaise: 46000,
    },
    // Dishwash (2) - Non-food
    {
      categorySlug: "dishwash-kitchen",
      productName: "Dishwash Gel Lemon Concentrate",
      brand: "Vim",
      isFood: false,
      fssaiNumber: null,
      hsnCode: "3402",
      gstRate: 18,
      variantName: "2 L Can",
      packSize: 2,
      unit: "L",
      mrpPaise: 42000, // Rs 420
      baseWholesalePaise: 32000,
    },
    {
      categorySlug: "dishwash-kitchen",
      productName: "Dishwash Liquid Lime",
      brand: "Pril",
      isFood: false,
      fssaiNumber: null,
      hsnCode: "3402",
      gstRate: 18,
      variantName: "2 L Bottle",
      packSize: 2,
      unit: "L",
      mrpPaise: 39900, // Rs 399
      baseWholesalePaise: 30500,
    },
    // Surface & Cleaning (2) - Non-food
    {
      categorySlug: "household-cleaning",
      productName: "Disinfectant Surface & Floor Cleaner Citrus",
      brand: "Lizol",
      isFood: false,
      fssaiNumber: null,
      hsnCode: "3808",
      gstRate: 18,
      variantName: "5 L Can",
      packSize: 5,
      unit: "L",
      mrpPaise: 89000, // Rs 890
      baseWholesalePaise: 68000,
    },
    {
      categorySlug: "household-cleaning",
      productName: "Glass and Multi-Surface Cleaner",
      brand: "Colin",
      isFood: false,
      fssaiNumber: null,
      hsnCode: "3402",
      gstRate: 18,
      variantName: "2 L Pouch",
      packSize: 2,
      unit: "L",
      mrpPaise: 31000, // Rs 310
      baseWholesalePaise: 23500,
    },
  ];

  const seededSkus = [];
  const suppliers = [supplier1, supplier2, supplier3];

  for (const item of skusConfig) {
    const categoryId = categoryMap.get(item.categorySlug)!;
    const product = await prisma.product.create({
      data: {
        categoryId,
        name: item.productName,
        brand: item.brand,
        isFood: item.isFood,
        fssaiNumber: item.fssaiNumber,
        hsnCode: item.hsnCode,
        gstRate: item.gstRate,
      },
    });

    const sku = await prisma.sku.create({
      data: {
        productId: product.id,
        variantName: item.variantName,
        packSize: item.packSize,
        unit: item.unit,
        mrpPaise: item.mrpPaise,
        marginPercent: 5.0,
        marginMinPaise: 1000, // min Rs 10 platform margin
        imageUrl: `https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80`,
      },
    });
    seededSkus.push(sku);

    // Create 3 quotes from 3 suppliers with 3 tiers each
    for (const [sIndex, sup] of suppliers.entries()) {
      // Vary prices slightly across suppliers (Apex cheapest, then Metro, then Bharat)
      const supFactor = 1.0 + sIndex * 0.02;
      const basePrice = Math.round(item.baseWholesalePaise * supFactor);

      const quote = await prisma.supplierQuote.create({
        data: {
          supplierId: sup.id,
          skuId: sku.id,
          moq: 5,
          leadTimeDays: 2,
          validFrom: new Date(Date.now() - 7 * 86400000),
          validTo: new Date(Date.now() + 30 * 86400000),
          isActive: true,
        },
      });

      // 3 Slabs per quote:
      // Slab 1: 1-19 units (Tier 1)
      // Slab 2: 20-49 units (Tier 2, ~5% lower)
      // Slab 3: 50+ units (Tier 3, ~10% lower)
      await prisma.quoteSlab.createMany({
        data: [
          {
            quoteId: quote.id,
            minQty: 1,
            maxQty: 19,
            supplierPricePaise: basePrice,
          },
          {
            quoteId: quote.id,
            minQty: 20,
            maxQty: 49,
            supplierPricePaise: Math.round(basePrice * 0.94),
          },
          {
            quoteId: quote.id,
            minQty: 50,
            maxQty: null,
            supplierPricePaise: Math.round(basePrice * 0.88),
          },
        ],
      });
    }
  }
  console.log(`✓ Seeded ${seededSkus.length} SKUs with quotes and 3-tier slabs`);

  // 10. Seed Benchmark Prices for 10 SKUs (Zepto, Blinkit, Local Kirana)
  const benchmarkRetailers = ["Blinkit", "Zepto", "Local Kirana", "BigBasket"];
  for (let i = 0; i < 10; i++) {
    const sku = seededSkus[i];
    for (const retailer of benchmarkRetailers) {
      // Retail price typically between 93% and 100% of MRP
      const retailFactor = retailer === "Local Kirana" ? 0.98 : 0.94;
      await prisma.benchmarkPrice.create({
        data: {
          skuId: sku.id,
          retailerName: retailer,
          pricePaise: Math.round(sku.mrpPaise * retailFactor),
        },
      });
    }
  }
  console.log("✓ Seeded benchmark retail prices for 10 SKUs");

  // 11. Create 1 OPEN cycle for Green Glen Heights
  // Requirement: "one OPEN cycle at 40% of the first tier"
  // Tier 1 ends at 19 units, so 40% of tier 1 target (20 units) is 8 units.
  const cycle = await prisma.cycle.create({
    data: {
      societyId: society.id,
      name: "November 2026 Monthly Staples Pool",
      status: CycleStatus.OPEN,
      opensAt: new Date(Date.now() - 3 * 86400000),
      locksAt: new Date(Date.now() + 5 * 86400000), // locks in 5 days
      deliveryTargetDate: new Date(Date.now() + 8 * 86400000),
      minSocietyValuePaise: 5000000, // Rs 50,000
      minHouseholds: 10,
    },
  });

  // Seed CycleSku entries with 40% pooled quantity (8 units each)
  for (const sku of seededSkus) {
    // Guaranteed price = supplier price at slab 1 + 5% platform margin
    const margin = Math.max(Math.round(sku.mrpPaise * 0.05), sku.marginMinPaise);
    const guaranteedPrice = Math.min(Math.round(sku.mrpPaise * 0.82) + margin, sku.mrpPaise);

    await prisma.cycleSku.create({
      data: {
        cycleId: cycle.id,
        skuId: sku.id,
        pooledQuantity: 8, // 40% towards the 20-unit Tier 2 unlock!
        guaranteedPricePaise: guaranteedPrice,
      },
    });
  }

  // Seed sample orders for 8 residents to reach the 40% volume
  for (let i = 0; i < 8; i++) {
    const resident = residentUsers[i];
    const flat = flats[i + 3];
    const order = await prisma.order.create({
      data: {
        cycleId: cycle.id,
        societyId: society.id,
        flatId: flat.id,
        userId: resident.id,
        status: "CONFIRMED",
        totalGuaranteedPaise: 154000, // Rs 1,540
        pickupCode: (100000 + i * 1111).toString(),
        qrCodeToken: `sb_qr_${society.id}_${orderIdGen(i)}`,
        items: {
          create: [
            {
              skuId: seededSkus[0].id,
              quantity: 1,
              guaranteedPricePaise: 52000,
            },
            {
              skuId: seededSkus[3].id,
              quantity: 1,
              guaranteedPricePaise: 41000,
            },
            {
              skuId: seededSkus[5].id,
              quantity: 1,
              guaranteedPricePaise: 61000,
            },
          ],
        },
        payments: {
          create: {
            provider: "MOCK_RAZORPAY",
            providerPaymentId: `mock_pay_${Date.now()}_${i}`,
            providerOrderId: `mock_order_${Date.now()}_${i}`,
            amountPaise: 154000,
            status: "SUCCESS",
            paymentMethod: "UPI_INTENT",
            upiVpa: `${resident.phone}@okhdfcbank`,
          },
        },
      },
    });
  }

  console.log("✓ Created 1 OPEN cycle with 8 paid orders at 40% of tier 1");

  // 12. Create 1 Past CLOSED Cycle (October 2026) with POs, Goods Receipts, & Handovers
  const octCycle = await prisma.cycle.create({
    data: {
      societyId: society.id,
      name: "October 2026 Monthly Staples Pool",
      status: CycleStatus.CLOSED,
      opensAt: new Date(Date.now() - 35 * 86400000),
      locksAt: new Date(Date.now() - 15 * 86400000),
      deliveryTargetDate: new Date(Date.now() - 10 * 86400000),
      minSocietyValuePaise: 5000000,
      minHouseholds: 10,
    },
  });

  // Seed October handed-over orders for Resident 1 and others
  const octOrders = [];
  for (let i = 0; i < 10; i++) {
    const resident = residentUsers[i];
    const flat = flats[i + 3];
    const octOrder = await prisma.order.create({
      data: {
        cycleId: octCycle.id,
        societyId: society.id,
        flatId: flat.id,
        userId: resident.id,
        status: OrderStatus.HANDED_OVER,
        totalGuaranteedPaise: 245000, // Rs 2,450
        totalFinalPaise: 220000, // Dropped to Rs 2,200 via tier volume
        pickupCode: (200000 + i * 2222).toString(),
        qrCodeToken: `sb_qr_${society.id}_oct_${orderIdGen(i)}`,
        items: {
          create: [
            {
              skuId: seededSkus[0].id,
              quantity: 2,
              guaranteedPricePaise: 52000,
              finalPricePaise: 48000,
            },
            {
              skuId: seededSkus[1].id,
              quantity: 1,
              guaranteedPricePaise: 75000,
              finalPricePaise: 70000,
            },
            {
              skuId: seededSkus[4].id,
              quantity: 2,
              guaranteedPricePaise: 33000,
              finalPricePaise: 27000,
            },
          ],
        },
        payments: {
          create: {
            provider: "MOCK_RAZORPAY",
            providerPaymentId: `mock_pay_oct_${Date.now()}_${i}`,
            providerOrderId: `mock_order_oct_${Date.now()}_${i}`,
            amountPaise: 245000,
            status: "SUCCESS",
            paymentMethod: "UPI_INTENT",
            upiVpa: `${resident.phone}@okhdfcbank`,
          },
        },
        handoverEvents: {
          create: {
            handedOverById: captain.id,
            isPartial: false,
            collectedAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago (within 24h window)
          },
        },
      },
    });
    octOrders.push(octOrder);
  }

  // PO 1 to Apex Agro: 50 ordered, 50 received (100% fill rate)
  const po1 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-GGH-OCT-001",
      cycleId: octCycle.id,
      supplierId: supplier1.id,
      status: PurchaseOrderStatus.DELIVERED,
      totalAmountPaise: 2650000, // Rs 26,500
      expectedDelivery: new Date(Date.now() - 12 * 86400000),
      items: {
        create: [
          { skuId: seededSkus[0].id, orderedQuantity: 30, unitPricePaise: 45000, totalPricePaise: 1350000 },
          { skuId: seededSkus[1].id, orderedQuantity: 20, unitPricePaise: 65000, totalPricePaise: 1300000 },
        ],
      },
      goodsReceipts: {
        create: {
          receivedBy: captain.id,
          notes: "All 50 units inspected and received intact at drop point.",
          items: {
            create: [
              { skuId: seededSkus[0].id, expectedQty: 30, receivedQty: 30, shortQty: 0 },
              { skuId: seededSkus[1].id, expectedQty: 20, receivedQty: 20, shortQty: 0 },
            ],
          },
        },
      },
    },
  });

  // PO 2 to Metro Bulk: 40 ordered, 38 received, 2 short (38/40 = 95% fill rate)
  const po2 = await prisma.purchaseOrder.create({
    data: {
      poNumber: "PO-2026-GGH-OCT-002",
      cycleId: octCycle.id,
      supplierId: supplier2.id,
      status: PurchaseOrderStatus.DELIVERED,
      totalAmountPaise: 1000000, // Rs 10,000
      expectedDelivery: new Date(Date.now() - 11 * 86400000),
      items: {
        create: [
          { skuId: seededSkus[4].id, orderedQuantity: 40, unitPricePaise: 25000, totalPricePaise: 1000000 },
        ],
      },
      goodsReceipts: {
        create: {
          receivedBy: captain.id,
          notes: "2 units short on Toor Dal due to transit damage.",
          items: {
            create: [
              {
                skuId: seededSkus[4].id,
                expectedQty: 40,
                receivedQty: 38,
                shortQty: 2,
                discrepancyNote: "Outer carton was torn, 2 packs rejected",
              },
            ],
          },
        },
      },
    },
  });

  // Create short-supply refund for the 2 short units (Rs 600)
  await prisma.refund.create({
    data: {
      orderId: octOrders[4].id,
      amountPaise: 60000,
      reason: WalletTxType.SHORT_SUPPLY_REFUND,
      status: "SUCCESS",
    },
  });
  console.log("✓ Seeded October cycle with 10 handed-over orders, 2 POs, and goods receipts");

  // 13. Seed Tickets with 48h SLA & Resolution with Refund
  // Ticket 1: Resident 1, OPEN (created 2h ago, within 48h SLA timer)
  const ticket1 = await prisma.ticket.create({
    data: {
      orderId: octOrders[0].id,
      userId: residentUsers[0].id,
      category: "DAMAGED_PACK",
      subject: "Detergent pouch seal broken in transit",
      description: "The Surf Excel packet seal was torn upon collecting from the clubhouse drop point.",
      photoUrls: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500"],
      status: TicketStatus.OPEN,
      createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
      resolutionTarget: new Date(Date.now() + 30 * 86400000),
    },
  });

  // Ticket 2: Resident 2, ACKNOWLEDGED within 48h SLA
  const ticket2 = await prisma.ticket.create({
    data: {
      orderId: octOrders[1].id,
      userId: residentUsers[1].id,
      category: "MISSING_ITEM",
      subject: "1 packet of Tata Salt missing from my bundle",
      description: "Opened our bundle in Flat A-104 and Tata Salt 1kg was not included.",
      photoUrls: [],
      status: TicketStatus.ACKNOWLEDGED,
      createdAt: new Date(Date.now() - 18 * 3600000), // 18 hours ago
      acknowledgedAt: new Date(Date.now() - 4 * 3600000), // acknowledged 4 hours ago
      resolutionTarget: new Date(Date.now() + 30 * 86400000),
      messages: {
        create: {
          senderId: platformAdmin.id,
          message: "Thank you for notifying us. We verified with Captain Vikram at the drop point and located your salt packet in reserve. You can collect it anytime.",
        },
      },
    },
  });

  // Ticket 3: Resident 3, RESOLVED with Rs 150 Refund to Wallet
  const ticket3 = await prisma.ticket.create({
    data: {
      orderId: octOrders[2].id,
      userId: residentUsers[2].id,
      category: "QUALITY_ISSUE",
      subject: "Fortune Sunflower Oil tin had slight dent",
      description: "The can was slightly dented on the bottom edge. Oil is intact but difficult to pour.",
      photoUrls: ["https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500"],
      status: TicketStatus.RESOLVED,
      createdAt: new Date(Date.now() - 48 * 3600000), // 2 days ago
      acknowledgedAt: new Date(Date.now() - 36 * 3600000),
      resolvedAt: new Date(Date.now() - 12 * 3600000),
      resolutionNotes: "Apology refund of ₹150 credited to resident wallet for dented tin.",
      resolutionTarget: new Date(Date.now() + 28 * 86400000),
    },
  });

  // Create refund record and wallet credit for Ticket 3
  const ticketRefund = await prisma.refund.create({
    data: {
      orderId: octOrders[2].id,
      amountPaise: 15000, // Rs 150
      reason: WalletTxType.TICKET_REFUND,
      status: "SUCCESS",
    },
  });

  // Credit resident 3 wallet
  const res3Wallet = await prisma.wallet.findUnique({ where: { userId: residentUsers[2].id } });
  if (res3Wallet) {
    const newBal = res3Wallet.balancePaise + 15000;
    await prisma.wallet.update({
      where: { id: res3Wallet.id },
      data: { balancePaise: newBal },
    });
    await prisma.walletTransaction.create({
      data: {
        walletId: res3Wallet.id,
        type: WalletTxType.TICKET_REFUND,
        amountPaise: 15000,
        referenceId: ticket3.id,
        description: "Grievance Resolution: Apology refund of ₹150 for dented tin",
      },
    });
  }
  console.log("✓ Seeded 3 tickets (1 OPEN, 1 ACKNOWLEDGED, 1 RESOLVED with ₹150 wallet refund)");

  // 14. Seed Notifications for All 10 Triggers (Resident 1 & Captain)
  const primaryResident = residentUsers[0];
  const allTriggerNotifications = [
    {
      channel: NotificationChannel.IN_APP,
      title: "Monthly Pool Open: November 2026 Monthly Staples Pool",
      body: "Monthly grocery pool is now OPEN for Green Glen Heights! Add your staples before Nov 9 to lock in wholesale slab prices.",
      data: { trigger: "CYCLE_OPENED", societyId: society.id },
      isRead: false,
      sentAt: new Date(Date.now() - 24 * 3600000),
    },
    {
      channel: NotificationChannel.WHATSAPP,
      title: "Tier 2 Unlocked: Fortune Sunlite Refined Sunflower Oil 5 L!",
      body: "Society volume reached 40 units! Price dropped to ₹540. Everyone in the pool saves more!",
      data: { trigger: "TIER_UNLOCKED", skuName: "Fortune Sunlite Refined Sunflower Oil 5 L" },
      isRead: false,
      sentAt: new Date(Date.now() - 18 * 3600000),
    },
    {
      channel: NotificationChannel.SMS,
      title: "⏰ 24 Hours Left: November 2026 Monthly Staples Pool",
      body: "Order deadline locks in 24 hours! Complete your basket to pool demand and save on wholesale prices.",
      data: { trigger: "LOCK_REMINDER_24H" },
      isRead: false,
      sentAt: new Date(Date.now() - 14 * 3600000),
    },
    {
      channel: NotificationChannel.IN_APP,
      title: "⏰ 2 Hours Left: November 2026 Monthly Staples Pool",
      body: "Order deadline locks in 2 hours! Final chance to add rice, atta, oil, and ghee at pooled slab discounts.",
      data: { trigger: "LOCK_REMINDER_2H" },
      isRead: false,
      sentAt: new Date(Date.now() - 10 * 3600000),
    },
    {
      channel: NotificationChannel.IN_APP,
      title: "Payment Received: ₹1,540",
      body: "Your payment was confirmed. Order #100000 is pooled with your society. Pickup pass generated in your account.",
      data: { trigger: "PAYMENT_SUCCESS", orderId: octOrders[0].id },
      isRead: true,
      sentAt: new Date(Date.now() - 8 * 3600000),
    },
    {
      channel: NotificationChannel.WHATSAPP,
      title: "Cycle Locked: October 2026 Monthly Staples Pool",
      body: "Cycle locked! Winning wholesale quotes secured. You saved ₹250 from tier volume drops, credited to your wallet.",
      data: { trigger: "CYCLE_LOCKED", refundDeltaPaise: 25000 },
      isRead: true,
      sentAt: new Date(Date.now() - 6 * 3600000),
    },
    {
      channel: NotificationChannel.IN_APP,
      title: "Refund Credited: ₹150",
      body: "A refund of ₹150 has been credited to your SocietyBuy wallet. Reason: Ticket Resolution: QUALITY_ISSUE.",
      data: { trigger: "REFUND_ISSUED", amountPaise: 15000 },
      isRead: true,
      sentAt: new Date(Date.now() - 4 * 3600000),
    },
    {
      channel: NotificationChannel.IN_APP,
      title: "Truck Arrived at Main Clubhouse Gate",
      body: "Wholesale deliveries for October 2026 Monthly Staples Pool have arrived at Main Clubhouse Gate. Society Captain is inspecting quantities.",
      data: { trigger: "GOODS_ARRIVED" },
      isRead: true,
      sentAt: new Date(Date.now() - 3 * 3600000),
    },
    {
      channel: NotificationChannel.WHATSAPP,
      title: "Ready for Pickup! PIN: 101111",
      body: "Your order is packed and ready for collection at Main Clubhouse Gate. Show your 6-digit PIN or QR pass to the volunteer Captain.",
      data: { trigger: "READY_TO_COLLECT", pickupCode: "101111" },
      isRead: true,
      sentAt: new Date(Date.now() - 2 * 3600000),
    },
    {
      channel: NotificationChannel.IN_APP,
      title: "Support Ticket Update: ACKNOWLEDGED",
      body: "Ticket #TICK01 has been formally acknowledged by the SocietyBuy Grievance Officer within our 48-hour SLA. Investigation underway.",
      data: { trigger: "ISSUE_UPDATE", ticketId: ticket1.id, status: "ACKNOWLEDGED" },
      isRead: false,
      sentAt: new Date(Date.now() - 1 * 3600000),
    },
  ];

  for (const n of allTriggerNotifications) {
    await prisma.notification.create({
      data: {
        userId: primaryResident.id,
        channel: n.channel,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.isRead,
        sentAt: n.sentAt,
      },
    });
  }

  // Also seed Captain notifications for key events
  await prisma.notification.create({
    data: {
      userId: captain.id,
      channel: NotificationChannel.IN_APP,
      title: "Goods Arrived: Green Glen Heights",
      body: "Supplier trucks for October pool have arrived. Please verify delivery slips and mark goods receipt.",
      data: { trigger: "GOODS_ARRIVED" },
      isRead: false,
    },
  });

  console.log("✓ Seeded notifications covering all 10 triggers for Resident & Captain");
  console.log("🎉 Seed finished successfully!");
}

function orderIdGen(idx: number): string {
  return `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
}

if (require.main === module) {
  seedDatabase()
    .catch((e) => {
      console.error("❌ Seed error:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
