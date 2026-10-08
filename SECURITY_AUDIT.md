# Dependency security audit — 2026-10-07

This project pins security-sensitive runtime dependencies rather than using broad `^` ranges.

- `next` 16.3.8 — upgraded from `^16.0.0`. This is newer than the 16.3.6 fix for GHSA-vcvr-r3jv-pc5j and the 16.3.3 fix for GHSA-p293-qw3h-jr36.
- `react` / `react-dom` 19.3.0 — upgraded from broad 19.0 ranges. React's 2026 RSC advisories patched earlier 19.x lines; keep these pinned and run `npm audit` in CI.
- `postgres` 3.4.9 — current npm release found during this audit.
- `html5-qrcode` 2.3.8 — current npm release; zero direct dependencies according to npm metadata.
- `qrcode` 1.5.4 — current npm release found during this audit.
- `dotenv` 18.0.5 — current npm release found during this audit.

No dependency list can be guaranteed vulnerability-free indefinitely. Before each production deployment run:

```bash
npm ci
npm audit --omit=dev
npm run typecheck
npm run build
```

Use Dependabot or Renovate on the GitHub repository, and treat new Next.js/React security advisories as high priority.

## v1.5 PDF generation addition

`pdf-lib` 1.17.1 was added for server-side PDF creation. The application only creates new PDFs from trusted bundled badge artwork plus database text/QR data; it does not accept or parse uploaded PDF documents. This distinction is important because an open upstream 2026 issue discusses ReDoS behavior in PDF date parsing. Keep `npm audit`/Dependabot enabled and reassess the library if PDF upload/parsing is ever introduced.
