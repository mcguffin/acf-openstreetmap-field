import { LayerType, registerLayerType } from 'layers/layer-type'
import leaflet from 'leaflet';
import { options, providers } from 'pluginOptions'

const L = leaflet

/*

const createLayers = ( data, map ) => {
	var createEvt = new CustomEvent( 'acf-osm-map-create-layers', {
			bubbles: true,
			cancelable: true,
			detail: {
				map: map,
				mapData: data,
			}
		}),
		maxzoom;

	this.dispatchEvent( createEvt );

	// allow to skip map creation
	if ( createEvt.defaultPrevented ) {
		return;
	}

	maxzoom = 100;

	// layers ...
	$.each( data.mapLayers, function( i, provider_key ) {

		if ( 'string' !== typeof provider_key ) {
			return;
		}

		var layer_config = options.layer_config[ provider_key.split('.')[0] ] || { options: {} },
			layer = L.tileLayer.provider( provider_key, layer_config.options ).addTo( map );

		layer.providerKey = provider_key;

		if ( !! layer.options.maxZoom ) {
			maxzoom = Math.min( layer.options.maxZoom, maxzoom )
		}
	});
	map.setMaxZoom( maxzoom );
}
*/


class LayerTypeProvider extends LayerType {

	setupMap() {
		let maxzoom = 100;
		const createEvt = new CustomEvent( 'acf-osm-map-create-layers', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: this.map,
					mapData: [ this.config ], // TODO
					leaflet: L,
				}
			}),
			el = this.map.getContainer();

		el.dispatchEvent( createEvt );

		// allow to skip map creation
		if ( createEvt.defaultPrevented ) {
			return;
		}


		const layer_config = options.layer_config[ this.config.split('.')[0] ] || { options: {} },
			layer = L.tileLayer.provider( this.config, layer_config.options ).addTo( this.map );

		layer.providerKey = this.config;

		if ( !! layer.options.maxZoom ) {
			maxzoom = Math.min( layer.options.maxZoom, maxzoom )
		}
		this.map.setMaxZoom( maxzoom );

	}
}

registerLayerType( 'provider', LayerTypeProvider );

module.exports = LayerTypeProvider

