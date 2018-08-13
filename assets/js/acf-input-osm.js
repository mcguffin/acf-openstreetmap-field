(function( $, arg ){
	var options = arg.options,
		result_tpl = '<div tabindex="<%= data.i %>" class="osm-result">'
			+ '<%= data.result_text %>'
			+ '<br /><small><%= data.properties.osm_value %></small>'
			+ '</div>';

	var osm = {
	};

	osm.field = Backbone.View.extend({
		/*
		todo:
		- Map Layer selector
		- set / unset marker
		*/
		map: null,
		geocoder: null,
		visible: null,
		events:{
		},

		$parent:function(){
			return this.$el.closest('.acf-field-settings,.acf-field-open-street-map')
		},
		$zoom : function() {
			return this.$parent().find('input[id$="-zoom"]');
		},
		$lat : function() {
			return this.$parent().find('input[id$="-center_lat"]');
		},
		$lng : function() {
			return this.$parent().find('input[id$="-center_lng"]');
		},
		$layerStore: function() {
			return this.$parent().find('input[id$="-leaflet_layers"]');
		},
		$address: function() {
			return this.$parent().find('input[id$="-address"]');
		},
		$mlat : function() {
			return this.$parent().find('input[id$="-marker_lat"]');
		},
		$mlng : function() {
			return this.$parent().find('input[id$="-marker_lng"]');
		},
		$results : function() {
			return this.$parent().find('.osm-results');
		},
		initialize:function(conf) {
		//	this.$el		= this.attributes.$el;

			this.map		= conf.map;

			// this.$mlat		= this.$parent.find('[data-prop="marker_lat"]');
			// this.$mlng		= this.$parent.find('[data-prop="marker_lng"]');
			// this.$address	= this.$parent.find('[data-prop="address"]');
			// this.$results	= this.$address.next('.osm-results');

			//this.$layers	= this.$parent.find('input[id$="-leaflet_layers"]');


			this.update_map(); // set map to input values

			this.init_layers();

			if ( this.$mlat().length && this.$mlng().length ) {
				this.init_marker();
			}

			this.init_geocode();

			this.init_acf();

			this.update_visible();
		},
		init_marker:function() {
			var self = this,
				mlat = this.$mlat().val() || this.$lat().val(),
				mlng = this.$mlng().val() || this.$lng().val();
			/*
			Events:
			click  map: reverse geocode an set result
			change query: geocode query, add/set marker
			*/
			this.icon		= L.divIcon( { className: 'osm-marker', html:'', iconSize:0 } );
			this.marker		= L.marker(
				[ mlat, mlng ],
				{
					icon:this.icon,
					draggable:true,
					title: this.$address().val() || '',
				}
			).addTo( this.map );

			this.map.on('click', function(e){ self.map_clicked.apply(self,[e]); } );

		},
		map_clicked:function(e) {
			var coord = e.latlng;
			this.set_marker( e.latlng );

		},
		set_marker:function(coord){
			$(this.marker._icon).attr( 'title', this.marker.title );
			this.marker.setLatLng(coord);
			this.$mlat().val( coord.lat );
			this.$mlng().val( coord.lng );
//			this.marker.bindTooltip(this.$address().val());
		},
		init_layers:function() {
			var self = this,
				selectedLayers,
				baseLayers = {},
				overlays = {},
				is_overlay = function( key, layer ) {

					var patterns;

					if ( layer.options.opacity && layer.options.opacity < 1 ) {
						return true;
					}
					patterns = ['^(OpenWeatherMap|OpenSeaMap)',
						'OpenMapSurfer.AdminBounds',
						'Stamen.Toner(Hybrid|Lines|Labels)',
						'Acetate.(foreground|labels|roads)',
						'HillShading',
						'Hydda.RoadsAndLabels',
						'^JusticeMap',
						'OpenInfraMap.(Power|Telecom|Petroleum|Water)',
						'OpenPtMap',
						'OpenRailwayMap',
						'OpenFireMap',
						'SafeCast',
						'CartoDB.DarkMatterOnlyLabels',
						'CartoDB.PositronOnlyLabels'
					];
					return key.match('(' + patterns.join('|') + ')') !== null;
				},
				is_omitted = function(key) {

					return key === null;
				},
				setupMap = function( key, val ){
					var layer, layer_config;
					if ( _.isObject(val) ) {
						return $.each( val, setupMap );
					}

					if ( is_omitted(key) ) {
						return;
					}

					layer_config = options.layer_config[ key.split('.')[0] ] || {options:{}};
					layer = L.tileLayer.provider( key, layer_config.options );
					layer.providerKey = key;

					if ( is_overlay( key, layer ) ) {
						overlays[key] = layer;
					} else {
						baseLayers[key] = layer;
					}
					if ( selectedLayers.indexOf( key ) !== -1 ){
						self.map.addLayer(layer);
					}
				};

			selectedLayers = this.$el.data().mapLayers;

			// kill all the old layers...
			this.map.eachLayer(function(layer){
				self.map.removeLayer(layer);
			})
			// ... and add new ones
			$.each( options.providers, setupMap );

			// ... no layer editing allowed
			if ( ! this.$layerStore().length ) {
				return;
			}

			this.layersControl = L.control.layers( baseLayers, overlays, {
				collapsed: true,
				hideSingleBase: true,
			}).addTo(this.map);

		},
		init_geocode:function() {
			this.geocoder = L.Control.geocoder({
				collapsed: false,
				position:'topleft',
				placeholder:'Search...',
				errorMessage:'Nothing found...',
				showResultIcons:true,
				suggestMinLength:3,
				suggestTimeout:250,
				queryMinLength:3,
			}).addTo(this.map);
		},
		update_visible: function() {

			if ( this.visible === this.$el.is(':visible') ) {
				return this;
			}

			this.visible = this.$el.is(':visible');

			if ( this.visible ) {
				this.map.invalidateSize();
				this.bind_events();
				return this;
			}
			this.unbind_events();
			return this;
		},
		init_acf: function() {
			var self = this,
				toggle_cb = function() {
					// no change
					self.update_visible();
				};

			// expand/collapse acf setting
			acf.addAction( 'show', toggle_cb );
			acf.addAction( 'hide', toggle_cb );



			// expand acf repeater
			// ...

			// expand acf layout
			// ...

			// expand wp metabox
			$(document).on('postbox-toggled',toggle_cb)


			this.map.on('zoomend', function(e){ self.map_zoomed.apply( self, [e] ); } );
			this.map.on('moveend', function(e){ self.map_moved.apply( self, [e] ); } );

			this.map.on( 'baselayerchange overlayadd overlayremove layeradd layerremove', function(e){
				var layers = [];
				self.map.eachLayer(function(layer) {
					layers.push(layer.providerKey);
				});
				self.$layerStore().val( JSON.stringify( layers ) );
			} );
		},
		unbind_events:function() {
			var self = this;
			self.$lat().off('blur');
			self.$lng().off('blur');
			self.$zoom().off('blur');
			self.$zoom().off('keyup focus');

		},
		bind_events: function() {
			var self = this;

			self.$lat().on('blur',function(e){
				self.update_map();
			});
			self.$lng().on('blur',function(e){
				self.update_map();
			});
			self.$zoom().on('blur',function(e){
				self.update_map();
			});
			// self.$address().on('keyup focus', function(e){
			// 	self.search(e);
			// } );


//			this.listenTo( this.$address, 'keyup focus', this.search );

			// this.$tiles.on('change', do_layers )
			// 	.prev('input').on('change', do_layers );

		},
		update_map:function() {
			if ( ! this.$lat().val() || ! this.$lng().val() ) {
				return;
			}
			var latlng = L.latLng( this.$lat().val(), this.$lng().val() );
			this.map.setView( latlng,  this.$zoom().val() );
		},
		map_moved:function(e){
			var center = this.map.getCenter();
			this.$lat().val(center.lat);
			this.$lng().val(center.lng);
		},
		map_zoomed:function(e){
			this.$zoom().val( this.map.getZoom() );
		},

		search:function(e){
			// geocode
			var self = this,
				data = {};
			if ( 'undefined' !== typeof this._wait_address ) {
				clearTimeout(this._wait_address);
				delete this._wait_address;
			}

			// if (!! data['g'] && data['g'] === this.$address().val() ) {
			// 	return;
			// }

			this.clear_results();

			if ( e.type=='keyup' && 27 == e.originalEvent.keyCode ) { // esc
				e.preventDefault();
				this.$results().html('');
				this.$address().blur();
				return false;
			}
			if ( '' === this.$address().val() ) {
				this.marker.title = '';
				return;
			}

			this._wait_address = setTimeout( function(){

				data = {
					q:self.$address().val(),
//						lang:'de', -´// -> WP-Lang!
					limit:5,
					lon:self.$lng().val(),
					lat:self.$lat().val(),
				};

				self.ajax_get('https://photon.komoot.de/api/',data, function(response){
					self.build_results(response);
					delete this._wait_address;
				});
			}, 666 );

		},

		select_result:function(data){
			var latlng = L.latLng( data.coord[1], data.coord[0] );

			if ( data.ext ) {

				this.map.fitBounds( L.latLngBounds(
					L.latLng( data.ext[1], data.ext[0] ),
					L.latLng( data.ext[3], data.ext[2] )
				) );
			} else {
				this.map.setView( latlng, this.map.getZoom() );
			}
			this.$address().val( data.text );
			this.clear_results();

			this.marker.title = data.text;
			this.set_marker( latlng );
		},
		build_results:function(response){
			var self = this,
				i=0, len = response.features.length,
				q = this.$address().val(),
				feat = response.features;//sort_fuzzy( response.features, q );

			this.clear_results();

			if ( len ) {
				$.each( feat, function(i,el){
					var fmt = self.format_result( el ),
						html = fmt.replace( new RegExp("("+q.split(/[^a-z0-9]/).join('|')+")",'gi'),"<strong>$1</strong>");
					html += '<br /><small>(' + self.nice_words( el.properties.osm_value ) + ')</small>';

					$('<div tabindex="'+i+'" class="osm-result"></div>')
						.html( html ).appendTo( self.$results() ).on('click',function(e){
						self.select_result({
							text:fmt,
							bounds:el.properties.extent,
							coord:el.geometry.coordinates,
						});
					});
				});
			}

		},
		clear_results:function(){
			this.$results().html('');
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
		},
		// map_clicked:function(e){
		// 	// reverse geocode
		// 	var coord = e.latlng;
		//
		// 	this.ajax_get('https://photon.komoot.de/reverse', {
		// 		lon:coord.lng,
		// 		lat:coord.lat,
		// 	}, function(response){
		// 		var i=0,
		// 			len = response.features.length;
		// 		console.log(response)
		// 		for (i;i<len;i++){
		// 			var result = new osm.feature( response.features[i] );
		// 			this.marker.title = result.format();
		// 			this.$address().val( result.format() );
		// 			this.set_marker( coord );
		// 			break;
		// 		}
		// 	} );
		//
		// 	this.set_marker( e.latlng );
		// },
		// set_marker:function(coord){
		// 	$(this.marker._icon).attr( 'title', this.marker.title );
		// 	this.marker.setLatLng(coord);
		// 	this.$mlat().val( coord.lat );
		// 	this.$mlng().val( coord.lng );
		// },
		ajax_get: function( url, data, callback) {
			var self = this;
			$.ajax({
				url:url,
				method:'get',
				data:data,
				success:function(response) {
					'function' === typeof callback && callback.apply(self,[response]);
				}
			});

		},

	});

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
	$(document).on('render-map',function( e, map ) {
		new osm.field( { el: e.target, map: map } );
	});


	// acf.add_action('ready append', function( $el ){
	//
	// 	// search $el for fields of type 'FIELD_NAME'
	// 	acf.get_fields({ type : 'open_street_map'}, $el).each(function(){
	//
	// 		new osm.field( { el: this } );
	//
	// 	});
	//
	// });


})( jQuery, acf_osm_admin );
