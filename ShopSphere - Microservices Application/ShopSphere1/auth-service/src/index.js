const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 4001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/authdb';

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth-service' }));
app.use('/', routes);

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Auth Service connected to MongoDB');
    app.listen(PORT, () => console.log(`🔐 Auth Service running on ${PORT}`));
  })
  .catch(err => { console.error('Mongo error', err); process.exit(1); });