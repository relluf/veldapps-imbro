define(function() {
	"use strict";

	const LAYER_KINDS = [
		"layer",
		"notDescribedInterval",
		"postSedimentaryDiscontinuity",
		"excavatedLayer",
		"fluidMudLayer"
	];
	const INTERVAL_KINDS = [
		"investigatedInterval",
		"boredInterval",
		"sampledInterval",
		"completedInterval",
		"contaminatedInterval"
	];
	const COLORS = {
		soil: "#e6c975",
		rock: "#8e99a3",
		specialMaterial: "#c98963",
		layer: "#c6b27c",
		notDescribedInterval: "#d7d9dc",
		postSedimentaryDiscontinuity: "#9c78b5",
		excavatedLayer: "#d9964a",
		fluidMudLayer: "#708d9e",
		investigatedInterval: "#4385d1",
		boredInterval: "#b8dcd7",
		sampledInterval: "#c7e2c2",
		completedInterval: "#6f7d91",
		contaminatedInterval: "#c65757"
	};
	const MATERIALS = {
		sand: { label: "Zand", color: "#f3dd19", pattern: "bhrgt-sand" },
		gravel: { label: "Grind", color: "#dda91f", pattern: "bhrgt-gravel" },
		silt: { label: "Silt / leem", color: "#eeeeea", pattern: "bhrgt-silt" },
		clay: { label: "Klei", color: "#229a35", pattern: "bhrgt-clay" },
		peat: { label: "Veen / organisch", color: "#755133", pattern: "bhrgt-peat" },
		rock: { label: "Gesteente", color: "#929aa1", pattern: "bhrgt-rock" },
		specialMaterial: { label: "Bijzonder materiaal", color: "#c98963", pattern: "bhrgt-special" },
		soil: { label: "Grond", color: COLORS.soil, pattern: "bhrgt-soil" },
		layer: { label: "Laag", color: COLORS.layer, pattern: "bhrgt-soil" }
	};
	const KIND_LABELS = {
		soil: "Grond",
		rock: "Gesteente",
		specialMaterial: "Bijzonder materiaal",
		layer: "Laag",
		notDescribedInterval: "Niet beschreven interval",
		postSedimentaryDiscontinuity: "Post-sedimentaire discontinuïteit",
		excavatedLayer: "Ontgraven laag",
		fluidMudLayer: "Sliblaag",
		investigatedInterval: "Onderzocht interval",
		boredInterval: "Geboord interval",
		sampledInterval: "Bemonsterd interval",
		completedInterval: "Afgewerkt interval",
		contaminatedInterval: "Verontreinigd interval"
	};
	const MATERIAL_TRACK_LABELS = {
		soil: "Grond",
		rock: "Gesteente",
		specialMaterial: "Bijzonder materiaal",
		layer: "Lagen"
	};
	let svgSequence = 0;

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
			if(localName(key) === name) {
				asArray(obj[key]).forEach(value => values.push(value));
			}
			descendants(obj[key], name, values, seen);
		});
		return values;
	}
	function documentRootKey(obj) {
		if(!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
		return Object.keys(obj).filter(key => {
			const name = localName(key);
			const value = obj[key];
			return !isAttributeKey(key) && value && typeof value === "object" &&
				(/(?:Request|Response)$/.test(name) || /^BHR_GT(?:_|$)/.test(name));
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
	function firstNamedObject(obj, expression, seen) {
		seen = seen || [];
		if(Array.isArray(obj)) {
			for(let index = 0; index < obj.length; ++index) {
				const found = firstNamedObject(obj[index], expression, seen);
				if(found) return found;
			}
			return null;
		}
		if(!obj || typeof obj !== "object" || seen.indexOf(obj) !== -1) return null;
		seen.push(obj);
		const keys = Object.keys(obj).filter(key => !isAttributeKey(key));
		for(let index = 0; index < keys.length; ++index) {
			const values = asArray(obj[keys[index]]);
			if(expression.test(localName(keys[index]))) {
				const value = values.filter(candidate => candidate && typeof candidate === "object")[0];
				if(value) return value;
			}
		}
		for(let index = 0; index < keys.length; ++index) {
			const found = firstNamedObject(obj[keys[index]], expression, seen);
			if(found) return found;
		}
		return null;
	}
	function inspectionDocumentOf(xml) {
		return firstNamedObject(xml, /^(?:meetpunt|borehole)$/i) ||
			firstNamedObject(xml, /^BHR_GT(?:_|$)/) || xml;
	}
	function textOf(value, seen) {
		if(value === undefined || value === null) return "";
		if(Array.isArray(value)) {
			return value.map(item => textOf(item, seen)).filter(Boolean).join(", ");
		}
		if(typeof value !== "object") return String(value).trim();
		seen = seen || [];
		if(seen.indexOf(value) !== -1) return "";
		seen.push(value);
		const explicit = ["#text", "_", "$text", "value"]
			.filter(key => value[key] !== undefined && typeof value[key] !== "object")
			.map(key => String(value[key]).trim())
			.filter(Boolean)[0];
		if(explicit) return explicit;
		const keys = Object.keys(value).filter(key => !isAttributeKey(key) && key !== "#text");
		return keys.length === 1 ? textOf(value[keys[0]], seen) : "";
	}
	function childText(obj, names) {
		names = asArray(names);
		for(let index = 0; index < names.length; ++index) {
			const value = directValues(obj, names[index])[0];
			const text = textOf(value);
			if(text) return text;
		}
		return "";
	}
	function numberOf(value) {
		const number = parseFloat(textOf(value).replace(",", "."));
		return isFinite(number) ? number : null;
	}
	function childNumber(obj, names) {
		names = asArray(names);
		for(let index = 0; index < names.length; ++index) {
			const number = numberOf(directValues(obj, names[index])[0]);
			if(number !== null) return number;
		}
		return null;
	}
	function formatNumber(value) {
		if(!isFinite(value)) return "";
		return String(Math.round(value * 1000) / 1000).replace(".", ",");
	}
	function join(values, separator) {
		return values.filter(Boolean).join(separator || " · ");
	}
	function titleCase(value) {
		value = String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2");
		return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
	}
	function descriptionLabel(value) {
		return String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
	}
	function materialKind(value) {
		value = String(value || "").toLowerCase();
		if(/(?:zand|sand)$/.test(value)) return "sand";
		if(/(?:grind|gravel|keien?|blokken?)$/.test(value)) return "gravel";
		if(/(?:klei|clay)$/.test(value)) return "clay";
		if(/(?:silt|leem|loam)$/.test(value)) return "silt";
		if(/(?:veen|peat|detritus|gyttja|bruinkool)$/.test(value)) return "peat";
		if(/veen|peat|organ|humus|detritus|gyttja|dy\b|bruinkool/.test(value)) return "peat";
		if(/klei|clay/.test(value)) return "clay";
		if(/silt|leem|loam/.test(value)) return "silt";
		if(/grind|gravel|kei|blok/.test(value)) return "gravel";
		if(/zand|sand/.test(value)) return "sand";
		if(/steen|rock|mergel|krijt|schalie/.test(value)) return "rock";
		return "soil";
	}
	function materialBands(name, fallbackKind) {
		const value = String(name || "");
		const primary = fallbackKind === "rock" || fallbackKind === "specialMaterial" ?
			fallbackKind : materialKind(value);
		const lower = value.toLowerCase();
		const constituents = [{ kind: primary, percentage: 100 }];
		const candidates = [
			{ expression: /grind/, kind: "gravel" },
			{ expression: /zand/, kind: "sand" },
			{ expression: /klei/, kind: "clay" },
			{ expression: /silt|leem/, kind: "silt" },
			{ expression: /veen|organ|humeus/, kind: "peat" }
		];
		const secondary = candidates.filter(candidate => candidate.kind !== primary &&
			candidate.expression.test(lower))[0];
		if(secondary) {
			const percentage = /sterk|strong/.test(lower) ? 40 :
				/zwak|slightly|weak/.test(lower) ? 20 : 30;
			constituents[0].percentage -= percentage;
			constituents.push({ kind: secondary.kind, percentage: percentage });
		}
		return constituents;
	}
	function layerMaterial(layer) {
		const soil = directValues(layer, "soil")[0];
		const rock = directValues(layer, "rock")[0];
		const special = childText(layer, "specialMaterial");
		if(soil) {
			const title = childText(soil, ["geotechnicalSoilName", "soilNameNEN5104"]) || "Grond";
			return {
				kind: "soil",
				title: title,
				bands: materialBands(title, "soil"),
				detail: join([
					childText(soil, "colour"),
					childText(soil, "sandMedianClass"),
					childText(soil, "organicMatterContentClass")
				])
			};
		}
		if(rock) {
			const title = childText(rock, "rockType") || "Gesteente";
			return {
				kind: "rock",
				title: title,
				bands: materialBands(title, "rock"),
				detail: join([childText(rock, "colour"), childText(rock, "strengthClass")])
			};
		}
		if(special) {
			return { kind: "specialMaterial", title: special, detail: "Bijzonder materiaal",
				bands: materialBands(special, "specialMaterial") };
		}
		return { kind: "layer", title: "Laag", detail: "", bands: materialBands("", "layer") };
	}
	function intervalItem(source, kind, beginNames, endNames, title, detail) {
		const beginDepth = childNumber(source, beginNames);
		const endDepth = childNumber(source, endNames);
		if(beginDepth === null || endDepth === null) return null;
		return {
			kind: kind,
			beginDepth: Math.min(beginDepth, endDepth),
			endDepth: Math.max(beginDepth, endDepth),
			title: title || titleCase(kind),
			detail: detail || "",
			color: COLORS[kind] || COLORS.layer,
			source: source
		};
	}
	function descriptiveItem(source, kind) {
		if(kind === "layer") {
			const material = layerMaterial(source);
			const item = intervalItem(source, material.kind,
				"upperBoundary", "lowerBoundary", descriptionLabel(material.title), material.detail);
			if(item) {
				item.schemaKind = kind;
				item.materialBands = material.bands;
			}
			return item;
		}
		if(kind === "notDescribedInterval") {
			return intervalItem(source, kind, "beginDepth", "endDepth",
				"Niet beschreven", childText(source, "noDescriptionReason"));
		}
		return intervalItem(source, kind, "beginDepth", "endDepth",
			"Discontinuïteit", join([
				childText(source, "discontinuityType"),
				childText(source, "infillMaterial")
			]));
	}
	function track(key, title, items, detail) {
		items = items.filter(Boolean).sort((left, right) =>
			left.beginDepth - right.beginDepth || left.endDepth - right.endDepth);
		return { key: key, title: title, detail: detail || "", items: items };
	}
	function descriptiveTrackTitle(items, index, count) {
		const labels = Object.keys(MATERIAL_TRACK_LABELS)
			.filter(kind => items.some(item => item.kind === kind))
			.map(kind => MATERIAL_TRACK_LABELS[kind]);
		const title = labels.length ? labels.join(" / ") : "Lagen";
		return count > 1 ? title + " " + (index + 1) : title;
	}
	function descriptiveTracks(xml) {
		let logs = descendants(xml, "descriptiveBoreholeLog");
		if(!logs.length && descendants(xml, "layer").length) logs = [xml];
		return logs.map((log, index) => {
			const items = ["layer", "notDescribedInterval", "postSedimentaryDiscontinuity"]
				.reduce((all, kind) => all.concat(directValues(log, kind)
					.map(value => descriptiveItem(value, kind))), []);
			const detail = join([
				childText(log, "describedMaterial"),
				childText(log, "descriptionQuality"),
				childText(log, "descriptionLocation")
			]);
			return track("layers-" + index, descriptiveTrackTitle(items, index, logs.length), items, detail);
		}).filter(value => value.items.length);
	}
	function collectedIntervalTrack(xml, definition) {
		const items = descendants(xml, definition.kind).map(source => intervalItem(
			source,
			definition.kind,
			definition.begin,
			definition.end,
			definition.itemTitle(source),
			definition.detail(source)
		));
		return track(definition.kind, definition.title, items);
	}
	const TRACK_DEFINITIONS = [{
		kind: "investigatedInterval",
		title: "Onderzocht",
		begin: "beginDepth",
		end: "endDepth",
		itemTitle: source => childText(source, "analysisType") || "Onderzocht interval",
		detail: source => join([childText(source, "sampleQuality"),
			childText(source, "described") ? "beschreven: " + childText(source, "described") : ""])
	}, {
		kind: "boredInterval",
		title: "Geboord",
		begin: "beginDepth",
		end: "endDepth",
		itemTitle: source => childText(source, "boringTechnique") || "Geboord interval",
		detail: source => childText(source, "boredDiameter") ?
			"Ø " + childText(source, "boredDiameter") + " mm" : ""
	}, {
		kind: "sampledInterval",
		title: "Bemonsterd",
		begin: "beginDepth",
		end: "endDepth",
		itemTitle: source => childText(source, "samplingMethod") || "Bemonsterd interval",
		detail: source => childText(source, "samplingQuality")
	}, {
		kind: "completedInterval",
		title: "Afgewerkt",
		begin: "beginDepth",
		end: "endDepth",
		itemTitle: source => childText(source, "backfillMaterial") || "Afgewerkt interval",
		detail: source => childText(source, "materialPermanentCasing")
	}, {
		kind: "contaminatedInterval",
		title: "Verontreinigd",
		begin: "beginDepth",
		end: "endDepth",
		itemTitle: () => "Verontreinigd interval",
		detail: () => ""
	}];
	function excavatedTrack(xml) {
		return track("excavatedLayer", "Ontgraven", descendants(xml, "excavatedLayer")
			.map(source => intervalItem(source, "excavatedLayer",
				"upperBoundary", "lowerBoundary",
				childText(source, "excavatedMaterial") || "Ontgraven laag", "")));
	}
	function fluidMudTrack(xml) {
		return track("fluidMudLayer", "Sliblaag", descendants(xml, "fluidMudLayer")
			.map(source => {
				const thickness = childNumber(source, "thickness");
				return thickness === null ? null : {
					kind: "fluidMudLayer",
					beginDepth: 0,
					endDepth: Math.max(0, thickness),
					title: "Sliblaag",
					detail: childText(source, "colour"),
					color: COLORS.fluidMudLayer,
					source: source
				};
			}));
	}
	function model(result) {
		const xml = xmlOf(result);
		const document = inspectionDocumentOf(xml);
		let tracks = descriptiveTracks(xml)
			.concat(TRACK_DEFINITIONS.map(definition => collectedIntervalTrack(xml, definition)))
			.concat([excavatedTrack(xml), fluidMudTrack(xml)])
			.filter(value => value.items.length);
		const items = tracks.reduce((all, value) => all.concat(value.items), []);
		const finalDepths = descendants(xml, "finalDepthBoring").map(numberOf).filter(value => value !== null);
		const maximumItemDepth = items.reduce((maximum, item) => Math.max(maximum, item.endDepth), 0);
		const finalDepth = Math.max.apply(Math, [0].concat(finalDepths));
		const maximumDepth = Math.max(maximumItemDepth, finalDepth);
		const broId = textOf(descendants(xml, "broId")[0]) ||
			textOf(descendants(xml, "objectIdAccountableParty")[0]);
		const location = textOf(descendants(xml, "pos")[0]);
		const verticalPosition = descendants(xml, "deliveredVerticalPosition")[0];
		const offset = childText(verticalPosition, "offset");
		return {
			xml: xml,
			document: document,
			tracks: tracks,
			items: items,
			maximumDepth: maximumDepth,
			finalDepth: finalDepth,
			broId: broId,
			metadata: [
				{ label: "ID", value: broId },
				{ label: "Kwaliteitsregime", value: textOf(descendants(xml, "qualityRegime")[0]) },
				{ label: "Beschrijfprocedure", value: descendants(xml, "descriptionProcedure").map(textOf).filter(Boolean).join(", ") },
				{ label: "Aangeleverde locatie", value: location },
				{ label: "Verticale positie", value: join([
					offset ? offset + " m" : "",
					childText(verticalPosition, "verticalDatum"),
					childText(verticalPosition, "localVerticalReferencePoint")
				], ", ") },
				{ label: "Startdatum boring", value: textOf(descendants(xml, "boringStartDate")[0]) },
				{ label: "Einddatum boring", value: textOf(descendants(xml, "boringEndDate")[0]) },
				{ label: "Einddiepte boring", value: finalDepth ? formatNumber(finalDepth) + " m" : "" }
			].filter(item => item.value),
			type: result && result.type || "bro-bhr-gt",
			version: result && result.version || ""
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
	function broLoketHref(broId) {
		return "https://broloket.nl/ondergrondgegevens?bro-id=" +
			encodeURIComponent(String(broId || "").trim()).replace(/'/g, "%27");
	}
	function isBroId(value) {
		return /^[A-Z]{3}\d{9,12}$/i.test(String(value || "").trim());
	}
	function broLoketLinkAttrs(broId) {
		return " href='" + broLoketHref(broId) +
			"' target='_blank' rel='noopener noreferrer'";
	}
	function niceTickStep(maximumDepth) {
		const rough = maximumDepth / 10;
		const exponent = Math.pow(10, Math.floor(Math.log(rough || 1) / Math.LN10));
		const fraction = rough / exponent;
		const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
		return nice * exponent;
	}
	function itemTooltip(item) {
		return join([
			item.title,
			formatNumber(item.beginDepth) + "–" + formatNumber(item.endDepth) + " m",
			item.detail
		], "\n");
	}
	function patternId(id, suffix) {
		return id + "-" + suffix;
	}
	function materialFill(kind, suffix) {
		const material = MATERIALS[kind] || MATERIALS.soil;
		return "url(#" + patternId(material.pattern, suffix) + ")";
	}
	function svgPatterns(suffix) {
		return "<defs>" +
			"<pattern id='" + patternId("bhrgt-sand", suffix) + "' width='12' height='12' patternUnits='userSpaceOnUse'>" +
			"<rect width='12' height='12' fill='#f3dd19'/><circle cx='2' cy='3' r='1' fill='#8c8115'/>" +
			"<circle cx='9' cy='7' r='.8' fill='#8c8115'/><path d='M4 10l2-1' stroke='#8c8115'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-gravel", suffix) + "' width='13' height='13' patternUnits='userSpaceOnUse'>" +
			"<rect width='13' height='13' fill='#dda91f'/><path d='M1 4q3-4 5 0t5 0M2 10q2-3 4 0t5 0' fill='none' stroke='#8b6b24' stroke-width='1.2'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-silt", suffix) + "' width='7' height='7' patternUnits='userSpaceOnUse'>" +
			"<rect width='7' height='7' fill='#eeeeea'/><path d='M2 0v7M5 0v7' stroke='#b8b9b5' stroke-width='.7'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-clay", suffix) + "' width='9' height='9' patternUnits='userSpaceOnUse' patternTransform='rotate(35)'>" +
			"<rect width='9' height='9' fill='#229a35'/><path d='M0 1h9' stroke='#126f24' stroke-width='1.4'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-peat", suffix) + "' width='12' height='9' patternUnits='userSpaceOnUse'>" +
			"<rect width='12' height='9' fill='#755133'/><path d='M0 3h5l2 2h5M2 8h6' fill='none' stroke='#c19b6c' stroke-width='1'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-rock", suffix) + "' width='12' height='12' patternUnits='userSpaceOnUse'>" +
			"<rect width='12' height='12' fill='#929aa1'/><path d='M0 6h12M6 0v6M3 6v6' stroke='#65717a' stroke-width='1'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-special", suffix) + "' width='11' height='11' patternUnits='userSpaceOnUse'>" +
			"<rect width='11' height='11' fill='#c98963'/><path d='M1 1l9 9M10 1l-9 9' stroke='#88583d' stroke-width='1'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-soil", suffix) + "' width='8' height='8' patternUnits='userSpaceOnUse'>" +
			"<rect width='8' height='8' fill='#c6b27c'/><circle cx='2' cy='2' r='.8' fill='#89784c'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-not-described", suffix) + "' width='8' height='8' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'>" +
			"<rect width='8' height='8' fill='#f2f3f4'/><line y2='8' stroke='#aeb4ba' stroke-width='3'/></pattern>" +
			"<pattern id='" + patternId("bhrgt-discontinuity", suffix) + "' width='10' height='10' patternUnits='userSpaceOnUse'>" +
			"<rect width='10' height='10' fill='#d5c1e1'/><path d='M0 5L3 2L7 8L10 5' fill='none' stroke='#725187' stroke-width='1.5'/></pattern>" +
			"</defs>";
	}
	function svg(model_, options) {
		options = options || {};
		const instanceAttrs = (instance, label, meta) => typeof options.instanceAttrs === "function" ?
			options.instanceAttrs(instance, label, meta) : "";
		const patternSuffix = ++svgSequence;
		const maximumDepth = Math.max(model_.maximumDepth || 0, 1);
		const tickStep = niceTickStep(maximumDepth);
		const displayedDepth = Math.ceil(maximumDepth / tickStep) * tickStep;
		const layerTracks = model_.tracks.filter(track_ => /^layers-/.test(track_.key));
		const intervalTracks = model_.tracks.filter(track_ => !/^layers-/.test(track_.key));
		const layerTrackWidth = options.layerTrackWidth || 250;
		const profileWidth = options.profileWidth || 82;
		const intervalTrackWidth = options.intervalTrackWidth || 150;
		const trackGap = 14;
		const axisWidth = 76;
		const metadataWidth = model_.metadata && model_.metadata.length ? 340 : 0;
		const top = 78;
		const bottom = 34;
		const plotHeight = Math.max(520, Math.min(1400, displayedDepth * 72));
		const plottedWidth = layerTracks.length * (layerTrackWidth + trackGap) +
			intervalTracks.length * (intervalTrackWidth + trackGap);
		const metadataX = axisWidth + plottedWidth + 10;
		const width = metadataX + metadataWidth + 18;
		const height = top + plotHeight + bottom;
		const scale = plotHeight / displayedDepth;
		let content = "<svg class='bhrgt-log' xmlns='http://www.w3.org/2000/svg' " +
			"width='" + width + "' height='" + height + "' viewBox='0 0 " + width + " " + height + "'>";
		content += svgPatterns(patternSuffix);
		for(let depth = 0; depth <= displayedDepth + tickStep / 100; depth += tickStep) {
			const y = top + depth * scale;
			content += "<line class='depth-grid' x1='" + axisWidth + "' y1='" + y + "' x2='" +
				(metadataX - trackGap) + "' y2='" + y + "'/><text class='depth-label' x='" + (axisWidth - 10) +
				"' y='" + (y + 4) + "'>" + escapeHtml(formatNumber(depth)) + " m</text>";
		}
		content += "<text class='depth-axis-title' transform='translate(17 " + (top + plotHeight / 2) +
			") rotate(-90)'>Diepte t.o.v. maaiveld</text>";
		layerTracks.forEach((track_, trackIndex) => {
			const x = axisWidth + trackIndex * (layerTrackWidth + trackGap);
			content += "<g class='track-heading'" + instanceAttrs(track_.items,
				"Open " + track_.title, { type: track_.title, label: track_.items.length + " objecten", direct: true }) + ">";
			content += "<text class='track-title' x='" + (x + 8) + "' y='25'>" + escapeHtml(track_.title) + "</text>";
			content += "<text class='track-detail' x='" + (x + 8) + "' y='46'>" +
				escapeHtml(track_.detail || track_.items.length + " object" + (track_.items.length === 1 ? "" : "en")) + "</text></g>";
			content += "<rect class='profile-background' x='" + x + "' y='" + top + "' width='" + profileWidth +
				"' height='" + plotHeight + "'/>";
			track_.items.forEach((item, itemIndex) => {
				const y = top + item.beginDepth * scale;
				const itemHeight = Math.max(2, (item.endDepth - item.beginDepth) * scale);
				const bands = item.materialBands || [];
				content += "<g class='profile-layer interval-" + escapeHtml(item.kind) + "'" +
					instanceAttrs(item.source, "Open laag " + item.title, {
						type: item.schemaKind === "layer" ? "Laag" : KIND_LABELS[item.kind] || "Diepteobject",
						label: formatNumber(item.beginDepth) + "–" + formatNumber(item.endDepth) + " m"
					}) + "><title>" +
					escapeHtml(itemTooltip(item)) + "</title>";
				if(bands.length) {
					let bandX = x;
					bands.forEach(band => {
						const bandWidth = profileWidth * band.percentage / 100;
						content += "<rect x='" + bandX + "' y='" + y + "' width='" + bandWidth +
							"' height='" + itemHeight + "' fill='" + materialFill(band.kind, patternSuffix) + "'/>";
						bandX += bandWidth;
					});
				} else {
					const fill = item.kind === "notDescribedInterval" ?
						"url(#" + patternId("bhrgt-not-described", patternSuffix) + ")" :
						item.kind === "postSedimentaryDiscontinuity" ?
							"url(#" + patternId("bhrgt-discontinuity", patternSuffix) + ")" : item.color;
					content += "<rect x='" + x + "' y='" + y + "' width='" + profileWidth +
						"' height='" + itemHeight + "' fill='" + fill + "'/>";
				}
				content += "<rect class='layer-outline' x='" + x + "' y='" + y + "' width='" + profileWidth +
					"' height='" + itemHeight + "'/><text class='layer-thickness' x='" + (x + profileWidth + 9) +
					"' y='" + (y + Math.max(13, itemHeight / 2)) + "'>" +
					escapeHtml(formatNumber(item.endDepth - item.beginDepth)) + " m</text>";
				if(itemHeight >= 28) content += "<text class='layer-name' x='" + (x + profileWidth + 9) +
					"' y='" + (y + Math.max(26, itemHeight / 2 + 14)) + "'>" + escapeHtml(item.title) + "</text>";
				content += "</g>";
			});
		});
		intervalTracks.forEach((track_, trackIndex) => {
			const x = axisWidth + layerTracks.length * (layerTrackWidth + trackGap) +
				trackIndex * (intervalTrackWidth + trackGap);
			const trackCount = track_.items.length + " traject" + (track_.items.length === 1 ? "" : "en");
			content += "<g class='track-heading'" + instanceAttrs(track_.items,
				"Open " + track_.title, { type: track_.title, label: trackCount, direct: true }) + ">";
			content += "<text class='track-title' x='" + (x + 7) + "' y='25'>" + escapeHtml(track_.title) + "</text>";
			content += "<text class='track-detail' x='" + (x + 7) + "' y='46'>" + trackCount + "</text></g>";
			content += "<rect class='track-background' x='" + x + "' y='" + top + "' width='" + intervalTrackWidth +
				"' height='" + plotHeight + "'/>";
			track_.items.forEach(item => {
				const y = top + item.beginDepth * scale;
				const itemHeight = Math.max(2, (item.endDepth - item.beginDepth) * scale);
				content += "<g class='interval interval-" + escapeHtml(item.kind) + "'" +
					instanceAttrs(item.source, "Open " + (KIND_LABELS[item.kind] || item.title), {
						type: KIND_LABELS[item.kind] || "Diepte-interval",
						label: formatNumber(item.beginDepth) + "–" + formatNumber(item.endDepth) + " m"
					}) + "><title>" +
					escapeHtml(itemTooltip(item)) + "</title><rect x='" + x + "' y='" + y + "' width='" +
					intervalTrackWidth + "' height='" + itemHeight + "' fill='" + item.color + "'/>";
				if(itemHeight >= 17) content += "<text class='item-title' x='" + (x + 7) + "' y='" +
					(y + 14) + "'>" + escapeHtml(item.title) + "</text>";
				if(itemHeight >= 34 && item.detail) content += "<text class='item-detail' x='" + (x + 7) +
					"' y='" + (y + 29) + "'>" + escapeHtml(item.detail) + "</text>";
				content += "</g>";
			});
		});
		if(metadataWidth) {
			content += "<g class='profile-metadata'><g class='metadata-heading'" +
				instanceAttrs(model_.document, "Open Registratie en boring",
					{ type: "BHR-GT document", label: model_.broId, direct: true }) + ">" +
				"<text class='metadata-title' x='" + metadataX +
				"' y='25'>Registratie en boring</text></g>";
			model_.metadata.forEach((item, index) => {
				const y = top + index * 24;
				const isId = item.label === "ID";
				const linksToBroLoket = isId && isBroId(item.value);
				content += (linksToBroLoket ? "<a class='metadata-row bro-id-link'" + broLoketLinkAttrs(item.value) :
					"<g class='metadata-row'" + instanceAttrs(model_.document,
					"Open " + item.label, { type: "BHR-GT document", label: model_.broId, direct: true })) + "><text class='metadata-label' x='" +
					metadataX + "' y='" + y + "'>" +
					escapeHtml(item.label) + ":</text><text class='metadata-value' x='" + (metadataX + 142) +
					"' y='" + y + "'>" + escapeHtml(item.value) + "</text>" + (linksToBroLoket ? "</a>" : "</g>");
			});
			content += "</g>";
		}
		content += "</svg>";
		return content;
	}
	function render(model_, options) {
		options = options || {};
		const instanceAttrs = (instance, label, meta) => typeof options.instanceAttrs === "function" ?
			options.instanceAttrs(instance, label, meta) : "";
		if(!model_ || !model_.tracks.length) {
			return "<div class='bhrgt-empty'>Geen lagen of diepte-intervallen gevonden in dit BHR-GT-document.</div>";
		}
		const summary = [
			model_.broId ? (isBroId(model_.broId) ? "<a class='bhrgt-preview-id bro-id-link'" +
				broLoketLinkAttrs(model_.broId) + "><strong>" + escapeHtml(model_.broId) + "</strong></a>" :
				"<strong class='bhrgt-preview-id'" + instanceAttrs(model_.document, "Open ID",
					{ type: "BHR-GT document", label: model_.broId, direct: true }) + ">" +
					escapeHtml(model_.broId) + "</strong>") : "",
			model_.finalDepth ? "Einddiepte " + escapeHtml(formatNumber(model_.finalDepth)) + " m" : "",
			model_.items.length + " diepteobjecten"
		].filter(Boolean).join("<span class='bhrgt-separator'>·</span>");
		const materials = {};
		model_.items.forEach(item => (item.materialBands || []).forEach(band => materials[band.kind] = true));
		const materialLegend = Object.keys(materials).map(kind => {
			const material = MATERIALS[kind] || MATERIALS.soil;
			return "<span class='bhrgt-legend-item'><i style='background:" + escapeHtml(material.color) + "'></i>" +
				escapeHtml(material.label) + "</span>";
		}).join("");
		const kinds = {};
		model_.items.filter(item => !item.materialBands).forEach(item => kinds[item.kind] = item);
		const intervalLegend = Object.keys(kinds).map(kind => {
			const item = kinds[kind];
			return "<span class='bhrgt-legend-item'><i style='background:" + escapeHtml(item.color) + "'></i>" +
				escapeHtml(KIND_LABELS[kind] || titleCase(kind)) + "</span>";
		}).join("");
		return "<div class='bhrgt-preview-header'>" + summary + "</div>" +
			"<div class='bhrgt-preview-scroll'>" + svg(model_, options) + "</div>" +
			"<div class='bhrgt-legend'>" + materialLegend + intervalLegend + "</div>";
	}

	return {
		COLORS: COLORS,
		MATERIALS: MATERIALS,
		INTERVAL_KINDS: INTERVAL_KINDS,
		KIND_LABELS: KIND_LABELS,
		LAYER_KINDS: LAYER_KINDS,
		descendants: descendants,
		directValues: directValues,
		model: model,
		materialBands: materialBands,
		render: render,
		svg: svg,
		textOf: textOf,
		xmlOf: xmlOf
	};
});
