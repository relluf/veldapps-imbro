define(["module", "veldapps-xml/index"], function(module, Xml) {

	function matchNamespace(path) {
		const pattern = new RegExp("<[^>]*xmlns.*\\=\\\"https?:\\/\\/www\\.broservices\\.nl\\/xsd\\/" + path + "\\/", "s");
		return function(text) {
			return pattern.test(Xml.skipPrologue(text));
		};
	}
	function namespaceVersion(path, fallback) {
		const pattern = new RegExp(path + "\\/([^\\\"]*)", "s");
		return function(text) {
			const match = String(text || "").match(pattern);
			return match ? match[1] : fallback;
		};
	}
	function profile(id, types, path) {
		return {
			id: module.id + "/" + id,
			types: types,
			match: matchNamespace(path),
			version: namespaceVersion(path, "1.0"),
			interpret(ctx, root, done) {
				done({ xml: root, root: root, capabilities: { bro: true } });
			}
		};
	}

	return [
		profile("bro-bhr", ["bro-bhr"], "(?:is|ds)bhr"),
		profile("bro-bhrgt", ["bro-bhr-gt"], "(?:is|ds)bhr-gt"),
		profile("bro-cpt", ["bro-cpt"], "(?:is|ds)cpt"),
		profile("bro-gld", ["bro-gld"], "(?:is|ds)gld"),
		profile("bro-gmw", ["bro-gmw"], "(?:is|ds)gmw"),
		profile("bro-sad", ["bro-sad"], "(?:is|ds)sad")
	];
});
