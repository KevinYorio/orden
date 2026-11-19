ALTER TABLE purchase_lines ADD COLUMN package_size_base INTEGER CHECK(package_size_base IS NULL OR package_size_base>0);
ALTER TABLE purchase_lines ADD COLUMN base_unit TEXT CHECK(base_unit IS NULL OR base_unit IN ('g','ml','unit'));
CREATE INDEX IF NOT EXISTS purchase_lines_measurement ON purchase_lines(product_id,base_unit,package_size_base,purchase_id);
