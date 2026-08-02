"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let BroPreview;
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, "../src/BroPreview.js"), "utf8"), {
	Array: Array,
	Object: Object,
	String: String,
	define(factory) {
		BroPreview = factory();
	}
});

const registry = BroPreview.createRegistry();
const instance = { "bhrgtcom:beginDepth": "1", values: [1, 2] };
const attrs = BroPreview.instanceAttrs(registry, instance, "Open laag", {
	type: "Laag",
	label: "1–2 m"
});
const ref = attrs.match(/data-bro-ref='([^']+)'/)[1];
const inspected = BroPreview.inspectObjectFor(instance, registry.items[ref].meta);

assert.strictEqual(registry.items[ref].instance, instance);
assert.match(attrs, /role='button'/);
assert.match(attrs, /tabindex='0'/);
assert.strictEqual(inspected["Laag: 1–2 m"][0], instance);
assert.deepStrictEqual(Array.from(inspected.values), [1, 2]);

console.log("BRO preview interaction checks: OK");
