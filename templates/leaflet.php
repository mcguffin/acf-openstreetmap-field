<?php
/**
 *	Map Template Name: Leaflet JS
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
	'data-map-markers'	=> $map['markers'],
];


?>
<div <?php echo acf_esc_attr( $attr ) ?>></div>
<?php

wp_enqueue_script( 'acf-osm-frontend' );
wp_enqueue_style( 'leaflet' );
