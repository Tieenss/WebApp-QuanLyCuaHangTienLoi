import os
import re

sql_dir = r"d:\Documents\Nam4\WebApp-QuanLyCuaHangTienLoi\backend\sql"
files = [f for f in os.listdir(sql_dir) if f.endswith(".sql") and not f.startswith("migration_") and f not in ("01_schema_all.sql", "02_data_all.sql")]

# Define order
order = [
    "chi_nhanh.sql",
    "nhan_vien.sql",
    "tai_khoan.sql",
    "cham_cong.sql",
    "bang_luong.sql",
    "danh_muc.sql",
    "san_pham.sql",
    "nha_cung_cap.sql",
    "ton_kho.sql",
    "the_kho.sql",
    "so_quy.sql",
    "phieu_nhap.sql",
    "phieu_xuat_kho.sql",
    "phieu_kiem_ke.sql",
    "hoa_don.sql"
]

# Add any missed files at the end
for f in files:
    if f not in order:
        order.append(f)

# Also append migrations to the end of schema file so they take effect
migrations = [f for f in os.listdir(sql_dir) if f.endswith(".sql") and f.startswith("migration_")]

schema_content = []
data_content = []

# Mock data usually starts with a comment like "-- Dữ liệu mẫu" or "-- =============================================================================" followed by "-- Dữ liệu mẫu"
for fname in order:
    if fname not in files:
        continue
    fpath = os.path.join(sql_dir, fname)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()

    # We need to split the content into schema and data.
    # The data section usually starts with a block comment containing "Dữ liệu mẫu"
    # But wait, there might be schema definition (like COMMENT ON TABLE) AFTER the data!
    # So finding "Dữ liệu mẫu" and blindly splitting to the end of file might lose "COMMENT ON TABLE" or "CREATE OR REPLACE FUNCTION".
    
    # Let's extract block by block or line by line.
    lines = content.split('\n')
    
    schema_lines = []
    data_lines = []
    
    in_data_section = False
    in_insert = False
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Check if line indicates start of mock data
        if "Dữ liệu mẫu" in line:
            # We are inside the mock data comment block
            in_data_section = True
            data_lines.append(line)
            i += 1
            continue
            
        if in_data_section:
            # Check if this line is part of DDL or COMMENT which should go back to schema
            if line.startswith("COMMENT ON ") or line.startswith("CREATE OR REPLACE FUNCTION ") or line.startswith("CREATE TRIGGER ") or line.startswith("DROP TRIGGER "):
                in_data_section = False
                schema_lines.append(line)
            else:
                data_lines.append(line)
        else:
            schema_lines.append(line)
            
        i += 1
        
    schema_content.append(f"-- ==========================================\n-- FILE: {fname}\n-- ==========================================\n")
    schema_content.append("\n".join(schema_lines))
    
    if any(line.strip() for line in data_lines):
        data_content.append(f"-- ==========================================\n-- FILE: {fname}\n-- ==========================================\n")
        data_content.append("\n".join(data_lines))

# Add migrations to schema
for m in migrations:
    fpath = os.path.join(sql_dir, m)
    with open(fpath, "r", encoding="utf-8") as f:
        content = f.read()
    schema_content.append(f"-- ==========================================\n-- MIGRATION: {m}\n-- ==========================================\n")
    schema_content.append(content)

with open(os.path.join(sql_dir, "01_schema_all.sql"), "w", encoding="utf-8") as f:
    f.write("\n\n".join(schema_content))

with open(os.path.join(sql_dir, "02_data_all.sql"), "w", encoding="utf-8") as f:
    f.write("\n\n".join(data_content))

print("Created 01_schema_all.sql and 02_data_all.sql")
