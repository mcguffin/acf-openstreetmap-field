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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1kdXBsaWNhdGUtcmVwZWF0ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJjb21wYXQvYWNmLWR1cGxpY2F0ZS1yZXBlYXRlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigkKXtcblx0dmFyIGlzX2R1cGxpY2F0aW5nID0gZmFsc2U7XG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCdtb3VzZWRvd24nLCdbZGF0YS1ldmVudD1cImR1cGxpY2F0ZS1yb3dcIl0sW2RhdGEtbmFtZT1cImR1cGxpY2F0ZS1sYXlvdXRcIl0nLGZ1bmN0aW9uKGUpe1xuXHRcdFx0aXNfZHVwbGljYXRpbmcgPSB0cnVlO1xuXHRcdFx0c2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRpc19kdXBsaWNhdGluZyA9IGZhbHNlO1xuXHRcdFx0fSwxMCk7XG5cdFx0fSlcblx0XHQub24oJ2FjZi1vc20tbWFwLWNyZWF0ZScsZnVuY3Rpb24oZSl7XG5cdFx0XHQvLyBkb24ndCBjcmVhdGUgbWFwIHlldCAuLi5cblx0XHRcdGlmICggaXNfZHVwbGljYXRpbmcgKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5vbignYWNmX2R1cGxpY2F0ZWQ6b3Blbl9zdHJlZXRfbWFwJyxmdW5jdGlvbihlKSB7XG5cdFx0XHQvLyAuLi4gYnV0IG5vdyFcblx0XHRcdHZhciAkZGVzdCA9IGUuZGVzdGluYXRpb247XG5cdFx0XHQvLyBub3cgaW5pdCFcblx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0JC5hY2ZfbGVhZmxldCgpO1x0XHRcdFx0XG5cdFx0XHR9LDEwKVxuXHRcdH0pO1xuXG59KShqUXVlcnkpXG4iXX0=
