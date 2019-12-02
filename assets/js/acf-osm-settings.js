
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1vc20tc2V0dGluZ3MuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLW9zbS1zZXR0aW5ncy5qcyIsInNvdXJjZXNDb250ZW50IjpbIlxuKGZ1bmN0aW9uKCAkLCBhcmcsIGV4cG9ydHMgKXtcblx0dmFyIG9wdGlvbnMgPSBhcmcub3B0aW9ucyxcblx0XHRwcm92aWRlcnMgPSBhcmcucHJvdmlkZXJzLFxuXHRcdGN1cnJlbnRMYXllciA9IGZhbHNlLCBjdXJyZW50T3ZlcmxheSA9IGZhbHNlO1xuXG5cblx0TC5Db250cm9sLlJlc2V0TGF5ZXJzID0gTC5Db250cm9sLmV4dGVuZCh7XG5cdFx0b25BZGQ6ZnVuY3Rpb24oKSB7XG5cblx0XHRcdHRoaXMuX2NvbnRhaW5lciA9IEwuRG9tVXRpbC5jcmVhdGUoJ2RpdicsXG5cdFx0XHRcdCdsZWFmbGV0LWNvbnRyb2wtYWRkLWxvY2F0aW9uLW1hcmtlciBsZWFmbGV0LWJhciBsZWFmbGV0LWNvbnRyb2wnKTtcblxuXHRcdFx0dGhpcy5fbGluayA9IEwuRG9tVXRpbC5jcmVhdGUoJ2EnLCAnbGVhZmxldC1iYXItcGFydCBsZWFmbGV0LWJhci1wYXJ0LXNpbmdsZScsIHRoaXMuX2NvbnRhaW5lcik7XG5cdFx0XHQvL3RoaXMuX2xpbmsudGl0bGUgPSBpMThuLmFkZF9tYXJrZXJfYXRfbG9jYXRpb247XG5cdFx0XHR0aGlzLl9pY29uID0gTC5Eb21VdGlsLmNyZWF0ZSgnc3BhbicsICdkYXNoaWNvbnMgZGFzaGljb25zLWltYWdlLXJvdGF0ZScsIHRoaXMuX2xpbmspO1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKVxuXHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQpXG5cdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5fb25DbGljaywgdGhpcylcblx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbik7XG5cblx0XHRcdHJldHVybiB0aGlzLl9jb250YWluZXI7XG5cdFx0fSxcblx0XHRvblJlbW92ZTpmdW5jdGlvbigpIHtcblx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApXG5cdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdCApXG5cdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5fb25DbGljaywgdGhpcyApXG5cdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2RibGNsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24gKTtcblx0XHR9LFxuXHRcdF9vbkNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuX21hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHsgbGF5ZXIucmVtb3ZlKCkgfSApO1xuXHRcdH1cblx0fSlcblx0XG5cdGZ1bmN0aW9uIGdldF9tYXAoKSB7XG5cdFx0cmV0dXJuICQoJy5sZWFmbGV0LWNvbnRhaW5lcjpmaXJzdCcpLmRhdGEoJ2FjZi1vc20tbWFwJyk7XG5cdH07XG5cblx0ZnVuY3Rpb24gaXNPdmVybGF5KCBwcm92aWRlcl9rZXkgKSB7XG5cdFx0dmFyIHBhcnRzID0gcHJvdmlkZXJfa2V5LnNwbGl0KCcuJyksXG5cdFx0XHRjb25maWcgPSBwcm92aWRlcnNbcGFydHMuc2hpZnQoKV07XG5cdFx0aWYgKCBjb25maWcuaXNPdmVybGF5ICkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXHRcdGlmICggcGFydHMubGVuZ3RoICkge1xuXHRcdFx0Y29uZmlnID0gY29uZmlnLnZhcmlhbnRzW3BhcnRzLnNoaWZ0KCldO1xuXHRcdH1cblxuXHRcdHJldHVybiAhISBjb25maWcuaXNPdmVybGF5O1xuXHR9XG5cdGZ1bmN0aW9uIGFkZExheWVyKCBwcm92aWRlcl9rZXkgKSB7XG5cblx0XHR2YXIgbGF5ZXIsIGxheWVyQ29uZmlnLCBtYXAgPSBnZXRfbWFwKCk7XG5cdFx0XG5cdFx0bGF5ZXJDb25maWcgPSBvcHRpb25zLmxheWVyX2NvbmZpZ1sgcHJvdmlkZXJfa2V5LnNwbGl0KCcuJylbMF0gXSB8fCB7IG9wdGlvbnM6IHt9IH07XG5cblx0XHRsYXllciA9IEwudGlsZUxheWVyLnByb3ZpZGVyKCBwcm92aWRlcl9rZXksIGxheWVyQ29uZmlnLm9wdGlvbnMgKTtcblx0XHRsYXllci5wcm92aWRlcl9rZXkgPSBwcm92aWRlcl9rZXk7XG5cblx0XHRpZiAoIGlzT3ZlcmxheSggcHJvdmlkZXJfa2V5ICkgKSB7XG5cblx0XHRcdGlmICggY3VycmVudE92ZXJsYXkgKSB7XG5cdFx0XHRcdGN1cnJlbnRPdmVybGF5LnJlbW92ZSgpO1xuXHRcdFx0XHRcblx0XHRcdFx0aWYgKCBjdXJyZW50T3ZlcmxheS5wcm92aWRlcl9rZXkgPT09IHByb3ZpZGVyX2tleSApIHtcblx0XHRcdFx0XHRjdXJyZW50T3ZlcmxheSA9IGZhbHNlO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudE92ZXJsYXkgPSBsYXllcjtcblx0XHRcdGN1cnJlbnRPdmVybGF5LmFkZFRvKCBtYXAgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCBjdXJyZW50TGF5ZXIgKSB7XG5cdFx0XHRcdG1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHsgbGF5ZXIucmVtb3ZlKCkgfSApO1xuXHRcdFx0XHRjdXJyZW50T3ZlcmxheSA9IGZhbHNlO1xuXHRcdFx0XHQvL2N1cnJlbnRMYXllci5yZW1vdmUoKTtcdFx0XHRcdFxuXHRcdFx0fVxuXHRcdFx0Y3VycmVudExheWVyID0gbGF5ZXI7XG5cdFx0XHRjdXJyZW50TGF5ZXIuYWRkVG8oIG1hcCApO1xuXHRcdFx0aWYgKCBjdXJyZW50T3ZlcmxheSApIHtcblx0XHRcdFx0Y3VycmVudE92ZXJsYXkucmVtb3ZlKCk7XG5cdFx0XHRcdGN1cnJlbnRPdmVybGF5LmFkZFRvKCBtYXAgKTtcblx0XHRcdFx0Ly8gaWYgem9vbSAmJiBib3VuZHM6IG1vdmUgaW50byBib3VuZHNcblx0XHRcdH1cblx0XHR9XG5cblx0fTtcblxuXHQkKGRvY3VtZW50KVxuXHRcdC5vbigncmVhZHknLGZ1bmN0aW9uKCl7XG5cdFx0XHR2YXIgbWFwID0gZ2V0X21hcCgpO1xuXHRcdFx0bWFwLm9uKCdsYXllcmFkZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHZhciBsYXllciA9IGUubGF5ZXI7XG5cdFx0XHRcdGlmICghbWFwLmhhc0xheWVyKGxheWVyKSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghIWxheWVyLm9wdGlvbnMuYm91bmRzKSB7XG5cdFx0XHRcdFx0dmFyIGJvdW5kcyA9IEwubGF0TG5nQm91bmRzKGxheWVyLm9wdGlvbnMuYm91bmRzKTtcblx0XHRcdFx0XHRtYXAuZml0Qm91bmRzKGJvdW5kcywge1xuXHRcdFx0XHRcdFx0cGFkZGluZ1RvcExlZnQ6IFswLCAwXSxcblx0XHRcdFx0XHRcdHBhZGRpbmdCb3R0b21SaWdodDogWzAsIDBdXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKGxheWVyLm9wdGlvbnMubWluWm9vbSA+IDEgJiYgbWFwLmdldFpvb20oKSA+IGxheWVyLm9wdGlvbnMubWluWm9vbSkge1xuXHRcdFx0XHRcdG1hcC5zZXRab29tKGxheWVyLm9wdGlvbnMubWluWm9vbSk7XG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdFx0bmV3IEwuQ29udHJvbC5SZXNldExheWVycyh7XG5cdFx0XHRcdHBvc2l0aW9uOiAndG9wcmlnaHQnXG5cdFx0XHR9KS5hZGRUbyggbWFwICk7XG5cdFx0fSlcblx0XHQub24oJ2NsaWNrJywnLmFjZi1vc20tc2V0dGluZ3MgW2RhdGEtbGF5ZXJdJyxmdW5jdGlvbihlKXtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdGFkZExheWVyKCAkKHRoaXMpLmRhdGEoJ2xheWVyJykgKTtcblx0XHR9KVxuXHQvLyBcblx0Ly8gc2VsZi5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG5cdC8vIFx0aWYgKCAhIGxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHQvLyBcdFx0cmV0dXJuO1xuXHQvLyBcdH1cblx0Ly8gXG5cdC8vIFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuXHQvLyBcdFx0bGF5ZXJzLnB1c2goIGxheWVyLnByb3ZpZGVyS2V5IClcblx0Ly8gXHR9IGVsc2Uge1xuXHQvLyBcdFx0bGF5ZXJzLnVuc2hpZnQoIGxheWVyLnByb3ZpZGVyS2V5IClcblx0Ly8gXHR9XG5cdC8vIH0pO1xuXG59KSggalF1ZXJ5LCBhY2Zfb3NtLCB3aW5kb3cgKTtcbiJdfQ==
