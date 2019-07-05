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
			// don't init in repeater templates
			if ( $(e.target).closest('[data-id="acfcloneindex"]').length ) {
				e.preventDefault();
				return;
			}
			// wrap osm.field backbone view around editors
			if ( $(e.target).is('[data-editor-config]') ) {
				e.preventDefault();

				(function checkVis(){
					if ( ! $(e.target).is(':visible') ) {
						return setTimeout(checkVis,250);
					}
					map.invalidateSize();
				})();

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

	// init when fields get loaded ...
	acf.addAction( 'append', function(){
		$.acf_leaflet();
	});
	// init when fields shw ...
	acf.addAction( 'show_field/type=open_street_map', function( field ){
	    var editor = field.$el.find('[data-editor-config]').data( '_map_editor' );
	    editor.update_visible();
	});
})( jQuery, acf_osm_admin );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2YtaW5wdXQtb3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCAkLCBhcmcgKXtcblx0dmFyIG9wdGlvbnMgPSBhcmcub3B0aW9ucyxcblx0XHRyZXN1bHRfdHBsID0gJzxkaXYgdGFiaW5kZXg9XCI8JT0gZGF0YS5pICU+XCIgY2xhc3M9XCJvc20tcmVzdWx0XCI+J1xuXHRcdFx0KyAnPCU9IGRhdGEucmVzdWx0X3RleHQgJT4nXG5cdFx0XHQrICc8YnIgLz48c21hbGw+PCU9IGRhdGEucHJvcGVydGllcy5vc21fdmFsdWUgJT48L3NtYWxsPidcblx0XHRcdCsgJzwvZGl2Pic7XG5cblx0dmFyIG9zbSA9IHtcblx0fTtcblxuXHRvc20uTWFya2VyTGlzdCA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0fSlcblx0b3NtLk1hcmtlckVudHJ5ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRcdHRhZ05hbWU6ICdkaXYnLFxuXHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlcicsXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cImxvY2F0ZS1tYXJrZXJcIl0nIDogJ2xvY2F0ZV9tYXJrZXInLFxuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJyZW1vdmUtbWFya2VyXCJdJyA6ICdyZW1vdmVfbWFya2VyJyxcblx0XHRcdCdjaGFuZ2UgW2lkJD1cIi1tYXJrZXItbGFiZWxcIl0nXHRcdDogJ3VwZGF0ZV9tYXJrZXJfbGFiZWwnLFxuLy9cdFx0XHQnZm9jdXMgW3R5cGU9XCJ0ZXh0XCJdJ1x0XHRcdFx0OiAnaGlsaXRlX21hcmtlcidcblx0XHR9LFxuXHRcdGdldF9sYWJlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGFiZWxcIl0nKS52YWwoKTtcblx0XHR9LFxuXHRcdGdldF9kZWZhdWx0X2xhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1nZW9jb2RlXCJdJykudmFsKCk7XG5cdFx0fSxcblx0XHRpc19kZWZhdWx0X2xhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLmdldF9kZWZhdWx0X2xhYmVsKCkgPT09IHRoaXMuZ2V0X2xhYmVsKCk7XG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKG9wdCl7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLnRlbXBsYXRlID0gb3B0LnRlbXBsYXRlO1xuXHRcdFx0dGhpcy5tYXJrZXIgPSBvcHQubWFya2VyO1xuXHRcdFx0dGhpcy5tYXJrZXIub3NtX2NvbnRyb2xsZXIgPSB0aGlzO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLiRlbC5odG1sKCB0aGlzLnRlbXBsYXRlKCB0aGlzICkgKTtcblx0XHRcdHRoaXMuX3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXIoKTtcblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGFiZWxcIl0nKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KTtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2xhYmVsOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBsYWJlbCA9IHRoaXMuZ2V0X2xhYmVsKCk7XG5cblx0XHRcdGlmICggbGFiZWwgPT09ICcnICkge1xuXHRcdFx0XHRsYWJlbCA9IHRoaXMuZ2V0X2RlZmF1bHRfbGFiZWwoKTtcblx0XHRcdH1cblx0XHRcdC8vIHJlc3RvcmUgZ2VvY29kZSBkZWZhdWx0XG5cdFx0XHQkKGUudGFyZ2V0KS52YWwobGFiZWwpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcy5zZXRfbWFya2VyX2xhYmVsKCBsYWJlbCApO1xuXHRcdH0sXG5cdFx0c2V0X21hcmtlcl9sYWJlbDpmdW5jdGlvbihsYWJlbCkge1xuXHRcdFx0dGhpcy5tYXJrZXIudW5iaW5kVG9vbHRpcCgpO1xuXHRcdFx0dGhpcy5tYXJrZXIuYmluZFRvb2x0aXAobGFiZWwpO1xuXG5cdFx0XHR0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlID0gbGFiZWw7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmF0dHIoICd0aXRsZScsIGxhYmVsICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfZ2VvY29kZTpmdW5jdGlvbiggbGFiZWwgKSB7XG5cblx0XHRcdGlmICggdGhpcy5pc19kZWZhdWx0X2xhYmVsKCkgKSB7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWxzXG5cdFx0XHRcdHRoaXMuc2V0X21hcmtlcl9sYWJlbCggbGFiZWwgKTtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbCBpbnB1dFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1nZW9jb2RlXCJdJykudmFsKCBsYWJlbCApO1xuXG5cdFx0XHR0aGlzLl91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyKCk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0X3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXI6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhdFwiXScpLnZhbCggbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbG5nXCJdJykudmFsKCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYWJlbFwiXScpLnZhbCggdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWxpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hZGRDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9saXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmVDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkucmVtb3ZlQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvY2F0ZV9tYXJrZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMubWFya2VyLl9tYXAuZmx5VG8oIHRoaXMubWFya2VyLmdldExhdExuZygpICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbW92ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpXG5cdFx0XHR0aGlzLm1hcmtlci5yZW1vdmUoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSk7XG5cblx0b3NtLmZpZWxkID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG5cdFx0bWFwOiBudWxsLFxuXHRcdGdlb2NvZGVyOiBudWxsLFxuXHRcdHZpc2libGU6IG51bGwsXG5cdFx0ZXZlbnRzOntcblx0XHR9LFxuXG5cdFx0JHBhcmVudDpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MsLmFjZi1maWVsZC1vcGVuLXN0cmVldC1tYXAnKVxuXHRcdH0sXG5cdFx0JHpvb20gOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCdpbnB1dFtpZCQ9XCItem9vbVwiXScpO1xuXHRcdH0sXG5cdFx0JGxhdCA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJ2lucHV0W2lkJD1cIi1jZW50ZXJfbGF0XCJdJyk7XG5cdFx0fSxcblx0XHQkbG5nIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXRbaWQkPVwiLWNlbnRlcl9sbmdcIl0nKTtcblx0XHR9LFxuXHRcdCRsYXllclN0b3JlOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCcuYWNmLW9zbS1sYXllcnMnKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHRoaXMubWFwXHRcdD0gY29uZi5tYXA7XG5cblx0XHRcdHRoaXMudXBkYXRlX21hcCgpOyAvLyBzZXQgbWFwIHRvIGlucHV0IHZhbHVlc1xuXG5cdFx0XHR0aGlzLmluaXRfYWNmKCk7XG5cblx0XHRcdHRoaXMuaW5pdF9sYXllcnMoKTtcblxuXHRcdFx0dGhpcy5pbml0X21hcmtlcnMoKTtcblxuXHRcdFx0dGhpcy51cGRhdGVfdmlzaWJsZSgpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdF9nZXRfZ2VvY29kZXJfcmVzdWx0X2xhYmVsOmZ1bmN0aW9uKCBlLCBsYXRsbmcgKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSBmYWxzZTtcblxuXHRcdFx0aWYgKCAhIGUubGVuZ3RoICkge1xuXHRcdFx0XHRsYWJlbCA9IGxhdGxuZy5sYXQudG9TdHJpbmcoKSArICcsICcgKyBsYXRsbmcubG5nLnRvU3RyaW5nKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkLmVhY2goIGUsIGZ1bmN0aW9uKCBpLCByZXN1bHQgKSB7XG5cdFx0XHRcdFx0aWYgKCAhISByZXN1bHQuaHRtbCApIHtcblx0XHRcdFx0XHRcdGxhYmVsID0gcmVzdWx0Lmh0bWw7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGxhYmVsID0gcmVzdWx0Lm5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gJCgnPHA+JytsYWJlbCsnPC9wPicpLnRleHQoKS5yZXBsYWNlKC9eKFxccyspL2csJycpLnJlcGxhY2UoLyhcXHMrKSQvZywnJykucmVwbGFjZSgvKFxccyspL2csJyAnKTtcblx0XHR9LFxuXHRcdGluaXRfbWFya2VyczpmdW5jdGlvbigpe1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLmluaXRfZ2VvY29kZSgpO1xuXG5cdFx0XHQvLyBubyBtYXJrZXJzIGFsbG93ZWQhXG5cdFx0XHRpZiAoIGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pY29uID0gbmV3IEwuRGl2SWNvbih7XG5cdFx0XHRcdGh0bWw6ICcnLFxuXHRcdFx0XHRjbGFzc05hbWU6J29zbS1tYXJrZXItaWNvbidcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1hcC5vbignY2xpY2snLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IGUubGF0bG5nLFxuXHRcdFx0XHRcdGNvdW50X21hcmtlcnMgPSBzZWxmLiRtYXJrZXJzKCkuY2hpbGRyZW4oKS5ub3QoJ1tkYXRhLWlkXScpLmxlbmd0aDtcblxuXHRcdFx0XHQvLyBubyBtb3JlIG1hcmtlcnNcblx0XHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzICE9PSBmYWxzZSAmJiBjb3VudF9tYXJrZXJzID49IGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0c2VsZi5nZW9jb2Rlci5vcHRpb25zLmdlb2NvZGVyLnJldmVyc2UoZS5sYXRsbmcsc2VsZi5tYXAuZ2V0Wm9vbSgpLGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdFx0dmFyIGxhYmVsID0gc2VsZi5fZ2V0X2dlb2NvZGVyX3Jlc3VsdF9sYWJlbCggZSwgbGF0bG5nICk7XG5cblx0XHRcdFx0XHRzZWxmLmFkZF9tYXJrZXIoIGxhdGxuZywgbGFiZWwgKTtcblxuXHRcdFx0XHR9LHNlbGYpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubWFwLm9uKCAnbGF5ZXJhZGQnLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0aWYgKCBlLmxheWVyLmNvbnN0cnVjdG9yICE9PSBMLk1hcmtlciApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly8gbWFya2VyIGFkZGVkXG5cdFx0XHRcdHZhciB0ZW1wbGF0ZSA9IHNlbGYuJG1hcmtlcnMoKS5maW5kKCdbZGF0YS1pZD1cIl9fb3NtX21hcmtlcl90ZW1wbGF0ZV9fXCJdJykuaHRtbCgpLnNwbGl0KCdfX29zbV9tYXJrZXJfdGVtcGxhdGVfXycpLmpvaW4oICc8JT0gaWQgJT4nICksXG5cdFx0XHRcdFx0ZW50cnkgPSBuZXcgb3NtLk1hcmtlckVudHJ5KHtcblx0XHRcdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdFx0XHRtYXJrZXI6IGUubGF5ZXIsXG5cdFx0XHRcdFx0XHRpZDogYWNmLnVuaXFpZCgpLCAvL3NlbGYuJG1hcmtlcnMoKS5jaGlsZHJlbigpLmxlbmd0aCxcblx0XHRcdFx0XHRcdHRlbXBsYXRlOiBfLnRlbXBsYXRlKCB0ZW1wbGF0ZSApLFxuXHRcdFx0XHRcdH0pO1xuXG5cdFx0XHRcdGVudHJ5LnJlbmRlcigpLiRlbC5hcHBlbmRUbyggc2VsZi4kbWFya2VycygpICk7XG5cblx0XHRcdFx0c2VsZi5nZW9jb2RlX21hcmtlciggZW50cnkgKTtcblxuXHRcdFx0XHRlLmxheWVyXG5cdFx0XHRcdFx0LnNldEljb24oIHNlbGYuaWNvbiApXG5cdFx0XHRcdFx0Lm9uKCdjbGljaycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHR0aGlzLnJlbW92ZSgpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Lm9uKCdyZW1vdmUnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0ZW50cnkuJGVsLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0c2VsZi4kZWwudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQub24oJ2RyYWdlbmQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0c2VsZi5nZW9jb2RlX21hcmtlciggZW50cnkgKTtcblx0XHRcdFx0XHRcdHNlbGYuJGVsLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmRyYWdnaW5nLmVuYWJsZSgpO1xuXHRcdFx0fSApO1xuXHRcdFx0dGhpcy5tYXAub24oICdsYXllcnJlbW92ZScsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRpZiAoIGUubGF5ZXIuY29uc3RydWN0b3IgIT09IEwuTWFya2VyICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLiRlbC50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdH0gKTtcblx0XHRcdC8vIGFkZCBtYXJrZXJzXG5cdFx0XHQkLmVhY2goIHRoaXMuJGVsLmRhdGEoKS5tYXBNYXJrZXJzLGZ1bmN0aW9uKCBpLCBtYXJrZXJEYXRhICkge1xuXHRcdFx0XHQvLyBhZGQgbWFya2Vyc1xuXHRcdFx0XHR2YXIgbWFya2VyID0gTC5tYXJrZXIoIEwubGF0TG5nKCBtYXJrZXJEYXRhLmxhdCAqIDEsIG1hcmtlckRhdGEubG5nICogMSApLCB7XG5cdFx0XHRcdFx0XHR0aXRsZTogbWFya2VyRGF0YS5sYWJlbFxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmJpbmRUb29sdGlwKCBtYXJrZXJEYXRhLmxhYmVsIClcblx0XHRcdFx0XHQuYWRkVG8oIHNlbGYubWFwICk7XG5cblx0XHRcdH0pO1xuXG5cdFx0fSxcblx0XHRnZW9jb2RlX21hcmtlcjpmdW5jdGlvbiggbWFya2VyX2VudHJ5ICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRlbnRyeSA9IG1hcmtlcl9lbnRyeSxcblx0XHRcdFx0bGF0bG5nID0gZW50cnkubWFya2VyLmdldExhdExuZygpO1xuXG5cdFx0XHRzZWxmLmdlb2NvZGVyLm9wdGlvbnMuZ2VvY29kZXIucmV2ZXJzZSggbGF0bG5nLCBzZWxmLm1hcC5nZXRab29tKCksIGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdHZhciBsYWJlbCA9IHNlbGYuX2dldF9nZW9jb2Rlcl9yZXN1bHRfbGFiZWwoIGUsIGxhdGxuZyApO1xuXG5cdFx0XHRcdGVudHJ5LnVwZGF0ZV9tYXJrZXJfZ2VvY29kZSggbGFiZWwgKTtcblxuXHRcdFx0fSwgdGhpcyApO1xuXG5cdFx0fSxcblx0XHRhZGRfbWFya2VyOmZ1bmN0aW9uKCBsbmdsYXQsIGxhYmVsICl7XG5cdFx0XHRMLm1hcmtlcihsbmdsYXQse1xuXHRcdFx0XHR0aXRsZTogbGFiZWwsXG5cdFx0XHRcdGljb246IHRoaXMuaWNvbixcblx0XHRcdH0pXG5cdFx0XHQuYmluZFRvb2x0aXAoIGxhYmVsIClcblx0XHRcdC5hZGRUbyggdGhpcy5tYXAgKTtcblxuXHRcdFx0dGhpcy4kZWwudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0fSxcblx0XHRsYXllcl9pc19vdmVybGF5OiBmdW5jdGlvbiggIGtleSwgbGF5ZXIgKSB7XG5cdFx0XHR2YXIgcGF0dGVybnM7XG5cblx0XHRcdGlmICggbGF5ZXIub3B0aW9ucy5vcGFjaXR5ICYmIGxheWVyLm9wdGlvbnMub3BhY2l0eSA8IDEgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cGF0dGVybnMgPSBbJ14oT3BlbldlYXRoZXJNYXB8T3BlblNlYU1hcCknLFxuXHRcdFx0XHQnT3Blbk1hcFN1cmZlci5BZG1pbkJvdW5kcycsXG5cdFx0XHRcdCdTdGFtZW4uVG9uZXIoSHlicmlkfExpbmVzfExhYmVscyknLFxuXHRcdFx0XHQnQWNldGF0ZS4oZm9yZWdyb3VuZHxsYWJlbHN8cm9hZHMpJyxcblx0XHRcdFx0J0hpbGxTaGFkaW5nJyxcblx0XHRcdFx0J0h5ZGRhLlJvYWRzQW5kTGFiZWxzJyxcblx0XHRcdFx0J15KdXN0aWNlTWFwJyxcblx0XHRcdFx0J09wZW5JbmZyYU1hcC4oUG93ZXJ8VGVsZWNvbXxQZXRyb2xldW18V2F0ZXIpJyxcblx0XHRcdFx0J09wZW5QdE1hcCcsXG5cdFx0XHRcdCdPcGVuUmFpbHdheU1hcCcsXG5cdFx0XHRcdCdPcGVuRmlyZU1hcCcsXG5cdFx0XHRcdCdTYWZlQ2FzdCcsXG5cdFx0XHRcdCdDYXJ0b0RCLkRhcmtNYXR0ZXJPbmx5TGFiZWxzJyxcblx0XHRcdFx0J0NhcnRvREIuUG9zaXRyb25Pbmx5TGFiZWxzJ1xuXHRcdFx0XTtcblx0XHRcdHJldHVybiBrZXkubWF0Y2goJygnICsgcGF0dGVybnMuam9pbignfCcpICsgJyknKSAhPT0gbnVsbDtcblx0XHR9LFxuXHRcdHJlc2V0X2xheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdC8vIHNldCB0aGlzLiRlbC5kYXRhKCkubWFwTGF5ZXJzIHNvIGl0IGZpdHNcblx0XHRcdC8vIHJlbW92ZSBhbGwgbWFwIGxheWVyc1xuXHRcdFx0dGhpcy5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKXtcblx0XHRcdFx0aWYgKCBsYXllci5jb25zdHJ1Y3RvciA9PT0gTC5UaWxlTGF5ZXIuUHJvdmlkZXIgKSB7XG5cdFx0XHRcdFx0bGF5ZXIucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHQvLyByZW1vdmUgbGF5ZXIgc3RvcmVcblx0XHRcdHRoaXMuJGxheWVyU3RvcmUoKS5yZW1vdmUoKTtcblxuXHRcdFx0Ly8gcmVtb3ZlIGxheWVyIGNvbnRyb2xcblx0XHRcdCEhIHRoaXMubGF5ZXJzQ29udHJvbCAmJiB0aGlzLmxheWVyc0NvbnRyb2wucmVtb3ZlKClcblx0XHR9LFxuXHRcdGluaXRfbGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IFtdLFxuXHRcdFx0XHRiYXNlTGF5ZXJzID0ge30sXG5cdFx0XHRcdG92ZXJsYXlzID0ge30sXG5cdFx0XHRcdG1hcExheWVycyA9IHt9LFxuXHRcdFx0XHRlZGl0b3JfY29uZmlnID0gdGhpcy4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZyxcblx0XHRcdFx0aXNfb21pdHRlZCA9IGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiBrZXkgPT09IG51bGwgfHwgKCAhISBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAmJiBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBrZXkgKSA9PT0gLTEgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0dXBNYXAgPSBmdW5jdGlvbiggdmFsLCBrZXkgKXtcblx0XHRcdFx0XHR2YXIgbGF5ZXIsIGxheWVyX2NvbmZpZztcblx0XHRcdFx0XHRpZiAoIF8uaXNPYmplY3QodmFsKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiAkLmVhY2goIHZhbCwgc2V0dXBNYXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGlzX29taXR0ZWQoa2V5KSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAhISBtYXBMYXllcnNbIGtleSBdICkge1xuXHRcdFx0XHRcdFx0bGF5ZXIgPSBtYXBMYXllcnNbIGtleSBdO1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGxheWVyID0gTC50aWxlTGF5ZXIucHJvdmlkZXIoIGtleSAvKiwgbGF5ZXJfY29uZmlnLm9wdGlvbnMqLyApO1xuXHRcdFx0XHRcdFx0fSBjYXRjaChleCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRsYXllci5wcm92aWRlcktleSA9IGtleTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSgga2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0b3ZlcmxheXNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiYXNlTGF5ZXJzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGVjdGVkTGF5ZXJzLmluZGV4T2YoIGtleSApICE9PSAtMSApIHtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH07XG5cblx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy4kZWwuZGF0YSgpLm1hcExheWVyczsgLy8gc2hvdWxkIGJlIGxheWVyIHN0b3JlIHZhbHVlXG5cblx0XHRcdC8vIGZpbHRlciBhdmFpYWxibGUgbGF5ZXJzIGluIGZpZWxkIHZhbHVlXG5cdFx0XHRpZiAoIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICE9PSBmYWxzZSAmJiBfLmlzQXJyYXkoIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICkgKSB7XG5cdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gc2VsZWN0ZWRMYXllcnMuZmlsdGVyKCBmdW5jdGlvbihlbCkge1xuXHRcdFx0XHRcdHJldHVybiBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBlbCApICE9PSAtMTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNldCBkZWZhdWx0IGxheWVyXG5cdFx0XHRpZiAoICEgc2VsZWN0ZWRMYXllcnMubGVuZ3RoICkge1xuXG5cdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gT2JqZWN0LmtleXMoIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICkuc2xpY2UoIDAsIDEgKTtcblxuXHRcdFx0fVxuXG5cdFx0XHQvLyBlZGl0YWJsZSBsYXllcnMhXG5cdFx0XHRpZiAoIGVkaXRvcl9jb25maWcuYWxsb3dfcHJvdmlkZXJzICkge1xuXG5cdFx0XHRcdCQoJzxkaXYgY2xhc3M9XCJhY2Ytb3NtLWxheWVyc1wiPjwvZGl2PicpLmluc2VydEFmdGVyKCB0aGlzLiRlbCApO1xuXG5cdFx0XHRcdHRoaXMubWFwLm9uKCAnYmFzZWxheWVyY2hhbmdlIGxheWVyYWRkIGxheWVycmVtb3ZlJywgZnVuY3Rpb24oZSl7XG5cblx0XHRcdFx0XHRpZiAoICEgZS5sYXllci5wcm92aWRlcktleSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR2YXIgJGxheWVyU3RvcmUgPSBzZWxmLiRsYXllclN0b3JlKCksXG5cdFx0XHRcdFx0XHQkdGVtcGxhdGUgPSBzZWxmLiRwYXJlbnQoKS5maW5kKCdbZGF0YS1pZD1cIl9fb3NtX2xheWVyX3RlbXBsYXRlX19cIl0nKTtcblxuXHRcdFx0XHRcdCRsYXllclN0b3JlLmh0bWwoJycpO1xuXG5cdFx0XHRcdFx0c2VsZi5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG5cdFx0XHRcdFx0XHR2YXIgJGxheWVySW5wdXQ7XG5cdFx0XHRcdFx0XHRpZiAoICEgbGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdC8qXG5cdFx0XHRcdFx0XHQkbGF5ZXJJbnB1dCA9ICR0ZW1wbGF0ZS5jbG9uZSgpLnJlbW92ZUF0dHIoJ2RhdGEtaWQnKTtcblx0XHRcdFx0XHRcdC8qL1xuXHRcdFx0XHRcdFx0JGxheWVySW5wdXQgPSAkKCc8aW5wdXQgdHlwZT1cImhpZGRlblwiIG5hbWU9XCInICsgZWRpdG9yX2NvbmZpZy5uYW1lX3ByZWZpeCArICdbbGF5ZXJzXVtdXCIgLz4nKTtcblx0XHRcdFx0XHRcdC8vKi9cblx0XHRcdFx0XHRcdCRsYXllcklucHV0LnZhbCggbGF5ZXIucHJvdmlkZXJLZXkgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0XHQkbGF5ZXJTdG9yZS5hcHBlbmQoICRsYXllcklucHV0ICk7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHQkbGF5ZXJTdG9yZS5wcmVwZW5kKCAkbGF5ZXJJbnB1dCApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdHNlbGYuJGVsLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cblxuXHRcdFx0JC5lYWNoKCBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycywgc2V0dXBNYXAgKTtcblxuXHRcdFx0Ly8gLi4uIG5vIGxheWVyIGVkaXRpbmcgYWxsb3dlZFxuXHRcdFx0aWYgKCB0aGlzLiRsYXllclN0b3JlKCkubGVuZ3RoICkge1xuXHRcdFx0XHR0aGlzLmxheWVyc0NvbnRyb2wgPSBMLmNvbnRyb2wubGF5ZXJzKCBiYXNlTGF5ZXJzLCBvdmVybGF5cywge1xuXHRcdFx0XHRcdGNvbGxhcHNlZDogdHJ1ZSxcblx0XHRcdFx0XHRoaWRlU2luZ2xlQmFzZTogdHJ1ZSxcblx0XHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0aW5pdF9nZW9jb2RlOmZ1bmN0aW9uKCkge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLm1hcC5fY29udHJvbENvcm5lcnNbJ2Fib3ZlJ10gPSAkKCc8ZGl2IGNsYXNzPVwiYWNmLW9zbS1hYm92ZVwiPjwvZGl2PicpLmluc2VydEJlZm9yZSggdGhpcy4kZWwgKS5nZXQoMCk7XG5cblx0XHRcdHRoaXMuZ2VvY29kZXIgPSBMLkNvbnRyb2wuZ2VvY29kZXIoe1xuXHRcdFx0XHRjb2xsYXBzZWQ6IGZhbHNlLFxuXHRcdFx0XHRwb3NpdGlvbjonYWJvdmUnLFxuXHRcdFx0XHRwbGFjZWhvbGRlcjonU2VhcmNoLi4uJyxcblx0XHRcdFx0ZXJyb3JNZXNzYWdlOidOb3RoaW5nIGZvdW5kLi4uJyxcblx0XHRcdFx0c2hvd1Jlc3VsdEljb25zOnRydWUsXG5cdFx0XHRcdHN1Z2dlc3RNaW5MZW5ndGg6Myxcblx0XHRcdFx0c3VnZ2VzdFRpbWVvdXQ6MjUwLFxuXHRcdFx0XHRxdWVyeU1pbkxlbmd0aDozLFxuXHRcdFx0XHRkZWZhdWx0TWFya0dlb2NvZGU6ZmFsc2UsXG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdtYXJrZ2VvY29kZScsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSAgZS5nZW9jb2RlLmNlbnRlcixcblx0XHRcdFx0XHRlZGl0b3JfY29uZmlnID0gc2VsZi4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZyxcblx0XHRcdFx0XHRjb3VudF9tYXJrZXJzID0gc2VsZi4kbWFya2VycygpLmNoaWxkcmVuKCkubm90KCdbZGF0YS1pZF0nKS5sZW5ndGgsXG5cdFx0XHRcdFx0bGFiZWwgPSBzZWxmLl9nZXRfZ2VvY29kZXJfcmVzdWx0X2xhYmVsKCBbIGUuZ2VvY29kZSBdLCBsYXRsbmcgKTtcblxuXHRcdFx0XHRpZiAoIGNvdW50X21hcmtlcnMgPT09IGZhbHNlIHx8IGNvdW50X21hcmtlcnMgPCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzICkge1xuXHRcdFx0XHRcdC8vIGFkZCBtYXJrZXIgaWYgbm8gcmVzdHJpY3Rpb24gb3IgbWF4IG1hcmtlcnMgbm90IGV4Y2VlZGVkXG5cdFx0XHRcdFx0c2VsZi5hZGRfbWFya2VyKCBsYXRsbmcsIGxhYmVsICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzID09PSAxICYmIGNvdW50X21hcmtlcnMgPT09IDEgKSB7XG5cdFx0XHRcdFx0Ly8gdXBkYXRlIHNpbmdsZSBtYXJrZXJcblx0XHRcdFx0XHRtYXJrZXIgPSBzZWxmLmdldF9maXJzdF9tYXJrZXIoKTtcblx0XHRcdFx0XHRpZiAoICEhIG1hcmtlciApIHtcblx0XHRcdFx0XHRcdGVudHJ5ID0gbWFya2VyLm9zbV9jb250cm9sbGVyO1xuXHRcdFx0XHRcdFx0bWFya2VyLnNldExhdExuZyggbGF0bG5nICk7XG5cdFx0XHRcdFx0XHRlbnRyeS51cGRhdGVfbWFya2VyX2dlb2NvZGUoIGxhYmVsICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXHRcdFx0XHRcdHNlbGYubWFwLmZpdEJvdW5kcyggZS5nZW9jb2RlLmJib3ggKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRzZWxmLm1hcC5zZXRWaWV3KCBsYXRsbmcsIHNlbGYubWFwLmdldFpvb20oKSApOyAvLyBrZWVwIHpvb20sIG1pZ2h0IGJlIGNvbmZ1c2luZyBlbHNlXG5cdFx0XHRcdH1cblxuXHRcdFx0fSlcblx0XHRcdC5hZGRUbyggdGhpcy5tYXAgKTtcblxuXHRcdH0sXG5cdFx0Z2V0X2ZpcnN0X21hcmtlcjpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtYXJrZXIgPSBmYWxzZTtcblx0XHRcdHRoaXMubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcil7XG5cdFx0XHRcdGlmICggbGF5ZXIuY29uc3RydWN0b3IgPT09IEwuTWFya2VyICkge1xuXHRcdFx0XHRcdG1hcmtlciA9IGxheWVyO1xuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gbWFya2VyO1xuXHRcdH0sXG5cdFx0dXBkYXRlX3Zpc2libGU6IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSA9PT0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnZpc2libGUgPSB0aGlzLiRlbC5pcygnOnZpc2libGUnKTtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgKSB7XG5cdFx0XHRcdHRoaXMubWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHRcdHRoaXMuYmluZF9ldmVudHMoKTtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnVuYmluZF9ldmVudHMoKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW5pdF9hY2Y6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHR0b2dnbGVfY2IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBubyBjaGFuZ2Vcblx0XHRcdFx0XHRzZWxmLnVwZGF0ZV92aXNpYmxlKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdC8vIGV4cGFuZC9jb2xsYXBzZSBhY2Ygc2V0dGluZ1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ3Nob3cnLCB0b2dnbGVfY2IgKTtcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdoaWRlJywgdG9nZ2xlX2NiICk7XG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnZGlzYWJsZV9maWVsZCcsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHNlbGYudW5iaW5kX2V2ZW50cygpO1xuXHRcdFx0fSApO1xuXG5cdFx0XHQvLyBleHBhbmQgd3AgbWV0YWJveFxuXHRcdFx0JChkb2N1bWVudCkub24oJ3Bvc3Rib3gtdG9nZ2xlZCcsIHRvZ2dsZV9jYiApO1xuXHRcdFx0JChkb2N1bWVudCkub24oJ2NsaWNrJywnLndpZGdldC10b3AgKicsIHRvZ2dsZV9jYiApO1xuXG5cblxuXHRcdH0sXG5cdFx0dW5iaW5kX2V2ZW50czpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHNlbGYuJGxhdCgpLm9mZignYmx1cicpO1xuXHRcdFx0c2VsZi4kbG5nKCkub2ZmKCdibHVyJyk7XG5cdFx0XHRzZWxmLiR6b29tKCkub2ZmKCdibHVyJyk7XG5cdFx0XHRzZWxmLiR6b29tKCkub2ZmKCdrZXl1cCBmb2N1cycpO1xuXG5cdFx0XHR0aGlzLm1hcC5vZmYoJ3pvb21lbmQnLCB0aGlzLm1hcF96b29tZWQsIHRoaXMgKTtcblx0XHRcdHRoaXMubWFwLm9mZignbW92ZWVuZCcsIHRoaXMubWFwX21vdmVkLCB0aGlzICk7XG5cdFx0fSxcblx0XHRiaW5kX2V2ZW50czogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHNlbGYuJGxhdCgpLm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51cGRhdGVfbWFwKCk7XG5cdFx0XHR9KTtcblx0XHRcdHNlbGYuJGxuZygpLm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51cGRhdGVfbWFwKCk7XG5cdFx0XHR9KTtcblx0XHRcdHNlbGYuJHpvb20oKS5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYudXBkYXRlX21hcCgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubWFwLm9uKCd6b29tZW5kJywgdGhpcy5tYXBfem9vbWVkLCB0aGlzICk7XG5cdFx0XHR0aGlzLm1hcC5vbignbW92ZWVuZCcsIHRoaXMubWFwX21vdmVkLCB0aGlzICk7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFwOmZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAhIHRoaXMuJGxhdCgpLnZhbCgpIHx8ICEgdGhpcy4kbG5nKCkudmFsKCkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBsYXRsbmcgPSBMLmxhdExuZyggdGhpcy4kbGF0KCkudmFsKCksIHRoaXMuJGxuZygpLnZhbCgpICk7XG5cdFx0XHR0aGlzLm1hcC5zZXRWaWV3KCBsYXRsbmcsICB0aGlzLiR6b29tKCkudmFsKCkgKTtcblx0XHR9LFxuXHRcdG1hcF9tb3ZlZDpmdW5jdGlvbihlKXtcblx0XHRcdHZhciBjZW50ZXIgPSB0aGlzLm1hcC5nZXRDZW50ZXIoKTtcblx0XHRcdHRoaXMuJGxhdCgpLnZhbChjZW50ZXIubGF0KTtcblx0XHRcdHRoaXMuJGxuZygpLnZhbChjZW50ZXIubG5nKTtcblx0XHRcdHRoaXMuJGVsLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdH0sXG5cdFx0bWFwX3pvb21lZDpmdW5jdGlvbihlKXtcblx0XHRcdHRoaXMuJHpvb20oKS52YWwoIHRoaXMubWFwLmdldFpvb20oKSApO1xuXHRcdFx0dGhpcy4kZWwudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0fVxuXHR9KTtcblxuXG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCdhY2Ytb3NtLW1hcC1pbml0JyxmdW5jdGlvbiggZSwgbWFwICkge1xuXHRcdFx0Ly8gZG9uJ3QgaW5pdCBpbiByZXBlYXRlciB0ZW1wbGF0ZXNcblx0XHRcdGlmICggJChlLnRhcmdldCkuY2xvc2VzdCgnW2RhdGEtaWQ9XCJhY2ZjbG9uZWluZGV4XCJdJykubGVuZ3RoICkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdC8vIHdyYXAgb3NtLmZpZWxkIGJhY2tib25lIHZpZXcgYXJvdW5kIGVkaXRvcnNcblx0XHRcdGlmICggJChlLnRhcmdldCkuaXMoJ1tkYXRhLWVkaXRvci1jb25maWddJykgKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHQoZnVuY3Rpb24gY2hlY2tWaXMoKXtcblx0XHRcdFx0XHRpZiAoICEgJChlLnRhcmdldCkuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dChjaGVja1ZpcywyNTApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fSkoKTtcblxuXHRcdFx0XHQkKGUudGFyZ2V0KS5kYXRhKCAnX21hcF9lZGl0b3InLCBuZXcgb3NtLmZpZWxkKCB7IGVsOiBlLnRhcmdldCwgbWFwOiBtYXAgfSApICk7XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQvLyBmaWVsZCBzZXR0aW5nc1xuXHRcdC5vbignY2hhbmdlJywnW2RhdGEtdHlwZT1cIm9wZW5fc3RyZWV0X21hcFwiXSBbZGF0YS1uYW1lPVwicmV0dXJuX2Zvcm1hdFwiXSBpbnB1dCcsZnVuY3Rpb24oZSl7XG5cdFx0XHQvLyBmaW5kIG1hcCBmaWVsZFxuXHRcdFx0JCgnW2RhdGEtbmFtZT1cInJldHVybl9mb3JtYXRcIl0gaW5wdXQ6Y2hlY2tlZCcpLnZhbCgpXG5cdFx0XHR2YXIgJG1hcCA9ICQodGhpcykuY2xvc2VzdCgnLmFjZi1maWVsZC1vYmplY3QnKS5maW5kKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpLFxuXHRcdFx0XHRlZGl0b3IgPSAkbWFwLmRhdGEoICdfbWFwX2VkaXRvcicgKSxcblx0XHRcdFx0Y29uZiA9ICRtYXAuZGF0YSgnZWRpdG9yLWNvbmZpZycpO1xuXHRcdFx0Ly8gbWFwXG5cdFx0XHRlZGl0b3IucmVzZXRfbGF5ZXJzKCk7XG5cdFx0XHRpZiAoICQodGhpcykudmFsKCkgPT09ICdvc20nICkge1xuXHRcdFx0XHQvLyBzZXQgcHJvdmlkZXIgcmVzdHJpY3Rpb24gdG8gb3NtIHByb3ZpZGVyc1xuXHRcdFx0XHRjb25mLnJlc3RyaWN0X3Byb3ZpZGVycyA9IE9iamVjdC52YWx1ZXMoIGFyZy5vcHRpb25zLm9zbV9sYXllcnMgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIHNldCBwcm92aWRlciByZXN0cmljdGlvbiB0byBvc20gcHJvdmlkZXJzXG5cdFx0XHRcdGNvbmYucmVzdHJpY3RfcHJvdmlkZXJzID0gT2JqZWN0LnZhbHVlcyggYXJnLm9wdGlvbnMubGVhZmxldF9sYXllcnMgKTtcblx0XHRcdH1cblx0XHRcdCRtYXAuZGF0YSggJ2VkaXRvci1jb25maWcnLCBjb25mICk7XG5cdFx0XHRlZGl0b3IuaW5pdF9sYXllcnMoKTtcblx0XHR9KTtcblxuXHQvLyBpbml0IHdoZW4gZmllbGRzIGdldCBsb2FkZWQgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdhcHBlbmQnLCBmdW5jdGlvbigpe1xuXHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2h3IC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnc2hvd19maWVsZC90eXBlPW9wZW5fc3RyZWV0X21hcCcsIGZ1bmN0aW9uKCBmaWVsZCApe1xuXHQgICAgdmFyIGVkaXRvciA9IGZpZWxkLiRlbC5maW5kKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpLmRhdGEoICdfbWFwX2VkaXRvcicgKTtcblx0ICAgIGVkaXRvci51cGRhdGVfdmlzaWJsZSgpO1xuXHR9KTtcbn0pKCBqUXVlcnksIGFjZl9vc21fYWRtaW4gKTtcbiJdfQ==
