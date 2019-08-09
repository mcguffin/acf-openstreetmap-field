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
	osm.MarkerEntry = wp.Backbone.View.extend({
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWlucHV0LW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvcHRpb25zID0gYXJnLm9wdGlvbnMsXG5cdFx0aTE4biA9IGFyZy5pMThuLFxuXHRcdHJlc3VsdF90cGwgPSAnPGRpdiB0YWJpbmRleD1cIjwlPSBkYXRhLmkgJT5cIiBjbGFzcz1cIm9zbS1yZXN1bHRcIj4nXG5cdFx0XHQrICc8JT0gZGF0YS5yZXN1bHRfdGV4dCAlPidcblx0XHRcdCsgJzxiciAvPjxzbWFsbD48JT0gZGF0YS5wcm9wZXJ0aWVzLm9zbV92YWx1ZSAlPjwvc21hbGw+J1xuXHRcdFx0KyAnPC9kaXY+JztcblxuXHR2YXIgb3NtID0gZXhwb3J0cy5vc20gPSB7XG5cdH07XG5cdFxuXHR2YXIgZml4ZWRGbG9hdEdldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBmaXhlZEZsb2F0U2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHBhcnNlRmxvYXQodmFsdWUpLnRvRml4ZWQoZml4KSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50R2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGludFNldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdmFsdWUgKTtcblx0XHR9XG5cdH1cblxuXHR2YXIgR1NNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cblx0XHRnZXQ6IGZ1bmN0aW9uKGF0dHIpIHtcblx0XHRcdC8vIENhbGwgdGhlIGdldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5nZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXR0ZXJzW2F0dHJdLmNhbGwodGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywgYXR0cik7XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykge1xuXHRcdFx0dmFyIGF0dHJzLCBhdHRyO1xuXG5cdFx0XHQvLyBOb3JtYWxpemUgdGhlIGtleS12YWx1ZSBpbnRvIGFuIG9iamVjdFxuXHRcdFx0aWYgKF8uaXNPYmplY3Qoa2V5KSB8fCBrZXkgPT0gbnVsbCkge1xuXHRcdFx0XHRhdHRycyA9IGtleTtcblx0XHRcdFx0b3B0aW9ucyA9IHZhbHVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXR0cnMgPSB7fTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHZhbHVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBhbHdheXMgcGFzcyBhbiBvcHRpb25zIGhhc2ggYXJvdW5kLiBUaGlzIGFsbG93cyBtb2RpZnlpbmdcblx0XHRcdC8vIHRoZSBvcHRpb25zIGluc2lkZSB0aGUgc2V0dGVyXG5cdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdFx0Ly8gR28gb3ZlciBhbGwgdGhlIHNldCBhdHRyaWJ1dGVzIGFuZCBjYWxsIHRoZSBzZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRmb3IgKGF0dHIgaW4gYXR0cnMpIHtcblx0XHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLnNldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdFx0YXR0cnNbYXR0cl0gPSB0aGlzLnNldHRlcnNbYXR0cl0uY2FsbCh0aGlzLCBhdHRyc1thdHRyXSwgb3B0aW9ucyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRycywgb3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGdldHRlcnM6IHt9LFxuXG5cdFx0c2V0dGVyczoge31cblxuXHR9KTtcblxuXHRvc20uTWFya2VyRGF0YSA9IEdTTW9kZWwuZXh0ZW5kKHtcblx0XHRnZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRHZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0U2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRTZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHR6b29tOmludFNldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0aXNEZWZhdWx0TGFiZWw6ZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXQoJ2xhYmVsJykgPT09IHRoaXMuZ2V0KCdkZWZhdWx0X2xhYmVsJyk7XG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdFx0bW9kZWw6b3NtLk1hcmtlckRhdGFcblx0fSk7XG5cdFxuXHRcblx0b3NtLk1hcERhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0Y2VudGVyX2xhdDpmaXhlZEZsb2F0R2V0dGVyKCAnY2VudGVyX2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGNlbnRlcl9sbmc6Zml4ZWRGbG9hdEdldHRlciggJ2NlbnRlcl9sbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHR6b29tOmludEdldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0Y2VudGVyX2xhdDpmaXhlZEZsb2F0U2V0dGVyKCAnY2VudGVyX2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGNlbnRlcl9sbmc6Zml4ZWRGbG9hdFNldHRlciggJ2NlbnRlcl9sbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHR6b29tOmludFNldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvKSB7XG5cdFx0XHR0aGlzLnNldCggJ21hcmtlcnMnLCBuZXcgb3NtLk1hcmtlckNvbGxlY3Rpb24oby5tYXJrZXJzKSApO1xuXHRcdFx0R1NNb2RlbC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cylcblx0XHR9XG5cdH0pO1xuXHRvc20uTWFya2VyRW50cnkgPSB3cC5CYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdFx0dGFnTmFtZTogJ2RpdicsXG5cdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyJyxcblx0XHR0ZW1wbGF0ZTp3cC50ZW1wbGF0ZSgnb3NtLW1hcmtlci1pbnB1dCcpLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJsb2NhdGUtbWFya2VyXCJdJyA6ICdsb2NhdGVfbWFya2VyJyxcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwicmVtb3ZlLW1hcmtlclwiXScgOiAncmVtb3ZlX21hcmtlcicsXG5cdFx0XHQnY2hhbmdlIFtkYXRhLW5hbWU9XCJsYWJlbFwiXSdcdFx0OiAndXBkYXRlX21hcmtlcl9sYWJlbCcsXG4vL1x0XHRcdCdmb2N1cyBbdHlwZT1cInRleHRcIl0nXHRcdFx0XHQ6ICdoaWxpdGVfbWFya2VyJ1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvcHQpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLm1hcmtlciA9IG9wdC5tYXJrZXI7IC8vIGxlYWZsZXQgbWFya2VyXG5cdFx0XHR0aGlzLm1hcmtlci5vc21fY29udHJvbGxlciA9IHRoaXM7XG5cdFx0XHR0aGlzLm1vZGVsID0gb3B0Lm1vZGVsO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYWJlbCcsIHRoaXMuY2hhbmdlZExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmRlZmF1bHRfbGFiZWwnLCB0aGlzLmNoYW5nZWREZWZhdWx0TGFiZWwgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF0JywgdGhpcy5jaGFuZ2VkbGF0TG5nICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxuZycsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2Rlc3Ryb3knLCB0aGlzLnJlbW92ZSApO1xuXHRcdFx0cmV0dXJuIHRoaXMucmVuZGVyKCk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkTGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJyk7XG5cdFx0XHR0aGlzLiQoJ1tkYXRhLW5hbWU9XCJsYWJlbFwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIudW5iaW5kVG9vbHRpcCgpO1xuXHRcdFx0dGhpcy5tYXJrZXIuYmluZFRvb2x0aXAobGFiZWwpO1xuXG5cdFx0XHR0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlID0gbGFiZWw7XG5cblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkuYXR0ciggJ3RpdGxlJywgbGFiZWwgKTtcblxuXHRcdH0sXG5cdFx0Y2hhbmdlZERlZmF1bHRMYWJlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyB1cGRhdGUgbGFiZWwgdG9vLCBpZlxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSA9PT0gdGhpcy5tb2RlbC5wcmV2aW91cygnZGVmYXVsdF9sYWJlbCcpICkge1xuXHRcdFx0XHR0aGlzLm1vZGVsLnNldCgnbGFiZWwnLCB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjaGFuZ2VkbGF0TG5nOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMubWFya2VyLnNldExhdExuZyggeyBsYXQ6dGhpcy5tb2RlbC5nZXQoJ2xhdCcpLCBsbmc6dGhpcy5tb2RlbC5nZXQoJ2xuZycpIH0gKVxuXHRcdH0sXG5cdFx0cmVuZGVyOmZ1bmN0aW9uKCl7XG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQudmFsKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0JCh0aGlzLm1hcmtlci5faWNvbilcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5sb2xpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfbGFiZWw6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIGxhYmVsID0gJChlLnRhcmdldCkudmFsKCk7XG5cdFx0XHRpZiAoICcnID09PSBsYWJlbCApIHtcblx0XHRcdFx0bGFiZWwgPSB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgbGFiZWwgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlX21hcmtlcl9nZW9jb2RlOmZ1bmN0aW9uKCBsYWJlbCApIHtcblxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmlzRGVmYXVsdExhYmVsKCkgKSB7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWxzXG5cdFx0XHRcdHRoaXMuc2V0X21hcmtlcl9sYWJlbCggbGFiZWwgKTtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbCBpbnB1dFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1nZW9jb2RlXCJdJykudmFsKCBsYWJlbCApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG5cdFx0XHR0aGlzLl91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyKCk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0X3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXI6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKTtcblx0XHRcdC8qXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYXRcIl0nKS52YWwoIGxhdGxuZy5sYXQgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxuZ1wiXScpLnZhbCggbGF0bG5nLmxuZyApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGFiZWxcIl0nKS52YWwoIHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdC8qL1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGFiZWwnLCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvLyovXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGhpbGl0ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2ZvY3VzJyk7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmFkZENsYXNzKCdmb2N1cycpXG5cdFx0fSxcblx0XHRsb2xpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5yZW1vdmVDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9jYXRlX21hcmtlcjpmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5tYXJrZXIuX21hcC5mbHlUbyggdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCkgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cmVtb3ZlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHQvLyBjbGljayByZW1vdmVcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMubW9kZWwuZGVzdHJveSgpOyAvLyBcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblx0fSk7XG5cblx0b3NtLkZpZWxkID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG5cdFx0bWFwOiBudWxsLFxuXHRcdGZpZWxkOiBudWxsLFxuXHRcdGdlb2NvZGVyOiBudWxsLFxuXHRcdHZpc2libGU6IG51bGwsXG5cdFx0JHBhcmVudDpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MsLmFjZi1maWVsZC1vcGVuLXN0cmVldC1tYXAnKVxuXHRcdH0sXG5cdFx0JHZhbHVlOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCdpbnB1dC5vc20tanNvbicpO1xuXHRcdH0sXG5cdFx0JHJlc3VsdHMgOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCcub3NtLXJlc3VsdHMnKTtcblx0XHR9LFxuXHRcdCRtYXJrZXJzOmZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1tYXJrZXJzJyk7XG5cdFx0fSxcblx0XHRwcmV2ZW50RGVmYXVsdDogZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKGNvbmYpIHtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRkYXRhID0gdGhpcy5nZXRNYXBEYXRhKCksXG5cdFx0XHRcdGVkaXRvcl9jb25maWcgPSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLm1hcFx0XHQ9IGNvbmYubWFwO1xuXHRcdFx0dGhpcy5maWVsZFx0XHQ9IGNvbmYuZmllbGQ7XG5cblx0XHRcdHRoaXMubW9kZWxcdFx0PSBuZXcgb3NtLk1hcERhdGEoZGF0YSk7XG5cblx0XHRcdHRoaXMuaW5pdF9hY2YoKTtcblxuXHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLmFsbG93X3Byb3ZpZGVycyApIHtcblx0XHRcdFx0dGhpcy4kZWwub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUtbGF5ZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApO1xuXHRcdFx0XHR0aGlzLmluaXRMYXllcnMoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUtbWFya2VycycsIHRoaXMucHJldmVudERlZmF1bHQgKTtcblxuXHRcdFx0dGhpcy5pbml0TWFya2VycygpO1xuXG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMuYWRkTWFya2VyICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnYWRkJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ3JlbW92ZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdjaGFuZ2UnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHQvL3RoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF5ZXJzJywgY29uc29sZS50cmFjZSApO1xuXG5cdFx0XHQvLyB1cGRhdGUgb24gbWFwIHZpZXcgY2hhbmdlXG5cdFx0XHR0aGlzLm1hcC5vbignem9vbWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ3pvb20nLHNlbGYubWFwLmdldFpvb20oKSk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMubWFwLm9uKCdtb3ZlZW5kJyxmdW5jdGlvbigpe1xuXHRcdFx0XHR2YXIgbGF0bG5nID0gc2VsZi5tYXAuZ2V0Q2VudGVyKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnY2VudGVyX2xhdCcsbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnY2VudGVyX2xuZycsbGF0bG5nLmxuZyApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMudXBkYXRlX3Zpc2libGUoKTtcblxuXHRcdFx0dGhpcy51cGRhdGVfbWFwKCk7XG5cblxuXHRcdFx0YWNmLmFkZEFjdGlvbigncmVtb3VudF9maWVsZC90eXBlPW9wZW5fc3RyZWV0X21hcCcsIGZ1bmN0aW9uKGZpZWxkKXtcblx0XHRcdFx0aWYgKCBzZWxmLmZpZWxkID09PSBmaWVsZCApIHtcblx0XHRcdFx0XHRzZWxmLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRnZXRNYXBEYXRhOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSBKU09OLnBhcnNlKCB0aGlzLiR2YWx1ZSgpLnZhbCgpICk7XG5cdFx0XHRkYXRhLmNlbnRlcl9sYXQgPSBkYXRhLmNlbnRlcl9sYXQgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbGF0Jyk7XG5cdFx0XHRkYXRhLmNlbnRlcl9sbmcgPSBkYXRhLmNlbnRlcl9sbmcgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbG5nJyk7XG5cdFx0XHRkYXRhLnpvb20gPSBkYXRhLnpvb20gfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtem9vbScpO1xuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblx0XHR1cGRhdGVWYWx1ZTpmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJHZhbHVlKCkudmFsKCBKU09OLnN0cmluZ2lmeSggdGhpcy5tb2RlbC50b0pTT04oKSApICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHQvL3RoaXMuJGVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqXHRNYXJrZXJzXG5cdFx0ICovXG5cdFx0YWRkTWFya2VyOmZ1bmN0aW9uKCBtb2RlbCwgY29sbGVjdGlvbiApIHtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQvLyBhZGQgbWFya2VyIHRvIG1hcFxuXHRcdFx0dmFyIG1hcmtlciA9IEwubWFya2VyKCB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH0sIHtcblx0XHRcdFx0XHR0aXRsZTogbW9kZWwuZ2V0KCdsYWJlbCcpLFxuXHRcdFx0XHRcdGljb246IHRoaXMuaWNvbixcblx0XHRcdFx0fSlcblx0XHRcdFx0LmJpbmRUb29sdGlwKCBtb2RlbC5nZXQoJ2xhYmVsJykgKTtcblxuXHRcdFx0Ly8gXG5cdFx0XHR2YXIgZW50cnkgPSBuZXcgb3NtLk1hcmtlckVudHJ5KHtcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcyxcblx0XHRcdFx0bWFya2VyOiBtYXJrZXIsXG5cdFx0XHRcdG1vZGVsOiBtb2RlbFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubWFwLm9uY2UoJ2xheWVyYWRkJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0bWFya2VyXG5cdFx0XHRcdFx0Lm9uKCdjbGljaycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHRtb2RlbC5kZXN0cm95KCk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQub24oJ2RyYWdlbmQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0Ly8gdXBkYXRlIG1vZGVsIGxuZ2xhdFxuXHRcdFx0XHRcdFx0dmFyIGxhdGxuZyA9IHRoaXMuZ2V0TGF0TG5nKCk7XG5cdFx0XHRcdFx0XHRtb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHRcdFx0XHRtb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHRcdFx0XHRzZWxmLnJldmVyc2VHZW9jb2RlKCBtb2RlbCApO1xuXHRcdFx0XHRcdFx0Ly8gZ2VvY29kZSwgZ2V0IGxhYmVsLCBzZXQgbW9kZWwgbGFiZWwuLi5cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5kcmFnZ2luZy5lbmFibGUoKTtcblx0XHRcdFx0ZW50cnkuJGVsLmFwcGVuZFRvKCBzZWxmLiRtYXJrZXJzKCkgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtb2RlbC5vbignZGVzdHJveScsZnVuY3Rpb24oKXtcblx0XHRcdFx0bWFya2VyLnJlbW92ZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdG1hcmtlci5hZGRUbyggdGhpcy5tYXAgKTtcblxuXHRcdH0sXG5cdFx0aW5pdE1hcmtlcnM6ZnVuY3Rpb24oKXtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRlZGl0b3JfY29uZmlnID0gdGhpcy4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZztcblxuXHRcdFx0dGhpcy5pbml0R2VvY29kZSgpO1xuXG5cdFx0XHQvLyBubyBtYXJrZXJzIGFsbG93ZWQhXG5cdFx0XHRpZiAoIGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pY29uID0gbmV3IEwuRGl2SWNvbih7XG5cdFx0XHRcdGh0bWw6ICcnLFxuXHRcdFx0XHRjbGFzc05hbWU6J29zbS1tYXJrZXItaWNvbidcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLmZvckVhY2goIGZ1bmN0aW9uKCBtb2RlbCApIHtcblx0XHRcdFx0c2VsZi5hZGRNYXJrZXIoIG1vZGVsICk7XG5cdFx0XHR9ICk7XG5cblx0XHRcdHRoaXMubWFwLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHR2YXIgbGF0bG5nID0gZS5sYXRsbmcsXG5cdFx0XHRcdFx0Y291bnRfbWFya2VycyA9IHNlbGYuJG1hcmtlcnMoKS5jaGlsZHJlbigpLm5vdCgnW2RhdGEtaWRdJykubGVuZ3RoLFxuXHRcdFx0XHRcdG1vZGVsO1xuXHRcdFx0XHRcblx0XHRcdFx0ZS5vcmlnaW5hbEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdGUub3JpZ2luYWxFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0Ly8gbm8gbW9yZSBtYXJrZXJzXG5cdFx0XHRcdGlmICggZWRpdG9yX2NvbmZpZy5tYXhfbWFya2VycyAhPT0gZmFsc2UgJiYgY291bnRfbWFya2VycyA+PSBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRtb2RlbCA9IG5ldyBvc20uTWFya2VyRGF0YSh7XG5cdFx0XHRcdFx0bGFiZWw6ICcnLFxuXHRcdFx0XHRcdGRlZmF1bHRfbGFiZWw6ICcnLFxuXHRcdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcblx0XHRcdFx0XHRsbmc6IGxhdGxuZy5sbmcsXG4vL1x0XHRcdFx0XHRjb2xsZWN0aW9uOnNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJylcblx0XHRcdFx0fSlcblx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hZGQoIG1vZGVsICk7XG5cdFx0XHRcdHNlbGYucmV2ZXJzZUdlb2NvZGUobW9kZWwpO1xuXHRcdFx0fSlcblx0XHRcdC5kb3VibGVDbGlja1pvb20uZGlzYWJsZSgpOyBcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICpcdEdlb2NvZGluZ1xuXHRcdCAqXG5cdFx0ICpcdEBvbiBtYXAubGF5ZXJhZGQsIGxheWVyLmRyYWdlbmRcblx0XHQgKi9cblx0XHQgaW5pdEdlb2NvZGU6ZnVuY3Rpb24oKSB7XG5cbiBcdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG4gXHRcdFx0XHRlZGl0b3JfY29uZmlnID0gdGhpcy4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZyxcblx0XHRcdFx0JGFib3ZlID0gdGhpcy4kZWwucHJldigpO1xuXHRcdFx0aWYgKCAhICRhYm92ZS5pcyggJy5hY2Ytb3NtLWFib3ZlJyApICkge1xuXHRcdFx0XHQkYWJvdmUgPSAkKCc8ZGl2IGNsYXNzPVwiYWNmLW9zbS1hYm92ZVwiPjwvZGl2PicpLmluc2VydEJlZm9yZSggdGhpcy4kZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRhYm92ZS5odG1sKCcnKTtcdFx0XHRcdFxuXHRcdFx0fVxuXHRcdFx0Ly8gYWRkIGFuIGV4dHJhIGNvbnRyb2wgcGFuZWwgcmVnaW9uIGZvciBvdXQgc2VhcmNoXG4gXHRcdFx0dGhpcy5tYXAuX2NvbnRyb2xDb3JuZXJzWydhYm92ZSddID0gJGFib3ZlLmdldCgwKTtcblxuIFx0XHRcdHRoaXMuZ2VvY29kZXIgPSBMLkNvbnRyb2wuZ2VvY29kZXIoe1xuIFx0XHRcdFx0Y29sbGFwc2VkOiBmYWxzZSxcbiBcdFx0XHRcdHBvc2l0aW9uOidhYm92ZScsXG4gXHRcdFx0XHRwbGFjZWhvbGRlcjppMThuLnNlYXJjaCxcbiBcdFx0XHRcdGVycm9yTWVzc2FnZTppMThuLm5vdGhpbmdfZm91bmQsXG4gXHRcdFx0XHRzaG93UmVzdWx0SWNvbnM6dHJ1ZSxcbiBcdFx0XHRcdHN1Z2dlc3RNaW5MZW5ndGg6MyxcbiBcdFx0XHRcdHN1Z2dlc3RUaW1lb3V0OjI1MCxcbiBcdFx0XHRcdHF1ZXJ5TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRkZWZhdWx0TWFya0dlb2NvZGU6ZmFsc2UsXG4gXHRcdFx0fSlcbiBcdFx0XHQub24oJ21hcmtnZW9jb2RlJyxmdW5jdGlvbihlKXtcbiBcdFx0XHRcdC8vIHNlYXJjaCByZXN1bHQgY2xpY2tcbiBcdFx0XHRcdHZhciBsYXRsbmcgPSAgZS5nZW9jb2RlLmNlbnRlcixcbiBcdFx0XHRcdFx0ZWRpdG9yX2NvbmZpZyA9IHNlbGYuJGVsLmRhdGEoKS5lZGl0b3JDb25maWcsXG4gXHRcdFx0XHRcdGNvdW50X21hcmtlcnMgPSBzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmxlbmd0aCxcbiBcdFx0XHRcdFx0bGFiZWwgPSBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggWyBlLmdlb2NvZGUgXSwgbGF0bG5nICksXG4gXHRcdFx0XHRcdG1hcmtlcl9kYXRhID0ge1xuIFx0XHRcdFx0XHRcdGxhYmVsOiBsYWJlbCxcbiBcdFx0XHRcdFx0XHRkZWZhdWx0X2xhYmVsOiBsYWJlbCxcbiBcdFx0XHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG4gXHRcdFx0XHRcdFx0bG5nOiBsYXRsbmcubG5nXG4gXHRcdFx0XHRcdH0sIFxuIFx0XHRcdFx0XHRtb2RlbDtcblxuIFx0XHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXG4gXHRcdFx0XHRcdHJldHVybiBzZWxmLm1hcC5maXRCb3VuZHMoIGUuZ2VvY29kZS5iYm94ICk7XG5cbiBcdFx0XHRcdH1cbiBcdFx0XHRcdGlmICggY291bnRfbWFya2VycyA8IGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgKSB7XG5cbiBcdFx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hZGQoIG1hcmtlcl9kYXRhICk7XG5cbiBcdFx0XHRcdH0gZWxzZSBpZiAoIGVkaXRvcl9jb25maWcubWF4X21hcmtlcnMgPT09IDEgKSB7XG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYXQoMCkuc2V0KCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9XG5cbiBcdFx0XHRcdHNlbGYubWFwLnNldFZpZXcoIGxhdGxuZywgc2VsZi5tYXAuZ2V0Wm9vbSgpICk7IC8vIGtlZXAgem9vbSwgbWlnaHQgYmUgY29uZnVzaW5nIGVsc2VcblxuIFx0XHRcdH0pXG4gXHRcdFx0LmFkZFRvKCB0aGlzLm1hcCApO1xuXG4gXHRcdH0sXG5cdFx0cmV2ZXJzZUdlb2NvZGU6ZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLCBcblx0XHRcdFx0bGF0bG5nID0geyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9O1xuXHRcdFx0dGhpcy5nZW9jb2Rlci5vcHRpb25zLmdlb2NvZGVyLnJldmVyc2UoIFxuXHRcdFx0XHRsYXRsbmcsIFxuXHRcdFx0XHRzZWxmLm1hcC5nZXRab29tKCksIFxuXHRcdFx0XHRmdW5jdGlvbiggcmVzdWx0cyApIHtcblx0XHRcdFx0XHRtb2RlbC5zZXQoJ2RlZmF1bHRfbGFiZWwnLCBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggcmVzdWx0cywgbGF0bG5nICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9LFxuXHRcdHBhcnNlR2VvY29kZVJlc3VsdDogZnVuY3Rpb24oIHJlc3VsdHMsIGxhdGxuZyApIHtcblx0XHRcdHZhciBsYWJlbCA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoICEgcmVzdWx0cy5sZW5ndGggKSB7XG5cdFx0XHRcdC8vIGh0dHBzOi8veGtjZC5jb20vMjE3MC9cblx0XHRcdFx0bGFiZWwgPSBsYXRsbmcubGF0ICsgJywgJyArIGxhdGxuZy5sbmc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkLmVhY2goIHJlc3VsdHMsIGZ1bmN0aW9uKCBpLCByZXN1bHQgKSB7XG5cdFx0XHRcdFx0aWYgKCAhISByZXN1bHQuaHRtbCApIHtcblx0XHRcdFx0XHRcdGxhYmVsID0gJCgnPHA+JytyZXN1bHQuaHRtbCsnPC9wPicpLnRleHQoKS50cmltKCkucmVwbGFjZSgvKFxccyspL2csJyAnKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGFiZWwgPSByZXN1bHQubmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdC8vIHRyaW1cblx0XHRcdHJldHVybiBsYWJlbDtcblx0XHR9LFxuXG5cblxuXHRcdC8qKlxuXHRcdCAqXHRMYXllcnNcblx0IFx0Ki9cblx0XHRpbml0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IFtdLFxuXHRcdFx0XHRiYXNlTGF5ZXJzID0ge30sXG5cdFx0XHRcdG92ZXJsYXlzID0ge30sXG5cdFx0XHRcdG1hcExheWVycyA9IHt9LFxuXHRcdFx0XHRlZGl0b3JfY29uZmlnID0gdGhpcy4kZWwuZGF0YSgpLmVkaXRvckNvbmZpZyxcblx0XHRcdFx0aXNfb21pdHRlZCA9IGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiBrZXkgPT09IG51bGwgfHwgKCAhISBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAmJiBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBrZXkgKSA9PT0gLTEgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0dXBNYXAgPSBmdW5jdGlvbiggdmFsLCBrZXkgKXtcblx0XHRcdFx0XHR2YXIgbGF5ZXIsIGxheWVyX2NvbmZpZztcblx0XHRcdFx0XHRpZiAoIF8uaXNPYmplY3QodmFsKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiAkLmVhY2goIHZhbCwgc2V0dXBNYXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGlzX29taXR0ZWQoa2V5KSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAhISBtYXBMYXllcnNbIGtleSBdICkge1xuXHRcdFx0XHRcdFx0bGF5ZXIgPSBtYXBMYXllcnNbIGtleSBdO1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGxheWVyID0gTC50aWxlTGF5ZXIucHJvdmlkZXIoIGtleSAvKiwgbGF5ZXJfY29uZmlnLm9wdGlvbnMqLyApO1xuXHRcdFx0XHRcdFx0fSBjYXRjaChleCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRsYXllci5wcm92aWRlcktleSA9IGtleTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSgga2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0b3ZlcmxheXNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiYXNlTGF5ZXJzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGVjdGVkTGF5ZXJzLmluZGV4T2YoIGtleSApICE9PSAtMSApIHtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKTtcbiBcdFx0XHRcdFx0fVxuIFx0XHRcdFx0fTtcblxuIFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy5tb2RlbC5nZXQoJ2xheWVycycpOyAvLyBzaG91bGQgYmUgbGF5ZXIgc3RvcmUgdmFsdWVcblxuIFx0XHRcdC8vIGZpbHRlciBhdmFpYWxibGUgbGF5ZXJzIGluIGZpZWxkIHZhbHVlXG4gXHRcdFx0aWYgKCBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAhPT0gZmFsc2UgJiYgXy5pc0FycmF5KCBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyApICkge1xuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSBzZWxlY3RlZExheWVycy5maWx0ZXIoIGZ1bmN0aW9uKGVsKSB7XG4gXHRcdFx0XHRcdHJldHVybiBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBlbCApICE9PSAtMTtcbiBcdFx0XHRcdH0pO1xuIFx0XHRcdH1cblxuIFx0XHRcdC8vIHNldCBkZWZhdWx0IGxheWVyXG4gXHRcdFx0aWYgKCAhIHNlbGVjdGVkTGF5ZXJzLmxlbmd0aCApIHtcblxuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSBlZGl0b3JfY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5zbGljZSggMCwgMSApO1xuXG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gZWRpdGFibGUgbGF5ZXJzIVxuXG5cdFx0XHR0aGlzLm1hcC5vbiggJ2Jhc2VsYXllcmNoYW5nZSBsYXllcmFkZCBsYXllcnJlbW92ZScsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XG5cdFx0XHRcdGlmICggISBlLmxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgbGF5ZXJzID0gW107XG5cblx0XHRcdFx0c2VsZi5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG5cdFx0XHRcdFx0aWYgKCAhIGxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBsYXllci5wcm92aWRlcktleSwgbGF5ZXIgKSApIHtcblx0XHRcdFx0XHRcdGxheWVycy5wdXNoKCBsYXllci5wcm92aWRlcktleSApXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGxheWVycy51bnNoaWZ0KCBsYXllci5wcm92aWRlcktleSApXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoICdsYXllcnMnLCBsYXllcnMgKTtcblx0XHRcdH0gKTtcblxuIFx0XHRcdCQuZWFjaCggZWRpdG9yX2NvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMsIHNldHVwTWFwICk7XG5cdFx0XHRcblx0XHRcdHRoaXMubGF5ZXJzQ29udHJvbCA9IEwuY29udHJvbC5sYXllcnMoIGJhc2VMYXllcnMsIG92ZXJsYXlzLCB7XG5cdFx0XHRcdGNvbGxhcHNlZDogdHJ1ZSxcblx0XHRcdFx0aGlkZVNpbmdsZUJhc2U6IHRydWUsXG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG4gXHRcdH0sXG5cdFx0bGF5ZXJfaXNfb3ZlcmxheTogZnVuY3Rpb24oICBrZXksIGxheWVyICkge1xuXHRcdFx0dmFyIHBhdHRlcm5zO1xuXG5cdFx0XHRpZiAoIGxheWVyLm9wdGlvbnMub3BhY2l0eSAmJiBsYXllci5vcHRpb25zLm9wYWNpdHkgPCAxICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHBhdHRlcm5zID0gWydeKE9wZW5XZWF0aGVyTWFwfE9wZW5TZWFNYXApJyxcblx0XHRcdFx0J09wZW5NYXBTdXJmZXIuQWRtaW5Cb3VuZHMnLFxuXHRcdFx0XHQnU3RhbWVuLlRvbmVyKEh5YnJpZHxMaW5lc3xMYWJlbHMpJyxcblx0XHRcdFx0J0FjZXRhdGUuKGZvcmVncm91bmR8bGFiZWxzfHJvYWRzKScsXG5cdFx0XHRcdCdIaWxsU2hhZGluZycsXG5cdFx0XHRcdCdIeWRkYS5Sb2Fkc0FuZExhYmVscycsXG5cdFx0XHRcdCdeSnVzdGljZU1hcCcsXG5cdFx0XHRcdCdPcGVuSW5mcmFNYXAuKFBvd2VyfFRlbGVjb218UGV0cm9sZXVtfFdhdGVyKScsXG5cdFx0XHRcdCdPcGVuUHRNYXAnLFxuXHRcdFx0XHQnT3BlblJhaWx3YXlNYXAnLFxuXHRcdFx0XHQnT3BlbkZpcmVNYXAnLFxuXHRcdFx0XHQnU2FmZUNhc3QnLFxuXHRcdFx0XHQnQ2FydG9EQi5EYXJrTWF0dGVyT25seUxhYmVscycsXG5cdFx0XHRcdCdDYXJ0b0RCLlBvc2l0cm9uT25seUxhYmVscydcblx0XHRcdF07XG5cdFx0XHRyZXR1cm4ga2V5Lm1hdGNoKCcoJyArIHBhdHRlcm5zLmpvaW4oJ3wnKSArICcpJykgIT09IG51bGw7XG5cdFx0fSxcblx0XHRyZXNldExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgbWFwIGxheWVyc1xuXHRcdFx0dGhpcy5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKXtcblx0XHRcdFx0aWYgKCBsYXllci5jb25zdHJ1Y3RvciA9PT0gTC5UaWxlTGF5ZXIuUHJvdmlkZXIgKSB7XG5cdFx0XHRcdFx0bGF5ZXIucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdC8vIHJlbW92ZSBsYXllciBjb250cm9sXG5cdFx0XHQhISB0aGlzLmxheWVyc0NvbnRyb2wgJiYgdGhpcy5sYXllcnNDb250cm9sLnJlbW92ZSgpXG5cdFx0fSxcblx0XHR1cGRhdGVfdmlzaWJsZTogZnVuY3Rpb24oKSB7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlID09PSB0aGlzLiRlbC5pcygnOnZpc2libGUnKSApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudmlzaWJsZSA9IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpO1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSApIHtcblx0XHRcdFx0dGhpcy5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW5pdF9hY2Y6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHR0b2dnbGVfY2IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBubyBjaGFuZ2Vcblx0XHRcdFx0XHRzZWxmLnVwZGF0ZV92aXNpYmxlKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdC8vIGV4cGFuZC9jb2xsYXBzZSBhY2Ygc2V0dGluZ1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ3Nob3cnLCB0b2dnbGVfY2IgKTtcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdoaWRlJywgdG9nZ2xlX2NiICk7XG5cblx0XHRcdC8vIGV4cGFuZCB3cCBtZXRhYm94XG5cdFx0XHQkKGRvY3VtZW50KS5vbigncG9zdGJveC10b2dnbGVkJywgdG9nZ2xlX2NiICk7XG5cdFx0XHQkKGRvY3VtZW50KS5vbignY2xpY2snLCcud2lkZ2V0LXRvcCAqJywgdG9nZ2xlX2NiICk7XG5cblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXA6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0geyBsYXQ6IHRoaXMubW9kZWwuZ2V0KCdjZW50ZXJfbGF0JyksIGxuZzogdGhpcy5tb2RlbC5nZXQoJ2NlbnRlcl9sbmcnKSB9XG5cdFx0XHR0aGlzLm1hcC5zZXRWaWV3KCBcblx0XHRcdFx0bGF0bG5nLFxuXHRcdFx0XHR0aGlzLm1vZGVsLmdldCgnem9vbScpIFxuXHRcdFx0KTtcblx0XHR9XG5cdH0pO1xuXG5cblx0JChkb2N1bWVudClcblx0XHQub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdC8vIGRvbid0IGluaXQgaW4gcmVwZWF0ZXIgdGVtcGxhdGVzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmNsb3Nlc3QoJ1tkYXRhLWlkPVwiYWNmY2xvbmVpbmRleFwiXScpLmxlbmd0aCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQub24oICdhY2Ytb3NtLW1hcC1pbml0JywgZnVuY3Rpb24oIGUsIG1hcCApIHtcblx0XHRcdHZhciBlZGl0b3I7XG5cblx0XHRcdC8vIHdyYXAgb3NtLkZpZWxkIGJhY2tib25lIHZpZXcgYXJvdW5kIGVkaXRvcnNcblx0XHRcdGlmICggJChlLnRhcmdldCkuaXMoJ1tkYXRhLWVkaXRvci1jb25maWddJykgKSB7XG5cdFx0XHRcdC8vIGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHQoZnVuY3Rpb24gY2hlY2tWaXMoKXtcblx0XHRcdFx0XHRpZiAoICEgJChlLnRhcmdldCkuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dCggY2hlY2tWaXMsIDI1MCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fSkoKTtcblx0XHRcdFx0ZWRpdG9yID0gbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwLCBmaWVsZDogYWNmLmdldEZpZWxkKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuYWNmLWZpZWxkJykgKSB9ICk7XG5cdFx0XHRcdCQoZS50YXJnZXQpLmRhdGEoICdfbWFwX2VkaXRvcicsIGVkaXRvciApO1xuXHRcdFx0fVxuXHRcdH0pO1xuLy9cdGFjZi5hZGRBY3Rpb24oICduZXdfZmllbGQnLCBmdW5jdGlvbihmaWVsZCl7Y29uc29sZS5sb2coZmllbGQpfSApO1xuXHQvLyBpbml0IHdoZW4gZmllbGRzIGdldCBsb2FkZWQgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdhcHBlbmQnLCBmdW5jdGlvbigpe1xuXHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2h3IC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnc2hvd19maWVsZCcsIGZ1bmN0aW9uKCBmaWVsZCApIHtcblxuXHRcdGlmICggJ29wZW5fc3RyZWV0X21hcCcgIT09IGZpZWxkLnR5cGUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHQgICAgdmFyIGVkaXRvciA9IGZpZWxkLiRlbC5maW5kKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpLmRhdGEoICdfbWFwX2VkaXRvcicgKTtcblx0ICAgIGVkaXRvci51cGRhdGVfdmlzaWJsZSgpO1xuXHR9KTtcblxuXHRcblxufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=
