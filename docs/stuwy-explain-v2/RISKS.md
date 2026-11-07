# Risks

| Risk | Impact | Mitigation | State |
|---|---|---|---|
| Existing lint debt | Slows clean CI adoption | Track baseline separately; lint new V2 files during review | Open |
| Existing renderer uses text rows in some paths | Place-value drift on complex operations | Add structured column contracts and screenshot/mobile checks | Open |
| AI wording can invent unsupported steps | Incorrect teaching | Generate wording only from verified step objects; deterministic fallback | Open |
| Broad branch divergence | Regression in Tutor/parent/mobile flows | Do not wholesale merge `learning` or release branches | Mitigated |
