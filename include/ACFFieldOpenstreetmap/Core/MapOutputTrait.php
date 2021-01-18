<?php

namespace ACFFieldOpenstreetmap\Core;


use ACFFieldOpenstreetmap\Model;

trait MapOutputTrait {

	/** @var String map type */
	protected $map_type;


	/**
	 *	@param String $template_slug
	 *	@param String|Array $map_args
	 */
	protected function render_map( $template_slug, $map_args ) {

		$templates = Templates::instance();

		$map_args = $this->parse_map_args( $map_args );

		$map = Model\Map::fromArray( $map_args );

		
		$templates->render_template( $this->map_type, $template_slug, [
			'map_object'	=> $map,
			'map'			=> $map->toLegacyArray(),
			'field'			=> [
				'height'	=> $map_args['height'],
			],
		] );

	}


	/**
	 *	Setup default map
	 */
	protected function parse_map_args( $map_args ) {

		// $instance['map'] is not always an array in wp-page-builder

		if ( is_string( $map_args ) ) {
			$map_args = json_decode( wp_unslash( $map_args ), true, 512, JSON_INVALID_UTF8_SUBSTITUTE );
		}

		$map_args = wp_parse_args( $map_args, [
			'lat'		=> 53.55064,
			'lng'		=> 10.00065,
			'zoom'		=> 12,
			'height'	=> 400,
			'layers'	=> [
				[ 'type' => 'provider', 'provider' => 'OpenStreetMap.Mapnik' ],				
				[ 'type' => 'markers', 'markers' => [] ], 
			],
		]);

		return $map_args;
	}

	/**
	 *	@see https://stackoverflow.com/a/11154248/1983694
	 *
	 *	@return Boolean
	 */
	private function is_base64( $str ) {
		return (bool) preg_match( '/^[a-zA-Z0-9\/\r\n+]*={0,2}$/', $str );
	}
	
	
}
