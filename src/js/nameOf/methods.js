define(function(require) {
	
	
	var rxe = require("veldapps-xml/index").replaceXmlEntities;
	
	// var lookup = (str) => require("../../lookup")(str);
	// var guess = (obj) => require("../../guess")(obj);
	var joinNames = (names, ch) => names.filter(v => v).map(v=>js.nameOf(v)).join(ch || ": ");

	require("js/nameOf").methods.push(
		(obj) => {
			var t = obj['#text'], u = obj['@_uom'];
			return (obj.hasOwnProperty("#text") && u) ? js.sf("%s %s", rxe(t), u) : undefined;
		},
		(obj) => {
			if(obj.hasOwnProperty("bhrgtcom:lowerBoundary")) {
				return joinNames([obj['bhrgtcom:upperBoundary'], obj['bhrgtcom:lowerBoundary']]);
			}
		}
	);
});