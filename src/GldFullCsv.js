define(["papaparse"], function(Papa) {

	const PROFILE = "veldapps-imbro/profiles/gld-full-csv";
	const FACET_URI = "veldapps-imbro/Tabs<Document.gld-full>";
	const FILE_NAME_RE = /^GLD\d+_full\.csv$/i;
	const GLD_FULL_HEADER = "\"BRO-ID\",\"bronhouder\",,\"kwaliteitsregime\",\"datum eerste meting\",\"datum recentste meting\"";
	const PAPA_OPTIONS = {
		delimiter: ",",
		header: false,
		dynamicTyping: false,
		skipEmptyLines: false
	};
	const QUALITY_COLORS = {
		goedgekeurd: "#2ea043",
		afgekeurd: "#dc3545",
		onbeslist: "#ff9800"
	};

	function text(value) {
		return String(value === undefined || value === null ? "" : value)
			.replace(/^\ufeff/, "")
			.trim();
	}
	function normalized(value) {
		return text(value).toLowerCase().replace(/\s+/g, " ");
	}
	function fileName(value) {
		return text(value && (value.name || value.uri || value.id) || value)
			.replace(/\\/g, "/")
			.split(/[?#]/)[0]
			.split("/")
			.pop();
	}
	function isGldFullFileName(value) {
		return FILE_NAME_RE.test(fileName(value));
	}
	function firstLine(value) {
		return String(value || "").replace(/^\ufeff/, "").split(/\r\n|\n|\r/, 1)[0].trim();
	}
	function isGldFullHeader(value) {
		return firstLine(value) === GLD_FULL_HEADER;
	}
	function isEmptyRow(row) {
		return !(row || []).some(value => text(value) !== "");
	}
	function rowStartsWith(row, names) {
		return names.every((name, index) => normalized(row && row[index]) === normalized(name));
	}
	function isGldFullRows(rows) {
		return rowStartsWith(rows && rows[0], [
			"BRO-ID",
			"bronhouder",
			"",
			"kwaliteitsregime",
			"datum eerste meting",
			"datum recentste meting"
		]) &&
			String(rows && rows[1] && rows[1][0] || "").match(/^GLD\d+$/i) !== null &&
			(rows || []).slice(2, 8).some(row => rowStartsWith(row, ["put BRO-ID", "put buisnummer"])) &&
			(rows || []).slice(2, 12).some(row => rowStartsWith(row, ["observatie ID", "start observatieperiode"]));
	}
	function isGldFullText(value) {
		return isGldFullHeader(value);
	}
	function dateOnly(value) {
		const match = text(value).match(/(\d{4})-(\d{2})-(\d{2})/);
		if(!match) return null;
		const year = parseInt(match[1], 10);
		const month = parseInt(match[2], 10) - 1;
		const day = parseInt(match[3], 10);
		const date = new Date(year, month, day);
		return date.getFullYear() === year && date.getMonth() === month &&
			date.getDate() === day ? date : null;
	}
	function dateTime(value) {
		const date = new Date(text(value));
		return isNaN(date.getTime()) ? null : date;
	}
	function number(value) {
		const value_ = text(value).replace(",", ".");
		if(!/^[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?$/i.test(value_)) return null;
		const result = parseFloat(value_);
		return isFinite(result) ? result : null;
	}
	function nextDataRow(rows, index) {
		while(index < rows.length && isEmptyRow(rows[index])) index++;
		return index;
	}
	function registrationFrom(rows) {
		const row = rows[1] || [];
		return {
			broId: text(row[0]),
			bronhouder: text(row[1]),
			kwaliteitsregime: text(row[3]),
			datumEersteMeting: dateOnly(row[4]),
			datumRecentsteMeting: dateOnly(row[5])
		};
	}
	function wellFrom(rows) {
		let index = rows.findIndex(row => rowStartsWith(row, ["put BRO-ID", "put buisnummer"]));
		if(index === -1) return null;
		index = nextDataRow(rows, index + 1);
		const row = rows[index] || [];
		return {
			broId: text(row[0]),
			buisnummer: number(row[1]),
			monitoringnetBroId: text(row[3])
		};
	}
	function observationFrom(row) {
		return {
			id: text(row[0]),
			start: dateOnly(row[1]),
			einde: dateOnly(row[2]),
			type: text(row[3]),
			mateBeoordeling: text(row[4]),
			procesId: text(row[5]),
			aantalMetingen: 0,
			eersteMeting: null,
			laatsteMeting: null
		};
	}
	function measurementFrom(row, observation) {
		const timestamp = dateTime(row[0]);
		return {
			tijdstip: timestamp,
			waterstand: number(row[1]),
			statusKwaliteitscontrole: text(row[2]),
			censuurreden: text(row[3]),
			censuurlimietwaarde: number(row[4]),
			interpolatietype: text(row[5]),
			observatieId: observation && observation.id || ""
		};
	}
	function parseRows(rows, source) {
		rows = rows || [];
		if(!isGldFullRows(rows)) {
			throw new Error("Geen geldig BRO GLD full CSV-bestand.");
		}

		const registration = registrationFrom(rows);
		const well = wellFrom(rows);
		const observations = [];
		const measurements = [];
		let currentObservation = null;
		let index = 0;

		while(index < rows.length) {
			const row = rows[index] || [];
			if(rowStartsWith(row, ["observatie ID", "start observatieperiode"])) {
				index = nextDataRow(rows, index + 1);
				currentObservation = observationFrom(rows[index] || []);
				observations.push(currentObservation);
			} else if(rowStartsWith(row, ["tijdstip meting", "waterstand"])) {
				index++;
				while(index < rows.length && !isEmptyRow(rows[index])) {
					const measurement = measurementFrom(rows[index], currentObservation);
					measurements.push(measurement);
					if(currentObservation) {
						currentObservation.aantalMetingen++;
						if(!currentObservation.eersteMeting) {
							currentObservation.eersteMeting = measurement.tijdstip;
						}
						currentObservation.laatsteMeting = measurement.tijdstip;
					}
					index++;
				}
				continue;
			}
			index++;
		}

		if(!observations.length || !measurements.length) {
			throw new Error("Het GLD CSV-bestand bevat geen observaties of metingen.");
		}

		const values = measurements
			.map(measurement => measurement.waterstand)
			.filter(value => value !== null);
		const fileNameMatches = isGldFullFileName(source);
		const root = {
			Registratie: [registration],
			Put: well ? [well] : [],
			Observaties: observations,
			Metingen: measurements
		};
		const result = {
			type: "bro-gld-full-csv",
			profile: PROFILE,
			root: root,
			view: root,
			rows: measurements,
			headers: Object.keys(measurements[0] || {}),
			summary: {
				"BRO-ID": registration.broId,
				"Put BRO-ID": well && well.broId || "",
				"Buisnummer": well && well.buisnummer,
				"Kwaliteitsregime": registration.kwaliteitsregime,
				"Observaties": observations.length,
				"Metingen": measurements.length,
				"Minimum waterstand": values.length ? Math.min.apply(Math, values) : null,
				"Maximum waterstand": values.length ? Math.max.apply(Math, values) : null
			},
			meta: {
				gldFullCsv: {
					source: fileName(source),
					fileNameMatches: fileNameMatches,
					headerMatches: true,
					registration: registration,
					well: well
				}
			},
			capabilities: {
				csv: true,
				bro: true,
				gld: true,
				rows: true,
				timeSeries: true,
				view: true
			}
		};

		result.facetUri = FACET_URI;
		result.specificFacetUri = FACET_URI;
		return result;
	}
	function parse(value, source) {
		if(typeof value === "string") {
			const csv = Papa.parse(value, PAPA_OPTIONS);
			const result = parseRows(csv.data, source);
			result.csv = csv;
			result.errors = csv.errors || [];
			return result;
		}
		if(Array.isArray(value)) {
			return parseRows(value, source);
		}
		if(value && Array.isArray(value.data)) {
			const result = parseRows(value.data, source);
			result.csv = value;
			result.errors = value.errors || [];
			return result;
		}
		throw new Error("GldFullCsv.parse verwacht CSV-tekst of een Papa Parse-resultaat.");
	}
	function previewModel(parsed) {
		const root = parsed && (parsed.root || parsed.view || parsed) || {};
		const measurements = Array.isArray(root.Metingen) ? root.Metingen :
			parsed && Array.isArray(parsed.rows) ? parsed.rows : [];
		const observations = Array.isArray(root.Observaties) ? root.Observaties : [];
		const fields = {};
		const status = {};
		const datedMeasurements = measurements
			.map((measurement, index) => {
				const date = measurement && measurement.tijdstip instanceof Date ?
					measurement.tijdstip : new Date(measurement && measurement.tijdstip);
				if(!measurement || isNaN(date.getTime()) || !isFinite(measurement.waterstand)) {
					return null;
				}
				return {
					date: date,
					index: index,
					measurement: measurement
				};
			})
			.filter(Boolean)
			.sort((left, right) => left.date.getTime() - right.date.getTime() ||
				left.index - right.index);
		const points = datedMeasurements.map(item => {
				const date = item.date;
				const measurement = item.measurement;
				const key = normalized(measurement.statusKwaliteitscontrole) || "onbekend";
				let group = status[key];
				if(!group) {
					const field = "quality" + (Object.keys(status).length + 1);
					group = status[key] = {
						status: key,
						field: field,
						color: QUALITY_COLORS[key] || "#607d8b",
						count: 0
					};
				}
				group.count++;
				const point = {
					date: date,
					value: measurement.waterstand,
					status: measurement.statusKwaliteitscontrole,
					interpolationType: measurement.interpolatietype,
					observationId: measurement.observatieId
				};
				point[group.field] = measurement.waterstand;
				fields[group.field] = true;
				return point;
			});

		return {
			points: points,
			observations: observations,
			qualityGroups: Object.keys(status).sort().map(key => status[key]),
			qualityFields: Object.keys(fields)
		};
	}

	return {
		FACET_URI: FACET_URI,
		FILE_NAME_RE: FILE_NAME_RE,
		GLD_FULL_HEADER: GLD_FULL_HEADER,
		PAPA_OPTIONS: PAPA_OPTIONS,
		PROFILE: PROFILE,
		fileName: fileName,
		isGldFullFileName: isGldFullFileName,
		isGldFullHeader: isGldFullHeader,
		isGldFullRows: isGldFullRows,
		isGldFullText: isGldFullText,
		parse: parse,
		parseRows: parseRows,
		previewModel: previewModel
	};
});
