const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/userdb';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const profileSchema = new mongoose.Schema({
  authId: { type: String, required: true, unique: true },
  name: String,
  email: { type: String, unique: true, lowercase: true },
  role: { type: String, default: 'user' },
  bio: { type: String, default: '' },
  phone: { type: String, default: '' },
  address: { type: String, default: '' }
}, { timestamps: true });

const Profile = mongoose.model('Profile', profileSchema);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

app.post('/users/sync', async (req, res) => {
  try {
    const { authId, name, email, role } = req.body;
    if (!authId || !email) return res.status(400).json({ error: 'Missing fields' });
    const profile = await Profile.findOneAndUpdate(
      { authId },
      { $set: { authId, name, email, role } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/users/me', auth, async (req, res) => {
  const profile = await Profile.findOne({ authId: req.user.id });
  if (!profile) return res.status(404).json({ error: 'Profile not found' });
  res.json(profile);
});

app.put('/users/me', auth, async (req, res) => {
  try {
    const { name, bio, phone, address } = req.body;
    const profile = await Profile.findOneAndUpdate(
      { authId: req.user.id },
      { $set: { name, bio, phone, address } },
      { new: true }
    );
    res.json(profile);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/users', auth, auth.requireAdmin, async (req, res) => {
  const users = await Profile.find().sort({ createdAt: -1 });
  res.json(users);
});

app.delete('/users/:id', auth, auth.requireAdmin, async (req, res) => {
  await Profile.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ User Service connected to MongoDB');
    app.listen(PORT, () => console.log(`👤 User Service running on ${PORT}`));
  })
  .catch(err => { console.error('Mongo error', err); process.exit(1); });