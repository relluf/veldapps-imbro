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
const BhrGt = loadAmd(path.join(root, "src/BhrGt.js"));
const broFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.js"), "utf8");
const bhrGtFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.bhrgt.js"), "utf8");
assert.match(bhrGtFacetSource, /function isBhrGtResult[\s\S]*if\(!isBhrGtResult\(result\)\) return null/,
	"een achtergebleven BHR-GT-renderer mag geen ander documenttype overschrijven");
const xml = {
	"isbhrgt:registrationRequest": {
		"isbhrgt:sourceDocument": {
			"isbhrgt:BHR_GT_CompleteReport_V1": {
				"isbhrgt:objectIdAccountableParty": "BHR-GT-TEST",
				"isbhrgt:boreholeSampleDescription": {
					"bhrgtcom:descriptiveBoreholeLog": {
						"bhrgtcom:describedMaterial": "grondGesteente",
						"bhrgtcom:descriptionQuality": "klasse2",
						"bhrgtcom:layer": [{
							"bhrgtcom:upperBoundary": { "#text": "0", "@_uom": "m" },
							"bhrgtcom:lowerBoundary": { "#text": "1.5", "@_uom": "m" },
							"bhrgtcom:specialMaterial": "puin"
						}, {
							"bhrgtcom:upperBoundary": "1.5",
							"bhrgtcom:lowerBoundary": "3.25",
							"bhrgtcom:soil": {
								"bhrgtcom:geotechnicalSoilName": "sterkGrindigZand",
								"bhrgtcom:colour": "lichtgeel"
							}
						}, {
							"bhrgtcom:upperBoundary": "3.25",
							"bhrgtcom:lowerBoundary": "4",
							"bhrgtcom:rock": { "bhrgtcom:rockType": "kalksteen" }
						}],
						"bhrgtcom:notDescribedInterval": {
							"bhrgtcom:beginDepth": "4",
							"bhrgtcom:endDepth": "4.4",
							"bhrgtcom:noDescriptionReason": "monsterOntbreekt"
						},
						"bhrgtcom:postSedimentaryDiscontinuity": {
							"bhrgtcom:beginDepth": "4.4",
							"bhrgtcom:endDepth": "4.5",
							"bhrgtcom:discontinuityType": "breuk"
						}
					}
				},
				"isbhrgt:boreholeSampleAnalysis": {
					"bhrgtcom:investigatedInterval": {
						"bhrgtcom:beginDepth": "1.5",
						"bhrgtcom:endDepth": "1.7",
						"bhrgtcom:analysisType": "basisparameter",
						"bhrgtcom:sampleQuality": "QM2"
					}
				},
				"isbhrgt:boring": {
					"bhrgtcom:finalDepthBoring": "5",
					"bhrgtcom:excavatedLayer": {
						"bhrgtcom:upperBoundary": "0",
						"bhrgtcom:lowerBoundary": "0.3",
						"bhrgtcom:excavatedMaterial": "ophoogmateriaal"
					},
					"bhrgtcom:boredInterval": {
						"bhrgtcom:beginDepth": "0.3",
						"bhrgtcom:endDepth": "5",
						"bhrgtcom:boringTechnique": "handDraaien",
						"bhrgtcom:boredDiameter": "100"
					},
					"bhrgtcom:sampledInterval": {
						"bhrgtcom:beginDepth": "0.5",
						"bhrgtcom:endDepth": "2",
						"bhrgtcom:samplingMethod": "steken"
					},
					"bhrgtcom:completedInterval": {
						"bhrgtcom:beginDepth": "0",
						"bhrgtcom:endDepth": "1",
						"bhrgtcom:backfillMaterial": "bentoniet"
					},
					"bhrgtcom:contaminatedInterval": {
						"bhrgtcom:beginDepth": "2.5",
						"bhrgtcom:endDepth": "2.8"
					}
				},
				"isbhrgt:fluidMudLayer": {
					"bhrgtcom:thickness": "0.2",
					"bhrgtcom:colour": "donkergrijs"
				}
			}
		}
	}
};

