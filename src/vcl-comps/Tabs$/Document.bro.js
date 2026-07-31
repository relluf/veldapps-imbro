"use js, ol, proj4, veldapps-ol/proj/RD, bxv/Layers, bxv/Parser, bxv/Collectors, veldapps-xml/index";

const ol = require("ol");
const proj4 = require("proj4");
const Layers = require("bxv/Layers");
const Parser = require("bxv/Parser");
const Collectors = require("bxv/Collectors");
const Xml = require("veldapps-xml/index");
require("veldapps-ol/proj/RD");
const collectObjectsForKeys = Xml.collectObjectsForKeys;
const collectValuesForKeys = Xml.collectValuesForKeys;
const coordinatePairsFromText = Xml.coordinatePairsFromText;
const srsNameOf = Xml.srsNameOf;
const textOf = Xml.textOf;

const locale = window.locale.prefixed("Document");
const TARGET_PROJECTION = "EPSG:28992";
const BRO_FACETS = ["bro-gld"];
const BRO_XML_NAMESPACES = Object.assign({}, Parser.XML_NAMESPACES, {
	"isbhr": ["http://www.broservices.nl/xsd/isbhr/1.1"],
	"isbhrgt": (Parser.XML_NAMESPACES.isbhrgt || []).concat([
		"http://www.broservices.nl/xsd/isbhr-gt/1.0",
		"http://www.broservices.nl/xsd/isbhr-gt/2.0",
		"http://www.broservices.nl/xsd/isbhr-gt/2.1"
	]),
	"dsbhrgt": (Parser.XML_NAMESPACES.dsbhrgt || []).concat([
		"http://www.broservices.nl/xsd/dsbhr-gt/2.0",
		"http://www.broservices.nl/xsd/dsbhr-gt/2.1"
	]),
	"bhrcom": ["http://www.broservices.nl/xsd/bhrcommon/1.1"],
	"bhrgtcom": (Parser.XML_NAMESPACES.bhrgtcom || []).concat([
		"http://www.broservices.nl/xsd/bhrgtcommon/1.0",
		"http://www.broservices.nl/xsd/bhrgtcommon/2.0",
		"http://www.broservices.nl/xsd/bhrgtcommon/2.1"
	]),
	"issad": (Parser.XML_NAMESPACES.issad || []).concat([
		"http://www.broservices.nl/xsd/issad/1.0",
		"http://www.broservices.nl/xsd/issad/1.1"
	]),
	"dssad": (Parser.XML_NAMESPACES.dssad || []).concat([
		"http://www.broservices.nl/xsd/dssad/1.0",
		"http://www.broservices.nl/xsd/dssad-internal/1.1"
	]),
	"sadcom": [
		"http://www.broservices.nl/xsd/sadcommon/1.0",
		"http://www.broservices.nl/xsd/sadcommon/1.1",
		"http://www.broservices.nl/xsd/sadcommon-internal/1.1"
	]
});
function broFacetUri(facet, root) {
	const registered = root && root.vars && root.vars(["document.facetUris." + facet]);
	return registered || (BRO_FACETS.indexOf(facet) !== -1 ? "Tabs<Document." + facet + ">" : null);
}
function getSpecificBroFacetUri(result, opts) {
	const type = result && result.type || "";
	if(type === "bro-gld" || type.startsWith("bro-gld/")) {
		return broFacetUri("bro-gld", opts && opts.root);
	}
	return null;
}
function applySpecificBroFacet(root, result, applyDocumentFacet) {
	const uri = getSpecificBroFacetUri(result, { root: root });
	if(!uri || !(applyDocumentFacet instanceof Function)) {
		return null;
	}
	result.facetUri = uri;
	root.vars("parser-document-result", result);
	return applyDocumentFacet(root, uri)
		.catch(e => window.console.error("Error applying BRO-specific document facet", uri, e));
}
function closeRing(coordinates) {
	const first = coordinates[0];
	const last = coordinates[coordinates.length - 1];
	if(first && last && (first[0] !== last[0] || first[1] !== last[1])) {
		coordinates = coordinates.concat([[first[0], first[1]]]);
	}
	return coordinates;
}
function isWgs84Coordinate(coordinate) {
	const x = coordinate[0], y = coordinate[1];
	return x >= 3 && x <= 8 && y >= 50 && y <= 54;
}
function isWgs84AxisFlippedCoordinate(coordinate) {
	const x = coordinate[0], y = coordinate[1];
	return x >= 50 && x <= 54 && y >= 3 && y <= 8;
}
function normalizeWgs84Coordinate(coordinate) {
	return isWgs84AxisFlippedCoordinate(coordinate) ? [coordinate[1], coordinate[0]] : coordinate;
}
function transformCoordinateToRD(coordinate, srsName) {
	if(!srsName || srsName.includes("28992")) {
		return isWgs84Coordinate(coordinate) || isWgs84AxisFlippedCoordinate(coordinate) ?
			proj4("EPSG:4326", TARGET_PROJECTION, normalizeWgs84Coordinate(coordinate)) :
			coordinate;
	}
	return proj4("EPSG:4326", TARGET_PROJECTION, normalizeWgs84Coordinate(coordinate));
}
function transformCoordinatesToRD(coordinates, srsName) {
	return coordinates.map(coordinate => transformCoordinateToRD(coordinate, srsName));
}
function geometryOf(obj) {
	return js.get("immetingen:geometry", obj) ||
		js.get("imsikb0101:geometry", obj) ||
		js.get("geometry", obj) ||
		js.get("bhrgtcom:location", obj) ||
		js.get("bhrcom:location", obj) ||
		js.get("gmwcom:location", obj) ||
		js.get("brocom:deliveredLocation", obj) ||
		js.get("brocom:standardizedLocation", obj) ||
		js.get("deliveredLocation.location", obj) ||
		js.get("standardizedLocation", obj) ||
		js.get("location", obj) ||
		(js.get("gml:Point", obj) || js.get("Point", obj) ||
			js.get("gml:Polygon", obj) || js.get("Polygon", obj) ||
			js.get("gml:MultiSurface", obj) || js.get("MultiSurface", obj) ||
			obj["gml:pos"] || obj.pos || obj["gml:posList"] || obj.posList ? obj : null);
}
function pointGeometryFrom(geometry) {
	if(!geometry) return null;
	const point = js.get("gml:Point", geometry) || js.get("Point", geometry) || geometry;
	const srsName = srsNameOf(point) || srsNameOf(geometry);
	const values = [
		js.get("gml:pos", point),
		js.get("pos", point),
		js.get("gml:coordinates", point),
		js.get("coordinates", point),
		typeof geometry === "string" ? geometry : ""
	].concat(collectValuesForKeys(point, ["gml:pos", "pos", "gml:coordinates", "coordinates"]));
	const coordinates = values.map(coordinatePairsFromText).filter(value => value.length)[0];
	return coordinates ? new ol.geom.Point(transformCoordinateToRD(coordinates[0], srsName)) : null;
}
function polygonCandidatesFrom(geometry) {
	const candidates = [];
	Array.as(js.get("gml:Polygon", geometry)).forEach(value => candidates.push(value));
	Array.as(js.get("Polygon", geometry)).forEach(value => candidates.push(value));
	Array.as(js.get("gml:MultiSurface.gml:surfaceMember", geometry)).forEach(member => {
		Array.as(js.get("gml:Polygon", member) || member).forEach(value => candidates.push(value));
	});
	Array.as(js.get("MultiSurface.surfaceMember", geometry)).forEach(member => {
		Array.as(js.get("Polygon", member) || member).forEach(value => candidates.push(value));
	});
	return candidates;
}
function polygonGeometryFrom(geometry) {
	const polygons = polygonCandidatesFrom(geometry).map(function(polygon) {
		const srsName = srsNameOf(polygon) || srsNameOf(geometry);
		let rings = collectValuesForKeys(polygon, ["gml:posList", "posList", "gml:coordinates", "coordinates", "gml:exterior", "exterior"])
			.map(coordinatePairsFromText)
			.filter(value => value.length);
		if(!rings.length) {
			const positions = collectValuesForKeys(polygon, ["gml:pos", "pos"])
				.map(coordinatePairsFromText)
				.filter(value => value.length === 1)
				.map(value => value[0]);
			if(positions.length) {
				rings = [positions];
			}
		}
		return rings.length ? [closeRing(transformCoordinatesToRD(rings[0], srsName))] : null;
	}).filter(Boolean);

	if(polygons.length > 1) {
		return new ol.geom.MultiPolygon(polygons);
	}
	return polygons.length ? new ol.geom.Polygon(polygons[0]) : null;
}
function openLayersGeometryFrom(obj) {
	const geometry = geometryOf(obj);
	if(!geometry) return null;
	const surface = js.get("gml:MultiSurface", geometry) || js.get("MultiSurface", geometry) ||
		js.get("gml:Polygon", geometry) || js.get("Polygon", geometry);
	return surface ? polygonGeometryFrom(geometry) : pointGeometryFrom(geometry);
}
function featureNameOf(obj, fallback) {
	return textOf(js.get("brocom:requestReference", obj)) ||
		textOf(js.get("sadcom:requestReference", obj)) ||
		textOf(js.get("isbhrgt:objectIdAccountableParty", obj)) ||
		textOf(js.get("objectIdAccountableParty", obj)) ||
		textOf(js.get("objectIdAccountablePartyId", obj)) ||
		textOf(js.get("immetingen:name", obj)) ||
		textOf(js.get("imsikb0101:name", obj)) ||
		textOf(js.get("name", obj)) ||
		textOf(js.get("naam", obj)) ||
		textOf(js.get("code", obj)) ||
		obj["@_gml:id"] ||
		obj.gml_id ||
		fallback;
}
function createFeature(obj, type, index, geometry) {
	if(!geometry) return null;
	const name = featureNameOf(obj, js.sf("%s %d", type, index + 1));
	const feature = new ol.Feature({ geometry: geometry });
	feature.set("name", name);
	feature.set("bro:type", type);
	feature.set("bro:object", obj);
	feature.set("hint", js.sf("<b>%H</b><br><span class='muted'>%H</span>", name, type));
	return feature;
}
function createBroFeature(obj, type, index) {
	return createFeature(obj, type, index, openLayersGeometryFrom(obj));
}
function featureKey(feature) {
	const geometry = feature.getGeometry();
	return [
		feature.get("bro:type"),
		geometry.getType(),
		geometry.getExtent().join(",")
	].join("|");
}
function uniqueFeatures(features) {
	const keys = {};
	return features.filter(feature => {
		const key = featureKey(feature);
		if(keys[key]) return false;
		keys[key] = true;
		return true;
	});
}

