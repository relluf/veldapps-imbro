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
const Gmw = loadAmd(path.join(root, "src/Gmw.js"));
const broFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.js"), "utf8");
const gmwFacetSource = fs.readFileSync(path.join(root,
	"src/vcl-comps/Tabs$/Document.bro.gmw.js"), "utf8");
assert.match(gmwFacetSource, /function isGmwResult[\s\S]*if\(!isGmwResult\(result\)\) return null/,
	"een achtergebleven GMW-renderer mag geen ander documenttype overschrijven");

const intakeResult = {
	type: "bro-gmw/1.1",
	version: "1.1",
	xml: {
		"isgmw:registrationRequest": {
			"brocom:qualityRegime": "IMBRO",
			"isgmw:sourceDocument": {
				"isgmw:GMW_Construction": {
					"isgmw:objectIdAccountableParty": "GMW-INTAKE-1",
					"isgmw:owner": "51048329",
					"isgmw:wellConstructionDate": { "brocom:date": "2017-10-03" },
					"isgmw:deliveredVerticalPosition": {
						"gmwcom:groundLevelPosition": { "#text": "41.44", "@_uom": "m" },
						"gmwcom:verticalDatum": "NAP"
					},
					"isgmw:monitoringTube": {
						"isgmw:tubeNumber": "1",
						"isgmw:tubeStatus": "gebruiksklaar",
						"isgmw:tubeTopPosition": "41.92",
						"isgmw:tubeTopDiameter": { "#text": "40", "@_uom": "mm" },
						"isgmw:materialUsed": { "gmwcom:tubeMaterial": "pvc" },
						"isgmw:plainTubePart": { "gmwcom:plainTubePartLength": "1.62" },
						"isgmw:screen": {
							"isgmw:screenLength": "1.5",
							"isgmw:sockMaterial": "nylon"
						}
					}
				}
			}
		}
	}
};
const intake = Gmw.model(intakeResult);

const dispatchResult = {
	type: "bro-gmw/1.1",
	version: "1.1",
	root: "dispatchDataResponse",
	xml: "dispatchDataResponse",
	"dsgmw:dispatchDataResponse": {
		"brocom:qualityRegime": "IMBRO/A",
		"dsgmw:dispatchDocument": {
			"dsgmw:GMW_PPO": {
				"brocom:broId": "GMW000000068650",
				"dsgmw:owner": "30263544",
				"dsgmw:deliveredVerticalPosition": {
					"gmwcommon:groundLevelPosition": "7.55",
					"gmwcommon:verticalDatum": "NAP"
				},
				"dsgmw:wellHistory": {
					"dsgmw:wellConstructionDate": { "brocom:date": "1986-03-27" },
					"dsgmw:intermediateEvent": {
						"dsgmw:eventName": "nieuweInmetingPosities",
						"dsgmw:eventDate": { "brocom:date": "1993-04-29" }
					}
				},
				"dsgmw:monitoringTube": {
					"dsgmw:tubeNumber": "1",
					"dsgmw:tubeStatus": "onbekend",
					"dsgmw:tubeTopPosition": "7.4",
					"dsgmw:screen": {
						"dsgmw:screenLength": "0.5",
						"dsgmw:screenTopPosition": "7.05",
						"dsgmw:screenBottomPosition": "6.55"
					},
					"dsgmw:plainTubePart": { "gmwcommon:plainTubePartLength": "0.35" }
				}
			}
		}
	}
};
const dispatch = Gmw.model(dispatchResult);

assert.match(broFacetSource,
	/"bro-gmw":\s*"veldapps-imbro\/Tabs<Document\.bro\.gmw>"/,
	"de generieke BRO-facet moet GMW naar het package-gekwalificeerde facet routeren");
assert.match(gmwFacetSource, /defaultTab:\s*"tab-preview"/,
	"GMW moet standaard met de Weergave-tab openen");
assert.match(gmwFacetSource, /BroPreview\.open\(this, evt\)/,
	"GMW moet klikbare profielobjecten in een Alphaview openen");
assert.strictEqual(intake.info.messageKind, "inname");
assert.strictEqual(intake.broId, "GMW-INTAKE-1");
assert.strictEqual(intake.tubes.length, 1);
assert.ok(Math.abs(intake.tubes[0].screenTop - 40.3) < 1e-9,
	"de filterbovenkant van een innamedocument moet uit buistop en blindebuislengte worden afgeleid");
assert.ok(Math.abs(intake.tubes[0].screenBottom - 38.8) < 1e-9,
	"de filteronderkant van een innamedocument moet uit de filterlengte worden afgeleid");
assert.strictEqual(intake.tubes[0].inferredPositions, true);
assert.strictEqual(dispatch.info.messageKind, "uitgifte");
assert.strictEqual(dispatch.broId, "GMW000000068650",
	"een uitgiftedocument met root/xml-naam-tokens moet zijn werkelijke dsgmw-root gebruiken");
assert.strictEqual(dispatch.groundLevel, 7.55);
assert.strictEqual(dispatch.tubes[0].screenTopDepth, 0.5);
assert.strictEqual(dispatch.tubes[0].screenBottomDepth, 1);
assert.strictEqual(dispatch.events.length, 2);
assert.match(Gmw.render(intake), /Blinde buis/);
assert.match(Gmw.render(intake), /Filter/);
assert.match(Gmw.render(intake), /<strong class='gmw-preview-id'>GMW-INTAKE-1<\/strong>/,
	"een object-ID die geen BRO-ID is moet zonder Broloket-opmaak worden getoond");
assert.doesNotMatch(Gmw.render(intake), /bro-id-link/);
assert.doesNotMatch(Gmw.svg(intake), /bro-id-link/,
	"een niet-BRO-ID mag ook in de metadata geen Broloket-link krijgen");
