const API_BASE_URL = 'http://localhost:8080';

async function test() {
  console.log('--- TEST: Hitting Dashboard APIs ---');
  
  // 1. Try to login to get a token. We need to know a valid user.
  // Actually, we can just bypass login if we test an endpoint that doesn't need auth, but all need auth.
  // We'll use the default admin credentials if they exist.
  const loginRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'password' }) // adjust if needed
  });
  
  if (!loginRes.ok) {
    console.log('Login failed, cannot get token. Status:', loginRes.status);
    console.log(await loginRes.text());
    // We can't proceed without a token unless we know the right credentials.
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.token || loginData.accessToken;
  console.log('Login successful! Token acquired.');
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  
  // 2. Test fetching all invoices (Dashboard step 1)
  console.log('\n--- Fetching all invoices (/api/hoa-don) ---');
  const startHoaDon = Date.now();
  const hoaDonRes = await fetch(`${API_BASE_URL}/api/hoa-don`, { headers });
  const endHoaDon = Date.now();
  console.log(`Status: ${hoaDonRes.status}`);
  console.log(`Time taken: ${endHoaDon - startHoaDon}ms`);
  
  if (!hoaDonRes.ok) {
    console.log(await hoaDonRes.text());
    return;
  }
  
  const invoices = await hoaDonRes.json();
  console.log(`Total invoices fetched: ${invoices.length}`);
  
  // 3. Test the new batch endpoint
  console.log('\n--- Fetching invoice lines for top 200 (/api/chi-tiet-hoa-don/by-hoa-don-ids) ---');
  const sorted = [...invoices].sort((a, b) => (b.ngayBan || '').localeCompare(a.ngayBan || '')).slice(0, 200);
  const invoiceIds = sorted.map(i => i.id);
  
  const startBatch = Date.now();
  const batchRes = await fetch(`${API_BASE_URL}/api/chi-tiet-hoa-don/by-hoa-don-ids`, {
    method: 'POST',
    headers,
    body: JSON.stringify(invoiceIds)
  });
  const endBatch = Date.now();
  console.log(`Status: ${batchRes.status}`);
  console.log(`Time taken: ${endBatch - startBatch}ms`);
  
  if (batchRes.ok) {
    const lines = await batchRes.json();
    console.log(`Total invoice lines fetched: ${lines.length}`);
  } else {
    console.log(await batchRes.text());
  }
}

test();
