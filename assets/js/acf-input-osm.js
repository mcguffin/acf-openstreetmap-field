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
			lat:fixedFloatGetter( 'lat', options.accuracy ),
			lng:fixedFloatGetter( 'lng', options.accuracy ),
			zoom:intGetter('zoom'),
		},
		setters: {
			lat:fixedFloatSetter( 'lat', options.accuracy ),
			lng:fixedFloatSetter( 'lng', options.accuracy ),
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
			center_lat:fixedFloatGetter( 'center_lat', options.accuracy ),
			center_lng:fixedFloatGetter( 'center_lng', options.accuracy ),
			zoom:intGetter('zoom'),
		},
		setters: {
			center_lat:fixedFloatSetter( 'center_lat', options.accuracy ),
			center_lng:fixedFloatSetter( 'center_lng', options.accuracy ),
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
		field: null,
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
			this.field		= conf.field;

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


			acf.addAction('remount_field/type=open_street_map', function(field){
				if ( self.field === field ) {
					self.map.invalidateSize();
				}
			})
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
				editor = new osm.Field( { el: e.target, map: map, field: acf.getField( $(e.target).closest('.acf-field') ) } );
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFjZi1pbnB1dC1vc20uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oICQsIGFyZywgZXhwb3J0cyApe1xuXHR2YXIgb3B0aW9ucyA9IGFyZy5vcHRpb25zLFxuXHRcdGkxOG4gPSBhcmcuaTE4bixcblx0XHRyZXN1bHRfdHBsID0gJzxkaXYgdGFiaW5kZXg9XCI8JT0gZGF0YS5pICU+XCIgY2xhc3M9XCJvc20tcmVzdWx0XCI+J1xuXHRcdFx0KyAnPCU9IGRhdGEucmVzdWx0X3RleHQgJT4nXG5cdFx0XHQrICc8YnIgLz48c21hbGw+PCU9IGRhdGEucHJvcGVydGllcy5vc21fdmFsdWUgJT48L3NtYWxsPidcblx0XHRcdCsgJzwvZGl2Pic7XG5cblx0dmFyIG9zbSA9IGV4cG9ydHMub3NtID0ge1xuXHR9O1xuXHRcblx0dmFyIGZpeGVkRmxvYXRHZXR0ZXIgPSBmdW5jdGlvbiggcHJvcCwgZml4ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KCB0aGlzLmF0dHJpYnV0ZXNbIHByb3AgXSApO1xuXHRcdH1cblx0fVxuXHR2YXIgZml4ZWRGbG9hdFNldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChwYXJzZUZsb2F0KHZhbHVlKS50b0ZpeGVkKGZpeCkgKTtcblx0XHR9XG5cdH1cblx0dmFyIGludEdldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBpbnRTZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHZhbHVlICk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIEdTTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG5cdFx0Z2V0OiBmdW5jdGlvbihhdHRyKSB7XG5cdFx0XHQvLyBDYWxsIHRoZSBnZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuZ2V0dGVyc1thdHRyXSkpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0dGVyc1thdHRyXS5jYWxsKHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGF0dHIpO1xuXHRcdH0sXG5cblx0XHRzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHtcblx0XHRcdHZhciBhdHRycywgYXR0cjtcblxuXHRcdFx0Ly8gTm9ybWFsaXplIHRoZSBrZXktdmFsdWUgaW50byBhbiBvYmplY3Rcblx0XHRcdGlmIChfLmlzT2JqZWN0KGtleSkgfHwga2V5ID09IG51bGwpIHtcblx0XHRcdFx0YXR0cnMgPSBrZXk7XG5cdFx0XHRcdG9wdGlvbnMgPSB2YWx1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF0dHJzID0ge307XG5cdFx0XHRcdGF0dHJzW2tleV0gPSB2YWx1ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYWx3YXlzIHBhc3MgYW4gb3B0aW9ucyBoYXNoIGFyb3VuZC4gVGhpcyBhbGxvd3MgbW9kaWZ5aW5nXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyBpbnNpZGUgdGhlIHNldHRlclxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHRcdC8vIEdvIG92ZXIgYWxsIHRoZSBzZXQgYXR0cmlidXRlcyBhbmQgY2FsbCB0aGUgc2V0dGVyIGlmIGF2YWlsYWJsZVxuXHRcdFx0Zm9yIChhdHRyIGluIGF0dHJzKSB7XG5cdFx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5zZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRcdGF0dHJzW2F0dHJdID0gdGhpcy5zZXR0ZXJzW2F0dHJdLmNhbGwodGhpcywgYXR0cnNbYXR0cl0sIG9wdGlvbnMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgYXR0cnMsIG9wdGlvbnMpO1xuXHRcdH0sXG5cblx0XHRnZXR0ZXJzOiB7fSxcblxuXHRcdHNldHRlcnM6IHt9XG5cblx0fSk7XG5cblx0b3NtLk1hcmtlckRhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRHZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdHpvb206aW50R2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdFNldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGlzRGVmYXVsdExhYmVsOmZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KCdsYWJlbCcpID09PSB0aGlzLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRcdG1vZGVsOm9zbS5NYXJrZXJEYXRhXG5cdH0pO1xuXHRcblx0XG5cdG9zbS5NYXBEYXRhID0gR1NNb2RlbC5leHRlbmQoe1xuXHRcdGdldHRlcnM6IHtcblx0XHRcdGNlbnRlcl9sYXQ6Zml4ZWRGbG9hdEdldHRlciggJ2NlbnRlcl9sYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRjZW50ZXJfbG5nOmZpeGVkRmxvYXRHZXR0ZXIoICdjZW50ZXJfbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRHZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGNlbnRlcl9sYXQ6Zml4ZWRGbG9hdFNldHRlciggJ2NlbnRlcl9sYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRjZW50ZXJfbG5nOmZpeGVkRmxvYXRTZXR0ZXIoICdjZW50ZXJfbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24obykge1xuXHRcdFx0dGhpcy5zZXQoICdtYXJrZXJzJywgbmV3IG9zbS5NYXJrZXJDb2xsZWN0aW9uKG8ubWFya2VycykgKTtcblx0XHRcdEdTTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpXG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckVudHJ5ID0gd3AubWVkaWEuVmlldy5leHRlbmQoe1xuXHRcdHRhZ05hbWU6ICdkaXYnLFxuXHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlcicsXG5cdFx0dGVtcGxhdGU6d3AudGVtcGxhdGUoJ29zbS1tYXJrZXItaW5wdXQnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwibG9jYXRlLW1hcmtlclwiXScgOiAnbG9jYXRlX21hcmtlcicsXG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cInJlbW92ZS1tYXJrZXJcIl0nIDogJ3JlbW92ZV9tYXJrZXInLFxuXHRcdFx0J2NoYW5nZSBbZGF0YS1uYW1lPVwibGFiZWxcIl0nXHRcdDogJ3VwZGF0ZV9tYXJrZXJfbGFiZWwnLFxuLy9cdFx0XHQnZm9jdXMgW3R5cGU9XCJ0ZXh0XCJdJ1x0XHRcdFx0OiAnaGlsaXRlX21hcmtlcidcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0KXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy5tYXJrZXIgPSBvcHQubWFya2VyOyAvLyBsZWFmbGV0IG1hcmtlclxuXHRcdFx0dGhpcy5tYXJrZXIub3NtX2NvbnRyb2xsZXIgPSB0aGlzO1xuXHRcdFx0dGhpcy5tb2RlbCA9IG9wdC5tb2RlbDtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGFiZWwnLCB0aGlzLmNoYW5nZWRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpkZWZhdWx0X2xhYmVsJywgdGhpcy5jaGFuZ2VkRGVmYXVsdExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsbmcnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5yZW1vdmUgKTtcblx0XHRcdHJldHVybiB0aGlzLnJlbmRlcigpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpO1xuXHRcdFx0dGhpcy4kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMubWFya2VyLnVuYmluZFRvb2x0aXAoKTtcblx0XHRcdHRoaXMubWFya2VyLmJpbmRUb29sdGlwKGxhYmVsKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSA9IGxhYmVsO1xuXG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmF0dHIoICd0aXRsZScsIGxhYmVsICk7XG5cblx0XHR9LFxuXHRcdGNoYW5nZWREZWZhdWx0TGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdXBkYXRlIGxhYmVsIHRvbywgaWZcblx0XHRcdGlmICggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgPT09IHRoaXMubW9kZWwucHJldmlvdXMoJ2RlZmF1bHRfbGFiZWwnKSApIHtcblx0XHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y2hhbmdlZGxhdExuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLm1hcmtlci5zZXRMYXRMbmcoIHsgbGF0OnRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOnRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9IClcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJylcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2xhYmVsOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBsYWJlbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuXHRcdFx0aWYgKCAnJyA9PT0gbGFiZWwgKSB7XG5cdFx0XHRcdGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKTtcblx0XHRcdH1cblx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIGxhYmVsICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfZ2VvY29kZTpmdW5jdGlvbiggbGFiZWwgKSB7XG5cblx0XHRcdGlmICggdGhpcy5tb2RlbC5pc0RlZmF1bHRMYWJlbCgpICkge1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsc1xuXHRcdFx0XHR0aGlzLnNldF9tYXJrZXJfbGFiZWwoIGxhYmVsICk7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWwgaW5wdXRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItZ2VvY29kZVwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5fdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcigpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdF91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCk7XG5cdFx0XHQvKlxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGF0XCJdJykudmFsKCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sbmdcIl0nKS52YWwoIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhYmVsXCJdJykudmFsKCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvKi9cblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhYmVsJywgdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0Ly8qL1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWxpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hZGRDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9saXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmVDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkucmVtb3ZlQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvY2F0ZV9tYXJrZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMubWFya2VyLl9tYXAuZmx5VG8oIHRoaXMubWFya2VyLmdldExhdExuZygpICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbW92ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0Ly8gY2xpY2sgcmVtb3ZlXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLm1vZGVsLmRlc3Ryb3koKTsgLy8gXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9XG5cdH0pO1xuXG5cdG9zbS5GaWVsZCA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuXHRcdG1hcDogbnVsbCxcblx0XHRmaWVsZDogbnVsbCxcblx0XHRnZW9jb2RlcjogbnVsbCxcblx0XHR2aXNpYmxlOiBudWxsLFxuXHRcdCRwYXJlbnQ6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzLC5hY2YtZmllbGQtb3Blbi1zdHJlZXQtbWFwJylcblx0XHR9LFxuXHRcdCR2YWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXQub3NtLWpzb24nKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZ2V0TWFwRGF0YSgpLFxuXHRcdFx0XHRlZGl0b3JfY29uZmlnID0gdGhpcy4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZztcblxuXHRcdFx0dGhpcy5tYXBcdFx0PSBjb25mLm1hcDtcblx0XHRcdHRoaXMuZmllbGRcdFx0PSBjb25mLmZpZWxkO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLmluaXRfYWNmKCk7XG5cblx0XHRcdGlmICggZWRpdG9yX2NvbmZpZy5hbGxvd19wcm92aWRlcnMgKSB7XG5cdFx0XHRcdHRoaXMuJGVsLm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlLWxheWVycycsIHRoaXMucHJldmVudERlZmF1bHQgKTtcblx0XHRcdFx0dGhpcy5pbml0TGF5ZXJzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGVsLm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlLW1hcmtlcnMnLCB0aGlzLnByZXZlbnREZWZhdWx0ICk7XG5cblx0XHRcdHRoaXMuaW5pdE1hcmtlcnMoKTtcblxuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLmFkZE1hcmtlciApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdyZW1vdmUnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0Ly90aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxheWVycycsIGNvbnNvbGUudHJhY2UgKTtcblxuXHRcdFx0Ly8gdXBkYXRlIG9uIG1hcCB2aWV3IGNoYW5nZVxuXHRcdFx0dGhpcy5tYXAub24oJ3pvb21lbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCd6b29tJyxzZWxmLm1hcC5nZXRab29tKCkpO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1hcC5vbignbW92ZWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IHNlbGYubWFwLmdldENlbnRlcigpO1xuXHRcdFx0XHRcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2NlbnRlcl9sYXQnLGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2NlbnRlcl9sbmcnLGxhdGxuZy5sbmcgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV92aXNpYmxlKCk7XG5cblx0XHRcdHRoaXMudXBkYXRlX21hcCgpO1xuXG5cblx0XHRcdGFjZi5hZGRBY3Rpb24oJ3JlbW91bnRfZmllbGQvdHlwZT1vcGVuX3N0cmVldF9tYXAnLCBmdW5jdGlvbihmaWVsZCl7XG5cdFx0XHRcdGlmICggc2VsZi5maWVsZCA9PT0gZmllbGQgKSB7XG5cdFx0XHRcdFx0c2VsZi5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0Z2V0TWFwRGF0YTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0gSlNPTi5wYXJzZSggdGhpcy4kdmFsdWUoKS52YWwoKSApO1xuXHRcdFx0ZGF0YS5jZW50ZXJfbGF0ID0gZGF0YS5jZW50ZXJfbGF0IHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxhdCcpO1xuXHRcdFx0ZGF0YS5jZW50ZXJfbG5nID0gZGF0YS5jZW50ZXJfbG5nIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxuZycpO1xuXHRcdFx0ZGF0YS56b29tID0gZGF0YS56b29tIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLXpvb20nKTtcblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdFx0dXBkYXRlVmFsdWU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiR2YWx1ZSgpLnZhbCggSlNPTi5zdHJpbmdpZnkoIHRoaXMubW9kZWwudG9KU09OKCkgKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0Ly90aGlzLiRlbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKlx0TWFya2Vyc1xuXHRcdCAqL1xuXHRcdGFkZE1hcmtlcjpmdW5jdGlvbiggbW9kZWwsIGNvbGxlY3Rpb24gKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0Ly8gYWRkIG1hcmtlciB0byBtYXBcblx0XHRcdHZhciBtYXJrZXIgPSBMLm1hcmtlciggeyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9LCB7XG5cdFx0XHRcdFx0dGl0bGU6IG1vZGVsLmdldCgnbGFiZWwnKSxcblx0XHRcdFx0XHRpY29uOiB0aGlzLmljb24sXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5iaW5kVG9vbHRpcCggbW9kZWwuZ2V0KCdsYWJlbCcpICk7XG5cblx0XHRcdC8vIFxuXHRcdFx0dmFyIGVudHJ5ID0gbmV3IG9zbS5NYXJrZXJFbnRyeSh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdG1hcmtlcjogbWFya2VyLFxuXHRcdFx0XHRtb2RlbDogbW9kZWxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1hcC5vbmNlKCdsYXllcmFkZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdG1hcmtlclxuXHRcdFx0XHRcdC5vbignY2xpY2snLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0bW9kZWwuZGVzdHJveSgpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Lm9uKCdkcmFnZW5kJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdC8vIHVwZGF0ZSBtb2RlbCBsbmdsYXRcblx0XHRcdFx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLmdldExhdExuZygpO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbG5nJywgbGF0bG5nLmxuZyApO1xuXHRcdFx0XHRcdFx0c2VsZi5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblx0XHRcdFx0XHRcdC8vIGdlb2NvZGUsIGdldCBsYWJlbCwgc2V0IG1vZGVsIGxhYmVsLi4uXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuZHJhZ2dpbmcuZW5hYmxlKCk7XG5cdFx0XHRcdGVudHJ5LiRlbC5hcHBlbmRUbyggc2VsZi4kbWFya2VycygpICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bW9kZWwub24oJ2Rlc3Ryb3knLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdG1hcmtlci5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtYXJrZXIuYWRkVG8oIHRoaXMubWFwICk7XG5cblx0XHR9LFxuXHRcdGluaXRNYXJrZXJzOmZ1bmN0aW9uKCl7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZWRpdG9yX2NvbmZpZyA9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWc7XG5cblx0XHRcdHRoaXMuaW5pdEdlb2NvZGUoKTtcblxuXHRcdFx0Ly8gbm8gbWFya2VycyBhbGxvd2VkIVxuXHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaWNvbiA9IG5ldyBMLkRpdkljb24oe1xuXHRcdFx0XHRodG1sOiAnJyxcblx0XHRcdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyLWljb24nXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5mb3JFYWNoKCBmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHRcdHNlbGYuYWRkTWFya2VyKCBtb2RlbCApO1xuXHRcdFx0fSApO1xuXG5cdFx0XHR0aGlzLm1hcC5vbignZGJsY2xpY2snLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IGUubGF0bG5nLFxuXHRcdFx0XHRcdGNvdW50X21hcmtlcnMgPSBzZWxmLiRtYXJrZXJzKCkuY2hpbGRyZW4oKS5ub3QoJ1tkYXRhLWlkXScpLmxlbmd0aCxcblx0XHRcdFx0XHRtb2RlbDtcblx0XHRcdFx0XG5cdFx0XHRcdGUub3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdC8vIG5vIG1vcmUgbWFya2Vyc1xuXHRcdFx0XHRpZiAoIGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgIT09IGZhbHNlICYmIGNvdW50X21hcmtlcnMgPj0gZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0bW9kZWwgPSBuZXcgb3NtLk1hcmtlckRhdGEoe1xuXHRcdFx0XHRcdGxhYmVsOiAnJyxcblx0XHRcdFx0XHRkZWZhdWx0X2xhYmVsOiAnJyxcblx0XHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG5cdFx0XHRcdFx0bG5nOiBsYXRsbmcubG5nLFxuLy9cdFx0XHRcdFx0Y29sbGVjdGlvbjpzZWxmLm1vZGVsLmdldCgnbWFya2VycycpXG5cdFx0XHRcdH0pXG5cdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYWRkKCBtb2RlbCApO1xuXHRcdFx0XHRzZWxmLnJldmVyc2VHZW9jb2RlKG1vZGVsKTtcblx0XHRcdH0pXG5cdFx0XHQuZG91YmxlQ2xpY2tab29tLmRpc2FibGUoKTsgXG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXHRHZW9jb2Rpbmdcblx0XHQgKlxuXHRcdCAqXHRAb24gbWFwLmxheWVyYWRkLCBsYXllci5kcmFnZW5kXG5cdFx0ICovXG5cdFx0IGluaXRHZW9jb2RlOmZ1bmN0aW9uKCkge1xuXG4gXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuIFx0XHRcdFx0ZWRpdG9yX2NvbmZpZyA9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWcsXG5cdFx0XHRcdCRhYm92ZSA9IHRoaXMuJGVsLnByZXYoKTtcblx0XHRcdGlmICggISAkYWJvdmUuaXMoICcuYWNmLW9zbS1hYm92ZScgKSApIHtcblx0XHRcdFx0JGFib3ZlID0gJCgnPGRpdiBjbGFzcz1cImFjZi1vc20tYWJvdmVcIj48L2Rpdj4nKS5pbnNlcnRCZWZvcmUoIHRoaXMuJGVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkYWJvdmUuaHRtbCgnJyk7XHRcdFx0XHRcblx0XHRcdH1cblx0XHRcdC8vIGFkZCBhbiBleHRyYSBjb250cm9sIHBhbmVsIHJlZ2lvbiBmb3Igb3V0IHNlYXJjaFxuIFx0XHRcdHRoaXMubWFwLl9jb250cm9sQ29ybmVyc1snYWJvdmUnXSA9ICRhYm92ZS5nZXQoMCk7XG5cbiBcdFx0XHR0aGlzLmdlb2NvZGVyID0gTC5Db250cm9sLmdlb2NvZGVyKHtcbiBcdFx0XHRcdGNvbGxhcHNlZDogZmFsc2UsXG4gXHRcdFx0XHRwb3NpdGlvbjonYWJvdmUnLFxuIFx0XHRcdFx0cGxhY2Vob2xkZXI6aTE4bi5zZWFyY2gsXG4gXHRcdFx0XHRlcnJvck1lc3NhZ2U6aTE4bi5ub3RoaW5nX2ZvdW5kLFxuIFx0XHRcdFx0c2hvd1Jlc3VsdEljb25zOnRydWUsXG4gXHRcdFx0XHRzdWdnZXN0TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRzdWdnZXN0VGltZW91dDoyNTAsXG4gXHRcdFx0XHRxdWVyeU1pbkxlbmd0aDozLFxuIFx0XHRcdFx0ZGVmYXVsdE1hcmtHZW9jb2RlOmZhbHNlLFxuIFx0XHRcdH0pXG4gXHRcdFx0Lm9uKCdtYXJrZ2VvY29kZScsZnVuY3Rpb24oZSl7XG4gXHRcdFx0XHQvLyBzZWFyY2ggcmVzdWx0IGNsaWNrXG4gXHRcdFx0XHR2YXIgbGF0bG5nID0gIGUuZ2VvY29kZS5jZW50ZXIsXG4gXHRcdFx0XHRcdGVkaXRvcl9jb25maWcgPSBzZWxmLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnLFxuIFx0XHRcdFx0XHRjb3VudF9tYXJrZXJzID0gc2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGgsXG4gXHRcdFx0XHRcdGxhYmVsID0gc2VsZi5wYXJzZUdlb2NvZGVSZXN1bHQoIFsgZS5nZW9jb2RlIF0sIGxhdGxuZyApLFxuIFx0XHRcdFx0XHRtYXJrZXJfZGF0YSA9IHtcbiBcdFx0XHRcdFx0XHRsYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuIFx0XHRcdFx0XHRcdGxuZzogbGF0bG5nLmxuZ1xuIFx0XHRcdFx0XHR9LCBcbiBcdFx0XHRcdFx0bW9kZWw7XG5cbiBcdFx0XHRcdGlmICggZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblxuIFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5tYXAuZml0Qm91bmRzKCBlLmdlb2NvZGUuYmJveCApO1xuXG4gXHRcdFx0XHR9XG4gXHRcdFx0XHRpZiAoIGNvdW50X21hcmtlcnMgPCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzICkge1xuXG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYWRkKCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9IGVsc2UgaWYgKCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzID09PSAxICkge1xuIFx0XHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmF0KDApLnNldCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fVxuXG4gXHRcdFx0XHRzZWxmLm1hcC5zZXRWaWV3KCBsYXRsbmcsIHNlbGYubWFwLmdldFpvb20oKSApOyAvLyBrZWVwIHpvb20sIG1pZ2h0IGJlIGNvbmZ1c2luZyBlbHNlXG5cbiBcdFx0XHR9KVxuIFx0XHRcdC5hZGRUbyggdGhpcy5tYXAgKTtcblxuIFx0XHR9LFxuXHRcdHJldmVyc2VHZW9jb2RlOmZ1bmN0aW9uKCBtb2RlbCApIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcywgXG5cdFx0XHRcdGxhdGxuZyA9IHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfTtcblx0XHRcdHRoaXMuZ2VvY29kZXIub3B0aW9ucy5nZW9jb2Rlci5yZXZlcnNlKCBcblx0XHRcdFx0bGF0bG5nLCBcblx0XHRcdFx0c2VsZi5tYXAuZ2V0Wm9vbSgpLCBcblx0XHRcdFx0ZnVuY3Rpb24oIHJlc3VsdHMgKSB7XG5cdFx0XHRcdFx0bW9kZWwuc2V0KCdkZWZhdWx0X2xhYmVsJywgc2VsZi5wYXJzZUdlb2NvZGVSZXN1bHQoIHJlc3VsdHMsIGxhdGxuZyApICk7XG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cdFx0fSxcblx0XHRwYXJzZUdlb2NvZGVSZXN1bHQ6IGZ1bmN0aW9uKCByZXN1bHRzLCBsYXRsbmcgKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSBmYWxzZTtcblxuXHRcdFx0aWYgKCAhIHJlc3VsdHMubGVuZ3RoICkge1xuXHRcdFx0XHQvLyBodHRwczovL3hrY2QuY29tLzIxNzAvXG5cdFx0XHRcdGxhYmVsID0gbGF0bG5nLmxhdCArICcsICcgKyBsYXRsbmcubG5nO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JC5lYWNoKCByZXN1bHRzLCBmdW5jdGlvbiggaSwgcmVzdWx0ICkge1xuXHRcdFx0XHRcdGlmICggISEgcmVzdWx0Lmh0bWwgKSB7XG5cdFx0XHRcdFx0XHRsYWJlbCA9ICQoJzxwPicrcmVzdWx0Lmh0bWwrJzwvcD4nKS50ZXh0KCkudHJpbSgpLnJlcGxhY2UoLyhcXHMrKS9nLCcgJyk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGxhYmVsID0gcmVzdWx0Lm5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHQvLyB0cmltXG5cdFx0XHRyZXR1cm4gbGFiZWw7XG5cdFx0fSxcblxuXG5cblx0XHQvKipcblx0XHQgKlx0TGF5ZXJzXG5cdCBcdCovXG5cdFx0aW5pdExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSBbXSxcblx0XHRcdFx0YmFzZUxheWVycyA9IHt9LFxuXHRcdFx0XHRvdmVybGF5cyA9IHt9LFxuXHRcdFx0XHRtYXBMYXllcnMgPSB7fSxcblx0XHRcdFx0ZWRpdG9yX2NvbmZpZyA9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWcsXG5cdFx0XHRcdGlzX29taXR0ZWQgPSBmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4ga2V5ID09PSBudWxsIHx8ICggISEgZWRpdG9yX2NvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgJiYgZWRpdG9yX2NvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuaW5kZXhPZigga2V5ICkgPT09IC0xICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldHVwTWFwID0gZnVuY3Rpb24oIHZhbCwga2V5ICl7XG5cdFx0XHRcdFx0dmFyIGxheWVyLCBsYXllcl9jb25maWc7XG5cdFx0XHRcdFx0aWYgKCBfLmlzT2JqZWN0KHZhbCkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJC5lYWNoKCB2YWwsIHNldHVwTWFwICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBpc19vbWl0dGVkKGtleSkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggISEgbWFwTGF5ZXJzWyBrZXkgXSApIHtcblx0XHRcdFx0XHRcdGxheWVyID0gbWFwTGF5ZXJzWyBrZXkgXTtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRsYXllciA9IEwudGlsZUxheWVyLnByb3ZpZGVyKCBrZXkgLyosIGxheWVyX2NvbmZpZy5vcHRpb25zKi8gKTtcblx0XHRcdFx0XHRcdH0gY2F0Y2goZXgpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0bGF5ZXIucHJvdmlkZXJLZXkgPSBrZXk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGtleSwgbGF5ZXIgKSApIHtcblx0XHRcdFx0XHRcdG92ZXJsYXlzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0YmFzZUxheWVyc1trZXldID0gbGF5ZXI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxlY3RlZExheWVycy5pbmRleE9mKCBrZXkgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0XHRzZWxmLm1hcC5hZGRMYXllcihsYXllcik7XG4gXHRcdFx0XHRcdH1cbiBcdFx0XHRcdH07XG5cbiBcdFx0XHRzZWxlY3RlZExheWVycyA9IHRoaXMubW9kZWwuZ2V0KCdsYXllcnMnKTsgLy8gc2hvdWxkIGJlIGxheWVyIHN0b3JlIHZhbHVlXG5cbiBcdFx0XHQvLyBmaWx0ZXIgYXZhaWFsYmxlIGxheWVycyBpbiBmaWVsZCB2YWx1ZVxuIFx0XHRcdGlmICggZWRpdG9yX2NvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgIT09IGZhbHNlICYmIF8uaXNBcnJheSggZWRpdG9yX2NvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgKSApIHtcbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gc2VsZWN0ZWRMYXllcnMuZmlsdGVyKCBmdW5jdGlvbihlbCkge1xuIFx0XHRcdFx0XHRyZXR1cm4gZWRpdG9yX2NvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuaW5kZXhPZiggZWwgKSAhPT0gLTE7XG4gXHRcdFx0XHR9KTtcbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBzZXQgZGVmYXVsdCBsYXllclxuIFx0XHRcdGlmICggISBzZWxlY3RlZExheWVycy5sZW5ndGggKSB7XG5cbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gZWRpdG9yX2NvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuc2xpY2UoIDAsIDEgKTtcblxuIFx0XHRcdH1cblxuIFx0XHRcdC8vIGVkaXRhYmxlIGxheWVycyFcblxuXHRcdFx0dGhpcy5tYXAub24oICdiYXNlbGF5ZXJjaGFuZ2UgbGF5ZXJhZGQgbGF5ZXJyZW1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFxuXHRcdFx0XHRpZiAoICEgZS5sYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGxheWVycyA9IFtdO1xuXG5cdFx0XHRcdHNlbGYubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikge1xuXHRcdFx0XHRcdGlmICggISBsYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSggbGF5ZXIucHJvdmlkZXJLZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRsYXllcnMucHVzaCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYXllcnMudW5zaGlmdCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnbGF5ZXJzJywgbGF5ZXJzICk7XG5cdFx0XHR9ICk7XG5cbiBcdFx0XHQkLmVhY2goIGVkaXRvcl9jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLCBzZXR1cE1hcCApO1xuXHRcdFx0XG5cdFx0XHR0aGlzLmxheWVyc0NvbnRyb2wgPSBMLmNvbnRyb2wubGF5ZXJzKCBiYXNlTGF5ZXJzLCBvdmVybGF5cywge1xuXHRcdFx0XHRjb2xsYXBzZWQ6IHRydWUsXG5cdFx0XHRcdGhpZGVTaW5nbGVCYXNlOiB0cnVlLFxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuIFx0XHR9LFxuXHRcdGxheWVyX2lzX292ZXJsYXk6IGZ1bmN0aW9uKCAga2V5LCBsYXllciApIHtcblx0XHRcdHZhciBwYXR0ZXJucztcblxuXHRcdFx0aWYgKCBsYXllci5vcHRpb25zLm9wYWNpdHkgJiYgbGF5ZXIub3B0aW9ucy5vcGFjaXR5IDwgMSApIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRwYXR0ZXJucyA9IFsnXihPcGVuV2VhdGhlck1hcHxPcGVuU2VhTWFwKScsXG5cdFx0XHRcdCdPcGVuTWFwU3VyZmVyLkFkbWluQm91bmRzJyxcblx0XHRcdFx0J1N0YW1lbi5Ub25lcihIeWJyaWR8TGluZXN8TGFiZWxzKScsXG5cdFx0XHRcdCdBY2V0YXRlLihmb3JlZ3JvdW5kfGxhYmVsc3xyb2FkcyknLFxuXHRcdFx0XHQnSGlsbFNoYWRpbmcnLFxuXHRcdFx0XHQnSHlkZGEuUm9hZHNBbmRMYWJlbHMnLFxuXHRcdFx0XHQnXkp1c3RpY2VNYXAnLFxuXHRcdFx0XHQnT3BlbkluZnJhTWFwLihQb3dlcnxUZWxlY29tfFBldHJvbGV1bXxXYXRlciknLFxuXHRcdFx0XHQnT3BlblB0TWFwJyxcblx0XHRcdFx0J09wZW5SYWlsd2F5TWFwJyxcblx0XHRcdFx0J09wZW5GaXJlTWFwJyxcblx0XHRcdFx0J1NhZmVDYXN0Jyxcblx0XHRcdFx0J0NhcnRvREIuRGFya01hdHRlck9ubHlMYWJlbHMnLFxuXHRcdFx0XHQnQ2FydG9EQi5Qb3NpdHJvbk9ubHlMYWJlbHMnXG5cdFx0XHRdO1xuXHRcdFx0cmV0dXJuIGtleS5tYXRjaCgnKCcgKyBwYXR0ZXJucy5qb2luKCd8JykgKyAnKScpICE9PSBudWxsO1xuXHRcdH0sXG5cdFx0cmVzZXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyByZW1vdmUgYWxsIG1hcCBsYXllcnNcblx0XHRcdHRoaXMubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcil7XG5cdFx0XHRcdGlmICggbGF5ZXIuY29uc3RydWN0b3IgPT09IEwuVGlsZUxheWVyLlByb3ZpZGVyICkge1xuXHRcdFx0XHRcdGxheWVyLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXG5cdFx0XHQvLyByZW1vdmUgbGF5ZXIgY29udHJvbFxuXHRcdFx0ISEgdGhpcy5sYXllcnNDb250cm9sICYmIHRoaXMubGF5ZXJzQ29udHJvbC5yZW1vdmUoKVxuXHRcdH0sXG5cdFx0dXBkYXRlX3Zpc2libGU6IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSA9PT0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnZpc2libGUgPSB0aGlzLiRlbC5pcygnOnZpc2libGUnKTtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgKSB7XG5cdFx0XHRcdHRoaXMubWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGluaXRfYWNmOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0dG9nZ2xlX2NiID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gbm8gY2hhbmdlXG5cdFx0XHRcdFx0c2VsZi51cGRhdGVfdmlzaWJsZSgpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHQvLyBleHBhbmQvY29sbGFwc2UgYWNmIHNldHRpbmdcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdzaG93JywgdG9nZ2xlX2NiICk7XG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnaGlkZScsIHRvZ2dsZV9jYiApO1xuXG5cdFx0XHQvLyBleHBhbmQgd3AgbWV0YWJveFxuXHRcdFx0JChkb2N1bWVudCkub24oJ3Bvc3Rib3gtdG9nZ2xlZCcsIHRvZ2dsZV9jYiApO1xuXHRcdFx0JChkb2N1bWVudCkub24oJ2NsaWNrJywnLndpZGdldC10b3AgKicsIHRvZ2dsZV9jYiApO1xuXG5cdFx0fSxcblx0XHR1cGRhdGVfbWFwOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxhdGxuZyA9IHsgbGF0OiB0aGlzLm1vZGVsLmdldCgnY2VudGVyX2xhdCcpLCBsbmc6IHRoaXMubW9kZWwuZ2V0KCdjZW50ZXJfbG5nJykgfVxuXHRcdFx0dGhpcy5tYXAuc2V0VmlldyggXG5cdFx0XHRcdGxhdGxuZyxcblx0XHRcdFx0dGhpcy5tb2RlbC5nZXQoJ3pvb20nKSBcblx0XHRcdCk7XG5cdFx0fVxuXHR9KTtcblxuXG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHQvLyBkb24ndCBpbml0IGluIHJlcGVhdGVyIHRlbXBsYXRlc1xuXHRcdFx0aWYgKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCdbZGF0YS1pZD1cImFjZmNsb25laW5kZXhcIl0nKS5sZW5ndGggKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0pXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtaW5pdCcsIGZ1bmN0aW9uKCBlLCBtYXAgKSB7XG5cdFx0XHR2YXIgZWRpdG9yO1xuXHRcdFx0Ly8gd3JhcCBvc20uRmllbGQgYmFja2JvbmUgdmlldyBhcm91bmQgZWRpdG9yc1xuXHRcdFx0aWYgKCAkKGUudGFyZ2V0KS5pcygnW2RhdGEtZWRpdG9yLWNvbmZpZ10nKSApIHtcblx0XHRcdFx0Ly8gZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdChmdW5jdGlvbiBjaGVja1Zpcygpe1xuXHRcdFx0XHRcdGlmICggISAkKGUudGFyZ2V0KS5pcygnOnZpc2libGUnKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiBzZXRUaW1lb3V0KCBjaGVja1ZpcywgMjUwICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0XHR9KSgpO1xuXHRcdFx0XHRlZGl0b3IgPSBuZXcgb3NtLkZpZWxkKCB7IGVsOiBlLnRhcmdldCwgbWFwOiBtYXAsIGZpZWxkOiBhY2YuZ2V0RmllbGQoICQoZS50YXJnZXQpLmNsb3Nlc3QoJy5hY2YtZmllbGQnKSApIH0gKTtcblx0XHRcdFx0JChlLnRhcmdldCkuZGF0YSggJ19tYXBfZWRpdG9yJywgZWRpdG9yICk7XG5cdFx0XHR9XG5cdFx0fSk7XG4vL1x0YWNmLmFkZEFjdGlvbiggJ25ld19maWVsZCcsIGZ1bmN0aW9uKGZpZWxkKXtjb25zb2xlLmxvZyhmaWVsZCl9ICk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgZ2V0IGxvYWRlZCAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ2FwcGVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0JC5hY2ZfbGVhZmxldCgpO1xuXHR9KTtcblx0Ly8gaW5pdCB3aGVuIGZpZWxkcyBzaHcgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdzaG93X2ZpZWxkJywgZnVuY3Rpb24oIGZpZWxkICkge1xuXG5cdFx0aWYgKCAnb3Blbl9zdHJlZXRfbWFwJyAhPT0gZmllbGQudHlwZSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdCAgICB2YXIgZWRpdG9yID0gZmllbGQuJGVsLmZpbmQoJ1tkYXRhLWVkaXRvci1jb25maWddJykuZGF0YSggJ19tYXBfZWRpdG9yJyApO1xuXHQgICAgZWRpdG9yLnVwZGF0ZV92aXNpYmxlKCk7XG5cdH0pO1xuXG5cdFxuXG59KSggalF1ZXJ5LCBhY2Zfb3NtX2FkbWluLCB3aW5kb3cgKTtcbiJdfQ==
