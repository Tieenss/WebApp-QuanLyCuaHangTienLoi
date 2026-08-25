package com.erp.cuahangtienloi.security;

import com.erp.cuahangtienloi.entity.enums.VaiTro;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface YeuCauVaiTro {
    VaiTro[] value();
}
