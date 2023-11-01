<?php

namespace ACFFieldOpenstreetmap;


foreach ( glob(__DIR__.'/features/*.php') as $file ) {
	include_once $file;
}

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

		// form
		add_action( 'init', [ $this, 'register_submission_pt' ] );
		add_action( 'acf/init', [ $this, 'register_frontend_form' ] );
		add_action( 'template_redirect', 'acf_form_head' );

		add_action( 'admin_print_scripts', function() {
			wp_enqueue_script( 'acf-osm-test-repeater-sync', plugins_url( 'test/js/repeater-sync.js', dirname(__DIR__).'/index.php' ), [], true, '0.0.1' );
			wp_enqueue_script( 'acf-osm-test-proximity', plugins_url( 'test/js/proximity.js', dirname(__DIR__).'/index.php' ), [], true, '0.0.1' );
			wp_enqueue_script( 'acf-osm-test-address', plugins_url( 'test/js/address.js', dirname(__DIR__).'/index.php' ), [], true, '0.0.1' );
		} );

		add_action( 'acf/init', [ $this, 'register_options_page' ] );


		add_action( 'widgets_init', function(){
			register_widget( '\ACFFieldOpenstreetmap\OSM_Widget' );
			register_widget( '\ACFFieldOpenstreetmap\Leaflet_Widget' );
		});

		add_action('admin_init',[$this, 'maybe_generate_test_post']);
		add_filter('the_content',function($content){
			if ( get_post_meta(get_the_ID(),'_osm_test',true)) {
				$content .= get_field('leaflet_gm');
				$content .= get_field('leaflet_018');
				$content .= get_field('leaflet_101');
			}
			return $content;
		});

		add_filter('acf_osm_marker_html', function( $html ){
		    return '<div class="my-marker"></div>';
		});
		add_action('wp_head',function(){
			?>
			<style type="text/css">
			.my-marker {
			    display:block;
			    width:20px;
			    height:20px;
			    border-radius:10px;
			    border:2px solid #f00;
				margin-top:-4px;
				margin-left:-4px;
			}
			[type="checkbox"] + .leaflet-map {
				display:none;
			}
			[type="checkbox"]:checked + .leaflet-map {
				display:block;
			}
			</style>
			<?php
		});
