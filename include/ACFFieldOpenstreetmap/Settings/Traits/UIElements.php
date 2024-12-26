<?php

namespace ACFFieldOpenstreetmap\Settings\Traits;

trait UIElements {

	final public function select_ui( $options, $current, $name ) {
		return sprintf( '<select name="%1$s">%2$s</select>',
			$name,
			implode(
				"\n",
				array_map(
					function( $value, $label ) use ( $current ) {
						return sprintf(
							'<option value="%1$s" %2$s>%3$s</option>',
							esc_attr( $value ),
							selected( $value, $current, false ),
							esc_html( $label )
						);
					},
					array_keys( $options ),
					array_values( $options )
				)
			)
		);
	}

}
