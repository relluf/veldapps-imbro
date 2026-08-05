"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadAmd(file) {
	let exported;
	vm.runInNewContext(fs.readFileSync(file, "utf8"), {
		Array: Array,
		Math: Math,
		Object: Object,
		String: String,
		console: console,
		define(factory) {
			exported = factory();
		}
	}, { filename: file });
	return exported;
}

const root = path.resolve(__dirname, "..");
const Bhr = loadAmd(path.join(root, "src/Bhr.js"));
const broFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.js"), "utf8");
const bhrFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.bhr.js"), "utf8");

assert.match(bhrFacetSource, /function isBhrResult[\s\S]*if\(!isBhrResult\(result\)\) return null/,
	"een achtergebleven BHR-renderer mag geen ander documenttype overschrijven");
assert.match(bhrFacetSource,
	/root\.vars\(\["document\.bro\.applyView"\]\)[\s\S]*applyBroView\(action\)/,
	"de directe BHR-facet moet de Data-tab met de specifieke BRO-view vullen");

const result = {
	type: "bro-bhr/1.1",
	version: "1.1",
	root: "dispatchDataResponse",
	xml: "dispatchDataResponse",
	"dsbhr:dispatchDataResponse": {
		"brocom:responseType": "dispatch",
		"dsbhr:dispatchDocument": {
			"dsbhr:BHR_O": {
				"brocom:broId": "BHR000000045428",
				"brocom:qualityRegime": "IMBRO/A",
				"dsbhr:discipline": "bodemkunde",
				"dsbhr:surveyPurpose": "bodemkundigOnderzoek",
				"dsbhr:deliveredLocation": {
					"bhrcom:location": { "gml:pos": "135000 455000" }
				},
				"dsbhr:deliveredVerticalPosition": {
					"bhrcom:offset": "1.25",
					"bhrcom:verticalDatum": "NAP",
					"bhrcom:localVerticalReferencePoint": "maaiveld"
				},
				"dsbhr:boring": {
					"bhrcom:boringStartDate": { "brocom:date": "2021-01-02" },
					"bhrcom:boringEndDate": { "brocom:date": "2021-01-03" },
					"bhrcom:boredTrajectory": {
						"bhrcom:beginDepth": "0",
						"bhrcom:endDepth": "8"
					},
					"bhrcom:removedTrajectory": {
						"bhrcom:removedLayer": {
							"bhrcom:upperBoundary": "0",
							"bhrcom:lowerBoundary": "0.3",
							"bhrcom:removedMaterial": "puin"
						}
					},
					"bhrcom:boringTool": {
						"bhrcom:boringToolType": "edelmanboor",
						"bhrcom:boringToolDiameter": "70",
						"bhrcom:boredInterval": {
							"bhrcom:beginDepth": "0",
							"bhrcom:endDepth": "8"
						}
					}
				},
				"dsbhr:boreholeSampleDescription": {
					"bhrcom:result": {
						"bhrcom:sampleQuality": "ongeroerd",
						"bhrcom:rootPenetrableDepth": "0.5",
						"bhrcom:meanHighestGroundwaterLevel": "0.25",
						"bhrcom:meanLowestGroundwaterLevel": "1.3",
						"bhrcom:litterLayer": {
							"bhrcom:upperBoundary": "0",
							"bhrcom:lowerBoundary": "0.2",
							"bhrcom:horizonCode": "Oh",
							"bhrcom:litterType": "naaldstrooisel"
						},
						"bhrcom:soilLayer": [{
							"bhrcom:upperBoundary": "0.2",
							"bhrcom:lowerBoundary": "2",
							"bhrcom:anthropogenic": "ja",
							"bhrcom:numberOfLayerComponents": "2",
							"bhrcom:layerComponent": [{
								"bhrcom:volumePercentage": "70",
								"bhrcom:horizonCode": "Ah"
							}, {
								"bhrcom:volumePercentage": "30",
								"bhrcom:horizonCode": "Cz",
								"bhrcom:depositionalCharacteristic": "fluviatielRijnHoloceen"
							}]
						}, {
							"bhrcom:upperBoundary": "2",
							"bhrcom:lowerBoundary": "5",
							"bhrcom:anthropogenic": "nee",
							"bhrcom:numberOfLayerComponents": "2",
							"bhrcom:layerComponent": [{ "bhrcom:horizonCode": "B" },
								{ "bhrcom:horizonCode": "C" }]
						}],
						"bhrcom:consolidatedRockLayer": {
							"bhrcom:upperBoundary": "5",
							"bhrcom:lowerBoundary": "8",
							"bhrcom:horizonCode": "Ru",
							"bhrcom:rockType": "kalksteen"
						}
					},
					"bhrcom:descriptionMethod": "AlterraTD19A",
					"bhrcom:descriptionLocation": "veld",
					"bhrcom:soilClassification": {
						"bhrcom:classificationCode": "M5p 235a",
						"bhrcom:soilClass": "poldervaaggrondZeeklei"
					}
				},
				"dsbhr:boreholeSampleAnalysis": {
					"bhrcom:investigatedInterval": {
						"bhrcom:InvestigatedInterval": {
							"bhrcom:beginDepth": "1",
							"bhrcom:endDepth": "1.4",
							"bhrcom:analysisType": "basisparameter",
							"bhrcom:locationSpecific": "ja"
						}
					}
				}
			}
		}
	}
};

