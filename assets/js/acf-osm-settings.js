
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
	
	$(document).on('acf-osm-map-init',function(e){
		var map = e.detail.map
		
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

			var layer, layerConfig;
			
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
		$(document)
			.on('click','.acf-osm-settings [data-layer]',function(e){
				e.preventDefault();
				addLayer( $(this).data('layer') );
			})
			.on('change','.osm-disable[type="checkbox"]',function(e){
				$(this).closest('.acf-osm-setting').toggleClass('disabled',$(this).prop('checked'))
			})
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1vc20tc2V0dGluZ3MuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2Ytb3NtLXNldHRpbmdzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4oZnVuY3Rpb24oICQsIGFyZywgZXhwb3J0cyApe1xuXHR2YXIgb3B0aW9ucyA9IGFyZy5vcHRpb25zLFxuXHRcdHByb3ZpZGVycyA9IGFyZy5wcm92aWRlcnMsXG5cdFx0Y3VycmVudExheWVyID0gZmFsc2UsIGN1cnJlbnRPdmVybGF5ID0gZmFsc2U7XG5cblxuXHRMLkNvbnRyb2wuUmVzZXRMYXllcnMgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRvbkFkZDpmdW5jdGlvbigpIHtcblxuXHRcdFx0dGhpcy5fY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2Jyxcblx0XHRcdFx0J2xlYWZsZXQtY29udHJvbC1hZGQtbG9jYXRpb24tbWFya2VyIGxlYWZsZXQtYmFyIGxlYWZsZXQtY29udHJvbCcpO1xuXG5cdFx0XHR0aGlzLl9saW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICdsZWFmbGV0LWJhci1wYXJ0IGxlYWZsZXQtYmFyLXBhcnQtc2luZ2xlJywgdGhpcy5fY29udGFpbmVyKTtcblx0XHRcdC8vdGhpcy5fbGluay50aXRsZSA9IGkxOG4uYWRkX21hcmtlcl9hdF9sb2NhdGlvbjtcblx0XHRcdHRoaXMuX2ljb24gPSBMLkRvbVV0aWwuY3JlYXRlKCdzcGFuJywgJ2Rhc2hpY29ucyBkYXNoaWNvbnMtaW1hZ2Utcm90YXRlJywgdGhpcy5fbGluayk7XG5cdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pXG5cdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdClcblx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLl9vbkNsaWNrLCB0aGlzKVxuXHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKTtcblxuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0XHR9LFxuXHRcdG9uUmVtb3ZlOmZ1bmN0aW9uKCkge1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uIClcblx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0IClcblx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLl9vbkNsaWNrLCB0aGlzIClcblx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnZGJsY2xpY2snLCBMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbiApO1xuXHRcdH0sXG5cdFx0X29uQ2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5fbWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikgeyBsYXllci5yZW1vdmUoKSB9ICk7XG5cdFx0fVxuXHR9KVxuXHRcblx0JChkb2N1bWVudCkub24oJ2FjZi1vc20tbWFwLWluaXQnLGZ1bmN0aW9uKGUpe1xuXHRcdHZhciBtYXAgPSBlLmRldGFpbC5tYXBcblx0XHRcblx0XHRmdW5jdGlvbiBpc092ZXJsYXkoIHByb3ZpZGVyX2tleSApIHtcblx0XHRcdHZhciBwYXJ0cyA9IHByb3ZpZGVyX2tleS5zcGxpdCgnLicpLFxuXHRcdFx0XHRjb25maWcgPSBwcm92aWRlcnNbcGFydHMuc2hpZnQoKV07XG5cdFx0XHRpZiAoIGNvbmZpZy5pc092ZXJsYXkgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBwYXJ0cy5sZW5ndGggKSB7XG5cdFx0XHRcdGNvbmZpZyA9IGNvbmZpZy52YXJpYW50c1twYXJ0cy5zaGlmdCgpXTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuICEhIGNvbmZpZy5pc092ZXJsYXk7XG5cdFx0fVxuXHRcdGZ1bmN0aW9uIGFkZExheWVyKCBwcm92aWRlcl9rZXkgKSB7XG5cblx0XHRcdHZhciBsYXllciwgbGF5ZXJDb25maWc7XG5cdFx0XHRcblx0XHRcdGxheWVyQ29uZmlnID0gb3B0aW9ucy5sYXllcl9jb25maWdbIHByb3ZpZGVyX2tleS5zcGxpdCgnLicpWzBdIF0gfHwgeyBvcHRpb25zOiB7fSB9O1xuXG5cdFx0XHRsYXllciA9IEwudGlsZUxheWVyLnByb3ZpZGVyKCBwcm92aWRlcl9rZXksIGxheWVyQ29uZmlnLm9wdGlvbnMgKTtcblx0XHRcdGxheWVyLnByb3ZpZGVyX2tleSA9IHByb3ZpZGVyX2tleTtcblxuXHRcdFx0aWYgKCBpc092ZXJsYXkoIHByb3ZpZGVyX2tleSApICkge1xuXG5cdFx0XHRcdGlmICggY3VycmVudE92ZXJsYXkgKSB7XG5cdFx0XHRcdFx0Y3VycmVudE92ZXJsYXkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XG5cdFx0XHRcdFx0aWYgKCBjdXJyZW50T3ZlcmxheS5wcm92aWRlcl9rZXkgPT09IHByb3ZpZGVyX2tleSApIHtcblx0XHRcdFx0XHRcdGN1cnJlbnRPdmVybGF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdGN1cnJlbnRPdmVybGF5ID0gbGF5ZXI7XG5cdFx0XHRcdGN1cnJlbnRPdmVybGF5LmFkZFRvKCBtYXAgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGlmICggY3VycmVudExheWVyICkge1xuXHRcdFx0XHRcdG1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHsgbGF5ZXIucmVtb3ZlKCkgfSApO1xuXHRcdFx0XHRcdGN1cnJlbnRPdmVybGF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0Ly9jdXJyZW50TGF5ZXIucmVtb3ZlKCk7XHRcdFx0XHRcblx0XHRcdFx0fVxuXHRcdFx0XHRjdXJyZW50TGF5ZXIgPSBsYXllcjtcblxuXHRcdFx0XHRjdXJyZW50TGF5ZXIuYWRkVG8oIG1hcCApO1xuXG5cdFx0XHRcdGlmICggY3VycmVudE92ZXJsYXkgKSB7XG5cdFx0XHRcdFx0Y3VycmVudE92ZXJsYXkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0Y3VycmVudE92ZXJsYXkuYWRkVG8oIG1hcCApO1xuXHRcdFx0XHRcdC8vIGlmIHpvb20gJiYgYm91bmRzOiBtb3ZlIGludG8gYm91bmRzXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH07XG5cdFx0bWFwLm9uKCdsYXllcmFkZCcsIGZ1bmN0aW9uIChlKSB7XG5cdFx0XHR2YXIgbGF5ZXIgPSBlLmxheWVyLCBcblx0XHRcdFx0Y3VycmVudFpvb20sIG5ld1pvb207XG5cblx0XHRcdGlmICghbWFwLmhhc0xheWVyKGxheWVyKSkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmICghIWxheWVyLm9wdGlvbnMuYm91bmRzKSB7XG5cdFx0XHRcdHZhciBib3VuZHMgPSBMLmxhdExuZ0JvdW5kcyhsYXllci5vcHRpb25zLmJvdW5kcyk7XG5cdFx0XHRcdG1hcC5maXRCb3VuZHMoYm91bmRzLCB7XG5cdFx0XHRcdFx0cGFkZGluZ1RvcExlZnQ6IFswLCAwXSxcblx0XHRcdFx0XHRwYWRkaW5nQm90dG9tUmlnaHQ6IFswLCAwXVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc2V0IHpvb20gdG8gY3VycmVudCByZXN0cmljdGlvbnNcblx0XHRcdGN1cnJlbnRab29tID0gbWFwLmdldFpvb20oKTtcblx0XHRcdG5ld1pvb20gPSBNYXRoLm1heChcblx0XHRcdFx0bGF5ZXIub3B0aW9ucy5taW5ab29tLFxuXHRcdFx0XHRNYXRoLm1pbiggY3VycmVudFpvb20sIGxheWVyLm9wdGlvbnMubWF4Wm9vbSApXG5cdFx0XHQpO1xuXG5cdFx0XHQoIGN1cnJlbnRab29tICE9PSBuZXdab29tICkgJiYgbWFwLnNldFpvb20oIG5ld1pvb20gKTtcblx0XHR9KTtcblx0XHRuZXcgTC5Db250cm9sLlJlc2V0TGF5ZXJzKHtcblx0XHRcdHBvc2l0aW9uOiAndG9wcmlnaHQnXG5cdFx0fSkuYWRkVG8oIG1hcCApO1xuXHRcdCQoZG9jdW1lbnQpXG5cdFx0XHQub24oJ2NsaWNrJywnLmFjZi1vc20tc2V0dGluZ3MgW2RhdGEtbGF5ZXJdJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRhZGRMYXllciggJCh0aGlzKS5kYXRhKCdsYXllcicpICk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdjaGFuZ2UnLCcub3NtLWRpc2FibGVbdHlwZT1cImNoZWNrYm94XCJdJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0JCh0aGlzKS5jbG9zZXN0KCcuYWNmLW9zbS1zZXR0aW5nJykudG9nZ2xlQ2xhc3MoJ2Rpc2FibGVkJywkKHRoaXMpLnByb3AoJ2NoZWNrZWQnKSlcblx0XHRcdH0pXG5cdH0pXG5cdFxuXHQvLyBcblx0Ly8gc2VsZi5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG5cdC8vIFx0aWYgKCAhIGxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHQvLyBcdFx0cmV0dXJuO1xuXHQvLyBcdH1cblx0Ly8gXG5cdC8vIFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuXHQvLyBcdFx0bGF5ZXJzLnB1c2goIGxheWVyLnByb3ZpZGVyS2V5IClcblx0Ly8gXHR9IGVsc2Uge1xuXHQvLyBcdFx0bGF5ZXJzLnVuc2hpZnQoIGxheWVyLnByb3ZpZGVyS2V5IClcblx0Ly8gXHR9XG5cdC8vIH0pO1xuXG59KSggalF1ZXJ5LCBhY2Zfb3NtLCB3aW5kb3cgKTtcbiJdfQ==
