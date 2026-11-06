# Embroidery Statement v1.0.6

## Owner customer lookup
- Search a registered customer using either their verified Gmail or their saved Bangladesh mobile number.
- Display the customer's real Supabase Auth Gmail automatically when a saved mobile number is searched.
- Let the Owner save or update one unique mobile number against a verified customer account.
- Keep Gmail as the only customer sign-in identifier; phone numbers are lookup-only.
- Store phone mappings in a private, RLS-protected schema with Owner-only RPC access.

## Customer and Owner access separation
- Keep Customer Account billing screens in customer mode; do not expose the Owner/Admin access label or customer-management controls there.
- Enable customer lookup and subscription management only inside the separately authenticated Owner Control Center.
- Preserve server-side Owner role checks for every phone lookup, phone save and subscription grant.

## Compatibility
- No existing customer accounts, Gmail credentials, transactions, subscription records, worker data or business records are changed.
- Existing customer and Owner application identifiers and user-data locations remain unchanged.
- Synchronize Customer, Owner, Android and Windows app version metadata to 1.0.6.