const model = BhrGt.model({ type: "bro-bhr-gt/2.1", version: "2.1", xml: xml });
const layers = model.tracks.find(track => track.key === "layers-0");

const dispatchResult = {
	type: "bro-bhr-gt/2.1",
	version: "2.1",
	root: "dispatchDataResponse",
	xml: "dispatchDataResponse",
	"dsbhrgt:dispatchDataResponse": {
		"brocom:responseType": "dispatch",
		"dsbhrgt:dispatchDocument": {
			"dsbhrgt:BHR_GT_O": {
				"brocom:broId": "BHR000000368931",
				"dsbhrgt:boring": {
					"bhrgtcom:finalDepthBoring": "6",
					"bhrgtcom:boredInterval": {
						"bhrgtcom:beginDepth": "0",
						"bhrgtcom:endDepth": "6",
						"bhrgtcom:boringTechnique": "mechanischBoren"
					}
				},
				"dsbhrgt:boreholeSampleDescription": {
					"bhrgtcom:descriptiveBoreholeLog": {
						"bhrgtcom:layer": {
							"bhrgtcom:upperBoundary": "0",
							"bhrgtcom:lowerBoundary": "6",
							"bhrgtcom:soil": {
								"bhrgtcom:geotechnicalSoilName": "klei"
							}
						}
					}
				}
			}
		}
	}
};
const dispatchModel = BhrGt.model(dispatchResult);
const dispatchDocument = dispatchResult["dsbhrgt:dispatchDataResponse"]
	["dsbhrgt:dispatchDocument"]["dsbhrgt:BHR_GT_O"];
const borehole = { "@_gml:id": "borehole-1" };
const meetpunt = { code: "meetpunt-1" };

assert.match(broFacetSource,
	/"bro-bhr-gt":\s*"veldapps-imbro\/Tabs<Document\.bro\.bhrgt>"/,
	"de generieke BRO-facet moet BHR-GT naar het package-gekwalificeerde facet routeren");
assert.match(bhrGtFacetSource, /defaultTab:\s*"tab-preview"/,
	"BHR-GT moet standaard met de Weergave-tab openen");
