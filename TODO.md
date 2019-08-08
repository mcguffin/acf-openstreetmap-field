ACF OpenStreetMap Field ToDo
============================

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
 - [ ] Test:
     - [ ] Data generated in <= 1.0.1
         - [ ] iFrame: there used to be address, ... hmm...
     - [x] Greate Tester Fields
     - [x] ACF: Block Editor
         - [x] As Block
             - [x] Map-CC z-index
             - [x] Align Left + Right
             - [x] iFrame: wrong layers-param
         - [x] As Metabox
     - [ ] ACF: Widgets
     - [ ] ACF: Options Page
     - [ ] ACF: Frontend-Form
     - [ ] 3rd: With ACF-Customizer
 - [ ] Settings: individually disable map providers
