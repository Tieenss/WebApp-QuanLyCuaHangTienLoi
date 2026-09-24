package com.erp.cuahangtienloi.dto;

import java.math.BigDecimal;

public record HourAdjustmentRequest(BigDecimal hours, String reason) {}
