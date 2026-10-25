# v3 status

The owner replaced the broad redesign with a ZIP-only app on v3, created from v2. The single combined payload includes focused routes/screens, repository selection/initialized creation, safe ZIP review/publication/history, request-size-bounded text batches with binary fallback and CI branch updates. See docs/V3.md.

The old seven-commit collaboration plan is not active for v3. Main/v2 remain separate. No native background worker, backend, AI feature, multi-account profiles, Enterprise support or signing automation is added. Source completion is not runtime validation. A push is complete only when the connector returns its commit SHA; no verification calls are made afterward.
