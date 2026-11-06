import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const billing = read('../components/SubscriptionBilling.tsx');
const service = read('../services/supabaseService.ts');
const owner = read('../components/OwnerControlCenter.tsx');
const migration = read('../supabase/migrations/20261106130000_owner_customer_phone_lookup.sql');
const indexMigration = read('../supabase/migrations/20261106133000_owner_customer_contacts_fk_index.sql');
const pkg = JSON.parse(read('../package.json'));
const lock = JSON.parse(read('../package-lock.json'));
const customerConfig = JSON.parse(read('../src-tauri/tauri.conf.json'));
const ownerConfig = JSON.parse(read('../src-tauri/tauri.owner.conf.json'));
const appVersion = read('../desktop/appVersion.ts');

assert.ok(billing.includes('ownerMode=false'), 'Customer billing view must default to non-owner mode');
assert.ok(billing.includes('ownerMode ? dbService.isBillingAdmin() : Promise.resolve(false)'), 'Owner role must only be checked in the separate owner portal');
assert.ok(billing.includes("accessStatus?.access_source==='owner_admin'?"), 'Customer view must not expose the Admin Access label');
assert.ok(billing.includes('ownerSearchCustomer(identifier)'), 'Owner lookup must accept Gmail or phone');
assert.ok(billing.includes('ownerSaveCustomerPhone(customer.customer_email,customerPhone)'), 'Owner must be able to save a phone against the verified Gmail');
assert.ok(billing.includes('customer.customer_email'), 'The actual registered Gmail must be displayed');
assert.ok(billing.includes('customer_phone'), 'The saved phone must be displayed');
assert.ok(owner.includes('<SubscriptionBilling ownerMode/>'), 'Only the Owner Control Center can enable customer-management mode');
assert.ok(service.includes("supabase.rpc('owner_search_customer'"), 'Customer search RPC must be wired');
assert.ok(service.includes("supabase.rpc('owner_save_customer_phone'"), 'Phone-save RPC must be wired');

assert.ok(migration.includes('create table if not exists private.owner_customer_contacts'), 'Phone mapping must stay in the private schema');
assert.ok(migration.includes('alter table private.owner_customer_contacts enable row level security'), 'Phone mapping table must enable RLS');
assert.ok(migration.includes('revoke all on table private.owner_customer_contacts from public, anon, authenticated'), 'Customers must have no direct access to phone mappings');
assert.ok(migration.includes('private.is_billing_admin()'), 'Both RPCs must require an authenticated Owner');
assert.ok(migration.includes('grant execute on function public.owner_search_customer(text) to authenticated'), 'Only authenticated role may invoke the owner-gated search RPC');
assert.ok(migration.includes('grant execute on function public.owner_save_customer_phone(text, text) to authenticated'), 'Only authenticated role may invoke the owner-gated save RPC');
assert.ok(migration.includes("check (phone_number ~ '^01[3-9][0-9]{8}$')"), 'Stored phone must be a normalized Bangladesh mobile number');
assert.ok(migration.includes('phone_number text not null unique'), 'Phone lookup must be unambiguous');
assert.ok(migration.includes('u.email::text'), 'Search result must return the Auth email, not a user-editable email field');
assert.ok(migration.includes('on delete cascade'), 'Phone mapping must be removed with a deleted customer account');
assert.ok(indexMigration.includes('owner_customer_contacts_updated_by_idx'), 'Updater foreign key must be indexed');
assert.ok(indexMigration.includes('drop index if exists private.owner_customer_contacts_updated_at_idx'), 'Unused timestamp index should not be retained');

assert.equal(pkg.version, '1.0.6');
assert.equal(lock.version, pkg.version);
assert.equal(lock.packages[''].version, pkg.version);
assert.equal(customerConfig.version, pkg.version);
assert.equal(ownerConfig.version, pkg.version);
assert.ok(appVersion.includes(`APP_VERSION = '${pkg.version}'`));
console.log('Owner customer-contact contract passed: isolated Admin UI, verified Gmail lookup, unique private phone mapping, Owner-only RPCs and synchronized app versions.');
