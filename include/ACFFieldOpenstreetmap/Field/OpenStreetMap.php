<?php

namespace ACFFieldOpenstreetmap\Field;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Helper;

// exit if accessed directly
if( ! defined( 'ABSPATH' ) ) exit;


class OpenStreetMap extends \acf_field {

	private static $_instance = null;

	public $show_in_rest = true;

	/**
	 *	@return ACFFieldOpenstreetmap\Field\OpenStreetMap
	 */
	public static function get_instance() {
		if ( is_null( self::$_instance ) ) {
			new self();
		}
		return self::$_instance;
	}

	/**
	 *  __construct
	 *
	 *  This function will setup the field type data
	 *
	 *  @type	function
	 *  @date	5/03/2014
	 *  @since	5.0.0
	 *
	 *  @param	n/a
	 *  @return	n/a
	 */
	function __construct() {
		if ( ! is_null( self::$_instance ) ) {
			throw new Exception('Not more than one Field\OpenStreetMap!');
		}

		self::$_instance = $this;

		$core = Core\Core::instance();
		/*
		*  name (string) Single word, no spaces. Underscores allowed
		*/
		$this->name = 'open_street_map';
		/*
		*  label (string) Multiple words, can include spaces, visible when selecting a field type
		*/
		$this->label = __("OpenStreetMap",'acf-openstreetmap-field');


		$this->show_in_rest = true;
		/*
		 *  category (string) basic | content | choice | relational | jquery | layout | CUSTOM GROUP NAME
		 */
		$this->category = 'jquery';

		$this->default_values = [
			// hamburg
			'lat'		=> 53.55064,
			'lng'		=> 10.00065,
			'zoom'		=> 12,
			'layers'	=> [ 'OpenStreetMap.Mapnik' ],
			'markers'	=> [],
			// gm compatibility
			'address'	=> '',
			'version'	=> '',
		];
		/*
		 *  defaults (array) Array of default settings which are merged into the field object. These are used later in settings
		 */
		$this->defaults = [
			'center_lat'		=> $this->default_values['lat'],
			'center_lng'		=> $this->default_values['lng'],
			'zoom'				=> $this->default_values['zoom'],

			'height'			=> 400,
			'return_format'		=> 'leaflet',
			'allow_map_layers'	=> 1,
			'max_markers'		=> '',
			'layers'			=> $this->default_values['layers'],
		];

		/*
		 *  l10n (array) Array of strings that are used in JavaScript. This allows JS strings to be translated in PHP and loaded via:
		 *  var message = acf._e('FIELD_NAME', 'error');
		 */
		$this->l10n = [];

		add_action( 'print_media_templates', [ $this, 'print_media_templates' ] );

		parent::__construct();
	}

	/*
	 *  render_field_settings()
	 *
	 *  Create extra settings for your field. These are visible when editing a field
	 *
	 *  @type	action
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	$field (array) the $field being edited
	 *  @return	n/a
	 */

	function render_field_settings( $field ) {

		$core = Core\Core::instance();
		$templates = Core\Templates::instance();

		$field = $this->sanitize_field( $field );

		$return_choices = $templates->get_templates();
		$return_choices = array_map( function( $template ) {
			return $template['name'];
		}, $return_choices );

		$is_legacy = version_compare( acf()->version, '6.0.0', '<' );


		// return_format
		acf_render_field_setting( $field, [
			'label'			=> __('Return Format','acf'),
			'instructions'	=> '',
			'type'			=> 'radio',
			'name'			=> 'return_format',
			'choices'		=> [
				'raw'			=> __("Raw Data",'acf-openstreetmap-field'),
			] + $return_choices,
			'layout'	=>	'horizontal',
		]);

		if ( $is_legacy ) {
			$this->render_field_presentation_settings( $field );
			$this->render_field_validation_settings( $field );
		}
	}

	/**
	 * Renders the field settings used in the "Validation" tab.
	 *
	 * @since 6.0
	 *
	 * @param array $field The field settings array.
	 * @return void
	 */
	function render_field_validation_settings( $field ) {

		// allow_layer selection
		acf_render_field_setting( $field, [
			'label'			=> __( 'Max. number of Markers', 'acf-openstreetmap-field' ),
			'instructions'	=> __( 'Leave empty for infinite markers', 'acf-openstreetmap-field' ),
			'name'			=> 'max_markers',
			'type'			=> 'number',
			'ui'			=> 1,
			'min'			=> 0,
			'step'			=> 1,
		]);
	}

