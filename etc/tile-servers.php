<?php

return array(

	'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
		=> array(
			'title'			=> __('OpenStreetMap','acf-open-street-map'),
			'attribution'	=> __('&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>', 'acf-open-street-map' ),
			'maxZoom'		=> 20,
			'subdomains'	=> 'abc',
		),
	'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png'
		=> array(
			'title'			=> __('Carto Light','acf-open-street-map'),
			'attribution'	=> __('&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>', 'acf-open-street-map' ),
			'maxZoom'		=> 18,
			'detectRetina'	=> true,
		),
	'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png'
		=> array(
			'title'			=> __('Carto Dark','acf-open-street-map'),
			'attribution'	=> __('&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>', 'acf-open-street-map' ),
			'maxZoom'		=> 18,
			'detectRetina'	=> true,
		),

	'http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'
		=> array(
			'title'			=> __('HOT','acf-open-street-map'),
			'attribution'	=> __('&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>', 'acf-open-street-map' ),
			'maxZoom'		=> 18,
			'subdomains'	=> 'abc',
		),

	// 'https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png'	=> 'OSM B&W',
	// 'http://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png'	=> 'Stamen Toner',
	// 'http://{s}.tile.stamen.com/terrain/{z}/{x}/{y}.png'	=> 'Stamen Terrain',
	// 'http://{s}.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg'	=> 'Stamen Watercolor',
	// 'http://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png'	=> 'Thunderforest Landscape',
	// 'http://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png'		=> 'Thunderforest Outdoors',
	// // 'http://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'	=> 'Carto Light',
	// // 'http://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'	=> 'Carto Dark',
	// 'https://maps.wikimedia.org/osm-intl/{z}/{x}/{y}.png'	=> __('Wikimedia'),
);
/*
'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
        maxZoom: 18, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy;
        '
      }
*/