const model = Bhr.model(result);
const layers = model.tracks.find(track => track.key === "layers-0");
const boredTrack = model.tracks.find(track => track.key === "boredInterval");

assert.match(broFacetSource,
	/"bro-bhr":\s*"veldapps-imbro\/Tabs<Document\.bro\.bhr>"/,
	"de generieke BRO-facet moet BHR naar het package-gekwalificeerde facet routeren");
assert.match(bhrFacetSource, /defaultTab:\s*"tab-preview"/,
	"BHR moet standaard met de Weergave-tab openen");
assert.match(bhrFacetSource, /BroPreview\.open\(this, evt\)/,
	"BHR-profielobjecten moeten in een Alphaview kunnen openen");
assert.match(bhrFacetSource, /document:\s*\{[\s\S]*bro:\s*\{[\s\S]*bhr:\s*\{/,
	"VCL-vars moeten als geneste objecten worden gedefinieerd");
assert.strictEqual(model.broId, "BHR000000045428");
assert.strictEqual(model.finalDepth, 8);
assert.strictEqual(model.maximumDepth, 8);
assert.strictEqual(layers.items.length, 4,
	"strooisel-, bodem- en gesteentelagen moeten in één bodemprofiel staan");
assert.deepStrictEqual(Array.from(layers.items.map(item => item.kind)), [
	"litterLayer", "soilLayer", "soilLayer", "consolidatedRockLayer"
]);
assert.deepStrictEqual(Array.from(layers.items[1].components.map(component => component.percentage)), [70, 30]);
assert.deepStrictEqual(Array.from(layers.items[2].components.map(component => component.percentage)), [50, 50],
	"componenten zonder percentages moeten de resterende breedte gelijk verdelen");
assert.ok(model.tracks.some(track => track.key === "removedLayer"));
assert.ok(model.tracks.some(track => track.key === "boredInterval"));
assert.ok(model.tracks.some(track => track.key === "investigatedInterval"));
assert.strictEqual(boredTrack.title, "Boortraject");
assert.deepStrictEqual(Array.from(model.markers.map(marker => marker.depth)), [0.25, 1.3, 0.5]);
assert.ok(model.metadata.some(item => item.value.indexOf("M5p 235a") !== -1));

const firstSvg = Bhr.svg(model);
const secondSvg = Bhr.svg(model);
const firstPattern = firstSvg.match(/id='(bhr-organic-[^']+)'/)[1];
const secondPattern = secondSvg.match(/id='(bhr-organic-[^']+)'/)[1];
const trackLinks = [];
let documentLinkCount = 0;
const interactiveSvg = Bhr.svg(model, {
	instanceAttrs(instance, label, meta) {
		if(Array.isArray(instance)) {
			trackLinks.push({ instance: instance, label: label, meta: meta });
			return " data-bro-ref='test-track'";
		}
		if(instance === model.document) {
			++documentLinkCount;
			return " data-bro-ref='test-document'";
		}
		return instance ? " data-bro-ref='test-object'" : "";
	}
});
assert.notStrictEqual(firstPattern, secondPattern,
	"ieder gerenderd profiel moet documentglobaal unieke SVG-pattern-IDs krijgen");
assert.ok(firstSvg.indexOf("url(#" + firstPattern + ")") !== -1);
assert.match(interactiveSvg, /class='profile-layer[^']*' data-bro-ref='test-object'/);
assert.match(interactiveSvg,
	/<g class='track-heading' data-bro-ref='test-track'><text class='track-title'[^>]*>Bodemprofiel<\/text><text class='track-detail'[^>]*>/,
	"de bodemprofielkop en zijn detailtekst moeten samen klikbaar zijn");
assert.match(interactiveSvg,
	/<g class='track-heading' data-bro-ref='test-track'><text class='track-title'[^>]*>Boortraject<\/text><text class='track-detail'[^>]*>1 traject<\/text><\/g>/,
	"de boortrajectkop en zijn telling moeten samen klikbaar zijn");
assert.strictEqual(trackLinks.find(link => link.label === "Open Boortraject").instance, boredTrack.items,
	"de kop moet de bijbehorende trajecten rechtstreeks aan H.i aanbieden");
assert.ok(trackLinks.every(link => link.meta.direct === true));
assert.match(interactiveSvg, /class='metadata-row' data-bro-ref='test-document'/,
	"metadata-label en -waarde moeten samen het BHR-document openen");
assert.strictEqual(documentLinkCount, model.metadata.length,
	"de registratiekop plus alle metadata behalve het externe BRO-id moeten intern inspecteerbaar zijn");
assert.match(interactiveSvg,
	/<g class='metadata-heading' data-bro-ref='test-document'><text class='metadata-title' x='[^']+' y='25'>Registratie en boring<\/text><\/g>/,
	"Registratie en boring moet de root-entity openen");