assert.match(broFacetSource, /bro:\s*{\s*applyView:\s*applyBroView/,
	"de generieke BRO-facet moet zijn Data-viewfunctie aan specifieke facets beschikbaar stellen");
assert.match(bhrGtFacetSource,
	/root\.vars\(\["document\.bro\.applyView"\]\)[\s\S]*applyBroView\(action\)/,
	"de directe BHR-GT-facet moet de Data-tab met de specifieke BRO-view vullen");
assert.match(bhrGtFacetSource, /BroPreview\.open\(this, evt\)/,
	"BHR-GT moet klikbare profielobjecten in een Alphaview openen");
assert.strictEqual(dispatchModel.broId, "BHR000000368931",
	"een uitgiftebericht met root/xml-naam-tokens moet zijn werkelijke dsbhrgt-root gebruiken");
assert.strictEqual(dispatchModel.document, dispatchDocument,
	"preview-links moeten het geselecteerde BHR-GT-document openen en niet de bericht-wrapper");
assert.strictEqual(BhrGt.model({ xml: { "imsikb0101:Borehole": borehole } }).document, borehole);
assert.strictEqual(BhrGt.model({ xml: { Meetpunt: meetpunt } }).document, meetpunt);
assert.strictEqual(dispatchModel.finalDepth, 6);
assert.strictEqual(dispatchModel.tracks.find(track => track.key === "layers-0").items[0].title, "klei");
assert.ok(dispatchModel.tracks.some(track => track.key === "boredInterval"));
assert.deepStrictEqual(Array.from(BhrGt.materialBands("sterkGrindigZand").map(band =>
	[band.kind, band.percentage])), [["sand", 60], ["gravel", 40]],
	"sterk grindig zand moet zoals het referentieprofiel in zand en grind worden verdeeld");
assert.deepStrictEqual(Array.from(BhrGt.materialBands("siltigZand").map(band =>
	[band.kind, band.percentage])), [["sand", 70], ["silt", 30]]);
assert.deepStrictEqual(Array.from(BhrGt.materialBands("zwakZandigeKlei").map(band =>
	[band.kind, band.percentage])), [["clay", 80], ["sand", 20]]);
assert.strictEqual(model.broId, "BHR-GT-TEST");
assert.strictEqual(model.finalDepth, 5);
assert.strictEqual(model.maximumDepth, 5);
assert.strictEqual(layers.title, "Grond / Gesteente / Bijzonder materiaal",
	"de laagkop moet de aanwezige materiaalsoorten benoemen");
assert.strictEqual(layers.items.length, 5,
	"gewone, niet-beschreven en post-sedimentaire lagen moeten samen zichtbaar zijn");
assert.deepStrictEqual(Array.from(layers.items.map(item => item.kind)), [
	"specialMaterial", "soil", "rock", "notDescribedInterval", "postSedimentaryDiscontinuity"
]);
assert.strictEqual(layers.items.find(item => item.kind === "soil").title, "sterk grindig zand");
BhrGt.INTERVAL_KINDS.forEach(kind => assert.ok(model.tracks.some(track => track.key === kind),
	kind + " moet als dieptetrack worden gemodelleerd"));
assert.ok(model.tracks.some(track => track.key === "excavatedLayer"));
assert.ok(model.tracks.some(track => track.key === "fluidMudLayer"));

const html = BhrGt.render(model);
assert.match(html, /<strong class='bhrgt-preview-id'>BHR-GT-TEST<\/strong>/,
	"een object-ID die geen BRO-ID is moet zonder Broloket-opmaak worden getoond");
assert.doesNotMatch(html, /bro-id-link/);
assert.doesNotMatch(BhrGt.svg(model), /bro-id-link/,
	"een niet-BRO-ID mag ook in de metadata geen Broloket-link krijgen");
const internalBhrGt = BhrGt.render(model, {
	instanceAttrs(instance) {
		return instance === model.document ? " data-bro-ref='bhr-gt-root'" : "";
	}
});
assert.match(internalBhrGt,
	/<strong class='bhrgt-preview-id' data-bro-ref='bhr-gt-root'>BHR-GT-TEST<\/strong>/,
	"een niet-BRO-ID in de previewheader moet de BHR-GT-root openen");
assert.match(internalBhrGt,
	/<g class='metadata-row' data-bro-ref='bhr-gt-root'><text class='metadata-label'[^>]*>ID:<\/text>/,
	"een niet-BRO-ID in de metadata moet de BHR-GT-root openen");
const firstSvg = BhrGt.svg(model);
const secondSvg = BhrGt.svg(model);
const interactiveSvg = BhrGt.svg(model, {
	instanceAttrs(instance) {
		return instance ? " data-bro-ref='test-layer'" : "";
	}
});
const trackLinks = [];
const trackHeadingSvg = BhrGt.svg(model, {
	instanceAttrs(instance, label, meta) {
		if(Array.isArray(instance) && meta && meta.direct) trackLinks.push({
			instance: instance,
			label: label,
			meta: meta
		});
		return Array.isArray(instance) ? " data-bro-ref='test-track'" : "";
	}
});
let documentLinkCount = 0;
const interactiveHtml = BhrGt.render(dispatchModel, {
	instanceAttrs(instance, label, meta) {
		if(instance === dispatchDocument && meta && meta.direct) ++documentLinkCount;
		return instance === dispatchDocument ? " data-bro-ref='bhr-gt-document'" : "";
	}
});
const firstSandPattern = firstSvg.match(/id='(bhrgt-sand-[^']+)'/)[1];
const secondSandPattern = secondSvg.match(/id='(bhrgt-sand-[^']+)'/)[1];

assert.notStrictEqual(firstSandPattern, secondSandPattern,
	"ieder gerenderd profiel moet documentglobaal unieke SVG-pattern-IDs krijgen");
assert.ok(firstSvg.indexOf("url(#" + firstSandPattern + ")") !== -1,
	"de laagvulling moet naar de unieke pattern-def van hetzelfde profiel verwijzen");
