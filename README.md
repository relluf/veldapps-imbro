# veldapps-imbro

## BRO GLD full CSV

`GldFullCsv` herkent en parseert `GLD…_full.csv`. Ook zonder passende
bestandsnaam wordt het formaat herkend aan de eerste CSV-regel met de
BRO-ID-, bronhouder-, kwaliteitsregime- en meetdatumsvelden. De
registratie-BRO-ID (GLD-ID), put-BRO-ID en buisnummer blijven afzonderlijk
beschikbaar. Grafiekpunten worden oplopend op meettijd gepresenteerd.

`veldoffice/UitleesrondeGldFull` verwerkt één of meer van deze bestanden in
een folder of zip via de gedeelde uitleesronde-UI. De koppeling loopt primair
via de GLD-ID naar `MeetpuntFilter.broId` en vervolgens naar de dekkende
`LoggerPlaatsing`. Put-BRO-ID en buisnummer worden alleen als contextcontrole
getoond. Het formaat levert geen ondubbelzinnige controlemetingen, dus de
controller maakt die niet aan.

This package contains resources which can assist applications of the various registration objects defined by  [BRO (Basisregistratie Ondergrond)](https://basisregistratieondergrond.nl). 

* dependency with veldapps-xml
* implements `js.nameOf`


**NB:** Note that a predecessor project [has been around for some time](https://www.npmjs.com/package/veldapps-codes-broservices) already

## Usage

* `window.require.config({paths:{ "bro": "../lib/node_modules/veldapps-imbro/src"}})`
* `req("bro/codes!Quality")`


## HOWTO Update to lastest version

### `2024/09/29` SAD not present
