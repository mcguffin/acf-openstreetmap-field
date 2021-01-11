/**
 * External dependencies
 */
import { range } from 'lodash';
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import {
	AlignmentToolbar,
	BlockControls,
	InspectorControls,
	useBlockProps
} from '@wordpress/block-editor';

import { compose } from '@wordpress/compose';
import {
	PanelBody,
	RangeControl,
	Toolbar,
	ToolbarButton,
	ToggleControl
} from '@wordpress/components';
import { select,withSelect } from '@wordpress/data';
import { Component } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { options as adminOptions, i18n } from 'pluginAdminOptions'


const [ minHeight, maxHeight ] = [ 50, 1000 ];


const OSMLeafletBlockEdit = function(props) {

	const {
		attributes,
		setAttributes,
	} = props;

	const {
		height,
		map
	} = attributes;

	const mapObject = JSON.parse(map)
	const mapControls = [
		{ type: 'zoompan' },
		{ type: 'providers', config: Object.values(adminOptions.leaflet_layers) },
		{ type: 'markers', config: { max_markers: false } },
		{ type: 'locator' }
	];

	const wrapperClass = [];
	const blockProps = useBlockProps();

	// 2DO: on change height
	return <>
		<BlockControls>
		</BlockControls>
		<InspectorControls>
			<PanelBody title={ __( 'Map', 'acf-openstreetmap-field' ) }>
				<RangeControl
					label={ __( 'Height', 'pp-accordion-block' ) }
					value={ height }
					min={ minHeight }
					max={ maxHeight }
					onChange={ (newHeight) => {setAttributes( { height: newHeight } )} }
				/>
			</PanelBody>
		</InspectorControls>
		<div
			{ ...blockProps }
			className={ classnames(
				'leaflet-parent',
				blockProps.className
			) }
			
		>
			<div 
				className="leaflet-map"
				data-height={ height }
				data-map='leaflet'
				data-map-lat={ mapObject.lat }
				data-map-lng={ mapObject.lng }
				data-map-zoom={ mapObject.zoom }
				data-map-layers={ JSON.stringify( mapObject.layers ) }
				data-map-controls={ JSON.stringify( mapControls ) }
				data-map-version={ mapObject.version }
			>
				<input 
					type="text"
					value={ map }
					onChange={ e => {
						setAttributes( { map: e.target.value } )
					} }
				/>
			</div>
			
		</div>
	</>;
}
/*

'class'				=> 'leaflet-map',
'data-height'		=> $map['height'],
'data-map'			=> 'leaflet',
'data-map-lng'		=> $map['lng'],
'data-map-lat'		=> $map['lat'],
'data-map-zoom'		=> $map['zoom'],
'data-map-layers'	=> $map['layers'],
'data-map-controls'	=> $controls,
'data-map-version'	=> $map['version'],

<div class="leaflet-parent">
	<input <?php echo acf_osm_esc_attr( [
		'id'	=> $args['input_id'],
		'name'	=> $args['input_name'],
		'type'	=> 'hidden',
		'class' => 'osm-json',
		'value'	=> $map,
	] ) ?> />
	<div data-map-admin <?php echo acf_osm_esc_attr( $attr ) ?>></div>
</div>
*/


//export default OSMLeafletBlock
export default OSMLeafletBlockEdit;
