define(function() {
	"use strict";

	let registrySequence = 0;

	function escapeHtml(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}
	function createRegistry() {
		return {
			id: ++registrySequence,
			sequence: 0,
			items: {}
		};
	}
	function instanceAttrs(registry, instance, label, meta) {
		if(!registry || !instance || typeof instance !== "object") return "";
		const key = "bro-" + registry.id + "-" + (++registry.sequence);
		registry.items[key] = {
			instance: instance,
			meta: meta || {}
		};
		return " data-bro-ref='" + key + "' role='button' tabindex='0' aria-label='" +
			escapeHtml(label || "Open BRO XML-element") + "'";
	}
	function refNode(target) {
		let node = target;
		while(node && node.nodeType === 1) {
			if(node.getAttribute && node.getAttribute("data-bro-ref")) return node;
			node = node.parentNode;
		}
		return null;
	}
	function inspectObjectFor(instance, meta) {
		meta = meta || {};
		const title = [meta.type || "XML-element", meta.label || ""]
			.filter(Boolean).join(": ");
		const object = {};
		object[title] = [instance];
		if(meta.parent && meta.parent !== instance) object.Parent = [meta.parent];
		Object.keys(instance).forEach(key => {
			if(Array.isArray(instance[key])) object[key.split(":").pop()] = instance[key];
		});
		return object;
	}
	function open(preview, evt) {
		const node = refNode(evt && evt.target);
		const ref = node && node.getAttribute("data-bro-ref");
		const item = ref && preview && preview.vars &&
			(preview.vars("bro.preview.instances") || {})[ref];
		if(!item || !item.instance) return false;

		evt.preventDefault && evt.preventDefault();
		evt.stopPropagation && evt.stopPropagation();
		const target = item.meta && item.meta.direct ? item.instance :
			inspectObjectFor(item.instance, item.meta);
		const result = H.i(target);
		return result && result.then instanceof Function ?
			result.then(helper => helper && helper.addClass && helper.addClass("no-shrinking")) : true;
	}

	return {
		createRegistry: createRegistry,
		inspectObjectFor: inspectObjectFor,
		instanceAttrs: instanceAttrs,
		open: open,
		refNode: refNode
	};
});
