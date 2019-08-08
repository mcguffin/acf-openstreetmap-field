(function($){
	var is_duplicating = false;
	$(document)
		.on('mousedown','[data-event="duplicate-row"],[data-name="duplicate-layout"]',function(e){
			is_duplicating = true;
			setTimeout(function(){
				is_duplicating = false;
			},10);
		})
		.on('acf-osm-map-create',function(e){
			// don't create map yet ...
			if ( is_duplicating ) {
				e.preventDefault();
			}
		})
		.on('acf_duplicated:open_street_map',function(e) {
			// ... but now!
			var $dest = e.destination;
			// now init!
			setTimeout(function(){
				$.acf_leaflet();				
			},10)
		});

})(jQuery)
