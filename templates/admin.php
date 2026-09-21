<?php
/**
 *	Map Template Name: Admin
 *	Private: 1
 */

$osm_map = $args['map'];
$field = $args['field'];
$attr = (array) $args['field']['attr'] + [
	'class'				=> 'leaflet-map',
	'data-height'		=> $field['height'],
	'data-map'			=> 'leaflet',
	'data-map-lng'		=> $osm_map['lng'],
	'data-map-lat'		=> $osm_map['lat'],
	'data-map-zoom'		=> $osm_map['zoom'],
	'data-map-layers'	=> $osm_map['layers'],
	'data-map-markers'	=> $osm_map['markers'],
];

?>
<div <?php echo acf_esc_attr( $attr ) ?>></div>
<?php