	/**
	 * Renders the field settings used in the "Presentation" tab.
	 *
	 * @since 6.0
	 *
	 * @param array $field The field settings array.
	 * @return void
	 */
	function render_field_presentation_settings( $field ) {

		$leafletProviders = Core\LeafletProviders::instance();
		$osmProviders     = Core\OSMProviders::instance();

		acf_render_field_setting( $field, [
			'label'				=> __( 'Map Appearance', 'acf-openstreetmap-field' ),
			'instructions'		=> __( 'Set zoom, center and select layers being displayed.', 'acf-openstreetmap-field' ),
			'type'				=> 'open_street_map',
			'name'				=> 'leaflet_map',

			'return_format'		=> 'admin',
			'attr'				=> [
				'data-editor-config'	=> [
					'allow_providers'		=> true,
					'restrict_providers'	=> false,
					'max_markers'			=> 0, // no markers
					'name_prefix'			=> $field['prefix'],
				],
				'data-map-layers'		=> $field['layers'],
			],
			'value'	=> [
				'lat'				=> $field['center_lat'],
				'lng'				=> $field['center_lng'],
				'zoom'				=> $field['zoom'],
				'layers'			=> $field['layers'],
				'markers'			=> [],
			],
			'wrapper'      => [
				'data-name' => 'wrapper',
				'class'     => 'acf-field-setting-wrapper',
			],
		] );

		// lat
		acf_render_field_setting( $field, [
			'label'			=> __('Map Position','acf-openstreetmap-field'),
			'instructions'	=> __('Center the initial map','acf-openstreetmap-field'),
			'type'			=> 'number',
			'name'			=> 'center_lat',
			'prepend'		=> __('lat','acf-openstreetmap-field'),
			'placeholder'	=> $this->default_values['lat'],
			// 'step'			=> 0.1,
		]);

		// lng
		acf_render_field_setting( $field, [
			'label'			=> __( 'Center', 'acf-openstreetmap-field' ),
			'instructions'	=> __( 'Center the initial map', 'acf-openstreetmap-field' ),
			'type'			=> 'number',
			'name'			=> 'center_lng',
			'prepend'		=> __('lng','acf-openstreetmap-field'),
			'placeholder'	=> $this->default_values['lng'],
			'_append' 		=> 'center_lat',
			// 'step'			=> 0.1,
		]);

		// zoom
		acf_render_field_setting( $field, [
			'label'			=> __( 'Zoom', 'acf-openstreetmap-field' ),
			'instructions'	=> __( 'Set the initial zoom level', 'acf-openstreetmap-field' ),
			'type'			=> 'number',
			'name'			=> 'zoom',
			'min'			=> 1,
			'max'			=> 22,
			'prepend'		=> __('zoom','acf-openstreetmap-field'),
			'placeholder'	=> $this->default_values['zoom'],
			'_append' 		=> 'center_lat',
		]);

		// allow_layer selection
		acf_render_field_setting( $field, [
			'label'			=> __( 'Allow layer selection', 'acf-openstreetmap-field' ),
			'instructions'	=> '',
			'name'			=> 'allow_map_layers',
			'type'			=> 'true_false',
			'ui'			=> 1,
		]);

		// Leaflet layers
		acf_render_field_setting( $field, [
			'label'			=> __( 'Leaflet Layers', 'acf-openstreetmap-field' ),
			'instructions'	=> '',
			'name'			=> 'layers',
			'type'			=> 'select',
			'multiple'		=> 1,
			'choices'		=> $leafletProviders->get_layers(),
			'wrapper'		=> [
				'class'	=> 'acf-hidden',
			],
		]);

		// map height
		acf_render_field_setting( $field, [
			'label'			=> __('Height','acf'),
			'instructions'	=> __('Customize the map height','acf-openstreetmap-field'),
			'type'			=> 'text',
			'name'			=> 'height',
			'append'		=> 'px',
		]);
	}


