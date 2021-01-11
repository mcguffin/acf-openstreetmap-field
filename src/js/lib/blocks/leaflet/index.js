
/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { createBlock } from '@wordpress/blocks';
/**
 * Internal dependencies
 */
import edit from './edit';
import metadata from './block.json';
import save from './save';

//import { options, providers } from 'pluginOptions'
import { options as adminOptions, i18n } from 'pluginAdminOptions'

const { name } = metadata

// set default map data
metadata.attributes.map.default = JSON.stringify( adminOptions.default_map )

export { metadata, name };

export const settings = {
	title: __( 'Leaflet Map', 'acf-openstreetmap-field' ),
	description: __( 'Interactive Leaflet Map', 'acf-openstreetmap-field' ),
	keywords: [ __( 'map' ), __( 'leaflet' ), __( 'location' ) ],
	supports: {
		anchor: true,
		html: false,
	}, // from core group
	icon:'location',
	edit,
	save,
	...metadata
}
