const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const auth = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 4003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/orderdb';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const orderSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userEmail: String,
  items: [{ product: String, qty: Number, price: Number }],
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
  address: String
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'order-service' }));

app.post('/orders', auth, async (req, res) => {
  try {
    const { items, total, address } = req.body;
    if (!items || !total) return res.status(400).json({ error: 'Invalid payload' });
    const order = await Order.create({
      userId: req.user.id, userEmail: req.user.email, items, total, address
    });
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/orders/my', auth, async (req, res) => {
  const orders = await Order.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(orders);
});

app.get('/orders', auth, auth.requireAdmin, async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

app.put('/orders/:id/status', auth, auth.requireAdmin, async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(order);
});

app.delete('/orders/:id', auth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  await order.deleteOne();
  res.json({ message: 'Cancelled' });
});

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Order Service connected to MongoDB');
    app.listen(PORT, () => console.log(`🛒 Order Service running on ${PORT}`));
  })
  .catch(err => { console.error('Mongo error', err); process.exit(1); });