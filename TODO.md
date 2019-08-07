ACF OpenStreetMap Field ToDo
============================

 - [x] Bug: Flexible-Content: Add entry > Repeater: Add entry, select type > Weird Map (3x searchfield)
 - [x] ACF Field group attached to post > Block Editor > Map init with 1x1 tile upperleft corner
 - [x] Refactor: 
    - [x] Store map-data in single input field
        $map_data = [
        'lng' => ...,
        'lat' => ...,
        'zoom' => ...,
        'layers' => [ ... ],
        'markers' => [ ... ],
        ]
        - Each one maps to a .leaflet-map[data-\*] sttribute.
        - they are gathered with JSON.stringify() in a field input.
        - At save: json_decode( $value, true )
    - [x] JS: use Backbone.model.set('lat') // lng, zoom, layers, markers, ...
 - [ ] localize js
 - [ ] Bug: Map with allow_layer_select=false doesn't init
 - [ ] Test:
     - [ ] Data generated in <= 1.0.1
 - [ ] Settings: individually disable map providers
