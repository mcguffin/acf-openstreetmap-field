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

