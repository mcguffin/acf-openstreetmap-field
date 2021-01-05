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

<h3>Leaflet Layers Marker</h3>
[acf field="leaflet_layer_marker"]

<h3>Leaflet Layers</h3>
[acf field="leaflet_layer"]

<h3>Leaflet Layers</h3>
[acf field="leaflet"]
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
	({$post_id}, 'osm_layer_marker', 'a:7:{s:3:\"lat\";d:44.9142494;s:3:\"lng\";d:14.8974609;s:4:\"zoom\";i:8;s:7:\"markers\";a:1:{i:0;a:4:{s:5:\"label\";s:17:\"Jadovno, Kroatien\";s:13:\"default_label\";s:17:\"Jadovno, Kroatien\";s:3:\"lat\";d:44.52001;s:3:\"lng\";d:15.2325439;}}s:7:\"address\";s:17:\"Jadovno, Kroatien\";s:6:\"layers\";a:1:{i:0;s:13:\"OpenStreetMap\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_osm_layer_marker', 'field_5ff40a3d62e0f'),
	({$post_id}, 'osm_layer', 'a:7:{s:3:\"lat\";d:53.5534527;s:3:\"lng\";d:9.9578842;s:4:\"zoom\";i:18;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:1:{i:0;s:13:\"OpenStreetMap\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_osm_layer', 'field_5ff40a7062e10'),
	({$post_id}, 'osm', 'a:7:{s:3:\"lat\";d:53.5534244;s:3:\"lng\";d:9.9579739;s:4:\"zoom\";i:18;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:1:{i:0;s:17:\"OpenStreetMap.HOT\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_osm', 'field_5ff40a8162e11'),
	({$post_id}, 'leaflet_layer_marker', 'a:7:{s:3:\"lat\";d:53.5653947;s:3:\"lng\";d:9.9560165;s:4:\"zoom\";i:12;s:7:\"markers\";a:5:{i:0;a:4:{s:5:\"label\";s:43:\"Am Brunnenhof 1, 22767, Hamburg Deutschland\";s:13:\"default_label\";s:43:\"Am Brunnenhof 1, 22767, Hamburg Deutschland\";s:3:\"lat\";d:53.5534388;s:3:\"lng\";d:9.9578585;}i:1;a:4:{s:5:\"label\";s:43:\"Ohnhorststraße, 22609, Hamburg Deutschland\";s:13:\"default_label\";s:43:\"Ohnhorststraße, 22609, Hamburg Deutschland\";s:3:\"lat\";d:53.5591072;s:3:\"lng\";d:9.8643494;}i:2;a:4:{s:5:\"label\";s:48:\"Großmannstraße 185, 20539, Hamburg Deutschland\";s:13:\"default_label\";s:48:\"Großmannstraße 185, 20539, Hamburg Deutschland\";s:3:\"lat\";d:53.5360567;s:3:\"lng\";d:10.0638199;}i:3;a:4:{s:5:\"label\";s:46:\"Bramfelder Straße, 22305, Hamburg Deutschland\";s:13:\"default_label\";s:46:\"Bramfelder Straße, 22305, Hamburg Deutschland\";s:3:\"lat\";d:53.58561;s:3:\"lng\";d:10.0494003;}i:4;a:4:{s:5:\"label\";s:55:\"Haus 4 Gazellenkamp, 22529 Hamburg, Hamburg Deutschland\";s:13:\"default_label\";s:55:\"Haus 4 Gazellenkamp, 22529 Hamburg, Hamburg Deutschland\";s:3:\"lat\";d:53.5992627;s:3:\"lng\";d:9.9494934;}}s:7:\"address\";s:43:\"Am Brunnenhof 1, 22767, Hamburg Deutschland\";s:6:\"layers\";a:3:{i:0;s:16:\"CartoDB.Positron\";i:1;s:18:\"Stamen.TonerHybrid\";i:2;s:18:\"HEREv3.trafficFlow\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_leaflet_layer_marker', 'field_5ff40aa862e12'),
	({$post_id}, 'leaflet_layer', 'a:7:{s:3:\"lat\";d:52.4903066;s:3:\"lng\";d:13.4321594;s:4:\"zoom\";i:10;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:3:{i:0;s:20:\"Stadia.AlidadeSmooth\";i:1;s:17:\"Stamen.TonerLines\";i:2;s:18:\"HEREv3.trafficFlow\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_leaflet_layer', 'field_5ff40ae462e13'),
	({$post_id}, 'leaflet', 'a:7:{s:3:\"lat\";d:50.06904;s:3:\"lng\";d:19.9734879;s:4:\"zoom\";i:12;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:3:{i:0;s:18:\"Stamen.TonerHybrid\";i:1;s:20:\"OpenStreetMap.Mapnik\";i:2;s:18:\"Stamen.TonerHybrid\";}s:7:\"version\";s:5:\"1.3.1\";}'),
	({$post_id}, '_leaflet', 'field_5ff40afe62e14'),
	({$post_id}, 'map', 'a:7:{s:3:\"lat\";d:43.8820573;s:3:\"lng\";d:17.7264404;s:4:\"zoom\";i:8;s:7:\"markers\";a:0:{}s:7:\"address\";s:0:\"\";s:6:\"layers\";a:1:{i:0;s:17:\"OpenStreetMap.HOT\";}s:7:\"version\";s:5:\"1.3.1\";}'),
({$post_id}, '_map', 'field_5fe884aa95558');";

$GLOBALS['wpdb']->query("DELETE FROM `{$table_prefix}postmeta` WHERE post_id = {$post_id}");
$GLOBALS['wpdb']->query($sql);





$group_key = 'group_acf_osm_migrate_1_3_1';

if ( $field_group_post = acf_get_field_group_post($group_key) ) {
	wp_delete_post($field_group_post->ID,true);
}

$json = file_get_contents( __DIR__ . '/acf-json/'.$group_key.'.json' );

acf_import_field_group( json_decode( $json, true ) );

