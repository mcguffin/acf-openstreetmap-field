<?php

add_action('wp_footer', function(){
	?>
	<script>

	const someCondition = false

document.addEventListener('acf-osm-map-create', e => {
	/**
	 *	@var L (object) Leaflet object
	 *	@var mapInit (object) Map options passed to L.map()
	 */
	const { L, mapInit } = e.detail;

	// e.target: html DIV element
	if ( someCondition ) {
		e.preventDefault();
		return
	}
	// set initial zoom
	mapInit.zoom = 7
})

document.addEventListener('acf-osm-map-init', e => {
	/**
	 *	@var L (object) Leaflet object
	 *	@var map (object) Leaflet map instance @see https://leafletjs.com/reference.html#map
	 */
	const { L, map } = e.detail;

	// e.target: html DIV element
	if ( someCondition ) {
		e.preventDefault();
		return
	}
	// set zoom
	map.setZoom(6)
})


document.addEventListener('acf-osm-map-created', e => {
	/**
	 *	@var L (object) Leaflet object
	 *	@var map (object) Leaflet map instance @see https://leafletjs.com/reference.html#map
	 */
	const { L, map } = e.detail;
	map.panBy( L.point(200, 200) )
})



document.addEventListener('acf-osm-map-create-markers', e => {
	/**
	 *	@var L (object) Leaflet object
	 *	@var map (object) Leaflet map instance @see https://leafletjs.com/reference.html#map
	 *	@var mapData (object) Map options passed to L.map()
	 */
	const { L, map, mapData } = e.detail;
	/**
	 *	@var mapMarkers (array) The map Markers
	 */
	const { mapMarkers } = mapData

	// not more than 2 markers please!
	while ( mapMarkers.length > 2 ) {
		mapMarkers.pop()
	}
})


document.addEventListener('acf-osm-map-marker-create', e => {
	/**
	 *	@var L (object) Leaflet object
	 *	@var map (object) Leaflet map instance @see https://leafletjs.com/reference.html#map
	 *	@var markerData (object) Marker data
	 *	@var markerOptions (object) Marker options
	 */
	const { L, map, markerData, markerOptions } = e.detail;

	/**
	 *	@var label (string) Marker label entered by user
	 *	@var default_label (string) Default marker label
	 *	@var lat (number) Latitude
	 *	@var lng (number) Longitude
	 *	@var geocode (object[]) json returned by geocoder. @see https://nominatim.org/release-docs/latest/api/Reverse/
	 */
	const { label, default_label, lat, lng, geocode } = markerData

	markerOptions.label = 'ScriptKiddie™ loves you!'
	markerOptions.icon.options.html = '<span style="font-size:24px">🤓</span>'
})

document.addEventListener('acf-osm-map-marker-created', e => {
	/**
	 *	@var L (object) Leaflet object
	 *	@var map (object) Leaflet map instance @see https://leafletjs.com/reference.html#map
	 *	@var marker (object) Leaflet marker Marker @see https://leafletjs.com/reference.html#marker
	 */
	const { L, map, marker } = e.detail;

	console.log( marker.toGeoJSON() )
})





	</script>
	<?php
});
