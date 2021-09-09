define(function(require) {
	
	var js = require("js");
	var domains = require("json!./domains").refDomains;
	
	function codeValues(arr) {
		arr.forEach(_ => _.codeValue = _.code);
		return arr;
	}
	
	return {
        load: function(name, req, onLoad, config) {
        	if(typeof window !== "undefined") {
        		var domain = domains.find(_ => _.uri === ("urn:bro:" + name));
        		if(!domain) {
        			throw new Error("Unknown domain urn:bro:" + name);
        		}
	        	require(["json!./codes/all/" + domain.name], function(module) {
	        		var codes = codeValues(js.get("refDomainVersions.0.refCodes", module));
		        	if(name.endsWith("GeotechnicalSoilName")) {
		        		codes.forEach(_ => {
		        			var cv = _.code, l = cv.length, a = [];
		        			
			        		if((s = cv.replace(/MetKeitjes/, "")).length !== l) { cv = s; a.push("co"); } else
			        		if((s = cv.replace(/MetKeien/, "")).length !== l) { cv = s; a.push("bo"); } else
			        		if((s = cv.replace(/MetKlei/, "")).length !== l) { cv = s; a.push("cl"); } else
			        		if((s = cv.replace(/MetGrind/, "")).length !== l) { cv = s; a.push("gr"); } else
			        		if((s = cv.replace(/MetZand/, "")).length !== l) { cv = s; a.push("sa"); } else
			        		if((s = cv.replace(/MetSilt/, "")).length !== l) { cv = s; a.push("si"); }
		
		        			if(cv.match(/Keitjes$/)) a.unshift("Co");
		        			if(cv.match(/Keien$/)) a.unshift("Bo");
		        			if(cv.match(/Grind$/)) a.unshift("Gr");
		        			if(cv.match(/Zand$/)) a.unshift("Sa");
		        			if(cv.match(/Klei$/)) a.unshift("Cl");
		        			if(cv.match(/Silt$/)) a.unshift("Si");
		        			
		        			if(cv.match(/Veen$/)) a.unshift("Pe");
		        			if(cv.match(/Humus/)) a.unshift("Hu");
		        			if(cv.match(/Detritus/)) a.unshift("De");
		        			
		        			if(cv.match(/^keitjes/)) a.unshift("Co");
		        			if(cv.match(/^keien/)) a.unshift("Bo");
		        			if(cv.match(/^grind/)) a.unshift("Gr");
		        			if(cv.match(/^zand/)) a.unshift("Sa");
		        			if(cv.indexOf("kleiig") !== 0 && (cv.match(/^klei/))) a.unshift("Cl");
		        			if(cv.indexOf("siltig") !== 0 && (cv.match(/^silt/))) a.unshift("Si");
		        			
		        			if(cv.match(/^veen/)) a.unshift("Pe");
		        			if(cv.match(/^bruinkool/)) a.unshift("Li");
		        			if(cv.match(/^gyttja/)) a.unshift("Gy");
		        			if(cv.match(/^humus/)) a.unshift("Hu");
		        			if(cv.match(/^detritus/)) a.unshift("De");
		        			
		        			if(cv.match(/sterkGrindig/)) a.splice(1, 0, "gr3");
		        			if(cv.match(/sterkZandig/)) a.splice(1, 0, "sa3");
		        			if(cv.match(/zwakGrindig/)) a.splice(1, 0, "gr1");
		        			if(cv.match(/zwakZandig/)) a.splice(1, 0, "sa1");
		        			if(cv.match(/^kleiig/)) a.splice(1, 0, "cl");
		        			if(cv.match(/^siltig/)) a.splice(1, 0, "si");
		
		        			_.nen14688 = a;
		        		});
		        	}
	        		onLoad(codes);
	        	});
        	} else {
        		console.log(js.sf("bro/codes/%s", name));
        		onLoad(name);
        	}
        }		
        // load: function(name, req, onLoad, config) {
        // 	// var domain = domains.find(_ => _.uri === ("urn:bro:" + name));
        // 	// require(["json!v7/bro/codes/bhrgt-0.1/" + domain.name], function(module) {
        // 	// 	onLoad(js.get("refDomainVersions.0.refCodes", module));
        // 	// });
        // 	var domain = name = name.split(":");
        // 	name = name.pop();

        // 	if(typeof window !== "undefined") {
        // 		if(domain.length) {
	       // 		require([js.sf("v7/bro/codes/%s!%s", domain.join("/"), name)], onLoad);
        // 		} else {
        // 			require(["json!v7/bro/codes/BRO_QUALITY_REGIME"], function(module) {
        // 				onLoad(js.get("refDomainVersions.0.refCodes", module));
        // 			});
        // 		}
        // 	} else {
        // 		console.log(js.sf("v7/bro/codes/%s!%s", domain.join("/"), name));
        // 		onLoad(name);
        // 	}
        	
        // }		
	};
	
});