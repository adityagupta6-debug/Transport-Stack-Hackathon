# Hackathon fixes

- Fixed CSV row splitting for standard LF and CRLF files.
- Added support for UTF-8 BOM, quoted commas, escaped quotes, and clear errors for unclosed quotes or empty headers.
- Fixed normalized CSV column matching for route and time fields (including `route_number`).
- Reset previous upload results on a failed/new upload and allow reselecting the same file.
- Made direct route matching respect the stop order in each route record instead of silently assuming reverse-direction service.
- Updated README limitations and feature notes.

## Still intentionally not claimed

- Crowding values remain illustrative demo estimates.
- Uploaded CSV is inspected locally but is not connected to the crowding model.
- No official GTFS or passenger data was supplied in the archive.


## October ETM + backend integration

- Added the supplied 1,048,575-row October ETM export in compressed TSV form.
- Added a populated SQLite database with raw ticket records, indexed columns, hourly route-demand aggregates and source metadata.
- Added a reproducible ETL script and data coverage audit.
- Added a scikit-learn HistGradientBoostingRegressor, chronological holdout evaluation and saved model artifact.
- Added FastAPI endpoints for health, summary, route search, hourly demand, model metrics and experimental predictions.
- Connected the Dataset workspace to the local backend and displayed actual dataset/model metrics.
- Added backend tests; all 4 tests pass.

## Known validation limits

- The supplied file contains records on 17 dates only; 15–27 October are missing.
- The model currently underperforms the global-mean baseline on the chronological holdout (MAE 9.89 vs 4.17 tickets per route-hour; R² -57.78). It is experimental and low-confidence.
- Ticket transactions are not direct onboard occupancy. The existing sample planner's route catalogue is still illustrative and is not mapped to the source's 2,155 route identifiers.
- Frontend JSX syntax was transpile-checked, but a full Vite production build could not be run because npm dependency installation timed out in this environment.
