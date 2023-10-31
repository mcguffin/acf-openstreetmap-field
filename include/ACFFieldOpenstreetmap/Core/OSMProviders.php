<?php

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}

use ACFFieldOpenstreetmap\Helper;

class OSMProviders extends Singleton {
	/** @var array mapping of OSM link layers to leaflet layers */
	private $link_layers = [
		'H' => 'OpenStreetMap.HOT',
		'T' => 'Thunderforest.Transport',
		'C' => 'Thunderforest.OpenCycleMap',
	];

	/** @var array mapping of OSM iframe layers to leaflet layers */
	private $iframe_layers = [
		'mapnik'		=> 'OpenStreetMap.Mapnik',
		'cyclemap'		=> 'Thunderforest.OpenCycleMap',
		'transportmap'	=> 'Thunderforest.Transport',
		'hot'			=> 'OpenStreetMap.HOT',
	];

	/**
	 *	Returns raw leaflet providers
	 *	@param array $filters credentials|enabled
	 *	@return array
	 */
	public function get_providers( $filters = [] ) {}


	public function get_token_options() {}

	/**
	 *	get default OpenStreetMap Layers
	 *
	 *	@return array(
	 *		'layer_id' => 'Layer Label',
	 *		...
	 *	)
	 */
	public function get_layers( $context = 'iframe' ) {
		/*
		mapnik
		cyclemap C 	Cycle
		transportmap T	Transport
		hot H	Humantarian
		*/
		if ( 'iframe' === $context ) {
			return $this->iframe_layers;
		} else if ( 'link' === $context ) {
			return $this->link_layers;
		}
	}

	/**
	 *	@param config array [
	 *		'lat'		: (float),
	 *		'lng'		: (float),
	 *		'markers'	: optional.
	 *			[
	 *				'lat'		: (float),
	 *				'lng'		: (float),
 	 *			],
	 *		'layers'	: optional. any of
	 *			[
	 *				'OpenStreetMap',
	 *				'Thunderforest.OpenCycleMap',
	 *				'Thunderforest.Transport',
	 *				'OpenStreetMap.HOT',
 	 *			],
 	 *	]
	 *	@return string URL
	 */
	public function get_iframe_url( $config ) {

		$config = wp_parse_args( $config, [
			'lat' => 0,
			'lng' => 0,
			'zoom' => 0,
			'markers' => [],
			'layers' => [],
		]);

		$bbox = Helper\MapHelper::getBbox( $config['lat'], $config['lng'], $config['zoom'] );
		$args = [
			'bbox'	=> implode( ',', $bbox ),
		];

		foreach ( $config['layers'] as $layer ) {
			$i_layer = array_search( $layer, $this->iframe_layers );
			if ( false !== $i_layer ) {
				$args['layer'] = $i_layer;
				break;
			}
		}
		foreach ( $config['markers'] as $marker ) {
			$args['marker'] = implode(',', [ $marker['lat'], $marker['lng'] ] );
			break;
		}

		return add_query_arg( $args, 'https://www.openstreetmap.org/export/embed.html' );
	}

	/**
	 *	@param config array [
	 *		'lat'		: (float),
	 *		'lng'		: (float),
	 *		'markers'	: optional.
	 *			[
	 *				'lat'		: (float),
	 *				'lng'		: (float),
 	 *			],
	 *		'layers'	: optional. any of
	 *			[
	 *				'OpenStreetMap',
	 *				'Thunderforest.OpenCycleMap',
	 *				'Thunderforest.Transport',
	 *				'OpenStreetMap.HOT',
 	 *			],
 	 *	]
	 *	@return string URL
	 */
	public function get_link_url( $config ) {

		$config = wp_parse_args( $config, [
			'lat' => 0,
			'lng' => 0,
			'zoom' => 0,
			'markers' => [],
			'layers' => [],
		]);

		$args = [];

		foreach ( $config['markers'] as $marker ) {
			$args['mlat'] = $marker['lat'];
			$args['mlon'] = $marker['lng'];
		}

		$map_link = add_query_arg( $args, 'https://www.openstreetmap.org/' );
		$map_link .= '#map=' . implode( '/', [
			intval( $config['zoom'] ),
			floatval( $config['lat'] ),
			floatval( $config['lng'] )
		] );


		foreach ( $config['layers'] as $layer ) {
			$l_layer = array_search( $layer, $this->link_layers );
			if ( false !== $l_layer ) {
				$map_link .= '&layers='.$l_layer;
				break;
			}
		}

		return $map_link;
	}
}
