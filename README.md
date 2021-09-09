# veldapps-imbro

This package contains resources which can assist applications of the various registration objects defined by  [BRO (Basisregistratie Ondergrond)](https://basisregistratieondergrond.nl). 

* dependency with veldapps-xml
* implements `js.nameOf`


**NB:** Note that a predecessor project [has been around for some time](https://www.npmjs.com/package/veldapps-codes-broservices) already

## Usage

* `window.require.config({paths:{ "bro": "../lib/node_modules/veldapps-imbro/src"}})`
* `req("bro/codes!Quality")`