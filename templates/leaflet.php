<?php
/**
 *	Map Template Name: Leaflet JS
 */

// need $field & $value
$map = $args['map'];
$field = $args['field'];
// features: multiple markers. lots of maps to choose from
$map_attr = [
	'class'				=> 'leaflet-map',
	'data-height'		=> $field['height'],
	'data-map'			=> 'leaflet',
	'data-map-lng'		=> $value['lng'],
	'data-map-lat'		=> $value['lat'],
	'data-map-zoom'		=> $value['zoom'],
	'data-map-layers'	=> $value['layers'],
	'data-map-markers'	=> $value['markers'],
];


?>
<div <?php echo acf_esc_attr( $attr ) ?>></div>
<?php

wp_enqueue_script( 'acf-osm-frontend' );
wp_enqueue_style( 'leaflet' );
