<?php


add_filter('do_shortcode_tag',function($output,$tag,$attr){
	$migrate_fields = [
		'osm_layer_marker',
		'osm_layer',
		'osm',
		'leaflet_layer_marker',
		'leaflet_layer_marker_legacy',
		'leaflet_layer',
		'leaflet',
		'gm',
		'acf_gm_migrated'
	];
	if ( $tag === 'acf' && in_array($attr['field'], $migrate_fields ) ) {
		$output .= sprintf('<pre>get_post_meta() %s</pre>',var_export( get_post_meta(get_the_ID(), $attr['field'], true ),true ));
		$output .= sprintf('<pre>get_field() %s</pre>',var_export( get_field($attr['field'], null, false),true ));
		//$output .= sprintf('<pre>get_field_object() %s</pre>',var_export( get_field_object($attr['field']), true ));
	}
	return $output;
},10,4);
