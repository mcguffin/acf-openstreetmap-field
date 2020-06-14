ACF OpenStreetMap Field ToDo
============================

1.1.x
-----
 - [x] Disable keyboard navigation in Backend
 - [x] Locate Me Button (backend)
 - [x] Locate me: no add marker button if max_markers == 0
 - [x] Pass map init object along with `acf-osm-map-create` event (#37)
 - [x] Localizable address formats

1.2.0
-----
 - [x] Options: allow `'api_key':'<enter key here>'` in filter `acf_osm_leaflet_providers` (#38)
 - [ ] Tests:
     - [ ] ACF-Customizer
     - [ ] ACF WP-Objects
     - [ ] ACF Quick Edit Fields
 - [x] Fit markers in view (backend) #30
 
Future
------
 - [ ] Make Marker Data match ACF Google-Map Data (#39, #44)
 - [ ] Support MapBox GL / Leaflet GL: https://github.com/mapbox/mapbox-gl-leaflet
 - [ ] Use Plugin Boilerplate
 - [ ] ESNext
 - [ ] Refactor JS
 - [ ] Refactor Core
 - [ ] Theme Override
 - [ ] Default Templates
   - [ ] iFrame
   - [ ] OSM-URL
   - [ ] Leaflet Div
   - [ ] Static image #31


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
