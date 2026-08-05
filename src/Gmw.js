define(function() {
	"use strict";

	const STATUS_COLORS = {
		gebruiksklaar: "#35a853",
		nietGebruiksklaar: "#377bd1",
		onbruikbaar: "#d94b45",
		onbekend: "#929aa3"
	};
	const PLOT_HEIGHT_FACTOR = 0.8;
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
	function attribute(value, name) {
		if(!value || typeof value !== "object") return "";
		const key = Object.keys(value).filter(candidate =>
			isAttributeKey(candidate) && localName(candidate.replace(/^@_?/, "")) === name)[0];
		return key ? String(value[key]) : "";
	}
	function formatNumber(value) {
		if(!isFinite(value)) return "";
		return String(Math.round(value * 1000) / 1000).replace(".", ",");
	}
	function positiveMeasure(value) {
		const number = parseFloat(String(value || "").replace(",", "."));
		return isFinite(number) && number > 0 ? value : "";
	}
	function titleCase(value) {
		value = String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2");
		return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
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
	function documentRootKey(obj) {
		if(!obj || typeof obj !== "object" || Array.isArray(obj)) return null;
		return Object.keys(obj).filter(key => {
			const name = localName(key);
			const value = obj[key];
			return !isAttributeKey(key) && value && typeof value === "object" &&
				(/(?:Request|Response)$/.test(name) || /^GMW(?:_|$)/.test(name));
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
	function documentInfo(xml) {
		const rootKey = documentRootKey(xml);
		const message = rootKey ? xml[rootKey] : xml;
		const dispatch = descendants(message, "dispatchDocument")[0];
		const source = descendants(message, "sourceDocument")[0];
		let entry = firstPayloadEntry(dispatch) || firstPayloadEntry(source);
		if(!entry && rootKey && /^GMW(?:_|$)/.test(localName(rootKey))) {
			entry = { key: rootKey, value: message };
		}
		if(!entry) {
			const find = (value, seen) => {
				if(!value || typeof value !== "object" || seen.indexOf(value) !== -1) return null;
				seen.push(value);
				const key = Object.keys(value).filter(candidate => /^GMW(?:_|$)/.test(localName(candidate)))[0];
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
			report: entry && localName(entry.key) || "GMW",
			message: rootKey && localName(rootKey) || "",
			messageKind: dispatch || /Response$/.test(localName(rootKey)) ? "uitgifte" : "inname"
		};
	}
	function dateText(value) {
		return childText(value, ["date", "yearMonth", "year"]) || textOf(value);
	}
	function eventRows(document, info) {
		const events = [];
		const construction = descendants(document, "wellConstructionDate")[0];
		if(construction) {
			events.push({ name: "Put ingericht", date: dateText(construction), kind: "construction",
				source: construction });
		}
		descendants(document, "intermediateEvent").forEach(event => {
			events.push({
				name: titleCase(childText(event, "eventName") || "Tussentijdse gebeurtenis"),
				date: dateText(directValues(event, "eventDate")[0]),
				kind: childText(event, "eventName") || "event",
				source: event
			});
		});
		if(!events.length && info.report && info.report !== "GMW_Construction") {
			events.push({
				name: titleCase(info.report.replace(/^GMW_/, "")),
				date: dateText(directValues(document, "eventDate")[0]) ||
					dateText(directValues(document, "wellRemovalDate")[0]),
				kind: info.report,
				source: document
			});
		}
		return events;
	}
	function tubeModel(tube, groundLevel, index) {
		const screen = directValues(tube, "screen")[0] || {};
		const plain = directValues(tube, "plainTubePart")[0] || {};
		const sump = directValues(tube, "sedimentSump")[0] || {};
		const material = directValues(tube, "materialUsed")[0] || {};
		const tubeTop = childNumber(tube, "tubeTopPosition");
		const plainLength = childNumber(plain, "plainTubePartLength");
		const screenLength = childNumber(screen, "screenLength");
		let screenTop = childNumber(screen, "screenTopPosition");
		let screenBottom = childNumber(screen, "screenBottomPosition");
		const inferredScreenTop = screenTop === null && tubeTop !== null && plainLength !== null;
		const inferredScreenBottom = screenBottom === null && screenLength !== null &&
			(screenTop !== null || inferredScreenTop);
		if(inferredScreenTop) screenTop = tubeTop - plainLength;
		if(inferredScreenBottom) screenBottom = screenTop - screenLength;
		const sumpLength = childNumber(sump, ["sedimentSumpLength", "length"]);
		const tubeBottom = screenBottom !== null ? screenBottom - (sumpLength || 0) :
			(tubeTop !== null && plainLength !== null && screenLength !== null ?
				tubeTop - plainLength - screenLength - (sumpLength || 0) : null);
		const reference = groundLevel !== null ? groundLevel : tubeTop;
		const depth = position => reference !== null && position !== null ? reference - position : null;
		const status = childText(tube, "tubeStatus") || "onbekend";
		return {
			number: childText(tube, "tubeNumber") || String(index + 1),
			type: childText(tube, "tubeType"),
			status: status,
			statusColor: STATUS_COLORS[status] || STATUS_COLORS.onbekend,
			diameter: childText(tube, "tubeTopDiameter"),
			diameterUnit: attribute(directValues(tube, "tubeTopDiameter")[0], "uom") || "mm",
			material: childText(material, "tubeMaterial"),
			glue: childText(material, "glue"),
			packing: childText(material, "tubePackingMaterial"),
			sock: childText(screen, "sockMaterial"),
			tubeTop: tubeTop,
			screenTop: screenTop,
			screenBottom: screenBottom,
			tubeBottom: tubeBottom,
			plainLength: plainLength,
			screenLength: screenLength,
			sumpLength: sumpLength,
			topDepth: depth(tubeTop),
			screenTopDepth: depth(screenTop),
			screenBottomDepth: depth(screenBottom),
			bottomDepth: depth(tubeBottom),
			inferredPositions: inferredScreenTop || inferredScreenBottom,
			plainSource: plain,
			screenSource: screen,
			sumpSource: sump,
			materialSource: material,
			electrodes: descendants(tube, "electrode").map((electrode, electrodeIndex) => {
				const position = childNumber(electrode, "electrodePosition");
				return {
					number: childText(electrode, "electrodeNumber") || String(electrodeIndex + 1),
					status: childText(electrode, "electrodeStatus") || "onbekend",
					position: position,
					depth: depth(position),
					source: electrode
				};
			}),
			source: tube
		};
	}
	function model(result) {
		const xml = xmlOf(result);
		const info = documentInfo(xml);
		const document = info.document || {};
		const vertical = descendants(document, "deliveredVerticalPosition")[0] || {};
		let groundLevel = childNumber(vertical, "groundLevelPosition");
		if(groundLevel === null) groundLevel = childNumber(document, "groundLevelPosition");
		const tubes = descendants(document, "monitoringTube")
			.filter(tube => directValues(tube, "tubeNumber").length || directValues(tube, "screen").length)
			.map((tube, index) => tubeModel(tube, groundLevel, index));
		const depths = [0];
		tubes.forEach(tube => {
			[tube.topDepth, tube.screenTopDepth, tube.screenBottomDepth, tube.bottomDepth]
				.concat(tube.electrodes.map(electrode => electrode.depth))
				.filter(value => value !== null).forEach(value => depths.push(value));
		});
		const broId = textOf(descendants(document, "broId")[0]) ||
			textOf(descendants(document, "objectIdAccountableParty")[0]);
		const events = eventRows(document, info);
		const metadata = [
			{ label: "ID", value: broId },
			{ label: "Bericht", value: titleCase(info.messageKind) + (info.message ? " · " + info.message : "") },
			{ label: "Brondocument", value: info.report },
			{ label: "Kwaliteitsregime", value: textOf(descendants(xml, "qualityRegime")[0]) },
			{ label: "Putcode", value: childText(document, ["wellCode", "nitgCode", "mapSheetCode"]) },
			{ label: "Eigenaar", value: childText(document, "owner") },
			{ label: "Initiële functie", value: childText(document, "initialFunction") },
			{ label: "Beschermconstructie", value: childText(document, "wellHeadProtector") },
			{ label: "Maaiveld", value: groundLevel !== null ? formatNumber(groundLevel) + " m " +
				(childText(vertical, ["verticalDatum", "localVerticalReferencePoint"]) || "") : "" },
			{ label: "Locatie", value: textOf(descendants(document, "pos")[0]) },
			{ label: "Aantal buizen", value: tubes.length ? String(tubes.length) : "" }
		].filter(item => item.value);
		const overview = {};
		metadata.forEach(item => overview[item.label] = item.value);
		const shallowestDepth = Math.min.apply(Math, depths);
		const deepestDepth = Math.max.apply(Math, depths.concat([1]));
		const depthPadding = Math.max((deepestDepth - shallowestDepth) * 0.05, 0.05);
		return {
			xml: xml,
			document: document,
			info: info,
			broId: broId,
			groundLevel: groundLevel,
			tubes: tubes,
			events: events,
			metadata: metadata,
			minimumDepth: Math.min(0, shallowestDepth) - depthPadding,
			maximumDepth: deepestDepth + depthPadding,
			type: result && result.type || "bro-gmw",
			version: result && result.version || "",
			view: {
				Overzicht: [overview],
				Buizen: tubes.map(tube => ({
					Buis: tube.number,
					Status: tube.status,
					Type: tube.type,
					Diameter: positiveMeasure(tube.diameter) ? tube.diameter + " " + tube.diameterUnit : "",
					Bovenkant: tube.tubeTop,
					Filterbovenkant: tube.screenTop,
					Filteronderkant: tube.screenBottom,
					Materiaal: tube.material,
					Lijm: tube.glue
				})),
				Gebeurtenissen: events.map(event => ({
					Gebeurtenis: event.name,
					Datum: event.date
				}))
			}
		};
	}
	function niceTickStep(range) {
		const rough = range / 9;
		const exponent = Math.pow(10, Math.floor(Math.log(rough || 1) / Math.LN10));
		const fraction = rough / exponent;
		return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10) * exponent;
	}
	function metadataTarget(item, document) {
		const value = item && (item.source !== undefined ? item.source : item.value);
		return value && typeof value === "object" ? value : document;
	}
	function svg(model_, options) {
		options = options || {};
		const instanceAttrs = (instance, label, meta) => typeof options.instanceAttrs === "function" ?
			options.instanceAttrs(instance, label, meta) : "";
		const screenPatternId = "gmw-screen-" + (++svgSequence);
		const minimum = model_.minimumDepth;
		const maximum = model_.maximumDepth;
		const range = Math.max(maximum - minimum, 1);
		const tick = niceTickStep(range);
		const axisWidth = 78;
		const trackWidth = 240;
		const plotWidth = Math.max(trackWidth, model_.tubes.length * trackWidth);
		const metadataWidth = 430;
		const metadataGap = 38;
		const top = 72;
		const bottom = 38;
		const plotHeight = Math.round(Math.max(480, Math.min(1050, range * 62)) * PLOT_HEIGHT_FACTOR);
		const width = axisWidth + plotWidth + metadataWidth + metadataGap + 18;
		const height = top + plotHeight + bottom;
		const scale = plotHeight / range;
		const yOf = depth => top + (depth - minimum) * scale;
		const groundY = yOf(0);
		let content = "<svg class='gmw-profile' xmlns='http://www.w3.org/2000/svg' width='" + width +
			"' height='" + height + "' viewBox='0 0 " + width + " " + height + "'>";
		content += "<defs><pattern id='" + screenPatternId + "' width='7' height='7' patternUnits='userSpaceOnUse' " +
			"patternTransform='rotate(45)'><rect width='7' height='7' fill='#dceaf7'/><line y2='7' " +
			"stroke='#377bd1' stroke-width='2'/></pattern></defs>";
		content += "<rect class='gmw-soil' x='" + axisWidth + "' y='" + groundY + "' width='" + plotWidth +
			"' height='" + Math.max(0, top + plotHeight - groundY) + "'/>";
		const firstTick = Math.ceil(minimum / tick) * tick;
		for(let depth = firstTick; depth <= maximum + tick / 100; depth += tick) {
			const y = yOf(depth);
			content += "<line class='depth-grid' x1='" + axisWidth + "' y1='" + y + "' x2='" +
				(axisWidth + plotWidth) + "' y2='" + y + "'/><text class='depth-label' x='" +
				(axisWidth - 10) + "' y='" + (y + 4) + "'>" + escapeHtml(formatNumber(depth)) + " m</text>";
		}
		content += "<line class='ground-line' x1='" + axisWidth + "' y1='" + groundY + "' x2='" +
			(axisWidth + plotWidth) + "' y2='" + groundY + "'/><text class='ground-label' x='" +
			(axisWidth + 8) + "' y='" + (groundY - 8) + "'>Maaiveld" +
			(model_.groundLevel !== null ? " · " + escapeHtml(formatNumber(model_.groundLevel)) + " m" : "") + "</text>";
		content += "<text class='depth-axis-title' transform='translate(17 " + (top + plotHeight / 2) +
			") rotate(-90)'>Diepte t.o.v. maaiveld</text>";
		model_.tubes.forEach((tube, index) => {
			const center = axisWidth + trackWidth * index + trackWidth * 0.78;
			const topDepth = tube.topDepth !== null ? tube.topDepth : minimum;
			const screenTopDepth = tube.screenTopDepth !== null ? tube.screenTopDepth : topDepth;
			const screenBottomDepth = tube.screenBottomDepth !== null ? tube.screenBottomDepth : tube.bottomDepth;
			const bottomDepth = tube.bottomDepth !== null ? tube.bottomDepth : screenBottomDepth;
			const topY = yOf(topDepth);
			const screenTopY = yOf(screenTopDepth);
			const screenBottomY = yOf(screenBottomDepth);
			const bottomY = yOf(bottomDepth);
			const tooltip = "Buis " + tube.number + " · " + tube.status +
				(tube.inferredPositions ? " · filterposities afgeleid uit lengtes" : "");
			content += "<g class='monitoring-tube'" + instanceAttrs(tube.source,
				"Open peilbuis " + tube.number, { type: "Peilbuis", label: tube.number }) + "><title>" +
				escapeHtml(tooltip) + "</title>";
			content += "<text class='tube-title' x='" + center + "' y='25'>Buis " + escapeHtml(tube.number) + "</text>";
			content += "<text class='tube-detail' x='" + center + "' y='45'>" +
				escapeHtml([tube.status, positiveMeasure(tube.diameter) ?
					"Ø " + tube.diameter + " " + tube.diameterUnit : ""]
					.filter(Boolean).join(" · ")) + "</text>";
			content += "<rect class='plain-tube'" + instanceAttrs(tube.plainSource,
				"Open blinde buis", { type: "Blinde buis", parent: tube.source }) + " x='" + (center - 8) +
				"' y='" + topY + "' width='16' height='" + Math.max(2, screenTopY - topY) +
				"'/><rect class='screen' fill='url(#" + screenPatternId + ")'" + instanceAttrs(tube.screenSource,
					"Open filter", { type: "Filter", parent: tube.source }) + " x='" + (center - 15) + "' y='" +
				screenTopY + "' width='30' height='" + Math.max(3, screenBottomY - screenTopY) + "'/>";
			if(bottomY > screenBottomY) content += "<rect class='sump'" + instanceAttrs(tube.sumpSource,
				"Open zandvang", { type: "Zandvang", parent: tube.source }) + " x='" + (center - 8) + "' y='" +
				screenBottomY + "' width='16' height='" + Math.max(2, bottomY - screenBottomY) + "'/>";
			content += "<line class='tube-cap' x1='" + (center - 13) + "' y1='" + topY + "' x2='" +
				(center + 13) + "' y2='" + topY + "'/>";
			content += "<text class='position-label' x='" + (center - 22) + "' y='" + (screenTopY + 4) +
				"'>filter " + escapeHtml(formatNumber(screenTopDepth)) + "–" +
				escapeHtml(formatNumber(screenBottomDepth)) + " m</text>";
			tube.electrodes.filter(electrode => electrode.depth !== null).forEach(electrode => {
				content += "<circle class='electrode electrode-" + escapeHtml(electrode.status) + "'" +
					instanceAttrs(electrode.source, "Open elektrode " + electrode.number,
						{ type: "Elektrode", label: electrode.number, parent: tube.source }) + " cx='" +
					(center - 25) + "' cy='" + yOf(electrode.depth) + "' r='5'><title>Elektrode " +
					escapeHtml(electrode.number + " · " + electrode.status) + "</title></circle>";
			});
			content += "</g>";
		});
		const metadataX = axisWidth + plotWidth + metadataGap;
		content += "<line class='metadata-divider' x1='" + (metadataX - 20) + "' y1='18' x2='" +
			(metadataX - 20) + "' y2='" + (height - 18) + "'/>";
		content += "<g class='profile-metadata'><text class='metadata-title' x='" + metadataX +
			"' y='25'>Grondwatermonitoringput</text>";
		model_.metadata.forEach((item, index) => {
			const y = top + index * 24;
			const isId = item.label === "ID";
			const linksToBroLoket = isId && isBroId(item.value);
			content += (linksToBroLoket ? "<a class='metadata-row bro-id-link'" + broLoketLinkAttrs(item.value) :
				"<g class='metadata-row'" + instanceAttrs(metadataTarget(item, model_.document),
				"Open " + item.label, { type: "GMW detail", label: item.label, direct: true })) +
				"><text class='metadata-label' x='" + metadataX + "' y='" + y + "'>" +
				escapeHtml(item.label) + ":</text><text class='metadata-value' x='" + (metadataX + 150) +
				"' y='" + y + "'>" + escapeHtml(item.value) + "</text>" + (linksToBroLoket ? "</a>" : "</g>");
		});
		const eventsY = top + model_.metadata.length * 24 + 26;
		content += "<text class='metadata-title' x='" + metadataX + "' y='" + eventsY + "'>Gebeurtenissen</text>";
		model_.events.forEach((event, index) => {
			const y = eventsY + 25 + index * 34;
			content += "<g class='gmw-event'" + instanceAttrs(event.source,
				"Open gebeurtenis " + event.name, { type: "Gebeurtenis", label: event.name,
					parent: model_.document }) + "><circle class='event-dot' cx='" + (metadataX + 4) + "' cy='" + (y - 4) +
				"' r='4'/><text class='event-title' x='" + (metadataX + 17) + "' y='" + y + "'>" +
				escapeHtml(event.name) + "</text><text class='event-date' x='" + (metadataX + 17) + "' y='" +
				(y + 14) + "'>" + escapeHtml(event.date) + "</text></g>";
		});
		content += "</g></svg>";
		return content;
	}
	function render(model_, options) {
		options = options || {};
		const instanceAttrs = (instance, label, meta) => typeof options.instanceAttrs === "function" ?
			options.instanceAttrs(instance, label, meta) : "";
		if(!model_ || !model_.tubes.length) {
			return "<div class='gmw-empty'>Geen buisprofiel gevonden in dit GMW-document.</div>";
		}
		const inferred = model_.tubes.some(tube => tube.inferredPositions);
		const summary = [
			model_.broId ? (isBroId(model_.broId) ? "<a class='gmw-preview-id bro-id-link'" +
				broLoketLinkAttrs(model_.broId) + "><strong>" + escapeHtml(model_.broId) + "</strong></a>" :
				"<strong class='gmw-preview-id'" + instanceAttrs(model_.document, "Open ID",
					{ type: "GMW detail", label: model_.broId, direct: true }) + ">" +
					escapeHtml(model_.broId) + "</strong>") : "",
			escapeHtml(titleCase(model_.info.messageKind)),
			model_.tubes.length + " peilbuis" + (model_.tubes.length === 1 ? "" : "zen")
		].filter(Boolean).join("<span class='gmw-separator'>·</span>");
		return "<div class='gmw-preview-header'>" + summary + "</div>" +
			"<div class='gmw-preview-scroll'>" + svg(model_, options) + "</div>" +
			"<div class='gmw-legend'><span><i class='legend-plain'></i>Blinde buis</span>" +
			"<span><i class='legend-screen'></i>Filter</span><span><i class='legend-ground'></i>Maaiveld</span>" +
			(inferred ? "<em>Filterposities zijn afgeleid uit buislengtes.</em>" : "") + "</div>";
	}

	return {
		STATUS_COLORS: STATUS_COLORS,
		descendants: descendants,
		directValues: directValues,
		documentInfo: documentInfo,
		model: model,
		render: render,
		svg: svg,
		textOf: textOf,
		xmlOf: xmlOf
	};
});
