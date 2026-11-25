# Project rules

- The only writable GitHub destination is `Sebastian6848/DeepSeek-Harness-in-Win7`. Never push to official or community repositories.
- Reuse the pinned `factfinding/dsh-win7` packaging/compatibility work and its Harness fork. Do not develop a replacement agent from scratch.
- `deepseek-harness/` is a vendored source snapshot, not a submodule. Its initial Git tree is recorded in `sources.lock.json`; preserve upstream licenses and attribution.
- Target Windows 7 SP1 x64 and a user-configured intranet OpenAI-compatible model. Default model: `ds`. Preserve editable address/model/key fields.
- Disable external search/fetch, automatic updates, account refresh, telemetry and runtime downloads by default. Do not describe failed network requests as offline support.
- Preserve local editing, terminal permissions and existing session behavior. Do not weaken ACLs or disable TLS verification to fix compatibility problems.
- Keep build-time downloads separate from target runtime. Never commit user credentials, local paths, compiled dependencies, installers or previous prototypes.
- Use focused regression tests, then build checks appropriate to changed source. Report real Win7 validation separately from development-host checks.