//
		add_filter('acf/fields/google_map/api', function($api) {
			$api['key'] = exec('security find-generic-password -a maps.googleapis.com -s maps.googleapis.com -w');
			return $api;
		});
		//

		add_action('wp_footer',function(){
			?>
			<div class="acf-osm-tests">
				<?php
				the_field('leaflet_map_nolay','acf_osm_test');
				the_field('iframe_map_nolay','acf_osm_test');
				?>
			</div>
			<?php
		});

	}


	public function maybe_generate_test_post() {
		$posts = get_posts([
			'post_type'			=> 'post',
			'meta_key'			=> '_osm_test',
			'meta_value'		=> 'true',
			'post_status'		=> 'any',
			'posts_per_page'	=> -1,
		]);

		if ( ! count( $posts ) ) {
			$post_id = wp_insert_post([
				'post_title'	=> 'OSM TEST',
				'post_status'	=> 'publish',
			]);
			if ( $post_id ) {
				update_post_meta( $post_id, '_osm_test', 'true' );
				update_post_meta( $post_id, 'leaflet_gm', array(
					'address' => 'Hamburg Germany',
					'lat'	  => '54.55',
					'lng'	  => '10.03',
				) );
				update_post_meta( $post_id, '_leaflet_gm', 'field_5d502df02b73d' );

				update_post_meta( $post_id, 'leaflet_018', array(
					'center_lat'	=> '54.55',
					'center_lng'	=> '10.03',
					'zoom'			=> '14',
					'markers'		=> [
						[
							'label' => 'Hamburg Germany',
							'default_label' => 'Hamburg Germany',
							'lat'	  => '54.55',
							'lng'	  => '10.03',
						]
					],
				) );
				update_post_meta( $post_id, '_leaflet_018', 'field_5d502dfd2b73e' );

				update_post_meta( $post_id, 'leaflet_101', array(
					'center_lat'	=> '54.55',
					'center_lng'	=> '10.03',
					'zoom'			=> '14',
					'markers'		=> [
						[
							'label' => 'Hamburg Germany',
							'default_label' => 'Hamburg Germany',
							'lat'	  => '54.55',
							'lng'	  => '10.03',
						]
					],
				) );
				update_post_meta( $post_id, '_leaflet_101', 'field_5d502e072b73f' );
			}
		}
	}

	/**
	 *	@action 'acf/init'
	 */
	public function register_blocks() {

		if ( ! function_exists('acf_register_block') ) {
			return;
		}

		// register a map block
		acf_register_block(array(
			'name'				=> 'leaflet-map',
			'title'				=> __('Leaflet Map Test'),
			'description'		=> __('A Leaflet Map'),
			'render_callback'	=> function ( $block, $content, $is_preview, $post_id ) {
				printf('<div class="align%s">',$block['align']);
				//echo '<input type="checkbox" />';
				the_field( 'leaflet_map' );
				echo '</div>';
				?><hr /><?php
			},
			'category'			=> 'embed',
			'icon'				=> 'location-alt',
			'mode'				=> 'preview', // auto|preview|edit
			'align'				=> 'full',
			'keywords'			=> array( 'map' ),
		));

		// register a map block
		acf_register_block(array(
			'name'				=> 'osm-map',
			'title'				=> __('OpenStreetMap Test (iFrame)'),
			'description'		=> __('Am Open Street Map'),
			'render_callback'	=> function ( $block, $content, $is_preview, $post_id ) {
				printf('<div class="align%s">',$block['align']);
				the_field( 'osm_map_block' );
				echo '</div>';
				?><hr /><?php
			},
			'category'			=> 'embed',
			'icon'				=> 'location-alt',
			'mode'				=> 'preview', // auto|preview|edit
			'align'				=> 'full',
			'keywords'			=> array( 'map' ),

		));

		// register a map block
		acf_register_block(array(
			'name'				=> 'raw-map',
			'title'				=> __('OpenStreetMap Test (Raw Data)'),
			'description'		=> __('Am Open Street Map'),
			'render_callback'	=> function ( $block, $content, $is_preview, $post_id ) {
				?><pre><?php
				$data = get_field( 'raw_map_block' );
				echo json_encode( $data,  JSON_PRETTY_PRINT );
				?></pre><?php
			},
			'category'			=> 'embed',
			'icon'				=> 'location-alt',
			'mode'				=> 'preview', // auto|preview|edit
			'align'				=> 'full',
			'keywords'			=> array( 'map' ),

		));



		// register a map block
		acf_register_block(array(
			'name'				=> 'other-block',
			'title'				=> __('SOME ACF BLOCK'),
			'description'		=> __('Testing block with some conditional logic'),
			'render_callback'	=> function ( $block, $content, $is_preview, $post_id ) {
				?><pre><?php
				the_field('text');
				if ( get_field( 'show_conditional_text') ) {
					?> and <?php the_field('conditional_text');
				}
				?></pre><?php
			},
			'category'			=> 'embed',
			'icon'				=> 'location-alt',
			'mode'				=> 'preview', // auto|preview|edit
			'align'				=> 'full',
			'keywords'			=> array( 'acf' ),
		));


	}

	/**
	 *	@action 'init'
	 */
	public function register_submission_pt() {
		register_post_type('acf-osm-test-sub',array(
			'label'			=> 'Submission',
			'public'		=> false,
			'has_archive'	=> false,
			'show_ui'		=> true,
			'menu_position'	=> 35,
			'supports'		=> false,
			'menu_icon'		=> 'dashicons-feedback',
		));
	}

	/**
	 *	@action acf/init
	 */
	public function register_frontend_form() {

		// same post
		if ( ! function_exists( 'acf_register_form' ) ) {
			return;
		}

		add_shortcode( 'acf-osm-test-form', function( $atts, $content ) {
			ob_start();
			acf_form('acf-osm-test-form');
			return ob_get_clean();
		} );

		acf_register_form( [
			/* (string) Unique identifier for the form. Defaults to 'acf-form' */
			'id'					=> 'acf-osm-test-form',

			/* (int|string) The post ID to load data from and save data to. Defaults to the current post ID.
			Can also be set to 'new_post' to create a new post on submit */
			'post_id'				=> 'new_post',

			/* (array) An array of post data used to create a post. See wp_insert_post for available parameters.
			The above 'post_id' setting must contain a value of 'new_post' */
			'new_post'				=> array(
				'post_title'	=> 'Submitted on ' . date(get_option( 'date_format' ) . ' '.get_option( 'time_format' )),
				'post_type'		=> 'acf-osm-test-sub',
			),

			/* (array) An array of field group IDs/keys to override the fields displayed in this form */
			'field_groups'			=> [
				'group_acf_openstreetmap_field_layers',
				'group_acf_openstreetmap_field_no_layers',
				'group_acf_openstreetmap_field_repeatable'
			],

			// /* (array) An array of field IDs/keys to override the fields displayed in this form */
			// 'fields'				=> false,

			/* (boolean) Whether or not to show the post title text field. Defaults to false */
			'post_title'			=> false,

			/* (boolean) Whether or not to show the post content editor field. Defaults to false */
			'post_content'			=> false,

			/* (boolean) Whether or not to create a form element. Useful when a adding to an existing form. Defaults to true */
			'form'					=> true,

			/* (array) An array or HTML attributes for the form element */
			'form_attributes'		=> array(),

			/* (string) The URL to be redirected to after the form is submit. Defaults to the current URL with a GET parameter '?updated=true'.
			A special placeholder '%post_url%' will be converted to post's permalink (handy if creating a new post) */
			'return'				=> '',

			/* (string) Extra HTML to add before the fields */
			'html_before_fields'	=> '',

			/* (string) Extra HTML to add after the fields */
			'html_after_fields'		=> '',

			/* (string) The text displayed on the submit button */
			'submit_value'			=> __("Submit", 'acf'),

			/* (string) A message displayed above the form after being redirected. Can also be set to false for no message */
			'updated_message'		=> __("Post updated", 'acf'),

			/* (string) Determines where field labels are places in relation to fields. Defaults to 'top'.
			Choices of 'top' (Above fields) or 'left' (Beside fields) */
			'label_placement'		=> 'top',

			/* (string) Determines where field instructions are places in relation to fields. Defaults to 'label'.
			Choices of 'label' (Below labels) or 'field' (Below fields) */
			'instruction_placement'	=> 'label',

			/* (string) Determines element used to wrap a field. Defaults to 'div'
			Choices of 'div', 'tr', 'td', 'ul', 'ol', 'dl' */
			'field_el'				=> 'div',

			/* (string) Whether to use the WP uploader or a basic input for image and file fields. Defaults to 'wp'
			Choices of 'wp' or 'basic'. Added in v5.2.4 */
			'uploader'				=> 'wp',

			/* (boolean) Whether to include a hidden input field to capture non human form submission. Defaults to true. Added in v5.3.4 */
			'honeypot'				=> true,

			/* (string) HTML used to render the updated message. Added in v5.5.10 */
			'html_updated_message'	=> '<div id="message" class="updated"><p>%s</p></div>',

			/* (string) HTML used to render the submit button. Added in v5.5.10 */
			'html_submit_button'	=> '<input type="submit" class="acf-button button button-primary button-large" value="%s" />',

			/* (string) HTML used to render the submit button loading spinner. Added in v5.5.10 */
			'html_submit_spinner'	=> '<span class="acf-spinner"></span>',

			/* (boolean) Whether or not to sanitize all $_POST data with the wp_kses_post() function. Defaults to true. Added in v5.6.5 */
			'kses'					=> true
		]);

	}



	/**
	 *	@filter 'acf/init'
	 */
	public function register_options_page() {
		if ( ! function_exists( 'acf_add_options_page' ) ) {
			return;
		}
		acf_add_options_page( array(
			'page_title'	=> 'ACF OSM Test',
			'description'	=> 'You are testing the ACF OpenStreetMapField.',
			'post_id'		=> 'acf_osm_test',
			'icon_url'		=> 'dashicons-location-alt',
			'autoload'		=> false,
		) );

	}


	/**
	 *	@filter 'acf/settings/load_json'
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
