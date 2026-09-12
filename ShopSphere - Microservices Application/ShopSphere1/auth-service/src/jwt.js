const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'supersecretjwtkey';
const EXPIRES = process.env.JWT_EXPIRES || '1d';

exports.signToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES });
exports.verifyToken = (token) => jwt.verify(token, SECRET);