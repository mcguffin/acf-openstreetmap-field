<?php


namespace ACFFieldOpenstreetmap\Shortcode;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Model;

class AbstractMapShortcode extends Core\Singleton {

	use Core\MapOutputTrait;

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {

		add_shortcode( $this->map_type, [ $this, 'shortcode' ] );

	}
	
	/**
	 *	@inheritdoc
	 */
	public function shortcode( $args, $content ) {

		$args = wp_parse_args( $args, [
			'map' => '',
			'height' => 400,
		] );

		$args['map'] = $this->parse_map_args( base64_decode( $args['map'] ) );
		ob_start();
		$this->render_map( 'shortcode', $args['map'] + [ 'height' => $args['height'] ] );
		$content = ob_get_clean();

		return $content;

	}
}