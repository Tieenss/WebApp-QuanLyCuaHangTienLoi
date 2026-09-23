/**
 * Script nạp dữ liệu mẫu (Seed Data) và Schema vào Neon PostgreSQL Database.
 * Sử dụng thông tin kết nối từ backend/.env
 *
 * Chạy lệnh: node seed_database.js
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnv() {
    const envPath = path.resolve(__dirname, 'backend/.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ Không tìm thấy file backend/.env!');
        process.exit(1);
    }
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    for (const line of envContent.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
            const key = trimmed.substring(0, eqIdx).trim();
            const val = trimmed.substring(eqIdx + 1).trim();
            env[key] = val;
        }
    }
    return env;
}

const sqlFiles = [
    'chi_nhanh.sql',
    'migration_chi_nhanh_ten_quan_ly.sql',
    'nhan_vien.sql',
    'tai_khoan.sql',
    'danh_muc.sql',
    'migration_danh_muc_image_url.sql',
    'san_pham.sql',
    'nha_cung_cap.sql',
    'ton_kho.sql',
    'migration_ton_kho_on_conflict.sql',
    'the_kho.sql',
    'migration_fix_fn_ghi_the_kho_bqgq.sql',
    'phieu_nhap.sql',
    'migration_phieu_nhap_add_pending_payment.sql',
    'migration_fix_fn_cap_nhat_tong_phieu_nhap.sql',
    'migration_fix_phieu_nhap_totals.sql',
    'phieu_xuat_kho.sql',
    'migration_phieu_xuat_kho_add_shipped.sql',
    'phieu_kiem_ke.sql',
    'migration_phieu_kiem_ke_approval.sql',
    'hoa_don.sql',
    'so_quy.sql',
    'migration_pos_checkout_atomic.sql',
    'migration_hoa_don_for_update.sql',
    'cham_cong.sql',
    'migration_cham_cong_schedule_and_clock.sql',
    'migration_attendance_payroll_integrity.sql',
    'bang_luong.sql',
    'migration_bang_luong_workflow.sql',
    'migration_bang_luong_batch_payment.sql'
];

async function main() {
    console.log('====================================================');
    console.log('  CÔNG CỤ NẠP CƠ SỞ DỮ LIỆU & DỮ LIỆU MẪU (NEON DB) ');
    console.log('====================================================');

    const env = loadEnv();
    let url = env.SPRING_DATASOURCE_URL || '';
    if (url.startsWith('jdbc:')) {
        url = url.substring(5);
    }

    if (!url) {
        console.error('❌ Thiếu biến SPRING_DATASOURCE_URL trong backend/.env!');
        process.exit(1);
    }

    // Bỏ query params (sslmode, channel_binding) để pg dùng ssl config trực tiếp
    const qIdx = url.indexOf('?');
    const cleanUrl = qIdx !== -1 ? url.substring(0, qIdx) : url;

    const username = env.SPRING_DATASOURCE_USERNAME || '';
    const password = env.SPRING_DATASOURCE_PASSWORD || '';

    // Ghép user & password vào connection string để thư viện pg xác thực SCRAM-SHA-256 chính xác
    let connectionString = cleanUrl;
    if (username && !cleanUrl.includes('@')) {
        const protoEnd = cleanUrl.indexOf('://') + 3;
        const prefix = cleanUrl.substring(0, protoEnd);
        const rest = cleanUrl.substring(protoEnd);
        connectionString = `${prefix}${encodeURIComponent(username)}:${encodeURIComponent(password)}@${rest}`;
    }

    console.log('🔗 Đang kết nối tới Neon Database...');
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Kết nối Neon DB thành công!\n');

        console.log('🧹 Đang làm sạch schema public (reset toàn bộ để nạp mới)...');
        await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
        console.log('✅ Schema public đã được làm sạch!\n');

        const sqlDir = path.resolve(__dirname, 'backend/sql');
        let successCount = 0;

        for (let i = 0; i < sqlFiles.length; i++) {
            const fileName = sqlFiles[i];
            const filePath = path.join(sqlDir, fileName);

            if (!fs.existsSync(filePath)) {
                console.warn(`⚠️ [${i + 1}/${sqlFiles.length}] Không tìm thấy file: ${fileName}`);
                continue;
            }

            const sqlContent = fs.readFileSync(filePath, 'utf8');
            process.stdout.write(`⏳ [${i + 1}/${sqlFiles.length}] Đang chạy ${fileName}... `);

            try {
                await client.query(sqlContent);
                console.log('THÀNH CÔNG');
                successCount++;
            } catch (err) {
                console.log('LỖI');
                console.error(`   ❌ Lỗi tại file ${fileName}:`, err.message);
                // Dừng lại nếu file chính bị lỗi
                throw err;
            }
        }

        console.log('\n====================================================');
        console.log(`🎉 ĐÃ CHẠY XONG ${successCount}/${sqlFiles.length} FILE SQL!`);
        console.log('====================================================\n');

        console.log('📊 THỐNG KÊ DỮ LIỆU ĐÃ NẠP VÀO CÁC BẢNG:');
        const tables = [
            'chi_nhanh', 'nhan_vien', 'tai_khoan', 'danh_muc',
            'nha_cung_cap', 'san_pham', 'ton_kho', 'the_kho',
            'phieu_nhap', 'phieu_xuat_kho', 'phieu_kiem_ke',
            'hoa_don', 'so_quy', 'cham_cong', 'bang_luong'
        ];

        for (const table of tables) {
            try {
                const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
                console.log(`   • ${table.padEnd(20)}: ${res.rows[0].count} bản ghi`);
            } catch (e) {
                console.log(`   • ${table.padEnd(20)}: Không thể đếm (${e.message})`);
            }
        }

        console.log('\n✅ Dữ liệu mẫu đã sẵn sàng. Bạn có thể khởi động backend và frontend!');

    } catch (error) {
        console.error('\n❌ Quá trình nạp dữ liệu thất bại:', error.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
