const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'database.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Helper to read database
function readDB() {
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading database file:', err);
    return { users: [], products: [], categories: [], orders: [], quotes: [], company: {} };
  }
}

// Helper to write database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving to database file:', err);
    return false;
  }
}

// In-memory token store for sessions
const sessions = new Map();

// Helper token generator
function generateToken(userId) {
  const token = 'ong_' + crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId, createdAt: Date.now() });
  return token;
}

// Auth Middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.replace(/^Bearer\s+/i, '');
  const session = sessions.get(token);
  if (!session) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === session.userId);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  req.user = user;
  next();
}

// Optional Auth Middleware (attaches user if token present)
function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const session = sessions.get(token);
    if (session) {
      const db = readDB();
      const user = db.users.find(u => u.id === session.userId);
      if (user) {
        req.user = user;
      }
    }
  }
  next();
}

/* ============================================================
   AUTH ENDPOINTS
============================================================ */

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, phone, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
  }

  const db = readDB();
  const cleanEmail = email.trim().toLowerCase();

  const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists' });
  }

  const newUser = {
    id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
    name: name.trim(),
    email: cleanEmail,
    password: password.trim(), // in real prod use bcrypt
    phone: phone ? phone.trim() : '',
    role: 'customer',
    address: address ? address.trim() : '',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeDB(db);

  const token = generateToken(newUser.id);
  const { password: _, ...userSafe } = newUser;

  res.status(201).json({
    success: true,
    message: 'Account created successfully! Welcome to ONWAGLOW Enterprises.',
    token,
    user: userSafe
  });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const db = readDB();
  const cleanEmail = email.trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user || user.password !== password.trim()) {
    return res.status(401).json({ success: false, message: 'Invalid email address or password' });
  }

  const token = generateToken(user.id);
  const { password: _, ...userSafe } = user;

  res.json({
    success: true,
    message: `Welcome back, ${user.name}!`,
    token,
    user: userSafe
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { password: _, ...userSafe } = req.user;
  res.json({
    success: true,
    user: userSafe
  });
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    sessions.delete(token);
  }
  res.json({ success: true, message: 'Successfully logged out' });
});

/* ============================================================
   PRODUCTS & CATEGORIES ENDPOINTS
============================================================ */

// GET /api/company
app.get('/api/company', (req, res) => {
  const db = readDB();
  res.json({ success: true, company: db.company });
});

// GET /api/categories
app.get('/api/categories', (req, res) => {
  const db = readDB();
  res.json({ success: true, categories: db.categories });
});

// GET /api/products
app.get('/api/products', (req, res) => {
  const db = readDB();
  let products = [...db.products];

  const { category, search, sort, minPrice, maxPrice, featured } = req.query;

  // Filter by category
  if (category && category !== 'all') {
    products = products.filter(p => p.category === category);
  }

  // Filter by search query
  if (search) {
    const q = search.trim().toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      (p.categoryLabel && p.categoryLabel.toLowerCase().includes(q)) ||
      (p.badge && p.badge.toLowerCase().includes(q))
    );
  }

  // Filter by price
  if (minPrice) {
    products = products.filter(p => p.price >= Number(minPrice));
  }
  if (maxPrice) {
    products = products.filter(p => p.price <= Number(maxPrice));
  }

  // Sort
  if (sort === 'price-low') {
    products.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-high') {
    products.sort((a, b) => b.price - a.price);
  } else if (sort === 'rating') {
    products.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'name') {
    products.sort((a, b) => a.name.localeCompare(b.name));
  }

  res.json({
    success: true,
    total: products.length,
    products
  });
});

// GET /api/products/:id
app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found' });
  }
  res.json({ success: true, product });
});

/* ============================================================
   ORDERS ENDPOINTS
============================================================ */

