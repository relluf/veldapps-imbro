"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let BroPreview;
let opened;
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, "../src/BroPreview.js"), "utf8"), {
	Array: Array,
	Function: Function,
	H: {
		i(value) {
			opened = value;
			return true;
		}
	},
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

const node = {
	nodeType: 1,
	parentNode: null,
	getAttribute(name) {
		return name === "data-bro-ref" ? ref : null;
	}
};
assert.strictEqual(BroPreview.open({
	vars(name) {
		return name === "bro.preview.instances" ? registry.items : null;
	}
}, {
	target: node,
	preventDefault() {},
	stopPropagation() {}
}), true);
assert.strictEqual(opened["Laag: 1–2 m"][0], instance,
	"preview-links moeten het gekoppelde object via H.i openen");

const directAttrs = BroPreview.instanceAttrs(registry, instance, "Open document", { direct: true });
const directRef = directAttrs.match(/data-bro-ref='([^']+)'/)[1];
node.getAttribute = name => name === "data-bro-ref" ? directRef : null;
BroPreview.open({ vars: () => registry.items }, { target: node });
assert.strictEqual(opened, instance,
	"document-id's moeten het Meetpunt/Borehole-hoofdobject rechtstreeks via H.i openen");

const detailArray = [{ waarde: 1 }, { waarde: 2 }];
const arrayAttrs = BroPreview.instanceAttrs(registry, detailArray, "Open detailarray", { direct: true });
const arrayRef = arrayAttrs.match(/data-bro-ref='([^']+)'/)[1];
node.getAttribute = name => name === "data-bro-ref" ? arrayRef : null;
BroPreview.open({ vars: () => registry.items }, { target: node });
assert.strictEqual(opened, detailArray,
	"array-details moeten bij aanklikken rechtstreeks door H.i worden geïnspecteerd");

console.log("BRO preview interaction checks: OK");
