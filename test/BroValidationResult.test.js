"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let BroValidationResult;
const file = path.resolve(__dirname, "../src/BroValidationResult.js");
const sandbox = {
	Array: Array,
	Object: Object,
	String: String,
	define(factory) {
		BroValidationResult = factory();
	}
};

vm.runInNewContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });

const unrelated = {
	root: { status: "VALID", errors: [] },
	capabilities: { json: true }
};
assert.strictEqual(BroValidationResult.classify(unrelated, {
	doc: { naam: "resultaat.json" }
}), null);

const result = {
	root: {
		status: "INVALID",
		errors: [null, { message: "Ongeldig BRO-document" }]
	},
	capabilities: { json: true }
};
const uri = BroValidationResult.classify(result, {
	doc: { _values: { naam: "validatie-BHR0001.json" } }
});

assert.strictEqual(uri, "veldapps-imbro/Tabs<Document.bro>");
assert.strictEqual(result.type, "bro/validatieresultaat/1.0");
assert.strictEqual(result.status, "INVALID");
assert.strictEqual(result.errors.length, 1);
assert.strictEqual(result.root, result.view);
assert.strictEqual(result.capabilities.bro, true);
assert.strictEqual(result.capabilities.validation, true);

console.log("BRO validation-result checks: OK");