// POST /api/orders (Create Order)
app.post('/api/orders', optionalAuthMiddleware, (req, res) => {
  const { 
    customerName, 
    customerEmail, 
    customerPhone, 
    deliveryAddress, 
    paymentMethod, 
    items, 
    subtotal, 
    discount = 0, 
    shipping = 5000, 
    total,
    notes 
  } = req.body;

  if (!customerName || !customerEmail || !customerPhone || !deliveryAddress || !items || !items.length) {
    return res.status(400).json({ 
      success: false, 
      message: 'Please provide customer name, email, phone, address, and cart items.' 
    });
  }

  const db = readDB();
  const orderId = 'ORD-' + new Date().getFullYear() + '-' + Math.floor(1000 + Math.random() * 9000);

  const newOrder = {
    id: orderId,
    userId: req.user ? req.user.id : (db.users.find(u => u.email.toLowerCase() === customerEmail.toLowerCase())?.id || 'guest'),
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerPhone: customerPhone.trim(),
    deliveryAddress: deliveryAddress.trim(),
    paymentMethod: paymentMethod || 'Bank Transfer',
    items,
    subtotal: Number(subtotal),
    discount: Number(discount),
    shipping: Number(shipping),
    total: Number(total),
    notes: notes ? notes.trim() : '',
    status: 'Processing',
    trackingStep: 2, // 1: Placed, 2: Processing, 3: Dispatched, 4: Delivered
    createdAt: new Date().toISOString()
  };

  db.orders.unshift(newOrder);
  writeDB(db);

  res.status(201).json({
    success: true,
    message: 'Order created successfully! Thank you for ordering from ONWAGLOW Enterprises.',
    order: newOrder
  });
});

// GET /api/orders/user (Orders for logged in user or query email)
app.get('/api/orders/user', optionalAuthMiddleware, (req, res) => {
  const db = readDB();
  let userOrders = [];

  if (req.user) {
    userOrders = db.orders.filter(o => o.userId === req.user.id || o.customerEmail.toLowerCase() === req.user.email.toLowerCase());
  } else if (req.query.email) {
    const qEmail = req.query.email.trim().toLowerCase();
    userOrders = db.orders.filter(o => o.customerEmail.toLowerCase() === qEmail);
  } else {
    return res.status(400).json({ success: false, message: 'Please provide user auth or email to lookup orders' });
  }

  res.json({
    success: true,
    orders: userOrders
  });
});

// GET /api/orders/all (Admin view)
app.get('/api/orders/all', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
  }

  const db = readDB();
  res.json({
    success: true,
    total: db.orders.length,
    orders: db.orders
  });
});

// PATCH /api/orders/:id/status (Admin updates order status)
app.patch('/api/orders/:id/status', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied: Admin role required' });
  }

  const { status, trackingStep } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found' });
  }

  if (status) order.status = status;
  if (trackingStep !== undefined) order.trackingStep = Number(trackingStep);

  writeDB(db);

  res.json({
    success: true,
    message: `Order ${order.id} status updated to ${order.status}`,
    order
  });
});

/* ============================================================
   CONTRACTOR QUOTES & INQUIRIES ENDPOINTS
============================================================ */

// POST /api/quotes
app.post('/api/quotes', (req, res) => {
  const { name, phone, email, projectType, location, details } = req.body;

  if (!name || !phone || !details) {
    return res.status(400).json({ success: false, message: 'Name, phone, and project details are required' });
  }

  const db = readDB();
  const quoteId = 'QUO-' + Math.floor(1000 + Math.random() * 9000);

  const newQuote = {
    id: quoteId,
    name: name.trim(),
    phone: phone.trim(),
    email: email ? email.trim() : '',
    projectType: projectType || 'General Inverter / Electrical Quote',
    location: location || 'Ogun / Lagos State',
    details: details.trim(),
    createdAt: new Date().toISOString(),
    status: 'Pending Quote'
  };

  db.quotes.unshift(newQuote);
  writeDB(db);

  res.status(201).json({
    success: true,
    message: 'Your quote request has been submitted! Our technical sales engineers will reach out within 2 hours.',
    quote: newQuote
  });
});

// GET /api/quotes/all (Admin view)
app.get('/api/quotes/all', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied' });
  }

  const db = readDB();
  res.json({
    success: true,
    quotes: db.quotes
  });
});

// Fallback index.html route for client-side navigation
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`⚡ ONWAGLOW Enterprises E-Commerce Server Running`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔑 Demo Customer: customer@onwaglow.com | password123`);
  console.log(`👑 Demo Admin:    admin@onwaglow.com    | admin123`);
  console.log(`====================================================`);
});
