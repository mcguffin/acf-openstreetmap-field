<?php

namespace ACFFieldOpenstreetmap;

abstract class Test_Widget extends \WP_Widget {
	public function form( $instance ) {
	}
	public function update( $new_instance, $old_instance ) {
		return $new_instance;
	}
}

class OSM_Widget extends Test_Widget {
	public function __construct() {
		parent::__construct( 'acf-osm-widget', 'OSM Map', [] );
	}
	public function widget( $args, $instance ) {
		the_field('osm_map_block','widget_'.$this->id);
	}
}

class Leaflet_Widget extends Test_Widget {
	public function __construct() {
		parent::__construct( 'acf-leaflet-widget', 'Leaflet Map', [] );
	}
	public function widget( $args, $instance ) {
		the_field('leaflet_map_block','widget_'.$this->id);
	}
}



class PluginTest {

	private $current_json_save_path = null;

	public function __construct() {
		add_filter( 'acf/settings/load_json', [ $this, 'load_json' ] );

		add_filter( 'acf/settings/save_json', [ $this, 'save_json' ] );

		add_action( 'acf/delete_field_group', [ $this, 'mutate_field_group' ], 9 );
		add_action( 'acf/trash_field_group', [ $this, 'mutate_field_group' ], 9 );
		add_action( 'acf/untrash_field_group', [ $this, 'mutate_field_group' ], 9 );
		add_action( 'acf/update_field_group', [ $this, 'mutate_field_group' ], 9 );

		add_action( 'acf/init', [ $this, 'register_blocks' ] );
		
		add_action( 'widgets_init', function(){
			register_widget( '\ACFFieldOpenstreetmap\OSM_Widget' );
			register_widget( '\ACFFieldOpenstreetmap\Leaflet_Widget' );
		});
	}
	
	/**
	 *	@action 'acf/init'
	 */
	public function register_blocks() {

		if( function_exists('acf_register_block') ) {

			// register a testimonial block
			acf_register_block(array(
				'name'				=> 'leaflet-map',
				'title'				=> __('Leaflet Map'),
				'description'		=> __('A Leaflet Map'),
				'render_callback'	=> function ( $block, $content, $is_preview, $post_id ) {
					the_field( 'leaflet_map_block' );
					?><hr /><?php
				},
				'category'			=> 'embed',
				'icon'				=> 'location-alt',
				'mode'				=> 'preview', // auto|preview|edit
				'align'				=> 'full',
				'keywords'			=> array( 'map' ),
			));

			// register a testimonial block
			acf_register_block(array(
				'name'				=> 'osm-map',
				'title'				=> __('OpenStreetMap (iFrame)'),
				'description'		=> __('Am Open Street Map'),
				'render_callback'	=> function ( $block, $content, $is_preview, $post_id ) {
					the_field( 'osm_map_block' );
					?><hr /><?php
				},
				'category'			=> 'embed',
				'icon'				=> 'location-alt',
				'mode'				=> 'preview', // auto|preview|edit
				'align'				=> 'full',
				'keywords'			=> array( 'map' ),

			));
		}
	}

	/**
	 *	@filter 'acf/settings/save_json'
	 */
	public function load_json( $paths ) {
		$paths[] = dirname(__FILE__).'/acf-json';
		return $paths;
	}

	/**
	 *	@filter 'acf/settings/save_json'
	 */
	public function save_json( $path ) {
		if ( ! is_null( $this->current_json_save_path ) ) {
			return $this->current_json_save_path;
		}
		return $path;
	}

	/**
	 *	Figure out where to save ACF JSON
	 *
	 *	@action 'acf/update_field_group'
	 */
	public function mutate_field_group( $field_group ) {
		// default

		if ( strpos( $field_group['key'], 'group_acf_openstreetmap_field_' ) === false ) {
			$this->current_json_save_path = null;
			return;
		}
		$this->current_json_save_path = dirname(__FILE__).'/acf-json';

	}
}

new PluginTest();
