"use veldapps-imbro/gld-full-csv, cavalion-blocks/TimelineOf<>/filtermeting/prototype, amcharts, amcharts.serial";

const GldFullCsv = require("veldapps-imbro/GldFullCsv");
const GraphTheme = require("cavalion-blocks/TimelineOf<>/filtermeting/prototype");
const SERIES_STYLE = GraphTheme.seriesStyle("measurement/waterstandnap/bron");
const SERIES_BULLETS = SERIES_STYLE.bullets || {};
const SERIES_COLOR = SERIES_STYLE.color || "#2563eb";
const AXIS_COLOR = "#2b2b2b";
const GRID_COLOR = "#c9ced6";

function rootFor(component) {
	return component.up("Tabs<Document>:root") || component.up(":root") || component;
}
function clearChart(preview) {
	const chart = preview && preview.vars(["document.gldFull.chart"]);
	if(chart && chart.clear instanceof Function) {
		chart.clear();
		preview.vars("document.gldFull.chart", null);
	}
}
function isApprovedQuality(group) {
	const status = String(group && group.status || "").toLowerCase();
	return status === "goedgekeurd" || status === "approved";
}
function renderGldFullPreview(component) {
	const root = rootFor(component);
	const preview = root.qs("#preview");
	const host = root.qs("#gld-full-preview-chart") || preview;
	const node = host && host.getNode && host.getNode();
	const model = GldFullCsv.previewModel(root.vars(["parser-document-result"]) ||
		root.vars(["parser-document-root"]) || {});

	clearChart(preview);
	if(!node) return model;
	node.innerHTML = "<div class='gld-full-chart'></div>";

	const chartNode = node.querySelector(".gld-full-chart");
	if(!model.points.length) {
		chartNode.innerHTML = "<div class='gld-full-empty'>Geen geldige GLD-waterstanden gevonden.</div>";
		return model;
	}
	if(typeof AmCharts === "undefined" || !(AmCharts.makeChart instanceof Function)) {
		chartNode.innerHTML = "<div class='gld-full-empty'>AmCharts is niet beschikbaar.</div>";
		return model;
	}

	const guides = model.observations.map((observation, index) => ({
		date: observation.start,
		toDate: observation.einde,
		fillColor: "rgb(56,127,217)",
		fillAlpha: index % 2 ? 0.015 : 0.04,
		lineAlpha: 0
	}));
	const graphs = [{
		id: "waterstand",
		title: "Grondwaterstand",
		valueAxis: "waterstand",
		valueField: "value",
		type: "line",
		lineThickness: 2,
		lineColor: SERIES_COLOR,
		balloonColor: SERIES_COLOR,
		bullet: SERIES_BULLETS.type || "round",
		bulletBorderAlpha: SERIES_BULLETS.border && SERIES_BULLETS.border.alpha || 1,
		bulletColor: SERIES_BULLETS.color || "white",
		bulletSize: SERIES_BULLETS.size || 8,
		bulletHitAreaSize: SERIES_BULLETS.hitAreaSize || 24,
		hideBulletsCount: SERIES_BULLETS.max || 80,
		useLineColorForBulletBorder: true,
		connect: true,
		balloonText: "<b>Grondwaterstand</b><br>[[category]]<br><span style='font-size:16px;'>[[value]]</span>"
	}].concat(model.qualityGroups.filter(group => !isApprovedQuality(group)).map(group => ({
		id: "quality-" + group.field,
		title: group.status + " (" + group.count + ")",
		valueAxis: "waterstand",
		valueField: group.field,
		type: "line",
		lineAlpha: 0,
		lineThickness: 0,
		lineColor: group.color,
		fillAlphas: 0,
		connect: false,
		balloonColor: group.color,
		bullet: "round",
		bulletBorderAlpha: 1,
		bulletBorderColor: group.color,
		bulletColor: group.color,
		bulletSize: 5,
		bulletHitAreaSize: 16,
		hideBulletsCount: 1000,
		balloonText: "<b>[[status]]</b><br>[[category]]<br>" +
			"Grondwaterstand: [[value]]<br>Observatie: [[observationId]]<br>Interpolatie: [[interpolationType]]"
	})));

	const chart = AmCharts.makeChart(chartNode, {
		type: "serial",
		useUTC: false,
		categoryField: "date",
		dataProvider: model.points,
		graphs: graphs,
		valueAxes: [{
			id: "waterstand",
			title: "Grondwaterstand (CSV-waarde)",
			position: "left",
			color: AXIS_COLOR,
			axisColor: AXIS_COLOR,
			axisAlpha: 0.9,
			gridColor: GRID_COLOR,
			gridAlpha: 0.85,
			precision: 3
		}],
		categoryAxis: {
			parseDates: true,
			type: "date",
			minPeriod: "hh",
			color: AXIS_COLOR,
			axisColor: AXIS_COLOR,
			axisAlpha: 0.9,
			gridColor: GRID_COLOR,
			gridAlpha: 0.85,
			dashLength: 1,
			minorGridEnabled: true,
			minorGridAlpha: 0.35,
			equalSpacing: false,
			guides: guides
		},
		chartCursor: {
			categoryBalloonEnabled: true,
			categoryBalloonDateFormat: "YYYY-MM-DD JJ:NN",
			color: "black",
			cursorAlpha: 0.75,
			cursorColor: "#e0e0e0",
			valueLineEnabled: true,
			valueLineBalloonEnabled: true,
			valueLineAlpha: 0.5,
			valueBalloonsEnabled: true,
			valueZoomable: true,
			cursorPosition: "mouse",
			showNextAvailable: true
		},
		chartScrollbar: {
			graph: "waterstand",
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
			selectedGraphLineAlpha: 1
		},
		valueScrollbar: {
			backgroundAlpha: 0.1,
			backgroundColor: "#888888",
			selectedBackgroundAlpha: 1,
			selectedBackgroundColor: "white",
			oppositeAxis: false
		},
		legend: {
			markerDisabledColor: "gray",
			useGraphSettings: true
		},
		mouseWheelZoomEnabled: true,
		mouseWheelScrollEnabled: false,
		precision: 3,
		zoomOutText: "",
		zoomOutButtonAlpha: 0,
		zoomOutButtonRollOverAlpha: 0,
		zoomOutButtonPadding: 0
	});

	preview.vars("document.gldFull.chart", chart);
	return model;
}
function scheduleGldFullPreview(component, delay) {
	if(component.setTimeout instanceof Function) {
		component.setTimeout("render-gld-full-preview", () => renderGldFullPreview(component), delay || 0);
	} else {
		setTimeout(() => renderGldFullPreview(component), delay || 0);
	}
}
function activateGldFullFacet(action) {
	const root = rootFor(action);

	root.vars("document.facet", "gld-full");
	root.vars("document.getSpecificFacet", null);
	root.vars("document.applySpecificFacet", null);
	root.vars("document.gldFull.renderPreview", renderGldFullPreview);
	root.qs("#tab-preview").show();
	scheduleGldFullPreview(root, 100);
}

[["./Tabs<Document.csv>"], {
	vars: {
		document: {
			"activate-facet": activateGldFullFacet,
			defaultTab: "tab-preview",
			facet: "gld-full",
			gldFull: {
				renderPreview: renderGldFullPreview
			}
		}
	},
	onDestroy() {
		clearChart(this.qs("#preview"));
		return this.inherited(arguments);
	}
}, [
	["#preview", {
		css: {
			"& .gld-full-chart": "width:100%;height:100%;min-height:280px;background:white;",
			"& .gld-full-empty": "padding:40px;text-align:center;color:#777;font-size:16px;"
		},
		onRender() {
			if(this.isVisible && this.isVisible()) {
				scheduleGldFullPreview(this, 100);
			}
		}
	}, [
		["vcl/ui/Panel", ("gld-full-preview-chart"), {
			align: "client"
		}]
	]],
	["#tabs-sections", {
		onChange(newTab) {
			const result = this.inherited(arguments);
			if(result !== false && newTab === this.ud("#tab-preview")) {
				scheduleGldFullPreview(this, 100);
			}
			return result;
		}
	}]
]];
