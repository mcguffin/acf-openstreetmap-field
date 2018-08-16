(function( $, arg ){
	var options = arg.options,
		result_tpl = '<div tabindex="<%= data.i %>" class="osm-result">'
			+ '<%= data.result_text %>'
			+ '<br /><small><%= data.properties.osm_value %></small>'
			+ '</div>';

	var osm = {
	};

	osm.MarkerList = Backbone.View.extend({
	})
	osm.MarkerEntry = Backbone.View.extend({
		tagName: 'div',
		className:'osm-marker',
		default_state: true,
		events: {
			'click [data-name="locate-marker"]' : 'locate_marker',
			'click [data-name="remove-marker"]' : 'remove_marker',
			'change [type="text"]' 				: 'set_default_state',
		},
		is_default_label: function(){
			var default_val = this.$el.find('[id$="-marker-default-label"]').val();
			return ( ! default_val ) || ( this.$el.find('[id$="-marker-label"]').val() === default_val );
		},
		initialize:function(opt){
			var self = this;
			this.template = opt.template;
			this.marker = opt.marker;

			return this;
		},
		render:function(){
			this.$el.html( this.template( this ) );
			return this;
		},
		update_marker:function( latlng, label ) {

			if ( this.is_default_label() ) {
				// update marker labels
				this.marker.unbindTooltip();
				this.marker.bindTooltip(label);

				this.marker.options.title = label;
				$( this.marker._icon ).attr( 'title', label );

				// update marker label input
				this.$el.find('[id$="-marker-label"]').val( this.marker.options.title );
			}

			this.$el.find('[id$="-marker-lat"]').val( latlng.lat );
			this.$el.find('[id$="-marker-lng"]').val( latlng.lng );
			this.$el.find('[id$="-marker-default-label"]').val( label );

			return this;
		},
		locate_marker:function(){
			this.marker._map.flyTo( this.marker.getLatLng() );
			$(this.marker._icon).focus()
			return this;
		},
		remove_marker:function(e) {
			e.preventDefault()
			this.marker.remove();
			return this;
		}
	});

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
			return this.$parent().find('.acf-osm-layers');
		},
		$results : function() {
			return this.$parent().find('.osm-results');
		},
		$markers:function(){
			return this.$parent().find('.osm-markers');
		},
		initialize:function(conf) {

			this.map		= conf.map;

			this.update_map(); // set map to input values

			this.init_layers();

			this.init_markers();

			this.init_acf();

			this.update_visible();

			return this;
		},
		_get_geocoder_result_label:function( e, latlng ) {
			var label = false;

			if ( ! e.length ) {
				label = latlng.lat.toString() + ', ' + latlng.lng.toString();
			} else {
				$.each( e, function( i, result ) {
					if ( !! result.html ) {
						label = result.html;
					} else {
						label = result.name;
					}
					return false;
				});
			}
			return $(label).text().replace(/^(\s+)/g,'').replace(/(\s+)$/g,'');
		},
		init_markers:function(){

			var self = this;

			this.icon = new L.DivIcon({
				html: '',
				className:'osm-marker-icon'
			});

			this.init_geocode();

			this.map.on('click', function(e){
				var latlng = e.latlng;
				self.geocoder.options.geocoder.reverse(e.latlng,self.map.getZoom(),function(e){
					var label = self._get_geocoder_result_label( e, latlng );
					self.add_marker( latlng, label );
				},self);
			});

			this.map.on( 'layeradd', function(e){
				if ( e.layer.constructor !== L.Marker ) {
					return;
				}
				var template = self.$markers().find('[data-id="__osm_marker_template__"]').html().split('__osm_marker_template__').join( '<%= id %>' ),
					entry = new osm.MarkerEntry({
						controller: this,
						marker: e.layer,
						id: acf.uniqid(), //self.$markers().children().length,
						template: _.template( template ),
					});

				entry.render().$el.prependTo( self.$markers() );

				e.layer
					.setIcon( self.icon )
					.on('click',function(e){
						this.remove();
					})
					.on('remove',function(e){
						entry.$el.remove();
					})
					.on('dragend',function(e){
						if ( ! parseInt( entry.default_state ) ) {
							return;
						}
						self.geocoder.options.geocoder.reverse(this.getLatLng(),self.map.getZoom(),function(e){

							var latlng = this.getLatLng(),
								label = self._get_geocoder_result_label( e, latlng );
							entry.update_marker( latlng, label );

						}, this );
					})
					.dragging.enable();
			} );
		},
		add_marker:function( lnglat, label ){
			L.marker(lnglat,{
				title: label,
				icon: this.icon,
			})
				.bindTooltip( label )
				.addTo( this.map );
		},
		layer_is_overlay: function(  key, layer ) {
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
		init_layers:function() {
			var self = this,
				selectedLayers = [],
				baseLayers = {},
				overlays = {},
				mapLayers = {},
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
					if ( !! mapLayers[ key ] ) {
						layer = mapLayers[ key ];
						self.map.addLayer(layer)
					} else {
						layer_config = options.layer_config[ key.split('.')[0] ] || {options:{}};
						layer = L.tileLayer.provider( key, layer_config.options );
						layer.providerKey = key;
					}

					if ( self.layer_is_overlay( key, layer ) ) {
						overlays[key] = layer;
					} else {
						baseLayers[key] = layer;
					}

					if ( selectedLayers.indexOf( key ) !== -1 ) {
						self.map.addLayer(layer);
					}
				};

			selectedLayers = this.$el.data().mapLayers;


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

			var self = this;

			this.map._controlCorners['above'] = $('<div class="acf-osm-above"></div>').insertBefore( this.$el ).get(0);

			this.geocoder = L.Control.geocoder({
				collapsed: false,
				position:'above',
				placeholder:'Search...',
				errorMessage:'Nothing found...',
				showResultIcons:true,
				suggestMinLength:3,
				suggestTimeout:250,
				queryMinLength:3,
				defaultMarkGeocode:false,
			})
			.on('markgeocode',function(e){
				//console.log(e.geocode.cneter);return;
				var label = self._get_geocoder_result_label( [e.geocode], e.geocode.center );
				self.add_marker( e.geocode.center, label );
				/*
				self.map.flyToBounds(e.geocode.bbox);
				/*/
				self.map.fitBounds(e.geocode.bbox);
				//*/

//				e.preventDefault();
			})
			.addTo( this.map );

			// prevent wp post form from being submitted
			L.DomEvent.addListener(this.geocoder._input, 'keydown', function(e){
				if ( e.keyCode === 13 ) {
					e.preventDefault();
				}
			}, this.geocoder );
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
			if ( ! self.$layerStore().length ) {
				return;
			}

			this.map.on( 'layeradd layerremove', function(e){
				if ( ! e.layer.providerKey) {
					return;
				}
				var $layerStore = self.$layerStore(),
					$template = self.$parent().find('[data-id="__osm_layer_template__"]');

				$layerStore.html('');

				self.map.eachLayer(function(layer) {
					if ( ! layer.providerKey ) {
						return;
					}
					var $layerInput = $template.clone().removeAttr('data-id');
					$layerInput.val( layer.providerKey );

					if ( self.layer_is_overlay( layer.providerKey, layer ) ) {
						$layerStore.append( $layerInput );
					} else {
						$layerStore.prepend( $layerInput );
					}
				});

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
	$(document).on('acf-osm-map-init',function( e, map ) {
		e.preventDefault();
		new osm.field( { el: e.target, map: map } );
	});


})( jQuery, acf_osm_admin );
