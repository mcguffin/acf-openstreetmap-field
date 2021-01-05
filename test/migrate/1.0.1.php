<?php

global $table_prefix;

$slug = 'acf-osm-migrate-1-0-1';

$postdata = [
	'post_title' => 'ACF OSM Migrate 1.0.1',
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
	({$post_id}, 'osm_layer_marker', 'a:5:{s:10:\"center_lat\";s:17:\"8.966471298599485\";s:10:\"center_lng\";s:18:\"1.2593078613281252\";s:4:\"zoom\";s:2:\"10\";s:6:\"layers\";a:1:{i:0;s:17:\"OpenStreetMap.HOT\";}s:7:\"markers\";a:1:{i:0;a:4:{s:13:\"default_label\";s:32:\"183 Sokodé Region Centrale Togo\";s:3:\"lat\";d:8.985461927760642;s:3:\"lng\";d:1.1425781250000002;s:5:\"label\";s:32:\"183 Sokodé Region Centrale Togo\";}}}'),
	({$post_id}, '_osm_layer_marker', 'field_5ff40a3d62e0f'),
	({$post_id}, 'osm_layer', 'a:5:{s:10:\"center_lat\";s:17:\"9.167178732976677\";s:10:\"center_lng\";s:17:\"7.638244628906251\";s:4:\"zoom\";s:1:\"9\";s:6:\"layers\";a:1:{i:0;s:13:\"OpenStreetMap\";}s:7:\"markers\";a:0:{}}'),
	({$post_id}, '_osm_layer', 'field_5ff40a7062e10'),
	({$post_id}, 'osm', 'a:5:{s:10:\"center_lat\";s:17:\"55.71782880151228\";s:10:\"center_lng\";s:17:\"37.82592773437501\";s:4:\"zoom\";s:1:\"8\";s:6:\"layers\";a:1:{i:0;s:17:\"OpenStreetMap.HOT\";}s:7:\"markers\";a:0:{}}'),
	({$post_id}, '_osm', 'field_5ff40a8162e11'),
	({$post_id}, 'leaflet_layer_marker', 'a:5:{s:10:\"center_lat\";s:18:\"31.587894464070395\";s:10:\"center_lng\";s:15:\"-5.965576171875\";s:4:\"zoom\";s:1:\"7\";s:6:\"layers\";a:2:{i:0;s:17:\"Stamen.Watercolor\";i:1;s:18:\"Stamen.TonerHybrid\";}s:7:\"markers\";a:5:{i:0;a:4:{s:13:\"default_label\";s:28:\"23200 Fkih Ben Salah Marokko\";s:3:\"lat\";d:32.49277476824954;s:3:\"lng\";d:-6.65771484375;s:5:\"label\";s:28:\"23200 Fkih Ben Salah Marokko\";}i:1;a:4:{s:13:\"default_label\";s:23:\"83002 Taroudant Marokko\";s:3:\"lat\";d:30.51652652810575;s:3:\"lng\";d:-8.898925781250002;s:5:\"label\";s:23:\"83002 Taroudant Marokko\";}i:2;a:4:{s:13:\"default_label\";s:28:\"RN9 45006 Ouarzazate Marokko\";s:3:\"lat\";d:30.91322201208639;s:3:\"lng\";d:-6.910400390625001;s:5:\"label\";s:28:\"RN9 45006 Ouarzazate Marokko\";}i:3;a:4:{s:13:\"default_label\";s:39:\"46202 El Gantour الڭنطور Marokko\";s:3:\"lat\";d:32.242231301398874;s:3:\"lng\";d:-8.481445312500002;s:5:\"label\";s:39:\"46202 El Gantour الڭنطور Marokko\";}i:4;a:4:{s:13:\"default_label\";s:23:\"44103 Essaouira Marokko\";s:3:\"lat\";d:31.505190510544203;s:3:\"lng\";d:-9.788818359375002;s:5:\"label\";s:23:\"44103 Essaouira Marokko\";}}}'),
	({$post_id}, '_leaflet_layer_marker', 'field_5ff40aa862e12'),
	({$post_id}, 'leaflet_layer', 'a:5:{s:10:\"center_lat\";s:17:\"49.61070993807422\";s:10:\"center_lng\";s:18:\"16.358642578125004\";s:4:\"zoom\";s:1:\"7\";s:6:\"layers\";a:3:{i:0;s:16:\"CartoDB.Positron\";i:1;s:10:\"OpenSeaMap\";i:2;s:18:\"Stamen.TonerHybrid\";}s:7:\"markers\";a:0:{}}'),
	({$post_id}, '_leaflet_layer', 'field_5ff40ae462e13'),
	({$post_id}, 'leaflet', 'a:5:{s:10:\"center_lat\";s:17:\"28.98892237190413\";s:10:\"center_lng\";s:13:\"-13.623046875\";s:4:\"zoom\";s:1:\"7\";s:6:\"layers\";a:3:{i:0;s:18:\"Stamen.TonerHybrid\";i:1;s:20:\"OpenStreetMap.Mapnik\";i:2;s:18:\"Stamen.TonerHybrid\";}s:7:\"markers\";a:0:{}}'),
	({$post_id}, '_leaflet', 'field_5ff40afe62e14');";

$GLOBALS['wpdb']->query("DELETE FROM `{$table_prefix}postmeta` WHERE post_id = {$post_id}");
$GLOBALS['wpdb']->query($sql);

$group_key = 'group_acf_osm_migrate_1_0_1';

if ( $field_group_post = acf_get_field_group_post($group_key) ) {
	wp_delete_post($field_group_post->ID,true);
}

$json = file_get_contents( __DIR__ . '/acf-json/'.$group_key.'.json' );

acf_import_field_group( json_decode( $json, true ) );

