"use veldapps-imbro/Bhr, veldapps-imbro/BroPreview";

const Bhr = require("veldapps-imbro/Bhr");
const BroPreview = require("veldapps-imbro/BroPreview");

function rootFor(component) {
	return component.up("Tabs<Document>:root") || component.up(":root") || component;
}
function renderBhrPreview(component) {
	const root = rootFor(component);
	const preview = root.qs("#preview");
	const node = preview && preview.getNode && preview.getNode();
	const result = root.vars("parser-document-result") || {};
	const model = Bhr.model(result);
	const registry = BroPreview.createRegistry();

	root.vars("document.bro.bhr.model", model);
	preview && preview.vars("bro.preview.instances", registry.items);
	if(node) node.innerHTML = Bhr.render(model, {
		instanceAttrs: (instance, label, meta) =>
			BroPreview.instanceAttrs(registry, instance, label, meta)
	});
	return model;
}
function scheduleBhrPreview(component, delay) {
	const render = () => {
		try {
			renderBhrPreview(component);
		} catch(error) {
			rootFor(component).app().print("bro-bhr.preview", error);
		}
	};
	if(component.setTimeout instanceof Function) {
		component.setTimeout("render-bro-bhr-preview", render, delay || 0);
	} else {
		setTimeout(render, delay || 0);
	}
}
function activateBhrFacet(action) {
	const root = rootFor(action);

	root.vars("document.facet", "bro.bhr");
	root.vars("document.getSpecificFacet", null);
	root.vars("document.applySpecificFacet", null);
	root.vars("document.bro.bhr.renderPreview", renderBhrPreview);
	root.qs("#tab-preview").show();
	scheduleBhrPreview(root, 50);
}

[["./Tabs<Document.bro>"], {
	vars: {
		document: {
			"activate-facet": activateBhrFacet,
			defaultTab: "tab-preview",
			facet: "bro.bhr",
			bro: {
				bhr: {
					renderPreview: renderBhrPreview
				}
			}
		}
	}
}, [
	["#preview", {
		css: {
			'': "overflow:hidden;background:#f7f8fa;color:#26323c;",
			"& .bhr-preview-header": "box-sizing:border-box;height:44px;padding:12px 18px;background:white;border-bottom:1px solid #dfe3e7;font-size:14px;",
			"& .bhr-separator": "display:inline-block;margin:0 9px;color:#a0a7ad;",
			"& .bhr-preview-scroll": "position:absolute;left:0;right:0;top:44px;bottom:39px;overflow:auto;padding:12px 16px;box-sizing:border-box;",
			"& .bhr-log": "display:block;background:white;border:1px solid #dfe3e7;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.05);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;",
			"& .bhr-log [data-bro-ref]": "cursor:pointer;",
			"& .bhr-log [data-bro-ref]:hover > text, & .bhr-log text[data-bro-ref]:hover": "color:#1d4ed8;fill:#1d4ed8;text-decoration:underline;",
			"& .bhr-log .depth-grid": "stroke:#e3e7ea;stroke-width:1;shape-rendering:crispEdges;",
			"& .bhr-log .depth-label": "fill:#68747d;font-size:11px;text-anchor:end;",
			"& .bhr-log .depth-axis-title": "fill:#68747d;font-size:11px;text-anchor:middle;",
			"& .bhr-log .track-title": "fill:#26323c;font-size:14px;font-weight:600;",
			"& .bhr-log .track-detail": "fill:#7a858e;font-size:10px;",
			"& .bhr-log .track-background": "fill:#fbfcfd;stroke:#cfd5da;stroke-width:1;shape-rendering:crispEdges;",
			"& .bhr-log .profile-background": "fill:#fbfcfd;stroke:#aab2b9;stroke-width:1;shape-rendering:crispEdges;",
			"& .bhr-log .profile-layer rect": "shape-rendering:crispEdges;",
			"& .bhr-log .profile-layer .component-band": "stroke:rgba(39,52,62,.45);stroke-width:.5;",
			"& .bhr-log .profile-layer .layer-outline": "fill:none;stroke:#27343e;stroke-width:1;shape-rendering:crispEdges;",
			"& .bhr-log .profile-layer:hover .layer-outline": "stroke:#1d4ed8;stroke-width:2;filter:drop-shadow(0 0 2px rgba(29,78,216,.45));",
			"& .bhr-log .layer-thickness": "fill:#53616b;font-size:10px;font-weight:600;pointer-events:none;",
			"& .bhr-log .layer-name": "fill:#26323c;font-size:10px;pointer-events:none;",
			"& .bhr-log .interval rect": "stroke:rgba(36,48,58,.55);stroke-width:1;shape-rendering:crispEdges;",
			"& .bhr-log .interval:hover rect": "stroke:#1d4ed8;stroke-width:2;filter:drop-shadow(0 0 2px rgba(29,78,216,.45));",
			"& .bhr-log .item-title": "fill:#17212a;font-size:11px;font-weight:600;pointer-events:none;",
			"& .bhr-log .item-detail": "fill:#26323c;font-size:9px;pointer-events:none;",
			"& .bhr-log .depth-marker line": "stroke-width:2;stroke-dasharray:6 3;",
			"& .bhr-log .depth-marker text": "font-size:10px;font-weight:600;paint-order:stroke;stroke:white;stroke-width:3px;",
			"& .bhr-log .depth-marker:hover line": "stroke-width:3;",
			"& .bhr-log .metadata-title": "fill:#26323c;font-size:14px;font-weight:600;",
			"& .bhr-log .metadata-label": "fill:#4b5862;font-size:11px;font-weight:600;",
			"& .bhr-log .metadata-value": "fill:#26323c;font-size:11px;",
			"& .bhr-legend": "position:absolute;left:0;right:0;bottom:0;box-sizing:border-box;height:39px;padding:9px 18px;overflow:auto;white-space:nowrap;background:white;border-top:1px solid #dfe3e7;font-size:11px;color:#57636c;",
			"& .bhr-legend-item": "margin-right:16px;",
			"& .bhr-legend-item i": "display:inline-block;width:10px;height:10px;margin-right:5px;border:1px solid rgba(0,0,0,.25);vertical-align:-1px;",
			"& .bhr-empty": "margin:40px;padding:32px;text-align:center;color:#6f7981;background:white;border:1px solid #dfe3e7;border-radius:4px;font-size:15px;"
		},
		onClick(evt) {
			return BroPreview.open(this, evt) || this.inherited(arguments);
		},
		onRender() {
			if(this.isVisible && this.isVisible()) scheduleBhrPreview(this, 25);
		}
	}],
	["#tabs-sections", {
		onChange(newTab) {
			const result = this.inherited(arguments);
			if(result !== false && newTab === this.ud("#tab-preview")) scheduleBhrPreview(this, 25);
			return result;
		}
	}]
]];