const BroLocationKeys = [
	"brocom:deliveredLocation",
	"brocom:standardizedLocation",
	"isbhrgt:deliveredLocation",
	"dsbhrgt:deliveredLocation",
	"dsbhr:deliveredLocation",
	"isgmw:deliveredLocation",
	"dsgmw:deliveredLocation",
	"isgld:deliveredLocation",
	"dsgld:deliveredLocation",
	"msg:deliveredLocation",
	"bhrgtcom:location",
	"bhrcom:location",
	"gmwcom:location",
	"deliveredLocation",
	"standardizedLocation"
];
function collectBroLocationFeatures(xml) {
	return uniqueFeatures(collectObjectsForKeys(xml, BroLocationKeys)
		.map((obj, index) => createBroFeature(obj, "Locatie", index))
		.filter(Boolean));
}
function collectSadProjectFeatures(xml) {
	return collectObjectsForKeys(xml, ["imsikb0101:Project", "Project"])
		.map((obj, index) => createBroFeature(obj, "Project", index))
		.filter(Boolean);
}
function collectSadBoreholeFeatures(xml) {
	return collectObjectsForKeys(xml, ["immetingen:Borehole", "imsikb0101:Borehole", "Borehole"])
		.map((obj, index) => createBroFeature(obj, "Borehole", index))
		.filter(Boolean);
}
function removeLayerFromCollection(collection, layer) {
	if(!collection || !layer) return false;
	const items = collection.getArray instanceof Function ? collection.getArray().slice() : [];
	let removed = false;
	items.forEach(function(item) {
		if(item === layer) {
			collection.remove(layer);
			removed = true;
			return;
		}
		const children = item && item.getLayers instanceof Function ? item.getLayers() : null;
		if(children && removeLayerFromCollection(children, layer)) {
			removed = true;
		}
	});
	return removed;
}
function removeLayerFromMap(map, layer) {
	removeLayerFromCollection(map && map.getLayers instanceof Function ? map.getLayers() : null, layer);
}

