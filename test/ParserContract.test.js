"use strict";

const path = require("path");
const parserRoot = path.resolve(__dirname, "../../veldapps-bxv-parser");
const { assertInstallIdempotent, runCases } = require(path.join(parserRoot, "test/Contract"));
const { createHarness } = require(path.join(parserRoot, "test/ParserHarness"));
const harness = createHarness();
const XmlProfiles = harness.loadAmd(path.resolve(__dirname, "../src/profiles/xml.js"), {
	module: { id: "veldapps-imbro/profiles/xml" },
	"veldapps-xml/index": harness.Xml
}, { id: "veldapps-imbro/profiles/xml" });
const Bxv = harness.loadAmd(path.resolve(__dirname, "../src/bxv.js"), {
	"bxv/Profiles": harness.Profiles,
	"./profiles/xml": XmlProfiles,
	"./profiles/gld-full-csv": { id: "veldapps-imbro/profiles/gld-full-csv" }
}, { id: "veldapps-imbro/bxv" });

assertInstallIdempotent(Bxv, harness.Profiles, ["csv", "xml"]);

runCases(harness.Parser, [{
	base: __dirname,
	fixture: "fixtures/bro-cpt-1.1.xml",
	expect: {
		format: "bxv/formats/xml",
		profile: "veldapps-imbro/profiles/xml/bro-cpt",
		type: "bro-cpt/1.1",
		version: "1.1",
		capabilities: ["bro", "xml", "view"],
		rootKeys: ["dispatchDataResponse"]
	}
}, {
	base: __dirname,
	fixture: "fixtures/generic.xml",
	expect: {
		format: "bxv/formats/xml",
		profile: "bxv/profiles/xml",
		type: "xml",
		version: "generic",
		capabilities: ["xml", "view"]
	}
}]).then(() => console.log("BRO parser contract tests passed")).catch(error => {
	console.error(error);
	process.exitCode = 1;
});
