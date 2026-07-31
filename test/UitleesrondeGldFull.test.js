"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const imbroSrc = path.resolve(__dirname, "../src");
const monSrc = path.resolve(__dirname, "../../veldapps-mon-fmt/src");

function loadAmd(file, dependencies) {
	let exported;
	const sandbox = {
		Array: Array,
		Date: Date,
		Error: Error,
		Function: Function,
		JSON: JSON,
		Math: Math,
		Number: Number,
		Object: Object,
		Promise: Promise,
		RegExp: RegExp,
		String: String,
		console: console,
		define(names, factory) {
			if(typeof names === "function") {
				factory = names;
				names = [];
			}
			exported = factory.apply(null, names.map(name => {
				if(!Object.prototype.hasOwnProperty.call(dependencies || {}, name)) {
					throw new Error("Ontbrekende testdependency: " + name);
				}
				return dependencies[name];
			}));
		}
	};

	vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
	return exported;
}

const ElliTrack = loadAmd(path.join(monSrc, "ElliTrack.js"), {});
const PackageBase = loadAmd(path.join(monSrc, "veldoffice/UitleesrondeBase.js"), {
	"veldapps-mon-fmt/veldoffice/LoggerPlaatsingChoice": {},
	"veldapps-mon-fmt/veldoffice/Verslag": {},
	"veldoffice/VO": {}
});

function parseCsvLine(line) {
	const values = [];
	let value = "";
	let quoted = false;

	for(let index = 0; index < line.length; index++) {
		const character = line[index];
		if(character === "\"") {
			if(quoted && line[index + 1] === "\"") {
				value += "\"";
				index++;
			} else {
				quoted = !quoted;
			}
		} else if(character === "," && !quoted) {
			values.push(value);
			value = "";
		} else {
			value += character;
		}
	}
	values.push(value);
	return values;
}

const GldFullCsv = loadAmd(path.join(imbroSrc, "GldFullCsv.js"), {
	papaparse: {
		parse(source) {
			return {
				data: String(source).replace(/\r\n/g, "\n").replace(/\r/g, "\n")
					.split("\n").map(parseCsvLine),
				errors: []
			};
		}
	}
});

function rootStub() {
	const values = {};
	return {
		vars(name, value) {
			if(arguments.length === 2) {
				values[name] = value;
				return value;
			}
			return values[Array.isArray(name) ? name[0] : name];
		},
		up() {
			return { vars() { return 42; } };
		}
	};
}

const filters = [{
	id: 10,
	naam: "9",
	broId: "GLD000000123",
	meetpunt: {
		id: 1,
		code: "MP-GLD",
		broId: "GMW-WIJKT-AF",
		onderzoek: { id: 42, projectcode: "P-42" }
	}
}, {
	id: 11,
	naam: "2",
	broId: "GLD-ANDERS",
	meetpunt: {
		id: 2,
		code: "MP-PUT",
		broId: "GMW000000777",
		onderzoek: { id: 42, projectcode: "P-42" }
	}
}];
const placement = {
	id: 100,
	van: new Date("2025-01-01T00:00:00Z"),
	tot: new Date("2027-01-01T00:00:00Z"),
	logger: { id: 200, serienummer: "LOGGER-GLD" },
	filter: filters[0]
};
const gldSource = [
	"\"BRO-ID\",\"bronhouder\",,\"kwaliteitsregime\",\"datum eerste meting\",\"datum recentste meting\"",
	"\"GLD000000123\",\"1234\",,\"IMBRO\",\"2026-01-01\",\"2026-01-01\"",
	"",
	"\"put BRO-ID\",\"put buisnummer\",,\"monitoringnet BRO-ID\"",
	"\"GMW000000777\",\"2\",,",
	"",
	"\"observatie ID\",\"start observatieperiode\",\"einde observatieperiode\",\"type\",\"mate beoordeling\",\"proces ID\"",
	"\"obs-1\",\"2026-01-01\",\"2026-01-02\",\"regulier\",\"volledig\",\"proc-1\"",
	"\"tijdstip meting\",\"waterstand\",\"status kwaliteitscontrole\",\"censuurreden\",\"censuurlimietwaarde\",\"interpolatietype\"",
	"\"2026-01-01T00:00:00Z\",\"1.234\",\"goedgekeurd\",,,\"geen\""
].join("\n");
const choice = {
	applyOverrides(root, rows) {
		return rows;
	}
};
const vo = {
	em: {
		query(entity) {
			return Promise.resolve(entity === "MeetpuntFilter" ? filters : [placement]);
		}
	}
};
const Base = Object.assign({}, PackageBase, {
	createWorkflow(context, result, options) {
		result.workflowOptions = options;
		return result;
	},
	resourceBridge() {},
	setInvalidWorkflow(context, result) {
		return result;
	}
});
const Controller = loadAmd(path.join(imbroSrc, "veldoffice/UitleesrondeGldFull.js"), {
	"veldapps-imbro/GldFullCsv": GldFullCsv,
	"veldapps-mon-fmt/ElliTrack": ElliTrack,
	"veldapps-mon-fmt/index": {
		veldoffice: {
			plaatsingCoversPeriod(item, period) {
				return new Date(item.van) <= period.eerste && new Date(item.tot) >= period.laatste;
			}
		}
	},
	"veldapps-mon-fmt/veldoffice/UitleesrondeBase": Base,
	"veldapps-mon-fmt/veldoffice/LoggerPlaatsingChoice": choice,
	"veldoffice/VO": vo
});

