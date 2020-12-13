ACF OpenStreetMap Field ToDo
============================

1.2.0
-----
 - [x] Options: allow `'api_key':'<enter key here>'` in filter `acf_osm_leaflet_providers` (#38)
 - [ ] Tests:
     - [ ] ACF-Customizer
     - [ ] ACF WP-Objects
     - [ ] ACF Quick Edit Fields
 - [x] Fit markers in view (backend) #30


Remove dependencies
-------------------
 - [ ] Frontend jQuery
   - [x] Use `CustomEvent` in frontend event triggers
   - [ ] Replace `.trigger()` an `.on()` in favor of `addEventListener()` and `dispatchEvent()` entirely
   - [ ] Work with DOM objects everywhere
 - [ ] ACF
   - [ ] Seperate Field-logic from map logic
   - [ ] Introduce map widget
   - [ ] Introduce map block

ESNext
------
 - [ ] Use imports
 - [ ] Frontend
 - [ ] Backend

Theme Overrides
---------------
 - [ ] Scan Template files
 - [ ] Default Templates
   - [ ] OSM-iFrame
   - [ ] OSM-Link
   - [ ] Leaflet Div
   - [ ] Static image #31

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
