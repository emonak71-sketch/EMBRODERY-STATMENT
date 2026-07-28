-- 1. Add user_id column to tables that are missing it
ALTER TABLE "Parties" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE "Products" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE "Expenses" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE "Sales" ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own parties" ON "Parties";
DROP POLICY IF EXISTS "Users can manage their own transactions" ON "Transactions";
DROP POLICY IF EXISTS "Users can manage their own products" ON "Products";
DROP POLICY IF EXISTS "Users can manage their own expenses" ON "Expenses";
DROP POLICY IF EXISTS "Users can manage their own sales" ON "Sales";

-- 3. Create the new policies
CREATE POLICY "Users can manage their own parties" ON "Parties" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own transactions" ON "Transactions" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own products" ON "Products" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own expenses" ON "Expenses" FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own sales" ON "Sales" FOR ALL USING (auth.uid() = user_id);
