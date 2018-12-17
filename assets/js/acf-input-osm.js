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
		events: {
			'click [data-name="locate-marker"]' : 'locate_marker',
			'click [data-name="remove-marker"]' : 'remove_marker',
			'change [id$="-marker-label"]'		: 'update_marker_label',
//			'focus [type="text"]'				: 'hilite_marker'
		},
		get_label: function() {
			return this.$el.find('[id$="-marker-label"]').val();
		},
		get_default_label: function() {
			return this.$el.find('[id$="-marker-geocode"]').val();
		},
		is_default_label: function() {
			return this.get_default_label() === this.get_label();
		},
		initialize:function(opt){
			var self = this;
			this.template = opt.template;
			this.marker = opt.marker;
			this.marker.osm_controller = this;

			return this;
		},
		render:function(){
			var self = this;

			this.$el.html( this.template( this ) );
			this._update_values_from_marker();

			this.$el.height( this.$el.data('height') );

			this.$el.find('[id$="-marker-label"]')
				.on('focus',function(e) {
					self.hilite_marker();
				})
				.on('blur',function(e) {
					self.lolite_marker();
				});
			$(this.marker._icon)
				.on('focus',function(e){
					self.hilite_marker();
				})
				.on('blur',function(e){
					self.lolite_marker();
				})
			return this;
		},
		update_marker_label:function(e) {
			var label = this.get_label();

			if ( label === '' ) {
				label = this.get_default_label();
			}
			// restore geocode default
			$(e.target).val(label);

			return this.set_marker_label( label );
		},
		set_marker_label:function(label) {
			this.marker.unbindTooltip();
			this.marker.bindTooltip(label);

			this.marker.options.title = label;
			$( this.marker._icon ).attr( 'title', label );
			return this;
		},
		update_marker_geocode:function( label ) {

			if ( this.is_default_label() ) {
				// update marker labels
				this.set_marker_label( label );
				// update marker label input
			}

			this.$el.find('[id$="-marker-geocode"]').val( label );

			this._update_values_from_marker();

			return this;
		},
		_update_values_from_marker: function( ) {
			var latlng = this.marker.getLatLng();
			this.$el.find('[id$="-marker-lat"]').val( latlng.lat );
			this.$el.find('[id$="-marker-lng"]').val( latlng.lng );
			this.$el.find('[id$="-marker-label"]').val( this.marker.options.title );
			return this;
		},
		hilite_marker:function(e) {
			this.$el.addClass('focus');
			$( this.marker._icon ).addClass('focus')
		},
		lolite_marker:function(e) {
			this.$el.removeClass('focus');
			$( this.marker._icon ).removeClass('focus')
		},
		locate_marker:function(){
			this.marker._map.flyTo( this.marker.getLatLng() );
			return this;
		},
		remove_marker:function(e) {
			e.preventDefault()
			this.marker.remove();
			return this;
		}
	});

	osm.field = Backbone.View.extend({

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

			this.init_acf();

			this.init_layers();

			this.init_markers();

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
			return $('<p>'+label+'</p>').text().replace(/^(\s+)/g,'').replace(/(\s+)$/g,'').replace(/(\s+)/g,' ');
		},
		init_markers:function(){

			var self = this,
				editor_config = this.$el.data().editorConfig;

			this.init_geocode();

			// no markers allowed!
			if ( editor_config.max_markers === 0 ) {
				return;
			}

			this.icon = new L.DivIcon({
				html: '',
				className:'osm-marker-icon'
			});

			this.map.on('click', function(e){
				var latlng = e.latlng,
					count_markers = self.$markers().children().not('[data-id]').length;

				// no more markers
				if ( editor_config.max_markers !== false && count_markers >= editor_config.max_markers ) {
					return;
				}

				self.geocoder.options.geocoder.reverse(e.latlng,self.map.getZoom(),function(e){

					var label = self._get_geocoder_result_label( e, latlng );

					self.add_marker( latlng, label );

				},self);
			});

			this.map.on( 'layeradd', function(e){
				if ( e.layer.constructor !== L.Marker ) {
					return;
				}
				// marker added
				var template = self.$markers().find('[data-id="__osm_marker_template__"]').html().split('__osm_marker_template__').join( '<%= id %>' ),
					entry = new osm.MarkerEntry({
						controller: this,
						marker: e.layer,
						id: acf.uniqid(), //self.$markers().children().length,
						template: _.template( template ),
					});

				entry.render().$el.appendTo( self.$markers() );

				self.geocode_marker( entry );

				e.layer
					.setIcon( self.icon )
					.on('click',function(e){
						this.remove();
					})
					.on('remove',function(e){
						entry.$el.remove();
						self.$el.trigger('change');
					})
					.on('dragend',function(e){
						self.geocode_marker( entry );
						self.$el.trigger('change');
					})
					.dragging.enable();
			} );
			this.map.on( 'layerremove', function(e){
				if ( e.layer.constructor !== L.Marker ) {
					return;
				}
				self.$el.trigger('change');
			} );
			// add markers
			$.each( this.$el.data().mapMarkers,function( i, markerData ) {
				// add markers
				var marker = L.marker( L.latLng( markerData.lat * 1, markerData.lng * 1 ), {
						title: markerData.label
					})
					.bindTooltip( markerData.label )
					.addTo( self.map );

			});

		},
		geocode_marker:function( marker_entry ) {
			var self = this,
				entry = marker_entry,
				latlng = entry.marker.getLatLng();

			self.geocoder.options.geocoder.reverse( latlng, self.map.getZoom(), function(e){

				var label = self._get_geocoder_result_label( e, latlng );

				entry.update_marker_geocode( label );

			}, this );

		},
		add_marker:function( lnglat, label ){
			L.marker(lnglat,{
				title: label,
				icon: this.icon,
			})
			.bindTooltip( label )
			.addTo( this.map );

			this.$el.trigger('change');
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
		reset_layers:function() {
			// set this.$el.data().mapLayers so it fits
			// remove all map layers
			this.map.eachLayer(function(layer){
				if ( layer.constructor === L.TileLayer.Provider ) {
					layer.remove();
				}
			})
			// remove layer store
			this.$layerStore().remove();

			// remove layer control
			!! this.layersControl && this.layersControl.remove()
		},
		init_layers:function() {
			var self = this,
				selectedLayers = [],
				baseLayers = {},
				overlays = {},
				mapLayers = {},
				editor_config = this.$el.data().editorConfig,
				is_omitted = function(key) {

					return key === null || ( !! editor_config.restrict_providers && editor_config.restrict_providers.indexOf( key ) === -1 );
				},
				setupMap = function( val, key ){
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
						try {
							layer = L.tileLayer.provider( key /*, layer_config.options*/ );
						} catch(ex) {
							return;
						}
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

			selectedLayers = this.$el.data().mapLayers; // should be layer store value

			// filter avaialble layers in field value
			if ( editor_config.restrict_providers !== false && _.isArray( editor_config.restrict_providers ) ) {
				selectedLayers = selectedLayers.filter( function(el) {
					return editor_config.restrict_providers.indexOf( el ) !== -1;
				});
			}

			// set default layer
			if ( ! selectedLayers.length ) {

				selectedLayers = Object.keys( editor_config.restrict_providers ).slice( 0, 1 );

			}

			// editable layers!
			if ( editor_config.allow_providers ) {

				$('<div class="acf-osm-layers"></div>').insertAfter( this.$el );

				this.map.on( 'baselayerchange layeradd layerremove', function(e){

					if ( ! e.layer.providerKey) {
						return;
					}
					var $layerStore = self.$layerStore(),
						$template = self.$parent().find('[data-id="__osm_layer_template__"]');

					$layerStore.html('');

					self.map.eachLayer(function(layer) {
						var $layerInput;
						if ( ! layer.providerKey ) {
							return;
						}
						/*
						$layerInput = $template.clone().removeAttr('data-id');
						/*/
						$layerInput = $('<input type="hidden" name="' + editor_config.name_prefix + '[layers][]" />');
						//*/
						$layerInput.val( layer.providerKey );

						if ( self.layer_is_overlay( layer.providerKey, layer ) ) {
							$layerStore.append( $layerInput );
						} else {
							$layerStore.prepend( $layerInput );
						}
					});
					self.$el.trigger('change');
				} );
			}


			$.each( editor_config.restrict_providers, setupMap );

			// ... no layer editing allowed
			if ( this.$layerStore().length ) {
				this.layersControl = L.control.layers( baseLayers, overlays, {
					collapsed: true,
					hideSingleBase: true,
				}).addTo(this.map);
			}
		},
		init_geocode:function() {

			var self = this,
				editor_config = this.$el.data().editorConfig;

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
				var latlng =  e.geocode.center,
					editor_config = self.$el.data().editorConfig,
					count_markers = self.$markers().children().not('[data-id]').length,
					label = self._get_geocoder_result_label( [ e.geocode ], latlng );

				if ( count_markers === false || count_markers < editor_config.max_markers ) {
					// add marker if no restriction or max markers not exceeded
					self.add_marker( latlng, label );
				}
				if ( editor_config.max_markers === 1 && count_markers === 1 ) {
					// update single marker
					marker = self.get_first_marker();
					if ( !! marker ) {
						entry = marker.osm_controller;
						marker.setLatLng( latlng );
						entry.update_marker_geocode( label );
					}
				}

				if ( editor_config.max_markers === 0 ) {
					self.map.fitBounds( e.geocode.bbox );
				} else {
					self.map.setView( latlng, self.map.getZoom() ); // keep zoom, might be confusing else
				}

			})
			.addTo( this.map );

			// prevent wp post form from being submitted
			L.DomEvent.addListener(this.geocoder._input, 'keydown', function(e){
				if ( e.keyCode === 13 ) {
					e.preventDefault();
				}
			}, this.geocoder );
		},
		get_first_marker:function() {
			var marker = false;
			this.map.eachLayer(function(layer){
				if ( layer.constructor === L.Marker ) {
					marker = layer;
					return false;
				}
			});
			return marker;
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
			acf.addAction( 'disable_field', function(){
				self.unbind_events();
			} );

			// expand wp metabox
			$(document).on('postbox-toggled', toggle_cb );
			$(document).on('click','.widget-top *', toggle_cb );



		},
		unbind_events:function() {
			var self = this;
			self.$lat().off('blur');
			self.$lng().off('blur');
			self.$zoom().off('blur');
			self.$zoom().off('keyup focus');

			this.map.off('zoomend', this.map_zoomed, this );
			this.map.off('moveend', this.map_moved, this );
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

			this.map.on('zoomend', this.map_zoomed, this );
			this.map.on('moveend', this.map_moved, this );
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
			this.$el.trigger('change');
		},
		map_zoomed:function(e){
			this.$zoom().val( this.map.getZoom() );
			this.$el.trigger('change');
		}
	});


	$(document)
		.on('acf-osm-map-init',function( e, map ) {
			if ( $(e.target).is('[data-editor-config]') ) {
				e.preventDefault();
				$(e.target).data( '_map_editor', new osm.field( { el: e.target, map: map } ) );
			}
		})
		// field settings
		.on('change','[data-type="open_street_map"] [data-name="return_format"] input',function(e){
			// find map field
			$('[data-name="return_format"] input:checked').val()
			var $map = $(this).closest('.acf-field-object').find('[data-editor-config]'),
				editor = $map.data( '_map_editor' ),
				conf = $map.data('editor-config');
			// map
			editor.reset_layers();
			if ( $(this).val() === 'osm' ) {
				// set provider restriction to osm providers
				conf.restrict_providers = Object.values( arg.options.osm_layers );
			} else {
				// set provider restriction to osm providers
				conf.restrict_providers = Object.values( arg.options.leaflet_layers );
			}
			$map.data( 'editor-config', conf );
			editor.init_layers();
		});

	// when fields get loaded ...
	acf.addAction( 'append', function(){
		$.acf_leaflet();
	});

})( jQuery, acf_osm_admin );
