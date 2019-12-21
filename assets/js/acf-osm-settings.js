
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
				var layer = e.layer, 
					currentZoom, newZoom;
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

				// set zoom to current restrictions
				currentZoom = map.getZoom();
				newZoom = Math.max(
					layer.options.minZoom,
					Math.min( currentZoom, layer.options.maxZoom )
				);
				
				( currentZoom !== newZoom ) && map.setZoom( newZoom );
			});
			new L.Control.ResetLayers({
				position: 'topright'
			}).addTo( map );
		})
		.on('click','.acf-osm-settings [data-layer]',function(e){
			e.preventDefault();
			addLayer( $(this).data('layer') );
		})
		.on('change','.osm-disable[type="checkbox"]',function(e){
			$(this).closest('.acf-osm-setting').toggleClass('disabled',$(this).prop('checked'))
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1vc20tc2V0dGluZ3MuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2Ytb3NtLXNldHRpbmdzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4oZnVuY3Rpb24oICQsIGFyZywgZXhwb3J0cyApe1xuXHR2YXIgb3B0aW9ucyA9IGFyZy5vcHRpb25zLFxuXHRcdHByb3ZpZGVycyA9IGFyZy5wcm92aWRlcnMsXG5cdFx0Y3VycmVudExheWVyID0gZmFsc2UsIGN1cnJlbnRPdmVybGF5ID0gZmFsc2U7XG5cblxuXHRMLkNvbnRyb2wuUmVzZXRMYXllcnMgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRvbkFkZDpmdW5jdGlvbigpIHtcblxuXHRcdFx0dGhpcy5fY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2Jyxcblx0XHRcdFx0J2xlYWZsZXQtY29udHJvbC1hZGQtbG9jYXRpb24tbWFya2VyIGxlYWZsZXQtYmFyIGxlYWZsZXQtY29udHJvbCcpO1xuXG5cdFx0XHR0aGlzLl9saW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICdsZWFmbGV0LWJhci1wYXJ0IGxlYWZsZXQtYmFyLXBhcnQtc2luZ2xlJywgdGhpcy5fY29udGFpbmVyKTtcblx0XHRcdC8vdGhpcy5fbGluay50aXRsZSA9IGkxOG4uYWRkX21hcmtlcl9hdF9sb2NhdGlvbjtcblx0XHRcdHRoaXMuX2ljb24gPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgJ2Rhc2hpY29ucyBkYXNoaWNvbnMtaW1hZ2Utcm90YXRlJywgdGhpcy5fbGluayk7XG5cdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pXG5cdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdClcblx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLl9vbkNsaWNrLCB0aGlzKVxuXHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKTtcblxuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0XHR9LFxuXHRcdG9uUmVtb3ZlOmZ1bmN0aW9uKCkge1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uIClcblx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0IClcblx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLl9vbkNsaWNrLCB0aGlzIClcblx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApO1xuXHRcdH0sXG5cdFx0X29uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fbWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikgeyBsYXllci5yZW1vdmUoKSB9ICk7XG5cdFx0fVxuXHR9KVxuXHRcblx0ZnVuY3Rpb24gZ2V0X21hcCgpIHtcblx0XHRyZXR1cm4gJCgnLmxlYWZsZXQtY29udGFpbmVyOmZpcnN0JykuZGF0YSgnYWNmLW9zbS1tYXAnKTtcblx0fTtcblxuXHRmdW5jdGlvbiBpc092ZXJsYXkoIHByb3ZpZGVyX2tleSApIHtcblx0XHR2YXIgcGFydHMgPSBwcm92aWRlcl9rZXkuc3BsaXQoJy4nKSxcblx0XHRcdGNvbmZpZyA9IHByb3ZpZGVyc1twYXJ0cy5zaGlmdCgpXTtcblx0XHRpZiAoIGNvbmZpZy5pc092ZXJsYXkgKSB7XG5cdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHR9XG5cdFx0aWYgKCBwYXJ0cy5sZW5ndGggKSB7XG5cdFx0XHRjb25maWcgPSBjb25maWcudmFyaWFudHNbcGFydHMuc2hpZnQoKV07XG5cdFx0fVxuXG5cdFx0cmV0dXJuICEhIGNvbmZpZy5pc092ZXJsYXk7XG5cdH1cblx0ZnVuY3Rpb24gYWRkTGF5ZXIoIHByb3ZpZGVyX2tleSApIHtcblxuXHRcdHZhciBsYXllciwgbGF5ZXJDb25maWcsIG1hcCA9IGdldF9tYXAoKTtcblx0XHRcblx0XHRsYXllckNvbmZpZyA9IG9wdGlvbnMubGF5ZXJfY29uZmlnWyBwcm92aWRlcl9rZXkuc3BsaXQoJy4nKVswXSBdIHx8IHsgb3B0aW9uczoge30gfTtcblxuXHRcdGxheWVyID0gTC50aWxlTGF5ZXIucHJvdmlkZXIoIHByb3ZpZGVyX2tleSwgbGF5ZXJDb25maWcub3B0aW9ucyApO1xuXHRcdGxheWVyLnByb3ZpZGVyX2tleSA9IHByb3ZpZGVyX2tleTtcblxuXHRcdGlmICggaXNPdmVybGF5KCBwcm92aWRlcl9rZXkgKSApIHtcblxuXHRcdFx0aWYgKCBjdXJyZW50T3ZlcmxheSApIHtcblx0XHRcdFx0Y3VycmVudE92ZXJsYXkucmVtb3ZlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIGN1cnJlbnRPdmVybGF5LnByb3ZpZGVyX2tleSA9PT0gcHJvdmlkZXJfa2V5ICkge1xuXHRcdFx0XHRcdGN1cnJlbnRPdmVybGF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50T3ZlcmxheSA9IGxheWVyO1xuXHRcdFx0Y3VycmVudE92ZXJsYXkuYWRkVG8oIG1hcCApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoIGN1cnJlbnRMYXllciApIHtcblx0XHRcdFx0bWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikgeyBsYXllci5yZW1vdmUoKSB9ICk7XG5cdFx0XHRcdGN1cnJlbnRPdmVybGF5ID0gZmFsc2U7XG5cdFx0XHRcdC8vY3VycmVudExheWVyLnJlbW92ZSgpO1x0XHRcdFx0XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50TGF5ZXIgPSBsYXllcjtcblx0XHRcdGN1cnJlbnRMYXllci5hZGRUbyggbWFwICk7XG5cdFx0XHRpZiAoIGN1cnJlbnRPdmVybGF5ICkge1xuXHRcdFx0XHRjdXJyZW50T3ZlcmxheS5yZW1vdmUoKTtcblx0XHRcdFx0Y3VycmVudE92ZXJsYXkuYWRkVG8oIG1hcCApO1xuXHRcdFx0XHQvLyBpZiB6b29tICYmIGJvdW5kczogbW92ZSBpbnRvIGJvdW5kc1xuXHRcdFx0fVxuXHRcdH1cblxuXHR9O1xuXG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCdyZWFkeScsZnVuY3Rpb24oKXtcblx0XHRcdHZhciBtYXAgPSBnZXRfbWFwKCk7XG5cdFx0XHRtYXAub24oJ2xheWVyYWRkJywgZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0dmFyIGxheWVyID0gZS5sYXllciwgXG5cdFx0XHRcdFx0Y3VycmVudFpvb20sIG5ld1pvb207XG5cdFx0XHRcdGlmICghbWFwLmhhc0xheWVyKGxheWVyKSkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICghIWxheWVyLm9wdGlvbnMuYm91bmRzKSB7XG5cdFx0XHRcdFx0dmFyIGJvdW5kcyA9IEwubGF0TG5nQm91bmRzKGxheWVyLm9wdGlvbnMuYm91bmRzKTtcblx0XHRcdFx0XHRtYXAuZml0Qm91bmRzKGJvdW5kcywge1xuXHRcdFx0XHRcdFx0cGFkZGluZ1RvcExlZnQ6IFswLCAwXSxcblx0XHRcdFx0XHRcdHBhZGRpbmdCb3R0b21SaWdodDogWzAsIDBdXG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvLyBzZXQgem9vbSB0byBjdXJyZW50IHJlc3RyaWN0aW9uc1xuXHRcdFx0XHRjdXJyZW50Wm9vbSA9IG1hcC5nZXRab29tKCk7XG5cdFx0XHRcdG5ld1pvb20gPSBNYXRoLm1heChcblx0XHRcdFx0XHRsYXllci5vcHRpb25zLm1pblpvb20sXG5cdFx0XHRcdFx0TWF0aC5taW4oIGN1cnJlbnRab29tLCBsYXllci5vcHRpb25zLm1heFpvb20gKVxuXHRcdFx0XHQpO1xuXHRcdFx0XHRcblx0XHRcdFx0KCBjdXJyZW50Wm9vbSAhPT0gbmV3Wm9vbSApICYmIG1hcC5zZXRab29tKCBuZXdab29tICk7XG5cdFx0XHR9KTtcblx0XHRcdG5ldyBMLkNvbnRyb2wuUmVzZXRMYXllcnMoe1xuXHRcdFx0XHRwb3NpdGlvbjogJ3RvcHJpZ2h0J1xuXHRcdFx0fSkuYWRkVG8oIG1hcCApO1xuXHRcdH0pXG5cdFx0Lm9uKCdjbGljaycsJy5hY2Ytb3NtLXNldHRpbmdzIFtkYXRhLWxheWVyXScsZnVuY3Rpb24oZSl7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRhZGRMYXllciggJCh0aGlzKS5kYXRhKCdsYXllcicpICk7XG5cdFx0fSlcblx0XHQub24oJ2NoYW5nZScsJy5vc20tZGlzYWJsZVt0eXBlPVwiY2hlY2tib3hcIl0nLGZ1bmN0aW9uKGUpe1xuXHRcdFx0JCh0aGlzKS5jbG9zZXN0KCcuYWNmLW9zbS1zZXR0aW5nJykudG9nZ2xlQ2xhc3MoJ2Rpc2FibGVkJywkKHRoaXMpLnByb3AoJ2NoZWNrZWQnKSlcblx0XHR9KVxuXHQvLyBcblx0Ly8gc2VsZi5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG5cdC8vIFx0aWYgKCAhIGxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHQvLyBcdFx0cmV0dXJuO1xuXHQvLyBcdH1cblx0Ly8gXG5cdC8vIFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuXHQvLyBcdFx0bGF5ZXJzLnB1c2goIGxheWVyLnByb3ZpZGVyS2V5IClcblx0Ly8gXHR9IGVsc2Uge1xuXHQvLyBcdFx0bGF5ZXJzLnVuc2hpZnQoIGxheWVyLnByb3ZpZGVyS2V5IClcblx0Ly8gXHR9XG5cdC8vIH0pO1xuXG59KSggalF1ZXJ5LCBhY2Zfb3NtLCB3aW5kb3cgKTtcbiJdfQ==
