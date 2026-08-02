"use veldapps-imbro/Gmw, veldapps-imbro/BroPreview";

const Gmw = require("veldapps-imbro/Gmw");
const BroPreview = require("veldapps-imbro/BroPreview");

function rootFor(component) {
	return component.up("Tabs<Document>:root") || component.up(":root") || component;
}
function applyGmwView(root, model) {
	const result = root.vars("parser-document-result") || {};
	const alphaview = root.qs("#alphaview");
	const reflect = alphaview && alphaview.qs("#reflect");

	root.vars("document.bro.gmw.model", model);
	root.vars("parser-document-root", model.view);
	result.view = model.view;
	root.vars("parser-document-result", result);
	if(alphaview) {
		alphaview.vars("sel", [model.view]);
		reflect && reflect.execute([model.view]);
	}
	return model;
}
function renderGmwPreview(component) {
	const root = rootFor(component);
	const preview = root.qs("#preview");
	const node = preview && preview.getNode && preview.getNode();
	const model = root.vars("document.bro.gmw.model") ||
		Gmw.model(root.vars("parser-document-result") || {});
	const registry = BroPreview.createRegistry();

	root.vars("document.bro.gmw.model", model);
	preview && preview.vars("bro.preview.instances", registry.items);
	if(node) node.innerHTML = Gmw.render(model, {
		instanceAttrs: (instance, label, meta) =>
			BroPreview.instanceAttrs(registry, instance, label, meta)
	});
	return model;
}
function scheduleGmwPreview(component, delay) {
	const render = () => {
		try {
			renderGmwPreview(component);
		} catch(error) {
			rootFor(component).app().print("bro-gmw.preview", error);
		}
	};
	if(component.setTimeout instanceof Function) {
		component.setTimeout("render-bro-gmw-preview", render, delay || 0);
	} else {
		setTimeout(render, delay || 0);
	}
}
function activateGmwFacet(action) {
	const root = rootFor(action);
	const model = Gmw.model(root.vars("parser-document-result") || {});

	root.vars("document.facet", "bro.gmw");
	root.vars("document.getSpecificFacet", null);
	root.vars("document.applySpecificFacet", null);
	root.vars("document.bro.gmw.renderPreview", renderGmwPreview);
	applyGmwView(root, model);
	root.qs("#tab-preview").show();
	scheduleGmwPreview(root, 50);
}

