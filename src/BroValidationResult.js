define(function() {
	const TYPE = "bro/validatieresultaat/1.0";
	const FACET_URI = "veldapps-imbro/Tabs<Document.bro>";

	function documentName(doc) {
		doc = doc && doc._values || doc;
		return String(doc && (doc.naam || doc.name || doc.id) || "").split("/").pop();
	}
	function matches(result, opts) {
		const root = result && result.root;
		const doc = opts && opts.doc;

		return documentName(doc).toLowerCase().indexOf("validatie-") === 0 &&
			root && typeof root === "object" &&
			root.errors instanceof Array &&
			typeof root.status === "string";
	}
	function classify(result, opts) {
		if(!matches(result, opts)) return null;

		const source = result.root;
		const view = {
			errors: source.errors.filter(error => error !== null && error !== undefined)
		};

		result.type = TYPE;
		result.status = source.status;
		result.errors = view.errors;
		result.root = view;
		result.view = view;
		result.capabilities = Object.assign({}, result.capabilities || {}, {
			bro: true,
			json: true,
			validation: true,
			view: true
		});
		return FACET_URI;
	}

	return {
		FACET_URI: FACET_URI,
		TYPE: TYPE,
		classify: classify,
		matches: matches
	};
});
