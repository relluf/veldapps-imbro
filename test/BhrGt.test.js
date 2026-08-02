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
								"bhrgtcom:geotechnicalSoilName": "zand",
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

assert.match(broFacetSource,
	/"bro-bhr-gt":\s*"veldapps-imbro\/Tabs<Document\.bro\.bhrgt>"/,
	"de generieke BRO-facet moet BHR-GT naar het package-gekwalificeerde facet routeren");
assert.match(bhrGtFacetSource, /defaultTab:\s*"tab-preview"/,
	"BHR-GT moet standaard met de Weergave-tab openen");
assert.match(bhrGtFacetSource, /BroPreview\.open\(this, evt\)/,
	"BHR-GT moet klikbare profielobjecten in een Alphaview openen");
assert.strictEqual(dispatchModel.broId, "BHR000000368931",
	"een uitgiftebericht met root/xml-naam-tokens moet zijn werkelijke dsbhrgt-root gebruiken");
assert.strictEqual(dispatchModel.finalDepth, 6);
assert.strictEqual(dispatchModel.tracks.find(track => track.key === "layers-0").items[0].title, "Klei");
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
assert.strictEqual(layers.items.length, 5,
	"gewone, niet-beschreven en post-sedimentaire lagen moeten samen zichtbaar zijn");
assert.deepStrictEqual(Array.from(layers.items.map(item => item.kind)), [
	"specialMaterial", "soil", "rock", "notDescribedInterval", "postSedimentaryDiscontinuity"
]);
BhrGt.INTERVAL_KINDS.forEach(kind => assert.ok(model.tracks.some(track => track.key === kind),
	kind + " moet als dieptetrack worden gemodelleerd"));
assert.ok(model.tracks.some(track => track.key === "excavatedLayer"));
assert.ok(model.tracks.some(track => track.key === "fluidMudLayer"));

const html = BhrGt.render(model);
const firstSvg = BhrGt.svg(model);
const secondSvg = BhrGt.svg(model);
const interactiveSvg = BhrGt.svg(model, {
	instanceAttrs(instance) {
		return instance ? " data-bro-ref='test-layer'" : "";
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
assert.match(html, /Onderzochte intervallen/);
assert.match(html, /Geboorde intervallen/);
assert.match(html, /bhrgt-not-described/);
assert.match(html, /profile-layer/);
assert.match(html, /Diepte t\.o\.v\. maaiveld/);
assert.match(BhrGt.render(dispatchModel), /Registratie en boring/);
assert.match(html, /Kalksteen/);
assert.match(html, /Einddiepte 5 m/);
assert.doesNotMatch(BhrGt.render(BhrGt.model({ xml: {
	"bhrgtcom:layer": {
		"bhrgtcom:upperBoundary": "0",
		"bhrgtcom:lowerBoundary": "1",
		"bhrgtcom:specialMaterial": "<script>alert(1)</script>"
	}
} })), /<script>/, "waarden uit XML moeten voor HTML/SVG worden ge-escaped");

console.log("BhrGt tests passed");
