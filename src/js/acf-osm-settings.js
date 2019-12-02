
(function( $, arg, exports ){
	var options = arg.options,
		providers = arg.providers,
		currentLayer = false, currentOverlay = false;


	L.Control.ResetLayers = L.Control.extend({
		onAdd:function() {

			this._container = L.DomUtil.create('div',
				'leaflet-control-add-location-marker leaflet-bar leaflet-control');

			this._link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', this._container);
			//this._link.title = i18n.add_marker_at_location;
			this._icon = L.DomUtil.create('span', 'dashicons dashicons-image-rotate', this._link);
			L.DomEvent
				.on( this._link, 'click', L.DomEvent.stopPropagation)
				.on( this._link, 'click', L.DomEvent.preventDefault)
				.on( this._link, 'click', this._onClick, this)
				.on( this._link, 'dblclick', L.DomEvent.stopPropagation);

			return this._container;
		},
		onRemove:function() {
			L.DomEvent
				.off(this._link, 'click', L.DomEvent.stopPropagation )
				.off(this._link, 'click', L.DomEvent.preventDefault )
				.off(this._link, 'click', this._onClick, this )
				.off(this._link, 'dblclick', L.DomEvent.stopPropagation );
		},
		_onClick: function() {
			this._map.eachLayer(function(layer) { layer.remove() } );
		}
	})
	
	function get_map() {
		return $('.leaflet-container:first').data('acf-osm-map');
	};

	function isOverlay( provider_key ) {
		var parts = provider_key.split('.'),
			config = providers[parts.shift()];
		if ( config.isOverlay ) {
			return true;
		}
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
				// if zoom && bounds: move into bounds
			}
		}

	};

	$(document)
		.on('ready',function(){
			var map = get_map();
			map.on('layeradd', function (e) {
				var layer = e.layer;
				if (!map.hasLayer(layer)) {
					return;
				}

				if (!!layer.options.bounds) {
					var bounds = L.latLngBounds(layer.options.bounds);
					map.fitBounds(bounds, {
						paddingTopLeft: [0, 0],
						paddingBottomRight: [0, 0]
					});
				}
				if (layer.options.minZoom > 1 && map.getZoom() > layer.options.minZoom) {
					map.setZoom(layer.options.minZoom);
				}
			});
			new L.Control.ResetLayers({
				position: 'topright'
			}).addTo( map );
		})
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
