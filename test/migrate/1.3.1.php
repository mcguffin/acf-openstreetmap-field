<?php

global $table_prefix;

$slug = 'acf-osm-migrate-1-3-1';

$postdata = [
	'post_title' => 'ACF OSM Migrate 1.3.1',
	'post_type' => 'post',
	'post_name' => $slug,
	'post_status' => 'publish',
	'post_content' => '<h3>OSM Layers Marker</h3>
[acf field="osm_layer_marker"]

<h3>OSM Layers</h3>
[acf field="osm_layer"]

<h3>OSM Layers</h3>
[acf field="osm"]

<h3>OSM Legacy Theme Override</h3>
[acf field="osm_layer_marker_legacy"]

<h3>Leaflet Layers Marker</h3>
[acf field="leaflet_layer_marker"]

<h3>Leaflet Layers</h3>
[acf field="leaflet_layer"]

<h3>Leaflet</h3>
[acf field="leaflet"]

<h3>Leaflet Legacy Theme Override</h3>
[acf field="leaflet_layer_marker_legacy"]
',
	'post_type' => 'post',
];


$posts = get_posts([
	'name' => $slug,
	'post_type' => 'post',
	'post_status' => 'publish',
	'numerposts' => 1,
]);
if ( count( $posts ) ) {
	$post_id = $posts[0]->ID;
	$postdata['ID'] = $post_id;
}

// generate post
$post_id = wp_insert_post($postdata);

$sql = "INSERT INTO `{$table_prefix}postmeta` ( `post_id`, `meta_key`, `meta_value`)
VALUES
	({$post_id}, 'osm_layer_marker', 'a:7:{s:3:\"lat\";d:53.5507112;s:3:\"lng\";d:10.0006485;s:4:\"zoom\";i:12;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:1:{i:0;s:17:\"OpenStreetMap.HOT\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_osm_layer_marker', 'field_5ff40a3d62e0f'),
	({$post_id}, 'osm_layer', 'a:7:{s:3:\"lat\";d:53.5507112;s:3:\"lng\";d:10.0006485;s:4:\"zoom\";i:12;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:1:{i:0;s:17:\"OpenStreetMap.HOT\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_osm_layer', 'field_5ff40a7062e10'),
	({$post_id}, 'osm', 'a:7:{s:3:\"lat\";d:53.5507112;s:3:\"lng\";d:10.0006485;s:4:\"zoom\";i:12;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:1:{i:0;s:17:\"OpenStreetMap.HOT\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_osm', 'field_5ff40a8162e11'),
	({$post_id}, 'osm_layer_marker_legacy', 'a:7:{s:3:\"lat\";d:53.5507112;s:3:\"lng\";d:10.0006485;s:4:\"zoom\";i:12;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:1:{i:0;s:17:\"OpenStreetMap.HOT\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_osm_layer_marker_legacy', 'field_5ff5c5a1d9d28'),
	({$post_id}, 'leaflet_layer_marker', 'a:7:{s:3:\"lat\";d:53.5507112;s:3:\"lng\";d:10.0006485;s:4:\"zoom\";i:12;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:2:{i:0;s:17:\"OpenStreetMap.HOT\";i:1;s:18:\"Stamen.TonerHybrid\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_leaflet_layer_marker', 'field_5ff40aa862e12'),
	({$post_id}, 'leaflet_layer', 'a:7:{s:3:\"lat\";d:53.5507112;s:3:\"lng\";d:10.0006485;s:4:\"zoom\";i:12;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:2:{i:0;s:17:\"OpenStreetMap.HOT\";i:1;s:18:\"Stamen.TonerHybrid\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_leaflet_layer', 'field_5ff40ae462e13'),
	({$post_id}, 'leaflet', 'a:7:{s:3:\"lat\";d:53.5660064;s:3:\"lng\";d:9.7816086;s:4:\"zoom\";i:12;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:2:{i:0;s:20:\"OpenStreetMap.Mapnik\";i:1;s:18:\"Stamen.TonerHybrid\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_leaflet', 'field_5ff40afe62e14'),
	({$post_id}, 'leaflet_layer_marker_legacy', 'a:7:{s:3:\"lat\";d:53.5507112;s:3:\"lng\";d:10.0006485;s:4:\"zoom\";i:12;s:7:\"markers\";a:2:{i:0;a:4:{s:5:\"label\";s:42:\"Parkstraße 35, 22605, Hamburg Deutschland\";s:13:\"default_label\";s:42:\"Parkstraße 35, 22605, Hamburg Deutschland\";s:3:\"lat\";d:53.5529481;s:3:\"lng\";d:9.8808289;}i:1;a:4:{s:5:\"label\";s:40:\"Maukestieg 2, 22119, Hamburg Deutschland\";s:13:\"default_label\";s:40:\"Maukestieg 2, 22119, Hamburg Deutschland\";s:3:\"lat\";d:53.5425448;s:3:\"lng\";d:10.1094818;}}s:7:\"address\";s:42:\"Parkstraße 35, 22605, Hamburg Deutschland\";s:6:\"layers\";a:3:{i:0;s:16:\"Stadia.OSMBright\";i:1;s:11:\"OpenFireMap\";i:2;s:18:\"HEREv3.trafficFlow\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_leaflet_layer_marker_legacy', 'field_5ff5c4d35538c');";

$GLOBALS['wpdb']->query("DELETE FROM `{$table_prefix}postmeta` WHERE post_id = {$post_id}");
$GLOBALS['wpdb']->query($sql);





$group_key = 'group_acf_osm_migrate_1_3_1';

if ( $field_group_post = acf_get_field_group_post($group_key) ) {
	acf_delete_field_group( $field_group_post->ID );
}

$json = file_get_contents( __DIR__ . '/acf-json/'.$group_key.'.json' );

acf_import_field_group( json_decode( $json, true ) );

