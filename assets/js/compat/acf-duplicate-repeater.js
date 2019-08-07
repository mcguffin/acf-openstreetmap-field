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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1kdXBsaWNhdGUtcmVwZWF0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImNvbXBhdC9hY2YtZHVwbGljYXRlLXJlcGVhdGVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCQpe1xuXG5cdHZhciBpc19kdXBsaWNhdGluZyA9IGZhbHNlO1xuXHRhY2YuYWRkQWN0aW9uKCdiZWZvcmVfZHVwbGljYXRlJywgZnVuY3Rpb24oKXsgXG5cdFx0aXNfZHVwbGljYXRpbmcgPSB0cnVlOyBcblx0fSlcblx0JChkb2N1bWVudClcblx0XHQub24oJ2FjZl9kdXBsaWNhdGVkOm9wZW5fc3RyZWV0X21hcCcsZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyICRkZXN0ID0gZS5kZXN0aW5hdGlvbjtcblx0XHRcdGlzX2R1cGxpY2F0aW5nID0gZmFsc2U7XG5cdFx0XHQvLyBub3cgaW5pdCFcblx0XHRcdCRkZXN0LmZpbmQoJy5sZWFmbGV0LW1hcCcpLmFjZl9sZWFmbGV0KCk7XG5cdFx0fSlcblx0XHQub24oJ2FjZi1vc20tbWFwLWNyZWF0ZScsZnVuY3Rpb24oZSl7XG5cdFx0XHQvLyBkb24ndCBjcmVhdGUgbWFwIHlldCAuLi5cblx0XHRcdGlmICggaXNfZHVwbGljYXRpbmcgKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdH1cblx0XHR9KTtcbn0pKGpRdWVyeSlcbiJdfQ==
