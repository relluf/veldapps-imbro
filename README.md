# veldapps-imbro

## BRO CPT-documenten

`veldapps-imbro/Tabs<Document.bro.cpt>` is het documentfacet voor
`bro-cpt/1.0`- en `bro-cpt/1.1`-inname- en uitgiftedocumenten. De Weergave-tab
decodeert de SWE-meetreeks en toont conusweerstand, plaatselijke wrijving,
wrijvingsgetal en waterspanning als diepteprofielen. Verwijderde lagen,
voorgeboorde diepte en dissipatietesten worden in hetzelfde profiel gemarkeerd.
De Data-tab bevat een compact overzicht van de metingen en parameters.

## BRO BHR-documenten

`veldapps-imbro/Tabs<Document.bro.bhr>` is het documentfacet voor
`bro-bhr/1.1`- en `bro-bhr/2.0`-inname- en uitgifteberichten. De Weergave-tab
toont een dieptegeschaald bodemprofiel met componentverhoudingen,
strooisel- en gesteentelagen, boor- en onderzoeksintervallen,
grondwaterstanden, bewortelbare diepte en registratiemetadata. Klikken op een
profielobject opent het bijbehorende geparseerde XML-object.

## BRO GMN-documenten

`veldapps-imbro/Tabs<Document.bro.gmn>` is het documentfacet voor
`bro-gmn/1.0`-inname- en uitgifteberichten. De Weergave-tab toont de
netwerkidentiteit en één regel per buisreferentie, zodat ook netten met
honderden `measuringPoint`-elementen overzichtelijk blijven. Meetpunten zijn
doorklikbaar naar het geparseerde XML-object; geldige GMN- en GMW-BRO-ID's
linken naar Broloket. De Data-tab bevat daarnaast het originele GMN-document.

## BRO-validatieresultaten

`veldapps-imbro/BroValidationResult` herkent JSON-responses van de
BRO-validatieservice aan de `validatie-*.json`-naam en de combinatie van
`status` en `errors`. De classifier normaliseert het resultaat naar
`bro/validatieresultaat/1.0` en activeert het package-owned
`veldapps-imbro/Tabs<Document.bro>`-facet. De generieke JSON-component kent
hierdoor geen BRO-payloadvorm of naamconventie meer.

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
