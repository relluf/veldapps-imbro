define(function() {
	"use strict";

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
		const textKey = ["#text", "_", "$text", "value"].filter(key =>
			value[key] !== undefined && typeof value[key] !== "object")[0];
		if(textKey) return String(value[textKey]).trim();
		const keys = Object.keys(value).filter(key => !isAttributeKey(key) && key !== "#text");
		return keys.length === 1 ? textOf(value[keys[0]], seen) : "";
	}
	function childValue(obj, name) {
		return directValues(obj, name)[0];
	}
	function childText(obj, name) {
		return textOf(childValue(obj, name));
	}
	function dateText(value) {
		return childText(value, "date") || childText(value, "yearMonth") ||
			childText(value, "year") || childText(value, "voidReason") || textOf(value);
	}
	function firstPayloadEntry(obj) {
		if(!obj || typeof obj !== "object") return null;
		const key = Object.keys(obj).filter(candidate =>
			!isAttributeKey(candidate) && obj[candidate] && typeof obj[candidate] === "object")[0];
		return key ? { key: key, value: asArray(obj[key])[0] } : null;
	}
	function documentRootKey(obj) {
		if(!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
		return Object.keys(obj).filter(key => {
			const name = localName(key);
			const value = obj[key];
			return !isAttributeKey(key) && value && typeof value === "object" &&
				(/(?:Request|Response)$/.test(name) || /^GMN(?:_|$)/.test(name));
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
	function documentInfo(result) {
		const xml = xmlOf(result);
		const rootKey = documentRootKey(xml);
		const message = rootKey ? xml[rootKey] : xml;
		const dispatch = descendants(message, "dispatchDocument")[0];
		const source = descendants(message, "sourceDocument")[0];
		let entry = firstPayloadEntry(dispatch) || firstPayloadEntry(source);

		if(!entry && rootKey && /^GMN(?:_|$)/.test(localName(rootKey))) {
			entry = { key: rootKey, value: message };
		}
		if(!entry) {
			const find = (value, seen) => {
				if(!value || typeof value !== "object" || seen.indexOf(value) !== -1) return null;
				seen.push(value);
				const key = Object.keys(value).filter(candidate =>
					/^GMN(?:_|$)/.test(localName(candidate)))[0];
				if(key) return { key: key, value: asArray(value[key])[0] };
				const keys = Object.keys(value).filter(candidate => !isAttributeKey(candidate));
				for(let index = 0; index < keys.length; ++index) {
					const found = find(value[keys[index]], seen);
					if(found) return found;
				}
				return null;
			};
			entry = find(message, []);
		}
		return {
			document: entry && entry.value || message,
			report: entry && localName(entry.key) || "GMN",
			message: rootKey && localName(rootKey) || "",
			messageKind: dispatch || /Response$/.test(localName(rootKey)) ? "uitgifte" : "inname"
		};
	}
	function unwrapFeature(value, featureName) {
		if(!value || typeof value !== "object") return value;
		return directValues(value, featureName)[0] || value;
	}
	function measuringPointRows(document) {
		return descendants(document, "measuringPoint").reduce((rows, value, pointIndex) => {
			const point = unwrapFeature(value, "MeasuringPoint");
			const code = childText(point, "measuringPointCode") || String(pointIndex + 1);
			const pointStart = dateText(childValue(point, "startDate"));
			const pointEnd = dateText(childValue(point, "endDate"));
			const tubes = directValues(point, "monitoringTube");
			const values = tubes.length ? tubes : [null];

			values.forEach((tubeValue, tubeIndex) => {
				const tube = unwrapFeature(tubeValue, "GroundwaterMonitoringTube");
				rows.push({
					Volgnummer: pointIndex + 1,
					Meetpuntcode: code,
					"Start meetpunt": pointStart,
					"Einde meetpunt": pointEnd,
					"GMW BRO-ID": tube && childText(tube, "broId") || "",
					Buisnummer: tube && childText(tube, "tubeNumber") || "",
					"Start buisreferentie": tube && dateText(childValue(tube, "startDate")) || "",
					"Einde buisreferentie": tube && dateText(childValue(tube, "endDate")) || "",
					Bron: tube || point,
					Meetpunt: point,
					Buisreferentie: tube,
					Buisvolgnummer: tubeIndex + 1
				});
			});
			return rows;
		}, []);
	}
	function model(result) {
		const info = documentInfo(result);
		const document = info.document || {};
		const rows = measuringPointRows(document);
		const pointCount = rows.reduce((codes, row) => {
			if(codes.indexOf(row.Meetpuntcode) === -1) codes.push(row.Meetpuntcode);
			return codes;
		}, []).length;
		const header = {
			Naam: childText(document, "name"),
			"BRO-ID": childText(document, "broId") || childText(document, "objectIdAccountableParty"),
			"Grondwateraspect": childText(document, "groundwaterAspect"),
			"Monitoringdoel": childText(document, "monitoringPurpose"),
			"Leveringscontext": childText(document, "deliveryContext"),
			"Start monitoring": dateText(childValue(childValue(document, "monitoringNetHistory"), "startDateMonitoring")),
			Meetpunten: pointCount,
			Buisreferenties: rows.filter(row => row.Buisreferentie).length
		};
		const viewRows = rows.map(row => ({
			Volgnummer: row.Volgnummer,
			Meetpuntcode: row.Meetpuntcode,
			"Start meetpunt": row["Start meetpunt"],
			"Einde meetpunt": row["Einde meetpunt"],
			"GMW BRO-ID": row["GMW BRO-ID"],
			Buisnummer: row.Buisnummer,
			"Start buisreferentie": row["Start buisreferentie"],
			"Einde buisreferentie": row["Einde buisreferentie"]
		}));

		return {
			info: info,
			document: document,
			header: header,
			rows: rows,
			view: {
				Netwerk: [header],
				Meetpunten: viewRows,
				Document: [document]
			}
		};
	}
	function escapeHtml(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}
	function isBroId(value) {
		return /^[A-Z]{3}\d{9,12}$/i.test(String(value || "").trim());
	}
	function broLoketLink(value, cssClass) {
		return "<a class='bro-id-link " + (cssClass || "") + "' href='https://broloket.nl/ondergrondgegevens?bro-id=" +
			encodeURIComponent(String(value || "").trim()).replace(/'/g, "%27") +
			"' target='_blank' rel='noopener noreferrer'>" + escapeHtml(value) + "</a>";
	}
	function render(model_, options) {
		options = options || {};
		const instanceAttrs = (instance, label, meta) => typeof options.instanceAttrs === "function" ?
			options.instanceAttrs(instance, label, meta) : "";
		if(!model_ || !model_.document) {
			return "<div class='gmn-empty'>Geen grondwatermonitoringnet gevonden in dit GMN-document.</div>";
		}
		const id = model_.header["BRO-ID"];
		const title = model_.header.Naam || "Grondwatermonitoringnet";
		const idHtml = isBroId(id) ? broLoketLink(id, "gmn-preview-id") : (!id ? "" :
			"<strong class='gmn-preview-id'" + instanceAttrs(model_.document, "Open GMN-document", {
				type: "GMN", label: id || title, direct: true
			}) + ">" + escapeHtml(id) + "</strong>");
		const summary = [
			"<strong>" + escapeHtml(title) + "</strong>",
			idHtml,
			model_.header.Meetpunten + " meetpunt" + (model_.header.Meetpunten === 1 ? "" : "en"),
			model_.header.Buisreferenties + " buisreferentie" +
				(model_.header.Buisreferenties === 1 ? "" : "s")
		].filter(Boolean).join("<span class='gmn-separator'>·</span>");
		const rows = model_.rows.map(row => {
			const gmw = isBroId(row["GMW BRO-ID"]) ? broLoketLink(row["GMW BRO-ID"]) :
				escapeHtml(row["GMW BRO-ID"]);
			const point = "<span class='gmn-point-link'" +
				instanceAttrs(row.Bron, "Open meetpunt " + row.Meetpuntcode, {
				type: "GMN meetpunt", label: row.Meetpuntcode, parent: model_.document
			}) + ">" + escapeHtml(row.Meetpuntcode) + "</span>";
			return "<tr><td>" + row.Volgnummer + "</td><td>" + point +
				"</td><td>" + escapeHtml(row["Start meetpunt"]) + "</td><td>" +
				escapeHtml(row["Einde meetpunt"]) + "</td><td>" + gmw + "</td><td>" +
				escapeHtml(row.Buisnummer) + "</td><td>" + escapeHtml(row["Start buisreferentie"]) +
				"</td><td>" + escapeHtml(row["Einde buisreferentie"]) + "</td></tr>";
		}).join("");
		return "<div class='gmn-preview-header'>" + summary + "</div>" +
			"<div class='gmn-preview-scroll'><table class='gmn-points'><thead><tr>" +
			"<th>#</th><th>Meetpuntcode</th><th>Start meetpunt</th><th>Einde meetpunt</th>" +
			"<th>GMW BRO-ID</th><th>Buis</th><th>Start buisreferentie</th><th>Einde buisreferentie</th>" +
			"</tr></thead><tbody>" + rows + "</tbody></table></div>";
	}

	return {
		descendants: descendants,
		directValues: directValues,
		documentInfo: documentInfo,
		measuringPointRows: measuringPointRows,
		model: model,
		render: render,
		textOf: textOf,
		xmlOf: xmlOf
	};
});
