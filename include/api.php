<?php

/**
 *	Get iFrame src from openstreetmap.org
 *
 *	@param Array $map Map Data from ACF field
 *	@return String 
 */
 function acf_osm_get_iframe_url( $map ) {
 	return \ACFFieldOpenstreetmap\Core\OSMProviders::instance()->get_iframe_url( $map );
 }

/**
 *	Get link to openstreetmap.org
 *
 *	@param Array $map Map Data from ACF field
 *	@return String 
 */
function acf_osm_get_link_url( $map ) {
	return \ACFFieldOpenstreetmap\Core\OSMProviders::instance()->get_link_url( $map );
}


/**
 *  @return Array
 */
function acf_osm_get_osm_providers( ) {
    return \ACFFieldOpenstreetmap\Core\OSMProviders::instance()->get_layers();
}


/**
 *  @return Array
 */
function acf_osm_get_leaflet_providers( ) {
    return \ACFFieldOpenstreetmap\Core\LeafletProviders::instance()->get_layers();
}



/**
 *  Generate HTML Attribute String.
 *  JSON-Encode non-scalar values.
 *
 *  @param Array $attr Attributes
 *  @return String
 */
function acf_osm_esc_attr( $attr ) {
    $html = '';
	
	// Loop over attrs and validate data types.
	foreach( $attr as $k => $v ) {
		
		// String (but don't trim value).
		if( is_string($v) && ($k !== 'value') ) {
			$v = trim($v);
			
		// Boolean	
		} elseif( is_bool($v) ) {
			$v = $v ? 1 : 0;
			
		// Object
		} elseif( is_array($v) || is_object($v) ) {
			$v = json_encode($v);
		}
		
		// Generate HTML.
		$html .= sprintf( ' %s="%s"', sanitize_key($k), esc_attr($v) );
	}
	
	// Return trimmed.
	return trim( $html );
}