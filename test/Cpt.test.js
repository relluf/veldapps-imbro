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
		Number: Number,
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
const Cpt = loadAmd(path.join(root, "src/Cpt.js"));
const broFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.js"), "utf8");
const cptFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.cpt.js"), "utf8");
assert.match(cptFacetSource, /function isCptResult[\s\S]*if\(!isCptResult\(result\)\) return null/,
	"een achtergebleven CPT-renderer mag geen ander documenttype overschrijven");

const records = [
	"0.30,0.30,1,3.4,3.5,3.2,-999999,-999999,-999999,-999999,0.1,-999999,-999999,-999999,-999999,0.5,-999999,-999999,0.04,-999999,19.8,-999999,0.01,-999999,1.2",
	"0.32,0.32,2,4.8,4.9,4.5,-999999,-999999,-999999,-999999,0.2,-999999,-999999,-999999,-999999,0.6,-999999,-999999,0.08,-999999,20.0,-999999,0.02,-999999,1.7",
	"0.35,0.35,3,6.2,6.3,5.9,-999999,-999999,-999999,-999999,0.3,-999999,-999999,-999999,-999999,0.7,-999999,-999999,0.12,-999999,20.2,-999999,0.03,-999999,2.1"
].join(";");
const result = {
	type: "bro-cpt/1.1",
	version: "1.1",
	xml: {
		"iscpt:registrationRequest": {
			"brocom:qualityRegime": "IMBRO",
			"iscpt:sourceDocument": {
				"iscpt:CPT": {
					"iscpt:objectIdAccountableParty": "CPT-TEST-1",
					"iscpt:surveyPurpose": "infrastructuurLand",
					"iscpt:cptStandard": "NEN5140",
					"iscpt:deliveredLocation": {
						"cptcom:location": { "gml:pos": "134351.400 502189.000" }
					},
					"iscpt:deliveredVerticalPosition": {
						"cptcom:offset": "2.01",
						"cptcom:verticalDatum": "NAP"
					},
					"iscpt:additionalInvestigation": {
						"cptcom:removedLayer": {
							"cptcom:upperBoundary": "0",
							"cptcom:lowerBoundary": "0.3",
							"cptcom:description": "zand <script>alert(1)</script>"
						}
					},
					"iscpt:conePenetrometerSurvey": {
						"cptcom:cptMethod": "elektrischContinu",
						"cptcom:qualityClass": "klasse1",
						"cptcom:trajectory": {
							"cptcom:predrilledDepth": "0.3",
							"cptcom:finalDepth": "0.35"
						},
						"cptcom:conePenetrationTest": {
							"cptcom:cptResult": {
								"swe:elementCount": { "swe:Count": { "swe:value": "3" } },
								"swe:encoding": {
									"swe:TextEncoding": {
										"@_blockSeparator": ";",
										"@_decimalSeparator": ".",
										"@_tokenSeparator": ","
									}
								},
								"cptcom:values": records
							}
						},
						"cptcom:dissipationTest": {
							"cptcom:penetrationLength": "0.35",
							"gml:timePosition": "2020-08-10T10:00:00+02:00",
							"cptcom:disResult": { "cptcom:values": "1,2,3,4,5" }
						},
						"cptcom:parameters": {
							"cptcom:penetrationLength": "ja",
							"cptcom:depth": "ja",
							"cptcom:coneResistance": "ja",
							"cptcom:localFriction": "ja",
							"cptcom:porePressureU2": "ja",
							"cptcom:frictionRatio": "ja"
						}
					}
				}
			}
		}
	}
};

const model = Cpt.model(result);

assert.match(broFacetSource,
	/"bro-cpt":\s*"veldapps-imbro\/Tabs<Document\.bro\.cpt>"/,
	"de generieke BRO-facet moet CPT naar het package-gekwalificeerde facet routeren");
assert.match(broFacetSource, /"iscpt"[\s\S]*\/iscpt\/1\.1/,
	"de generieke BRO-facet moet de CPT 1.1-namespace registreren");
assert.match(cptFacetSource, /defaultTab:\s*"tab-preview"/,
	"CPT moet standaard met de Weergave-tab openen");
assert.match(cptFacetSource, /BroPreview\.open\(this, evt\)/,
	"CPT-profielobjecten moeten in een Alphaview kunnen openen");
