"use js, bxv/Collectors, veldapps-xml/index, amcharts, amcharts.serial";

const Collectors = require("bxv/Collectors");
const Xml = require("veldapps-xml/index");

const GLD_CHART_COLOR = "rgb(56, 121, 217)";

function rootFor(component) {
	return component.up("Tabs<Document>:root") || component.up(":root") || component;
}
function displayValue(value) {
	if(value === undefined || value === null) {
		return "";
	}
	if(value instanceof Array) {
		return value.map(displayValue).filter(Boolean).join(", ");
	}
	if(typeof value !== "object") {
		return String(value);
	}
	const text = String(Xml.textOf(value) || "").trim();
	if(text) {
		return text;
	}
	return Xml.attr(value, "href") ||
		Xml.attr(value, "uom") ||
		Xml.attr(value, "id") ||
		Xml.attr(value, "date") ||
		Xml.attr(value, "time") ||
		"";
}
function firstDescendant(obj, name, seen) {
	seen = seen || [];
	if(obj instanceof Array) {
		for(let i = 0; i < obj.length; ++i) {
			const found = firstDescendant(obj[i], name, seen);
			if(found !== null) return found;
		}
		return null;
	}
	if(!obj || typeof obj !== "object" || seen.indexOf(obj) !== -1) {
		return null;
	}
	seen.push(obj);
	const direct = Xml.firstChild(obj, name);
	if(direct !== undefined) {
		return direct;
	}
	const keys = Object.keys(obj).filter(key => !Xml.isAttributeKey(key));
	for(let i = 0; i < keys.length; ++i) {
		const found = firstDescendant(obj[keys[i]], name, seen);
		if(found !== null) return found;
	}
	return null;
}
function descendants(obj, name, values, seen) {
	values = values || [];
	seen = seen || [];
	if(obj instanceof Array) {
		obj.forEach(value => descendants(value, name, values, seen));
		return values;
	}
	if(!obj || typeof obj !== "object" || seen.indexOf(obj) !== -1) {
		return values;
	}
	seen.push(obj);
	Object.keys(obj).filter(key => !Xml.isAttributeKey(key)).forEach(key => {
		if(Xml.localName(key) === name) {
			Array.as(obj[key]).forEach(value => values.push(value));
		}
		descendants(obj[key], name, values, seen);
	});
	return values;
}
function namedValue(metadata, nameSuffix) {
	const candidate = descendants(metadata, "NamedValue").filter(value => {
		const name = displayValue(firstDescendant(value, "name"));
		return name === nameSuffix || name.endsWith(":" + nameSuffix);
	})[0];
	return candidate ? displayValue(firstDescendant(candidate, "value")) : "";
}
function sourceDocumentInfo(result) {
	const xml = result && (result.xml || result.root);
	const sourceDocument = xml && Collectors["bro->sourceDocument"](xml, ["isgld", "dsgld"]);
	const report = sourceDocument && Object.keys(sourceDocument)[0];
	return {
		xml: xml,
		report: report,
		document: report && sourceDocument[report]
	};
}
function measurementRows(timeseries) {
	const points = Xml.childValues(timeseries, "point");
	return points.map((point, index) => {
		const tvp = Xml.firstChild(point, "MeasurementTVP") || point;
		const time = displayValue(Xml.firstChild(tvp, "time"));
		const valueNode = Xml.firstChild(tvp, "value");
		const valueText = displayValue(valueNode);
		const value = parseFloat(String(valueText).replace(",", "."));
		const metadata = Xml.firstChild(tvp, "metadata");
		return {
			Volgnummer: index + 1,
			Tijdstip: time,
			Grondwaterstand: isFinite(value) ? value : valueText,
			Eenheid: Xml.attr(valueNode, "uom"),
			Metadata: displayValue(metadata)
		};
	});
}
function appendMetadataRows(rows, value, path, depth, seen) {
	if(value instanceof Array) {
		value.forEach((item, index) => appendMetadataRows(rows, item,
			path + "[" + index + "]", depth, seen));
		return rows;
	}
	if(value === undefined || value === null || typeof value !== "object") {
		if(value !== undefined && value !== null && String(value) !== "") {
			rows.push({ Veld: path, Waarde: value });
		}
		return rows;
	}
	if(seen.indexOf(value) !== -1 || depth > 6 || rows.length >= 500) {
		return rows;
	}
	seen.push(value);
	const text = displayValue(value);
	const keys = Object.keys(value);
	if(text) {
		rows.push({ Veld: path, Waarde: text });
	}
	keys.filter(Xml.isAttributeKey).forEach(key => {
		rows.push({
			Veld: path + ".@" + Xml.localName(key),
			Waarde: value[key]
		});
	});
	keys.filter(key => !Xml.isAttributeKey(key) && key !== "#text")
		.forEach(key => appendMetadataRows(rows, value[key],
			path ? path + "." + Xml.localName(key) : Xml.localName(key), depth + 1, seen));
	return rows;
}
function metadataRows(metadata, process) {
	const rows = [];
	appendMetadataRows(rows, metadata, "Observatiemetadata", 0, []);
	appendMetadataRows(rows, process, "Proces", 0, []);
	return rows;
}
function gldModel(result) {
	const info = sourceDocumentInfo(result);
	const observation = firstDescendant(info.document, "OM_Observation") ||
		firstDescendant(info.document, "observation");
	const metadata = firstDescendant(observation, "ObservationMetadata") ||
		Xml.firstChild(observation, "metadata");
	const process = firstDescendant(observation, "ObservationProcess") ||
		Xml.firstChild(observation, "procedure");
	const timeseries = firstDescendant(observation, "MeasurementTimeseries");
	const measurements = measurementRows(timeseries || {});
	const firstMeasurement = measurements[0] || {};
	const phenomenonTime = Xml.firstChild(observation, "phenomenonTime");
	const resultTime = Xml.firstChild(observation, "resultTime");
	const header = {
		"Documenttype": result && result.type || "bro-gld",
		"Versie": result && result.version || "",
		"Rapport": info.report && info.report.split(":").pop() || "",
		"Observatie-ID": Xml.attr(observation, "gml:id") || Xml.attr(observation, "id"),
		"Observatietype": namedValue(metadata, "observationType"),
		"Status": displayValue(firstDescendant(metadata, "status")),
		"Begindatum": displayValue(firstDescendant(phenomenonTime, "beginPosition")),
		"Einddatum": displayValue(firstDescendant(phenomenonTime, "endPosition")),
		"Resultaattijd": displayValue(firstDescendant(resultTime, "timePosition") || resultTime),
		"Procesreferentie": displayValue(firstDescendant(process, "processReference")),
		"Meetwaarden": measurements.length,
		"Eenheid": firstMeasurement.Eenheid || ""
	};
	return {
		info: info,
		observation: observation,
		metadata: metadata,
		process: process,
		timeseries: timeseries,
		measurements: measurements,
		header: header,
		view: {
			Header: [header],
			Metadata: metadataRows(metadata, process),
			Grondwaterstanden: measurements
		}
	};
}
function applyGldView(root, result) {
	const model = gldModel(result);
	const alphaview = root.qs("#alphaview");
	const reflect = alphaview && alphaview.qs("#reflect");

	root.vars("document.bro-gld.model", model);
	root.vars("parser-document-root", model.view);
	result.view = model.view;
	root.vars("parser-document-result", result);
	if(alphaview) {
		alphaview.vars("sel", [model.view]);
		reflect && reflect.execute([model.view]);
	}
	return model;
}
function measurementDate(value) {
	const date = new Date(String(value || ""));
	return isNaN(date.getTime()) ? null : date;
}
function chartRows(model) {
	return model.measurements.map(row => ({
		date: measurementDate(row.Tijdstip),
		value: typeof row.Grondwaterstand === "number" ?
			row.Grondwaterstand : parseFloat(String(row.Grondwaterstand).replace(",", "."))
	})).filter(row => row.date && isFinite(row.value));
}
function scheduleGldPreviewRender(component, delay) {
	const render = () => {
		try {
			renderGldPreview(component);
		} catch(error) {
			rootFor(component).app().print("bro-gld.preview", error);
		}
	};
	if(component.setTimeout instanceof Function) {
		component.setTimeout("render-bro-gld-preview", render, delay || 0);
	} else {
		setTimeout(render, delay || 0);
	}
}
function renderGldPreview(component) {
	const root = rootFor(component);
	const preview = root.qs("#preview");
	const host = root.qs("#bro-gld-preview-chart") || preview;
	const node = host && host.getNode && host.getNode();
	const model = root.vars("document.bro-gld.model") ||
		gldModel(root.vars("parser-document-result"));
	const rows = chartRows(model);
	const unit = model.header.Eenheid || "";
	const current = preview && preview.vars("document.bro-gld.chart");

	if(current && current.clear instanceof Function) {
		current.clear();
		preview.vars("document.bro-gld.chart", null);
	}
	if(!node) {
		return rows;
	}
	node.innerHTML = "<div class='bro-gld-chart'></div>";
	const chartNode = node.querySelector(".bro-gld-chart");
	if(!rows.length) {
		chartNode.innerHTML = "<div class='bro-gld-empty'>Geen grondwaterstanden gevonden voor deze grafiek.</div>";
		return rows;
	}
	if(typeof AmCharts === "undefined" || !(AmCharts.makeChart instanceof Function)) {
		chartNode.innerHTML = "<div class='bro-gld-empty'>AmCharts is niet beschikbaar.</div>";
		return rows;
	}

	preview.vars("document.bro-gld.chart", AmCharts.makeChart(chartNode, {
		type: "serial",
		categoryField: "date",
		dataProvider: rows,
		graphs: [{
			id: "bro-gld-groundwater-level",
			title: "Grondwaterstand" + (unit ? " (" + unit + ")" : ""),
			valueField: "value",
			type: "line",
			lineThickness: 2,
			lineColor: GLD_CHART_COLOR,
			bullet: "round",
			bulletBorderAlpha: 1,
			bulletBorderColor: GLD_CHART_COLOR,
			bulletColor: "#FFFFFF",
			bulletSize: 4,
			hideBulletsCount: 100,
			connect: true,
			useLineColorForBulletBorder: true,
			balloonText: "<b>[[title]]</b><br>[[category]]<br><span style='font-size:16px;'>[[value]]" +
				(unit ? " " + unit : "") + "</span>"
		}],
		valueAxes: [{
			id: "bro-gld-value-axis",
			title: "Grondwaterstand" + (unit ? " (" + unit + ")" : ""),
			axisAlpha: 0.65,
			gridAlpha: 0.15
		}],
		categoryAxis: {
			parseDates: true,
			type: "date",
			minPeriod: "mm",
			dashLength: 1,
			minorGridEnabled: true,
			equalSpacing: false
		},
		chartCursor: {
			categoryBalloonEnabled: true,
			categoryBalloonDateFormat: "YYYY-MM-DD JJ:NN",
			color: "black",
			cursorAlpha: 0.5,
			cursorColor: "#e0e0e0",
			valueLineEnabled: true,
			valueLineBalloonEnabled: true,
			valueLineAlpha: 0.2,
			valueBalloonsEnabled: true,
			valueZoomable: true
		},
		chartScrollbar: {
			oppositeAxis: false,
			offset: 30,
			backgroundAlpha: 0.1,
			backgroundColor: "#888888",
			autoGridCount: true,
			color: "transparent",
			graphFillAlpha: 0,
			graphLineAlpha: 0.5,
			scrollbarHeight: 20,
			selectedBackgroundAlpha: 1,
			selectedBackgroundColor: "white",
			selectedGraphFillAlpha: 0,
			selectedGraphLineAlpha: 1,
			graph: "bro-gld-groundwater-level"
		},
		legend: {
			markerDisabledColor: "gray",
			useGraphSettings: true
		},
		mouseWheelZoomEnabled: true,
		mouseWheelScrollEnabled: false,
		precision: 3
	}));
	return rows;
}
function activateGldFacet(action) {
	const root = rootFor(action);
	const result = root.vars("parser-document-result");
	root.vars("document.facet", "bro-gld");
	root.vars("document.getSpecificFacet", null);
	root.vars("document.applySpecificFacet", null);
	root.vars("document.bro-gld.renderPreview", renderGldPreview);
	applyGldView(root, result);
	root.qs("#tab-preview").show();
	scheduleGldPreviewRender(action, 100);
}

[["veldapps-imbro/Tabs<Document.bro>"], {
	vars: {
		document: {
			"activate-facet": activateGldFacet,
			facet: "bro-gld",
			getSpecificFacet: null,
			applySpecificFacet: null,
			"bro-gld": {
				renderPreview: renderGldPreview
			}
		}
	}
}, [
	["#preview", {
		css: {
			"& .bro-gld-chart": "width:100%;height:100%;min-height:280px;background:white;",
			"& .bro-gld-empty": "padding:40px;text-align:center;color:#777;font-size:16px;"
		},
		onRender() {
			if(this.isVisible && this.isVisible()) {
				scheduleGldPreviewRender(this, 100);
			}
		}
	}, [
		["vcl/ui/Panel", ("bro-gld-preview-chart"), {
			align: "client"
		}]
	]],
	["#tabs-sections", {
		onChange(newTab) {
			const result = this.inherited(arguments);
			if(result !== false && newTab === this.ud("#tab-preview")) {
				scheduleGldPreviewRender(this, 100);
			}
			return result;
		}
	}]
]];
