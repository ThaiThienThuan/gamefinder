// Usage: node scripts/setAdmin.js <username>
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../apps/Entity/User');

async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: node scripts/setAdmin.js <username>');
    process.exit(1);
  }
  const uri = process.env.MONGO_URI;
  if (!uri) { console.error('MONGO_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  const u = await User.findOneAndUpdate({ username }, { role: 'admin' }, { new: true });
  if (!u) { console.error('User not found:', username); process.exit(2); }
  console.log(`✓ ${u.username} is now admin (role=${u.role})`);
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
