-- Embroidery Statement v10: account isolation for customer and ledger records.
-- IMPORTANT:
-- 1) Replace YOUR_LOGIN_EMAIL with the email of the account that owns the existing data.
-- 2) Run this only if all rows with NULL user_id in these two tables belong to that one account.
--    If multiple accounts already share these tables, assign legacy rows to their correct owners first.

BEGIN;

ALTER TABLE public."Parties"
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

ALTER TABLE public."Transactions"
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid();

DO $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT id INTO owner_id
  FROM auth.users
  WHERE lower(email) = lower('YOUR_LOGIN_EMAIL')
  LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'Replace YOUR_LOGIN_EMAIL with the existing account email before running this migration.';
  END IF;

  UPDATE public."Parties"
  SET user_id = owner_id
  WHERE user_id IS NULL;

  UPDATE public."Transactions"
  SET user_id = owner_id
  WHERE user_id IS NULL;
END
$$;

ALTER TABLE public."Parties" ALTER COLUMN user_id SET DEFAULT auth.uid();
ALTER TABLE public."Transactions" ALTER COLUMN user_id SET DEFAULT auth.uid();

ALTER TABLE public."Parties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Transactions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own parties" ON public."Parties";
DROP POLICY IF EXISTS "Users can manage their own transactions" ON public."Transactions";

CREATE POLICY "Users can manage their own parties"
ON public."Parties"
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own transactions"
ON public."Transactions"
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS parties_user_id_idx ON public."Parties"(user_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public."Transactions"(user_id);
CREATE INDEX IF NOT EXISTS transactions_party_date_idx ON public."Transactions"(party_id, date);

COMMIT;