const BroStyles = {
	Borehole: new ol.style.Style({
		image: new ol.style.Circle({
			radius: 6,
			fill: new ol.style.Fill({ color: "rgba(49, 132, 194, 0.85)" }),
			stroke: new ol.style.Stroke({ color: "white", width: 2 })
		})
	}),
	Location: new ol.style.Style({
		image: new ol.style.Circle({
			radius: 7,
			fill: new ol.style.Fill({ color: "rgba(30, 155, 117, 0.9)" }),
			stroke: new ol.style.Stroke({ color: "white", width: 2 })
		})
	}),
	Project: new ol.style.Style({
		fill: new ol.style.Fill({ color: "rgba(30, 155, 117, 0.18)" }),
		stroke: new ol.style.Stroke({ color: "#1e9b75", width: 2 }),
		image: new ol.style.Circle({
			radius: 7,
			fill: new ol.style.Fill({ color: "#1e9b75" }),
			stroke: new ol.style.Stroke({ color: "white", width: 2 })
		})
	})
};
function createVectorLayer(name, features, style) {
	const source = new ol.source.Vector({ features: features });
	const layer = ol.create(["ol:layer.Vector", {
		name: name,
		source: source,
		style: style
	}]);
	return { name: name, features: features, source: source, layer: layer };
}
function documentIdentityFor(action) {
	const doc = action.vars(["instance"]);
	const resource = action.vars(["resource"]);
	return js.get("uri", resource) ||
		js.get("resource_.uri", doc) ||
		js.get("_values.resource_.uri", doc) ||
		js.get("id", doc) ||
		js.get("_values.id", doc) ||
		js.get("ID", doc) ||
		js.get("uuid", doc) ||
		js.get("naam", doc) ||
		js.get("_values.naam", doc) ||
		(doc && doc.getKey instanceof Function && doc.getKey()) ||
		(action.up(":root").hashCode && action.up(":root").hashCode()) ||
		"current";
}
function layerKeyFor(action) {
	return "extra-layers/document-bro/" + documentIdentityFor(action);
}
function documentNameFor(action) {
	const doc = action.vars(["instance"]);
	const naam = js.get("_values.naam", doc);
	return naam || (doc && js.nameOf(doc)) || "BRO document";
}
function validationResultNameFor(action) {
	return "validatie-" + documentNameFor(action).replace(/\.[^.]+$/, "") + ".json";
}
function documentUriFor(action) {
	const doc = action.vars(["instance"]);
	const resource = action.vars(["resource"]);
	return js.get("uri", resource) ||
		js.get("resource_.uri", doc) ||
		js.get("_values.resource_.uri", doc) ||
		js.get("naam", doc) ||
		js.get("_values.naam", doc) ||
		documentNameFor(action);
}
function documentMapInfoFor(action) {
	return {
		id: documentIdentityFor(action),
		uri: documentUriFor(action),
		name: documentNameFor(action),
		root: action.up("Tabs<Document>:root")
	};
}
function showBroOnMap(action) {
	const result = action.vars(["parser-document-result"]);
	const menubar = action.ud("#menubar");
	const OL = menubar.udr("OpenLayers<Onderzoek>:root");
	if(!OL) {
		action.app().toast({ content: "Open eerst de Kaart-sectie.", classes: "fade glassy" });
		return;
	}

	const added = Layers.addToMap(OL, documentMapInfoFor(action), result, { fit: false });
	if(!added) {
		action.app().toast({ content: "Geen BRO geometrieën gevonden.", classes: "fade glassy" });
		return;
	}
	action.app().toast({ content: js.sf("%H geladen", documentUriFor(action)), classes: "fade glassy" });
}
function firstPayloadObject(item) {
	if(!item || typeof item !== "object") return item;
	const key = Object.keys(item).filter(key => key.indexOf("@") !== 0)[0];
	return key ? item[key] : item;
}
function arrayOf(value) {
	return value === undefined || value === null ? [] : Array.as(value);
}
function dispatchResponseView(xml) {
	const key = [
		"dispatchCharacteristicsResponse",
		"dispatchDataResponse",
		"dssad:dispatchDataResponse",
		"dsbhrgt:dispatchDataResponse"
	]
		.filter(key => xml && xml[key])[0];
	if(!key) return null;
	const response = xml[key];
	const docs = arrayOf(
		response.dispatchDocument ||
		response["dssad:dispatchDocument"] ||
		response["dsbhrgt:dispatchDocument"]
	);
	return {
		Response: [response],
		Documents: docs.map(firstPayloadObject)
	};
}
function broGmwView(xml) {
	const sourceDocument = Collectors["bro->sourceDocument"](xml, ["isgmw", "dsgmw"]);
	const report = Object.keys(sourceDocument)[0];
	const doc = sourceDocument[report];

	return {
		[report.split(":").pop()]: [doc],
		"Tubes": arrayOf(js.get("isgmw:monitoringTube", doc) || js.get("dsgmw:monitoringTube", doc) || js.get("monitoringTube", doc))
	};
}
function broBhrGtView(xml) {
	let sourceDocument = Collectors["bro->sourceDocument"](xml, ["isbhrgt", "dsbhrgt"]);
	const requestKey = Object.keys(xml).filter(k => k.endsWith("Request"))[0];
	const request = xml[requestKey];
	const responseKey = Object.keys(xml).filter(k => k.endsWith("Response"))[0];
	const response = xml[responseKey];
	const dispatchDocument = response && (js.get("dsbhrgt:dispatchDocument", response) || js.get("dispatchDocument", response));
	const firstDispatchDocument = arrayOf(dispatchDocument)[0];
	const dispatchDoc = firstDispatchDocument && firstPayloadObject(firstDispatchDocument);

	sourceDocument = js.get("isbhrgt:sourceDocument", request) || js.get("sourceDocument", request) || sourceDocument;

	const report = firstDispatchDocument ? Object.keys(firstDispatchDocument)[0] : Object.keys(sourceDocument || {})[0];
	const doc = dispatchDoc || report && sourceDocument[report];
	if(!report || !doc) {
		return xml;
	}
	const boring = doc.boring || doc["isbhrgt:boring"];
	const description = doc["isbhrgt:boreholeSampleDescription"] || doc.boreholeSampleDescription;
	const analysis = doc["isbhrgt:boreholeSampleAnalysis"] || doc.boreholeSampleAnalysis;
	const result = {
		[report.split(":").pop()]: [doc],
		"Analysis": arrayOf(analysis),
		"Investigated Intervals": arrayOf(js.get("bhrgtcom:investigatedInterval", analysis)),
		"Boring": arrayOf(boring),
		"Description": arrayOf(description),
		"Layers": arrayOf(js.get("bhrgtcom:descriptiveBoreholeLog.bhrgtcom:layer", description)),
		"Bored Intervals": arrayOf(js.get("bhrgtcom:boredInterval", boring)),
		"Completed Intervals": arrayOf(js.get("bhrgtcom:completedInterval", boring)),
		"Sampled Intervals": arrayOf(js.get("bhrgtcom:sampledInterval", boring)),
		"Excavated Layers": arrayOf(js.get("bhrgtcom:excavatedLayers", boring)),
		"Boring Velocity": arrayOf(js.get("bhrgtcom:boringVelocity", boring)),
		"Contaminated Intervals": arrayOf(js.get("bhrgtcom:contaminatedInterval", boring))
	};

	if(requestKey) result[requestKey] = arrayOf(request);
	if(responseKey) result[responseKey] = arrayOf(response);

	return result;
}
function broViewFor(result) {
	const type = result && result.type || "";
	const xml = result && (result.xml || result.root);
	if(!xml || !type.startsWith("bro-")) {
		return null;
	}
	Xml.applyParseOptions(xml, { namespaces: BRO_XML_NAMESPACES });
	const dispatch = dispatchResponseView(xml);
	if(dispatch) {
		return dispatch;
	}
	if(type.startsWith("bro-gmw/")) {
		return broGmwView(xml);
	}
	if(type.startsWith("bro-bhr-gt/")) {
		return broBhrGtView(xml);
	}
	return null;
}
function applyBroView(action) {
	const root = action.up("Tabs<Document>:root") || action.up(":root");
	const result = root && root.vars(["parser-document-result"]);
	const view = broViewFor(result);
	if(!view) return;

	const alphaview = root.qs("#alphaview");
	alphaview.vars("sel", [view]);
	const reflect = alphaview.qs("#reflect");
	reflect && reflect.execute([view]);
	root.vars("parser-document-root", view);
	result.view = view;
	root.vars("parser-document-result", result);
}
function selectBroValidationErrors(form, result) {
	const errors = result && result.errors;
	if(!(errors instanceof Array)) return;

	const select = () => {
		const alphaview = form.qs("#alphaview");
		const reflect = alphaview && alphaview.qs("#reflect");
		const done = reflect && reflect.execute([result]);
		Promise.resolve(done).then(() => {
			const selectErrors = attempt => {
				const list = alphaview && alphaview.qs("#list");
				const source = list && list.getSource && list.getSource();
				const array = source && source.getArray && source.getArray();
				const index = array instanceof Array ? array.findIndex(item => item && item.key === "errors") : -1;
				if(list && index >= 0) {
					list.setSelection([index]);
					list.focus && list.focus();
				} else if(attempt < 10) {
					form.setTimeout("select-bro-validation-errors-list", () => selectErrors(attempt + 1), 50);
				}
			};
			selectErrors(0);
		});
	};

	const wait = (attempt) => {
		const ready = form.vars && form.vars(["parser-document-ready"]);
		if(ready && ready.then instanceof Function) {
			ready.then(select);
		} else if(attempt < 10) {
			form.setTimeout("select-bro-validation-errors", () => wait(attempt + 1), 50);
		} else {
			select();
		}
	};
	wait(0);
}
function setBroValidationStatus(component, status) {
	if(!component) return;
	component.syncClass("status-VALIDE status-WARNING status-NIET_VALIDE", [
		status === "VALIDE",
		status === "WARNING",
		status === "NIET_VALIDE"
	]);
}
function broValidationResultNodeFor(parent, id) {
	return parent && parent.getControls && parent.getControls()
		.filter(control => control.vars && control.vars(["resource.uri"]) === id)
		.pop();
}
function openBroValidationResult(action, result) {
	const name = validationResultNameFor(action);
	const id = "pouchdb://veldoffice/" + name;
	const text = JSON.stringify(result, null, "\t");
	const parent = action.up("vcl/ui/Node-closeable");

	action.bubble("openform", {
		uri: "Tabs<Document>",
		title: name,
		parent: parent,
		params: {
			instance: {
				id: id,
				naam: name,
				omschrijving: "BRO validatieresultaat"
			},
			resource: {
				uri: id,
				text: text,
				generated: Date.now()
			}
		},
		callback_node(node) {
			setBroValidationStatus(node, result.status);
		},
		callback(form) {
			const node = form.up("vcl/ui/Node-closeable");
			setBroValidationStatus(form, result.status);
			setBroValidationStatus(node, result.status);
			selectBroValidationErrors(form, result);
		}
	});
	setBroValidationStatus(broValidationResultNodeFor(parent, id), result.status);
}
function validateBroXml(action, evt) {
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
function activateBroFacet(action) {
	const root = action.up("Tabs<Document>:root") || action.up(":root");
	const type = root && root.vars(["parser-document-type"]) || "";
	const validationResult = type.startsWith("bro/validatieresultaat/");
	root.vars("document.facet", "bro");
	root.vars("document.getSpecificFacet", getSpecificBroFacetUri);
	root.vars("document.applySpecificFacet", applySpecificBroFacet);
	applyBroView(action);
	const validate = root.qs("#validate-document");
	validate.setEnabled(!validationResult);
	validate.setVisible(!validationResult);
	action.ud("#show-on-map").setVisible(!validationResult);
}

[["./Tabs<Document.xml>"], {
	vars: {
		document: {
			"activate-facet": activateBroFacet,
			facet: "bro",
			getSpecificFacet: getSpecificBroFacetUri,
			applySpecificFacet: applySpecificBroFacet
		}
	}
}, [
	[("#activate-document-facet"), {
		on() {
			activateBroFacet(this);
			return this.inherited(arguments);
		}
	}],
	[("#validate-document"), {
		on(evt) {
			return validateBroXml(this, evt);
		}
	}],
	[("#document-actions"), [
		["vcl/ui/Button", { action: "show-on-map", classes: "map" }]
	]],
	
	["vcl/Action", ("show-on-map"), {
		content: js.sf("<i class='fa fa-map-marker'></i> %s", locale("-show-on-map")),
		visible: false,
		vars: {
			document: { action: { batch: true } }
		},
		on() {
			showBroOnMap(this);
		}
	}]
]];
