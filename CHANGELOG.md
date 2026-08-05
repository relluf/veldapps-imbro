# `2026/08/05` Makes BRO previews safer and directly inspectable

## Profile routing and facet lifecycle

* Gives every package-owned BRO XML profile an explicit component URI in [src/profiles/xml.js](), so BHR, BHR-GT, CPT, GLD, GMW and SAD Documents select their specialized facet without application-side inference.
* Adds document-type guards to [src/vcl-comps/Tabs$/Document.bro.bhr.js](), [src/vcl-comps/Tabs$/Document.bro.bhrgt.js](), [src/vcl-comps/Tabs$/Document.bro.cpt.js](), [src/vcl-comps/Tabs$/Document.bro.gld.js]() and [src/vcl-comps/Tabs$/Document.bro.gmw.js]() so delayed renderers cannot overwrite a subsequently opened document.
* Exposes the shared BRO view applicator from [src/vcl-comps/Tabs$/Document.bro.js]() and reapplies it when BHR and BHR-GT specializations activate.

## Interactive BRO previews

* Extends [src/BroPreview.js]() with direct inspection targets, allowing document roots, arrays and complete metadata rows to open unchanged through `H.i`.
* Makes BHR and BHR-GT track headings, registration headings, metadata rows and source objects inspectable in [src/Bhr.js]() and [src/BhrGt.js](); the previews now resolve the actual borehole/meetpunt document object instead of defaulting to the full envelope.
* Makes CPT and GMW metadata rows inspect their underlying source value or document in [src/Cpt.js]() and [src/Gmw.js](). Valid BRO IDs in all four preview families link directly to Broloket, while non-BRO identifiers remain internal inspection links.
* Refines BHR-GT material and interval labels, keeps composite material descriptions readable, and reduces the GMW vertical plot height to improve the preview balance.
* Updates the BHR, BHR-GT, CPT and GMW facet styles so internal targets and external BRO-ID links have consistent hover and SVG behavior.

## ElliTrack output

* Moves [src/veldoffice/UitleesrondeGldFull.js]() to the logger-scoped ElliTrack module and supports import grouping per year, quarter or month, preserving the selected period classification in every generated file.

## Regression coverage

* Extends [test/BroPreview.test.js](), [test/Bhr.test.js](), [test/BhrGt.test.js](), [test/Cpt.test.js]() and [test/Gmw.test.js]() with direct-inspection, Broloket-link, clickable-heading, layout and material-label assertions.
* Adds the BHR-GT 2.1 dispatch fixture [test/fixtures/bro-bhr-gt-2.1.xml]() and verifies its profile, version, facet and Document contract in [test/ParserContract.test.js]().
* Extends [test/UitleesrondeGldFull.test.js]() with the logger-module migration, stale GLD facet protection and quarterly/monthly ElliTrack filenames.

# `2026/07/31` `1.0.9` BRO document facets and GLD full CSV uitleesrondes

## BXV integration contract

* Adds package-owned XML profiles for BHR, BHR-GT, CPT, GLD, GMW and SAD plus an explicit, idempotent `bxv.install()` entrypoint.
* Refactors GLD full CSV registration to use the shared profile registry while preserving the compatibility entry module.
* Adds positive BRO, generic XML fallback and duplicate-installation contract coverage against the shared parser harness.

## CPT

* Adds the `bro.cpt` document facet for CPT 1.0/1.1 intake and dispatch documents, decoding the fixed SWE `DataArray` measurement record and its declared text separators.
* Shows depth-scaled cone resistance, local friction, friction ratio and pore-pressure profiles, together with predrilled depth, removed layers, dissipation tests and registration metadata.
* Makes CPT series, document metadata, removed layers and dissipation tests clickable so their parsed XML source opens in the shared BRO Alphaview, and supplies compact measurement and parameter collections for the Data tab.

## BHR

* Adds the `bro.bhr` document facet for BHR 1.1/2.0 intake and dispatch documents, with a depth-scaled pedological bore profile, layer-component proportions, bore and research intervals, registration metadata, groundwater levels and root-penetrable depth.
* Makes BHR layers, intervals and depth markers clickable so their parsed XML source opens in the shared BRO Alphaview.

## GMW

* Adds the `bro.gmw` document facet with a depth-scaled groundwater monitoring well profile on the Weergave tab, including monitoring tubes, screens, sumps, electrodes, registration metadata and well events.
* Routes both `isgmw` intake documents and `dsgmw` dispatch documents to the same facet and derives missing intake screen positions from the supplied tube-part lengths.

## BHR-GT

* Adds the `bro.bhrgt` document facet with a traditional, depth-scaled bore-profile Weergave tab: patterned material fractions, layer thicknesses, registration metadata, investigated intervals and bored intervals.
* Covers every BHR-GT 2.1 layer form: soil, rock and special-material layers, not-described intervals, post-sedimentary discontinuities, excavated layers and fluid-mud layers.
* Also shows sampled, completed and contaminated intervals when present and corrects the BHR-GT Data view to collect all repeated logs and XSD-defined layer forms.
* Makes BHR-GT layers and intervals and GMW tubes, tube parts, electrodes and events clickable, opening their parsed XML source in the same floating Alphaview used by the IMSIKB preview.
* Gives each rendered BHR-GT and GMW SVG its own pattern IDs, so material and filter hatching remains visible when multiple documents are previewed successively.
* Improves the GMW profile balance with a wider tube track and metadata column, compact deep-well scaling, non-overlapping labels and suppression of meaningless zero diameters.

## BRO-validatieresultaten

* Moves JSON recognition and normalization of `validatie-*.json` BRO service responses from the generic Veldoffice JSON facet into `veldapps-imbro/BroValidationResult`.
* Registers the classifier instance-scoped through the application document context and keeps `Tabs<Document.json>` domain-neutral.

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

* Moves the BRO-specific document facets out of `veldoffice-vcl-comps` and makes this package the canonical owner of `Tabs<Document.bro>`, `Tabs<Document.bro.gld>` and `Tabs<Document.bro.sad>`.
* Renames the former VCL specializations `Tabs<Document.bro-gld>` and `Tabs<Document.brosad>` to `Tabs<Document.bro.gld>` and `Tabs<Document.bro.sad>`, expressing GLD and SAD as refinements of the shared BRO facet.
* Keeps the external parser and format identifiers `bro-gld` and `bro-sad` unchanged; the host facet registry maps those identifiers to the dotted package-qualified VCL component URIs.
* Lets the GLD and SAD facets inherit their package-local BRO base through `./Tabs<Document.bro>`; SAD additionally composes the package-qualified SIKB facet for its embedded SIKB document.
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