[["./Tabs<Document.bro>"], {
	vars: {
		document: {
			"activate-facet": activateGmwFacet,
			defaultTab: "tab-preview",
			facet: "bro.gmw",
			bro: {
				gmw: {
					renderPreview: renderGmwPreview
				}
			}
		}
	}
}, [
	["#preview", {
		css: {
			'': "overflow:hidden;background:#f7f8fa;color:#26323c;",
			"& .gmw-preview-header": "box-sizing:border-box;height:44px;padding:12px 18px;background:white;border-bottom:1px solid #dfe3e7;font-size:14px;",
			"& .gmw-separator": "display:inline-block;margin:0 9px;color:#a0a7ad;",
			"& .gmw-preview-scroll": "position:absolute;left:0;right:0;top:44px;bottom:39px;overflow:auto;padding:12px 16px;box-sizing:border-box;",
			"& .gmw-profile": "display:block;background:white;border:1px solid #dfe3e7;border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,.05);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;",
			"& .gmw-profile [data-bro-ref]": "cursor:pointer;",
			"& .gmw-profile [data-bro-ref]:hover > text, & .gmw-profile text[data-bro-ref]:hover": "color:#1d4ed8;fill:#1d4ed8;text-decoration:underline;",
			"& .gmw-profile rect[data-bro-ref]:hover, & .gmw-profile circle[data-bro-ref]:hover": "stroke:#1d4ed8;stroke-width:2;filter:drop-shadow(0 0 2px rgba(29,78,216,.45));",
			"& .gmw-profile .gmw-soil": "fill:#f2eee4;",
			"& .gmw-profile .depth-grid": "stroke:#dfe4e8;stroke-width:1;shape-rendering:crispEdges;",
			"& .gmw-profile .depth-label": "fill:#68747d;font-size:11px;text-anchor:end;",
			"& .gmw-profile .depth-axis-title": "fill:#68747d;font-size:11px;text-anchor:middle;",
			"& .gmw-profile .ground-line": "stroke:#6d8c54;stroke-width:3;shape-rendering:crispEdges;",
			"& .gmw-profile .ground-label": "fill:#526b40;font-size:11px;font-weight:600;",
			"& .gmw-profile .tube-title": "fill:#26323c;font-size:14px;font-weight:600;text-anchor:middle;",
			"& .gmw-profile .tube-detail": "fill:#68747d;font-size:10px;text-anchor:middle;",
			"& .gmw-profile .plain-tube": "fill:#f8fbfd;stroke:#566773;stroke-width:2;shape-rendering:crispEdges;",
			"& .gmw-profile .screen": "stroke:#2f659d;stroke-width:2;shape-rendering:crispEdges;",
			"& .gmw-profile .sump": "fill:#d8c7a5;stroke:#566773;stroke-width:2;shape-rendering:crispEdges;",
			"& .gmw-profile .tube-cap": "stroke:#26323c;stroke-width:4;",
			"& .gmw-profile .position-label": "fill:#53616b;font-size:10px;text-anchor:end;",
			"& .gmw-profile .electrode": "fill:white;stroke:#929aa3;stroke-width:3;",
			"& .gmw-profile .electrode-gebruiksklaar": "stroke:#35a853;",
			"& .gmw-profile .electrode-nietGebruiksklaar": "stroke:#377bd1;",
			"& .gmw-profile .electrode-onbruikbaar": "stroke:#d94b45;",
			"& .gmw-profile .metadata-title": "fill:#26323c;font-size:14px;font-weight:600;",
			"& .gmw-profile .metadata-divider": "stroke:#e1e6ea;stroke-width:1;shape-rendering:crispEdges;",
			"& .gmw-profile .metadata-label": "fill:#4b5862;font-size:11px;font-weight:600;",
			"& .gmw-profile .metadata-value": "fill:#26323c;font-size:11px;",
			"& .gmw-profile .event-dot": "fill:#377bd1;",
			"& .gmw-profile .event-title": "fill:#26323c;font-size:11px;font-weight:600;",
			"& .gmw-profile .event-date": "fill:#7a858e;font-size:10px;",
			"& .gmw-legend": "position:absolute;left:0;right:0;bottom:0;box-sizing:border-box;height:39px;padding:9px 18px;overflow:auto;white-space:nowrap;background:white;border-top:1px solid #dfe3e7;font-size:11px;color:#57636c;",
			"& .gmw-legend span": "margin-right:18px;",
			"& .gmw-legend i": "display:inline-block;width:11px;height:11px;margin-right:5px;border:1px solid #68747d;vertical-align:-2px;",
			"& .gmw-legend .legend-plain": "background:#f8fbfd;",
			"& .gmw-legend .legend-screen": "background:repeating-linear-gradient(45deg,#dceaf7,#dceaf7 3px,#377bd1 3px,#377bd1 4px);",
			"& .gmw-legend .legend-ground": "height:3px;border:0;background:#6d8c54;vertical-align:2px;",
			"& .gmw-legend em": "color:#7a858e;font-style:normal;",
			"& .gmw-empty": "margin:40px;padding:32px;text-align:center;color:#6f7981;background:white;border:1px solid #dfe3e7;border-radius:4px;font-size:15px;"
		},
		onClick(evt) {
			return BroPreview.open(this, evt) || this.inherited(arguments);
		},
		onRender() {
			if(this.isVisible && this.isVisible()) scheduleGmwPreview(this, 25);
		}
	}],
	["#tabs-sections", {
		onChange(newTab) {
			const result = this.inherited(arguments);
			if(result !== false && newTab === this.ud("#tab-preview")) {
				scheduleGmwPreview(this, 25);
			}
			return result;
		}
	}]
]];
