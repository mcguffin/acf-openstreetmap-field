(function($){
	var options = acf_osm.options;
	console.log('input js')

	var osm = {
	};
	osm.field = Backbone.View.extend({
		$map: null,
		$zoom: null,
		$lat: null,
		$lng: null,
		$address: null,
		$tiles: null,
		marker: null,
		icon:null,
		map: null,
		layers:[],
		events:{
			'keyup [data-prop="address"]' : 'search',
			'focus [data-prop="address"]' : 'search',

			'click .osm-result'	: 'click_result',
			'keyup .osm-result'	: 'keyup_result',
			'focus .osm-result'	: 'focus_result',
		},
		initialize:function() {
		//	this.$el		= this.attributes.$el;
			this.$map		= this.$el.find('.acf-osm-map');
			this.$zoom		= this.$el.find('[data-prop="zoom"]');
			this.$lat		= this.$el.find('[data-prop="center_lat"]');
			this.$lng		= this.$el.find('[data-prop="center_lng"]');
			this.$layers	= this.$el.find('[data-prop="leaflet_layers"]');
			this.$address	= this.$el.find('[data-prop="address"]');
			this.$results	= this.$address.next('.osm-results');
			this.icon		= L.divIcon( { className: 'osm-marker', html:'', iconSize:0 } );
			this.map		= L.map( this.$map.get(0), {
				scrollWheelZoom: false,
				center: [ this.$lat.val(), this.$lng.val() ],
				zoom: this.$zoom.val()
			} );
			this.marker		= L.marker(
				[ this.$lat.val(), this.$lng.val() ],
				{
					icon:this.icon,
					title:this.$address.val()
				}
			).addTo(this.map);

			this.layers	= [];
			if ( this.$layers.is('select') ) {
				acf.select2.init( this.$layers, {
					multiple: true,
					ui: true,
					allow_null: false,
					ajax:false,
				}, this.$el );
			}

			this.bind_events();

			this.update_layers();
		},
		bind_events: function() {
			var self = this;

//			this.listenTo( this.$address, 'keyup focus', this.search );

			this.listenTo( this.$tiles, 'change', this.update_layers );

			this.map.on('zoomend', function(e){ self.map_zoomed.apply(self,[e]); } );
			this.map.on('moveend', function(e){ self.map_moved.apply(self,[e]); }  );
			this.map.on('click',   function(e){ self.map_clicked.apply(self,[e]); } );

			// this.$tiles.on('change', do_layers )
			// 	.prev('input').on('change', do_layers );

		},

		map_moved:function(e){
			var center = this.map.getCenter();
			this.$lat.val(center.lat);
			this.$lng.val(center.lng);
		},
		map_zoomed:function(e){
			this.$zoom.val( this.map.getZoom() );
		},
		map_clicked:function(e){
			var coord = e.latlng;

			this.fetch_results('https://photon.komoot.de/reverse', {
				lon:coord.lng,
				lat:coord.lat,
			}, function(response){
				var i=0,len=response.features.length,fmt;
				for (i;i<len;i++){
					fmt = this.format_result( response.features[i] );
					this.marker.title = fmt;
					/*
					this.set_marker( L.latLng( response.features[i].geometry.coordinates[1], response.features[i].geometry.coordinates[0] )  );
					/*/
					this.set_marker( coord );
					//*/
					break;
				}
			} );
			this.set_marker( e.latlng );
		},
		set_marker:function(coord){

			$(this.marker._icon).attr( 'title', this.marker.title );
			this.marker.setLatLng(coord);
		},

		update_layers: function(){
			var val = [],
				provider, layer_config, i, len;

			if ( null === val ) {
				return;
			}
			this.$layers.each(function(){
				var v = $(this).val();
				if ( Array.isArray(val) ) {
					val = val.concat(v)
				} else {
					val.push(v)
				}

			});

			// remove layers
			while ( this.layers.length ) {
				this.map.removeLayer( this.layers.pop() );
			}

			len = val.length;

			for ( i=0;i<len;i++ ) {
				provider = val[i];
				layer_config = options.layer_config[ provider.split('.')[0] ] || {};
				this.layers.push( L.tileLayer.provider( provider, layer_config ).addTo(this.map) );
			}
		},
		search:function(e){
			var self = this,
				data = {};
			if ( 'undefined' !== typeof this._wait_address ) {
				clearTimeout(this._wait_address);
				delete this._wait_address;
			}

			if (!! data['g'] && data['g'] === this.$address.val() ) {
				return;
			}

			if ( 27 == e.originalEvent.keyCode ) { // esc
				e.preventDefault();
				this.$results.html('');
				this.$address.blur();
				return false;
			}
			this._wait_address = setTimeout( function(){
				data = {
					q:self.$address.val(),
//						lang:'de', -´// -> WP-Lang!
					limit:5,
					lon:self.$lng.val(),
					lat:self.$lat.val(),
				};
				self.fetch_results('https://photon.komoot.de/api/',data, function(response){
					delete this._wait_address;
				});
			}, 666 );

		},
		clear_results:function(){
			this.$results.html('');
		},
		build_results:function(response){
			var self = this,
				i=0, len = response.features.length,
				q = this.$address.val(),
				feat = response.features;//sort_fuzzy( response.features, q );

			this.clear_results();

			if ( len ) {
				$.each( feat, function(i,el){
					var $res = $('<div tabindex="'+i+'" class="osm-result"></div>'),
						// coord = el.geometry.coordinates,
						// ext = el.properties.extent,
						fmt = self.format_result( el ),
						html = fmt.replace( new RegExp("("+q.split(/[^a-z0-9]/).join('|')+")",'gi'),"<strong>$1</strong>");
					html += '<br /><small>(' + self.nice_words( el.properties.osm_value ) + ')</small>';

					$res.data({
						text:fmt,
						bounds:el.properties.extent,
						coord:el.geometry.coordinates,
					}).html( html ).appendTo(self.$results);
				});
			}

		},
		fetch_results: function(url,data, callback) {
			var self = this;
			$.ajax({
				url:url,
				method:'get',
				data:data,
				success:function(response) {
					self.build_results(response);
					'function' === typeof callback && callback.apply(self,[response]);
				}
			});

		},

		click_result:function(e){
			var data = $(e.target).data(),
				latlng = L.latLng( data.coord[1], data.coord[0] );

			if ( data.ext ) {

				this.map.fitBounds( L.latLngBounds(
					L.latLng( data.ext[1], data.ext[0] ),
					L.latLng( data.ext[3], data.ext[2] )
				) );
			} else {
				this.map.setView( latlng, this.map.getZoom() );
			}
			this.$address.val( data.text );
			this.clear_results();

			this.marker.title = data.text;
			this.set_marker( latlng );
		},

		keyup_result:function(e){
			if (e.originalEvent.keyCode == 40) { // down
				$( e.target ).next('.osm-result').focus();
				e.preventDefault()
			} else if (e.originalEvent.keyCode == 38) {
				$( e.target ).prev('.osm-result').focus();
				e.preventDefault()
			}

		},
		focus_result:function(e){
			var data = $(e.target).data();

			if ( data.ext ) {
				this.map.fitBounds( L.latLngBounds(
					L.latLng( data.ext[1], data.ext[0] ),
					L.latLng( data.ext[3], data.ext[2] )
				) );
			} else {
				this.map.setView( L.latLng( data.coord[1], data.coord[0] ), this.map.getZoom() );
			}

		},

		format_result: function( hit ) {
			return this.get_result_words( hit ).join(', ');
		},

		get_result_words: function( hit ) {

			var h = [],
				props = [ 'name','street','housenumber','city','postcode','state','country' ];
			$.each(props, function(i,prop) {
				try {
					if ( !! hit.properties[prop] ) {
						h.push(hit.properties[prop]);
					}
				} catch(err){}
			});
			return Array.from(new Set(h));
		},
		nice_words: function(str) {
			return str.split(/[\s_]/).map(function(s){ return s[0].toUpperCase() + s.substring(1); }).join(' ');
		}

	});


	if( typeof acf.add_action !== 'undefined' ) {

		/*
		*  ready append (ACF5)
		*
		*  These are 2 events which are fired during the page load
		*  ready = on page load similar to $(document).ready()
		*  append = on new DOM elements appended via repeater field
		*
		*  @type	event
		*  @date	20/07/13
		*
		*  @param	$el (jQuery selection) the jQuery element which contains the ACF fields
		*  @return	n/a
		*/

		acf.add_action('ready append', function( $el ){

			// search $el for fields of type 'FIELD_NAME'
			acf.get_fields({ type : 'open_street_map'}, $el).each(function(){

				new osm.field( { el: this } );

			});

		});

	} else {


		/*
		*  acf/setup_fields (ACF4)
		*
		*  This event is triggered when ACF adds any new elements to the DOM.
		*
		*  @type	function
		*  @since	1.0.0
		*  @date	01/01/12
		*
		*  @param	event		e: an event object. This can be ignored
		*  @param	Element		postbox: An element which contains the new HTML
		*
		*  @return	n/a
		*/

		$(document).on('acf/setup_fields', function(e, postbox){

			$(postbox).find('.field[data-field_type="open_street_map"]').each(function(){

				new osm.field( { el: this } );

			});

		});


	}


})(jQuery);
