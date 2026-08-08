"use veldapps-imbro/Gmn, veldapps-imbro/BroPreview";

const Gmn = require("veldapps-imbro/Gmn");
const BroPreview = require("veldapps-imbro/BroPreview");

function rootFor(component) {
	return component.up("Tabs<Document>:root") || component.up(":root") || component;
}
function isGmnResult(result) {
	const type = String(result && result.type || "");
	return type === "bro-gmn" || type.startsWith("bro-gmn/");
}
function applyGmnView(root, model) {
	const result = root.vars("parser-document-result") || {};
	const alphaview = root.qs("#alphaview");
	const reflect = alphaview && alphaview.qs("#reflect");

	root.vars("document.bro.gmn.model", model);
	root.vars("parser-document-root", model.view);
	result.view = model.view;
	root.vars("parser-document-result", result);
	if(alphaview) {
		alphaview.vars("sel", [model.view]);
		reflect && reflect.execute([model.view]);
	}
	return model;
}
function renderGmnPreview(component) {
	const root = rootFor(component);
	const result = root.vars("parser-document-result") || {};
	if(!isGmnResult(result)) return null;
	const preview = root.qs("#preview");
	const node = preview && preview.getNode && preview.getNode();
	const model = root.vars("document.bro.gmn.model") || Gmn.model(result);
	const registry = BroPreview.createRegistry();

	root.vars("document.bro.gmn.model", model);
	preview && preview.vars("bro.preview.instances", registry.items);
	if(node) node.innerHTML = Gmn.render(model, {
		instanceAttrs: (instance, label, meta) =>
			BroPreview.instanceAttrs(registry, instance, label, meta)
	});
	return model;
}
function scheduleGmnPreview(component, delay) {
	if(!isGmnResult(rootFor(component).vars("parser-document-result") || {})) return null;
	const render = () => {
		try {
			renderGmnPreview(component);
		} catch(error) {
			rootFor(component).app().print("bro-gmn.preview", error);
		}
	};
	if(component.setTimeout instanceof Function) {
		component.setTimeout("render-bro-gmn-preview", render, delay || 0);
	} else {
		setTimeout(render, delay || 0);
	}
}
function activateGmnFacet(action) {
	const root = rootFor(action);
	const result = root.vars("parser-document-result") || {};
	if(!isGmnResult(result)) return null;
	const model = Gmn.model(result);

	root.vars("document.facet", "bro.gmn");
	root.vars("document.getSpecificFacet", null);
	root.vars("document.applySpecificFacet", null);
	root.vars("document.bro.gmn.renderPreview", renderGmnPreview);
	applyGmnView(root, model);
	root.qs("#tab-preview").show();
	scheduleGmnPreview(root, 50);
}

[["./Tabs<Document.bro>"], {
	vars: {
		document: {
			"activate-facet": activateGmnFacet,
			defaultTab: "tab-preview",
			facet: "bro.gmn",
			bro: {
				gmn: {
					renderPreview: renderGmnPreview
				}
			}
		}
	}
}, [
	["#preview", {
		css: {
			'': "overflow:hidden;background:#f7f8fa;color:#26323c;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;",
			"& .gmn-preview-header": "box-sizing:border-box;height:44px;padding:12px 18px;overflow:hidden;white-space:nowrap;background:white;border-bottom:1px solid #dfe3e7;font-size:14px;",
			"& .gmn-separator": "display:inline-block;margin:0 9px;color:#a0a7ad;",
			"& .bro-id-link": "color:#1d4ed8;text-decoration:none;",
			"& .bro-id-link:hover": "text-decoration:underline;",
			"& .gmn-preview-id[data-bro-ref]": "cursor:pointer;",
			"& .gmn-preview-id[data-bro-ref]:hover": "color:#1d4ed8;text-decoration:underline;",
			"& .gmn-preview-scroll": "position:absolute;left:0;right:0;top:44px;bottom:0;overflow:auto;padding:12px 16px;box-sizing:border-box;",
			"& .gmn-points": "width:100%;border-collapse:separate;border-spacing:0;background:white;border:1px solid #dfe3e7;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.05);font-size:12px;",
			"& .gmn-points th": "position:sticky;top:0;z-index:1;padding:9px 10px;text-align:left;white-space:nowrap;background:#f1f4f6;border-bottom:1px solid #cfd6dc;color:#45525c;font-weight:600;",
			"& .gmn-points td": "padding:8px 10px;white-space:nowrap;border-bottom:1px solid #e7ebee;color:#26323c;",
			"& .gmn-points tbody tr:last-child td": "border-bottom:0;",
			"& .gmn-points tbody tr:hover td": "background:#f7faff;",
			"& .gmn-point-link[data-bro-ref]": "cursor:pointer;",
			"& .gmn-point-link[data-bro-ref]:hover": "color:#1d4ed8;text-decoration:underline;",
			"& .gmn-empty": "margin:40px;padding:32px;text-align:center;color:#6f7981;background:white;border:1px solid #dfe3e7;border-radius:4px;font-size:15px;"
		},
		onClick(evt) {
			return BroPreview.open(this, evt) || this.inherited(arguments);
		},
		onRender() {
			if(this.isVisible && this.isVisible()) scheduleGmnPreview(this, 25);
		}
	}],
	["#tabs-sections", {
		onChange(newTab) {
			const result = this.inherited(arguments);
			if(result !== false && newTab === this.ud("#tab-preview")) {
				scheduleGmnPreview(this, 25);
			}
			return result;
		}
	}]
]];
