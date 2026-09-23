package com.erp.cuahangtienloi.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Quản lý trạng thái kinh doanh của sản phẩm và danh mục theo từng chi nhánh (Soft Delete cấp chi nhánh).
 * Không sửa đổi cấu trúc cơ sở dữ liệu.
 */
@Service
@Slf4j
public class BranchProductStatusService {

    private final Set<String> inactiveBranchProducts = ConcurrentHashMap.newKeySet();
    private final Set<String> inactiveBranchCategories = ConcurrentHashMap.newKeySet();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private File storageFile;
    private File categoryStorageFile;

    @PostConstruct
    public void init() {
        storageFile = new File("branch_inactive_products.json");
        if (storageFile.exists()) {
            try {
                Set<String> loaded = objectMapper.readValue(storageFile, new TypeReference<Set<String>>() {});
                if (loaded != null) {
                    inactiveBranchProducts.addAll(loaded);
                }
                log.info("Đã tải {} sản phẩm ngừng kinh doanh theo chi nhánh.", inactiveBranchProducts.size());
            } catch (Exception e) {
                log.warn("Không thể đọc branch_inactive_products.json: {}", e.getMessage());
            }
        }

        categoryStorageFile = new File("branch_inactive_categories.json");
        if (categoryStorageFile.exists()) {
            try {
                Set<String> loadedCats = objectMapper.readValue(categoryStorageFile, new TypeReference<Set<String>>() {});
                if (loadedCats != null) {
                    inactiveBranchCategories.addAll(loadedCats);
                }
                log.info("Đã tải {} danh mục ngừng kinh doanh theo chi nhánh.", inactiveBranchCategories.size());
            } catch (Exception e) {
                log.warn("Không thể đọc branch_inactive_categories.json: {}", e.getMessage());
            }
        }
    }

    private synchronized void persist() {
        try {
            if (storageFile == null) {
                storageFile = new File("branch_inactive_products.json");
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(storageFile, inactiveBranchProducts);
        } catch (IOException e) {
            log.error("Không thể ghi branch_inactive_products.json: {}", e.getMessage());
        }
    }

    private synchronized void persistCategories() {
        try {
            if (categoryStorageFile == null) {
                categoryStorageFile = new File("branch_inactive_categories.json");
            }
            objectMapper.writerWithDefaultPrettyPrinter().writeValue(categoryStorageFile, inactiveBranchCategories);
        } catch (IOException e) {
            log.error("Không thể ghi branch_inactive_categories.json: {}", e.getMessage());
        }
    }

    private String key(UUID branchId, UUID targetId) {
        return branchId.toString() + ":" + targetId.toString();
    }

    public boolean isInactiveForBranch(UUID branchId, UUID productId) {
        if (branchId == null || productId == null) return false;
        return inactiveBranchProducts.contains(key(branchId, productId));
    }

    public void deactivateForBranch(UUID branchId, UUID productId) {
        if (branchId == null || productId == null) return;
        inactiveBranchProducts.add(key(branchId, productId));
        persist();
    }

    public void activateForBranch(UUID branchId, UUID productId) {
        if (branchId == null || productId == null) return;
        inactiveBranchProducts.remove(key(branchId, productId));
        persist();
    }

    public void removeProduct(UUID productId) {
        if (productId == null) return;
        String suffix = ":" + productId.toString();
        inactiveBranchProducts.removeIf(k -> k.endsWith(suffix));
        persist();
    }

    // --- Quản lý danh mục theo chi nhánh ---
    public boolean isCategoryInactiveForBranch(UUID branchId, UUID categoryId) {
        if (branchId == null || categoryId == null) return false;
        return inactiveBranchCategories.contains(key(branchId, categoryId));
    }

    public void deactivateCategoryForBranch(UUID branchId, UUID categoryId) {
        if (branchId == null || categoryId == null) return;
        inactiveBranchCategories.add(key(branchId, categoryId));
        persistCategories();
    }

    public void activateCategoryForBranch(UUID branchId, UUID categoryId) {
        if (branchId == null || categoryId == null) return;
        inactiveBranchCategories.remove(key(branchId, categoryId));
        persistCategories();
    }

    public void removeCategory(UUID categoryId) {
        if (categoryId == null) return;
        String suffix = ":" + categoryId.toString();
        inactiveBranchCategories.removeIf(k -> k.endsWith(suffix));
        persistCategories();
    }
}
