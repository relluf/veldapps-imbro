"use veldapps-imbro/Gmw, veldapps-imbro/BroPreview, veldapps-xml/index";

const Gmw = require("veldapps-imbro/Gmw");
const BroPreview = require("veldapps-imbro/BroPreview");
const Xml = require("veldapps-xml/index");

const GMW_BRO_OBJECT_URL = "https://veldoffice.nl/broservices/gm/gmw/v1/objects/";

function rootFor(component) {
	return component.up("Tabs<Document>:root") || component.up(":root") || component;
}
function isGmwResult(result) {
	const type = String(result && result.type || "");
	return type === "bro-gmw" || type.startsWith("bro-gmw/");
}
function selectedTreeNode(component) {
	const portal = rootFor(component).up("Portal<>");
	const tree = portal && portal.qs("#tree");

	return tree && tree.getSelection()[0];
}
function openRegisteredGmw(component, evt) {
	const target = evt && evt.target;
	const link = target && target.closest &&
		target.closest(".gmw-preview-header .bro-id-link");
	const model = link && rootFor(component).vars("document.bro.gmw.model");
	const broId = model && String(model.broId || "").trim();
	const parent = selectedTreeNode(component);

	if(!Gmw.isBroId(broId)) return false;
	evt.preventDefault && evt.preventDefault();
	evt.stopPropagation && evt.stopPropagation();
	return fetch.text(GMW_BRO_OBJECT_URL + broId)
		.then(text => O(`/${broId}.xml`, { text: text, parent: parent }));
}
function openComparisonReport(action, report) {
	const name = "vergelijking-" + report.broId + "-BRO.md";
	const id = "pouchdb://veldoffice/" + name;
	const text = Gmw.markdownReport(report, {
		broUrl: GMW_BRO_OBJECT_URL + report.broId
	});
	const parent = action.up("vcl/ui/Node-closeable") || selectedTreeNode(action);

	action.bubble("openform", {
		uri: "Tabs<Document>",
		title: name,
		parent: parent,
		params: {
			instance: {
				id: id,
				naam: name,
				omschrijving: "Vergelijking lokaal GMW-document met de BRO"
			},
			resource: {
				uri: id,
				text: text,
				generated: Date.now()
			}
		}
	});
	return report;
}
function compareWithBro(action) {
	const root = rootFor(action);
	const model = root.vars("document.bro.gmw.model") ||
		Gmw.model(root.vars("parser-document-result") || {});
	const broId = model.registeredBroId;

	if(!Gmw.isBroId(broId)) return null;
	const comparison = fetch.text(GMW_BRO_OBJECT_URL + broId)
		.then(text => Xml.parse(text))
		.then(xml => Gmw.compare(model, xml))
		.then(report => openComparisonReport(action, report));
	const console = action.ud("#console");
	return console && console.print instanceof Function ?
		console.print("Vergelijken met de BRO", comparison) : comparison;
}
function syncGmwActions(root, model) {
	const compare = root.down("#compare-gmw-with-bro");
	const actions = root.down("#gmw-actions");
	const available = Gmw.isBroId(model && model.registeredBroId);

	compare && compare.setEnabled(available);
	actions && actions.setVisible(true);
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
	const result = root.vars("parser-document-result") || {};
	if(!isGmwResult(result)) return null;
	const preview = root.qs("#preview");
	const node = preview && preview.getNode && preview.getNode();
	const model = root.vars("document.bro.gmw.model") ||
		Gmw.model(result);
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
	if(!isGmwResult(rootFor(component).vars("parser-document-result") || {})) return null;
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
	const result = root.vars("parser-document-result") || {};
	if(!isGmwResult(result)) return null;
	const model = Gmw.model(result);

	root.vars("document.facet", "bro.gmw");
	root.vars("document.getSpecificFacet", null);
	root.vars("document.applySpecificFacet", null);
	root.vars("document.bro.gmw.renderPreview", renderGmwPreview);
	applyGmwView(root, model);
	syncGmwActions(root, model);
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
	["vcl/Action", ("compare-gmw-with-bro"), {
		content: "<i class='fa fa-exchange'></i> Vergelijken met de BRO...",
		enabled: false,
		vars: {
			document: { action: { batch: false } }
		},
		on() {
			return compareWithBro(this);
		}
	}],
	["vcl/ui/Popup", ("popup-gmw-actions"), {}, [
		["vcl/ui/Button", { action: "compare-gmw-with-bro" }]
	]],
	[("#document-actions"), [
		["vcl/ui/PopupButton", ("gmw-actions"), {
			content: "<i class='fa fa-th-large'></i> Acties <i class='fa fa-caret-down'></i>",
			popup: "popup-gmw-actions",
			origin: "bottom-right",
			onNodeCreated() {
				this.nextTick(() => this.setIndex(0));
			}
		}]
	]],
	["#preview", {
		css: {
			'': "overflow:hidden;background:#f7f8fa;color:#26323c;",
			"& .gmw-preview-header": "box-sizing:border-box;height:44px;padding:12px 18px;background:white;border-bottom:1px solid #dfe3e7;font-size:14px;",
			"& .bro-id-link": "color:#1d4ed8;text-decoration:none;cursor:pointer;",
			"& .bro-id-link:hover": "text-decoration:underline;",
			"& svg .bro-id-link text": "fill:#1d4ed8;text-decoration:none;",
			"& svg .bro-id-link:hover text": "text-decoration:underline;",
			"& .gmw-preview-header .bro-id-link": "color:inherit;",
			"& .gmw-preview-header [data-bro-ref]": "cursor:pointer;",
			"& .gmw-preview-header [data-bro-ref]:hover": "text-decoration:underline;",
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
			return openRegisteredGmw(this, evt) || BroPreview.open(this, evt) || this.inherited(arguments);
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