	/*
	 *  render_field()
	 *
	 *  Create the HTML interface for your field
	 *
	 *  @param	$field (array) the $field being rendered
	 *
	 *  @type	action
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	$field (array) the $field being edited
	 *  @return	n/a
	 */
	function render_field( $field ) {

		$core = Core\Core::instance();

		if ( is_null( $field['value'] ) ) {
			$field['value'] = $this->sanitize_value( [], $field, 'display' );
		}

		// json_encoded value
		acf_hidden_input([
			'id'		=> $field['id'],
			'name'		=> $field['name'],
			'value'		=> json_encode( $field['value'] ),
			'class'		=> 'osm-json',
		]);

		$restrict_providers = isset($field['return_format']) && $field['return_format'] === 'osm'
			? array_values( Core\OSMProviders::instance()->get_layers() )
			: false;

		$max_markers = $field['max_markers'] === '' ? false : intval( $field['max_markers'] );

		if ( 'osm' === $field['return_format'] ) {
			if ( $max_markers === false ) { // no restriction > max one marker
				$max_markers = 1;
			}
			// only one marker max
			$max_markers = min( $max_markers, 1 );
		}
		$map_args = [
			'field' => $field + [
				'attr'	=> [
					'data-editor-config'	=> [
						'allow_providers'		=> $field['allow_map_layers'],
						'restrict_providers'	=> $restrict_providers,
						'max_markers'			=> $max_markers,
						'name_prefix'			=> $field['name'],
					],
				],
			],
			'map' => $field['value'],
		];
		if ( Core\Templates::is_supported() ) {
			get_template_part( 'osm-maps/admin', null, $map_args );
		} else {
			// legacy
			$attr = [
				'data-editor-config'	=> json_encode([
					'allow_providers'		=> $field['allow_map_layers'],
					'restrict_providers'	=> array_values( $providers ),
					'max_markers'			=> $max_markers,
					'name_prefix'			=> $field['name'],
				]),
				'class'				=> 'leaflet-map',
				'data-height'		=> $field['height'],
				'data-map'			=> 'leaflet',
				'data-map-lng'		=> $field['value']['lng'],
				'data-map-lat'		=> $field['value']['lat'],
				'data-map-zoom'		=> $field['value']['zoom'],
				'data-map-layers'	=> $field['value']['layers'],
				'data-map-markers'	=> $field['value']['markers'],
			];

			?>
			<div <?php echo acf_esc_attr( $attr ) ?>></div>
			<?php



		}

		// markers
		$markers = []; // $field['value']['markers'];


		if ( $max_markers !== 0 ) {
			?>
				<div class="markers-instruction">
					<p class="description">
						<span class="add-marker-instructions marker-on-dblclick can-add-marker">
							<?php esc_html_e('Double click to add Marker.', 'acf-openstreetmap-field' ); ?>
						</span>
						<span class="add-marker-instructions marker-on-taphold can-add-marker">
							<?php esc_html_e('Tap and hold to add Marker.', 'acf-openstreetmap-field' ); ?>
						</span>
						<span class="has-markers">
							<?php esc_html_e('Drag Marker to move.', 'acf-openstreetmap-field' ); ?>
						</span>
					</p>
				</div>
			<?php

		}
		?>
		<div class="osm-markers">
		</div>
		<?php
	}

	/*
	 *  input_admin_enqueue_scripts()
	 *
	 *  This action is called in the admin_enqueue_scripts action on the edit screen where your field is created.
	 *  Use this action to add CSS + JavaScript to assist your render_field() action.
	 *
	 *  @type	action (admin_enqueue_scripts)
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	n/a
	 *  @return	n/a
	 */
	function input_admin_enqueue_scripts() {

		wp_enqueue_media();

		wp_enqueue_script('acf-input-osm');

		// wp_enqueue_script('acf-osm-frontend');

		wp_enqueue_style('acf-input-osm');

		// wp_enqueue_style('leaflet');

		add_action( 'wp_footer', [ $this, 'maybe_print_media_templates' ], 11 );
	}

	/*
	 *  field_group_admin_enqueue_scripts()
	 *
	 *  This action is called in the admin_enqueue_scripts action on the edit screen where your field is edited.
	 *  Use this action to add CSS + JavaScript to assist your render_field_options() action.
	 *
	 *  @type	action (admin_enqueue_scripts)
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	n/a
	 *  @return	n/a
	 */
	function field_group_admin_enqueue_scripts() {

		wp_enqueue_media();

		wp_dequeue_script('acf-input-osm');

		wp_enqueue_script('acf-field-group-osm');

		// wp_enqueue_script('acf-osm-frontend');

		wp_enqueue_style('acf-input-osm');

		wp_enqueue_style('acf-field-group-osm');

		wp_enqueue_style('leaflet');
	}

	/*
	 *  load_value()
	 *
	 *  This filter is applied to the $value after it is loaded from the db
	 *
	 *  @type	filter
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	$value (mixed) the value found in the database
	 *  @param	$post_id (mixed) the $post_id from which the value was loaded
	 *  @param	$field (array) the field array holding all the field options
	 *  @return	$value
	 */
	function load_value( $value, $post_id, $field ) {

		// prepare data for display
		$value = $this->sanitize_value( $value, $field, 'display' );

		return $value;
	}

