(function( $, arg ){
	var options = arg.options;
	$.fn.extend({
		acf_leaflet:function() {

			return this.each(function(i,el){
				if ( $(this).data( 'acf-osm-map' ) ) {
					return;
				}
				var data = $(this).data();

				$(this).height(data.height);

				var map = L.map( this, {
					scrollWheelZoom: false,
					center: [ data.mapLat, data.mapLng ],
					zoom: data.mapZoom
				} );
				$.each(data.mapLayers,function(i,provider){
					if ( 'String' !== typeof provider ) {
						return;
					}
					var layer_config = options.layer_config[ provider.split('.')[0] ] || { options: {} };
					L.tileLayer.provider( provider, layer_config.options ).addTo( map );
				});

				if ( !! data.markerLabel ) {
					L.marker(
						[ data.markerLat, data.markerLng ],
						{
							title:data.markerLabel
						}
					).addTo( map );
				}
				$(this).data( 'acf-osm-map', map );
				$(this).trigger('render-map', map);
			});
		}
	});
	$.extend({
		acf_leaflet:function() {
			$('[data-map="leaflet"]').acf_leaflet();
		}
	});
	$.acf_leaflet();

})(jQuery,acf_osm);
