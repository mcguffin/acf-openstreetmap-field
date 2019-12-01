
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1vc20tc2V0dGluZ3MuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2Ytb3NtLXNldHRpbmdzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4oZnVuY3Rpb24oICQsIGFyZywgZXhwb3J0cyApe1xuXHR2YXIgb3B0aW9ucyA9IGFyZy5vcHRpb25zLFxuXHRcdHByb3ZpZGVycyA9IGFyZy5wcm92aWRlcnM7XG5cdHZhciBjdXJyZW50TGF5ZXIgPSBmYWxzZSwgY3VycmVudE92ZXJsYXkgPSBmYWxzZTtcblx0dmFyIGdldF9tYXAgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gJCgnLmxlYWZsZXQtY29udGFpbmVyOmZpcnN0JykuZGF0YSgnYWNmLW9zbS1tYXAnKTtcblx0fTtcblx0ZnVuY3Rpb24gaXNPdmVybGF5KCBwcm92aWRlcl9rZXkgKSB7XG5cdFx0dmFyIHBhcnRzID0gcHJvdmlkZXJfa2V5LnNwbGl0KCcuJyksXG5cdFx0XHRjb25maWcgPSBwcm92aWRlcnNbcGFydHMuc2hpZnQoKV07XG5cdFx0aWYgKCBwYXJ0cy5sZW5ndGggKSB7XG5cdFx0XHRjb25maWcgPSBjb25maWcudmFyaWFudHNbcGFydHMuc2hpZnQoKV07XG5cdFx0fVxuXG5cdFx0cmV0dXJuICEhIGNvbmZpZy5pc092ZXJsYXk7XG5cdH1cblx0ZnVuY3Rpb24gYWRkTGF5ZXIoIHByb3ZpZGVyX2tleSApIHtcblxuXHRcdHZhciBsYXllciwgbGF5ZXJDb25maWcsIG1hcCA9IGdldF9tYXAoKTtcblx0XHRcblx0XHRsYXllckNvbmZpZyA9IG9wdGlvbnMubGF5ZXJfY29uZmlnWyBwcm92aWRlcl9rZXkuc3BsaXQoJy4nKVswXSBdIHx8IHsgb3B0aW9uczoge30gfTtcblxuXHRcdGxheWVyID0gTC50aWxlTGF5ZXIucHJvdmlkZXIoIHByb3ZpZGVyX2tleSwgbGF5ZXJDb25maWcub3B0aW9ucyApO1xuXHRcdGxheWVyLnByb3ZpZGVyX2tleSA9IHByb3ZpZGVyX2tleTtcblxuXHRcdGlmICggaXNPdmVybGF5KCBwcm92aWRlcl9rZXkgKSApIHtcblxuXHRcdFx0aWYgKCBjdXJyZW50T3ZlcmxheSApIHtcblx0XHRcdFx0Y3VycmVudE92ZXJsYXkucmVtb3ZlKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRpZiAoIGN1cnJlbnRPdmVybGF5LnByb3ZpZGVyX2tleSA9PT0gcHJvdmlkZXJfa2V5ICkge1xuXHRcdFx0XHRcdGN1cnJlbnRPdmVybGF5ID0gZmFsc2U7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50T3ZlcmxheSA9IGxheWVyO1xuXHRcdFx0Y3VycmVudE92ZXJsYXkuYWRkVG8oIG1hcCApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoIGN1cnJlbnRMYXllciApIHtcblx0XHRcdFx0bWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikgeyBsYXllci5yZW1vdmUoKSB9ICk7XG5cdFx0XHRcdGN1cnJlbnRPdmVybGF5ID0gZmFsc2U7XG5cdFx0XHRcdC8vY3VycmVudExheWVyLnJlbW92ZSgpO1x0XHRcdFx0XG5cdFx0XHR9XG5cdFx0XHRjdXJyZW50TGF5ZXIgPSBsYXllcjtcblx0XHRcdGN1cnJlbnRMYXllci5hZGRUbyggbWFwICk7XG5cdFx0XHRpZiAoIGN1cnJlbnRPdmVybGF5ICkge1xuXHRcdFx0XHRjdXJyZW50T3ZlcmxheS5yZW1vdmUoKTtcblx0XHRcdFx0Y3VycmVudE92ZXJsYXkuYWRkVG8oIG1hcCApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHR9O1xuXG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCdjbGljaycsJy5hY2Ytb3NtLXNldHRpbmdzIFtkYXRhLWxheWVyXScsZnVuY3Rpb24oZSl7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRhZGRMYXllciggJCh0aGlzKS5kYXRhKCdsYXllcicpICk7XG5cdFx0fSlcblx0Ly8gXG5cdC8vIHNlbGYubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikge1xuXHQvLyBcdGlmICggISBsYXllci5wcm92aWRlcktleSApIHtcblx0Ly8gXHRcdHJldHVybjtcblx0Ly8gXHR9XG5cdC8vIFxuXHQvLyBcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBsYXllci5wcm92aWRlcktleSwgbGF5ZXIgKSApIHtcblx0Ly8gXHRcdGxheWVycy5wdXNoKCBsYXllci5wcm92aWRlcktleSApXG5cdC8vIFx0fSBlbHNlIHtcblx0Ly8gXHRcdGxheWVycy51bnNoaWZ0KCBsYXllci5wcm92aWRlcktleSApXG5cdC8vIFx0fVxuXHQvLyB9KTtcblxufSkoIGpRdWVyeSwgYWNmX29zbSwgd2luZG93ICk7XG4iXX0=