	/**
	 *	Sanitize lat, lng, convert legacy properties
	 */
	private function sanitize_geodata( $value, $default_latlng = null ) {

		// convert settings from <= 1.0.1 > display only?
		if ( isset( $value['center_lat'] ) ) {
			if ( ( ! isset( $value['lat'] ) || empty( $value['lat'] ) ) && ! empty( $value['center_lat'] ) ) {
				$value['lat'] = $value['center_lat'];
			}
			unset( $value['center_lat'] );
		}

		if ( isset( $value['center_lng'] ) ) {
			if ( ( ! isset( $value['lng'] ) || empty( $value['lng'] ) ) && ! empty( $value['center_lng'] ) ) {
				$value['lng'] = $value['center_lng'];
			}
			unset( $value['center_lng'] );
		}

		// apply defaults
		if ( ! is_null( $default_latlng ) ) {
			$value = wp_parse_args( $value, $default_latlng );
		}

		// typecast values
		$value['lat'] = floatval( $value['lat'] );
		$value['lng'] = floatval( $value['lng'] );

		// maybe sanitize zoom
		if ( isset( $value['zoom'] )) {
			// boundaries
			$value['zoom'] = min( 22, max( 0, intval( $value['zoom'] ) ) );
		}

		return $value;
	}

	/**
	 *	@param array $value	array( 'lat' => float, 'lng => float, 'zoom' => int, 'address' => string, 'markers' => array, 'layers' => array )
 	 *	@param array $field
 	 *	@param string $context edit|dispaly|update
 	 *	@return array Sanitized $value
 	 */
	private function sanitize_value( $value, $field, $context = '' ) {

		if ( is_string( $value ) ) {
			// try to json-decode
			$value = json_decode( $value );
			if ( is_null( $value ) ) {
				$value = [];
			}
		}

		$value = (array) $value;

		// sanitize field
		$field = $this->sanitize_field( $field );

		//
		// Markers
		//
		if ( ! isset( $value['markers']) || ! is_array( $value['markers'] ) ) {
			$value['markers'] = [];
		}

		// make sure its an indexed array
		$value['markers'] = array_values( $value['markers'] );

		// Maybe get marker from ACF GoogleMaps data
		if ( 'display' === $context ) { // display + edit

			$value = $this->sanitize_geodata( $value, [
				'lat'	=> $field['center_lat'],
				'lng'	=> $field['center_lng'],
				'zoom'	=> $field['zoom'],
			] );

			if ( ! empty( $value[ 'address' ] ) ) {

				// create marker from GM field address
				if ( $field['max_markers'] !== 0 && ! count( $value[ 'markers' ] ) ) {

					$value['markers'][] = [
						'label'	=> wp_kses_post( $value['address'] ),
						'default_label'	=> '',
						'lat'	=> $value['lat'],
						'lng'	=> $value['lng'],
					];
				}
			} else  {
				if ( count( $value['markers'] ) ) {
					// update address from first marker
					$value['address'] = $value['markers'][0]['label'];
				} else {
					$value['address'] = '';
				}
			}
		}

		// typecast
		foreach ( $value['markers'] as &$marker ) {

			// typecast values
			$marker['lat'] = floatval( $marker['lat'] );
			$marker['lng'] = floatval( $marker['lng'] );

			$marker['label'] = wp_kses_post( $marker[ 'label' ], [], $allowed_protocols = '' );
			$marker['default_label'] = wp_kses_post( $marker[ 'default_label' ], [], $allowed_protocols = '' );
		}

		// store data to be used by ACF GM Field
		if ( 'update' === $context ) {
			$value[ 'version' ]	= Core\Core::instance()->get_version();

			if ( count( $value['markers'] ) ) {
				// update address from first marker
				$value['address'] = $value['markers'][0]['label'];
			} else {
				$value['address'] = '';
			}
		}

		// Sanitize HTML from address
		$value[ 'address' ] = wp_kses_post( $value[ 'address' ] );

		//
		// Layers
		//
		if ( ! is_array( $value['layers'] ) || ! count( $value['layers'] ) || ! $field['allow_map_layers'] ) {
			$value['layers'] = $field['layers'];
		} else {
			// normalize layers
			$value['layers'] = $this->sanitize_layers( $value['layers'] );
		}

		return array_intersect_key( $value, $this->default_values );

	}

