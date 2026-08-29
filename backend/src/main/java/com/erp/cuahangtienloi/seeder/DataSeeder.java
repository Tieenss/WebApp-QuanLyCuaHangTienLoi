package com.erp.cuahangtienloi.seeder;

import com.erp.cuahangtienloi.entity.ChiNhanh;
import com.erp.cuahangtienloi.entity.NhanVien;
import com.erp.cuahangtienloi.entity.enums.LoaiChiNhanh;
import com.erp.cuahangtienloi.entity.enums.VaiTro;
import com.erp.cuahangtienloi.repository.ChiNhanhRepository;
import com.erp.cuahangtienloi.repository.NhanVienRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataSeeder.class);

    private final ChiNhanhRepository chiNhanhRepository;
    private final NhanVienRepository nhanVienRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(ChiNhanhRepository chiNhanhRepository,
                      NhanVienRepository nhanVienRepository,
                      PasswordEncoder passwordEncoder) {
        this.chiNhanhRepository = chiNhanhRepository;
        this.nhanVienRepository = nhanVienRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        logger.info("Đang kiểm tra dữ liệu mẫu trong cơ sở dữ liệu...");

        if (chiNhanhRepository.count() == 0 && nhanVienRepository.count() == 0) {
            logger.info("Cơ sở dữ liệu trống. Bắt đầu tạo dữ liệu mẫu...");

            // 1. Tạo 1 Kho tổng và 2 Chi nhánh bán lẻ
            ChiNhanh khoTong = ChiNhanh.builder()
                    .tenChiNhanh("Kho Tổng ERP")
                    .diaChi("Hà Nội")
                    .loai(LoaiChiNhanh.KHO_TONG)
                    .dangHoatDong(true)
                    .build();

            ChiNhanh chCauGiay = ChiNhanh.builder()
                    .tenChiNhanh("Cửa hàng bán lẻ Cầu Giấy")
                    .diaChi("Cầu Giấy, Hà Nội")
                    .loai(LoaiChiNhanh.CUA_HANG_BAN_LE)
                    .dangHoatDong(true)
                    .build();

            ChiNhanh chThanhXuan = ChiNhanh.builder()
                    .tenChiNhanh("Cửa hàng bán lẻ Thanh Xuân")
                    .diaChi("Thanh Xuân, Hà Nội")
                    .loai(LoaiChiNhanh.CUA_HANG_BAN_LE)
                    .dangHoatDong(true)
                    .build();

            chiNhanhRepository.saveAll(List.of(khoTong, chCauGiay, chThanhXuan));
            logger.info("Đã seed xong 3 chi nhánh.");

            // Mã hóa password "123456"
            String defaultPassword = passwordEncoder.encode("123456");

            // 2. Tạo 5 tài khoản tương ứng với 5 vai trò
            NhanVien admin = NhanVien.builder()
                    .tenDangNhap("admin")
                    .matKhau(defaultPassword)
                    .hoTen("Nguyễn Văn Admin")
                    .soDienThoai("0912345678")
                    .vaiTro(VaiTro.ADMIN)
                    .luongTheoGio(new BigDecimal("50000"))
                    .soTaiKhoan("999123456789")
                    .tenNganHang("Vietcombank")
                    .dangHoatDong(true)
                    .chiNhanh(khoTong)
                    .build();

            NhanVien keToan = NhanVien.builder()
                    .tenDangNhap("ketoan")
                    .matKhau(defaultPassword)
                    .hoTen("Trần Thị Kế Toán")
                    .soDienThoai("0923456789")
                    .vaiTro(VaiTro.KE_TOAN)
                    .luongTheoGio(new BigDecimal("40000"))
                    .soTaiKhoan("999234567890")
                    .tenNganHang("Techcombank")
                    .dangHoatDong(true)
                    .chiNhanh(khoTong)
                    .build();

            NhanVien thuKho = NhanVien.builder()
                    .tenDangNhap("thukho")
                    .matKhau(defaultPassword)
                    .hoTen("Lê Văn Thủ Kho")
                    .soDienThoai("0934567890")
                    .vaiTro(VaiTro.THU_KHO)
                    .luongTheoGio(new BigDecimal("35000"))
                    .soTaiKhoan("999345678901")
                    .tenNganHang("MB Bank")
                    .dangHoatDong(true)
                    .chiNhanh(khoTong)
                    .build();

            NhanVien quanLy = NhanVien.builder()
                    .tenDangNhap("quanly")
                    .matKhau(defaultPassword)
                    .hoTen("Phạm Văn Quản Lý")
                    .soDienThoai("0945678901")
                    .vaiTro(VaiTro.QUAN_LY)
                    .luongTheoGio(new BigDecimal("45000"))
                    .soTaiKhoan("999456789012")
                    .tenNganHang("Agribank")
                    .dangHoatDong(true)
                    .chiNhanh(chCauGiay)
                    .build();

            NhanVien thuNgan = NhanVien.builder()
                    .tenDangNhap("thungan")
                    .matKhau(defaultPassword)
                    .hoTen("Hoàng Thị Thu Ngân")
                    .soDienThoai("0956789012")
                    .vaiTro(VaiTro.THU_NGAN)
                    .luongTheoGio(new BigDecimal("30000"))
                    .soTaiKhoan("999567890123")
                    .tenNganHang("BIDV")
                    .dangHoatDong(true)
                    .chiNhanh(chCauGiay)
                    .build();

            nhanVienRepository.saveAll(List.of(admin, keToan, thuKho, quanLy, thuNgan));
            logger.info("Đã seed xong 5 nhân viên mẫu với password '123456'.");
        } else {
            logger.info("Cơ sở dữ liệu đã có dữ liệu. Bỏ qua việc tạo dữ liệu mẫu.");
        }
    }
}