assert.ok(secondSvg.indexOf("url(#" + secondSandPattern + ")") !== -1);
assert.match(interactiveSvg, /class='profile-layer[^']*' data-bro-ref='test-layer'/,
	"BHR-GT-lagen moeten aan hun XML-bronobject gekoppeld kunnen worden");
assert.match(trackHeadingSvg,
	/<g class='track-heading' data-bro-ref='test-track'><text class='track-title'[^>]*>Grond \/ Gesteente \/ Bijzonder materiaal<\/text><text class='track-detail'[^>]*>/,
	"de laagkop en zijn detailtekst moeten samen klikbaar zijn");
assert.match(trackHeadingSvg,
	/<g class='track-heading' data-bro-ref='test-track'><text class='track-title'[^>]*>Geboord<\/text><text class='track-detail'[^>]*>1 traject<\/text><\/g>/,
	"een intervalkop en zijn aantal moeten samen klikbaar zijn");
assert.strictEqual(trackLinks.find(link => link.label === "Open Geboord").instance,
	model.tracks.find(track => track.key === "boredInterval").items,
	"de kop moet de bijbehorende items-array rechtstreeks aan H.i aanbieden");
assert.ok(trackLinks.every(link => link.meta.direct === true));
assert.match(interactiveSvg, /class='metadata-row' data-bro-ref='test-layer'/,
	"metadata-label en -waarde moeten samen het geselecteerde document openen");
assert.match(interactiveHtml,
	/<g class='metadata-heading' data-bro-ref='bhr-gt-document'><text class='metadata-title' x='[^']+' y='25'>Registratie en boring<\/text><\/g>/,
	"Registratie en boring moet de BHR-GT-root openen");
const bhrGtBroLoketUrl = "https://broloket.nl/ondergrondgegevens\\?bro-id=BHR000000368931";
assert.match(interactiveHtml, new RegExp("<a class='bhrgt-preview-id bro-id-link' href='" +
	bhrGtBroLoketUrl + "' target='_blank' rel='noopener noreferrer'>"),
	"het BRO-id linksboven moet Broloket in een nieuw tabblad openen");
assert.match(interactiveHtml, new RegExp("<a class='metadata-row bro-id-link' href='" +
	bhrGtBroLoketUrl + "' target='_blank' rel='noopener noreferrer'><text class='metadata-label'[^>]*>ID:</text>"),
	"de ID-rij van BHR-GT moet naar hetzelfde Broloket-record verwijzen");
assert.strictEqual(documentLinkCount, dispatchModel.metadata.length,
	"de registratiekop plus alle metadata behalve het externe BRO-id moeten intern inspecteerbaar zijn");
assert.match(bhrGtFacetSource, /& \.bhrgt-preview-header \.bro-id-link[^\n]*color:inherit;/,
	"een BRO-id in de previewheader moet de gewone tekstkleur behouden");
assert.match(html, />Onderzocht</);
assert.match(html, />Geboord</);
assert.match(html, />Bemonsterd</);
assert.doesNotMatch(html, /Geboorde intervallen|Bemonsterde intervallen/);
assert.match(html, /1 traject/);
assert.match(html, /bhrgt-not-described/);
assert.match(html, /profile-layer/);
assert.match(html, /Diepte t\.o\.v\. maaiveld/);
assert.match(BhrGt.render(dispatchModel), /Registratie en boring/);
assert.match(html, /kalksteen/);
assert.match(html, /sterk grindig zand/);
assert.match(html, /Einddiepte 5 m/);
assert.doesNotMatch(BhrGt.render(BhrGt.model({ xml: {
	"bhrgtcom:layer": {
		"bhrgtcom:upperBoundary": "0",
		"bhrgtcom:lowerBoundary": "1",
		"bhrgtcom:specialMaterial": "<script>alert(1)</script>"
	}
} })), /<script>/, "waarden uit XML moeten voor HTML/SVG worden ge-escaped");

console.log("BhrGt tests passed");
