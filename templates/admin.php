<?php
/**
 *	Map Template Name: Admin
 *	Private: 1
 */

$map = $args['map'];
$field = $args['field'];
$attr = (array) $args['field']['attr'] + [
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

