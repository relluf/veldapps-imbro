define(function() {
	"use strict";

	const NIL_VALUE = -999999;
	const RESULT_FIELDS = [
		{ key: "penetrationLength", label: "Penetratielengte", unit: "m" },
		{ key: "depth", label: "Diepte", unit: "m" },
		{ key: "elapsedTime", label: "Verstreken tijd", unit: "s" },
		{ key: "coneResistance", label: "Conusweerstand", unit: "MPa" },
		{ key: "correctedConeResistance", label: "Gecorrigeerde conusweerstand", unit: "MPa" },
		{ key: "netConeResistance", label: "Netto conusweerstand", unit: "MPa" },
		{ key: "magneticFieldStrengthX", label: "Magnetische veldsterkte X", unit: "nT" },
		{ key: "magneticFieldStrengthY", label: "Magnetische veldsterkte Y", unit: "nT" },
		{ key: "magneticFieldStrengthZ", label: "Magnetische veldsterkte Z", unit: "nT" },
		{ key: "magneticFieldStrengthTotal", label: "Totale magnetische veldsterkte", unit: "nT" },
		{ key: "electricalConductivity", label: "Elektrische geleidbaarheid", unit: "S/m" },
		{ key: "inclinationEW", label: "Helling oost-west", unit: "deg" },
		{ key: "inclinationNS", label: "Helling noord-zuid", unit: "deg" },
		{ key: "inclinationX", label: "Helling X", unit: "deg" },
		{ key: "inclinationY", label: "Helling Y", unit: "deg" },
		{ key: "inclinationResultant", label: "Resulterende helling", unit: "deg" },
		{ key: "magneticInclination", label: "Magnetische inclinatie", unit: "deg" },
		{ key: "magneticDeclination", label: "Magnetische declinatie", unit: "deg" },
		{ key: "localFriction", label: "Plaatselijke wrijving", unit: "MPa" },
		{ key: "poreRatio", label: "Waterspanningsgetal", unit: "1" },
		{ key: "temperature", label: "Temperatuur", unit: "degC" },
		{ key: "porePressureU1", label: "Waterspanning u1", unit: "MPa" },
		{ key: "porePressureU2", label: "Waterspanning u2", unit: "MPa" },
		{ key: "porePressureU3", label: "Waterspanning u3", unit: "MPa" },
		{ key: "frictionRatio", label: "Wrijvingsgetal", unit: "%" }
	];
	const SERIES = [
		{ key: "coneResistance", alternatives: ["correctedConeResistance"], label: "Conusweerstand qc", unit: "MPa", color: "#d84a3a" },
		{ key: "localFriction", label: "Plaatselijke wrijving fs", unit: "MPa", color: "#2878b8" },
		{ key: "frictionRatio", label: "Wrijvingsgetal Rf", unit: "%", color: "#2f9363" },
		{ key: "porePressureU2", alternatives: ["porePressureU1", "porePressureU3"], label: "Waterspanning", unit: "MPa", color: "#8a58a6" }
	];

	function localName(key) {
		return String(key || "").split(":").pop();
	}
	function asArray(value) {
		return value === undefined || value === null ? [] :
			(Array.isArray(value) ? value : [value]);
	}
	function isAttributeKey(key) {
		return String(key || "").indexOf("@") === 0;
	}
	function directValues(obj, name) {
		if(!obj || typeof obj !== "object") return [];
		if(Array.isArray(obj)) {
			return obj.reduce((values, item) => values.concat(directValues(item, name)), []);
		}
		return Object.keys(obj)
			.filter(key => !isAttributeKey(key) && localName(key) === name)
			.reduce((values, key) => values.concat(asArray(obj[key])), []);
	}
	function descendants(obj, name, values, seen) {
		values = values || [];
		seen = seen || [];
		if(Array.isArray(obj)) {
			obj.forEach(value => descendants(value, name, values, seen));
			return values;
		}
		if(!obj || typeof obj !== "object" || seen.indexOf(obj) !== -1) return values;
		seen.push(obj);
		Object.keys(obj).filter(key => !isAttributeKey(key)).forEach(key => {
			if(localName(key) === name) asArray(obj[key]).forEach(value => values.push(value));
			descendants(obj[key], name, values, seen);
		});
		return values;
	}
	function textOf(value, seen) {
		if(value === undefined || value === null) return "";
		if(Array.isArray(value)) return value.map(item => textOf(item, seen)).filter(Boolean).join(", ");
		if(typeof value !== "object") return String(value).trim();
		seen = seen || [];
		if(seen.indexOf(value) !== -1) return "";
		seen.push(value);
		const explicit = ["#text", "_", "$text", "value"]
			.filter(key => value[key] !== undefined && typeof value[key] !== "object")
			.map(key => String(value[key]).trim()).filter(Boolean)[0];
		if(explicit) return explicit;
		const keys = Object.keys(value).filter(key => !isAttributeKey(key) && key !== "#text");
		return keys.length === 1 ? textOf(value[keys[0]], seen) : "";
	}
	function childText(obj, names) {
		names = asArray(names);
		for(let index = 0; index < names.length; ++index) {
			const text = textOf(directValues(obj, names[index])[0]);
			if(text) return text;
		}
		return "";
	}
	function numberOf(value) {
		const number = parseFloat(textOf(value).replace(",", "."));
		return isFinite(number) && number !== NIL_VALUE ? number : null;
	}
	function childNumber(obj, names) {
		names = asArray(names);
		for(let index = 0; index < names.length; ++index) {
			const number = numberOf(directValues(obj, names[index])[0]);
			if(number !== null) return number;
		}
		return null;
	}
	function attribute(value, name) {
		if(!value || typeof value !== "object") return "";
		const key = Object.keys(value).filter(candidate =>
			isAttributeKey(candidate) && localName(candidate.replace(/^@_?/, "")) === name)[0];
		return key ? String(value[key]) : "";
	}
	function escapeHtml(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}
	function formatNumber(value, precision) {
		if(!isFinite(value)) return "";
		precision = precision === undefined ? 3 : precision;
		return String(Math.round(value * Math.pow(10, precision)) / Math.pow(10, precision)).replace(".", ",");
	}
	function titleCase(value) {
		value = String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
		return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
	}
	function documentRootKey(obj) {
		if(!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
		return Object.keys(obj).filter(key => {
			const name = localName(key);
			const value = obj[key];
			return !isAttributeKey(key) && value && typeof value === "object" &&
				(/(?:Request|Response)$/.test(name) || /^CPT(?:_|$)/.test(name));
		})[0] || null;
	}
	function xmlOf(result) {
		result = result || {};
		const candidates = [result.xml, result.root, result];
		for(let index = 0; index < candidates.length; ++index) {
			const candidate = candidates[index];
			if(!candidate || typeof candidate !== "object" || Array.isArray(candidate)) continue;
			const key = documentRootKey(candidate);
			if(key && Object.keys(candidate).filter(candidateKey => !isAttributeKey(candidateKey)).length > 1) {
				const wrapper = {};
				wrapper[key] = candidate[key];
				return wrapper;
			}
			return candidate;
		}
		return {};
	}
	function firstPayloadEntry(obj) {
		if(!obj || typeof obj !== "object") return null;
		const key = Object.keys(obj).filter(candidate =>
			!isAttributeKey(candidate) && obj[candidate] && typeof obj[candidate] === "object")[0];
		return key ? { key: key, value: asArray(obj[key])[0] } : null;
	}
	function findCptEntry(value, seen) {
		if(!value || typeof value !== "object" || seen.indexOf(value) !== -1) return null;
		seen.push(value);
		const key = Object.keys(value).filter(candidate => /^CPT(?:_|$)/.test(localName(candidate)))[0];
		if(key) return { key: key, value: asArray(value[key])[0] };
		const keys = Object.keys(value).filter(candidate => !isAttributeKey(candidate));
		for(let index = 0; index < keys.length; ++index) {
			const found = findCptEntry(value[keys[index]], seen);
			if(found) return found;
		}
		return null;
	}
	function documentInfo(xml) {
		const rootKey = documentRootKey(xml);
		const message = rootKey ? xml[rootKey] : xml;
		const dispatch = descendants(message, "dispatchDocument")[0];
		const source = descendants(message, "sourceDocument")[0];
		let entry = firstPayloadEntry(dispatch) || firstPayloadEntry(source);
		if(!entry && rootKey && /^CPT(?:_|$)/.test(localName(rootKey))) {
			entry = { key: rootKey, value: message };
		}
		entry = entry || findCptEntry(message, []);
		return {
			document: entry && entry.value || message,
			report: entry && localName(entry.key) || "CPT",
			message: rootKey && localName(rootKey) || "",
			messageKind: dispatch || /Response$/.test(localName(rootKey)) ? "uitgifte" : "inname"
		};
	}
	function separatorOf(dataArray, name, fallback) {
		const encoding = descendants(dataArray, "TextEncoding")[0] || {};
		return attribute(encoding, name) || fallback;
	}
	function parseValue(value, decimalSeparator) {
		value = String(value === undefined || value === null ? "" : value).trim();
		if(!value) return null;
		if(decimalSeparator && decimalSeparator !== ".") value = value.split(decimalSeparator).join(".");
		const number = Number(value);
		return isFinite(number) && number !== NIL_VALUE ? number : null;
	}
	function parseResultRows(dataArray) {
		if(!dataArray) return [];
		const blockSeparator = separatorOf(dataArray, "blockSeparator", ";");
		const tokenSeparator = separatorOf(dataArray, "tokenSeparator", ",");
		const decimalSeparator = separatorOf(dataArray, "decimalSeparator", ".");
		const values = textOf(descendants(dataArray, "values")[0]);
		if(!values) return [];
		return values.split(blockSeparator).map(record => record.trim()).filter(Boolean).map((record, index) => {
			const tokens = record.split(tokenSeparator);
			const row = { index: index + 1, source: dataArray };
			RESULT_FIELDS.forEach((field, fieldIndex) => {
				row[field.key] = parseValue(tokens[fieldIndex], decimalSeparator);
			});
			row.plotDepth = row.depth !== null ? row.depth : row.penetrationLength;
			return row;
		});
	}
	function parameterFlags(document) {
		const parameters = descendants(document, "parameters")[0] || {};
		const flags = {};
		Object.keys(parameters).filter(key => !isAttributeKey(key)).forEach(key => {
			flags[localName(key)] = /^(ja|yes|true|1)$/i.test(textOf(parameters[key]));
		});
		return flags;
	}
	function chooseSeries(rows) {
		return SERIES.map(series => {
			const candidates = [series.key].concat(series.alternatives || []);
			const key = candidates.filter(candidate => rows.some(row => row[candidate] !== null))[0];
			return key ? Object.assign({}, series, { key: key }) : null;
		}).filter(Boolean);
	}
	function dissipationModels(document) {
		return descendants(document, "dissipationTest").map((test, index) => {
			const dataArray = descendants(test, "disResult")[0];
			return {
				index: index + 1,
				depth: childNumber(test, "penetrationLength"),
				time: textOf(descendants(test, "timePosition")[0]),
				values: dataArray ? textOf(descendants(dataArray, "values")[0]) : "",
				source: test
			};
		});
	}
	function compactMeasurementRow(row) {
		return {
			Volgnummer: row.index,
			Penetratielengte: row.penetrationLength,
			Diepte: row.depth,
			Conusweerstand: row.coneResistance,
			"Gecorrigeerde conusweerstand": row.correctedConeResistance,
			"Plaatselijke wrijving": row.localFriction,
			Wrijvingsgetal: row.frictionRatio,
			"Waterspanning u2": row.porePressureU2,
			"Resulterende helling": row.inclinationResultant
		};
	}
	function model(result) {
		const xml = xmlOf(result);
		const info = documentInfo(xml);
		const document = info.document || {};
		const survey = descendants(document, "conePenetrometerSurvey")[0] || document;
		const dataArray = descendants(survey, "cptResult")[0];
		const rows = parseResultRows(dataArray);
		const trajectory = descendants(survey, "trajectory")[0] || {};
		const flags = parameterFlags(survey);
		const dissipations = dissipationModels(survey);
		const removedLayers = descendants(document, "removedLayer").map(layer => ({
			upper: childNumber(layer, "upperBoundary"),
			lower: childNumber(layer, "lowerBoundary"),
			description: childText(layer, "description"),
			source: layer
		})).filter(layer => layer.upper !== null && layer.lower !== null);
		const rowDepths = rows.map(row => row.plotDepth).filter(value => value !== null);
		const trajectoryFinalDepth = childNumber(trajectory, "finalDepth");
		const finalDepth = Math.max.apply(Math, rowDepths.concat(
			trajectoryFinalDepth === null ? [0] : [trajectoryFinalDepth]));
		const broId = textOf(descendants(document, "broId")[0]) ||
			textOf(descendants(document, "objectIdAccountableParty")[0]);
		const vertical = descendants(document, "deliveredVerticalPosition")[0] || {};
		const metadata = [
			{ label: "ID", value: broId },
			{ label: "Bericht", value: titleCase(info.messageKind) + (info.message ? " · " + info.message : "") },
			{ label: "Brondocument", value: info.report },
			{ label: "Kwaliteitsregime", value: textOf(descendants(xml, "qualityRegime")[0]) },
			{ label: "Onderzoeksdoel", value: childText(document, "surveyPurpose") },
			{ label: "Sondeernorm", value: childText(document, "cptStandard") },
			{ label: "Sondeermethode", value: childText(survey, "cptMethod") },
			{ label: "Kwaliteitsklasse", value: childText(survey, "qualityClass") },
			{ label: "Stopcriterium", value: childText(survey, "stopCriterion") },
			{ label: "Einddiepte", value: finalDepth ? formatNumber(finalDepth) + " m" : "" },
			{ label: "Voorgeboord", value: childNumber(trajectory, "predrilledDepth") !== null ?
				formatNumber(childNumber(trajectory, "predrilledDepth")) + " m" : "" },
			{ label: "Verticale positie", value: childNumber(vertical, "offset") !== null ?
				formatNumber(childNumber(vertical, "offset")) + " m " + childText(vertical, "verticalDatum") : "" },
			{ label: "Locatie", value: textOf(descendants(document, "pos")[0]) },
			{ label: "Meetpunten", value: rows.length ? String(rows.length) : "" },
			{ label: "Dissipatietesten", value: dissipations.length ? String(dissipations.length) : "" }
		].filter(item => item.value);
		const overview = {};
		metadata.forEach(item => overview[item.label] = item.value);
		return {
			xml: xml,
			document: document,
			survey: survey,
			dataArray: dataArray,
			info: info,
			broId: broId,
			rows: rows,
			series: chooseSeries(rows),
			parameters: flags,
			dissipations: dissipations,
			removedLayers: removedLayers,
			finalDepth: finalDepth,
			predrilledDepth: childNumber(trajectory, "predrilledDepth"),
			metadata: metadata,
			type: result && result.type || "bro-cpt",
			version: result && result.version || "",
			view: {
				Overzicht: [overview],
				Meetreeks: rows.map(compactMeasurementRow),
				Parameters: RESULT_FIELDS.filter(field => flags[field.key] !== undefined).map(field => ({
					Parameter: field.label,
					Eenheid: field.unit,
					Gemeten: flags[field.key] ? "ja" : "nee"
				})),
				Dissipatietesten: dissipations.map(test => ({
					Test: test.index,
					Penetratielengte: test.depth,
					Tijdstip: test.time,
					Waarden: test.values
				}))
			}
		};
	}
	function niceMaximum(value) {
		if(!(value > 0)) return 1;
		const exponent = Math.pow(10, Math.floor(Math.log(value) / Math.LN10));
		const fraction = value / exponent;
		return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
	}
	function niceDepthStep(depth) {
		const raw = Math.max(depth, 1) / 10;
		const exponent = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
		const fraction = raw / exponent;
		return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
	}
	function seriesRange(rows, key) {
		const values = rows.map(row => row[key]).filter(value => value !== null);
		if(!values.length) return { minimum: 0, maximum: 1 };
		const minimum = Math.min(0, Math.min.apply(Math, values));
		const maximum = Math.max.apply(Math, values);
		return { minimum: minimum, maximum: niceMaximum(maximum > minimum ? maximum : minimum + 1) };
	}
	function pathFor(rows, key, xOf, yOf) {
		let path = "";
		let open = false;
		rows.forEach(row => {
			if(row.plotDepth === null || row[key] === null) {
				open = false;
				return;
			}
			path += (open ? "L" : "M") + formatNumber(xOf(row[key]), 2).replace(",", ".") + " " +
				formatNumber(yOf(row.plotDepth), 2).replace(",", ".");
			open = true;
		});
		return path;
	}
	function svg(model_, options) {
		options = options || {};
		const instanceAttrs = (instance, label, meta) => typeof options.instanceAttrs === "function" ?
			options.instanceAttrs(instance, label, meta) : "";
		const axisWidth = 76;
		const trackWidth = 205;
		const trackGap = 24;
		const metadataWidth = 420;
		const metadataGap = 35;
		const top = 72;
		const bottom = 42;
		const depth = Math.max(model_.finalDepth, 1);
		const plotHeight = Math.max(520, Math.min(1300, depth * 45));
		const plotWidth = Math.max(1, model_.series.length) * (trackWidth + trackGap) - trackGap;
		const metadataX = axisWidth + plotWidth + metadataGap;
		const width = metadataX + metadataWidth;
		const height = top + plotHeight + bottom;
		const yOf = value => top + Math.max(0, Math.min(depth, value)) / depth * plotHeight;
		const depthTick = niceDepthStep(depth);
		let content = "<svg class='cpt-chart' xmlns='http://www.w3.org/2000/svg' width='" + width +
			"' height='" + height + "' viewBox='0 0 " + width + " " + height + "'>";
		for(let value = 0; value <= depth + depthTick / 100; value += depthTick) {
			const y = yOf(value);
			content += "<line class='depth-grid' x1='" + axisWidth + "' y1='" + y + "' x2='" +
				(axisWidth + plotWidth) + "' y2='" + y + "'/><text class='depth-label' x='" +
				(axisWidth - 10) + "' y='" + (y + 4) + "'>" + escapeHtml(formatNumber(value)) + " m</text>";
		}
		content += "<text class='depth-axis-title' transform='translate(17 " + (top + plotHeight / 2) +
			") rotate(-90)'>Diepte t.o.v. lokaal referentiepunt</text>";
		model_.removedLayers.forEach(layer => {
			const y = yOf(layer.upper);
			const layerHeight = Math.max(2, yOf(layer.lower) - y);
			content += "<g class='removed-layer'" + instanceAttrs(layer.source, "Open verwijderde laag", {
				type: "Verwijderde laag", label: formatNumber(layer.upper) + "–" + formatNumber(layer.lower) + " m",
				parent: model_.document
			}) + "><rect x='" + axisWidth + "' y='" + y + "' width='" + plotWidth + "' height='" +
				layerHeight + "'/><title>Verwijderde laag " + escapeHtml(layer.description) + "</title></g>";
		});
		if(model_.predrilledDepth !== null) {
			const y = yOf(model_.predrilledDepth);
			content += "<line class='predrilled-line' x1='" + axisWidth + "' y1='" + y + "' x2='" +
				(axisWidth + plotWidth) + "' y2='" + y + "'/><text class='predrilled-label' x='" +
				(axisWidth + 7) + "' y='" + (y - 6) + "'>voorgeboord tot " +
				escapeHtml(formatNumber(model_.predrilledDepth)) + " m</text>";
		}
		model_.series.forEach((series, index) => {
			const x = axisWidth + index * (trackWidth + trackGap);
			const range = seriesRange(model_.rows, series.key);
			const xOf = value => x + (value - range.minimum) / (range.maximum - range.minimum) * trackWidth;
			content += "<g class='cpt-series cpt-series-" + escapeHtml(series.key) + "'" +
				instanceAttrs(model_.dataArray, "Open CPT-meetreeks", {
					type: "CPT meetreeks", label: series.label, parent: model_.survey
				}) + "><text class='track-title' x='" + x + "' y='25'>" + escapeHtml(series.label) +
				"</text><text class='track-scale' x='" + x + "' y='46'>" +
				escapeHtml(formatNumber(range.minimum)) + " – " + escapeHtml(formatNumber(range.maximum)) + " " +
				escapeHtml(series.unit) + "</text><rect class='track-background' x='" + x + "' y='" + top +
				"' width='" + trackWidth + "' height='" + plotHeight + "'/><line class='track-zero' x1='" +
				xOf(0) + "' y1='" + top + "' x2='" + xOf(0) + "' y2='" + (top + plotHeight) + "'/>";
			content += "<path class='series-line' style='stroke:" + series.color + "' d='" +
				pathFor(model_.rows, series.key, xOf, yOf) + "'/></g>";
		});
		model_.dissipations.filter(test => test.depth !== null).forEach(test => {
			const y = yOf(test.depth);
			content += "<g class='dissipation-marker'" + instanceAttrs(test.source,
				"Open dissipatietest " + test.index, { type: "Dissipatietest", label: formatNumber(test.depth) + " m",
					parent: model_.survey }) + "><line x1='" + axisWidth + "' y1='" + y + "' x2='" +
				(axisWidth + plotWidth) + "' y2='" + y + "'/><circle cx='" + (axisWidth + plotWidth) +
				"' cy='" + y + "' r='5'/><title>Dissipatietest op " + escapeHtml(formatNumber(test.depth)) +
				" m</title></g>";
		});
		content += "<line class='metadata-divider' x1='" + (metadataX - 20) + "' y1='18' x2='" +
			(metadataX - 20) + "' y2='" + (height - 18) + "'/><g class='profile-metadata'>";
		content += "<text class='metadata-title'" + instanceAttrs(model_.document, "Open CPT brondocument", {
			type: "CPT brondocument", label: model_.info.report
		}) + " x='" + metadataX + "' y='25'>Geotechnisch sondeeronderzoek</text>";
		model_.metadata.forEach((item, index) => {
			const y = top + index * 24;
			content += "<text class='metadata-label' x='" + metadataX + "' y='" + y + "'>" +
				escapeHtml(item.label) + ":</text><text class='metadata-value' x='" + (metadataX + 145) +
				"' y='" + y + "'>" + escapeHtml(item.value) + "</text>";
		});
		content += "</g></svg>";
		return content;
	}
	function render(model_, options) {
		if(!model_ || !model_.rows.length) {
			return "<div class='cpt-empty'>Geen CPT-meetreeks gevonden in dit document.</div>";
		}
		const summary = [
			model_.broId ? "<strong>" + escapeHtml(model_.broId) + "</strong>" : "",
			escapeHtml(titleCase(model_.info.messageKind)),
			model_.rows.length + " meetpunten",
			formatNumber(model_.finalDepth) + " m"
		].filter(Boolean).join("<span class='cpt-separator'>·</span>");
		return "<div class='cpt-preview-header'>" + summary + "</div>" +
			"<div class='cpt-preview-scroll'>" + svg(model_, options) + "</div>" +
			"<div class='cpt-legend'>" + model_.series.map(series => "<span><i style='background:" +
				series.color + "'></i>" + escapeHtml(series.label) + " (" + escapeHtml(series.unit) + ")</span>").join("") +
			(model_.dissipations.length ? "<span class='dissipation'><i></i>Dissipatietest</span>" : "") + "</div>";
	}

	return {
		NIL_VALUE: NIL_VALUE,
		RESULT_FIELDS: RESULT_FIELDS,
		SERIES: SERIES,
		descendants: descendants,
		directValues: directValues,
		documentInfo: documentInfo,
		model: model,
		parseResultRows: parseResultRows,
		render: render,
		svg: svg,
		textOf: textOf,
		xmlOf: xmlOf
	};
});
