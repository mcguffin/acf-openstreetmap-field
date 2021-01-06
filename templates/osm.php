<?php
/**
 *	Map Template Name: iFrame (OpenStreetMap.org)
 *
 *	## Changelog:
 *	### 1.3.0
 *	 - introduced template
 *
 *	### 1.4.0
 *	 - use acf_osm_esc_attr() instead of acf_esc_attr()
 *	 - use acf_osm_get_iframe_url(), acf_osm_get_link_url() to generate URLs
 *	 - use 1.4.0 map model
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

$iframe_atts = [
	'height'		=> $map['height'],
	'width'			=> '425',
	'frameborder'	=> 0,
	'scrolling'		=> 'no',
	'marginheight'	=> 0,
	'marginwidth'	=> 0,
	'class'			=> 'intrinsic-ignore', // prevent twentytwenty embed scaling
	'src'			=> esc_url( acf_osm_get_iframe_url( $map ) ),
];

$link_atts = [
	'target'	=> '_blank',
	'href'		=> esc_url( acf_osm_get_link_url( $map ) ),
];

?>
<iframe <?php echo acf_osm_esc_attr( $iframe_atts ); ?>></iframe>
<p>
	<small>
		<a <?php echo acf_osm_esc_attr( $link_atts ); ?>>
			<?php esc_html_e( 'View Larger Map','acf-openstreetmap-field' ); ?>
		</a>
	</small>
</p>