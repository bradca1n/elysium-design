# TODOs

## Security / Infrastructure

### Lock down Secrets Manager VPC access
Secrets Manager is currently reachable from the public internet (verified locally).
Add a resource policy to restrict access to the VPC endpoint (`aws:sourceVpce`) so secrets
can only be fetched from within the VPC (Lambda) and not from developer machines or the internet.
Reference: `services/api/src/lib/signingWallet.ts`, `services/api/src/lib/db.ts`

## App / Project Structure

### Rename apps to match domain names
- `apps/next/` → `apps/investor/`
- `apps/mobile/` → `apps/investor-mobile/`
Update all references: `turbo.json`, `package.json` workspaces, `docker-compose.yml`, import paths, CI config.

## Frontend
