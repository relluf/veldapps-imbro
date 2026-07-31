define([
	"./GldFullCsv",
	"./profiles/gld-full-csv",
	"bxv/formats/csv"
], function(GldFullCsv, GldFullCsvProfile, CsvFormat) {

	if(!CsvFormat.profiles.some(profile => profile.id === GldFullCsvProfile.id)) {
		CsvFormat.profiles.splice(Math.max(0, CsvFormat.profiles.length - 1), 0, GldFullCsvProfile);
	}

	return GldFullCsv;
});
