ACF OpenStreetMap Field
=======================

This is the official github repository of the [ACF OpenStreetMap Field](https://wordpress.org/plugins/acf-openstreetmap-field/) plugin.

About
-----

Configurable OpenStreetMap or Leaflet Field in ACF.  
Requires ACF 5.7+

Features
--------
 - Configurable Map-Tile Provider
 - Selectable Map Overlays
 - Multiple Markers
 - Ready-to-use HTML-Output
 - Custom map markers [through WordPress filters](../../wiki/HTML-Marker-Icon) and JS Events.


Installation
------------

#### In WP Admin
Just follow the [Automatic Plugin Installation](https://wordpress.org/support/article/managing-plugins/#automatic-plugin-installation) procedere.

#### WP-CLI
```shell
$ wp plugin install --activate acf-openstreetmap-field
```

### Development
```shell
git clone git@github.com:mcguffin/acf-openstreetmap-field.git
cd acf-dropzone
npm install
npm run dev
```

Usage
-----
There is some developer centric documentation in the [wiki](../../wiki).

Development
-----------
npm scripts:
 - `npm run dev`: Watch css and js soure dirs
 - `npm run build`: build assets
 - `npm run release [ patch | minor | major ]`: Publish new release
 - `npm run i18n`: generate `.pot` file
 - `npm run package:wporg`: create zip for plugin submission
 - `npm run rollback`: remove last commit (local and remote  – use with caution!)

Thanks
------
This plugin wouldn't have been possible without these awesome people and Projects:

 - Jan Pieter Waagmeester ([Leaflet Providers](https://github.com/leaflet-extras/leaflet-providers))
 - Per Liedman ([Leaflet Control Geocode](https://github.com/perliedman/leaflet-control-geocoder))
 - The entire [Leaflet](https://leafletjs.com/) Project