	/**
	 *	Sanitize layers
	 */
	private function sanitize_layers( $layers ) {
		$layers = (array) $layers;

		$layers = array_map( function( $layer ) {
			if ( 'OpenStreetMap' === $layer ) {
				$layer = 'OpenStreetMap.Mapnik';
			}
			return $layer;
		}, $layers );
		$layers = array_filter( $layers );
		$layers = array_unique( $layers );
		$layers = array_values( $layers );
		return $layers;
	}

	/*
	 *  update_value()
	 *
	 *  This filter is applied to the $value before it is saved in the db
	 *
	 *  @type	filter
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	$value (mixed) the value found in the database
	 *  @param	$post_id (mixed) the $post_id from which the value was loaded
	 *  @param	$field (array) the field array holding all the field options
	 *  @return	$value
	 */
	function update_value( $value, $post_id, $field ) {

		// sanitize data from UI!

		// normalize markers


		if ( is_string( $value ) ) {
			$value = json_decode( stripslashes($value), true );
		}

		if ( ! is_array( $value ) ) {
			$value = $this->defaults;
		}

		$value = $this->sanitize_value( $value, $field, 'update' );



		return $value;
	}


	/*
	 *  format_value()
	 *
	 *  This filter is appied to the $value after it is loaded from the db and before it is returned to the template
	 *
	 *  @type	filter
	 *  @since	3.6
	 *  @date	23/01/13
	 *
	 *  @param	$value (mixed) the value which was loaded from the database
	 *  @param	$post_id (mixed) the $post_id from which the value was loaded
	 *  @param	$field (array) the field array holding all the field options
	 *
	 *  @return	$value (mixed) the modified value
	 */
	function format_value( $value, $post_id, $field ) {

		// bail early if no value
		if ( empty( $value ) ) {
			return $value;
		}

		$value = $this->sanitize_value( $value, $field, 'display' );

		if ( 'raw' === $field['return_format'] ) {

			// ensure backwards compatibility <= 1.0.1
			$value['center_lat'] = $value['lat'];
			$value['center_lng'] = $value['lng'];

		} else if ( Core\Templates::is_supported() ) {

			if ( 'osm' === $field['return_format'] && has_filter( 'osm_map_iframe_template' ) ) {
				_deprecated_hook( 'osm_map_iframe_template', '1.3.0', 'theme overrides', 'The filter is no longer in effect.' );
			}

			ob_start();

			get_template_part( 'osm-maps/' . $field['return_format'], null, [
				'field' => $field,
				'map' => $value,
			] );

			$value = ob_get_clean();

		} else if ( $field['return_format'] === 'admin' ) { // wp < 5.5

			$attr = $field['attr'] + [
				'class'				=> 'leaflet-map',
				'data-height'		=> $field['height'],
				'data-map'			=> 'leaflet',
				'data-map-lng'		=> $value['lng'],
				'data-map-lat'		=> $value['lat'],
				'data-map-zoom'		=> $value['zoom'],
				'data-map-layers'	=> $value['layers'],
				'data-map-markers'	=> $value['markers'],
			];
			$value = sprintf(
				'<div %s></div>',
				acf_esc_attr( $attr )
			);

		} else if ( $field['return_format'] === 'osm' ) { // wp < 5.5

			// features: one marker max. four maps to choose from
			$osm_providers = Core\OSMProviders::instance();

			$iframe_atts = [
				'height'		=> $field['height'],
				'width'			=> '425',
				'frameborder'	=> 0,
				'scrolling'		=> 'no',
				'marginheight'	=> 0,
				'marginwidth'	=> 0,
			];

			$html = '<iframe src="%1$s" %2$s></iframe><br/><small><a target="_blank" href="%3$s">%4$s</a></small>';

			/**
			 *	Filter iframe HTML.
			 *
			 *	@param string $html Template String. Placeholders: %1$s: iFrame Source, %2$s: iframe attributes, %3$s: URL to bigger map, %4$s: Link-Text.
			 */
			$html = apply_filters( 'osm_map_iframe_template', $html );

			$value = sprintf(
				$html,
				$osm_providers->get_iframe_url( $value ),
				acf_esc_attr( $iframe_atts ),
				esc_url( $osm_providers->get_link_url( $value ) ),
				esc_html__( 'View Larger Map','acf-openstreetmap-field' )
			);

		} else if ( $field['return_format'] === 'leaflet' ) {

			// features: multiple markers. lots of maps to choose from
			$map_attr = [
				'class'				=> 'leaflet-map',
				'data-height'		=> $field['height'],
				'data-map'			=> 'leaflet',
				'data-map-lng'		=> $value['lng'],
				'data-map-lat'		=> $value['lat'],
				'data-map-zoom'		=> $value['zoom'],
				'data-map-layers'	=> $value['layers'],
				'data-map-markers'	=> $value['markers'],
			];

			if ( isset( $field['attr'] ) ) {
				$map_attr = $field['attr'] + $map_attr;
			}


			$html = sprintf('<div %s></div>', acf_esc_attr( $map_attr ) );
			$value = $html;

			wp_enqueue_style( 'leaflet' );

		}

		// return
		return $value;
	}

