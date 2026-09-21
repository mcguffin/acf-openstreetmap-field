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
 - Map Proxy to comply with privacy regulations and to hide API Credentials

Installation
------------

#### In WP Admin
Just follow the [Automatic Plugin Installation](https://wordpress.org/support/article/managing-plugins/#automatic-plugin-installation) procedere.

#### WP-CLI
```shell
wp plugin install --activate acf-openstreetmap-field
```

#### Using composer
```
composer require mcguffin/acf-openstreetmap-field
```

### Development
```shell
git clone git@github.com:mcguffin/acf-openstreetmap-field.git
cd acf-openstreetmap-field
npm install
npm run dev
```

Usage
-----
There is some developer centric documentation in the [wiki](../../wiki).

Development
-----------
npm scripts:

 - `npm run audit`: Run phpcs audit
 - `npm run build`: Build css and js from sources
 - `npm run dev`: Watch css and js source dirs
 - `npm run dev-test`: create test fields in wp-admin and watch css and js source dirs
 - `npm run dashicons`: Generate dashicons scss variables from source
 - `npm run i18n`: generate `.pot` file
 - `npm run rollback`: remove last commit (local and remote  – use with caution!)
 - `npm run test`: run unit tests against PHP 7.4 and 8.3
 - `npm run test:edge`: run unit tests against PHP 8.3 only
 - `npm run test:legacy`: run unit tests against PHP 7.4 only
 - `npm run uitest`: create test fields in wp-admin

Testing
-------
### In WP-Admin
Add some ACF Fields to several places for manual testing in wp-admin.
```shell
npm run dev-test
```

### Unit Tests
Unit tests are run in [wordpress/env](https://www.npmjs.com/package/@wordpress/env/v/2.0.0), which is basically a docker container. [Docker Desktop](https://docs.docker.com/desktop/) is required.

Unit tests are run against PHP 7.4 (legacy) and 8.3 (edge).  

**Run them all:**
```shell
npm run test
```

**Run edge tests only:**
```shell
npm run test:edge
```

**Configure edge test and run something in wp-cli in the docker container:**
```shell
npm run test:set-edge
npm run test:reset-env
wp-env run cli wp core version
> 6.7.1
```

**I could use a little help:**: 
 - Unit tests covering all PHP code
 - Unit-testing JS

Thanks
------
This plugin wouldn't have been possible without these awesome people and Projects:

 - Jan Pieter Waagmeester ([Leaflet Providers](https://github.com/leaflet-extras/leaflet-providers))
 - Per Liedman ([Leaflet Control Geocode](https://github.com/perliedman/leaflet-control-geocoder))
 - The entire [Leaflet](https://leafletjs.com/) Project
