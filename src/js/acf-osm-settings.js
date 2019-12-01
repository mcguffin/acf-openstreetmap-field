
(function( $, arg, exports ){
	var options = arg.options,
		providers = arg.providers;
	var currentLayer = false, currentOverlay = false;
	var get_map = function() {
		return $('.leaflet-container:first').data('acf-osm-map');
	};
	function isOverlay( provider_key ) {
		var parts = provider_key.split('.'),
			config = providers[parts.shift()];
		if ( parts.length ) {
			config = config.variants[parts.shift()];
		}

		return !! config.isOverlay;
	}
	function addLayer( provider_key ) {

		var layer, layerConfig, map = get_map();
		
		layerConfig = options.layer_config[ provider_key.split('.')[0] ] || { options: {} };

		layer = L.tileLayer.provider( provider_key, layerConfig.options );
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

	$(document)
		.on('click','.acf-osm-settings [data-layer]',function(e){
			e.preventDefault();
			addLayer( $(this).data('layer') );
		})
	// 
	// self.map.eachLayer(function(layer) {
	// 	if ( ! layer.providerKey ) {
	// 		return;
	// 	}
	// 
	// 	if ( self.layer_is_overlay( layer.providerKey, layer ) ) {
	// 		layers.push( layer.providerKey )
	// 	} else {
	// 		layers.unshift( layer.providerKey )
	// 	}
	// });

})( jQuery, acf_osm, window );
