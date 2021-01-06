import { LayerType, registerLayerType } from 'layers/layer-type'
import leaflet from 'leaflet';
import { options, providers } from 'pluginOptions'

const L = leaflet

class LayerTypeMarkers extends LayerType {

	default = {
		markers: []
	}

	setupMap() {
		const createEvt = new CustomEvent('acf-osm-map-create-markers', { 
				bubbles: true,
				cancelable: true,
				detail: {
					map: this.map,
					mapData: this.markers
				}
			} ),
			el = this.map.getContainer(),
			defaultMarkerConfig = {};

		el.dispatchEvent( createEvt )

		// allow to skip map creation
		if ( createEvt.defaultPrevented ) {
			return;
		}

		if ( options.marker.html !== false ) {
			defaultMarkerConfig.icon = L.divIcon({
				html: options.marker.html,
				className: options.marker.className
			});
		} else if ( options.marker.icon !== false ) {
			defaultMarkerConfig.icon = new L.icon( options.marker.icon );
		}

		this.markers.forEach( markerData => {
			let marker;

			const createEvt = new CustomEvent( 'acf-osm-map-marker-create', {
				bubbles: true,
				cancelable: true,
				detail: {
					map: this.map,
					markerData: markerData,
					markerOptions: Object.assign( defaultMarkerConfig, {
						label: markerData.label
					} ),
				}
			} );
			el.dispatchEvent( createEvt )

			if ( createEvt.defaultPrevented ) {
				return;
			}

			marker = L.marker(
					L.latLng( parseFloat( createEvt.detail.markerData.lat ), parseFloat( createEvt.detail.markerData.lng ) ),
					createEvt.detail.markerOptions
				)
				.bindPopup( createEvt.detail.markerOptions.label )
				.addTo( this.map );

			el.dispatchEvent(new CustomEvent('acf-osm-map-marker-created',{
				detail: {
					marker: marker
				}
			}))
		} )
	}
}

registerLayerType( 'markers', LayerTypeMarkers );

module.exports = LayerTypeMarkers
