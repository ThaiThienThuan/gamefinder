const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

// Import models
const User = require('../server/apps/Entity/User');
const Room = require('../server/apps/Entity/Room');
const RoomMember = require('../server/apps/Entity/RoomMember');
const Message = require('../server/apps/Entity/Message');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/gamematch';

const ranks = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
const modes = ['RANKED', 'NORMAL', 'ARAM', 'TFT'];
const positions = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Room.deleteMany({});
    await RoomMember.deleteMany({});
    await Message.deleteMany({});
    console.log('✓ Cleared existing data');

    // Create 8 users
    const users = [];
    const usernames = [
      'ShadowNinja',
      'PhoenixRise',
      'ThunderStrike',
      'MysticWolf',
      'IceQueen',
      'InfernoKing',
      'NovaGhost',
      'SilentAssassin'
    ];
    const userRanks = ['IRON', 'SILVER', 'SILVER', 'GOLD', 'GOLD', 'GOLD', 'PLATINUM', 'DIAMOND'];

    for (let i = 0; i < 8; i++) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await User.create({
        username: usernames[i],
        email: `user${i + 1}@gamematch.local`,
        password: hashedPassword,
        rank: userRanks[i],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${usernames[i]}`
      });
      users.push(user);
    }
    console.log(`✓ Created ${users.length} users`);

    // Create 12 rooms
    const rooms = [];
    const roomNames = [
      'Gold Grinding Squad',
      'Chill Normals',
      'ARAM Fiesta',
      'Ranked Push',
      'Mid Lane Duelist',
      'Support Main Club',
      'TFT Tournament',
      'Late Night Grind',
      'Weekend Warriors',
      'New Player Friendly',
      'Diamond Checkpoint',
      'Casual Gaming'
    ];

    for (let i = 0; i < 12; i++) {
      const ownerIdx = Math.floor(Math.random() * users.length);
      const modeIdx = Math.floor(Math.random() * modes.length);
      const slots = Math.floor(Math.random() * 4) + 2;
      const current = Math.floor(Math.random() * (slots + 1));

      const room = await Room.create({
        ownerId: users[ownerIdx]._id,
        name: roomNames[i],
        mode: modes[modeIdx],
        slots,
        current,
        status: current >= slots ? 'FULL' : 'RECRUITING'
      });
      rooms.push(room);
    }
    console.log(`✓ Created ${rooms.length} rooms`);

    // Add room members
    let memberCount = 0;
    for (const room of rooms) {
      const memberCount2 = room.current;
      const memberIndices = new Set();
      memberIndices.add(room.ownerId.toString());

      while (memberIndices.size < memberCount2) {
        const randomIdx = Math.floor(Math.random() * users.length);
        memberIndices.add(users[randomIdx]._id.toString());
      }

      for (const userId of memberIndices) {
        const positionIdx = Math.floor(Math.random() * positions.length);
        await RoomMember.create({
          roomId: room._id,
          userId,
          position: positions[positionIdx]
        });
        memberCount++;
      }
    }
    console.log(`✓ Created ${memberCount} room members`);

    // Create 25 messages in first 3 rooms
    let messageCount = 0;
    const messageTexts = [
      'Anyone want to run another game?',
      'Good game everyone!',
      'Mid open gg',
      'Let me know when youre ready',
      'Nice play!',
      'Coming to help',
      'Watch out, jungler missing',
      'Wow, that ult was insane',
      'Group up for the fight',
      'Need peel mid',
      'Full mana, lets go',
      'Backing off, low health',
      'Enemy has vision control',
      'Nice try everyone',
      'Next game?',
      'That teamfight was clean',
      'Let me carry this one',
      'Stuck in side lane',
      'We scale harder late game',
      'Good team coordination',
      'Almost had them',
      'Learning from that mistake',
      'Solid positioning',
      'Keep the pressure up',
      'GG wp'
    ];

    for (let i = 0; i < Math.min(3, rooms.length); i++) {
      const roomMessages = Math.floor(25 / 3);
      for (let j = 0; j < roomMessages; j++) {
        const userIdx = Math.floor(Math.random() * users.length);
        const messageIdx = Math.floor(Math.random() * messageTexts.length);
        await Message.create({
          roomId: rooms[i]._id,
          userId: users[userIdx]._id,
          text: messageTexts[messageIdx]
        });
        messageCount++;
      }
    }
    console.log(`✓ Created ${messageCount} messages`);

    console.log('\n✓ Database seeding completed successfully!');
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Rooms: ${rooms.length}`);
    console.log(`  - Members: ${memberCount}`);
    console.log(`  - Messages: ${messageCount}`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('✗ Seeding error:', error.message);
    process.exit(1);
  }
}

seedDatabase();
