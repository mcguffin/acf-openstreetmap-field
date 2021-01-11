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
	public function get_template_part( $slug, $name, $templates, $args ) {

		if ( false === strpos( $slug, $this->template_dirname ) ) {
			return;
		}


		$locate = [ "{$slug}.php" ];
		if ( ! is_null( $name ) ) {
			$locate[] = "{$slug}-{$name}.php";
		}

		// the theme can handle it!
		if ( locate_template( $locate, false ) ) {
			return;
		}

		$core = Core::instance();
		$slug = str_replace( $this->template_dirname . '/', '', $slug );
		foreach ( [ "{$slug}-{$name}.php", "{$slug}.php" ] as $filename ) {
			$file = $core->get_plugin_dir() . 'templates/' . $filename;
			if ( file_exists( $file ) ) {
				load_template( $file, false, $args );
				return;
			}
		}
		// we'll have to handle it
		$file = $core->get_plugin_dir() . 'templates/' . str_replace( $this->template_dirname . '/', '', $slug ) . '.php';

	}

	/**
	 *	Render a Template
	 *	Basically a Wrapper around WP's get_template_part() which supports $args
	 *
	 *	@param String $slug
	 *	@param String $namespace
	 *	@param Array $args
	 */
	public function render_template( $slug, $name = null, $args = [] ) {
		
		if ( self::is_supported() || ! count( $args ) ) {
			get_template_part( $this->template_dirname . '/' . $slug, $name, $args );
		} else {
			// workaround get_template_part in legacy WP < 5.5
			$core = Core::instance();
			$search_names = [ $slug ];
			$search_paths = [ STYLESHEETPATH . '/' . $this->template_dirname, TEMPLATEPATH. '/' . $this->template_dirname, $core->get_plugin_dir() . 'templates' ];
			if ( ! is_null( $name ) ) {
				array_unshift( $search_names, sprintf( '%s-%s', $slug, $name ) );
			}

			foreach ( $search_names as $name ) {
				foreach ( array_unique( $search_paths ) as $path ) {
					$file = sprintf( '%1$s/%2$s.php', $path, $name );

					if ( file_exists( $file ) ) {

						return $this->render_template_file( $file, $args );
					}
				}
			}
		}
	}

	private function render_template_file( $_template_file, $args ) {
		// setup env like wp > 5.5
		// @see https://developer.wordpress.org/reference/functions/load_template/
		global $posts, $post, $wp_did_header, $wp_query, $wp_rewrite, $wpdb, $wp_version, $wp, $id, $comment, $user_ID;
		$require_once = false;

		require $_template_file;
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