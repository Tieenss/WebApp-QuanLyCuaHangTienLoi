package com.erp.cuahangtienloi.config;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class StartupBanner {

    @EventListener(ApplicationReadyEvent.class)
    public void printStartupBanner() {
        System.out.println();
        System.out.println("=========================================================");
        System.out.println("   🚀 SERVER ĐÃ KHỞI ĐỘNG THÀNH CÔNG! ");
        System.out.println("   🌐 Trạng thái: Sẵn sàng phục vụ");
        System.out.println("   🔌 Cổng (Port): 8080");
        System.out.println("   🔗 Truy cập  : http://localhost:8080");
        System.out.println("=========================================================");
        System.out.println();
    }
}
