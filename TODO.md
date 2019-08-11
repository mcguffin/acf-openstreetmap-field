ACF OpenStreetMap Field ToDo
============================

1.1.0
-----

 - [x] Bug: Flexible-Content: Add entry > Repeater: Add entry, select type > Weird Map (3x searchfield)
 - [x] ACF Field group attached to post > Block Editor > Map init with 1x1 tile upperleft corner
 - [x] Refactor: 
    - [x] Store map-data in single input field
    - [x] JS: use Backbone.model.set('lat') // lng, zoom, layers, markers, ...
 - [x] localize js
 - [x] Bugs: 
     - [x] Map with allow_layer_select=false doesn't init
     - [x] Field Group Admin: add map > map doesn't init
     - [x] Field Group Admin: Duplicate Field > 2 Search inputs
     - [x] Repeater > Map: Map doesn't init.
 - [x] Test:
     - [x] Data generated in <= 1.0.1
         - [ ] iFrame: there used to be address, ... hmm... ACF Artifacts?
     - [x] Data conversion from ACF GoogleMap Field (and back?)
         - Format: { lat: %f, lng: %f, address: %s }
     - [x] Greate Tester Fields
     - [x] ACF: Block Editor
         - [x] As Block
             - [x] Map-CC z-index
             - [x] Align Left + Right
             - [x] iFrame: wrong layers-param
             - [x] iFrame: cant select, catches mouse events
             - [x] Switch edit/preview: Map invalidate size 
             - [x] Marker-labels below map (z-index)
         - [x] As Metabox
     - [x] ACF: Widgets
     - [x] ACF: Frontend-Form
     - [x] ACF: Options Page
     - [x] 3rd Party: 
        - [x] ACF Duplicate Repeater
 - [x] Hide JSON Data input
 - [x] Marker Message: hide if max_markers exceeded
 - [x] Move Accuracy to script l10n
 
 1.2.0
 -----
 - [ ] Tests:
     - [ ] ACF-Customizer
     - [ ] ACF WP-Objects
     - [ ] ACF Quick Edit Fields
 - [ ] UI: btn fit markers in View
 - [ ] UI: enter lat/lng/zoom for map and lat/lng for marker
 - [ ] Data: Marker Meta: textarea, text, number, file, image, URL, email, ... 
 - [ ] Settings: individually disable map providers
