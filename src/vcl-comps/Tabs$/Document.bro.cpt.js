"use veldapps-imbro/Cpt, veldapps-imbro/BroPreview";

const Cpt = require("veldapps-imbro/Cpt");
const BroPreview = require("veldapps-imbro/BroPreview");

function rootFor(component) {
	return component.up("Tabs<Document>:root") || component.up(":root") || component;
}
function applyCptView(root, model) {
	const result = root.vars("parser-document-result") || {};
	const alphaview = root.qs("#alphaview");
	const reflect = alphaview && alphaview.qs("#reflect");

	root.vars("document.bro.cpt.model", model);
	root.vars("parser-document-root", model.view);
	result.view = model.view;
	root.vars("parser-document-result", result);
	if(alphaview) {
		alphaview.vars("sel", [model.view]);
		reflect && reflect.execute([model.view]);
	}
	return model;
}
function renderCptPreview(component) {
	const root = rootFor(component);
	const preview = root.qs("#preview");
	const node = preview && preview.getNode && preview.getNode();
	const model = root.vars("document.bro.cpt.model") ||
		Cpt.model(root.vars("parser-document-result") || {});
	const registry = BroPreview.createRegistry();

	root.vars("document.bro.cpt.model", model);
	preview && preview.vars("bro.preview.instances", registry.items);
	if(node) node.innerHTML = Cpt.render(model, {
		instanceAttrs: (instance, label, meta) =>
			BroPreview.instanceAttrs(registry, instance, label, meta)
	});
	return model;
}
function scheduleCptPreview(component, delay) {
	const render = () => {
		try {
			renderCptPreview(component);
		} catch(error) {
			rootFor(component).app().print("bro-cpt.preview", error);
		}
	};
	if(component.setTimeout instanceof Function) {
		component.setTimeout("render-bro-cpt-preview", render, delay || 0);
	} else {
		setTimeout(render, delay || 0);
	}
}
function activateCptFacet(action) {
	const root = rootFor(action);
	const model = Cpt.model(root.vars("parser-document-result") || {});

	root.vars("document.facet", "bro.cpt");
	root.vars("document.getSpecificFacet", null);
	root.vars("document.applySpecificFacet", null);
	root.vars("document.bro.cpt.renderPreview", renderCptPreview);
	applyCptView(root, model);
	root.qs("#tab-preview").show();
	scheduleCptPreview(root, 50);
}

[["./Tabs<Document.bro>"], {
	vars: {
		document: {
			"activate-facet": activateCptFacet,
			defaultTab: "tab-preview",
			facet: "bro.cpt",
			bro: {
				cpt: {
					renderPreview: renderCptPreview
				}
			}
		}
	}
}, [
	["#preview", {
		css: {
			'': "overflow:hidden;background:#f7f8fa;color:#26323c;",
			"& .cpt-preview-header": "box-sizing:border-box;height:44px;padding:12px 18px;background:white;border-bottom:1px solid #dfe3e7;font-size:14px;",
			"& .cpt-separator": "display:inline-block;margin:0 9px;color:#a0a7ad;",
			"& .cpt-preview-scroll": "position:absolute;left:0;right:0;top:44px;bottom:39px;overflow:auto;padding:12px 16px;box-sizing:border-box;",
			"& .cpt-chart": "display:block;background:white;border:1px solid #dfe3e7;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.05);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;",
			"& .cpt-chart [data-bro-ref]": "cursor:pointer;",
			"& .cpt-chart [data-bro-ref]:hover > text, & .cpt-chart text[data-bro-ref]:hover": "color:#1d4ed8;fill:#1d4ed8;text-decoration:underline;",
			"& .cpt-chart .depth-grid": "stroke:#e3e7ea;stroke-width:1;shape-rendering:crispEdges;",
			"& .cpt-chart .depth-label": "fill:#68747d;font-size:11px;text-anchor:end;",
			"& .cpt-chart .depth-axis-title": "fill:#68747d;font-size:11px;text-anchor:middle;",
			"& .cpt-chart .track-title": "fill:#26323c;font-size:13px;font-weight:600;",
			"& .cpt-chart .track-scale": "fill:#7a858e;font-size:10px;",
			"& .cpt-chart .track-background": "fill:#fbfcfd;stroke:#cfd5da;stroke-width:1;shape-rendering:crispEdges;",
			"& .cpt-chart .track-zero": "stroke:#aab3ba;stroke-width:1;stroke-dasharray:3 3;",
			"& .cpt-chart .series-line": "fill:none;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke;",
			"& .cpt-chart .cpt-series:hover .series-line": "stroke-width:2.5;filter:drop-shadow(0 0 2px rgba(29,78,216,.4));",
			"& .cpt-chart .removed-layer rect": "fill:rgba(172,128,73,.12);stroke:rgba(132,93,48,.45);stroke-width:1;",
			"& .cpt-chart .removed-layer:hover rect": "fill:rgba(172,128,73,.25);stroke:#1d4ed8;stroke-width:2;",
			"& .cpt-chart .predrilled-line": "stroke:#a66b2d;stroke-width:1.5;stroke-dasharray:7 4;",
			"& .cpt-chart .predrilled-label": "fill:#855420;font-size:10px;font-weight:600;paint-order:stroke;stroke:white;stroke-width:3px;",
			"& .cpt-chart .dissipation-marker line": "stroke:#db8d19;stroke-width:1.5;stroke-dasharray:4 3;",
			"& .cpt-chart .dissipation-marker circle": "fill:#db8d19;stroke:white;stroke-width:2;",
			"& .cpt-chart .dissipation-marker:hover line": "stroke:#1d4ed8;stroke-width:2.5;",
			"& .cpt-chart .metadata-divider": "stroke:#e1e6ea;stroke-width:1;shape-rendering:crispEdges;",
			"& .cpt-chart .metadata-title": "fill:#26323c;font-size:14px;font-weight:600;",
			"& .cpt-chart .metadata-label": "fill:#4b5862;font-size:11px;font-weight:600;",
			"& .cpt-chart .metadata-value": "fill:#26323c;font-size:11px;",
			"& .cpt-legend": "position:absolute;left:0;right:0;bottom:0;box-sizing:border-box;height:39px;padding:9px 18px;overflow:auto;white-space:nowrap;background:white;border-top:1px solid #dfe3e7;font-size:11px;color:#57636c;",
			"& .cpt-legend span": "margin-right:18px;",
			"& .cpt-legend i": "display:inline-block;width:16px;height:3px;margin-right:5px;vertical-align:3px;",
			"& .cpt-legend .dissipation i": "width:9px;height:9px;border-radius:50%;background:#db8d19;vertical-align:-1px;",
			"& .cpt-empty": "margin:40px;padding:32px;text-align:center;color:#6f7981;background:white;border:1px solid #dfe3e7;border-radius:4px;font-size:15px;"
		},
		onClick(evt) {
			return BroPreview.open(this, evt) || this.inherited(arguments);
		},
		onRender() {
			if(this.isVisible && this.isVisible()) scheduleCptPreview(this, 25);
		}
	}],
	["#tabs-sections", {
		onChange(newTab) {
			const result = this.inherited(arguments);
			if(result !== false && newTab === this.ud("#tab-preview")) {
				scheduleCptPreview(this, 25);
			}
			return result;
		}
	}]
]];
