/**
 * Bulk seed — uploads all images from a local folder to Cloudinary (products/ folder)
 * and inserts product documents into MongoDB.
 *
 * Usage:
 *   node scripts/seed-products.js
 *   node scripts/seed-products.js --folder /path/to/images   (default: taraa/public/images/products)
 *   NODE_ENV=staging node scripts/seed-products.js
 *
 * Safe to re-run: skips images already uploaded (matched by public_id) and
 * skips products whose name already exists in the DB.
 */

const path = require('path');
const fs = require('fs');

// ── Load env ────────────────────────────────────────────────────────────────
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${env}`) });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// ── Cloudinary config ───────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Mongoose schema (mirrors product.schema.ts) ─────────────────────────────
const ProductSchema = new mongoose.Schema(
  {
    name:               { type: String, required: true, trim: true },
    category:           { type: String, required: true },
    price:              { type: Number, required: true },
    originalPrice:      { type: Number, required: true },
    discount:           { type: Number, default: 0 },
    image:              { type: String, required: true },
    images:             { type: [String], default: [] },
    badge:              String,
    description:        { type: String, required: true },
    inStock:            { type: Boolean, default: true },
    rating:             { type: Number, default: 0 },
    reviews:            { type: Number, default: 0 },
    isNew:              { type: Boolean, default: false },
    isBestSeller:       { type: Boolean, default: false },
    cloudinaryPublicId: String,
  },
  { timestamps: true },
);

// ── Product catalogue — maps filename → product data ────────────────────────
// Edit prices / descriptions / badges as needed before running.
const PRODUCT_CATALOGUE = {
  'anklet-crystal.jpg': {
    name:          'Crystal Anklet',
    category:      'Anklets',
    price:         499,
    originalPrice: 799,
    discount:      38,
    description:   'Delicate crystal anklet with shimmering stones — perfect for beach and festive looks.',
    isNew:         true,
    isBestSeller:  false,
    badge:         'New',
  },
  'bracelet-gold.jpg': {
    name:          'Gold Chain Bracelet',
    category:      'Bracelets',
    price:         899,
    originalPrice: 1299,
    discount:      31,
    description:   'Classic gold-tone chain bracelet that pairs beautifully with any outfit.',
    isNew:         false,
    isBestSeller:  true,
    badge:         'Bestseller',
  },
  'earrings-heart-crystal.jpg': {
    name:          'Heart Crystal Earrings',
    category:      'Earrings',
    price:         399,
    originalPrice: 649,
    discount:      39,
    description:   'Sweet heart-shaped crystal drop earrings with a sparkling finish.',
    isNew:         true,
    isBestSeller:  false,
    badge:         'New',
  },
  'earrings-hoop.jpg': {
    name:          'Classic Hoop Earrings',
    category:      'Earrings',
    price:         349,
    originalPrice: 549,
    discount:      36,
    description:   'Timeless gold-tone hoop earrings — a wardrobe staple for every woman.',
    isNew:         false,
    isBestSeller:  true,
    badge:         'Bestseller',
  },
  'earrings-pearl-drop.jpg': {
    name:          'Pearl Drop Earrings',
    category:      'Earrings',
    price:         449,
    originalPrice: 699,
    discount:      36,
    description:   'Elegant faux-pearl drop earrings with a gold-plated hook — perfect for weddings.',
    isNew:         false,
    isBestSeller:  false,
    badge:         null,
  },
  'necklace-choker.jpg': {
    name:          'Velvet Choker Necklace',
    category:      'Necklaces',
    price:         299,
    originalPrice: 499,
    discount:      40,
    description:   'Trendy velvet choker with a gold-tone pendant — ideal for casual and party wear.',
    isNew:         true,
    isBestSeller:  false,
    badge:         'New',
  },
  'necklace-emerald.jpg': {
    name:          'Emerald Stone Necklace',
    category:      'Necklaces',
    price:         1299,
    originalPrice: 1999,
    discount:      35,
    description:   'Statement emerald green stone necklace set in a gold-tone base — pure elegance.',
    isNew:         false,
    isBestSeller:  true,
    badge:         'Bestseller',
  },
  'necklace-pearl-statement.jpg': {
    name:          'Pearl Statement Necklace',
    category:      'Necklaces',
    price:         999,
    originalPrice: 1599,
    discount:      38,
    description:   'Multi-layered pearl statement necklace — a showstopper for bridal and ethnic looks.',
    isNew:         false,
    isBestSeller:  true,
    badge:         'Bestseller',
  },
  'ring-butterfly.jpg': {
    name:          'Butterfly Ring',
    category:      'Rings',
    price:         299,
    originalPrice: 499,
    discount:      40,
    description:   'Dainty adjustable butterfly ring with crystal wings — light, pretty and fun.',
    isNew:         true,
    isBestSeller:  false,
    badge:         'New',
  },
  'ring-seashell.jpg': {
    name:          'Seashell Ring',
    category:      'Rings',
    price:         249,
    originalPrice: 399,
    discount:      38,
    description:   'Boho-style adjustable seashell ring — brings the beach vibe everywhere you go.',
    isNew:         true,
    isBestSeller:  false,
    badge:         'New',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function maskUri(uri) {
  return uri.replace(/:([^@]+)@/, ':****@');
}

async function uploadToCloudinary(filePath, publicIdBase) {
  // Reuse existing asset if already uploaded (idempotent)
  try {
    const existing = await cloudinary.api.resource(`products/${publicIdBase}`);
    console.log(`  [skip] already on Cloudinary: products/${publicIdBase}`);
    return { secureUrl: existing.secure_url, publicId: existing.public_id };
  } catch {
    // Not found → upload
  }

  const result = await cloudinary.uploader.upload(filePath, {
    folder: 'products',
    public_id: publicIdBase,
    resource_type: 'image',
    overwrite: false,
  });
  return { secureUrl: result.secure_url, publicId: result.public_id };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function seed() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI not set. Check your .env.development file.');
    process.exit(1);
  }

  // Image folder — default to frontend public/images/products
  const argIdx = process.argv.indexOf('--folder');
  const imagesDir = argIdx !== -1
    ? path.resolve(process.argv[argIdx + 1])
    : path.resolve(__dirname, '../../taraa/public/images/products');

  if (!fs.existsSync(imagesDir)) {
    console.error(`ERROR: Images folder not found: ${imagesDir}`);
    console.error('Pass a custom path with --folder /path/to/images');
    process.exit(1);
  }

  const imageFiles = fs.readdirSync(imagesDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));

  console.log(`\nEnvironment  : ${env}`);
  console.log(`MongoDB      : ${maskUri(MONGODB_URI)}`);
  console.log(`Images folder: ${imagesDir}`);
  console.log(`Images found : ${imageFiles.length}\n`);

  await mongoose.connect(MONGODB_URI);
  const Product = mongoose.model('Product', ProductSchema);

  let created = 0;
  let skipped = 0;
  let unknown = 0;

  for (const filename of imageFiles) {
    const meta = PRODUCT_CATALOGUE[filename];
    if (!meta) {
      console.warn(`  [unknown] No catalogue entry for "${filename}" — skipping`);
      unknown++;
      continue;
    }

    // Skip if product name already exists
    const exists = await Product.findOne({ name: meta.name });
    if (exists) {
      console.log(`  [skip] "${meta.name}" already in DB`);
      skipped++;
      continue;
    }

    // Upload image to Cloudinary
    const filePath = path.join(imagesDir, filename);
    const publicIdBase = path.parse(filename).name; // e.g. "bracelet-gold"
    console.log(`  [upload] ${filename} → Cloudinary products/${publicIdBase}`);
    const { secureUrl, publicId } = await uploadToCloudinary(filePath, publicIdBase);
    console.log(`           ✓ ${secureUrl}`);

    // Insert product
    const badge = meta.badge || undefined;
    await Product.create({
      name:               meta.name,
      category:           meta.category,
      price:              meta.price,
      originalPrice:      meta.originalPrice,
      discount:           meta.discount,
      description:        meta.description,
      image:              secureUrl,
      images:             [],
      inStock:            true,
      isNew:              meta.isNew,
      isBestSeller:       meta.isBestSeller,
      badge,
      cloudinaryPublicId: publicId,
      rating:             0,
      reviews:            0,
    });
    console.log(`           ✓ Saved to DB as "${meta.name}" (${meta.category})\n`);
    created++;
  }

  console.log('─────────────────────────────────────');
  console.log(`Created : ${created}`);
  console.log(`Skipped : ${skipped}`);
  console.log(`Unknown : ${unknown}`);
  console.log('─────────────────────────────────────\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
