<?php
/**
 *	Map Template Name: iFrame (OpenStreetMap.org)
 */

// need $field & $value
$map = $args['map'];
$field = $args['field'];
// features: one marker max. four maps to choose from
$osm_providers = \ACFFieldOpenstreetmap\Core\OSMProviders::instance();

$iframe_atts = [
	'height'		=> $field['height'],
	'width'			=> '425',
	'frameborder'	=> 0,
	'scrolling'		=> 'no',
	'marginheight'	=> 0,
	'marginwidth'	=> 0,
];

?>
<iframe src="<?php echo esc_url( $osm_providers->get_iframe_url( $map ) ); ?>" <?php echo acf_esc_attr( $iframe_atts ); ?>></iframe><br/>
<small>
	<a target="_blank" href="<?php echo esc_url( $osm_providers->get_link_url( $map ) ); ?>">
		<?php esc_html_e( 'View Larger Map', 'acf-openstreetmap-field' ); ?>
	</a>
</small>