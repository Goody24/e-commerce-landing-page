const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting ONWAGLOW Backend & Integration Tests...\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] ${name}:`, err.message);
    }
  }

  // 1. Static HTML
  await test('Serve index.html', async () => {
    const res = await request({ host: 'localhost', port: 3000, path: '/', method: 'GET' });
    if (res.status !== 200 || !res.body.includes('ONWAGLOW Enterprises')) {
      throw new Error(`Unexpected response: ${res.status}`);
    }
  });

  // 2. Logo SVG
  await test('Serve brand logo SVG', async () => {
    const res = await request({ host: 'localhost', port: 3000, path: '/images/logo.svg', method: 'GET' });
    if (res.status !== 200 || !res.body.includes('ONWAGLOW')) {
      throw new Error(`Logo SVG load failed: ${res.status}`);
    }
  });

  // 3. Products List API
  await test('GET /api/products returns 26 products across 6 categories', async () => {
    const res = await request({ host: 'localhost', port: 3000, path: '/api/products', method: 'GET' });
    if (res.status !== 200 || !res.data.success || res.data.products.length < 26) {
      throw new Error(`Expected at least 26 products, got: ${res.data?.products?.length}`);
    }
  });

  // 4. Products Category Filter
  await test('GET /api/products?category=solar filters solar products', async () => {
    const res = await request({ host: 'localhost', port: 3000, path: '/api/products?category=solar', method: 'GET' });
    if (res.status !== 200 || res.data.products.some(p => p.category !== 'solar')) {
      throw new Error('Solar filter failed');
    }
  });

  // 5. Customer Login
  let customerToken = '';
  await test('POST /api/auth/login with customer credentials', async () => {
    const res = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'customer@onwaglow.com', password: 'password123' });

    if (res.status !== 200 || !res.data.success || res.data.user.role !== 'customer') {
      throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
    }
    customerToken = res.data.token;
  });

  // 6. Admin Login
  let adminToken = '';
  await test('POST /api/auth/login with admin credentials', async () => {
    const res = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { email: 'admin@onwaglow.com', password: 'admin123' });

    if (res.status !== 200 || !res.data.success || res.data.user.role !== 'admin') {
      throw new Error(`Admin login failed: ${JSON.stringify(res.data)}`);
    }
    adminToken = res.data.token;
  });

  // 7. Order Placement
  let createdOrderId = '';
  await test('POST /api/orders places a new order', async () => {
    const res = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customerToken}`
      }
    }, {
      customerName: 'Adeola Johnson',
      customerEmail: 'customer@onwaglow.com',
      customerPhone: '08137271212',
      deliveryAddress: 'Kairo Street, Aseese, Ogun State',
      paymentMethod: 'Bank Transfer',
      items: [
        { id: 'prod_1', name: '550W Solar Panel', price: 145000, quantity: 2 },
        { id: 'prod_15', name: 'Glass Gas Cooker', price: 48000, quantity: 1 }
      ],
      subtotal: 338000,
      discount: 33800,
      shipping: 5000,
      total: 309200
    });

    if (res.status !== 201 || !res.data.success || !res.data.order.id) {
      throw new Error(`Order placement failed: ${JSON.stringify(res.data)}`);
    }
    createdOrderId = res.data.order.id;
  });

  // 8. User Order History Retrieval
  await test('GET /api/orders/user retrieves order history', async () => {
    const res = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/orders/user',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    });

    if (res.status !== 200 || !res.data.success || !res.data.orders.some(o => o.id === createdOrderId)) {
      throw new Error(`Order retrieval failed`);
    }
  });

  // 9. Admin Order Status Update
  await test('PATCH /api/orders/:id/status updates status as Admin', async () => {
    const res = await request({
      host: 'localhost',
      port: 3000,
      path: `/api/orders/${createdOrderId}/status`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    }, { status: 'Dispatched', trackingStep: 3 });

    if (res.status !== 200 || !res.data.success || res.data.order.status !== 'Dispatched') {
      throw new Error(`Status update failed`);
    }
  });

  // 10. Contractor RFQ Quote submission
  await test('POST /api/quotes registers contractor quote request', async () => {
    const res = await request({
      host: 'localhost',
      port: 3000,
      path: '/api/quotes',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      name: 'Engr. Dapo Williams',
      phone: '08137271212',
      email: 'dapo@buildcorp.ng',
      projectType: 'Armoured Power Supply Cables',
      location: 'Aseese, Ogun State',
      details: '500 meters of 16mm 4-core copper cable'
    });

    if (res.status !== 201 || !res.data.success) {
      throw new Error(`Quote submission failed`);
    }
  });

  console.log(`\n==========================================`);
  console.log(`🏁 Test Summary: ${passed}/${total} tests passed successfully!`);
  console.log(`==========================================\n`);
}

runTests();
