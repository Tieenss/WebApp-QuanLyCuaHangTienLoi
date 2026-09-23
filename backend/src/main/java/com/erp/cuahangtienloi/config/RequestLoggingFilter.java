package com.erp.cuahangtienloi.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        
        long startTime = System.currentTimeMillis();
        
        filterChain.doFilter(request, response);
        
        long duration = System.currentTimeMillis() - startTime;
        
        // Chỉ log các request gọi vào API, bỏ qua các request lỗi hoặc tĩnh không quan trọng nếu có
        String uri = request.getRequestURI();
        if (uri.startsWith("/api/")) {
            logger.info("👉 [{}] {} - Status: {} ({}ms)", 
                    request.getMethod(), 
                    uri, 
                    response.getStatus(), 
                    duration);
        }
    }
}
