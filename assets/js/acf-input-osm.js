(function( $, arg, exports ){
	var options = arg.options,
		i18n = arg.i18n,
		result_tpl = '<div tabindex="<%= data.i %>" class="osm-result">'
			+ '<%= data.result_text %>'
			+ '<br /><small><%= data.properties.osm_value %></small>'
			+ '</div>';

	var osm = exports.osm = {
	};
	
	var fixedFloatGetter = function( prop, fix ) {
		return function() {
			return parseFloat( this.attributes[ prop ] );
		}
	}
	var fixedFloatSetter = function( prop, fix ) {
		return function(value) {
			return parseFloat(parseFloat(value).toFixed(fix) );
		}
	}
	var intGetter = function(prop) {
		return function() {
			return parseInt( this.attributes[ prop ] );
		}
	}
	var intSetter = function(prop) {
		return function(value) {
			return parseInt( value );
		}
	}

	var GSModel = Backbone.Model.extend({

		get: function(attr) {
			// Call the getter if available
			if (_.isFunction(this.getters[attr])) {
				return this.getters[attr].call(this);
			}

			return Backbone.Model.prototype.get.call(this, attr);
		},

		set: function(key, value, options) {
			var attrs, attr;

			// Normalize the key-value into an object
			if (_.isObject(key) || key == null) {
				attrs = key;
				options = value;
			} else {
				attrs = {};
				attrs[key] = value;
			}

			// always pass an options hash around. This allows modifying
			// the options inside the setter
			options = options || {};

			// Go over all the set attributes and call the setter if available
			for (attr in attrs) {
				if (_.isFunction(this.setters[attr])) {
					attrs[attr] = this.setters[attr].call(this, attrs[attr], options);
				}
			}

			return Backbone.Model.prototype.set.call(this, attrs, options);
		},

		getters: {},

		setters: {}

	});

	osm.MarkerData = GSModel.extend({
		getters: {
			lat:fixedFloatGetter('lat',6),
			lng:fixedFloatGetter('lng',6),
			zoom:intGetter('zoom'),
		},
		setters: {
			lat:fixedFloatSetter('lat',6),
			lng:fixedFloatSetter('lng',6),
			zoom:intSetter('zoom'),
		},
		isDefaultLabel:function() {
			return this.get('label') === this.get('default_label');
		}
	});
	osm.MarkerCollection = Backbone.Collection.extend({
		model:osm.MarkerData
	});
	
	
	osm.MapData = GSModel.extend({
		getters: {
			center_lat:fixedFloatGetter('center_lat',6),
			center_lng:fixedFloatGetter('center_lng',6),
			zoom:intGetter('zoom'),
		},
		setters: {
			center_lat:fixedFloatSetter('center_lat',6),
			center_lng:fixedFloatSetter('center_lng',6),
			zoom:intSetter('zoom'),
		},
		initialize:function(o) {
			this.set( 'markers', new osm.MarkerCollection(o.markers) );
			GSModel.prototype.initialize.apply(this,arguments)
		}
	});
	osm.MarkerEntry = wp.media.View.extend({
		tagName: 'div',
		className:'osm-marker',
		template:wp.template('osm-marker-input'),
		events: {
			'click [data-name="locate-marker"]' : 'locate_marker',
			'click [data-name="remove-marker"]' : 'remove_marker',
			'change [data-name="label"]'		: 'update_marker_label',
//			'focus [type="text"]'				: 'hilite_marker'
		},
		initialize:function(opt){
			wp.media.View.prototype.initialize.apply(this,arguments);
			this.marker = opt.marker; // leaflet marker
			this.marker.osm_controller = this;
			this.model = opt.model;
			this.listenTo( this.model, 'change:label', this.changedLabel );
			this.listenTo( this.model, 'change:default_label', this.changedDefaultLabel );
			this.listenTo( this.model, 'change:lat', this.changedlatLng );
			this.listenTo( this.model, 'change:lng', this.changedlatLng );
			this.listenTo( this.model, 'destroy', this.remove );
			return this.render();
		},
		changedLabel: function() {
			var label = this.model.get('label');
			this.$('[data-name="label"]').val( label ).trigger('change');

			this.marker.unbindTooltip();
			this.marker.bindTooltip(label);

			this.marker.options.title = label;

			$( this.marker._icon ).attr( 'title', label );

		},
		changedDefaultLabel: function() {
			// update label too, if
			if ( this.model.get('label') === this.model.previous('default_label') ) {
				this.model.set('label', this.model.get('default_label') );
			}
		},
		changedlatLng: function() {
			this.marker.setLatLng( { lat:this.model.get('lat'), lng:this.model.get('lng') } )
		},
		render:function(){
			wp.media.View.prototype.render.apply(this,arguments);
			var self = this;

			this.$el.find('[data-name="label"]')
				.on('focus',function(e) {
					self.hilite_marker();
				})
				.on('blur',function(e) {
					self.lolite_marker();
				})
				.val( this.model.get('label') ).trigger('change');
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
			var label = $(e.target).val();
			if ( '' === label ) {
				label = this.model.get('default_label');
			}
			this.model.set('label', label );
			return this;
		},
		update_marker_geocode:function( label ) {

			if ( this.model.isDefaultLabel() ) {
				// update marker labels
				this.set_marker_label( label );
				// update marker label input
			}

			this.$el.find('[id$="-marker-geocode"]').val( label ).trigger('change');

			this._update_values_from_marker();

			return this;
		},
		_update_values_from_marker: function( ) {
			var latlng = this.marker.getLatLng();
			/*
			this.$el.find('[id$="-marker-lat"]').val( latlng.lat );
			this.$el.find('[id$="-marker-lng"]').val( latlng.lng );
			this.$el.find('[id$="-marker-label"]').val( this.marker.options.title );
			/*/
			this.model.set( 'lat', latlng.lat );
			this.model.set( 'lng', latlng.lng );
			this.model.set( 'label', this.marker.options.title );
			//*/
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
			// click remove
			e.preventDefault();
			this.model.destroy(); // 
			return this;
		}
	});

	osm.Field = Backbone.View.extend({

		map: null,
		geocoder: null,
		visible: null,
		$parent:function(){
			return this.$el.closest('.acf-field-settings,.acf-field-open-street-map')
		},
		$value: function() {
			return this.$parent().find('input.osm-json');
		},
		$results : function() {
			return this.$parent().find('.osm-results');
		},
		$markers:function(){
			return this.$parent().find('.osm-markers');
		},
		preventDefault: function( e ) {
			e.preventDefault();
		},
		initialize:function(conf) {

			var self = this,
				data = this.getMapData(),
				editor_config = this.$el.data().editorConfig;

			this.map		= conf.map;

			this.model		= new osm.MapData(data);

			this.init_acf();

			if ( editor_config.allow_providers ) {
				this.$el.on( 'acf-osm-map-create-layers', this.preventDefault );
				this.initLayers();
			}

			this.$el.on( 'acf-osm-map-create-markers', this.preventDefault );

			this.initMarkers();

			this.listenTo( this.model, 'change', this.updateValue );
			this.listenTo( this.model.get('markers'), 'add', this.addMarker );
			this.listenTo( this.model.get('markers'), 'add', this.updateValue );
			this.listenTo( this.model.get('markers'), 'remove', this.updateValue );
			this.listenTo( this.model.get('markers'), 'change', this.updateValue );
			//this.listenTo( this.model, 'change:layers', console.trace );

			// update on map view change
			this.map.on('zoomend',function(){
				self.model.set('zoom',self.map.getZoom());
			});
			this.map.on('moveend',function(){
				var latlng = self.map.getCenter();
				
				self.model.set('center_lat',latlng.lat );
				self.model.set('center_lng',latlng.lng );
			});

			this.update_visible();

			this.update_map();

			return this;
		},
		getMapData:function() {
			var data = JSON.parse( this.$value().val() );
			data.center_lat = data.center_lat || this.$el.attr('data-map-lat');
			data.center_lng = data.center_lng || this.$el.attr('data-map-lng');
			data.zoom = data.zoom || this.$el.attr('data-map-zoom');
			return data;
		},
		updateValue:function() {
			this.$value().val( JSON.stringify( this.model.toJSON() ) ).trigger('change');
			//this.$el.trigger('change')
		},

		/**
		 *	Markers
		 */
		addMarker:function( model, collection ) {

			var self = this;

			// add marker to map
			var marker = L.marker( { lat: model.get('lat'), lng: model.get('lng') }, {
					title: model.get('label'),
					icon: this.icon,
				})
				.bindTooltip( model.get('label') );

			// 
			var entry = new osm.MarkerEntry({
				controller: this,
				marker: marker,
				model: model
			});

			this.map.once('layeradd',function(e){
				marker
					.on('click',function(e){
						model.destroy();
					})
					.on('dragend',function(e){
						// update model lnglat
						var latlng = this.getLatLng();
						model.set( 'lat', latlng.lat );
						model.set( 'lng', latlng.lng );
						self.reverseGeocode( model );
						// geocode, get label, set model label...
					})
					.dragging.enable();
				entry.$el.appendTo( self.$markers() );
			});

			model.on('destroy',function(){
				marker.remove();
			});

			marker.addTo( this.map );

		},
		initMarkers:function(){

			var self = this,
				editor_config = this.$el.data().editorConfig;

			this.initGeocode();

			// no markers allowed!
			if ( editor_config.max_markers === 0 ) {
				return;
			}

			this.icon = new L.DivIcon({
				html: '',
				className:'osm-marker-icon'
			});

			this.model.get('markers').forEach( function( model ) {
				self.addMarker( model );
			} );

			this.map.on('dblclick', function(e){
				var latlng = e.latlng,
					count_markers = self.$markers().children().not('[data-id]').length,
					model;
				
				e.originalEvent.preventDefault();
				e.originalEvent.stopPropagation();
				// no more markers
				if ( editor_config.max_markers !== false && count_markers >= editor_config.max_markers ) {
					return;
				}
				model = new osm.MarkerData({
					label: '',
					default_label: '',
					lat: latlng.lat,
					lng: latlng.lng,
//					collection:self.model.get('markers')
				})
				self.model.get('markers').add( model );
				self.reverseGeocode(model);
			})
			.doubleClickZoom.disable(); 
		},

		/**
		 *	Geocoding
		 *
		 *	@on map.layeradd, layer.dragend
		 */
		 initGeocode:function() {

 			var self = this,
 				editor_config = this.$el.data().editorConfig,
				$above = this.$el.prev();
			if ( ! $above.is( '.acf-osm-above' ) ) {
				$above = $('<div class="acf-osm-above"></div>').insertBefore( this.$el );
			} else {
				$above.html('');				
			}
			// add an extra control panel region for out search
 			this.map._controlCorners['above'] = $above.get(0);

 			this.geocoder = L.Control.geocoder({
 				collapsed: false,
 				position:'above',
 				placeholder:i18n.search,
 				errorMessage:i18n.nothing_found,
 				showResultIcons:true,
 				suggestMinLength:3,
 				suggestTimeout:250,
 				queryMinLength:3,
 				defaultMarkGeocode:false,
 			})
 			.on('markgeocode',function(e){
 				// search result click
 				var latlng =  e.geocode.center,
 					editor_config = self.$el.data().editorConfig,
 					count_markers = self.model.get('markers').length,
 					label = self.parseGeocodeResult( [ e.geocode ], latlng ),
 					marker_data = {
 						label: label,
 						default_label: label,
 						lat: latlng.lat,
 						lng: latlng.lng
 					}, 
 					model;

 				if ( editor_config.max_markers === 0 ) {

 					return self.map.fitBounds( e.geocode.bbox );

 				}
 				if ( count_markers < editor_config.max_markers ) {

 					self.model.get('markers').add( marker_data );

 				} else if ( editor_config.max_markers === 1 ) {
 					self.model.get('markers').at(0).set( marker_data );

 				}

 				self.map.setView( latlng, self.map.getZoom() ); // keep zoom, might be confusing else

 			})
 			.addTo( this.map );

 		},
		reverseGeocode:function( model ) {
			var self = this, 
				latlng = { lat: model.get('lat'), lng: model.get('lng') };
			this.geocoder.options.geocoder.reverse( 
				latlng, 
				self.map.getZoom(), 
				function( results ) {
					model.set('default_label', self.parseGeocodeResult( results, latlng ) );
				}
			);
		},
		parseGeocodeResult: function( results, latlng ) {
			var label = false;

			if ( ! results.length ) {
				// https://xkcd.com/2170/
				label = latlng.lat + ', ' + latlng.lng;
			} else {
				$.each( results, function( i, result ) {
					if ( !! result.html ) {
						label = $('<p>'+result.html+'</p>').text().trim().replace(/(\s+)/g,' ');
					} else {
						label = result.name;
					}
					return false;
				});
			}
			// trim
			return label;
		},



		/**
		 *	Layers
	 	*/
		initLayers:function() {
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

 			selectedLayers = this.model.get('layers'); // should be layer store value

 			// filter avaialble layers in field value
 			if ( editor_config.restrict_providers !== false && _.isArray( editor_config.restrict_providers ) ) {
 				selectedLayers = selectedLayers.filter( function(el) {
 					return editor_config.restrict_providers.indexOf( el ) !== -1;
 				});
 			}

 			// set default layer
 			if ( ! selectedLayers.length ) {

 				selectedLayers = editor_config.restrict_providers.slice( 0, 1 );

 			}

 			// editable layers!

			this.map.on( 'baselayerchange layeradd layerremove', function(e){
			
				if ( ! e.layer.providerKey ) {
					return;
				}
				var layers = [];

				self.map.eachLayer(function(layer) {
					if ( ! layer.providerKey ) {
						return;
					}

					if ( self.layer_is_overlay( layer.providerKey, layer ) ) {
						layers.push( layer.providerKey )
					} else {
						layers.unshift( layer.providerKey )
					}
				});
				self.model.set( 'layers', layers );
			} );

 			$.each( editor_config.restrict_providers, setupMap );
			
			this.layersControl = L.control.layers( baseLayers, overlays, {
				collapsed: true,
				hideSingleBase: true,
			}).addTo(this.map);
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
		resetLayers:function() {
			// remove all map layers
			this.map.eachLayer(function(layer){
				if ( layer.constructor === L.TileLayer.Provider ) {
					layer.remove();
				}
			})

			// remove layer control
			!! this.layersControl && this.layersControl.remove()
		},
		update_visible: function() {

			if ( this.visible === this.$el.is(':visible') ) {
				return this;
			}

			this.visible = this.$el.is(':visible');

			if ( this.visible ) {
				this.map.invalidateSize();
			}
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

			// expand wp metabox
			$(document).on('postbox-toggled', toggle_cb );
			$(document).on('click','.widget-top *', toggle_cb );

		},
		update_map:function() {
			var latlng = { lat: this.model.get('center_lat'), lng: this.model.get('center_lng') }
			this.map.setView( 
				latlng,
				this.model.get('zoom') 
			);
		}
	});


	$(document)
		.on( 'acf-osm-map-create', function( e ) {
			// don't init in repeater templates
			if ( $(e.target).closest('[data-id="acfcloneindex"]').length ) {
				e.preventDefault();
				return;
			}
		})
		.on( 'acf-osm-map-init', function( e, map ) {
			var editor;
			// wrap osm.Field backbone view around editors
			if ( $(e.target).is('[data-editor-config]') ) {
				// e.preventDefault();

				(function checkVis(){
					if ( ! $(e.target).is(':visible') ) {
						return setTimeout( checkVis, 250 );
					}
					map.invalidateSize();
				})();
				editor = new osm.Field( { el: e.target, map: map } );
				$(e.target).data( '_map_editor', editor );
			}
		});
//	acf.addAction( 'new_field', function(field){console.log(field)} );
	// init when fields get loaded ...
	acf.addAction( 'append', function(){
		$.acf_leaflet();
	});
	// init when fields shw ...
	acf.addAction( 'show_field', function( field ) {

		if ( 'open_street_map' !== field.type ) {
			return;
		}
	    var editor = field.$el.find('[data-editor-config]').data( '_map_editor' );
	    editor.update_visible();
	});
})( jQuery, acf_osm_admin, window );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWlucHV0LW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvcHRpb25zID0gYXJnLm9wdGlvbnMsXG5cdFx0aTE4biA9IGFyZy5pMThuLFxuXHRcdHJlc3VsdF90cGwgPSAnPGRpdiB0YWJpbmRleD1cIjwlPSBkYXRhLmkgJT5cIiBjbGFzcz1cIm9zbS1yZXN1bHRcIj4nXG5cdFx0XHQrICc8JT0gZGF0YS5yZXN1bHRfdGV4dCAlPidcblx0XHRcdCsgJzxiciAvPjxzbWFsbD48JT0gZGF0YS5wcm9wZXJ0aWVzLm9zbV92YWx1ZSAlPjwvc21hbGw+J1xuXHRcdFx0KyAnPC9kaXY+JztcblxuXHR2YXIgb3NtID0gZXhwb3J0cy5vc20gPSB7XG5cdH07XG5cdFxuXHR2YXIgZml4ZWRGbG9hdEdldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBmaXhlZEZsb2F0U2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHBhcnNlRmxvYXQodmFsdWUpLnRvRml4ZWQoZml4KSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50R2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGludFNldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdmFsdWUgKTtcblx0XHR9XG5cdH1cblxuXHR2YXIgR1NNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cblx0XHRnZXQ6IGZ1bmN0aW9uKGF0dHIpIHtcblx0XHRcdC8vIENhbGwgdGhlIGdldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5nZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXR0ZXJzW2F0dHJdLmNhbGwodGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywgYXR0cik7XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykge1xuXHRcdFx0dmFyIGF0dHJzLCBhdHRyO1xuXG5cdFx0XHQvLyBOb3JtYWxpemUgdGhlIGtleS12YWx1ZSBpbnRvIGFuIG9iamVjdFxuXHRcdFx0aWYgKF8uaXNPYmplY3Qoa2V5KSB8fCBrZXkgPT0gbnVsbCkge1xuXHRcdFx0XHRhdHRycyA9IGtleTtcblx0XHRcdFx0b3B0aW9ucyA9IHZhbHVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXR0cnMgPSB7fTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHZhbHVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBhbHdheXMgcGFzcyBhbiBvcHRpb25zIGhhc2ggYXJvdW5kLiBUaGlzIGFsbG93cyBtb2RpZnlpbmdcblx0XHRcdC8vIHRoZSBvcHRpb25zIGluc2lkZSB0aGUgc2V0dGVyXG5cdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdFx0Ly8gR28gb3ZlciBhbGwgdGhlIHNldCBhdHRyaWJ1dGVzIGFuZCBjYWxsIHRoZSBzZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRmb3IgKGF0dHIgaW4gYXR0cnMpIHtcblx0XHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLnNldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdFx0YXR0cnNbYXR0cl0gPSB0aGlzLnNldHRlcnNbYXR0cl0uY2FsbCh0aGlzLCBhdHRyc1thdHRyXSwgb3B0aW9ucyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRycywgb3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGdldHRlcnM6IHt9LFxuXG5cdFx0c2V0dGVyczoge31cblxuXHR9KTtcblxuXHRvc20uTWFya2VyRGF0YSA9IEdTTW9kZWwuZXh0ZW5kKHtcblx0XHRnZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdEdldHRlcignbGF0Jyw2KSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0R2V0dGVyKCdsbmcnLDYpLFxuXHRcdFx0em9vbTppbnRHZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0U2V0dGVyKCdsYXQnLDYpLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRTZXR0ZXIoJ2xuZycsNiksXG5cdFx0XHR6b29tOmludFNldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0aXNEZWZhdWx0TGFiZWw6ZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXQoJ2xhYmVsJykgPT09IHRoaXMuZ2V0KCdkZWZhdWx0X2xhYmVsJyk7XG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdFx0bW9kZWw6b3NtLk1hcmtlckRhdGFcblx0fSk7XG5cdFxuXHRcblx0b3NtLk1hcERhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0Y2VudGVyX2xhdDpmaXhlZEZsb2F0R2V0dGVyKCdjZW50ZXJfbGF0Jyw2KSxcblx0XHRcdGNlbnRlcl9sbmc6Zml4ZWRGbG9hdEdldHRlcignY2VudGVyX2xuZycsNiksXG5cdFx0XHR6b29tOmludEdldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0Y2VudGVyX2xhdDpmaXhlZEZsb2F0U2V0dGVyKCdjZW50ZXJfbGF0Jyw2KSxcblx0XHRcdGNlbnRlcl9sbmc6Zml4ZWRGbG9hdFNldHRlcignY2VudGVyX2xuZycsNiksXG5cdFx0XHR6b29tOmludFNldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvKSB7XG5cdFx0XHR0aGlzLnNldCggJ21hcmtlcnMnLCBuZXcgb3NtLk1hcmtlckNvbGxlY3Rpb24oby5tYXJrZXJzKSApO1xuXHRcdFx0R1NNb2RlbC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cylcblx0XHR9XG5cdH0pO1xuXHRvc20uTWFya2VyRW50cnkgPSB3cC5tZWRpYS5WaWV3LmV4dGVuZCh7XG5cdFx0dGFnTmFtZTogJ2RpdicsXG5cdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyJyxcblx0XHR0ZW1wbGF0ZTp3cC50ZW1wbGF0ZSgnb3NtLW1hcmtlci1pbnB1dCcpLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJsb2NhdGUtbWFya2VyXCJdJyA6ICdsb2NhdGVfbWFya2VyJyxcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwicmVtb3ZlLW1hcmtlclwiXScgOiAncmVtb3ZlX21hcmtlcicsXG5cdFx0XHQnY2hhbmdlIFtkYXRhLW5hbWU9XCJsYWJlbFwiXSdcdFx0OiAndXBkYXRlX21hcmtlcl9sYWJlbCcsXG4vL1x0XHRcdCdmb2N1cyBbdHlwZT1cInRleHRcIl0nXHRcdFx0XHQ6ICdoaWxpdGVfbWFya2VyJ1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvcHQpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLm1hcmtlciA9IG9wdC5tYXJrZXI7IC8vIGxlYWZsZXQgbWFya2VyXG5cdFx0XHR0aGlzLm1hcmtlci5vc21fY29udHJvbGxlciA9IHRoaXM7XG5cdFx0XHR0aGlzLm1vZGVsID0gb3B0Lm1vZGVsO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYWJlbCcsIHRoaXMuY2hhbmdlZExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmRlZmF1bHRfbGFiZWwnLCB0aGlzLmNoYW5nZWREZWZhdWx0TGFiZWwgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF0JywgdGhpcy5jaGFuZ2VkbGF0TG5nICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxuZycsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2Rlc3Ryb3knLCB0aGlzLnJlbW92ZSApO1xuXHRcdFx0cmV0dXJuIHRoaXMucmVuZGVyKCk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkTGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJyk7XG5cdFx0XHR0aGlzLiQoJ1tkYXRhLW5hbWU9XCJsYWJlbFwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIudW5iaW5kVG9vbHRpcCgpO1xuXHRcdFx0dGhpcy5tYXJrZXIuYmluZFRvb2x0aXAobGFiZWwpO1xuXG5cdFx0XHR0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlID0gbGFiZWw7XG5cblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkuYXR0ciggJ3RpdGxlJywgbGFiZWwgKTtcblxuXHRcdH0sXG5cdFx0Y2hhbmdlZERlZmF1bHRMYWJlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyB1cGRhdGUgbGFiZWwgdG9vLCBpZlxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSA9PT0gdGhpcy5tb2RlbC5wcmV2aW91cygnZGVmYXVsdF9sYWJlbCcpICkge1xuXHRcdFx0XHR0aGlzLm1vZGVsLnNldCgnbGFiZWwnLCB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjaGFuZ2VkbGF0TG5nOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMubWFya2VyLnNldExhdExuZyggeyBsYXQ6dGhpcy5tb2RlbC5nZXQoJ2xhdCcpLCBsbmc6dGhpcy5tb2RlbC5nZXQoJ2xuZycpIH0gKVxuXHRcdH0sXG5cdFx0cmVuZGVyOmZ1bmN0aW9uKCl7XG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQudmFsKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0JCh0aGlzLm1hcmtlci5faWNvbilcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5sb2xpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfbGFiZWw6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIGxhYmVsID0gJChlLnRhcmdldCkudmFsKCk7XG5cdFx0XHRpZiAoICcnID09PSBsYWJlbCApIHtcblx0XHRcdFx0bGFiZWwgPSB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgbGFiZWwgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlX21hcmtlcl9nZW9jb2RlOmZ1bmN0aW9uKCBsYWJlbCApIHtcblxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmlzRGVmYXVsdExhYmVsKCkgKSB7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWxzXG5cdFx0XHRcdHRoaXMuc2V0X21hcmtlcl9sYWJlbCggbGFiZWwgKTtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbCBpbnB1dFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1nZW9jb2RlXCJdJykudmFsKCBsYWJlbCApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG5cdFx0XHR0aGlzLl91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyKCk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0X3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXI6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKTtcblx0XHRcdC8qXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYXRcIl0nKS52YWwoIGxhdGxuZy5sYXQgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxuZ1wiXScpLnZhbCggbGF0bG5nLmxuZyApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGFiZWxcIl0nKS52YWwoIHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdC8qL1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGFiZWwnLCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvLyovXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGhpbGl0ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2ZvY3VzJyk7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmFkZENsYXNzKCdmb2N1cycpXG5cdFx0fSxcblx0XHRsb2xpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5yZW1vdmVDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9jYXRlX21hcmtlcjpmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5tYXJrZXIuX21hcC5mbHlUbyggdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCkgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cmVtb3ZlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHQvLyBjbGljayByZW1vdmVcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMubW9kZWwuZGVzdHJveSgpOyAvLyBcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSk7XG5cblx0b3NtLkZpZWxkID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG5cdFx0bWFwOiBudWxsLFxuXHRcdGdlb2NvZGVyOiBudWxsLFxuXHRcdHZpc2libGU6IG51bGwsXG5cdFx0JHBhcmVudDpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MsLmFjZi1maWVsZC1vcGVuLXN0cmVldC1tYXAnKVxuXHRcdH0sXG5cdFx0JHZhbHVlOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCdpbnB1dC5vc20tanNvbicpO1xuXHRcdH0sXG5cdFx0JHJlc3VsdHMgOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCcub3NtLXJlc3VsdHMnKTtcblx0XHR9LFxuXHRcdCRtYXJrZXJzOmZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1tYXJrZXJzJyk7XG5cdFx0fSxcblx0XHRwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKGNvbmYpIHtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRkYXRhID0gdGhpcy5nZXRNYXBEYXRhKCksXG5cdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLm1hcFx0XHQ9IGNvbmYubWFwO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLmluaXRfYWNmKCk7XG5cblx0XHRcdGlmICggZWRpdG9yX2NvbmZpZy5hbGxvd19wcm92aWRlcnMgKSB7XG5cdFx0XHRcdHRoaXMuJGVsLm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlLWxheWVycycsIHRoaXMucHJldmVudERlZmF1bHQgKTtcblx0XHRcdFx0dGhpcy5pbml0TGF5ZXJzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGVsLm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlLW1hcmtlcnMnLCB0aGlzLnByZXZlbnREZWZhdWx0ICk7XG5cblx0XHRcdHRoaXMuaW5pdE1hcmtlcnMoKTtcblxuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLmFkZE1hcmtlciApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdyZW1vdmUnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0Ly90aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxheWVycycsIGNvbnNvbGUudHJhY2UgKTtcblxuXHRcdFx0Ly8gdXBkYXRlIG9uIG1hcCB2aWV3IGNoYW5nZVxuXHRcdFx0dGhpcy5tYXAub24oJ3pvb21lbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCd6b29tJyxzZWxmLm1hcC5nZXRab29tKCkpO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1hcC5vbignbW92ZWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IHNlbGYubWFwLmdldENlbnRlcigpO1xuXHRcdFx0XHRcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2NlbnRlcl9sYXQnLGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2NlbnRlcl9sbmcnLGxhdGxuZy5sbmcgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV92aXNpYmxlKCk7XG5cblx0XHRcdHRoaXMudXBkYXRlX21hcCgpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGdldE1hcERhdGE6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IEpTT04ucGFyc2UoIHRoaXMuJHZhbHVlKCkudmFsKCkgKTtcblx0XHRcdGRhdGEuY2VudGVyX2xhdCA9IGRhdGEuY2VudGVyX2xhdCB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC1sYXQnKTtcblx0XHRcdGRhdGEuY2VudGVyX2xuZyA9IGRhdGEuY2VudGVyX2xuZyB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC1sbmcnKTtcblx0XHRcdGRhdGEuem9vbSA9IGRhdGEuem9vbSB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC16b29tJyk7XG5cdFx0XHRyZXR1cm4gZGF0YTtcblx0XHR9LFxuXHRcdHVwZGF0ZVZhbHVlOmZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kdmFsdWUoKS52YWwoIEpTT04uc3RyaW5naWZ5KCB0aGlzLm1vZGVsLnRvSlNPTigpICkgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdC8vdGhpcy4kZWwudHJpZ2dlcignY2hhbmdlJylcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICpcdE1hcmtlcnNcblx0XHQgKi9cblx0XHRhZGRNYXJrZXI6ZnVuY3Rpb24oIG1vZGVsLCBjb2xsZWN0aW9uICkge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdC8vIGFkZCBtYXJrZXIgdG8gbWFwXG5cdFx0XHR2YXIgbWFya2VyID0gTC5tYXJrZXIoIHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfSwge1xuXHRcdFx0XHRcdHRpdGxlOiBtb2RlbC5nZXQoJ2xhYmVsJyksXG5cdFx0XHRcdFx0aWNvbjogdGhpcy5pY29uLFxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYmluZFRvb2x0aXAoIG1vZGVsLmdldCgnbGFiZWwnKSApO1xuXG5cdFx0XHQvLyBcblx0XHRcdHZhciBlbnRyeSA9IG5ldyBvc20uTWFya2VyRW50cnkoe1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLFxuXHRcdFx0XHRtYXJrZXI6IG1hcmtlcixcblx0XHRcdFx0bW9kZWw6IG1vZGVsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tYXAub25jZSgnbGF5ZXJhZGQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRtYXJrZXJcblx0XHRcdFx0XHQub24oJ2NsaWNrJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdG1vZGVsLmRlc3Ryb3koKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5vbignZHJhZ2VuZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHQvLyB1cGRhdGUgbW9kZWwgbG5nbGF0XG5cdFx0XHRcdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5nZXRMYXRMbmcoKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xhdCcsIGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdFx0XHRcdHNlbGYucmV2ZXJzZUdlb2NvZGUoIG1vZGVsICk7XG5cdFx0XHRcdFx0XHQvLyBnZW9jb2RlLCBnZXQgbGFiZWwsIHNldCBtb2RlbCBsYWJlbC4uLlxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmRyYWdnaW5nLmVuYWJsZSgpO1xuXHRcdFx0XHRlbnRyeS4kZWwuYXBwZW5kVG8oIHNlbGYuJG1hcmtlcnMoKSApO1xuXHRcdFx0fSk7XG5cblx0XHRcdG1vZGVsLm9uKCdkZXN0cm95JyxmdW5jdGlvbigpe1xuXHRcdFx0XHRtYXJrZXIucmVtb3ZlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bWFya2VyLmFkZFRvKCB0aGlzLm1hcCApO1xuXG5cdFx0fSxcblx0XHRpbml0TWFya2VyczpmdW5jdGlvbigpe1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLmluaXRHZW9jb2RlKCk7XG5cblx0XHRcdC8vIG5vIG1hcmtlcnMgYWxsb3dlZCFcblx0XHRcdGlmICggZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmljb24gPSBuZXcgTC5EaXZJY29uKHtcblx0XHRcdFx0aHRtbDogJycsXG5cdFx0XHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlci1pY29uJ1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJykuZm9yRWFjaCggZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0XHRzZWxmLmFkZE1hcmtlciggbW9kZWwgKTtcblx0XHRcdH0gKTtcblxuXHRcdFx0dGhpcy5tYXAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBlLmxhdGxuZyxcblx0XHRcdFx0XHRjb3VudF9tYXJrZXJzID0gc2VsZi4kbWFya2VycygpLmNoaWxkcmVuKCkubm90KCdbZGF0YS1pZF0nKS5sZW5ndGgsXG5cdFx0XHRcdFx0bW9kZWw7XG5cdFx0XHRcdFxuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0ZS5vcmlnaW5hbEV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHQvLyBubyBtb3JlIG1hcmtlcnNcblx0XHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzICE9PSBmYWxzZSAmJiBjb3VudF9tYXJrZXJzID49IGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG1vZGVsID0gbmV3IG9zbS5NYXJrZXJEYXRhKHtcblx0XHRcdFx0XHRsYWJlbDogJycsXG5cdFx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogJycsXG5cdFx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuXHRcdFx0XHRcdGxuZzogbGF0bG5nLmxuZyxcbi8vXHRcdFx0XHRcdGNvbGxlY3Rpb246c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKVxuXHRcdFx0XHR9KVxuXHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmFkZCggbW9kZWwgKTtcblx0XHRcdFx0c2VsZi5yZXZlcnNlR2VvY29kZShtb2RlbCk7XG5cdFx0XHR9KVxuXHRcdFx0LmRvdWJsZUNsaWNrWm9vbS5kaXNhYmxlKCk7IFxuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKlx0R2VvY29kaW5nXG5cdFx0ICpcblx0XHQgKlx0QG9uIG1hcC5sYXllcmFkZCwgbGF5ZXIuZHJhZ2VuZFxuXHRcdCAqL1xuXHRcdCBpbml0R2VvY29kZTpmdW5jdGlvbigpIHtcblxuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcbiBcdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnLFxuXHRcdFx0XHQkYWJvdmUgPSB0aGlzLiRlbC5wcmV2KCk7XG5cdFx0XHRpZiAoICEgJGFib3ZlLmlzKCAnLmFjZi1vc20tYWJvdmUnICkgKSB7XG5cdFx0XHRcdCRhYm92ZSA9ICQoJzxkaXYgY2xhc3M9XCJhY2Ytb3NtLWFib3ZlXCI+PC9kaXY+JykuaW5zZXJ0QmVmb3JlKCB0aGlzLiRlbCApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JGFib3ZlLmh0bWwoJycpO1x0XHRcdFx0XG5cdFx0XHR9XG5cdFx0XHQvLyBhZGQgYW4gZXh0cmEgY29udHJvbCBwYW5lbCByZWdpb24gZm9yIG91dCBzZWFyY2hcbiBcdFx0XHR0aGlzLm1hcC5fY29udHJvbENvcm5lcnNbJ2Fib3ZlJ10gPSAkYWJvdmUuZ2V0KDApO1xuXG4gXHRcdFx0dGhpcy5nZW9jb2RlciA9IEwuQ29udHJvbC5nZW9jb2Rlcih7XG4gXHRcdFx0XHRjb2xsYXBzZWQ6IGZhbHNlLFxuIFx0XHRcdFx0cG9zaXRpb246J2Fib3ZlJyxcbiBcdFx0XHRcdHBsYWNlaG9sZGVyOmkxOG4uc2VhcmNoLFxuIFx0XHRcdFx0ZXJyb3JNZXNzYWdlOmkxOG4ubm90aGluZ19mb3VuZCxcbiBcdFx0XHRcdHNob3dSZXN1bHRJY29uczp0cnVlLFxuIFx0XHRcdFx0c3VnZ2VzdE1pbkxlbmd0aDozLFxuIFx0XHRcdFx0c3VnZ2VzdFRpbWVvdXQ6MjUwLFxuIFx0XHRcdFx0cXVlcnlNaW5MZW5ndGg6MyxcbiBcdFx0XHRcdGRlZmF1bHRNYXJrR2VvY29kZTpmYWxzZSxcbiBcdFx0XHR9KVxuIFx0XHRcdC5vbignbWFya2dlb2NvZGUnLGZ1bmN0aW9uKGUpe1xuIFx0XHRcdFx0Ly8gc2VhcmNoIHJlc3VsdCBjbGlja1xuIFx0XHRcdFx0dmFyIGxhdGxuZyA9ICBlLmdlb2NvZGUuY2VudGVyLFxuIFx0XHRcdFx0XHRlZGl0b3JfY29uZmlnID0gc2VsZi4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZyxcbiBcdFx0XHRcdFx0Y291bnRfbWFya2VycyA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykubGVuZ3RoLFxuIFx0XHRcdFx0XHRsYWJlbCA9IHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCBbIGUuZ2VvY29kZSBdLCBsYXRsbmcgKSxcbiBcdFx0XHRcdFx0bWFya2VyX2RhdGEgPSB7XG4gXHRcdFx0XHRcdFx0bGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGRlZmF1bHRfbGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcbiBcdFx0XHRcdFx0XHRsbmc6IGxhdGxuZy5sbmdcbiBcdFx0XHRcdFx0fSwgXG4gXHRcdFx0XHRcdG1vZGVsO1xuXG4gXHRcdFx0XHRpZiAoIGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYubWFwLmZpdEJvdW5kcyggZS5nZW9jb2RlLmJib3ggKTtcblxuIFx0XHRcdFx0fVxuIFx0XHRcdFx0aWYgKCBjb3VudF9tYXJrZXJzIDwgZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyApIHtcblxuIFx0XHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmFkZCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fSBlbHNlIGlmICggZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyA9PT0gMSApIHtcbiBcdFx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hdCgwKS5zZXQoIG1hcmtlcl9kYXRhICk7XG5cbiBcdFx0XHRcdH1cblxuIFx0XHRcdFx0c2VsZi5tYXAuc2V0VmlldyggbGF0bG5nLCBzZWxmLm1hcC5nZXRab29tKCkgKTsgLy8ga2VlcCB6b29tLCBtaWdodCBiZSBjb25mdXNpbmcgZWxzZVxuXG4gXHRcdFx0fSlcbiBcdFx0XHQuYWRkVG8oIHRoaXMubWFwICk7XG5cbiBcdFx0fSxcblx0XHRyZXZlcnNlR2VvY29kZTpmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsIFxuXHRcdFx0XHRsYXRsbmcgPSB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH07XG5cdFx0XHR0aGlzLmdlb2NvZGVyLm9wdGlvbnMuZ2VvY29kZXIucmV2ZXJzZSggXG5cdFx0XHRcdGxhdGxuZywgXG5cdFx0XHRcdHNlbGYubWFwLmdldFpvb20oKSwgXG5cdFx0XHRcdGZ1bmN0aW9uKCByZXN1bHRzICkge1xuXHRcdFx0XHRcdG1vZGVsLnNldCgnZGVmYXVsdF9sYWJlbCcsIHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCByZXN1bHRzLCBsYXRsbmcgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH0sXG5cdFx0cGFyc2VHZW9jb2RlUmVzdWx0OiBmdW5jdGlvbiggcmVzdWx0cywgbGF0bG5nICkge1xuXHRcdFx0dmFyIGxhYmVsID0gZmFsc2U7XG5cblx0XHRcdGlmICggISByZXN1bHRzLmxlbmd0aCApIHtcblx0XHRcdFx0Ly8gaHR0cHM6Ly94a2NkLmNvbS8yMTcwL1xuXHRcdFx0XHRsYWJlbCA9IGxhdGxuZy5sYXQgKyAnLCAnICsgbGF0bG5nLmxuZztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzdWx0cywgZnVuY3Rpb24oIGksIHJlc3VsdCApIHtcblx0XHRcdFx0XHRpZiAoICEhIHJlc3VsdC5odG1sICkge1xuXHRcdFx0XHRcdFx0bGFiZWwgPSAkKCc8cD4nK3Jlc3VsdC5odG1sKyc8L3A+JykudGV4dCgpLnRyaW0oKS5yZXBsYWNlKC8oXFxzKykvZywnICcpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYWJlbCA9IHJlc3VsdC5uYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdHJpbVxuXHRcdFx0cmV0dXJuIGxhYmVsO1xuXHRcdH0sXG5cblxuXG5cdFx0LyoqXG5cdFx0ICpcdExheWVyc1xuXHQgXHQqL1xuXHRcdGluaXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gW10sXG5cdFx0XHRcdGJhc2VMYXllcnMgPSB7fSxcblx0XHRcdFx0b3ZlcmxheXMgPSB7fSxcblx0XHRcdFx0bWFwTGF5ZXJzID0ge30sXG5cdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnLFxuXHRcdFx0XHRpc19vbWl0dGVkID0gZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGtleSA9PT0gbnVsbCB8fCAoICEhIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICYmIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGtleSApID09PSAtMSApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzZXR1cE1hcCA9IGZ1bmN0aW9uKCB2YWwsIGtleSApe1xuXHRcdFx0XHRcdHZhciBsYXllciwgbGF5ZXJfY29uZmlnO1xuXHRcdFx0XHRcdGlmICggXy5pc09iamVjdCh2YWwpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICQuZWFjaCggdmFsLCBzZXR1cE1hcCApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggaXNfb21pdHRlZChrZXkpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICEhIG1hcExheWVyc1sga2V5IF0gKSB7XG5cdFx0XHRcdFx0XHRsYXllciA9IG1hcExheWVyc1sga2V5IF07XG5cdFx0XHRcdFx0XHRzZWxmLm1hcC5hZGRMYXllcihsYXllcilcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0bGF5ZXIgPSBMLnRpbGVMYXllci5wcm92aWRlcigga2V5IC8qLCBsYXllcl9jb25maWcub3B0aW9ucyovICk7XG5cdFx0XHRcdFx0XHR9IGNhdGNoKGV4KSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGxheWVyLnByb3ZpZGVyS2V5ID0ga2V5O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBrZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRvdmVybGF5c1trZXldID0gbGF5ZXI7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGJhc2VMYXllcnNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZWN0ZWRMYXllcnMuaW5kZXhPZigga2V5ICkgIT09IC0xICkge1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpO1xuIFx0XHRcdFx0XHR9XG4gXHRcdFx0XHR9O1xuXG4gXHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLm1vZGVsLmdldCgnbGF5ZXJzJyk7IC8vIHNob3VsZCBiZSBsYXllciBzdG9yZSB2YWx1ZVxuXG4gXHRcdFx0Ly8gZmlsdGVyIGF2YWlhbGJsZSBsYXllcnMgaW4gZmllbGQgdmFsdWVcbiBcdFx0XHRpZiAoIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICE9PSBmYWxzZSAmJiBfLmlzQXJyYXkoIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICkgKSB7XG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHNlbGVjdGVkTGF5ZXJzLmZpbHRlciggZnVuY3Rpb24oZWwpIHtcbiBcdFx0XHRcdFx0cmV0dXJuIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGVsICkgIT09IC0xO1xuIFx0XHRcdFx0fSk7XG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gc2V0IGRlZmF1bHQgbGF5ZXJcbiBcdFx0XHRpZiAoICEgc2VsZWN0ZWRMYXllcnMubGVuZ3RoICkge1xuXG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLnNsaWNlKCAwLCAxICk7XG5cbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBlZGl0YWJsZSBsYXllcnMhXG5cblx0XHRcdHRoaXMubWFwLm9uKCAnYmFzZWxheWVyY2hhbmdlIGxheWVyYWRkIGxheWVycmVtb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcblx0XHRcdFx0aWYgKCAhIGUubGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBsYXllcnMgPSBbXTtcblxuXHRcdFx0XHRzZWxmLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHtcblx0XHRcdFx0XHRpZiAoICEgbGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0bGF5ZXJzLnB1c2goIGxheWVyLnByb3ZpZGVyS2V5IClcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGF5ZXJzLnVuc2hpZnQoIGxheWVyLnByb3ZpZGVyS2V5IClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2xheWVycycsIGxheWVycyApO1xuXHRcdFx0fSApO1xuXG4gXHRcdFx0JC5lYWNoKCBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycywgc2V0dXBNYXAgKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5sYXllcnNDb250cm9sID0gTC5jb250cm9sLmxheWVycyggYmFzZUxheWVycywgb3ZlcmxheXMsIHtcblx0XHRcdFx0Y29sbGFwc2VkOiB0cnVlLFxuXHRcdFx0XHRoaWRlU2luZ2xlQmFzZTogdHJ1ZSxcblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcbiBcdFx0fSxcblx0XHRsYXllcl9pc19vdmVybGF5OiBmdW5jdGlvbiggIGtleSwgbGF5ZXIgKSB7XG5cdFx0XHR2YXIgcGF0dGVybnM7XG5cblx0XHRcdGlmICggbGF5ZXIub3B0aW9ucy5vcGFjaXR5ICYmIGxheWVyLm9wdGlvbnMub3BhY2l0eSA8IDEgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cGF0dGVybnMgPSBbJ14oT3BlbldlYXRoZXJNYXB8T3BlblNlYU1hcCknLFxuXHRcdFx0XHQnT3Blbk1hcFN1cmZlci5BZG1pbkJvdW5kcycsXG5cdFx0XHRcdCdTdGFtZW4uVG9uZXIoSHlicmlkfExpbmVzfExhYmVscyknLFxuXHRcdFx0XHQnQWNldGF0ZS4oZm9yZWdyb3VuZHxsYWJlbHN8cm9hZHMpJyxcblx0XHRcdFx0J0hpbGxTaGFkaW5nJyxcblx0XHRcdFx0J0h5ZGRhLlJvYWRzQW5kTGFiZWxzJyxcblx0XHRcdFx0J15KdXN0aWNlTWFwJyxcblx0XHRcdFx0J09wZW5JbmZyYU1hcC4oUG93ZXJ8VGVsZWNvbXxQZXRyb2xldW18V2F0ZXIpJyxcblx0XHRcdFx0J09wZW5QdE1hcCcsXG5cdFx0XHRcdCdPcGVuUmFpbHdheU1hcCcsXG5cdFx0XHRcdCdPcGVuRmlyZU1hcCcsXG5cdFx0XHRcdCdTYWZlQ2FzdCcsXG5cdFx0XHRcdCdDYXJ0b0RCLkRhcmtNYXR0ZXJPbmx5TGFiZWxzJyxcblx0XHRcdFx0J0NhcnRvREIuUG9zaXRyb25Pbmx5TGFiZWxzJ1xuXHRcdFx0XTtcblx0XHRcdHJldHVybiBrZXkubWF0Y2goJygnICsgcGF0dGVybnMuam9pbignfCcpICsgJyknKSAhPT0gbnVsbDtcblx0XHR9LFxuXHRcdHJlc2V0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCBtYXAgbGF5ZXJzXG5cdFx0XHR0aGlzLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpe1xuXHRcdFx0XHRpZiAoIGxheWVyLmNvbnN0cnVjdG9yID09PSBMLlRpbGVMYXllci5Qcm92aWRlciApIHtcblx0XHRcdFx0XHRsYXllci5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0Ly8gcmVtb3ZlIGxheWVyIGNvbnRyb2xcblx0XHRcdCEhIHRoaXMubGF5ZXJzQ29udHJvbCAmJiB0aGlzLmxheWVyc0NvbnRyb2wucmVtb3ZlKClcblx0XHR9LFxuXHRcdHVwZGF0ZV92aXNpYmxlOiBmdW5jdGlvbigpIHtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgPT09IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy52aXNpYmxlID0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJyk7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHR0aGlzLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2FjZjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHRvZ2dsZV9jYiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIG5vIGNoYW5nZVxuXHRcdFx0XHRcdHNlbGYudXBkYXRlX3Zpc2libGUoKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0Ly8gZXhwYW5kL2NvbGxhcHNlIGFjZiBzZXR0aW5nXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnc2hvdycsIHRvZ2dsZV9jYiApO1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ2hpZGUnLCB0b2dnbGVfY2IgKTtcblxuXHRcdFx0Ly8gZXhwYW5kIHdwIG1ldGFib3hcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdwb3N0Ym94LXRvZ2dsZWQnLCB0b2dnbGVfY2IgKTtcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdjbGljaycsJy53aWRnZXQtdG9wIConLCB0b2dnbGVfY2IgKTtcblxuXHRcdH0sXG5cdFx0dXBkYXRlX21hcDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYXRsbmcgPSB7IGxhdDogdGhpcy5tb2RlbC5nZXQoJ2NlbnRlcl9sYXQnKSwgbG5nOiB0aGlzLm1vZGVsLmdldCgnY2VudGVyX2xuZycpIH1cblx0XHRcdHRoaXMubWFwLnNldFZpZXcoIFxuXHRcdFx0XHRsYXRsbmcsXG5cdFx0XHRcdHRoaXMubW9kZWwuZ2V0KCd6b29tJykgXG5cdFx0XHQpO1xuXHRcdH1cblx0fSk7XG5cblxuXHQkKGRvY3VtZW50KVxuXHRcdC5vbiggJ2FjZi1vc20tbWFwLWNyZWF0ZScsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0Ly8gZG9uJ3QgaW5pdCBpbiByZXBlYXRlciB0ZW1wbGF0ZXNcblx0XHRcdGlmICggJChlLnRhcmdldCkuY2xvc2VzdCgnW2RhdGEtaWQ9XCJhY2ZjbG9uZWluZGV4XCJdJykubGVuZ3RoICkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5vbiggJ2FjZi1vc20tbWFwLWluaXQnLCBmdW5jdGlvbiggZSwgbWFwICkge1xuXHRcdFx0dmFyIGVkaXRvcjtcblx0XHRcdC8vIHdyYXAgb3NtLkZpZWxkIGJhY2tib25lIHZpZXcgYXJvdW5kIGVkaXRvcnNcblx0XHRcdGlmICggJChlLnRhcmdldCkuaXMoJ1tkYXRhLWVkaXRvci1jb25maWddJykgKSB7XG5cdFx0XHRcdC8vIGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHQoZnVuY3Rpb24gY2hlY2tWaXMoKXtcblx0XHRcdFx0XHRpZiAoICEgJChlLnRhcmdldCkuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dCggY2hlY2tWaXMsIDI1MCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fSkoKTtcblx0XHRcdFx0ZWRpdG9yID0gbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwIH0gKTtcblx0XHRcdFx0JChlLnRhcmdldCkuZGF0YSggJ19tYXBfZWRpdG9yJywgZWRpdG9yICk7XG5cdFx0XHR9XG5cdFx0fSk7XG4vL1x0YWNmLmFkZEFjdGlvbiggJ25ld19maWVsZCcsIGZ1bmN0aW9uKGZpZWxkKXtjb25zb2xlLmxvZyhmaWVsZCl9ICk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgZ2V0IGxvYWRlZCAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ2FwcGVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0JC5hY2ZfbGVhZmxldCgpO1xuXHR9KTtcblx0Ly8gaW5pdCB3aGVuIGZpZWxkcyBzaHcgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdzaG93X2ZpZWxkJywgZnVuY3Rpb24oIGZpZWxkICkge1xuXG5cdFx0aWYgKCAnb3Blbl9zdHJlZXRfbWFwJyAhPT0gZmllbGQudHlwZSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdCAgICB2YXIgZWRpdG9yID0gZmllbGQuJGVsLmZpbmQoJ1tkYXRhLWVkaXRvci1jb25maWddJykuZGF0YSggJ19tYXBfZWRpdG9yJyApO1xuXHQgICAgZWRpdG9yLnVwZGF0ZV92aXNpYmxlKCk7XG5cdH0pO1xufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=
