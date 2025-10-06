-- Enable fuzzy search extensions
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Optional: tạo index sau khi bảng 'product' có sẵn
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'product'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_product_name_gin 
    ON product USING gin (name gin_trgm_ops);
  END IF;
END$$;
