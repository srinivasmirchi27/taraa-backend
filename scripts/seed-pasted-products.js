/**
 * Seed the 38 product photos (provided by the user) into taraa_prod.
 * Uploads each image to Cloudinary, then creates a Product (idempotent by name).
 * Flat pricing: price ₹129, originalPrice ₹259, discount 50%.
 *
 * Usage: NODE_ENV=production node scripts/seed-pasted-products.js
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

const ProductSchema = new mongoose.Schema(
  {
    name: String, category: String, price: Number, originalPrice: Number, discount: Number,
    image: String, images: [String], badge: String, description: String,
    inStock: { type: Boolean, default: true }, rating: { type: Number, default: 0 },
    reviews: { type: Number, default: 0 }, isNew: Boolean, isBestSeller: Boolean,
    cloudinaryPublicId: String,
  },
  { timestamps: true }
);

const DL = '/Users/srinivasarao/Downloads';
const PRICE = 129, ORIGINAL = 259, DISCOUNT = 50;

// file → { name, category }
const ITEMS = [
  { file: '0cb4f259-f32e-4261-9622-186719960e44.JPG', name: 'Kundan Pearl Drop Chandbali Earrings', category: 'Earrings' },
  { file: '0f59f3d5-3002-4c70-8555-c20ea5e34cb4.JPG', name: 'Blue Floral CZ Stud Earrings',          category: 'Earrings' },
  { file: '1a58e562-17a1-4f31-9813-93847fe5687d.JPG', name: 'Kemp Stone Jhumka Earrings',            category: 'Earrings' },
  { file: '1d9ea8bc-658d-4d44-b32e-fd714605ef6b.JPG', name: 'Temple Lakshmi Chandbali Earrings',     category: 'Earrings' },
  { file: '5ccbe19d-5e8c-4000-afb7-24c7bb558dd9.JPG', name: 'Antique Gold Filigree Pearl Earrings',  category: 'Earrings' },
  { file: '6ca24716-0624-40d7-96b1-19f6751ea12d.JPG', name: 'Gold Pearl Jhumka Earrings',            category: 'Earrings' },
  { file: '9ed08058-45da-4afa-9ae9-efdde58bbeea.JPG', name: 'Lakshmi Temple Ruby Pendant',           category: 'Necklaces' },
  { file: '15dcffaf-e232-4ce8-a420-4312c82d0e3a.JPG', name: 'Multicolour CZ Floral Stud Earrings',   category: 'Earrings' },
  { file: '17a8bc53-cc7e-4954-9144-6be06b08361f.JPG', name: 'Rose Gold Sunflower CZ Studs',          category: 'Earrings' },
  { file: '26c17322-fdd9-40ef-a9d8-b4895a10f1e1.JPG', name: 'Oxidised Boho Drop Earrings',           category: 'Earrings' },
  { file: '38cf31cd-cc23-4007-81bb-1d15e26d50dd.JPG', name: 'Green Kundan Jhumka Cluster Earrings',  category: 'Earrings' },
  { file: '62e0a06d-3b07-4f03-9fac-9ed4f7589a8d.JPG', name: 'Champagne Stone Chandbali Earrings',    category: 'Earrings' },
  { file: '91d23f59-7944-431e-a269-294be10ff106.JPG', name: 'Crystal Threader Tassel Earrings',      category: 'Earrings' },
  { file: '94b212ff-dd98-4ba8-b99f-cf82fd020333.JPG', name: 'CZ Drum Tassel Drop Earrings',          category: 'Earrings' },
  { file: '143ff571-a0c6-4a5f-8cb9-3c69a25b8f9f.JPG', name: 'Solitaire CZ Pendant Chain',           category: 'Necklaces' },
  { file: '446b5be3-54cd-4f7c-aa8c-240bf177a227.JPG', name: 'Rose Motif Pendant Chain',             category: 'Necklaces' },
  { file: '494edbce-28d0-416b-a3e5-6df5a4e52acb.JPG', name: 'Lakshmi Temple Jhumka Earrings',        category: 'Earrings' },
  { file: '529dc264-fd2e-4858-8fd0-d2713219b18e.JPG', name: 'Ruby Red Chandbali Earrings',           category: 'Earrings' },
  { file: '672a42f9-13bb-4eb3-b69b-d1c889e80593.JPG', name: 'Kemp Ruby Chandbali Earrings',          category: 'Earrings' },
  { file: 'c90e9335-c2f3-408c-9d3f-643869fb2f05.JPG', name: 'Ruby Twin Jhumka Earrings',             category: 'Earrings' },
  { file: '24253ddc-89b1-4ba1-95fc-b3ae948a0f41.JPG', name: 'Navratna Peacock Drop Earrings',        category: 'Earrings' },
  { file: '54094bc3-0c40-4d41-b8fc-7d95f111fb70.JPG', name: 'Pearl Drop Halo Stud Earrings',         category: 'Earrings' },
  { file: '54696ccc-ca77-4eaf-9933-656a18d3112c.JPG', name: 'Antique Oval Statement Earrings',       category: 'Earrings' },
  { file: '82887e98-8a4f-4b2f-8729-2ee1fd2c9a81.JPG', name: 'Maroon Stone Jhumka Earrings',          category: 'Earrings' },
  { file: '88458dcf-f33a-4f66-9671-60cad8b0cd2e.JPG', name: 'Pearl Pendant Gold Chain',             category: 'Necklaces' },
  { file: '54202452-9f42-4a55-bac1-2ea7b2e70185.JPG', name: 'Lakshmi Pearl Jhumka Earrings',         category: 'Earrings' },
  { file: 'a6353b8d-d6e3-4fe8-8fab-d8799354824c.JPG', name: 'Heart CZ Pendant Chain',               category: 'Necklaces' },
  { file: 'b3b1bff6-04db-403f-8067-dd6df0e9e3a3.JPG', name: 'Oxidised Jali Chandbali Earrings',      category: 'Earrings' },
  { file: 'b3e24988-da63-4bff-8c74-5492da9aa515.JPG', name: 'Gold Tassel Triangle Earrings',         category: 'Earrings' },
  { file: 'b60f99d5-87cc-4750-a565-c7ea9ed3231d.JPG', name: 'Pearl & Crystal Stud Set',              category: 'Earrings' },
  { file: 'bc4ef243-fbeb-49d0-99fd-9c08b60f6273.JPG', name: 'Elephant Kemp Jhumka Earrings',         category: 'Earrings' },
  { file: 'bf7aed5d-bb86-44df-ba0a-44bffa68d6e6.JPG', name: 'Champagne Pearl Chandbali Earrings',    category: 'Earrings' },
  { file: 'd0c3e955-f613-4cce-996a-5fb354c74bab.JPG', name: 'Emerald & Ruby Chandbali Earrings',     category: 'Earrings' },
  { file: 'f0b7881e-1b9e-41e4-a66f-d3182181b947.JPG', name: 'Snowflake CZ Pendant Necklace',         category: 'Necklaces' },
  { file: '72e24c58-ed89-4fbe-957d-af126c398150.JPG', name: 'Peacock CZ Chandbali Earrings',         category: 'Earrings' },
  { file: '4548ab6d-1fd2-4dfd-8480-ef4c6f82fd91.JPG', name: 'Ruby Pearl Floral Stud Earrings',       category: 'Earrings' },
  { file: '9adce20c-0c01-4fd3-aa2a-98c0a49ac4b5.JPG', name: 'Oxidised Kemp Square Earrings',         category: 'Earrings' },
  { file: 'c5a92146-2e70-4854-bf74-d2f1ffea4917.JPG', name: 'Emerald Kemp Chandbali Earrings',       category: 'Earrings' },
];

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function uploadImage(filePath, publicId, folder = 'products') {
  try {
    const existing = await cloudinary.api.resource(`${folder}/${publicId}`);
    return existing.secure_url;
  } catch {
    const result = await cloudinary.uploader.upload(filePath, { folder, public_id: publicId, overwrite: false });
    return result.secure_url;
  }
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  console.log(`\nConnecting to: ${uri.replace(/:([^@]+)@/, ':****@')}\n`);
  await mongoose.connect(uri);
  const Product = mongoose.model('Product', ProductSchema);

  let created = 0, skipped = 0, missing = 0;
  for (const item of ITEMS) {
    const exists = await Product.findOne({ name: item.name });
    if (exists) { console.log(`  [skip] ${item.name}`); skipped++; continue; }

    const filePath = path.join(DL, item.file);
    if (!fs.existsSync(filePath)) { console.warn(`  [missing] ${item.file}`); missing++; continue; }

    const publicId = slugify(item.name);
    console.log(`  [uploading] ${item.name}…`);
    const imageUrl = await uploadImage(filePath, publicId);

    await Product.create({
      name: item.name, category: item.category,
      price: PRICE, originalPrice: ORIGINAL, discount: DISCOUNT,
      description: '', image: imageUrl, images: [],
      inStock: true, isNew: true, isBestSeller: false,
      rating: 0, reviews: 0, cloudinaryPublicId: `products/${publicId}`,
    });
    console.log(`  [created] ${item.name} (${item.category}) — ₹${PRICE}`);
    created++;
  }

  console.log(`\n✓ Done — created ${created}, skipped ${skipped}, missing ${missing}\n`);
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
