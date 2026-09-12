const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 8080;

const AUTH_SERVICE_URL  = process.env.AUTH_SERVICE_URL  || 'http://localhost:4001';
const USER_SERVICE_URL  = process.env.USER_SERVICE_URL  || 'http://localhost:4002';
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:4003';

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'api-gateway' }));

const proxy = (target, pathRewrite) => createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite,
  onError: (err, req, res) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ error: 'Bad Gateway', details: err.message });
  }
});

app.use('/api/auth',   proxy(AUTH_SERVICE_URL,  { '^/api/auth':   '' }));
app.use('/api/users',  proxy(USER_SERVICE_URL,  { '^/api/users':  '/users' }));
app.use('/api/orders', proxy(ORDER_SERVICE_URL, { '^/api/orders': '/orders' }));

app.use((req, res) => res.status(404).json({ error: 'Route not found in gateway' }));

app.listen(PORT, () => console.log(`🚪 API Gateway running on port ${PORT}`));