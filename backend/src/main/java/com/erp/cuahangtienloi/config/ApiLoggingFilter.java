package com.erp.cuahangtienloi.config;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class ApiLoggingFilter implements Filter {

    private static final Logger logger = LoggerFactory.getLogger(ApiLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        jakarta.servlet.http.HttpServletResponse res = (jakarta.servlet.http.HttpServletResponse) response;
        
        long startTime = System.currentTimeMillis();
        
        try {
            chain.doFilter(request, response);
        } finally {
            // Bỏ qua log các request preflight OPTIONS
            if (!req.getMethod().equalsIgnoreCase("OPTIONS")) {
                long duration = System.currentTimeMillis() - startTime;
                int status = res.getStatus();
                logger.info("====> API: [{}] {} - Status: {} ({}ms)", req.getMethod(), req.getRequestURI(), status, duration);
            }
        }
    }
}
