"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadAmd(file) {
	let exported;
	vm.runInNewContext(fs.readFileSync(file, "utf8"), {
		Array: Array,
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
const Gmn = loadAmd(path.join(root, "src/Gmn.js"));
const broFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.js"), "utf8");
const gmnFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.gmn.js"), "utf8");
const profileSource = fs.readFileSync(path.join(root, "src/profiles/xml.js"), "utf8");

const result = {
	type: "bro-gmn/1.0",
	version: "1.0",
	xml: {
		"dsgmn:dispatchDataResponse": {
			"dsgmn:dispatchDocument": {
				"dsgmn:GMN_PPO": {
					"brocom:broId": "GMN000000000569",
					"dsgmn:name": "Primair meetnet Overijssel",
					"dsgmn:deliveryContext": { "#text": "waterwetStrategischGrondwaterbeheer" },
					"dsgmn:groundwaterAspect": { "#text": "kwantiteit" },
					"dsgmn:monitoringPurpose": { "#text": "strategischBeheerKwantiteitRegionaal" },
					"dsgmn:monitoringNetHistory": {
						"dsgmn:startDateMonitoring": "2021-09-22"
					},
					"dsgmn:measuringPoint": [{
						"dsgmn:MeasuringPoint": {
							"dsgmn:measuringPointCode": "OV-001",
							"dsgmn:startDate": { "brocom:date": "2021-09-22" },
							"dsgmn:monitoringTube": [{
								"dsgmn:GroundwaterMonitoringTube": {
									"dsgmn:broId": "GMW123456789001",
									"dsgmn:tubeNumber": "1",
									"dsgmn:startDate": { "brocom:date": "2021-09-22" }
								}
							}, {
								"dsgmn:GroundwaterMonitoringTube": {
									"dsgmn:broId": "GMW123456789001",
									"dsgmn:tubeNumber": "2"
								}
							}]
						}
					}, {
						"dsgmn:MeasuringPoint": {
							"dsgmn:measuringPointCode": "OV-002",
							"dsgmn:startDate": { "brocom:date": "2022-01-01" },
							"dsgmn:endDate": { "brocom:yearMonth": "2025-03" },
							"dsgmn:monitoringTube": {
								"dsgmn:GroundwaterMonitoringTube": {
									"dsgmn:broId": "GMW123456789002",
									"dsgmn:tubeNumber": "3"
								}
							}
						}
					}]
				}
			}
		}
	}
};
const model = Gmn.model(result);

assert.match(broFacetSource,
	/"bro-gmn":\s*"veldapps-imbro\/Tabs<Document\.bro\.gmn>"/,
	"de generieke BRO-facet moet GMN naar het package-gekwalificeerde facet routeren");
assert.match(broFacetSource, /type === "bro-gmn" \|\| type\.startsWith\("bro-gmn\/"\)/,
	"de generieke BRO-facet moet zowel kale als versiegebonden GMN-types herkennen");
assert.match(profileSource,
	/profile\("bro-gmn", \["bro-gmn"\], "\(\?:is\|ds\)gmn", "gmn"\)/,
	"isgmn- en dsgmn-documenten moeten expliciet de bro.gmn-facet selecteren");
assert.match(gmnFacetSource, /facet:\s*"bro\.gmn"/);
assert.match(gmnFacetSource, /defaultTab:\s*"tab-preview"/);
assert.match(gmnFacetSource, /function isGmnResult[\s\S]*if\(!isGmnResult\(result\)\) return null/,
	"een achtergebleven GMN-renderer mag geen ander documenttype overschrijven");
assert.strictEqual(model.info.report, "GMN_PPO");
assert.strictEqual(model.info.messageKind, "uitgifte");
assert.strictEqual(model.header["BRO-ID"], "GMN000000000569");
assert.strictEqual(model.header.Naam, "Primair meetnet Overijssel");
assert.strictEqual(model.header.Meetpunten, 2);
assert.strictEqual(model.header.Buisreferenties, 3);
assert.strictEqual(model.rows.length, 3,
	"iedere buisreferentie moet als afzonderlijke overzichtsregel beschikbaar zijn");
assert.strictEqual(model.rows[0].Meetpuntcode, "OV-001");
assert.strictEqual(model.rows[0]["GMW BRO-ID"], "GMW123456789001");
assert.strictEqual(model.rows[0].Buisnummer, "1");
assert.strictEqual(model.rows[2]["Einde meetpunt"], "2025-03");
assert.strictEqual(model.view.Meetpunten.length, 3);
assert.strictEqual(model.view.Document[0], model.document,
	"de oorspronkelijke GMN_PPO moet vanuit de Data-tab inspecteerbaar blijven");

const rendered = Gmn.render(model, {
	instanceAttrs(instance) {
		return instance && typeof instance === "object" ? " data-bro-ref='test'" : "";
	}
});
assert.match(rendered, /Primair meetnet Overijssel/);
assert.match(rendered, /3 buisreferenties/);
assert.match(rendered, /GMW123456789001/);
assert.match(rendered, /data-bro-ref='test'/,
	"meetpuntregels moeten hun oorspronkelijke XML-object kunnen openen");
assert.match(rendered, /broloket\.nl\/ondergrondgegevens\?bro-id=GMN000000000569/,
	"het GMN BRO-ID moet rechtstreeks naar Broloket linken");

console.log("GMN model and facet checks: OK");