assert.match(cptFacetSource, /document:\s*\{[\s\S]*bro:\s*\{[\s\S]*cpt:\s*\{/,
	"VCL-vars moeten als geneste objecten worden gedefinieerd");
assert.strictEqual(model.info.messageKind, "inname");
assert.strictEqual(model.broId, "CPT-TEST-1");
assert.strictEqual(model.rows.length, 3);
assert.strictEqual(model.rows[0].coneResistance, 3.4);
assert.strictEqual(model.rows[0].magneticFieldStrengthX, null,
	"de officiële nil-waarde -999999 moet als ontbrekende meting worden verwerkt");
assert.strictEqual(model.rows[2].frictionRatio, 2.1);
assert.strictEqual(model.finalDepth, 0.35);
assert.strictEqual(model.predrilledDepth, 0.3);
assert.strictEqual(model.removedLayers.length, 1);
assert.strictEqual(model.dissipations.length, 1);
assert.deepStrictEqual(Array.from(model.series.map(series => series.key)), [
	"coneResistance", "localFriction", "frictionRatio", "porePressureU2"
]);
assert.strictEqual(model.view.Meetreeks.length, 3);
assert.strictEqual(model.view.Parameters.length, 6);
assert.match(Cpt.svg(model), /Conusweerstand qc/);
assert.match(Cpt.svg(model), /Dissipatietest op 0,35 m/);
assert.doesNotMatch(Cpt.render(model), /<script>/,
	"waarden uit XML moeten voor HTML en SVG worden ge-escaped");
assert.match(Cpt.svg(model, {
	instanceAttrs(instance) {
		return instance ? " data-bro-ref='test-cpt'" : "";
	}
}), /class='cpt-series cpt-series-coneResistance' data-bro-ref='test-cpt'/,
	"de CPT-meetreeks moet aan zijn XML-bronobject gekoppeld kunnen worden");
assert.match(Cpt.render(model), /<strong class='cpt-preview-id'>CPT-TEST-1<\/strong>/,
	"een object-ID die geen BRO-ID is moet zonder Broloket-opmaak worden getoond");
assert.doesNotMatch(Cpt.render(model), /bro-id-link/);
assert.doesNotMatch(Cpt.svg(model), /bro-id-link/,
	"een niet-BRO-ID mag ook in de metadata geen Broloket-link krijgen");
const internalCpt = Cpt.render(model, {
	instanceAttrs(instance) {
		return instance === model.document ? " data-bro-ref='cpt-root'" : "";
	}
});
assert.match(internalCpt,
	/<strong class='cpt-preview-id' data-bro-ref='cpt-root'>CPT-TEST-1<\/strong>/,
	"een niet-BRO-ID in de previewheader moet de CPT-root openen");
assert.match(internalCpt,
	/<g class='metadata-row' data-bro-ref='cpt-root'><text class='metadata-label'[^>]*>ID:<\/text>/,
	"een niet-BRO-ID in de metadata moet de CPT-root openen");
const cptIdMetadata = model.metadata.find(item => item.label === "ID");
model.broId = "CPT00000000447";
cptIdMetadata.value = model.broId;
const cptBroLoketUrl = "https://broloket.nl/ondergrondgegevens\\?bro-id=CPT00000000447";
const cptRendered = Cpt.render(model);
assert.match(cptRendered, new RegExp("<a class='cpt-preview-id bro-id-link' href='" +
	cptBroLoketUrl + "' target='_blank' rel='noopener noreferrer'>"),
	"het CPT-id boven de grafiek moet Broloket in een nieuw tabblad openen");
assert.match(Cpt.svg(model), new RegExp("<a class='metadata-row bro-id-link' href='" +
	cptBroLoketUrl + "' target='_blank' rel='noopener noreferrer'><text class='metadata-label'[^>]*>ID:</text>"),
	"de ID-rij van CPT moet naar hetzelfde Broloket-record verwijzen");
assert.match(cptFacetSource, /& \.cpt-preview-header \.bro-id-link[^\n]*color:inherit;/,
	"een BRO-id in de previewheader moet de gewone tekstkleur behouden");
model.broId = "CPT-TEST-1";
cptIdMetadata.value = model.broId;
const cptArrayDetail = [{ waarde: 1 }, { waarde: 2 }];
model.metadata.push({ label: "Arraydetail", value: cptArrayDetail });
let cptArrayLink;
const cptMetadataSvg = Cpt.svg(model, {
	instanceAttrs(instance, label, meta) {
		if(label === "Open Arraydetail") cptArrayLink = { instance: instance, meta: meta };
		return instance ? " data-bro-ref='cpt-detail'" : "";
	}
});
model.metadata.pop();
assert.match(cptMetadataSvg, /class='metadata-row' data-bro-ref='cpt-detail'/,
	"de volledige CPT-detailrij moet klikbaar zijn");
assert.strictEqual(cptArrayLink.instance, cptArrayDetail,
	"een array-detail moet de array zelf als inspectiedoel gebruiken");
assert.strictEqual(cptArrayLink.meta.direct, true);

const customRows = Cpt.parseResultRows({
	"swe:encoding": { "swe:TextEncoding": {
		"@_blockSeparator": "|", "@_tokenSeparator": ";", "@_decimalSeparator": ","
	} },
	"cptcom:values": "1,0;1,0;2,0;3,5|2,0;2,0;3,0;4,5"
});
assert.strictEqual(customRows.length, 2,
	"de decoder moet de in het document gedeclareerde scheidingstekens gebruiken");
assert.strictEqual(customRows[1].coneResistance, 4.5);

const dispatchModel = Cpt.model({
	type: "bro-cpt/1.1",
	version: "1.1",
	root: "dispatchDataResponse",
	xml: "dispatchDataResponse",
	"dscpt:dispatchDataResponse": {
		"brocom:responseType": "dispatch",
		"dscpt:dispatchDocument": {
			"dscpt:CPT_O": result.xml["iscpt:registrationRequest"]
				["iscpt:sourceDocument"]["iscpt:CPT"]
		}
	}
});
assert.strictEqual(dispatchModel.info.messageKind, "uitgifte");
assert.strictEqual(dispatchModel.info.report, "CPT_O");
assert.strictEqual(dispatchModel.broId, "CPT-TEST-1");
assert.strictEqual(dispatchModel.rows.length, 3,
	"een dscpt-uitgiftedocument moet dezelfde CPT-meetreeks activeren");

console.log("CPT tests passed");
