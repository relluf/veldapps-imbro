# veldapps-imbro

This package contains resources which can assist applications of the various registration objects defined by  [BRO (Basisregistratie Ondergrond)](https://basisregistratieondergrond.nl). 

**NB:** Note that a predecessor project [has been around for some time](https://www.npmjs.com/package/veldapps-codes-broservices) already

>> ![image](https://user-images.githubusercontent.com/686773/88216603-eddf2500-cc22-11ea-83af-b8578729c4b1.png)


## Usage

	window.require.config({paths:{ "bro": "../lib/node_modules/veldapps-imbro/src"}})
	req("bro/codes!Quality")