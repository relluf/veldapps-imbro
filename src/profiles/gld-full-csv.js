define(["veldapps-imbro/GldFullCsv"], function(GldFullCsv) {

	function match(input, done, fail) {
		if(typeof input === "string") {
			done(GldFullCsv.isGldFullFileName(input) || GldFullCsv.isGldFullText(input));
			return;
		}
		if(input && input.text instanceof Function) {
			input.text().then(text => done(
				GldFullCsv.isGldFullFileName(input) || GldFullCsv.isGldFullText(text)
			), fail);
			return;
		}
		done(false);
	}

	return {
		id: GldFullCsv.PROFILE,
		papa: GldFullCsv.PAPA_OPTIONS,
		sniffRows: 10,
		match: match,
		interpret(ctx, csv, done, fail) {
			try {
				const resource = ctx && ctx.resource || {};
				done(GldFullCsv.parse(csv, resource.name || resource.uri));
			} catch(error) {
				fail(error);
			}
		}
	};
});
