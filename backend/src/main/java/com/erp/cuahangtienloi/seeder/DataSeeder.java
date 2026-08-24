package com.erp.cuahangtienloi.seeder;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    @Override
    public void run(String... args) throws Exception {
        logger.info("Đang kiểm tra dữ liệu mẫu trong cơ sở dữ liệu...");
        // TODO: Cài đặt logic kiểm tra xem bảng ChiNhanh có rỗng không, 
        // nếu rỗng thì bắt đầu tạo:
        // 1 Kho tổng, 2 Chi nhánh bán lẻ
        // 5 tài khoản tương ứng 5 vai trò
        // 3 Danh mục hàng hóa, 10 Sản phẩm, 2 Nhà cung cấp.
        logger.info("Dữ liệu mẫu đã được nạp (DataSeeder Placeholder)!");
    }
}