async function main() {
	const facetSource = fs.readFileSync(path.join(imbroSrc,
		"vcl-comps/Tabs$/Document.gld-full.js"), "utf8");

	assert.strictEqual(GldFullCsv.isGldFullText(GldFullCsv.GLD_FULL_HEADER), true,
		"de GLD-full header op de eerste regel moet voldoende zijn voor detectie");
	assert.strictEqual(GldFullCsv.isGldFullText("naam,waarde\n" + GldFullCsv.GLD_FULL_HEADER), false,
		"de GLD-full header mag niet op een latere regel worden gezocht");
	assert.match(facetSource, /minPeriod:\s*"hh"/,
		"de GLD-grafiek moet een uur als minimale periode gebruiken");
	assert.match(facetSource, /defaultTab:\s*"tab-preview"/,
		"een individueel GLD-bestand moet standaard de Weergave-tab openen");

	const flat = PackageBase.packageReport([{ name: "GLD000000123_full.csv" }]);
	const folder = PackageBase.packageReport([{ name: "ronde/GLD000000123_full.csv" }]);
	const mixed = PackageBase.packageReport([
		{ name: "a/GLD000000123_full.csv" },
		{ name: "b/GLD000000124_full.csv" }
	]);

	assert.strictEqual(flat.structure, "flat");
	assert.strictEqual(folder.structure, "single-folder");
	assert.strictEqual(mixed.validStructure, false);

	const context = {
		doc: { naam: "ronde.zip" },
		entries: [{ name: "ronde/export.csv" }],
		entryName(entry) { return entry.name; },
		fileName(value) { return String(value).split("/").pop(); },
		readText() { return Promise.resolve(gldSource); },
		resourceRows(entries) { return entries.map(entry => ({ resource: entry.name })); },
		root: rootStub()
	};
	const result = await Controller.process(context);
	const row = result.view.Koppelingen[0];

	assert.strictEqual(GldFullCsv.parse(gldSource, "GLD000000123_full.csv")
		.meta.gldFullCsv.registration.broId, "GLD000000123");
	const parsedByHeader = GldFullCsv.parse(gldSource, "export.csv");
	assert.strictEqual(parsedByHeader.type, "bro-gld-full-csv");
	assert.strictEqual(parsedByHeader.facetUri, GldFullCsv.FACET_URI);
	assert.strictEqual(parsedByHeader.capabilities.gld, true);
	assert.strictEqual(result.root.Uitleesronde[0].formaat, "gld");
	assert.deepStrictEqual(Array.from(result.view.Controlemetingen), []);
	assert.strictEqual(row.registratieBroId, "GLD000000123");
	assert.strictEqual(row.meetpuntFilterId, 10,
		"de registratie-BRO-ID moet leidend zijn, ook als put BRO-ID en buisnummer elders matchen");
	assert.strictEqual(row.meetpunt, "MP-GLD");
	assert.strictEqual(row.status, "OK");
	assert.match(row.melding, /Contextcontrole/);
	assert.match(row.melding, /put BRO-ID/);
	assert.match(row.melding, /buisnummer/);

	const duplicateFilter = {
		id: 12,
		naam: "3",
		broId: "GLD000000123",
		meetpunt: {
			id: 3,
			code: "MP-DUBBEL",
			broId: "GMW000000888",
			onderzoek: { id: 42, projectcode: "P-42" }
		}
	};
	const duplicatePlacement = Object.assign({}, placement, {
		id: 101,
		logger: { id: 201, serienummer: "LOGGER-KEUZE" },
		filter: duplicateFilter
	});
	const ambiguous = Controller.rowsFor([row.gldFull],
		filters.concat([duplicateFilter]), [placement, duplicatePlacement])[0];

	assert.strictEqual(ambiguous.status, "MEERDERE_MEETPUNTFILTERS");
	assert.strictEqual(ambiguous.loggerPlaatsingen.length, 2,
		"alle dekkende plaatsingen moeten voor de handmatige keuze beschikbaar blijven");

	const files = Controller.elliTrackImportFiles([row], "UTC");
	assert.strictEqual(files.length, 1);
	assert.match(files[0].text, /2026-01-01 00:00:00\t123\.4\t0\t0/);
	assert.deepStrictEqual(Array.from(files[0].registratieBroIds), ["GLD000000123"]);

	const preview = GldFullCsv.previewModel({
		rows: [{
			tijdstip: new Date("2026-01-01T02:00:00Z"),
			waterstand: 3,
			statusKwaliteitscontrole: "goedgekeurd"
		}, {
			tijdstip: new Date("2026-01-01T00:00:00Z"),
			waterstand: 1,
			statusKwaliteitscontrole: "goedgekeurd"
		}, {
			tijdstip: new Date("2026-01-01T01:00:00Z"),
			waterstand: 2,
			statusKwaliteitscontrole: "goedgekeurd"
		}, {
			tijdstip: new Date("2026-01-01T01:00:00Z"),
			waterstand: 4,
			statusKwaliteitscontrole: "goedgekeurd"
		}]
	});
	assert.deepStrictEqual(Array.from(preview.points, point => point.value), [1, 2, 4, 3],
		"grafiekpunten moeten stabiel oplopend op tijdstip worden gesorteerd");

	const invalid = await Controller.process(Object.assign({}, context, {
		entries: context.entries.concat([{ name: "ronde/notities.txt" }])
	}));
	assert.strictEqual(invalid.root.Uitleesronde[0].status, "NIET_VALIDE");
	assert.strictEqual(invalid.facetUri, Controller.facetUri,
		"een herkend maar ongeldig pakket moet de uitleesronde-facet behouden");
	assert.match(invalid.view.Validatie[0].melding, /alleen GLD/);

	const flatResult = await Controller.process(Object.assign({}, context, {
		doc: { naam: "platte-ronde" },
		entries: [{ name: "GLD000000123_full.csv" }]
	}));
	assert.strictEqual(flatResult.root.Uitleesronde[0].structure, "flat");
	assert.strictEqual(flatResult.facetUri, Controller.facetUri);

	const zipResult = await Controller.process(Object.assign({}, context, {
		doc: { naam: "ronde.zip" },
		entries: [{ name: "hoofdmap/GLD000000123_full.csv" }]
	}));
	assert.strictEqual(zipResult.root.Uitleesronde[0].structure, "single-folder");
	assert.strictEqual(zipResult.facetUri, Controller.facetUri);

	const mixedPackage = await Controller.process(Object.assign({}, context, {
		doc: { naam: "gemengd" },
		entries: [
			{ name: "GLD000000123_full.csv" },
			{ name: "archief.zip" },
			{ name: "andere-map/notities.txt" }
		]
	}));
	assert.strictEqual(mixedPackage.root.Uitleesronde[0].status, "NIET_VALIDE");
	assert.strictEqual(mixedPackage.facetUri, Controller.facetUri);
	assert.match(mixedPackage.view.Validatie.map(row => row.melding).join(" "), /alleen GLD/);
}

main().then(() => {
	console.log("GLD-full uitleesronde checks: OK");
}, error => {
	console.error(error);
	process.exitCode = 1;
});
