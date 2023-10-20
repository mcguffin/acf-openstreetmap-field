import $ from 'jquery';
import L from 'osm-map';
import ResetLayers from 'leaflet/control-reset-layers';

let currentLayer = false,
	currentOverlay = false;

const { options, providers } = acf_osm;


$(document).on('acf-osm-map-init',function(e){
	const map = e.detail.map

	const isOverlay = provider_key => {
		const parts = provider_key.split('.')
		let config = providers[parts.shift()]

		if ( config.isOverlay ) {
			return true;
		}
		if ( parts.length ) {
			config = config.variants[parts.shift()];
		}
		return !! config.isOverlay;
	}

	const addLayer = provider_key => {

		const layerConfig = options.layer_config[ provider_key.split('.')[0] ] || { options: {} };
		const layer       = L.tileLayer.provider( provider_key, layerConfig.options );

		layer.provider_key = provider_key;

		if ( isOverlay( provider_key ) ) {

			if ( currentOverlay ) {
				currentOverlay.remove();

				if ( currentOverlay.provider_key === provider_key ) {
					currentOverlay = false;
					return;
				}
			}
			currentOverlay = layer;
			currentOverlay.addTo( map );
		} else {
			if ( currentLayer ) {
				map.eachLayer(function(layer) { layer.remove() } );
				currentOverlay = false;
				//currentLayer.remove();
			}
			currentLayer = layer;

			currentLayer.addTo( map );

			if ( currentOverlay ) {
				currentOverlay.remove();
				currentOverlay.addTo( map );
			}
		}
	};
	map.on('layeradd', e => {

		let currentZoom, newZoom;

		const { layer } = e

		if ( ! map.hasLayer(layer) ) {
			return;
		}

		if (!!layer.options.bounds) {
			map.fitBounds( L.latLngBounds(layer.options.bounds), {
				paddingTopLeft: [0, 0],
				paddingBottomRight: [0, 0]
			});
		}

		// set zoom to current restrictions
		currentZoom = map.getZoom()
		newZoom = Math.max(
			layer.options.minZoom,
			Math.min( currentZoom, layer.options.maxZoom )
		);

		( currentZoom !== newZoom ) && map.setZoom( newZoom );
	});

	new ResetLayers({
		position: 'topright'
	}).addTo( map );

	$(document)
		.on('click','.acf-osm-settings [data-layer]',function(e){
			e.preventDefault();
			addLayer( $(this).data('layer') );
		})
		.on('change','.osm-disable[type="checkbox"]',function(e){
			$(this).closest('.acf-osm-setting').toggleClass('disabled',$(this).prop('checked'))
		})
})
