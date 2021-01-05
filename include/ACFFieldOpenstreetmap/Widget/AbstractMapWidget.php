<?php

namespace ACFFieldOpenstreetmap\Widget;

use ACFFieldOpenstreetmap\Core;
use ACFFieldOpenstreetmap\Model;

class AbstractMapWidget extends \WP_Widget {

	protected $map_type;
	
	private $min_height = 50;
	
	/**
	 *	@inheritdoc
	 */
	public function widget( $args, $instance ) {

		$templates = Core\Templates::instance();

		$instance = $this->parse_defaults( $instance );
		
		echo $args['before_widget'];
		if ( ! empty( $instance['title'] ) ) {
			echo $args['before_title'] . apply_filters( 'widget_title', $instance['title'] ) . $args['after_title'];
		}
		
		$map = Model\Map::fromArray( $instance['map'] );
		
		$templates->render_template( $this->map_type, null, [
			'input_id'		=> $this->get_field_id( 'map' ),
			'input_name'	=> $this->get_field_name( 'map' ),
			'map'			=> $map->toArray(),
			'field'			=> [
				'height'	=> $instance['height'],
			],
		] );
		
		echo $args['after_widget'];
	}

	/**
 	 *	@inheritdoc
 	 */
	public function form( $instance ) {
		
		$instance = $this->parse_defaults( $instance );
		
		$templates = Core\Templates::instance();
		
		$title = $instance['title'];
		$height = $instance['height'];
		$map = Model\Map::fromArray( $instance['map'] );

		?>
		<p>
			<?php printf( 
				'<label for="%1$s">%2$s</label>',
				esc_attr( $this->get_field_id( 'title' ) ),
				esc_html__( 'Title:', 'acf-openstreetmap-field' )
			); ?>
			<?php printf( 
				'<input type="text" id="%1$s" name="%2$s" value="%3$s" class="widefat" />',
				esc_attr( $this->get_field_id( 'title' ) ),
				esc_attr( $this->get_field_name( 'title' ) ),
				esc_attr( $title )
			); ?>
		</p>
		<p>
			<?php printf( 
				'<label for="%1$s">%2$s</label>',
				esc_attr( $this->get_field_id( 'height' ) ),
				esc_html__( 'Height:', 'acf-openstreetmap-field' )
			); ?>
			<span class="acf-osm-input-row">
				<?php printf( 
					'<input type="number" id="%1$s" name="%2$s" value="%3$d" min="%4$d" class="widefat" />',
					esc_attr( $this->get_field_id( 'height' ) ),
					esc_attr( $this->get_field_name( 'height' ) ),
					intval( $height ),
					$this->min_height
				); ?>
				<span class="acf-osm-suffix">
					<?php esc_html_e('px','acf-openstreetmap-field' ); ?>
				</span>
			</span>
		</p>
		<div>
			<?php 

			$templates->render_template( 'admin', $this->map_type, [
				'input_id'		=> $this->get_field_id( 'map' ),
				'input_name'	=> $this->get_field_name( 'map' ),
				'map'			=> $map->toArray(),
				'controls'		=> [
					[ 'type' => 'zoompan' ],
					[ 'type' => 'providers', ],
					[ 'type' => 'markers', 'config' => [ 'max_markers' => false ] ],
					[ 'type' => 'locator' ],
				],
				'field'			=> [
					'height'	=> 400,
				],
			] );
			?>
		</div>
		<?php
	}

	/**
 	 *	@inheritdoc
 	 */
	public function update( $new_instance, $old_instance ) {
		
		$new_instance = wp_parse_args( $new_instance, [
			'title' => '',
			'map' => [],
		] );

		if ( is_string( $new_instance['map'] ) ) {
			$new_instance['map'] = json_decode( $new_instance['map'], true );			
		}

		$new_instance['title'] = sanitize_text_field( $new_instance['title'] );
		$new_instance['height'] = max( $this->min_height, intval( $new_instance['height'] ) );
		$new_instance['map'] = Model\Map::fromArray( $new_instance['map'] )->toArray();

		return $new_instance;
	}
	
	/**
	 *	Setup default map
	 */
	private function parse_defaults( $instance ) {
		$instance = wp_parse_args( $instance, [
			'title'		=> '',
			'height'	=> 400,
			'map'		=> [],
		] );
		$instance['map'] = wp_parse_args( $instance['map'], [
			'lat'		=> 53.55064,
			'lng'		=> 10.00065,
			'zoom'		=> 12,
			'layers'	=> [
				[ 'type' => 'provider', 'config' => 'OpenStreetMap.Mapnik' ],				
				[ 'type' => 'markers', 'config' => [] ], 
			],
		]);
		return $instance;
	}
}