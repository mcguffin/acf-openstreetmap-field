import { ControlType, registerControlType } from 'controls/control-type'
import leaflet from 'leaflet';
import { options, providers } from 'pluginOptions'
import { options as adminOptions, i18n } from 'pluginAdminOptions'
import { L } from 'maps';


const providerIsOverlay = pkey => {
	const [provider,variant] = pkey.split('.')
	if ( 'undefined' === typeof variant ) {
		return !! providers[provider].isOverlay
	}
	return !! providers[provider].isOverlay || !! providers[provider].variants[variant].isOverlay
}

class ControlTypeProviders extends ControlType {
		
	get value() {
		const layers = [];

		this.map.eachLayer( function( layer ) {
			if ( ! layer.providerKey ) {
				return;
			}
			
			if ( providerIsOverlay( layer.providerKey ) ) {
				layers.push( layer.providerKey )
			} else {
				layers.unshift( layer.providerKey )
			}
		});
		return layers
	}

	mutateMap( mapData ) {

		return Object.assign( mapData, {
			layers: [].concat(
				this.value.map( pkey => {
					return { type: 'provider', provider: pkey }
				} ), // regenerate provider layers
				mapData.layers.filter( layer => 'provider' !== layer.type ) // keep non-provider layers
			)
		} )
	}

	setupControl() {
		const baseLayers = {}
		const overlays = {}
		const selectedLayers = []
		const layers = {}
		const self = this
		
		this.onLayerChange = (e) => {
			if ( ! e.layer.providerKey ) {
				return;
			}
			this.cb( this )
		}
		
		// add empty layers control
		const layersControl = L.control.layers( {}, {}, {
			collapsed: true,
			hideSingleBase: true,
			autoZIndex: true
		}).addTo( this.map );
		this.layersControl = layersControl

		/**
		 *
		 */
		const getLayer = pkey => {
			let layer = Object.values(this.map._layers).find( l => l.providerKey === pkey )

			if ( 'undefined' === typeof layer ) {
				layer = L.tileLayer.provider( pkey )
				layer.providerKey = pkey;
			}
			return layer
		}

		// seperate layers into base and overlay
		this.config.forEach( pkey => {
			let layer
			try {
				layer = getLayer( pkey );				
			} catch ( err ) {
				// generating layer failed, we ignore this
				return;
			}

			layers[pkey] = layer
			if ( providerIsOverlay( pkey ) ) {
				setTimeout( () => layersControl.addOverlay( layer, pkey ), 0  );
			} else {
				layersControl.addBaseLayer( layer, pkey )
			}

		} )
		// layer alias for default OpenStreetMap
		if ( ! layers['OpenStreetMap'] && !! layers['OpenStreetMap.Mapnik'] ) {
			layers['OpenStreetMap'] = layers['OpenStreetMap.Mapnik']
		}
		// expose this function
		this.setLayer = pkey => {
			if ( !! layers[pkey] ) {
				layers[pkey].addTo( this.map )				
			} else {
				console.trace(`[ACF OpenStreetMap] layer ${pkey} does not exist.`)
			}
		}

		this.map.getContainer().addEventListener('acf-osm-map-create-layers', e => {
			e.preventDefault()
			const [ pkey ] = e.detail.mapData
			this.setLayer(pkey)
		} )


		// cleanup layers

		// update value on layer change
		this.map.on( 'baselayerchange layeradd layerremove', this.onLayerChange );
	}

	resetControl() {
		this.map.off( 'baselayerchange layeradd layerremove', this.onLayerChange );
		this.layersControl.remove()
		//Object.values(this.map._layers).forEach( l => l.remove() )
	}
}


registerControlType( 'providers', ControlTypeProviders )