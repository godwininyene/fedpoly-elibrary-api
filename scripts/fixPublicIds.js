import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

await mongoose.connect(process.env.MONGO_URI);

const db = mongoose.connection.db;
const resources = db.collection('resources');

// Find all resources whose publicId doesn't end with .pdf
const broken = await resources.find({ publicId: { $not: /\.pdf$/ } }).toArray();

console.log(`Found ${broken.length} resource(s) with missing .pdf extension in publicId.\n`);

for (const doc of broken) {
  const fixed = doc.publicId + '.pdf';
  await resources.updateOne({ _id: doc._id }, { $set: { publicId: fixed } });
  console.log(`Fixed: "${doc.publicId}" → "${fixed}"`);
}

console.log('\n✅ Done. All publicIds updated.');
await mongoose.disconnect();
process.exit(0);