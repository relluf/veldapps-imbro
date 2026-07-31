"use js, veldapps-xml/index, vcl/Factory!veldapps-imsikb/Tabs<Document.sikb>";

const Xml = require("veldapps-xml/index");
require("vcl/Factory!veldapps-imsikb/Tabs<Document.sikb>");
const localNameOf = Xml.localNameOf;
function objectValueOf(value) {
	if(value instanceof Array) {
		return value.map(objectValueOf).filter(Boolean)[0] || null;
	}
	return value && typeof value === "object" ? value : null;
}
function childByLocalName(obj, localName) {
	obj = objectValueOf(obj);
	if(!obj) return null;
	const key = Object.keys(obj).filter(key => localNameOf(key) === localName)[0];
	return key ? objectValueOf(obj[key]) || obj[key] : null;
}
function wrapperByLocalName(obj, localName, seen) {
	obj = objectValueOf(obj);
	seen = seen || [];
	if(!obj || seen.indexOf(obj) !== -1) return null;
	seen.push(obj);

	const key = Object.keys(obj).filter(key => localNameOf(key) === localName)[0];
	if(key) {
		const wrapper = {};
		wrapper[key] = obj[key];
		return wrapper;
	}

	const keys = Object.keys(obj);
	for(let i = 0; i < keys.length; ++i) {
		const found = wrapperByLocalName(obj[keys[i]], localName, seen);
		if(found) return found;
	}
	return null;
}
function contentKeysOf(obj) {
	return obj && typeof obj === "object" ? Object.keys(obj).filter(key => key.indexOf("@") !== 0 && key !== "#text") : [];
}
function addViewCollection(view, name, value) {
	const items = Array.as(value).filter(item => item !== undefined && item !== null);
	const existing = view[name];

	if(!items.length) return view;
	if(existing === undefined) {
		view[name] = items;
		return view;
	}
	view[name] = Array.as(existing).concat(items.filter(item => Array.as(existing).indexOf(item) === -1));
	return view;
}
function addViewObject(view, name, value) {
	if(value instanceof Array) {
		return addViewCollection(view, name, value);
	}
	const obj = objectValueOf(value) || value;
	return addViewCollection(view, name, obj);
}
function mixView(view, source) {
	Object.keys(source || {}).forEach(key => addViewCollection(view, key, source[key]));
	return view;
}
function mixRootObjects(view, obj, prefix, maxDepth, depth, seen) {
	obj = objectValueOf(obj);
	depth = depth || 0;
	seen = seen || [];
	if(!obj || seen.indexOf(obj) !== -1 || depth > maxDepth) return view;
	seen.push(obj);
	contentKeysOf(obj).forEach(key => {
		const value = obj[key];
		const objectValue = objectValueOf(value);
		const name = prefix ? js.sf("%s %s", prefix, localNameOf(key)) : localNameOf(key);

		if(value instanceof Array || depth === 0) {
			addViewObject(view, name, value);
		}
		if(objectValue) {
			mixRootObjects(view, objectValue, prefix, maxDepth, depth + 1, seen);
		}
	});
	return view;
}
function collectByLocalName(obj, localName, collected, seen) {
	collected = collected || [];
	seen = seen || [];
	if(obj instanceof Array) {
		obj.forEach(item => collectByLocalName(item, localName, collected, seen));
		return collected;
	}
	obj = objectValueOf(obj);
	if(!obj || seen.indexOf(obj) !== -1) return collected;
	seen.push(obj);
	contentKeysOf(obj).forEach(key => {
		const value = obj[key];
		if(localNameOf(key) === localName) {
			Array.as(value).forEach(item => collected.push(item));
		}
		collectByLocalName(value, localName, collected, seen);
	});
	return collected;
}
function mixFeatureMembers(view, sikb) {
	collectByLocalName(sikb, "featureMember").forEach(member => {
		member = objectValueOf(member);
		if(!member) return;
		contentKeysOf(member)
			.filter(key => localNameOf(key) !== "boundedBy")
			.forEach(key => addViewObject(view, localNameOf(key), member[key]));
	});
	return view;
}
function firstByLocalName(obj, localName, seen) {
	obj = objectValueOf(obj);
	seen = seen || [];
	if(!obj || seen.indexOf(obj) !== -1) return null;
	seen.push(obj);
	if(childByLocalName(obj, localName)) {
		return childByLocalName(obj, localName);
	}
	const keys = Object.keys(obj);
	for(let i = 0; i < keys.length; ++i) {
		const found = firstByLocalName(obj[keys[i]], localName, seen);
		if(found) return found;
	}
	return null;
}
function registrationRequestOf(xml) {
	return childByLocalName(xml, "registrationRequest") || firstByLocalName(xml, "registrationRequest") || xml;
}
function broSadSourceDocumentOf(xml) {
	return childByLocalName(registrationRequestOf(xml), "sourceDocument");
}
function broSadReportOf(xml) {
	const sourceDocument = broSadSourceDocumentOf(xml);
	return childByLocalName(sourceDocument, "SAD_CompleteReport") ||
		childByLocalName(sourceDocument, "SAD_CompleteReport_V1") ||
		sourceDocument;
}
function embeddedSikbRootOf(xml) {
	const report = broSadReportOf(xml);
	const featureCollection = childByLocalName(report, "featureCollection");
	return childByLocalName(featureCollection, "FeatureCollectionIMSIKB0101") ||
		firstByLocalName(xml, "FeatureCollectionIMSIKB0101");
}
function embeddedSikbWrapperOf(xml) {
	const report = broSadReportOf(xml);
	const featureCollection = childByLocalName(report, "featureCollection");
	return wrapperByLocalName(featureCollection, "FeatureCollectionIMSIKB0101") ||
		wrapperByLocalName(xml, "FeatureCollectionIMSIKB0101");
}
function sikbVersionOf(sikb) {
	const value = js.get("imsikb0101:metaData.imsikb0101:version", sikb) ||
		js.get("imsikb0101:metaData.imsikb0101:version.@_xlink:href", sikb) ||
		js.get("metaData.version", sikb) ||
		js.get("@_xsi:schemaLocation", sikb);
	const match = String(value || "").match(/(?:^|[\/_\s-]v?)(\d+(?:\.\d+){0,2})(?=\.xsd|\/|\s|$)/i);
	return match ? match[1] : value;
}
function embeddedSikbViewOf(sikb, sikbWrapper) {
	try {
		const view = Xml.gml(sikbWrapper || sikb);
		if(view && typeof view === "object") {
			return view;
		}
	} catch(e) {
		console.warn("[Document.brosad] Xml.gml failed", e);
	}
	return sikb || {};
}
function broSadViewOf(envelope, sikb, sikbWrapper) {
	const sikbView = embeddedSikbViewOf(sikb, sikbWrapper);
	const view = {};

	mixView(view, sikbView);
	mixFeatureMembers(view, sikb);
	mixRootObjects(view, envelope, "BRO-SAD", 1);
	mixRootObjects(view, sikb, "SIKB", 0);
	view["BRO-SAD"] = Array.as(envelope);
	view["BRO-SAD brondocument"] = Array.as(broSadReportOf(envelope));
	view["SIKB FeatureCollection"] = Array.as(sikb);
	return view;
}
function normalizeBroSadResult(action) {
	const root = action.up("Tabs<Document>:root") || action.up(":root") || action;
	const result = root.vars(["parser-document-result"]) || {};
	const envelope = result.broSadEnvelope || result.broSad || result.xml || result.root;
	const sikbWrapper = embeddedSikbWrapperOf(envelope);
	const sikb = result.sikbXml ||
		(sikbWrapper && childByLocalName(sikbWrapper, "FeatureCollectionIMSIKB0101")) ||
		embeddedSikbRootOf(envelope);

	if(!envelope || !sikb) {
		console.warn("[Document.brosad] embedded SIKB FeatureCollectionIMSIKB0101 not found", result);
		return result;
	}

	const view = broSadViewOf(envelope, sikb, sikbWrapper);
	const sikbVersion = sikbVersionOf(sikb);
	const normalized = Object.assign({}, result, {
		broSad: envelope,
		broSadEnvelope: envelope,
		broSadType: result.type,
		broSadVersion: result.version,
		capabilities: Object.assign({}, result.capabilities || {}, { broSad: true, sikb: true, xml: true, view: true }),
		root: view,
		sikbRoot: sikb,
		sikbType: sikbVersion ? js.sf("sikb/%s", sikbVersion) : undefined,
		sikbVersion: sikbVersion,
		sikbXml: sikb,
		view: view,
		xml: envelope
	});
	const alphaview = root.qs("#alphaview");

	root.vars("parser-document-result", normalized);
	root.vars("parser-document-root", view);
	root.vars("parser-document-xml", envelope);
	if(alphaview) {
		alphaview.vars("sel", [view]);
		const reflect = alphaview.qs("#reflect");
		reflect && reflect.execute([view]);
	}
	return normalized;
}
function setVisible(root, selector, visible) {
	const components = root.qsa(selector);
	components.forEach(component => component.setVisible(visible));
	return components;
}
function setSikbBroSadActionsVisible(root) {
	setVisible(root, "#tab-preview", true);
	setVisible(root, "#toetsen-sikb", true);
	setVisible(root, "#show-sikb-document-on-map", true);
	setVisible(root, "#show-sikb-project-on-map", true);
	setVisible(root, "#show-sikb-borehole-on-map", true);
	setVisible(root, "#show-sikb-soillocation-on-map", true);
	setVisible(root, "#show-sikb-trench-on-map", true);
	setVisible(root, "#show-sikb-sample-on-map", true);
	setVisible(root, "#show-sikb-testing-on-map", true);
	setVisible(root, "#show-sikb-location-on-map", false);
	setVisible(root, "#show-sikb-onderzoek-on-map", false);
	setVisible(root, "#show-sikb-meetpunt-on-map", false);
}
function isPopupComponent(component) {
	return !!(component && component._popup !== undefined);
}
function updateBroSadDocumentUi(root) {
	["#document-actions", "#tabs-sections"].forEach(selector => {
		const component = root.down(selector);
		if(!component) return;
		component.render instanceof Function && component.render();
		component.update instanceof Function && component.update();
	});
}
function activateBroSadFacet(action) {
	const root = action.up("Tabs<Document>:root") || action.up(":root") || action;
	normalizeBroSadResult(action);
	const activateSikbUi = root.vars(["document.sikb.activateUi"]);
	const validateBro = root.qs("#validate-document");
	const validateSikb = root.down("#validate-sikb-xml");
	const hasSikbFacet = !!(root.down("#tab-preview") && root.down("#show-sikb-document-on-map"));
	if(activateSikbUi instanceof Function) {
		activateSikbUi(action, {
			facet: false,
			validateDocumentVisible: true,
			validateSikbVisible: false
		});
	}
	root.vars("document.facet", "brosad");
	root.vars("document.getSpecificFacet", null);
	root.vars("document.applySpecificFacet", null);

	if(validateBro) {
		validateBro.setEnabled(true);
		validateBro.setVisible(true);
	}
	if(validateSikb) {
		validateSikb.setVisible(false);
	}
	const showOnMap = root.qsa("#show-on-map");
	const sikbPopups = showOnMap.filter(isPopupComponent);
	showOnMap.forEach(component => component.setVisible(sikbPopups.length ? sikbPopups.indexOf(component) !== -1 : true));
	setSikbBroSadActionsVisible(root);
	updateBroSadDocumentUi(root);
	if(typeof console !== "undefined" && console.info) {
		console.info("[Document.brosad] activated", {
			hasSikbFacet: hasSikbFacet,
			hasPreviewTab: !!root.down("#tab-preview"),
			hasSikbValidate: !!validateSikb,
			showOnMap: showOnMap.length,
			sikbPopupButtons: sikbPopups.length
		});
	}
}
function validateBroSadXml(action, evt) {
	const root = action.up("Tabs<Document>:root") || action.up();
	const node = action.up("vcl/ui/Node-closeable");
	const ace = action.ud("#ace");
	const console = action.ud("#console");
	const text = ace.getValue();
	const type = root.vars(["parser-document-type"]) || Parser.determineType(text) || "";

	if(!type.startsWith("bro-")) {
		action.app().print(action, {name: "type unknown (" + type + ")", text: text, ace: ace });
		return;
	}

	const endpoint = "/bro-validatie";
	const token = "3dd5f1d4b4c0|50556649|1213:591c601d04bc0751e2585de53e8a76ee8084f9dd1052bd7cd1c46b813d8e071a";
	const headers = {
		"Content-Type": "application/xml",
		"Authorization": "Basic " + btoa(token)
	};
	const loading = action.ud("#loading");
	const base = action.revertPropertyValue("content").match(/.*>/)[0];

	loading.show();
	setBroValidationStatus(root);
	setBroValidationStatus(node);

	return console.print("Validatieresultaat",
		new Promise((resolve) => resolve(
			fetch(endpoint, {
				method: "POST",
				cache: "no-cache",
				headers: headers,
				body: text
			})
			.then(res => !res.ok ? res.text() : res.json().then(res => {
				setBroValidationStatus(root, res.status);
				setBroValidationStatus(node, res.status);

				action.set("content", js.sf("%s %s", base, res.status));
				if(res.errors && res.errors.length) {
					res.errors = res.errors.filter(Array.fn.nonNull);
				}
				openBroValidationResult(action, res);
				if(res.errors && res.errors.length) {
					throw res;
				}

				return res;
			}))
			.finally(() => loading.setTimeout("hide", 250)))
		)
	);
}

[["veldapps-imsikb/Tabs<Document.sikb>", "veldapps-imbro/Tabs<Document.bro>"],{
	vars: {
		document: {
			"activate-facet": activateBroSadFacet,
			facet: "brosad"
		}
	}
}, [
	[("#activate-document-facet"), {
		on() {
			activateBroSadFacet(this);
			return this.inherited(arguments);
		}
	}],
	[("#validate-document"), {
		on(evt) {
			return validateBroSadXml(this, evt);
		}
	}]
]];
