define(["bxv/Profiles", "./profiles/xml", "./profiles/gld-full-csv"], function(Profiles, XmlProfiles, GldFullCsvProfile) {

	const registrations = XmlProfiles.map((profile, index) => ({
		format: "xml",
		profile: profile,
		options: { priority: 200 - index }
	})).concat([{
		format: "csv",
		profile: GldFullCsvProfile,
		options: { priority: 200 }
	}]);
	const api = {
		install() {
			registrations.forEach(item => Profiles.register(item.format, item.profile, item.options));
			return api;
		},
		profiles: registrations.map(item => item.profile)
	};

	return api;
});
