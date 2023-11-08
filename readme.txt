=== ACF OpenStreetMap Field ===
Contributors: podpirate
Donate link: https://donate.openstreetmap.org/
Tags: map acf openstreetmap leaflet
Requires at least: 4.8
Requires PHP: 5.6
Tested up to: 6.4
Stable tag: 1.5.4
License: GPLv3 or later
License URI: http://www.gnu.org/licenses/gpl-3.0.html

A configurable OpenStreetMap Field for ACF.

== Description ==

Hazzle free OpenStreetMap with [ACF](https://www.advancedcustomfields.com/).

## Usage

#### In the Fieldgroup editor:

**Return Format:**

 - *Raw data* will return an array holding the field configuration.

 - *Leaflet JS* will return a fully functional leaflet map. Just include `<?php the_field('my_field_name'); ?>` in your Theme.
You can choose from a long list of map styles and it supports multiple markers.

 - *iFrame (OpenStreetMap.org)* Will return an iFrame HTML. Only four map styles are supported
– the ones you find on [OpenStreetMap](https://www.openstreetmap.org/) – and not more than one marker.

**Map Appearance:** Pan and zoom on the map and select from the Map layers to set the initial map position and style in the editor.

**Map Position:** If you're more like a numbers person here you can enter numeric values for the map position.

**Allow layer selection:** Allow the editors to select which map layers to show up in the frontend.

**Height:** Map height in the frontend and editor.

**Max. number of Markers**
 - *No value:* infinite markers
 - *0:* No markers
 - *Any other value:* Maximum number of markers. If the return format is *iFrame* there can ony be one marker.

## Development

Please head over to the source code [on Github](https://github.com/mcguffin/acf-openstreetmap-field).

## Credits
- [ACF](https://www.advancedcustomfields.com/) for sure!
- The [OpenStreetMap](https://www.openstreetmap.org/) project
- [The Leaflet Project](https://leafletjs.com/)
- The maintainers and [contributors](https://github.com/leaflet-extras/leaflet-providers/graphs/contributors) of [Leaflet providers](https://github.com/leaflet-extras/leaflet-providers)
- The [very same](https://github.com/perliedman/leaflet-control-geocoder/graphs/contributors) for [Leaflet Control Geocode](https://github.com/perliedman/leaflet-control-geocoder)
- [Dominik Moritz](https://www.domoritz.de/) who delighted us with [Leaflet locate control](https://github.com/domoritz/leaflet-locatecontrol)
- Numerous individuals and organizations who provide wonderful Map related services free of charge. (You are credited in the map, I hope)

== Installation ==

Follow the standard [WordPress plugin installation procedere](http://codex.wordpress.org/Managing_Plugins).


== Frequently asked questions ==

= I found a bug. Where should I post it? =

Please use the issues section in the [GitHub-Repository](https://github.com/mcguffin/acf-openstreetmap-field/issues).

I will most likely not maintain the forum support forum on wordpress.org. Anyway, other users might have an answer for you, so it's worth a shot.

= I'd like to suggest a feature. Where should I post it? =

Please post an issue in the [GitHub-Repository](https://github.com/mcguffin/acf-openstreetmap-field/issues)

= I am a map tile provider. Please don't include our service in your plugin. =

The provisers list is taken from [Leaflet providers](https://github.com/leaflet-extras/leaflet-providers), so requests for an unlisting should go there first.

If you want your service to remain in Leaflet Providers, you can Post an issue in the plugin's [GitHub-Repository](https://github.com/mcguffin/acf-openstreetmap-field/issues).
Please provide me some way for me to verify, that you are acting on behalf of the Tile service provider your want to exclude.
(E.g. the providers website has a link to your github account.)

= Im getting these "Insecure Content" Warnings =

Some providers – like OpenPtMap or MtbMap – do not support https. If these warning bother you, choose a different one.

= Why isn't the map loading? =

There is very likely an issue with the map tiles provider you've choosen. Some of them might have gone offline or have suspended their service. Choose another one.

= I need to do some fancy JS magic with my map. =

Check out the [GitHub wiki](https://github.com/mcguffin/acf-openstreetmap-field/wiki). Some of the js events might come in handy for you.
For Documentation of the map object, please refer to [LeafletJS](https://leafletjs.com).

= Will you anwser support requests via emails? =

No.


== Screenshots ==

1. ACF Field Group Editor
2. Editing the Field Value
3. Display in the Frontend
4. Settings page. Configure API access keys and disable specific tile layers.

== Upgrade Notice ==

**Attention:** Version 1.5.0 may involve some breaking changes.

The global Leaflet object is no longer available.


== Changelog ==

= 1.5.4 =
 - Fix: JS ReferenceError on move marker with max markers = 1

= 1.5.3 =
 - Fix: Disable provider settings not displaying

= 1.5.2 =
 - Fix: JS Error if some providers are disabled

= 1.5.1 =
 - Backend UI: Attribution below map
 - ACF Field: Introduce conditional logic
 - Fix: Some map controls not visible in Blockeditor sidebar
 - Fix: Marker instructions display
 - Providers: [Migrate Stamen to Stadia Maps](https://maps.stamen.com/stadia-partnership/)
 - Providers: Update Esri Ocean base map, OpenAIP, Opensnowmap, OpenWeathermap, OpenFireMap, NLS, OpenRailwayMap, Jawg, MapTiler, MtbMap, nlmaps
 - Providers: Remove HERE (Legacy), Hydda (service down)
 - JS: Rewritten ACF integration

= 1.5.0 =
 - Use Leaflet noConflict
 - Refactor JS
 - Geocoder: Address detail level is now controlled by map zoom
 - Geocoder: Provide filters for configuration overides
 - Fix: Make JS event `acf-osm-map-marker-created` bubbling
 - Fix: JS Crashes in ACF Blocks
 - Fix: Weird coordinates (worldCopyJump)

= 1.4.3 =
 - Fix: JS – acf hook `acf-osm/create-marker` undefined argument + not firing on geocode

= 1.4.2 =
 - Fix: JS Error on append repeater

= 1.4.1 =
 - JS: remove console.log
 - Fix: admin js broken after jquery removal

= 1.4.0 =
 - UI: Adapt to ACF 6 field group admin
 - JS API: do acf actions on marker events
 - JS Frontend: remove jQuery dependency
 - Data: add geocode results to raw data
 - Fix: search submit button did not submit
 - Fix: print template script only if input element is present
 - Fix: value sanitation. Shold now work with Frontend Admin for ACF

= 1.3.5 =
 - Fix: Admin Marker styling broken
 - Fix: PHP Fatal with suki theme
 - Fix: include leaflet control geocode assets

= 1.3.4 =
 - Fix: locate control API

= 1.3.3 =
 - Upgrade leafletjs, leaflet-control-geocoder, leaflet-providers, leaflet, leaflet.locatecontrol to latest releases
 - Remove HikeBike map provider
 - Support ACF Rest API integration (since ACF 5.11)
 - Fix: PHP 8 compatibility
 - Fix: iframes in block preview not editable
 - Fix: quote missing on html attribute in osm template
 - Test with WP 6.0

= 1.3.2 =
 - Fix: No such variant of OpenStreetMap (Mapnik)
 - Fix: Popups not opening in Safari
 - Quick and dirty Fix: invalid (localized) lat/lng object.

= 1.3.1 =
 - Fix: JS Event acf-osm-map-marker-create not applying marker options

= 1.3.0 =
 - Theme Overrides: Override map output in your theme
 - Breaking Change: Use native JS Events
 - Breaking Change: `osm_map_iframe_template` filter gone in WP 5.5
 - Fix: jQuery 3.x (WP 5.6) compatibility
 - Fix: Map not showing on login form
 - Fix: Providers not loaded if webroot owner is not www-user
 - Upgrade: Leaflet 1.7.1
 - Upgrade: Leaflet Providers 1.11.0
 - Upgrade: Leaflet Control Geocoder 2.1.0

= 1.2.2 =
 - Fix: Duplicated Row (ACF 5.9+)

= 1.2.1 =
 - Upgrade FreeMapSK, CyclOSM

= 1.2.0 =
 - Feature: Settings page allowing you to disable specific map tile providersw
 - Feature: Fit markers in view (backend)
 - Upgrade: leaflet-providers, leaflet-control-geocoder, leaflet.locatecontrol

= 1.1.9 =
 - UI: Add Settings link on plugins list table
 - Fix: hide map provider with unconfigured api key from layer selection
 - Upgrade: leaflet-control-geocoder, leaflet.locatecontrol, leaflet-providers
 - Security hardening

= 1.1.8 =
 - Feature: make marker address formats localizable.
 - JS: pass map init object along with acf-os-map-create event
 - UI: hide add marker at my location button if markers cant be added

= 1.1.7 =
 - Feature: Add locate me button to backend
 - Fix: Geocoder search result still visible after marker added to map.
 - Fix: Required field and max_markers = 0 never saved
 - Fix: HERE app code not included in api requests

= 1.1.6 =
 - Feature: Observe DOM for newly added maps
 - Feature: allow manipulation of layer config in JS
 - Fix: JS event 'acf-osm-map-marker-create' not triggered

= 1.1.5 =
 - JS: added event Listener for ajax-loaded maps. Use <code>$(my_map_div).trigger('acf-osm-map-added');</code> on each newly added map.
 - Upgrade LeafletJS to 1.6.0

= 1.1.4 =
 - Upgrade Leaflet Providers to 1.9.0
 - Upgrade Leaflet Control Geocode to 1.10.0
 - Fix: Redraw maps when they become visible

= 1.1.3 =
 - UI: Better formatting for automatic marker labels
 - Fix: Map controls zindex in Block-Editor
 - Fix: Adding markers not working on mobile devices

= 1.1.2 =
 - Fix: PHP Strict Standards message

= 1.1.1 =
 - Fix: Required Field behaviour – "required" means now "must hava a marker"

= 1.1.0 =
 - UI: Usability Improvements
 - Tested: Verfied Compatibility with Widgets, Block-Editor, Frontend Form
 - Stored data pretty much like google map field
 - Code: Refactored JS

= 1.0.1 =
Convert Values from ACF Googlemaps-Field

= 1.0.0 =
Initial Release
