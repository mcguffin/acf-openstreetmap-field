<?php
/**
 *	Map Template Name: Leaflet JS
 *
 *	Changelog:
 *	- 1.3.0: introduced
 *	- 1.4.0: removed markers attribute. use acf_osm_esc_attr() instead of acf_esc_attr().
 */

// need $field & $value
$map = $args['map'];
$field = $args['field'];
// features: multiple markers. lots of maps to choose from
$attr = [
	'class'				=> 'leaflet-map',
	'data-height'		=> $field['height'],
	'data-map'			=> 'leaflet',
	'data-map-lng'		=> $map['lng'],
	'data-map-lat'		=> $map['lat'],
	'data-map-zoom'		=> $map['zoom'],
	'data-map-layers'	=> $map['layers'],
];


?>
<div <?php echo acf_osm_esc_attr( $attr ) ?>></div>
<?php

wp_enqueue_script( 'acf-osm-frontend' );
wp_enqueue_style( 'leaflet' );
