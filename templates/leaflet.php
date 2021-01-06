<?php
/**
 *	Map Template Name: Leaflet JS
 *
 *	## Changelog:
 *	### 1.3.0
 *	 - introduce leaflet template
 *
 *	### 1.4.0
 *	 - use acf_osm_esc_attr() instead of acf_esc_attr()
 *	 - Use 1.4.0 map model (no more markers attribute)
 */

// need $field & $value
/**
 *	@var Array $args [
 *		'height'		=> (int),
 *		'map_object'	=> (object \ACFFieldOpenstreetmap\Model\Map),
 *		// legacy 1.3.0 map data:
 *		'map' => [
 *			'lat'		=> (float),
 *			'lng'		=> (float),
 *			'zoom'		=> (int),
 *			'layers'	=> [ 
 *				(string), ...
 *			],
 *			'markers'	=> [
 *				[ 'lat' => (float), 'lng' => (float), 'label' => (string), 'default_label' => (string), 'data' => (array) ]
 *			],
 *		],
 *		// legacy 1.3.0 acf field:
 *		'field' => [
 *			'height' => (int),
 *			...
 *		],
 *	]
 */
$map = $args['map_object']->toArray();
// features: multiple markers. lots of maps to choose from
$attr = [
	'class'				=> 'leaflet-map',
	'data-height'		=> $map['height'],
	'data-map'			=> 'leaflet',
	'data-map-lng'		=> $map['lng'],
	'data-map-lat'		=> $map['lat'],
	'data-map-zoom'		=> $map['zoom'],
	'data-map-layers'	=> $map['layers'],
	'data-map-version'	=> $map['version'],
];

?>
<div <?php echo acf_osm_esc_attr( $attr ) ?>></div>
<?php

wp_enqueue_script( 'acf-osm-main' );
wp_enqueue_style( 'leaflet' );
