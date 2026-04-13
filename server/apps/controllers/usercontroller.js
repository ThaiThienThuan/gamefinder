const UserRepository = require('../Repository/UserRepository');
const RoomMemberRepository = require('../Repository/RoomMemberRepository');

const PUBLIC_FIELDS = (u) => ({
  id: u._id,
  username: u.username,
  avatar: u.avatar || '',
  rank: u.rank || '',
  bio: u.bio || '',
  gameProfiles: u.gameProfiles || [],
  role: u.role || 'user',
  createdAt: u.createdAt,
});

class UserController {
  constructor() {
    this.userRepository = new UserRepository();
    this.roomMemberRepository = new RoomMemberRepository();
  }

  async getProfile(req, res) {
    try {
      const { id } = req.params;
      const user = await this.userRepository.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      let roomsJoined = 0;
      try {
        const memberships = await this.roomMemberRepository.findByUser(id);
        roomsJoined = memberships.length;
      } catch {}
      res.status(200).json({ success: true, data: { ...PUBLIC_FIELDS(user), roomsJoined } });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async getMe(req, res) {
    try {
      const user = await this.userRepository.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      res.status(200).json({ success: true, data: PUBLIC_FIELDS(user) });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }

  async updateMe(req, res) {
    try {
      const allowed = ['avatar', 'bio', 'gameProfiles', 'rank', 'username'];
      const patch = {};
      for (const k of allowed) if (k in req.body) patch[k] = req.body[k];

      // Sanitize gameProfiles
      if (Array.isArray(patch.gameProfiles)) {
        patch.gameProfiles = patch.gameProfiles
          .filter((p) => p && typeof p.game === 'string' && p.game)
          .map((p) => ({
            game: String(p.game),
            ign: String(p.ign || ''),
            rank: String(p.rank || ''),
            position: String(p.position || ''),
            playStyle: String(p.playStyle || ''),
          }));
      }

      // Username uniqueness check if changing
      if (patch.username) {
        const existing = await this.userRepository.findByUsername(patch.username);
        if (existing && String(existing._id) !== String(req.user.id)) {
          return res.status(409).json({ success: false, message: 'Username already taken' });
        }
      }

      const updated = await this.userRepository.updateById(req.user.id, patch);
      res.status(200).json({ success: true, data: PUBLIC_FIELDS(updated) });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
}

module.exports = UserController;
