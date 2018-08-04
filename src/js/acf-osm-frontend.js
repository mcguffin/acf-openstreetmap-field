(function($){
	$('[data-map="leaflet"]').each(function(i,el){
		var data = $(this).data();
		$(this).height(data.height);

		var map = L.map( this, {
			scrollWheelZoom: false,
			center: [ data.mapLat, data.mapLng ],
			zoom: data.mapZoom
		} );
		$.each(data.mapLayers.split(','),function(i,provider){
			L.tileLayer.provider( provider, {} ).addTo( map );
		});

		if ( !! data.markerLabel ) {
			L.marker(
				[ data.markerLat, data.markerLng ],
				{
//					icon:this.icon,
					title:data.markerLabel
				}
			).addTo( map );
		}
	});
})(jQuery);
