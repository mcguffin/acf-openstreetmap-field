<?php

namespace ACFFieldOpenstreetmap\Field;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Helper;
use ACFFieldOpenstreetmap\Model;

// exit if accessed directly
if( ! defined( 'ABSPATH' ) ) exit;


class OpenStreetMap extends \acf_field {

	private static $_instance = null;

	public static function get_instance() {
		if ( is_null( self::$_instance ) ) {
			new self();
		}
		return self::$_instance;
	}

	/*
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
		$this->label = __( 'OpenStreetMap', 'acf-openstreetmap-field' );

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
			// 'markers'	=> [],
			// gm compatibility
			// 'address'	=> '',
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

		// do not delete!
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

		// return_format
		acf_render_field_setting( $field, [
			'label'			=> __( 'Return Format', 'acf' ),
			'instructions'	=> '',
			'type'			=> 'radio',
			'name'			=> 'return_format',
			'choices'		=> [
				'raw'			=> __( 'Raw Data', 'acf-openstreetmap-field' ),
				'object'		=> __( 'Map Object', 'acf-openstreetmap-field' ),
			] + $return_choices,
			'layout'	=>	'horizontal',
		]);

		acf_render_field_setting( $field, [
			'label'				=> __( 'Map Appearance', 'acf-openstreetmap-field' ),
			'instructions'		=> __( 'Set zoom, center and select layers being displayed.', 'acf-openstreetmap-field' ),
			'type'				=> 'open_street_map',
			'name'				=> 'leaflet_map',

			'return_format'		=> 'field-group',
			'max_markers'		=> 0,
			'attr'				=> [
				'data-map-layers'		=> $field['layers'],
			],
			'value'	=> [
				'lat'				=> $field['center_lat'],
				'lng'				=> $field['center_lng'],
				'zoom'				=> $field['zoom'],
				'layers'			=> $field['layers'],
			],
		] );

		// lat
		acf_render_field_setting( $field, [
			'label'			=> __('Map Position','acf-openstreetmap-field'),
			'instructions'	=> __('Center the initial map','acf-openstreetmap-field'),
			'type'			=> 'number',
			'name'			=> 'center_lat',
			'prepend'		=> __('lat','acf-openstreetmap-field'),
			'placeholder'	=> $this->default_values['lat']
		]);


		// lng
		acf_render_field_setting( $field, [
			'label'			=> __('Center','acf-openstreetmap-field'),
			'instructions'	=> __('Center the initial map','acf-openstreetmap-field'),
			'type'			=> 'number',
			'name'			=> 'center_lng',
			'prepend'		=> __('lng','acf-openstreetmap-field'),
			'placeholder'	=> $this->default_values['lng'],
			'_append' 		=> 'center_lat'
		]);


		// zoom
		acf_render_field_setting( $field, [
			'label'			=> __('Zoom','acf-openstreetmap-field'),
			'instructions'	=> __('Set the initial zoom level','acf-openstreetmap-field'),
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
			'label'			=> __('Allow layer selection','acf-openstreetmap-field'),
			'instructions'	=> '',
			'name'			=> 'allow_map_layers',
			'type'			=> 'true_false',
			'ui'			=> 1,
		]);

		// map height
		acf_render_field_setting( $field, [
			'label'			=> __('Height','acf'),
			'instructions'	=> __('Customize the map height','acf-openstreetmap-field'),
			'type'			=> 'text',
			'name'			=> 'height',
			'append'		=> 'px',
		]);


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

		// layers

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
		$templates = Core\Templates::instance();

		if ( is_null( $field['value'] ) ) {
			$field['value'] = $this->sanitize_value( [], $field, 'display' );
		}

		$map = Model\Map::fromArray( $field['value'] );
		// $map->setDefaultLayers($field['layers']);
		// value
		//$field['value'] = wp_parse_args( $field['value'], $this->default_values );

		// json_encoded value
		// acf_text_input([
		// 	'id'		=> $field['id'],
		// 	'name'		=> $field['name'],
		// 	'value'		=> json_encode($map->toArray()),//json_encode( $field['value'] ),
		// 	'class'		=> 'osm-json',
		// ]);

		$providers = false;

		$map_args = [
			'input_id'		=> $field['id'],
			'input_name'	=> $field['name'],
			'map_object'	=> $map,
			'controls'		=> [],
			'field'			=> $field,
		];

		$max_markers = $field['max_markers'] === '' ? false : intval( $field['max_markers'] );

		if ( 'osm' === $field['return_format'] ) {
			if ( $max_markers === false ) { // no restriction > max one marker
				$max_markers = 1;
			}
			// only one marker max
			$max_markers = min( $max_markers, 1 );
		}
		
		$map_args['controls'] = [ ['type' => 'zoompan' ] ];

		if ( $field['allow_map_layers'] ) {
			$map_args['controls'][] = [ 
				'type' => 'providers', 
			];
			//$map_args['map'] = wp_parse_args( $map_args['map'], ['layers' => [] ] );
		}
		if ( $max_markers !== 0 ) {
			$map_args['controls'][] = [ 
				'type' => 'markers', 
				'config' => [ 
					'max_markers' => $max_markers
				] 
			];
		}
		$map_args['controls'][] =  [ 'type' => 'locator' ];

		$templates->render_template( 'admin', $field['return_format'], $map_args );

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

		wp_enqueue_script('acf-osm-admin');

		wp_enqueue_style('acf-osm-admin');

		wp_enqueue_style('leaflet');

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

		wp_enqueue_script('acf-osm-field-group');

		wp_enqueue_script('acf-osm-admin');

		wp_enqueue_style('acf-osm-admin');

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
	 *	@param array $value	array( 'lat' => float, 'lng => float, 'zoom' => int, 'address' => string, 'markers' => array, 'layers' => array )
 	 *	@param array $field
 	 *	@param string $context edit|display|update
 	 *	@return array Sanitized $value
 	 */
	private function sanitize_value( $value, $field, $context = '' ) {

		$map = Model\Map::fromArray( wp_parse_args( $value, [
			'lat'	=> $field['center_lat'],
			'lng'	=> $field['center_lng'],
			'zoom'	=> $field['zoom'],
		]) );
		
		/// set map layers
		if ( ! count( $map->getProviders() ) ) {
			$map->setProviders( $field['layers' ] );
		}
		$value = $map->toArray();

		return array_intersect_key( $value, $this->default_values );

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


		if ( 'raw' === $field['return_format'] ) {

			$map = Model\Map::fromArray( $value );

			// ensure
			$value = $map->toLegacyArray(); //$this->sanitize_value( $value, $field, 'display' );

			// ensure backwards compatibility <= 1.0.1
			$value['center_lat'] = $value['lat'];
			$value['center_lng'] = $value['lng'];

		} else if ( 'object' === $field['return_format'] ) {
			$value = Model\Map::fromArray( $value );

		} else if ( 'admin' === $field['return_format'] ) {
			// render map admin

			$map = Model\Map::fromArray( $value );
			$templates = Core\Templates::instance();
			$map_args = [
				'field' => $field,
				'map_object' => $map,
				'controls' => [
					['type' => 'zoompan', ],
					[ 'type' => 'providers', ],
					[ 'type' => 'locator' ]
				]
			];

			ob_start();
			
			$templates->render_template( 'admin', null, $map_args );
			$value = ob_get_clean();

		} else {
			// regular output
			$templates = Core\Templates::instance();
			$map = Model\Map::fromArray( $value + [ 'height' => $field['height'] ] );
			$map_args = [
				'field' => $field,
				'map_object' => $map,
				'map' => $map->toLegacyArray(), // legacy compatibility
			];
			ob_start();
			$templates->render_template( $field['return_format'], null, $map_args );
			$value = ob_get_clean();

		}

		// return
		return $value;
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

		// bail early if not required or no markers allowed
		if( ! $field['required'] || $field['max_markers'] === 0 ) {

			return $valid;

		}

		$value = json_decode( stripslashes( $value ), true );

		$map = Model\Map::fromArray( $value );

		// ensure
		$value = $map->toLegacyArray(); //$this->sanitize_value( $value, $field, 'display' );


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

		$field = wp_parse_args( $field, [
			'center_lat'	=> $this->defaults['center_lat'],
			'center_lng'	=> $this->defaults['center_lng'],
			'zoom'			=> $this->defaults['zoom'],
		] );

		// typecast values
		$field['center_lat']	= floatval( $field['center_lat'] );
		$field['center_lng']	= floatval( $field['center_lng'] );
		$field['zoom'] 			= min( 22, max( 1, intval( $field['zoom'] ) ) );

		return $field;
	}
}
