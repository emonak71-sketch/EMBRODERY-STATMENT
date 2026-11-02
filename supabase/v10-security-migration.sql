-- Embroidery Statement v10: strict account isolation for customer and ledger records.
--
-- Before running:
-- 1) Replace YOUR_LOGIN_EMAIL with the email of the account that owns the existing data.
-- 2) Run only if every legacy row with a NULL user_id belongs to that one account.
-- 3) If multiple accounts already share these tables, assign each legacy row to its true owner first.
--
-- The restrictive RLS policies below are intentional: they continue to enforce ownership
-- even if older permissive policies remain on either table.

BEGIN;

ALTER TABLE public."Parties"
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public."Transactions"
  ADD COLUMN IF NOT EXISTS user_id uuid;

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

-- Every row must have an owner before RLS is enabled.
ALTER TABLE public."Parties"
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public."Transactions"
  ALTER COLUMN user_id SET DEFAULT auth.uid(),
  ALTER COLUMN user_id SET NOT NULL;

-- Add owner foreign keys if these columns were created earlier without one.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parties_user_id_auth_fkey'
      AND conrelid = 'public."Parties"'::regclass
  ) THEN
    ALTER TABLE public."Parties"
      ADD CONSTRAINT parties_user_id_auth_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_user_id_auth_fkey'
      AND conrelid = 'public."Transactions"'::regclass
  ) THEN
    ALTER TABLE public."Transactions"
      ADD CONSTRAINT transactions_user_id_auth_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id);
  END IF;
END
$$;

-- A transaction must belong to a customer owned by the same account.
CREATE UNIQUE INDEX IF NOT EXISTS parties_user_id_id_uidx
  ON public."Parties"(user_id, id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_party_owner_fkey'
      AND conrelid = 'public."Transactions"'::regclass
  ) THEN
    ALTER TABLE public."Transactions"
      ADD CONSTRAINT transactions_party_owner_fkey
      FOREIGN KEY (user_id, party_id)
      REFERENCES public."Parties"(user_id, id)
      ON DELETE RESTRICT;
  END IF;
END
$$;

ALTER TABLE public."Parties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Transactions" ENABLE ROW LEVEL SECURITY;

-- Permissive policies grant authenticated users access to rows owned by them.
DROP POLICY IF EXISTS "v10_parties_owner_access" ON public."Parties";
CREATE POLICY "v10_parties_owner_access"
ON public."Parties"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "v10_transactions_owner_access" ON public."Transactions";
CREATE POLICY "v10_transactions_owner_access"
ON public."Transactions"
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public."Parties" AS p
    WHERE p.id = public."Transactions".party_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public."Parties" AS p
    WHERE p.id = public."Transactions".party_id
      AND p.user_id = auth.uid()
  )
);

-- Restrictive guards are ANDed with every permissive policy, including legacy policies.
DROP POLICY IF EXISTS "v10_parties_owner_guard" ON public."Parties";
CREATE POLICY "v10_parties_owner_guard"
ON public."Parties"
AS RESTRICTIVE
FOR ALL
TO public
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "v10_transactions_owner_guard" ON public."Transactions";
CREATE POLICY "v10_transactions_owner_guard"
ON public."Transactions"
AS RESTRICTIVE
FOR ALL
TO public
USING (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public."Parties" AS p
    WHERE p.id = public."Transactions".party_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public."Parties" AS p
    WHERE p.id = public."Transactions".party_id
      AND p.user_id = auth.uid()
  )
);

CREATE INDEX IF NOT EXISTS parties_user_id_idx
  ON public."Parties"(user_id);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx
  ON public."Transactions"(user_id);

CREATE INDEX IF NOT EXISTS transactions_party_date_idx
  ON public."Transactions"(party_id, date);

COMMIT;
