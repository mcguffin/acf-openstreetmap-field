<?php

global $table_prefix;

$slug = 'acf-osm-migrate-gm';

$postdata = [
	'post_title' => 'ACF OSM GoogleMaps',
	'post_type' => 'post',
	'post_name' => $slug,
	'post_status' => 'publish',
	'post_content' => '<h3>GM Field</h3>
[acf field="gm"]

<h3>GM Field Migrated</h3>
[acf field="acf_gm_migrated"]
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


$sql = "INSERT INTO `{$table_prefix}postmeta` (`post_id`, `meta_key`, `meta_value`)
VALUES
	({$post_id}, 'gm', 'a:13:{s:7:\"address\";s:44:\"Dörpfeldstraße 35B, 22609 Hamburg, Germany\";s:3:\"lat\";d:53.567699868265365;s:3:\"lng\";d:9.840698242187504;s:4:\"zoom\";i:9;s:8:\"place_id\";s:27:\"ChIJz_U_hG2EsUcRTyroao5QBAw\";s:13:\"street_number\";s:3:\"35B\";s:11:\"street_name\";s:16:\"Dörpfeldstraße\";s:4:\"city\";s:7:\"Hamburg\";s:5:\"state\";s:7:\"Hamburg\";s:11:\"state_short\";s:2:\"HH\";s:9:\"post_code\";s:5:\"22609\";s:7:\"country\";s:7:\"Germany\";s:13:\"country_short\";s:2:\"DE\";}'),
	({$post_id}, '_gm', 'field_5ff6fa19acf55'),
	({$post_id}, 'acf_gm_migrated', 'a:13:{s:7:\"address\";s:44:\"Dörpfeldstraße 35B, 22609 Hamburg, Germany\";s:3:\"lat\";d:53.567699868265365;s:3:\"lng\";d:9.840698242187504;s:4:\"zoom\";i:9;s:8:\"place_id\";s:27:\"ChIJz_U_hG2EsUcRTyroao5QBAw\";s:13:\"street_number\";s:3:\"35B\";s:11:\"street_name\";s:16:\"Dörpfeldstraße\";s:4:\"city\";s:7:\"Hamburg\";s:5:\"state\";s:7:\"Hamburg\";s:11:\"state_short\";s:2:\"HH\";s:9:\"post_code\";s:5:\"22609\";s:7:\"country\";s:7:\"Germany\";s:13:\"country_short\";s:2:\"DE\";}'),
	({$post_id}, '_acf_gm_migrated', 'field_5ff6fc0ec0b02');";

$GLOBALS['wpdb']->query("DELETE FROM `{$table_prefix}postmeta` WHERE post_id = {$post_id}");
$GLOBALS['wpdb']->query($sql);



$group_key = 'group_acf_osm_migrate_gm';

if ( $field_group_post = acf_get_field_group_post($group_key) ) {
	acf_delete_field_group( $field_group_post->ID );
}

$json = file_get_contents( __DIR__ . '/acf-json/'.$group_key.'.json' );

acf_import_field_group( json_decode( $json, true ) );

