/**
 * External dependencies
 */

/**
 * WordPress dependencies
 */
import {
	useBlockProps
} from '@wordpress/block-editor';

export default function save( { attributes } ) {

	const {
		height,
		map
	} = attributes;
	const mapObject = JSON.parse(map)

	const wrapperClass = [];
	
	return (
		<div { ...useBlockProps.save() }>
			<div 
				className="leaflet-map"
				data-height={ height }
				data-map='leaflet'
				data-map-lat={ mapObject.lat }
				data-map-lng={ mapObject.lng }
				data-map-zoom={ mapObject.zoom }
				data-map-layers={ JSON.stringify( mapObject.layers ) }
				data-map-version={ mapObject.version }
			>
			</div>
		</div>
	);
}
