define(function() {
	"use strict";

	const COLORS = {
		soil: "#c8aa6b",
		litterLayer: "#755133",
		consolidatedRockLayer: "#8e99a3",
		removedLayer: "#d58b51",
		boredInterval: "#84bbb5",
		investigatedInterval: "#4787cf"
	};
	const MATERIALS = {
		organic: { label: "Organisch / strooisel", color: "#755133", pattern: "bhr-organic" },
		clay: { label: "Klei", color: "#4b9c54", pattern: "bhr-clay" },
		silt: { label: "Silt / leem", color: "#d6d2bd", pattern: "bhr-silt" },
		sand: { label: "Zand", color: "#edcf45", pattern: "bhr-sand" },
		gravel: { label: "Grind", color: "#c99742", pattern: "bhr-gravel" },
		soil: { label: "Bodemcomponent", color: COLORS.soil, pattern: "bhr-soil" },
		rock: { label: "Gesteente", color: COLORS.consolidatedRockLayer, pattern: "bhr-rock" }
	};
	const KIND_LABELS = {
		soilLayer: "Bodemlaag",
		litterLayer: "Strooisellaag",
		consolidatedRockLayer: "Geconsolideerd gesteente",
		removedLayer: "Verwijderde laag",
		boredInterval: "Geboord interval",
		investigatedInterval: "Onderzocht interval"
	};
	let svgSequence = 0;

	function localName(key) {
		return String(key || "").split(":").pop();
	}
	function asArray(value) {
		return value === undefined || value === null ? [] : (Array.isArray(value) ? value : [value]);
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
	function documentRootKey(obj) {
		if(!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
		return Object.keys(obj).filter(key => {
			const name = localName(key);
			const value = obj[key];
			return !isAttributeKey(key) && value && typeof value === "object" &&
				(/(?:Request|Response)$/.test(name) || /^BHR(?:_|$)/.test(name));
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
	function join(values, separator) {
		return values.filter(Boolean).join(separator || " · ");
	}
	function titleCase(value) {
		value = String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2");
		return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
	}
	function formatNumber(value) {
		if(!isFinite(value)) return "";
		return String(Math.round(value * 1000) / 1000).replace(".", ",");
	}
	function materialKind(component) {
		const description = ["horizonCode", "depositionalCharacteristic", "soilName", "textureClass", "peatClass"]
			.map(name => childText(component, name)).join(" ").toLowerCase();
		if(/(?:^|\s)[oh][a-z0-9]*\b|veen|peat|organ|humus/.test(description)) return "organic";
		if(/klei|clay/.test(description)) return "clay";
		if(/silt|leem|loam/.test(description)) return "silt";
		if(/grind|gravel/.test(description)) return "gravel";
		if(/zand|sand/.test(description)) return "sand";
		return "soil";
	}
	function normalizeComponents(layer) {
		const components = directValues(layer, "layerComponent");
		if(!components.length) return [{ kind: "soil", percentage: 100, title: "Bodem", source: layer }];
		const percentages = components.map(component => childNumber(component, "volumePercentage"));
		const specified = percentages.reduce((total, value) => total + (value === null ? 0 : value), 0);
		const missing = percentages.filter(value => value === null).length;
		const fallback = missing ? Math.max(0, 100 - specified) / missing : 0;
		let bands = components.map((component, index) => ({
			kind: materialKind(component),
			percentage: percentages[index] === null ? fallback : Math.max(0, percentages[index]),
			title: childText(component, "horizonCode") || "Component " + (index + 1),
			detail: join([
				childText(component, "depositionalCharacteristic"),
				childText(component, "saturatedPermeability") ?
					"k = " + childText(component, "saturatedPermeability") + " m/d" : ""
			]),
			source: component
		}));
		let total = bands.reduce((sum, band) => sum + band.percentage, 0);
		if(total <= 0) {
			bands.forEach(band => band.percentage = 100 / bands.length);
		} else if(Math.abs(total - 100) > .001) {
			bands.forEach(band => band.percentage = band.percentage * 100 / total);
		}
		return bands;
	}
	function intervalItem(source, kind, beginNames, endNames, title, detail) {
		const beginDepth = childNumber(source, beginNames);
		const endDepth = childNumber(source, endNames);
		if(beginDepth === null || endDepth === null) return null;
		return {
			kind: kind,
			beginDepth: Math.min(beginDepth, endDepth),
			endDepth: Math.max(beginDepth, endDepth),
			title: title || KIND_LABELS[kind] || titleCase(kind),
			detail: detail || "",
			color: COLORS[kind] || COLORS.soil,
			source: source
		};
	}
	function layerItem(source, kind) {
		let title;
		let detail;
		let components;
		if(kind === "soilLayer") {
			components = normalizeComponents(source);
			title = components.map(component => component.title).filter(Boolean).join(" + ") || "Bodemlaag";
			detail = join([
				childText(source, "anthropogenic") === "ja" ? "antropogeen" : "",
				components.map(component => component.detail).filter(Boolean).join(", ")
			]);
		} else if(kind === "litterLayer") {
			title = childText(source, "litterType") || "Strooisellaag";
			detail = join([
				childText(source, "horizonCode"),
				childText(source, "organicMatterContent") ?
					childText(source, "organicMatterContent") + "% organische stof" : ""
			]);
			components = [{ kind: "organic", percentage: 100, title: title, source: source }];
		} else {
			title = childText(source, "rockType") || "Gesteente";
			detail = childText(source, "horizonCode");
			components = [{ kind: "rock", percentage: 100, title: title, source: source }];
		}
		const item = intervalItem(source, kind, "upperBoundary", "lowerBoundary", titleCase(title), detail);
		if(item) item.components = components;
		return item;
	}
	function track(key, title, items, detail) {
		items = items.filter(Boolean).sort((left, right) =>
			left.beginDepth - right.beginDepth || left.endDepth - right.endDepth);
		return { key: key, title: title, detail: detail || "", items: items };
	}
	function descriptionTracks(xml) {
		let descriptions = descendants(xml, "boreholeSampleDescription");
		if(!descriptions.length && descendants(xml, "soilLayer").length) descriptions = [xml];
		return descriptions.map((description, index) => {
			const result = directValues(description, "result")[0] || description;
			const items = ["litterLayer", "soilLayer", "consolidatedRockLayer"]
				.reduce((all, kind) => all.concat(directValues(result, kind)
					.map(value => layerItem(value, kind))), []);
			return track("layers-" + index,
				descriptions.length > 1 ? "Bodemprofiel " + (index + 1) : "Bodemprofiel", items,
				join([childText(description, "descriptionMethod"), childText(description, "descriptionLocation")]))
		}).filter(value => value.items.length);
	}
	function intervalTracks(xml) {
		const removed = track("removedLayer", "Verwijderde lagen", descendants(xml, "removedLayer")
			.map(source => intervalItem(source, "removedLayer", "upperBoundary", "lowerBoundary",
				childText(source, "removedMaterial") || "Verwijderde laag", "")));
		const bored = track("boredInterval", "Boortrajecten", descendants(xml, "boringTool")
			.map(tool => {
				const interval = directValues(tool, "boredInterval")[0];
				return interval && intervalItem(interval, "boredInterval", "beginDepth", "endDepth",
					childText(tool, "boringToolType") || "Geboord interval",
					childText(tool, "boringToolDiameter") ?
						"Ø " + childText(tool, "boringToolDiameter") + " mm" : "");
			}));
		const investigated = track("investigatedInterval", "Onderzochte intervallen",
			descendants(xml, "investigatedInterval").map(wrapper => {
				const source = directValues(wrapper, "InvestigatedInterval")[0] || wrapper;
				return intervalItem(source, "investigatedInterval", "beginDepth", "endDepth",
					childText(source, "analysisType") || "Onderzocht interval",
					childText(source, "locationSpecific") === "ja" ? "locatiespecifiek" : "");
			}));
		return [removed, bored, investigated].filter(value => value.items.length);
	}
	function marker(source, name, title, color) {
		const depth = childNumber(source, name);
		return depth === null ? null : { depth: depth, title: title, color: color, source: source };
	}
	function markersOf(xml) {
		const result = descendants(xml, "result")[0] || xml;
		return [
			marker(result, "meanHighestGroundwaterLevel", "Gemiddeld hoogste grondwaterstand", "#2c83c9"),
			marker(result, "meanLowestGroundwaterLevel", "Gemiddeld laagste grondwaterstand", "#245d9b"),
			marker(result, "rootPenetrableDepth", "Bewortelbare diepte", "#4b8f43")
		].filter(Boolean);
	}
	function model(result) {
		const xml = xmlOf(result);
		const tracks = descriptionTracks(xml).concat(intervalTracks(xml));
		const items = tracks.reduce((all, value) => all.concat(value.items), []);
		const markers = markersOf(xml);
		const trajectoryDepths = descendants(xml, "boredTrajectory")
			.map(value => childNumber(value, "endDepth")).filter(value => value !== null);
		const maximumItemDepth = items.reduce((maximum, item) => Math.max(maximum, item.endDepth), 0);
		const maximumMarkerDepth = markers.reduce((maximum, value) => Math.max(maximum, value.depth), 0);
		const finalDepth = Math.max.apply(Math, [0].concat(trajectoryDepths,
			descendants(xml, "boredInterval").map(value => childNumber(value, "endDepth"))
				.filter(value => value !== null)));
		const maximumDepth = Math.max(maximumItemDepth, maximumMarkerDepth, finalDepth);
		const broId = textOf(descendants(xml, "broId")[0]) ||
			textOf(descendants(xml, "objectIdAccountableParty")[0]);
		const description = descendants(xml, "boreholeSampleDescription")[0] || {};
		const classification = descendants(description, "soilClassification")[0] || {};
		const verticalPosition = descendants(xml, "deliveredVerticalPosition")[0] || {};
		const offset = childText(verticalPosition, "offset");
		return {
			xml: xml,
			tracks: tracks,
			items: items,
			markers: markers,
			maximumDepth: maximumDepth,
			finalDepth: finalDepth,
			broId: broId,
			metadata: [
				{ label: "ID", value: broId },
				{ label: "Kwaliteitsregime", value: textOf(descendants(xml, "qualityRegime")[0]) },
				{ label: "Discipline", value: textOf(descendants(xml, "discipline")[0]) },
				{ label: "Doel onderzoek", value: textOf(descendants(xml, "surveyPurpose")[0]) },
				{ label: "Beschrijfmethode", value: childText(description, "descriptionMethod") },
				{ label: "Beschrijflocatie", value: childText(description, "descriptionLocation") },
				{ label: "Bodemclassificatie", value: join([
					childText(classification, "classificationCode"), childText(classification, "soilClass")
				], ", ") },
				{ label: "Aangeleverde locatie", value: textOf(descendants(xml, "pos")[0]) },
				{ label: "Verticale positie", value: join([
					offset ? offset + " m" : "", childText(verticalPosition, "verticalDatum"),
					childText(verticalPosition, "localVerticalReferencePoint")
				], ", ") },
				{ label: "Startdatum boring", value: textOf(descendants(xml, "boringStartDate")[0]) },
				{ label: "Einddatum boring", value: textOf(descendants(xml, "boringEndDate")[0]) },
				{ label: "Einddiepte", value: finalDepth ? formatNumber(finalDepth) + " m" : "" }
			].filter(item => item.value),
			type: result && result.type || "bro-bhr",
			version: result && result.version || ""
		};
	}
	function escapeHtml(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
	}
	function niceTickStep(maximumDepth) {
		const rough = maximumDepth / 10;
		const exponent = Math.pow(10, Math.floor(Math.log(rough || 1) / Math.LN10));
		const fraction = rough / exponent;
		return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
	}
	function patternId(name, suffix) {
		return name + "-" + suffix;
	}
	function materialFill(kind, suffix) {
		const material = MATERIALS[kind] || MATERIALS.soil;
		return "url(#" + patternId(material.pattern, suffix) + ")";
	}
	function svgPatterns(suffix) {
		return "<defs>" +
			"<pattern id='" + patternId("bhr-organic", suffix) + "' width='12' height='9' patternUnits='userSpaceOnUse'><rect width='12' height='9' fill='#755133'/><path d='M0 3h5l2 2h5M2 8h6' fill='none' stroke='#c19b6c'/></pattern>" +
			"<pattern id='" + patternId("bhr-clay", suffix) + "' width='9' height='9' patternUnits='userSpaceOnUse' patternTransform='rotate(35)'><rect width='9' height='9' fill='#4b9c54'/><path d='M0 1h9' stroke='#287532' stroke-width='1.4'/></pattern>" +
			"<pattern id='" + patternId("bhr-silt", suffix) + "' width='7' height='7' patternUnits='userSpaceOnUse'><rect width='7' height='7' fill='#d6d2bd'/><path d='M2 0v7M5 0v7' stroke='#aaa68f' stroke-width='.7'/></pattern>" +
			"<pattern id='" + patternId("bhr-sand", suffix) + "' width='12' height='12' patternUnits='userSpaceOnUse'><rect width='12' height='12' fill='#edcf45'/><circle cx='2' cy='3' r='1' fill='#8c7b22'/><circle cx='9' cy='7' r='.8' fill='#8c7b22'/></pattern>" +
			"<pattern id='" + patternId("bhr-gravel", suffix) + "' width='13' height='13' patternUnits='userSpaceOnUse'><rect width='13' height='13' fill='#c99742'/><path d='M1 4q3-4 5 0t5 0M2 10q2-3 4 0t5 0' fill='none' stroke='#805f28' stroke-width='1.2'/></pattern>" +
			"<pattern id='" + patternId("bhr-soil", suffix) + "' width='8' height='8' patternUnits='userSpaceOnUse'><rect width='8' height='8' fill='#c8aa6b'/><circle cx='2' cy='2' r='.8' fill='#806b42'/></pattern>" +
			"<pattern id='" + patternId("bhr-rock", suffix) + "' width='12' height='12' patternUnits='userSpaceOnUse'><rect width='12' height='12' fill='#8e99a3'/><path d='M0 6h12M6 0v6M3 6v6' stroke='#626d76'/></pattern>" +
			"</defs>";
	}
	function itemTooltip(item) {
		return join([item.title, formatNumber(item.beginDepth) + "–" + formatNumber(item.endDepth) + " m", item.detail], "\n");
	}
	function svg(model_, options) {
		options = options || {};
		const instanceAttrs = (instance, label, meta) => typeof options.instanceAttrs === "function" ?
			options.instanceAttrs(instance, label, meta) : "";
		const suffix = ++svgSequence;
		const maximumDepth = Math.max(model_.maximumDepth || 0, 1);
		const tickStep = niceTickStep(maximumDepth);
		const displayedDepth = Math.ceil(maximumDepth / tickStep) * tickStep;
		const layerTracks = model_.tracks.filter(value => /^layers-/.test(value.key));
		const intervalTracks = model_.tracks.filter(value => !/^layers-/.test(value.key));
		const axisWidth = 76;
		const layerWidth = 320;
		const profileWidth = 92;
		const intervalWidth = 145;
		const gap = 14;
		const top = 78;
		const bottom = 34;
		const plotHeight = Math.max(520, Math.min(1400, displayedDepth * 72));
		const plottedWidth = layerTracks.length * (layerWidth + gap) + intervalTracks.length * (intervalWidth + gap);
		const metadataX = axisWidth + plottedWidth + 10;
		const metadataWidth = model_.metadata.length ? 350 : 0;
		const width = metadataX + metadataWidth + 18;
		const height = top + plotHeight + bottom;
		const scale = plotHeight / displayedDepth;
		let content = "<svg class='bhr-log' xmlns='http://www.w3.org/2000/svg' width='" + width +
			"' height='" + height + "' viewBox='0 0 " + width + " " + height + "'>" + svgPatterns(suffix);
		for(let depth = 0; depth <= displayedDepth + tickStep / 100; depth += tickStep) {
			const y = top + depth * scale;
			content += "<line class='depth-grid' x1='" + axisWidth + "' y1='" + y + "' x2='" +
				(metadataX - gap) + "' y2='" + y + "'/><text class='depth-label' x='" + (axisWidth - 10) +
				"' y='" + (y + 4) + "'>" + escapeHtml(formatNumber(depth)) + " m</text>";
		}
		content += "<text class='depth-axis-title' transform='translate(17 " + (top + plotHeight / 2) +
			") rotate(-90)'>Diepte t.o.v. maaiveld</text>";
		layerTracks.forEach((track_, trackIndex) => {
			const x = axisWidth + trackIndex * (layerWidth + gap);
			content += "<text class='track-title' x='" + (x + 8) + "' y='25'>" + escapeHtml(track_.title) +
				"</text><text class='track-detail' x='" + (x + 8) + "' y='46'>" +
				escapeHtml(track_.detail || track_.items.length + " lagen") + "</text>" +
				"<rect class='profile-background' x='" + x + "' y='" + top + "' width='" + profileWidth +
				"' height='" + plotHeight + "'/>";
			track_.items.forEach(item => {
				const y = top + item.beginDepth * scale;
				const itemHeight = Math.max(2, (item.endDepth - item.beginDepth) * scale);
				content += "<g class='profile-layer interval-" + escapeHtml(item.kind) + "'" +
					instanceAttrs(item.source, "Open " + (KIND_LABELS[item.kind] || item.title), {
						type: KIND_LABELS[item.kind] || "Bodemlaag",
						label: formatNumber(item.beginDepth) + "–" + formatNumber(item.endDepth) + " m"
					}) + "><title>" + escapeHtml(itemTooltip(item)) + "</title>";
				let bandX = x;
				(item.components || []).forEach(component => {
					const bandWidth = profileWidth * component.percentage / 100;
					content += "<rect class='component-band' x='" + bandX + "' y='" + y + "' width='" +
						bandWidth + "' height='" + itemHeight + "' fill='" + materialFill(component.kind, suffix) + "'" +
						instanceAttrs(component.source, "Open laagcomponent " + component.title, {
							type: "Laagcomponent",
							label: component.title + " (" + formatNumber(component.percentage) + "%)"
						}) + "/>";
					bandX += bandWidth;
				});
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
			const x = axisWidth + layerTracks.length * (layerWidth + gap) + trackIndex * (intervalWidth + gap);
			content += "<text class='track-title' x='" + (x + 7) + "' y='25'>" + escapeHtml(track_.title) +
				"</text><text class='track-detail' x='" + (x + 7) + "' y='46'>" + track_.items.length +
				" interval" + (track_.items.length === 1 ? "" : "len") + "</text><rect class='track-background' x='" +
				x + "' y='" + top + "' width='" + intervalWidth + "' height='" + plotHeight + "'/>";
			track_.items.forEach(item => {
				const y = top + item.beginDepth * scale;
				const itemHeight = Math.max(2, (item.endDepth - item.beginDepth) * scale);
				content += "<g class='interval interval-" + escapeHtml(item.kind) + "'" +
					instanceAttrs(item.source, "Open " + (KIND_LABELS[item.kind] || item.title), {
						type: KIND_LABELS[item.kind] || "Diepte-interval",
						label: formatNumber(item.beginDepth) + "–" + formatNumber(item.endDepth) + " m"
					}) + "><title>" + escapeHtml(itemTooltip(item)) + "</title><rect x='" + x + "' y='" + y +
					"' width='" + intervalWidth + "' height='" + itemHeight + "' fill='" + item.color + "'/>";
				if(itemHeight >= 17) content += "<text class='item-title' x='" + (x + 7) + "' y='" +
					(y + 14) + "'>" + escapeHtml(item.title) + "</text>";
				if(itemHeight >= 34 && item.detail) content += "<text class='item-detail' x='" + (x + 7) + "' y='" +
					(y + 29) + "'>" + escapeHtml(item.detail) + "</text>";
				content += "</g>";
			});
		});
		model_.markers.forEach(marker_ => {
			const y = top + marker_.depth * scale;
			content += "<g class='depth-marker'" + instanceAttrs(marker_.source, "Open " + marker_.title, {
				type: marker_.title, label: formatNumber(marker_.depth) + " m"
			}) + "><line x1='" + axisWidth + "' y1='" + y + "' x2='" + (metadataX - gap) + "' y2='" + y +
				"' stroke='" + marker_.color + "'/><text x='" + (axisWidth + 5) + "' y='" + (y - 4) + "' fill='" +
				marker_.color + "'>" + escapeHtml(marker_.title + " " + formatNumber(marker_.depth) + " m") + "</text></g>";
		});
		if(metadataWidth) {
			content += "<g class='profile-metadata'><text class='metadata-title'" + instanceAttrs(model_.xml,
				"Open BHR XML-document", { type: "BHR document", label: model_.broId }) + " x='" + metadataX +
				"' y='25'>Registratie en boring</text>";
			model_.metadata.forEach((item, index) => {
				const y = top + index * 24;
				content += "<text class='metadata-label' x='" + metadataX + "' y='" + y + "'>" +
					escapeHtml(item.label) + ":</text><text class='metadata-value' x='" + (metadataX + 145) +
					"' y='" + y + "'>" + escapeHtml(item.value) + "</text>";
			});
			content += "</g>";
		}
		return content + "</svg>";
	}
	function render(model_, options) {
		if(!model_ || !model_.tracks.length) {
			return "<div class='bhr-empty'>Geen bodemlagen of diepte-intervallen gevonden in dit BHR-document.</div>";
		}
		const summary = [
			model_.broId ? "<strong>" + escapeHtml(model_.broId) + "</strong>" : "",
			model_.finalDepth ? "Einddiepte " + escapeHtml(formatNumber(model_.finalDepth)) + " m" : "",
			model_.items.length + " diepteobjecten"
		].filter(Boolean).join("<span class='bhr-separator'>·</span>");
		const used = {};
		model_.items.forEach(item => (item.components || []).forEach(component => used[component.kind] = true));
		const materialLegend = Object.keys(used).map(kind => {
			const material = MATERIALS[kind] || MATERIALS.soil;
			return "<span class='bhr-legend-item'><i style='background:" + escapeHtml(material.color) + "'></i>" +
				escapeHtml(material.label) + "</span>";
		}).join("");
		const intervalKinds = {};
		model_.items.filter(item => !item.components).forEach(item => intervalKinds[item.kind] = item);
		const intervalLegend = Object.keys(intervalKinds).map(kind => "<span class='bhr-legend-item'><i style='background:" +
			escapeHtml(intervalKinds[kind].color) + "'></i>" + escapeHtml(KIND_LABELS[kind] || titleCase(kind)) + "</span>").join("");
		return "<div class='bhr-preview-header'>" + summary + "</div><div class='bhr-preview-scroll'>" +
			svg(model_, options) + "</div><div class='bhr-legend'>" + materialLegend + intervalLegend + "</div>";
	}

	return {
		COLORS: COLORS,
		KIND_LABELS: KIND_LABELS,
		MATERIALS: MATERIALS,
		descendants: descendants,
		directValues: directValues,
		model: model,
		normalizeComponents: normalizeComponents,
		render: render,
		svg: svg,
		textOf: textOf,
		xmlOf: xmlOf
	};
});
