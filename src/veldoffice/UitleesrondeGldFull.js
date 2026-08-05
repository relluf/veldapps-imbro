define([
	"veldapps-imbro/GldFullCsv",
	"veldapps-mon-fmt/logger/ElliTrack",
	"veldapps-mon-fmt/index",
	"veldapps-mon-fmt/veldoffice/UitleesrondeBase",
	"veldapps-mon-fmt/veldoffice/LoggerPlaatsingChoice",
	"veldoffice/VO"
], function(GldFullCsv, ElliTrack, Mon, Base, LoggerPlaatsingChoice, VO) {

	const Uitleesronde = Mon.veldoffice;
	const FACET_URI = "veldapps-mon-fmt/Tabs<Document.uitleesronde.gld>";
	const FILTER_SELECT = [
		"id", "naam", "broId", "bovenkant", "onderkant",
		"meetpunt.id", "meetpunt.code", "meetpunt.broId",
		"meetpunt.onderzoek.id", "meetpunt.onderzoek.projectcode"
	].join(",");
	const PLAATSING_SELECT = [
		"id", "van", "tot", "lastDataReceived",
		"logger.id", "logger.serienummer",
		"filter.id", "filter.naam", "filter.broId", "filter.bovenkant", "filter.onderkant",
		"filter.meetpunt.id", "filter.meetpunt.code", "filter.meetpunt.broId",
		"filter.meetpunt.onderzoek.id"
	].join(",");

	function get(object, path) {
		return Base.get(object, path);
	}
	function text(value) {
		return String(value === undefined || value === null ? "" : value).trim();
	}
	function normalized(value) {
		return text(value).toLowerCase();
	}
	function broIds(value) {
		return text(value).split(/[;,\s]+/).map(normalized).filter(Boolean);
	}
	function filterHasGldId(filter, registrationBroId) {
		return broIds(filter && filter.broId).indexOf(normalized(registrationBroId)) !== -1;
	}
	function onderzoekId(root) {
		return root.up("Portal<>").vars(["veldoffice/Onderzoek.id"]);
	}
	function meetpuntFilterWhere(root) {
		const onderzoekId_ = onderzoekId(root);
		const bedrijfId = root.vars(["veldoffice/Onderzoek.bedrijf.id"]) ||
			root.vars(["veldoffice/Bedrijf.id"]) || get(VO, "session.details.bedrijf.id");

		return onderzoekId_ ?
			["equals", "meetpunt.onderzoek.id", onderzoekId_] :
			["equals", "meetpunt.onderzoek.bedrijf.id", bedrijfId];
	}
	function loggerPlaatsingWhere(root, period) {
		const onderzoekId_ = onderzoekId(root);
		const bedrijfId = root.vars(["veldoffice/Onderzoek.bedrijf.id"]) ||
			root.vars(["veldoffice/Bedrijf.id"]) || get(VO, "session.details.bedrijf.id");
		const overlap = ["and", ["lte", "van", period.laatste], ["gte", "tot", period.eerste]];

		return onderzoekId_ ?
			["and", overlap, ["equals", "filter.meetpunt.onderzoek.id", onderzoekId_]] :
			["and", overlap, ["equals", "filter.meetpunt.onderzoek.bedrijf.id", bedrijfId]];
	}
	function measurementPeriod(measurements) {
		const dates = measurements.map(measurement => measurement.tijdstip)
			.filter(date => date instanceof Date && !isNaN(date.getTime()));

		if(!dates.length) return null;
		return dates.reduce((period, date) => {
			if(date < period.eerste) period.eerste = date;
			if(date > period.laatste) period.laatste = date;
			return period;
		}, { eerste: dates[0], laatste: dates[0] });
	}
	function measurementEnvelope(groups) {
		const periods = groups.map(group => group.period).filter(Boolean);

		if(!periods.length) return null;
		return periods.reduce((result, period) => {
			if(period.eerste < result.eerste) result.eerste = period.eerste;
			if(period.laatste > result.laatste) result.laatste = period.laatste;
			return result;
		}, { eerste: periods[0].eerste, laatste: periods[0].laatste });
	}
	function groupPlaatsingenByFilterId(plaatsingen) {
		const result = {};

		plaatsingen.forEach(plaatsing => {
			const id = get(plaatsing, "filter.id");
			result[id] = result[id] || [];
			result[id].push(plaatsing);
		});
		return result;
	}
	function unique(values) {
		return values.filter(Boolean).filter((value, index) => values.indexOf(value) === index);
	}
	function loggerSerienummers(plaatsingen) {
		return unique(plaatsingen.map(plaatsing => get(plaatsing, "logger.serienummer")));
	}
	function plaatsingLabel(plaatsing) {
		return [
			get(plaatsing, "filter.meetpunt.code"),
			get(plaatsing, "filter.naam"),
			get(plaatsing, "logger.serienummer")
		].filter(Boolean).join(" / ");
	}
	function contextValidation(filter, group) {
		if(!filter || !group.well) return "";
		const messages = [];
		const filterPutBroId = text(get(filter, "meetpunt.broId"));
		const filterNumber = text(filter.naam);

		if(group.well.broId && normalized(filterPutBroId) !== normalized(group.well.broId)) {
			messages.push("put BRO-ID " + group.well.broId + " wijkt af van " +
				(filterPutBroId || "de lege waarde") + " in Veldoffice");
		}
		if(group.well.buisnummer !== null && group.well.buisnummer !== undefined &&
			!Base.sameFilterName(filterNumber, group.well.buisnummer)) {
			messages.push("buisnummer " + group.well.buisnummer + " wijkt af van filter " +
				(filterNumber || "-") + " in Veldoffice");
		}
		return messages.length ? "Contextcontrole: " + messages.join("; ") + "." : "";
	}
	function parsedGroup(parsed, resource) {
		const registration = get(parsed, "meta.gldFullCsv.registration") ||
			get(parsed, "root.Registratie.0") || {};
		const well = get(parsed, "meta.gldFullCsv.well") || get(parsed, "root.Put.0") || {};
		const measurements = (get(parsed, "root.Metingen") || []).filter(measurement =>
			measurement.tijdstip instanceof Date && !isNaN(measurement.tijdstip.getTime()) &&
			typeof measurement.waterstand === "number" && isFinite(measurement.waterstand));

		return {
			key: resource + "|" + text(registration.broId),
			resource: resource,
			parsed: parsed,
			registration: registration,
			well: well,
			measurements: measurements,
			period: measurementPeriod(measurements)
		};
	}
	function rowsFor(groups, filters, plaatsingen) {
		const plaatsingIndex = groupPlaatsingenByFilterId(plaatsingen);

		return groups.map(group => {
			const registrationBroId = text(group.registration && group.registration.broId);
			const matchingFilters = registrationBroId ?
				filters.filter(filter => filterHasGldId(filter, registrationBroId)) : [];
			const available = matchingFilters.reduce((rows, filter) =>
				rows.concat(plaatsingIndex[filter.id] || []), []);
			const active = group.period ? available.filter(plaatsing =>
				Uitleesronde.plaatsingCoversPeriod(plaatsing, group.period)) : [];
			const serials = loggerSerienummers(active);
			const filter = matchingFilters.length === 1 ? matchingFilters[0] : null;
			const status = group.error ? "GLD_NIET_LEESBAAR" :
				!registrationBroId ? "GEEN_GLD_ID" :
				!group.measurements.length ? "GEEN_LOGGERMETINGEN" :
				!matchingFilters.length ? "GEEN_MEETPUNTFILTER" :
				matchingFilters.length > 1 ? "MEERDERE_MEETPUNTFILTERS" :
				!group.period ? "GEEN_MEETPERIODE" :
				!active.length ? "GEEN_ACTIEVE_LOGGER" :
				serials.length === 1 ? "OK" : "MEERDERE_ACTIEVE_LOGGERS";
			const melding = group.error || {
				GEEN_GLD_ID: "De registratie-BRO-ID (GLD-ID) ontbreekt.",
				GEEN_LOGGERMETINGEN: "Het bestand bevat geen geldige tijdstip/waterstand-metingen.",
				GEEN_MEETPUNTFILTER: "Geen MeetpuntFilter gevonden met deze GLD-ID in broId.",
				MEERDERE_MEETPUNTFILTERS: "Meerdere MeetpuntFilters hebben deze GLD-ID; kies handmatig een loggerplaatsing.",
				GEEN_MEETPERIODE: "Eerste en laatste meting konden niet worden bepaald.",
				GEEN_ACTIEVE_LOGGER: "Geen LoggerPlaatsing gevonden die de volledige meetperiode afdekt.",
				MEERDERE_ACTIEVE_LOGGERS: "Meerdere loggerplaatsingen dekken de volledige meetperiode."
			}[status] || contextValidation(filter, group);
			const row = {
				key: group.key,
				status: status,
				melding: melding,
				resource: group.resource,
				location: [
					text(group.well && group.well.broId),
					text(group.well && group.well.buisnummer)
				].filter(Boolean).join(" / "),
				registratieBroId: registrationBroId,
				putBroId: text(group.well && group.well.broId),
				buisnummer: group.well && group.well.buisnummer,
				meetpunt: filter ? get(filter, "meetpunt.code") : "",
				filter: filter ? filter.naam : "",
				eersteMeting: group.period && group.period.eerste || "",
				laatsteMeting: group.period && group.period.laatste || "",
				metingen: group.measurements.length,
				meetpuntFilterId: filter && filter.id || "",
				meetpuntFilter: filter ?
					[get(filter, "meetpunt.code"), filter.naam].filter(Boolean).join(" / ") : "",
				beschikbareLoggerPlaatsingen: available,
				loggerPlaatsingen: active,
				loggerSerienummer: serials.join(", "),
				Plaatsingen: active.length ? active.map(plaatsingLabel).join(", ") : ""
			};

			Object.defineProperty(row, "gldFull", { value: group });
			Object.defineProperty(row, "meetpuntFilterEntity", { value: filter, writable: true });
			return row;
		});
	}
	function applySelectedPlaatsing(row) {
		if(!row.loggerPlaatsingKeuze) return row;
		const plaatsing = row.loggerPlaatsingen && row.loggerPlaatsingen[0];
		const filter = plaatsing && plaatsing.filter;

		if(!filter) return row;
		row.meetpuntFilterEntity = filter;
		row.meetpuntFilterId = filter.id || "";
		row.meetpunt = get(filter, "meetpunt.code") || "";
		row.filter = filter.naam || "";
		row.meetpuntFilter = [row.meetpunt, row.filter].filter(Boolean).join(" / ");
		row.melding = [
			row.melding,
			contextValidation(filter, row.gldFull)
		].filter(Boolean).join(" ");
		return row;
	}
	function metersToCentimeters(value) {
		return Math.round(value * 100000000) / 1000000;
	}
	function fingerprint(value) {
		let hash = 2166136261;

		for(let index = 0; index < value.length; index++) {
			hash ^= value.charCodeAt(index);
			hash = Math.imul(hash, 16777619);
		}
		return (hash >>> 0).toString(16);
	}
	function elliTrackPeriod(date, grouping) {
		const year = date.substring(0, 4);
		const month = parseInt(date.substring(5, 7), 10);

		if(grouping === "month") return year + "-" + String(month).padStart(2, "0");
		if(grouping === "quarter") return year + "-Q" + (Math.floor((month - 1) / 3) + 1);
		return year;
	}
	function elliTrackImportFiles(rows, targetTimeZone, grouping) {
		const header = "Datum\tWaterstand\tTemperatuur water\tTemperatuur intern";
		const groups = {};
		const timeZone = ElliTrack.normalizeTimeZone(targetTimeZone || ElliTrack.DEFAULT_TIME_ZONE);
		const grouping_ = ["year", "quarter", "month"].indexOf(grouping) !== -1 ? grouping : "year";

		rows.forEach(row => {
			const serials = loggerSerienummers(row.loggerPlaatsingen);

			if(serials.length !== 1) {
				throw new Error("Voor " + row.registratieBroId +
					" kon niet precies één logger-serienummer worden bepaald.");
			}
			row.gldFull.measurements.forEach(measurement => {
				const date = ElliTrack.convertInstant(measurement.tijdstip, timeZone);
				const period = elliTrackPeriod(date, grouping_);
				const key = serials[0] + "|" + period;
				const group = groups[key] || (groups[key] = {
					loggerSerienummer: serials[0],
					period: period,
					lines: {},
					resources: {},
					meetpuntFilters: {},
					gldIds: {}
				});
				const line = [
					date,
					metersToCentimeters(measurement.waterstand),
					0,
					0
				].join("\t");

				group.lines[line] = true;
				group.resources[row.resource] = true;
				group.meetpuntFilters[row.meetpuntFilterId] = true;
				group.gldIds[row.registratieBroId] = true;
			});
		});

		return Object.keys(groups).sort().map(key => {
			const group = groups[key];
			const lines = Object.keys(group.lines).sort();
			const content = [header].concat(lines).join("\n");
			const name = "ElliTrack-" + group.loggerSerienummer + "-" + group.period + ".txt";

			return {
				name: name,
				text: content,
				fingerprint: fingerprint(name + "\n" + content),
				loggerSerienummer: group.loggerSerienummer,
				periode: group.period,
				periodeIndeling: grouping_,
				metingen: lines.length,
				eersteMeting: lines[0] && lines[0].split("\t")[0] || "",
				laatsteMeting: lines.length && lines[lines.length - 1].split("\t")[0] || "",
				tijdzone: timeZone,
				resources: Object.keys(group.resources).sort(),
				meetpuntFilterIds: Object.keys(group.meetpuntFilters).filter(Boolean),
				registratieBroIds: Object.keys(group.gldIds).sort()
			};
		});
	}
	function configureResourceBridge(context) {
		context.root.vars("document.uitleesronde.kind", "gld");
		return Base.resourceBridge(context.root, {
			facetsFor(resource, values) {
				return values.some(value => GldFullCsv.isGldFullFileName(value)) ?
					[GldFullCsv.FACET_URI] : [];
			}
		});
	}
	function invalidResult(context, report, messages) {
		const resources = context.resourceRows(report.regular);
		const validation = messages.map(message => ({ status: "NIET_VALIDE", melding: message }));
		const view = {
			Resources: resources,
			Koppelingen: [],
			Controlemetingen: [],
			Validatie: validation,
			Verwerking: []
		};

		return Base.setInvalidWorkflow(context, {
			type: "uitleesronde",
			facetUri: FACET_URI,
			root: {
				Uitleesronde: [{
					naam: context.doc.naam,
					md5: context.root.vars(["document.zip.md5"]),
					formaat: "gld",
					status: "NIET_VALIDE",
					folder: report.folder,
					structure: report.structure,
					gld: report.gld.length
				}],
				Resources: resources,
				Koppelingen: [],
				Controlemetingen: [],
				Validatie: validation,
				Verwerking: []
			},
			view: view,
			log: [{
				status: "NIET_VALIDE",
				melding: "GLD-uitleesronde herkend; structuur of inhoud is niet geldig.",
				resources: resources.length,
				gld: report.gld.length
			}].concat(validation),
			statusPresentation: Base.statusPresentation,
			capabilities: {
				view: true,
				folder: true,
				uitleesronde: true,
				gld: true
			}
		});
	}
	function processRecognized(context, report, sources) {
		configureResourceBridge(context);
		if(!report.valid) return invalidResult(context, report, report.errors);

		return Promise.all(sources.map(item => Promise.resolve()
			.then(() => parsedGroup(GldFullCsv.parse(item.source, context.entryName(item.entry)),
				context.entryName(item.entry)))
			.catch(error => ({
				key: context.entryName(item.entry),
				resource: context.entryName(item.entry),
				registration: {},
				well: {},
				measurements: [],
				period: null,
				error: error.message
			})))).then(groups => Promise.all([
				groups,
				VO.em.query("MeetpuntFilter", FILTER_SELECT, {
					limit: -1,
					where: meetpuntFilterWhere(context.root)
				})
			])).then(result => {
				const groups = result[0];
				const filters = result[1];
				const period = measurementEnvelope(groups);
				const plaatsingen = period ? VO.em.query("LoggerPlaatsing", PLAATSING_SELECT, {
					limit: -1,
					where: loggerPlaatsingWhere(context.root, period)
				}) : Promise.resolve([]);

				return plaatsingen.then(rows => [groups, filters, rows]);
			}).then(result => {
				const groups = result[0];
				const filters = result[1];
				const plaatsingen = result[2];
				const resources = context.resourceRows(report.regular);
				const rows = rowsFor(groups, filters, plaatsingen);
				const projectcode = get(filters[0], "meetpunt.onderzoek.projectcode");

				LoggerPlaatsingChoice.applyOverrides(context.root, rows);
				rows.filter(row => row.loggerPlaatsingKeuze).forEach(applySelectedPlaatsing);
				const validation = rows.filter(row => row.status !== "OK").map(Base.defaultValidationRow);
				const view = {
					Resources: resources,
					Koppelingen: rows,
					Controlemetingen: [],
					Validatie: validation.length ? validation :
						[{ status: "OK", melding: "Alle GLD-bestanden zijn via hun GLD-ID gekoppeld." }],
					Verwerking: []
				};
				const parsed = {
					type: "uitleesronde",
					facetUri: FACET_URI,
					root: {
						Uitleesronde: [{
							naam: context.doc.naam,
							md5: context.root.vars(["document.zip.md5"]),
							projectcode: projectcode,
							formaat: "gld",
							status: validation.length ? "AANVULLEN" : "OK",
							folder: report.folder,
							structure: report.structure,
							gld: groups.length,
							metingen: groups.reduce((count, group) => count + group.measurements.length, 0),
							meetpuntFilters: filters.length,
							beschikbarePlaatsingen: plaatsingen.length
						}],
						Resources: resources,
						Koppelingen: rows,
						Controlemetingen: [],
						Validatie: view.Validatie,
						Verwerking: []
					},
					view: view,
					log: [{
						status: validation.length ? "AANVULLEN" : "OK",
						melding: validation.length ?
							"GLD-uitleesronde herkend; koppelingen vragen aandacht." :
							"GLD-uitleesronde herkend; alle bestanden zijn via hun GLD-ID gekoppeld.",
						resources: resources.length,
						gld: groups.length,
						metingen: groups.reduce((count, group) => count + group.measurements.length, 0),
						structure: report.structure
					}],
					statusPresentation: Base.statusPresentation,
					capabilities: {
						view: true,
						folder: true,
						uitleesronde: true,
						gld: true,
						csv: true,
						continue: false
					}
				};

				return Base.createWorkflow(context, parsed, {
					rows: rows,
					controls: { rows: [], errors: [] },
					rowKey: row => row.key,
					onSelectLoggerPlaatsing: applySelectedPlaatsing,
					importFiles: elliTrackImportFiles,
					validMessage: "Alle GLD-bestanden zijn via hun GLD-ID gekoppeld."
				});
			});
	}
	function process(context) {
		const base = Base.packageReport(context.entries);
		const csv = base.regular.filter(entry => Base.extension(Base.entryName(entry)) === "csv");

		if(!csv.length) return;
		return Promise.all(csv.map(entry => context.readText(entry)
			.then(source => ({
				entry: entry,
				source: source,
				gld: GldFullCsv.isGldFullFileName(context.entryName(entry)) ||
					GldFullCsv.isGldFullText(source)
			})))).then(items => {
				const recognized = items.filter(item => item.gld);

				if(!recognized.length) return;
				const recognizedEntries = recognized.map(item => item.entry);
				const unsupported = base.regular.filter(entry =>
					recognizedEntries.indexOf(entry) === -1);
				const errors = [];

				if(!base.validStructure) {
					errors.push("De GLD-uitleesronde moet een platte levering zijn, of precies een hoofdmap met daarin de levering.");
				}
				if(unsupported.length) {
					errors.push("Een GLD-uitleesronde mag alleen GLD…_full.csv-bestanden bevatten: " +
						unsupported.map(entry => context.entryName(entry)).join(", ") + ".");
				}
				const report = {
					valid: errors.length === 0,
					errors: errors,
					folder: base.folder,
					structure: base.structure,
					regular: base.regular,
					gld: recognizedEntries
				};

				return processRecognized(context, report, recognized);
			});
	}

	return {
		name: "uitleesronde-gld-full",
		facetUri: FACET_URI,
		process: process,
		rowsFor: rowsFor,
		elliTrackImportFiles: elliTrackImportFiles
	};

});