const underlineRules = bhrFacetSource.split("\n")
	.filter(line => line.indexOf("text-decoration:underline") !== -1);
assert.ok(underlineRules.length > 0 && underlineRules.every(rule => rule.indexOf(":hover") !== -1),
	"klikbare tekst mag alleen bij hover worden onderstreept");
assert.match(Bhr.render(model), /Gemiddeld hoogste grondwaterstand/);
assert.match(Bhr.render(model), /Registratie en boring/);
assert.match(Bhr.render(model), /Kalksteen/);
assert.match(Bhr.render(model), /Einddiepte 8 m/);
const bhrIdMetadata = model.metadata.find(item => item.label === "ID");
const originalBhrId = model.broId;
model.broId = "BHR-TEST-1";
bhrIdMetadata.value = model.broId;
const internalBhr = Bhr.render(model, {
	instanceAttrs(instance) {
		return instance === model.document ? " data-bro-ref='bhr-document'" : "";
	}
});
assert.match(internalBhr, /<strong class='bhr-preview-id' data-bro-ref='bhr-document'>BHR-TEST-1<\/strong>/,
	"een niet-BRO-ID in de previewheader moet de BHR-root openen");
assert.match(internalBhr,
	/<g class='metadata-row' data-bro-ref='bhr-document'><text class='metadata-label'[^>]*>ID:<\/text>/,
	"een niet-BRO-ID in de metadata moet de BHR-root openen");
model.broId = originalBhrId;
bhrIdMetadata.value = model.broId;
const bhrBroLoketUrl = "https://broloket.nl/ondergrondgegevens\\?bro-id=BHR000000045428";
assert.match(Bhr.render(model), new RegExp("<a class='bhr-preview-id bro-id-link' href='" +
	bhrBroLoketUrl + "' target='_blank' rel='noopener noreferrer'>"),
	"het BHR-id boven het profiel moet Broloket in een nieuw tabblad openen");
assert.match(Bhr.svg(model), new RegExp("<a class='metadata-row bro-id-link' href='" +
	bhrBroLoketUrl + "' target='_blank' rel='noopener noreferrer'><text class='metadata-label'[^>]*>ID:</text>"),
	"de ID-rij van BHR moet naar hetzelfde Broloket-record verwijzen");
assert.match(bhrFacetSource, /& \.bhr-preview-header \.bro-id-link[^\n]*color:inherit;/,
	"een BRO-id in de previewheader moet de gewone tekstkleur behouden");
assert.doesNotMatch(Bhr.render(Bhr.model({ xml: {
	"bhrcom:soilLayer": {
		"bhrcom:upperBoundary": "0",
		"bhrcom:lowerBoundary": "1",
		"bhrcom:layerComponent": { "bhrcom:horizonCode": "<script>alert(1)</script>" }
	}
} })), /<script>/, "waarden uit XML moeten voor HTML/SVG worden ge-escaped");

console.log("Bhr tests passed");
