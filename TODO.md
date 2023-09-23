ACF OpenStreetMap Field ToDo
============================

Remove dependencies
-------------------
 - [x] Frontend jQuery
   - [x] Use `CustomEvent` in frontend event triggers
   - [x] Replace `.trigger()` an `.on()` in favor of `addEventListener()` and `dispatchEvent()` entirely
   - [x] Work with DOM objects everywhere
 - [ ] ACF
   - [ ] Seperate Field-logic from map logic
 - [ ] Leaflet providers
 - [ ] Leaflet control geocode
 - [ ] Leaflet locatecontrol

ESNext
------
 - [x] Use imports
 - [ ] use modern syntax
 - [ ] modularize

Theme Overrides
---------------
 - [ ] Scan Template files
 - [ ] Default Templates
   - [ ] OSM-iFrame
   - [ ] OSM-Link
   - [ ] Leaflet Div
   - [ ] Static image #31

Features
--------
 - [ ] Extend WP Core
   - [ ] geolocate post types
   - [ ] output geojson feed
   - [ ] Map block
   - [ ] Map post type (fullscreen map)
 - [ ] Map tile proxy
   - [ ] proxy
   - [ ] cache
 - [ ] Redesign Map UI

Future
------
 - [ ] Support MapBox GL / Leaflet GL: https://github.com/mapbox/mapbox-gl-leaflet

ACF Google-Map compatibility
----------------------------
 - [ ] Conversion from one field type to another #57
 - [ ] Make Marker Data match ACF Google-Map Data (#39, #44)
```
// marker data provided by nominatim geocoder:
{
    place : '',
    tourism : '',
    
    building : '',
    road : '',
    house_number : '',
    amenity : '',

    postcode : '',
    city : '',
    town : '',
    village : '',
    hamlet : '',
    suburb : '',
    neighbourhood : '',
    quarter : '',

    county : '',
    state : '',
    country : '',
    country_code: '',
    municipality: '',
    
    railway : '',
    
    // and so much more ...
}

// ACF marker data
{
   street_number : '',
   street_name : '',
   city : '',
   state : '',
   post_code : '',
   country : '',
}
```