const internalGmw = Gmw.render(intake, {
	instanceAttrs(instance) {
		return instance === intake.document ? " data-bro-ref='gmw-root'" : "";
	}
});
assert.match(internalGmw,
	/<strong class='gmw-preview-id' data-bro-ref='gmw-root'>GMW-INTAKE-1<\/strong>/,
	"een niet-BRO-ID in de previewheader moet de GMW-root openen");
assert.match(internalGmw,
	/<g class='metadata-row' data-bro-ref='gmw-root'><text class='metadata-label'[^>]*>ID:<\/text>/,
	"een niet-BRO-ID in de metadata moet de GMW-root openen");
const intakeDiameter = intake.tubes[0].diameter;
intake.tubes[0].diameter = "0";
assert.doesNotMatch(Gmw.render(intake), /Ø\s*0\s*mm/,
	"een nuldiameter is geen bruikbare profielinformatie en moet worden verborgen");
intake.tubes[0].diameter = intakeDiameter;
assert.match(Gmw.render(dispatch), /Nieuwe Inmeting Posities/);
assert.match(Gmw.svg(dispatch), /Diepte t\.o\.v\. maaiveld/);
const firstSvg = Gmw.svg(dispatch);
const secondSvg = Gmw.svg(dispatch);
const firstScreenPattern = firstSvg.match(/id='(gmw-screen-[^']+)'/)[1];
const secondScreenPattern = secondSvg.match(/id='(gmw-screen-[^']+)'/)[1];
assert.notStrictEqual(firstScreenPattern, secondScreenPattern,
	"ieder GMW-profiel moet een documentglobaal unieke filterarcering krijgen");
assert.ok(firstSvg.indexOf("fill='url(#" + firstScreenPattern + ")'") !== -1,
	"het eerste GMW-profiel moet naar zijn eigen pattern-def verwijzen");
assert.ok(secondSvg.indexOf("fill='url(#" + secondScreenPattern + ")'") !== -1,
	"het tweede GMW-profiel moet naar zijn eigen pattern-def verwijzen");
assert.match(firstSvg, /class='metadata-divider'/,
	"profiel en metadata moeten visueel van elkaar zijn gescheiden");
const expectedDispatchHeight = 72 + Math.round(Math.max(480,
	Math.min(1050, (dispatch.maximumDepth - dispatch.minimumDepth) * 62)) * 0.8) + 38;
assert.strictEqual(Number(firstSvg.match(/<svg[^>]+height='([^']+)'/)[1]), expectedDispatchHeight,
	"de GMW-weergave moet tachtig procent van de oorspronkelijke verticale plotruimte claimen");
assert.match(Gmw.svg(dispatch, {
	instanceAttrs(instance) {
		return instance ? " data-bro-ref='test-gmw'" : "";
	}
}), /class='monitoring-tube' data-bro-ref='test-gmw'/,
	"een GMW-peilbuis moet aan zijn XML-bronobject gekoppeld kunnen worden");
const gmwBroLoketUrl = "https://broloket.nl/ondergrondgegevens\\?bro-id=GMW000000068650";
const gmwRendered = Gmw.render(dispatch);
assert.match(gmwRendered, new RegExp("<a class='gmw-preview-id bro-id-link' href='" +
	gmwBroLoketUrl + "' target='_blank' rel='noopener noreferrer'>"),
	"het GMW-id boven het profiel moet Broloket in een nieuw tabblad openen");
assert.match(Gmw.svg(dispatch), new RegExp("<a class='metadata-row bro-id-link' href='" +
	gmwBroLoketUrl + "' target='_blank' rel='noopener noreferrer'><text class='metadata-label'[^>]*>ID:</text>"),
	"de ID-rij van GMW moet naar hetzelfde Broloket-record verwijzen");
assert.match(gmwFacetSource, /& \.gmw-preview-header \.bro-id-link[^\n]*color:inherit;/,
	"een BRO-id in de previewheader moet de gewone tekstkleur behouden");
const gmwArrayDetail = ["eerste", "tweede"];
dispatch.metadata.push({ label: "Arraydetail", value: gmwArrayDetail });
let gmwArrayLink;
const gmwMetadataSvg = Gmw.svg(dispatch, {
	instanceAttrs(instance, label, meta) {
		if(label === "Open Arraydetail") gmwArrayLink = { instance: instance, meta: meta };
		return instance ? " data-bro-ref='gmw-detail'" : "";
	}
});
dispatch.metadata.pop();
assert.match(gmwMetadataSvg, /class='metadata-row' data-bro-ref='gmw-detail'/,
	"de volledige GMW-detailrij moet klikbaar zijn");
assert.strictEqual(gmwArrayLink.instance, gmwArrayDetail,
	"een array-detail moet de array zelf als inspectiedoel gebruiken");
assert.strictEqual(gmwArrayLink.meta.direct, true);
assert.doesNotMatch(Gmw.render(Gmw.model({ xml: {
	"isgmw:GMW_Construction": {
		"isgmw:objectIdAccountableParty": "<script>alert(1)</script>",
		"isgmw:deliveredVerticalPosition": { "gmwcom:groundLevelPosition": "1" },
		"isgmw:monitoringTube": {
			"isgmw:tubeNumber": "1",
			"isgmw:tubeTopPosition": "1",
			"isgmw:plainTubePart": { "gmwcom:plainTubePartLength": "1" },
			"isgmw:screen": { "isgmw:screenLength": "1" }
		}
	}
} })), /<script>/, "waarden uit XML moeten voor HTML/SVG worden ge-escaped");

console.log("GMW tests passed");
