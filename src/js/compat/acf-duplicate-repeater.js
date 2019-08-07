(function($){

	var is_duplicating = false;
	acf.addAction('before_duplicate', function(){ 
		is_duplicating = true; 
	})
	$(document)
		.on('acf_duplicated:open_street_map',function(e) {
			var $dest = e.destination;
			is_duplicating = false;
			// now init!
			$dest.find('.leaflet-map').acf_leaflet();
		})
		.on('acf-osm-map-create',function(e){
			// don't create map yet ...
			if ( is_duplicating ) {
				e.preventDefault();
			}
		});
})(jQuery)
