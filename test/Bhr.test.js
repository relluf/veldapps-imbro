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
assert.deepStrictEqual(Array.from(model.markers.map(marker => marker.depth)), [0.25, 1.3, 0.5]);
assert.ok(model.metadata.some(item => item.value.indexOf("M5p 235a") !== -1));

const firstSvg = Bhr.svg(model);
const secondSvg = Bhr.svg(model);
const firstPattern = firstSvg.match(/id='(bhr-organic-[^']+)'/)[1];
const secondPattern = secondSvg.match(/id='(bhr-organic-[^']+)'/)[1];
const interactiveSvg = Bhr.svg(model, {
	instanceAttrs(instance) {
		return instance ? " data-bro-ref='test-object'" : "";
	}
});
assert.notStrictEqual(firstPattern, secondPattern,
	"ieder gerenderd profiel moet documentglobaal unieke SVG-pattern-IDs krijgen");
assert.ok(firstSvg.indexOf("url(#" + firstPattern + ")") !== -1);
assert.match(interactiveSvg, /class='profile-layer[^']*' data-bro-ref='test-object'/);
assert.match(Bhr.render(model), /Gemiddeld hoogste grondwaterstand/);
assert.match(Bhr.render(model), /Registratie en boring/);
assert.match(Bhr.render(model), /Kalksteen/);
assert.match(Bhr.render(model), /Einddiepte 8 m/);
assert.doesNotMatch(Bhr.render(Bhr.model({ xml: {
	"bhrcom:soilLayer": {
		"bhrcom:upperBoundary": "0",
		"bhrcom:lowerBoundary": "1",
		"bhrcom:layerComponent": { "bhrcom:horizonCode": "<script>alert(1)</script>" }
	}
} })), /<script>/, "waarden uit XML moeten voor HTML/SVG worden ge-escaped");

console.log("Bhr tests passed");
