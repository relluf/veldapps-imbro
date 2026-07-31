
# `2026/07/31` BRO document facets and GLD full CSV uitleesrondes

## GLD full CSV

* Adds `GldFullCsv.js` for detecting and parsing BRO `GLD…_full.csv` exports by filename or their identifying header structure.
* Preserves the registration GLD ID, source holder, quality regime, well GMW ID, tube number, observations and individual groundwater-level measurements as separate document data.
* Produces normalized `bro-gld-full-csv` results with rows, headers, summaries, capabilities and the package-owned `Tabs<Document.gld-full>` facet.
* Adds a chronological GLD preview with observation-period guides and quality-control-specific measurement markers.
* Registers the GLD full profile ahead of the generic BXV CSV fallback through the `gld-full-csv` entry module.

## Uitleesronde workflow

* Adds `veldoffice/UitleesrondeGldFull` for processing one or more GLD full CSV files from a flat folder or a single-root folder/zip package.
* Links GLD registrations primarily through the registration BRO ID to `MeetpuntFilter.broId`, then selects `LoggerPlaatsing` records that cover the complete measurement period.
* Uses the well BRO ID and tube number as context checks without overriding the authoritative GLD-ID match.
* Supports manual logger-placement selection when several filters or placements match and reports invalid package structures and unsupported resources through the shared uitleesronde workflow.
* Generates deduplicated, timezone-aware ElliTrack import files while deliberately leaving `Controlemetingen` empty because GLD full exports do not provide unambiguous control measurements.

## BRO document facets

* Adds package-owned `Tabs<Document.bro>`, `Tabs<Document.bro-gld>` and `Tabs<Document.brosad>` specializations.
* Adds BRO domain views for dispatch responses, GMW, BHR-GT, GLD time series and SAD envelopes with embedded SIKB documents.
* Adds BRO and SAD validation actions, package-specific facet activation and OpenLayers geometry handling for locations, projects and boreholes.

## Schemas, code lists and tests

* Adds the BRO SWE 1.0 profile and BHR-GT Common 2.1 XSD resources.
* Adds 457 package-local code-list resources covering BHR, BHR-G, BHR-GT, SFR, SR, CPT, EPL, GAR, GLD, GMN, GMW and shared BRO domains.
* Adds GLD full regression coverage for format detection, package structure, authoritative ID matching, ambiguous placement selection, preview ordering and ElliTrack conversion.
* Replaces the placeholder npm test command with the GLD full uitleesronde test suite and documents the workflow in `README.md`.

# `2021/09/22` @1.0.7

* Voorbereiden BHR-GT updaten naar 2.1

# `2021/09/08` @1.0.2

* Updating [src/domains.json](:), bumping up from 299 to 456 domains
* Updating all domains
* Adjust V7 to use this package
* Get SoilNames back online

# `2021/05/10` @1.0.1

* Promoting this package to be the canonical one, ie. to be used by:
	* veldoffice-publiek-putten
	* veldoffice-rapportage-vcl
	* veldoffice-geografie-vcl
	* V7, VA, cavalion-code, etc.

# `2020-07-22` @1.0.0
* First version with this log, note that a predecessor project [has been around for some time](https://www.npmjs.com/package/veldapps-codes-broservices) already

>> ![image](https://user-images.githubusercontent.com/686773/88216603-eddf2500-cc22-11ea-83af-b8578729c4b1.png)