	/**
	 * Apply basic formatting to prepare the value for default REST output.
	 *
	 * @param mixed      $value
	 * @param int|string $post_id
	 * @param array      $field
	 * @return array|mixed
	 */
	public function format_value_for_rest( $value, $post_id, array $field ) {

		if ( ! $value ) {
			return null;
		}

		return acf_format_numerics( $value );
	}


	//*/


	/*
	 *  validate_value()
	 *
	 *  This filter is used to perform validation on the value prior to saving.
	 *  All values are validated regardless of the field's required setting. This allows you to validate and return
	 *  messages to the user if the value is not correct
	 *
	 *  @type	filter
	 *  @date	11/02/2014
	 *  @since	5.0.0
	 *
	 *  @param	$valid (boolean) validation status based on the value and the field's required setting
	 *  @param	$value (mixed) the $_POST value
	 *  @param	$field (array) the field array holding all the field options
	 *  @param	$input (string) the corresponding input name for $_POST value
	 *  @return	$valid
	 */
	function validate_value( $valid, $value, $field, $input ){

		// bail early if not required
		if( ! $field['required'] || $field['max_markers'] === 0 ) {

			return $valid;

		}

		$value = json_decode( stripslashes( $value ), true );

		if ( ! count( $value['markers'] ) ) {

			return __('Please set a marker on the map.','acf-openstreetmap-field');

		}

		// return
		return $valid;
	}



	/*
	 *  load_field()
	 *
	 *  This filter is applied to the $field after it is loaded from the database
	 *
	 *  @type	filter
	 *  @date	23/01/2013
	 *  @since	3.6.0
	 *
	 *  @param	$field (array) the field array holding all the field options
	 *  @return	$field
	 */
	function load_field( $field ) {

		return $this->sanitize_field( $field, 'display' );
	}

	/*
	*  update_field()
	*
	*  This filter is applied to the $field before it is saved to the database
	*
	*  @type	filter
	*  @date	23/01/2013
	*  @since	3.6.0
	*
	*  @param	$field (array) the field array holding all the field options
	*  @return	$field
	*/
	function update_field( $field ) {

		return $this->sanitize_field( $field, 'update' );
	}


	/**
	 *	@param array $field
	 *	@param string $context
	 *	@return array Sanitized $field
	 */
	private function sanitize_field( $field, $context = '' ) {

		$field = wp_parse_args( $field, $this->defaults );

		// typecast and restrict values
		$field['center_lat'] = floatval( $field['center_lat'] );
		$field['center_lng'] = floatval( $field['center_lng'] );
		$field['zoom']       = min( 22, max( 1, intval( $field['zoom'] ) ) );

		// layers
		$field['layers']     = $this->sanitize_layers( $field['layers'] );

		return $field;
	}

	/**
	 *	@action wp_footer
	 */
	public function maybe_print_media_templates() {
		if ( ! did_action( 'print_media_templates' ) ) {
			$this->print_media_templates();
		}
	}

	/**
	 *	@action print_media_templates
	 */
	public function print_media_templates() {
		?>
		<script type="text/html" id="tmpl-osm-marker-input">
			<div class="locate">
				<a class="dashicons dashicons-location" data-name="locate-marker">
					<span class="screen-reader-text">
						<?php esc_html_e('Locate Marker','acf-openstreetmap-field'); ?>
					</span>
				</a>
			</div>
			<div class="input">
				<input type="text" data-name="label" />
			</div>
			<div class="tools">
				<a class="acf-icon -minus small light acf-js-tooltip" href="#" data-name="remove-marker" title="<?php esc_attr_e('Remove Marker', 'acf-openstreetmap-field'); ?>"></a>
			</div>
		</script>
		<?php
	}
}
