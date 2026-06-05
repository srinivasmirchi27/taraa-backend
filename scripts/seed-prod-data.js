/**
 * Production seed — categories, banners, products
 * Usage: NODE_ENV=production node scripts/seed-prod-data.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.production') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Schemas ──────────────────────────────────────────────────────────────────

const CategorySchema = new mongoose.Schema(
  { name: String, slug: String, image: String, description: String, isActive: { type: Boolean, default: true }, sortOrder: { type: Number, default: 0 } },
  { timestamps: true }
);

const BannerSchema = new mongoose.Schema(
  { title: String, subtitle: String, image: String, link: String, type: { type: String, default: 'hero' }, isActive: { type: Boolean, default: true }, sortOrder: Number, badge: String, ctaText: String, cloudinaryPublicId: String },
  { timestamps: true }
);

const ProductSchema = new mongoose.Schema(
  { name: String, category: String, price: Number, originalPrice: Number, discount: Number, image: String, images: [String], badge: String, description: String, inStock: { type: Boolean, default: true }, rating: { type: Number, default: 0 }, reviews: { type: Number, default: 0 }, isNew: Boolean, isBestSeller: Boolean, cloudinaryPublicId: String },
  { timestamps: true }
);

// ── Seed Data ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Necklaces',  slug: 'necklaces',  description: 'Statement & everyday necklaces', sortOrder: 1 },
  { name: 'Earrings',   slug: 'earrings',   description: 'Drops, hoops & studs',           sortOrder: 2 },
  { name: 'Bracelets',  slug: 'bracelets',  description: 'Bangles, cuffs & chains',        sortOrder: 3 },
  { name: 'Rings',      slug: 'rings',      description: 'Stackable & statement rings',    sortOrder: 4 },
  { name: 'Anklets',    slug: 'anklets',    description: 'Dainty & beaded anklets',        sortOrder: 5 },
  { name: 'Sets',       slug: 'sets',       description: 'Matching jewellery sets',        sortOrder: 6 },
];

const PRODUCTS = [
  { filename: 'necklace-choker.jpg',       name: 'Velvet Choker Necklace',      category: 'Necklaces', price: 299,  originalPrice: 499,  discount: 40, description: 'Trendy velvet choker with a gold-tone pendant — ideal for casual and party wear.',                   isNew: true,  isBestSeller: false, badge: 'New' },
  { filename: 'necklace-emerald.jpg',      name: 'Emerald Stone Necklace',      category: 'Necklaces', price: 1299, originalPrice: 1999, discount: 35, description: 'Statement emerald green stone necklace set in a gold-tone base — pure elegance.',                   isNew: false, isBestSeller: true,  badge: 'Bestseller' },
  { filename: 'necklace-pearl-statement.jpg', name: 'Pearl Statement Necklace', category: 'Necklaces', price: 999,  originalPrice: 1599, discount: 38, description: 'Multi-layered pearl statement necklace — a showstopper for bridal and ethnic looks.',              isNew: false, isBestSeller: true,  badge: 'Bestseller' },
  { filename: 'earrings-heart-crystal.jpg',name: 'Heart Crystal Earrings',      category: 'Earrings',  price: 399,  originalPrice: 649,  discount: 39, description: 'Sweet heart-shaped crystal drop earrings with a sparkling finish.',                               isNew: true,  isBestSeller: false, badge: 'New' },
  { filename: 'earrings-hoop.jpg',         name: 'Classic Hoop Earrings',       category: 'Earrings',  price: 349,  originalPrice: 549,  discount: 36, description: 'Timeless gold-tone hoop earrings — a wardrobe staple for every woman.',                           isNew: false, isBestSeller: true,  badge: 'Bestseller' },
  { filename: 'earrings-pearl-drop.jpg',   name: 'Pearl Drop Earrings',         category: 'Earrings',  price: 449,  originalPrice: 699,  discount: 36, description: 'Elegant faux-pearl drop earrings with a gold-plated hook — perfect for weddings.',               isNew: false, isBestSeller: false, badge: null },
  { filename: 'bracelet-gold.jpg',         name: 'Gold Chain Bracelet',         category: 'Bracelets', price: 899,  originalPrice: 1299, discount: 31, description: 'Classic gold-tone chain bracelet that pairs beautifully with any outfit.',                        isNew: false, isBestSeller: true,  badge: 'Bestseller' },
  { filename: 'ring-butterfly.jpg',        name: 'Butterfly Ring',              category: 'Rings',     price: 299,  originalPrice: 499,  discount: 40, description: 'Dainty adjustable butterfly ring with crystal wings — light, pretty and fun.',                   isNew: true,  isBestSeller: false, badge: 'New' },
  { filename: 'ring-seashell.jpg',         name: 'Seashell Ring',               category: 'Rings',     price: 249,  originalPrice: 399,  discount: 38, description: 'Boho-style adjustable seashell ring — brings the beach vibe everywhere you go.',                  isNew: true,  isBestSeller: false, badge: 'New' },
  { filename: 'anklet-crystal.jpg',        name: 'Crystal Anklet',              category: 'Anklets',   price: 499,  originalPrice: 799,  discount: 38, description: 'Delicate crystal anklet with shimmering stones — perfect for beach and festive looks.',            isNew: true,  isBestSeller: false, badge: 'New' },
];

const IMAGES_DIR = path.resolve(__dirname, '../../taraa/public/images/products');

// ── Helpers ───────────────────────────────────────────────────────────────────

async function uploadImage(filePath, publicId, folder = 'products') {
  try {
    const existing = await cloudinary.api.resource(`${folder}/${publicId}`);
    console.log(`    [skip cloudinary] ${folder}/${publicId}`);
    return existing.secure_url;
  } catch {
    const result = await cloudinary.uploader.upload(filePath, { folder, public_id: publicId, overwrite: false });
    return result.secure_url;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  const uri = process.env.MONGODB_URI;
  console.log(`\nConnecting to: ${uri.replace(/:([^@]+)@/, ':****@')}\n`);
  await mongoose.connect(uri);

  const Category = mongoose.model('Category', CategorySchema);
  const Banner    = mongoose.model('Banner',   BannerSchema);
  const Product   = mongoose.model('Product',  ProductSchema);

  // ── 1. Categories ──────────────────────────────────────────────────────────
  console.log('── Categories ─────────────────────────────');
  for (const cat of CATEGORIES) {
    const exists = await Category.findOne({ slug: cat.slug });
    if (exists) { console.log(`  [skip] ${cat.name}`); continue; }
    await Category.create(cat);
    console.log(`  [created] ${cat.name}`);
  }

  // ── 2. Products ────────────────────────────────────────────────────────────
  console.log('\n── Products ───────────────────────────────');
  const productImages = {};
  for (const p of PRODUCTS) {
    const exists = await Product.findOne({ name: p.name });
    if (exists) { console.log(`  [skip] ${p.name}`); productImages[p.filename] = exists.image; continue; }

    const filePath = path.join(IMAGES_DIR, p.filename);
    if (!fs.existsSync(filePath)) { console.warn(`  [missing image] ${p.filename}`); continue; }

    const publicId = path.parse(p.filename).name;
    console.log(`  [uploading] ${p.filename}…`);
    const imageUrl = await uploadImage(filePath, publicId);
    productImages[p.filename] = imageUrl;

    await Product.create({
      name: p.name, category: p.category, price: p.price,
      originalPrice: p.originalPrice, discount: p.discount,
      description: p.description, image: imageUrl, images: [],
      inStock: true, isNew: p.isNew, isBestSeller: p.isBestSeller,
      badge: p.badge || undefined, rating: 0, reviews: 0,
      cloudinaryPublicId: `products/${publicId}`,
    });
    console.log(`  [created] ${p.name} — ₹${p.price}`);
  }

  // ── 3. Banners ─────────────────────────────────────────────────────────────
  console.log('\n── Banners ────────────────────────────────');
  const bannerCount = await Banner.countDocuments();
  if (bannerCount > 0) {
    console.log(`  [skip] ${bannerCount} banners already exist`);
  } else {
    const heroImage   = productImages['necklace-emerald.jpg']       || productImages['necklace-choker.jpg'];
    const promoImage  = productImages['earrings-hoop.jpg']          || productImages['bracelet-gold.jpg'];
    const saleImage   = productImages['necklace-pearl-statement.jpg']|| productImages['ring-butterfly.jpg'];

    const BANNERS = [
      { title: 'New Collection', subtitle: 'Premium anti-tarnish jewellery starting at ₹99', image: heroImage,  link: '/collection', type: 'hero',        isActive: true, sortOrder: 1, badge: 'New Arrivals', ctaText: 'Shop Now' },
      { title: 'Up to 40% Off',  subtitle: 'Limited time offer on bestselling jewellery',    image: promoImage, link: '/collection', type: 'promotional', isActive: true, sortOrder: 2, badge: 'Sale',         ctaText: 'Grab Deal' },
      { title: 'Bridal Sets',    subtitle: 'Curated sets for your special day',              image: saleImage,  link: '/collection', type: 'hero',        isActive: true, sortOrder: 3, badge: 'Bridal',       ctaText: 'Explore' },
    ];

    for (const b of BANNERS) {
      if (!b.image) { console.warn(`  [skip] No image for banner "${b.title}"`); continue; }
      await Banner.create(b);
      console.log(`  [created] ${b.title} (${b.type})`);
    }
  }

  console.log('\n✓ Seed complete\n');
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
