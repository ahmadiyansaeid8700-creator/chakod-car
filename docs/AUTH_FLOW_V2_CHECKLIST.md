# Auth V2 implementation checklist

- [ ] Replace incomplete-profile redirect `/account?complete=1` with `/account-v2/profile?complete=1`.
- [ ] Preserve safe internal `returnTo` through onboarding.
- [ ] Add optional referral-code entry to new/incomplete-user onboarding only.
- [ ] Validate referral code server-side.
- [ ] Confirm Account V2 profile saves concrete account type.
- [ ] Audit every production consumer of `chakod_session_token` / `chakod_user` / `chakod_identity`.
- [ ] Migrate production auth source of truth to secure session cookie + `/api/auth/me`.
- [ ] Remove production session-token storage from LocalStorage only after legacy consumers are migrated.
- [ ] Verify logout invalidates server session/cookie.
- [ ] Verify role/permission refresh after Sales Partner activation and re-login.
- [ ] Test mobile login, OTP resend, timeout/error states, existing user, new user, returnTo and logout/login on Staging.
