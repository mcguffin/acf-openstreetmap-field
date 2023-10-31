<?php

namespace ACFFieldOpenstreetmap\Core;

if ( ! defined('ABSPATH') ) {
	die('FU!');
}

class Templates extends Singleton {

	private $templates = null;

	private $template_dirname = 'osm-maps';

	/**
	 *	@return Boolean
	 */
	public static function is_supported() {
		return version_compare( $GLOBALS['wp_version'], '5.5.0', '>=' );
	}

	/**
	 *	@inheritdoc
	 */
	protected function __construct() {
		if ( self::is_supported() ) {
			add_action( 'get_template_part', [ $this, 'get_template_part' ], 10, 4 );
		}
	}

	/**
	 *	@action get_template_part
	 */
	public function get_template_part( $slug, $name = null, $templates = [], $args = [] ) {

		if ( false === strpos( $slug, $this->template_dirname ) ) {
			return;
		}

		$template = str_replace( $this->template_dirname . '/', '', $slug );
		$name = (string) $name;

		$locate = [ "{$slug}.php" ];
		if ( '' !== $name ) {
			$locate[] = "{$slug}-{$name}.php";
		}

		// the theme can handle it!
		if ( locate_template( $locate, false ) ) {
			return;
		}

		// we'll have to handle it
		$core = Core::instance();
		$file = $core->get_plugin_dir() . 'templates/' . str_replace( $this->template_dirname . '/','',$slug) . '.php';

		if ( file_exists( $file ) ) {
			load_template( $file, false, $args );
		}
	}

	/**
	 *	@return Array template slug
	 */
	public function get_templates() {
		if ( is_null( $this->templates ) ) {
			$this->templates = [];
			// scan ./templates/*.php
			// scan <theme>/osm-maps/*.php
			// return [ 'osm-maps/template-name' => 'Template Name',  ] // or Header Map Template Name: ...
			$core = Core::instance();
			$paths = [
				$core->get_plugin_dir() . '/templates/',
				get_template_directory() . '/osm-maps/',
				get_stylesheet_directory() . '/osm-maps/',
			];
			foreach ( array_unique( $paths ) as $path ) {
				$len = strlen( $path );
				foreach( glob( $path . '*.php' ) as $file ) {
					$template = substr( $file, $len, -4 );
					$file_data = get_file_data( $file, [ 'name' => 'Map Template Name', 'private' => 'Private' ] );
					$name = empty( $file_data['name'] ) ? ucwords($template) : $file_data['name'];
					$this->templates[$template] = [
						'file' => $file,
						'name' => $file_data['name'],
						'private' => boolval( $file_data['private'] ),
					];
				}
			}
		}
		return array_filter( $this->templates, function( $template ) {
			return ! $template['private'];
		});
	}
}
