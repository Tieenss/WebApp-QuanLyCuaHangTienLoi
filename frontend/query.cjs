const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://neondb_owner:npg_XFW6xhKRQ0Zb@ep-lingering-voice-aze51wdk-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  await client.connect();
  console.log("Connected to DB.");

  const res1 = await client.query(`SELECT id, ma_chi_nhanh, ten_chi_nhanh, loai FROM chi_nhanh WHERE ma_chi_nhanh = 'CK-3605'`);
  console.log("Branch CK-3605:", res1.rows);

  const res2 = await client.query(`SELECT id, ma_nhan_vien, ho_ten, vai_tro, trang_thai, id_chi_nhanh FROM nhan_vien WHERE ma_nhan_vien = 'NV-3605'`);
  console.log("Employee NV-3605:", res2.rows);

  await client.end();
}

run().catch(console.error);
