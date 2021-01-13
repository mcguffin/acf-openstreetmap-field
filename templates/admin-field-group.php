<?php
/**
 *	Map Template Name: Field Group Admin
 *	Private: 1
 *
 *	## Changelog:
 *	### 1.4.0
 *	 - introduce field group admin template 
 */

/** @var Array $args [
 *		'input_id'		=> String,
 *		'input_name'	=> String,
 *		'map_object'	=> (object \ACFFieldOpenstreetmap\Model\Map)
 *		'controls' 		=> Array [
 *			[ 'type' => String, 'prop' => Mixed, ... ],
 *			...
 *		]
 *	]
 */
$map = $args['map_object']->toArray();
$controls = $args['controls'];

$has_providers = (boolean) count( array_filter( $controls, function( $control ) {
	return 'providers' === $control['type'];
} ) );

$controls = array_map( function( $control ) {
	if ( 'providers' === $control['type'] ) {
		$control = wp_parse_args( $control, [
			'config' => array_values( acf_osm_get_leaflet_providers() ),
		]);
	}
	return $control;
}, $controls );

$attr = [
	'class'				=> 'leaflet-map',
	'data-height'		=> $map['height'],
	'data-map'			=> 'leaflet',
	'data-map-lng'		=> $map['lng'],
	'data-map-lat'		=> $map['lat'],
	'data-map-zoom'		=> $map['zoom'],
	'data-map-layers'	=> $map['layers'],
	'data-map-controls'	=> $controls,
	'data-map-version'	=> $map['version'],
];

?>

<div class="leaflet-parent">
	<input <?php echo acf_osm_esc_attr( [
		'id'	=> $args['input_id'],
		'name'	=> $args['input_name'],
		'type'	=> 'hidden',
		'class' => 'osm-json',
		'value'	=> $map,
	] ) ?> />
	<div data-map-admin <?php echo acf_osm_esc_attr( $attr ) ?>></div>
</div>
<?php