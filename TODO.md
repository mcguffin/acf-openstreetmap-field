ACF OpenStreetMap Field ToDo
============================

Tests / Compatibility
---------------------
3rd Party
 - [ ] Elementor
 - [ ] Divi
 - [ ] Beaver Builder
 - [ ] ACF-Customizer
 - [ ] ACF WP-Objects
 - [ ] ACF Quick Edit Fields

Integrations
------------
 - [x] Introduce map widget
 - [ ] Introduce map block

ESNext
------
 - [x] Use imports
 - [x] Frontend
 - [x] Backend
 - [ ] Browserify sucks. Use Webpack...?

Theme Overrides
---------------
 - [x] Scan Template files
 - [x] Default Templates
   - [x] OSM-iFrame
   - [x] OSM-Link
   - [x] Leaflet Div
   - [ ] Static image #31

Future
------
 - [ ] Support MapBox GL / Leaflet GL: https://github.com/mapbox/mapbox-gl-leaflet
 - [ ] GeoTag Posts, display as Layer
 - [ ] Save map Screenshot (canvas to png)

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

// ACF map data
{
  address : '',
  lat : 12.34,
  lng : 12.34,
  zoom : 12,
  place_id : '',
  street_number : '',
  street_name : '',
  city : '',
  state : '',
  state_short : '',
  post_code : '',
  country : '',
  country_short : '',
}
```
