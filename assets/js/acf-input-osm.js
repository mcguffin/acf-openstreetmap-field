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
		},
		setters: {
			lat:fixedFloatSetter( 'lat', options.accuracy ),
			lng:fixedFloatSetter( 'lng', options.accuracy ),
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
			lat:fixedFloatGetter( 'lat', options.accuracy ),
			lng:fixedFloatGetter( 'lng', options.accuracy ),
			zoom:intGetter('zoom'),
		},
		setters: {
			lat:fixedFloatSetter( 'lat', options.accuracy ),
			lng:fixedFloatSetter( 'lng', options.accuracy ),
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
				data = this.getMapData();

			this.config		= this.$el.data().editorConfig;

			this.map		= conf.map;

			this.field		= conf.field;

			this.model		= new osm.MapData(data);

			this.init_acf();

			if ( this.config.allow_providers ) {
				// prevent default layer creation
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
				
				self.model.set('lat',latlng.lat );
				self.model.set('lng',latlng.lng );
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
			data.lat = data.lat || this.$el.attr('data-map-lat');
			data.lng = data.lng || this.$el.attr('data-map-lng');
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

			var self = this;

			this.initGeocode();

			// no markers allowed!
			if ( this.config.max_markers === 0 ) {
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
				if ( self.config.max_markers !== false && count_markers >= self.config.max_markers ) {
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
 					count_markers = self.model.get('markers').length,
 					label = self.parseGeocodeResult( [ e.geocode ], latlng ),
 					marker_data = {
 						label: label,
 						default_label: label,
 						lat: latlng.lat,
 						lng: latlng.lng
 					}, 
 					model;

 				if ( self.config.max_markers === 0 ) {

 					return self.map.fitBounds( e.geocode.bbox );

 				}
 				if ( count_markers < self.config.max_markers ) {

 					self.model.get('markers').add( marker_data );

 				} else if ( self.config.max_markers === 1 ) {
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
				is_omitted = function(key) {
					return key === null || ( !! self.config.restrict_providers && self.config.restrict_providers.indexOf( key ) === -1 );
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
 			if ( this.config.restrict_providers !== false && _.isArray( this.config.restrict_providers ) ) {
 				selectedLayers = selectedLayers.filter( function(el) {
 					return self.config.restrict_providers.indexOf( el ) !== -1;
 				});
 			}

 			// set default layer
 			if ( ! selectedLayers.length ) {

 				selectedLayers = this.config.restrict_providers.slice( 0, 1 );

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

 			$.each( this.config.restrict_providers, setupMap );
			
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
			var latlng = { lat: this.model.get('lat'), lng: this.model.get('lng') }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWlucHV0LW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvcHRpb25zID0gYXJnLm9wdGlvbnMsXG5cdFx0aTE4biA9IGFyZy5pMThuLFxuXHRcdHJlc3VsdF90cGwgPSAnPGRpdiB0YWJpbmRleD1cIjwlPSBkYXRhLmkgJT5cIiBjbGFzcz1cIm9zbS1yZXN1bHRcIj4nXG5cdFx0XHQrICc8JT0gZGF0YS5yZXN1bHRfdGV4dCAlPidcblx0XHRcdCsgJzxiciAvPjxzbWFsbD48JT0gZGF0YS5wcm9wZXJ0aWVzLm9zbV92YWx1ZSAlPjwvc21hbGw+J1xuXHRcdFx0KyAnPC9kaXY+JztcblxuXHR2YXIgb3NtID0gZXhwb3J0cy5vc20gPSB7XG5cdH07XG5cdFxuXHR2YXIgZml4ZWRGbG9hdEdldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBmaXhlZEZsb2F0U2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHBhcnNlRmxvYXQodmFsdWUpLnRvRml4ZWQoZml4KSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50R2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGludFNldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdmFsdWUgKTtcblx0XHR9XG5cdH1cblxuXHR2YXIgR1NNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cblx0XHRnZXQ6IGZ1bmN0aW9uKGF0dHIpIHtcblx0XHRcdC8vIENhbGwgdGhlIGdldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5nZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXR0ZXJzW2F0dHJdLmNhbGwodGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywgYXR0cik7XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykge1xuXHRcdFx0dmFyIGF0dHJzLCBhdHRyO1xuXG5cdFx0XHQvLyBOb3JtYWxpemUgdGhlIGtleS12YWx1ZSBpbnRvIGFuIG9iamVjdFxuXHRcdFx0aWYgKF8uaXNPYmplY3Qoa2V5KSB8fCBrZXkgPT0gbnVsbCkge1xuXHRcdFx0XHRhdHRycyA9IGtleTtcblx0XHRcdFx0b3B0aW9ucyA9IHZhbHVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXR0cnMgPSB7fTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHZhbHVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBhbHdheXMgcGFzcyBhbiBvcHRpb25zIGhhc2ggYXJvdW5kLiBUaGlzIGFsbG93cyBtb2RpZnlpbmdcblx0XHRcdC8vIHRoZSBvcHRpb25zIGluc2lkZSB0aGUgc2V0dGVyXG5cdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdFx0Ly8gR28gb3ZlciBhbGwgdGhlIHNldCBhdHRyaWJ1dGVzIGFuZCBjYWxsIHRoZSBzZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRmb3IgKGF0dHIgaW4gYXR0cnMpIHtcblx0XHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLnNldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdFx0YXR0cnNbYXR0cl0gPSB0aGlzLnNldHRlcnNbYXR0cl0uY2FsbCh0aGlzLCBhdHRyc1thdHRyXSwgb3B0aW9ucyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRycywgb3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGdldHRlcnM6IHt9LFxuXG5cdFx0c2V0dGVyczoge31cblxuXHR9KTtcblxuXHRvc20uTWFya2VyRGF0YSA9IEdTTW9kZWwuZXh0ZW5kKHtcblx0XHRnZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRTZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdFNldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHR9LFxuXHRcdGlzRGVmYXVsdExhYmVsOmZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KCdsYWJlbCcpID09PSB0aGlzLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRcdG1vZGVsOm9zbS5NYXJrZXJEYXRhXG5cdH0pO1xuXHRcblx0XG5cdG9zbS5NYXBEYXRhID0gR1NNb2RlbC5leHRlbmQoe1xuXHRcdGdldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0R2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRHZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHR6b29tOmludEdldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRTZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdFNldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdHpvb206aW50U2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKG8pIHtcblx0XHRcdHRoaXMuc2V0KCAnbWFya2VycycsIG5ldyBvc20uTWFya2VyQ29sbGVjdGlvbihvLm1hcmtlcnMpICk7XG5cdFx0XHRHU01vZGVsLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKVxuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJFbnRyeSA9IHdwLkJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0XHR0YWdOYW1lOiAnZGl2Jyxcblx0XHRjbGFzc05hbWU6J29zbS1tYXJrZXInLFxuXHRcdHRlbXBsYXRlOndwLnRlbXBsYXRlKCdvc20tbWFya2VyLWlucHV0JyksXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cImxvY2F0ZS1tYXJrZXJcIl0nIDogJ2xvY2F0ZV9tYXJrZXInLFxuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJyZW1vdmUtbWFya2VyXCJdJyA6ICdyZW1vdmVfbWFya2VyJyxcblx0XHRcdCdjaGFuZ2UgW2RhdGEtbmFtZT1cImxhYmVsXCJdJ1x0XHQ6ICd1cGRhdGVfbWFya2VyX2xhYmVsJyxcbi8vXHRcdFx0J2ZvY3VzIFt0eXBlPVwidGV4dFwiXSdcdFx0XHRcdDogJ2hpbGl0ZV9tYXJrZXInXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKG9wdCl7XG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHRoaXMubWFya2VyID0gb3B0Lm1hcmtlcjsgLy8gbGVhZmxldCBtYXJrZXJcblx0XHRcdHRoaXMubWFya2VyLm9zbV9jb250cm9sbGVyID0gdGhpcztcblx0XHRcdHRoaXMubW9kZWwgPSBvcHQubW9kZWw7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhYmVsJywgdGhpcy5jaGFuZ2VkTGFiZWwgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6ZGVmYXVsdF9sYWJlbCcsIHRoaXMuY2hhbmdlZERlZmF1bHRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYXQnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bG5nJywgdGhpcy5jaGFuZ2VkbGF0TG5nICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnZGVzdHJveScsIHRoaXMucmVtb3ZlICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZW5kZXIoKTtcblx0XHR9LFxuXHRcdGNoYW5nZWRMYWJlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKTtcblx0XHRcdHRoaXMuJCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJykudmFsKCBsYWJlbCApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG5cdFx0XHR0aGlzLm1hcmtlci51bmJpbmRUb29sdGlwKCk7XG5cdFx0XHR0aGlzLm1hcmtlci5iaW5kVG9vbHRpcChsYWJlbCk7XG5cblx0XHRcdHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgPSBsYWJlbDtcblxuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hdHRyKCAndGl0bGUnLCBsYWJlbCApO1xuXG5cdFx0fSxcblx0XHRjaGFuZ2VkRGVmYXVsdExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIHVwZGF0ZSBsYWJlbCB0b28sIGlmXG5cdFx0XHRpZiAoIHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpID09PSB0aGlzLm1vZGVsLnByZXZpb3VzKCdkZWZhdWx0X2xhYmVsJykgKSB7XG5cdFx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIHRoaXMubW9kZWwuZ2V0KCdkZWZhdWx0X2xhYmVsJykgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNoYW5nZWRsYXRMbmc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5tYXJrZXIuc2V0TGF0TG5nKCB7IGxhdDp0aGlzLm1vZGVsLmdldCgnbGF0JyksIGxuZzp0aGlzLm1vZGVsLmdldCgnbG5nJykgfSApXG5cdFx0fSxcblx0XHRyZW5kZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tkYXRhLW5hbWU9XCJsYWJlbFwiXScpXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmhpbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5sb2xpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC52YWwoIHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHQkKHRoaXMubWFya2VyLl9pY29uKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRzZWxmLmhpbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlX21hcmtlcl9sYWJlbDpmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSAkKGUudGFyZ2V0KS52YWwoKTtcblx0XHRcdGlmICggJycgPT09IGxhYmVsICkge1xuXHRcdFx0XHRsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdkZWZhdWx0X2xhYmVsJyk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm1vZGVsLnNldCgnbGFiZWwnLCBsYWJlbCApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2dlb2NvZGU6ZnVuY3Rpb24oIGxhYmVsICkge1xuXG5cdFx0XHRpZiAoIHRoaXMubW9kZWwuaXNEZWZhdWx0TGFiZWwoKSApIHtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbHNcblx0XHRcdFx0dGhpcy5zZXRfbWFya2VyX2xhYmVsKCBsYWJlbCApO1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsIGlucHV0XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWdlb2NvZGVcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMuX3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXIoKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRfdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcjogZnVuY3Rpb24oICkge1xuXHRcdFx0dmFyIGxhdGxuZyA9IHRoaXMubWFya2VyLmdldExhdExuZygpO1xuXHRcdFx0Lypcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhdFwiXScpLnZhbCggbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbG5nXCJdJykudmFsKCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYWJlbFwiXScpLnZhbCggdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0LyovXG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhdCcsIGxhdGxuZy5sYXQgKTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbG5nJywgbGF0bG5nLmxuZyApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsYWJlbCcsIHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdC8vKi9cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aGlsaXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5hZGRDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkuYWRkQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvbGl0ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ2ZvY3VzJyk7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLnJlbW92ZUNsYXNzKCdmb2N1cycpXG5cdFx0fSxcblx0XHRsb2NhdGVfbWFya2VyOmZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLm1hcmtlci5fbWFwLmZseVRvKCB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKSApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRyZW1vdmVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdC8vIGNsaWNrIHJlbW92ZVxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dGhpcy5tb2RlbC5kZXN0cm95KCk7IC8vIFxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fVxuXHR9KTtcblxuXHRvc20uRmllbGQgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cblx0XHRtYXA6IG51bGwsXG5cdFx0ZmllbGQ6IG51bGwsXG5cdFx0Z2VvY29kZXI6IG51bGwsXG5cdFx0dmlzaWJsZTogbnVsbCxcblx0XHQkcGFyZW50OmZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncywuYWNmLWZpZWxkLW9wZW4tc3RyZWV0LW1hcCcpXG5cdFx0fSxcblx0XHQkdmFsdWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJ2lucHV0Lm9zbS1qc29uJyk7XG5cdFx0fSxcblx0XHQkcmVzdWx0cyA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tcmVzdWx0cycpO1xuXHRcdH0sXG5cdFx0JG1hcmtlcnM6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCcub3NtLW1hcmtlcnMnKTtcblx0XHR9LFxuXHRcdHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbiggZSApIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24oY29uZikge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGRhdGEgPSB0aGlzLmdldE1hcERhdGEoKTtcblxuXHRcdFx0dGhpcy5jb25maWdcdFx0PSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLm1hcFx0XHQ9IGNvbmYubWFwO1xuXG5cdFx0XHR0aGlzLmZpZWxkXHRcdD0gY29uZi5maWVsZDtcblxuXHRcdFx0dGhpcy5tb2RlbFx0XHQ9IG5ldyBvc20uTWFwRGF0YShkYXRhKTtcblxuXHRcdFx0dGhpcy5pbml0X2FjZigpO1xuXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLmFsbG93X3Byb3ZpZGVycyApIHtcblx0XHRcdFx0Ly8gcHJldmVudCBkZWZhdWx0IGxheWVyIGNyZWF0aW9uXG5cdFx0XHRcdHRoaXMuJGVsLm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlLWxheWVycycsIHRoaXMucHJldmVudERlZmF1bHQgKTtcblx0XHRcdFx0dGhpcy5pbml0TGF5ZXJzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGVsLm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlLW1hcmtlcnMnLCB0aGlzLnByZXZlbnREZWZhdWx0ICk7XG5cblx0XHRcdHRoaXMuaW5pdE1hcmtlcnMoKTtcblxuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLmFkZE1hcmtlciApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdyZW1vdmUnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0Ly90aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxheWVycycsIGNvbnNvbGUudHJhY2UgKTtcblxuXHRcdFx0Ly8gdXBkYXRlIG9uIG1hcCB2aWV3IGNoYW5nZVxuXHRcdFx0dGhpcy5tYXAub24oJ3pvb21lbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCd6b29tJyxzZWxmLm1hcC5nZXRab29tKCkpO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1hcC5vbignbW92ZWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IHNlbGYubWFwLmdldENlbnRlcigpO1xuXHRcdFx0XHRcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xhdCcsbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnbG5nJyxsYXRsbmcubG5nICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy51cGRhdGVfdmlzaWJsZSgpO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV9tYXAoKTtcblxuXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCdyZW1vdW50X2ZpZWxkL3R5cGU9b3Blbl9zdHJlZXRfbWFwJywgZnVuY3Rpb24oZmllbGQpe1xuXHRcdFx0XHRpZiAoIHNlbGYuZmllbGQgPT09IGZpZWxkICkge1xuXHRcdFx0XHRcdHNlbGYubWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGdldE1hcERhdGE6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IEpTT04ucGFyc2UoIHRoaXMuJHZhbHVlKCkudmFsKCkgKTtcblx0XHRcdGRhdGEubGF0ID0gZGF0YS5sYXQgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbGF0Jyk7XG5cdFx0XHRkYXRhLmxuZyA9IGRhdGEubG5nIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxuZycpO1xuXHRcdFx0ZGF0YS56b29tID0gZGF0YS56b29tIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLXpvb20nKTtcblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdFx0dXBkYXRlVmFsdWU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiR2YWx1ZSgpLnZhbCggSlNPTi5zdHJpbmdpZnkoIHRoaXMubW9kZWwudG9KU09OKCkgKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0Ly90aGlzLiRlbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKlx0TWFya2Vyc1xuXHRcdCAqL1xuXHRcdGFkZE1hcmtlcjpmdW5jdGlvbiggbW9kZWwsIGNvbGxlY3Rpb24gKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0Ly8gYWRkIG1hcmtlciB0byBtYXBcblx0XHRcdHZhciBtYXJrZXIgPSBMLm1hcmtlciggeyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9LCB7XG5cdFx0XHRcdFx0dGl0bGU6IG1vZGVsLmdldCgnbGFiZWwnKSxcblx0XHRcdFx0XHRpY29uOiB0aGlzLmljb24sXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5iaW5kVG9vbHRpcCggbW9kZWwuZ2V0KCdsYWJlbCcpICk7XG5cblx0XHRcdC8vIFxuXHRcdFx0dmFyIGVudHJ5ID0gbmV3IG9zbS5NYXJrZXJFbnRyeSh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdG1hcmtlcjogbWFya2VyLFxuXHRcdFx0XHRtb2RlbDogbW9kZWxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1hcC5vbmNlKCdsYXllcmFkZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdG1hcmtlclxuXHRcdFx0XHRcdC5vbignY2xpY2snLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0bW9kZWwuZGVzdHJveSgpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Lm9uKCdkcmFnZW5kJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdC8vIHVwZGF0ZSBtb2RlbCBsbmdsYXRcblx0XHRcdFx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLmdldExhdExuZygpO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbG5nJywgbGF0bG5nLmxuZyApO1xuXHRcdFx0XHRcdFx0c2VsZi5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblx0XHRcdFx0XHRcdC8vIGdlb2NvZGUsIGdldCBsYWJlbCwgc2V0IG1vZGVsIGxhYmVsLi4uXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuZHJhZ2dpbmcuZW5hYmxlKCk7XG5cdFx0XHRcdGVudHJ5LiRlbC5hcHBlbmRUbyggc2VsZi4kbWFya2VycygpICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bW9kZWwub24oJ2Rlc3Ryb3knLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdG1hcmtlci5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtYXJrZXIuYWRkVG8oIHRoaXMubWFwICk7XG5cblx0XHR9LFxuXHRcdGluaXRNYXJrZXJzOmZ1bmN0aW9uKCl7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy5pbml0R2VvY29kZSgpO1xuXG5cdFx0XHQvLyBubyBtYXJrZXJzIGFsbG93ZWQhXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaWNvbiA9IG5ldyBMLkRpdkljb24oe1xuXHRcdFx0XHRodG1sOiAnJyxcblx0XHRcdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyLWljb24nXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5mb3JFYWNoKCBmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHRcdHNlbGYuYWRkTWFya2VyKCBtb2RlbCApO1xuXHRcdFx0fSApO1xuXG5cdFx0XHR0aGlzLm1hcC5vbignZGJsY2xpY2snLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IGUubGF0bG5nLFxuXHRcdFx0XHRcdGNvdW50X21hcmtlcnMgPSBzZWxmLiRtYXJrZXJzKCkuY2hpbGRyZW4oKS5ub3QoJ1tkYXRhLWlkXScpLmxlbmd0aCxcblx0XHRcdFx0XHRtb2RlbDtcblx0XHRcdFx0XG5cdFx0XHRcdGUub3JpZ2luYWxFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRlLm9yaWdpbmFsRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdFx0XHRcdC8vIG5vIG1vcmUgbWFya2Vyc1xuXHRcdFx0XHRpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzICE9PSBmYWxzZSAmJiBjb3VudF9tYXJrZXJzID49IHNlbGYuY29uZmlnLm1heF9tYXJrZXJzICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHRtb2RlbCA9IG5ldyBvc20uTWFya2VyRGF0YSh7XG5cdFx0XHRcdFx0bGFiZWw6ICcnLFxuXHRcdFx0XHRcdGRlZmF1bHRfbGFiZWw6ICcnLFxuXHRcdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcblx0XHRcdFx0XHRsbmc6IGxhdGxuZy5sbmcsXG4vL1x0XHRcdFx0XHRjb2xsZWN0aW9uOnNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJylcblx0XHRcdFx0fSlcblx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hZGQoIG1vZGVsICk7XG5cdFx0XHRcdHNlbGYucmV2ZXJzZUdlb2NvZGUobW9kZWwpO1xuXHRcdFx0fSlcblx0XHRcdC5kb3VibGVDbGlja1pvb20uZGlzYWJsZSgpOyBcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICpcdEdlb2NvZGluZ1xuXHRcdCAqXG5cdFx0ICpcdEBvbiBtYXAubGF5ZXJhZGQsIGxheWVyLmRyYWdlbmRcblx0XHQgKi9cblx0XHQgaW5pdEdlb2NvZGU6ZnVuY3Rpb24oKSB7XG5cbiBcdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRhYm92ZSA9IHRoaXMuJGVsLnByZXYoKTtcblx0XHRcdGlmICggISAkYWJvdmUuaXMoICcuYWNmLW9zbS1hYm92ZScgKSApIHtcblx0XHRcdFx0JGFib3ZlID0gJCgnPGRpdiBjbGFzcz1cImFjZi1vc20tYWJvdmVcIj48L2Rpdj4nKS5pbnNlcnRCZWZvcmUoIHRoaXMuJGVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkYWJvdmUuaHRtbCgnJyk7XHRcdFx0XHRcblx0XHRcdH1cblx0XHRcdC8vIGFkZCBhbiBleHRyYSBjb250cm9sIHBhbmVsIHJlZ2lvbiBmb3Igb3V0IHNlYXJjaFxuIFx0XHRcdHRoaXMubWFwLl9jb250cm9sQ29ybmVyc1snYWJvdmUnXSA9ICRhYm92ZS5nZXQoMCk7XG5cbiBcdFx0XHR0aGlzLmdlb2NvZGVyID0gTC5Db250cm9sLmdlb2NvZGVyKHtcbiBcdFx0XHRcdGNvbGxhcHNlZDogZmFsc2UsXG4gXHRcdFx0XHRwb3NpdGlvbjonYWJvdmUnLFxuIFx0XHRcdFx0cGxhY2Vob2xkZXI6aTE4bi5zZWFyY2gsXG4gXHRcdFx0XHRlcnJvck1lc3NhZ2U6aTE4bi5ub3RoaW5nX2ZvdW5kLFxuIFx0XHRcdFx0c2hvd1Jlc3VsdEljb25zOnRydWUsXG4gXHRcdFx0XHRzdWdnZXN0TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRzdWdnZXN0VGltZW91dDoyNTAsXG4gXHRcdFx0XHRxdWVyeU1pbkxlbmd0aDozLFxuIFx0XHRcdFx0ZGVmYXVsdE1hcmtHZW9jb2RlOmZhbHNlLFxuIFx0XHRcdH0pXG4gXHRcdFx0Lm9uKCdtYXJrZ2VvY29kZScsZnVuY3Rpb24oZSl7XG4gXHRcdFx0XHQvLyBzZWFyY2ggcmVzdWx0IGNsaWNrXG4gXHRcdFx0XHR2YXIgbGF0bG5nID0gIGUuZ2VvY29kZS5jZW50ZXIsXG4gXHRcdFx0XHRcdGNvdW50X21hcmtlcnMgPSBzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmxlbmd0aCxcbiBcdFx0XHRcdFx0bGFiZWwgPSBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggWyBlLmdlb2NvZGUgXSwgbGF0bG5nICksXG4gXHRcdFx0XHRcdG1hcmtlcl9kYXRhID0ge1xuIFx0XHRcdFx0XHRcdGxhYmVsOiBsYWJlbCxcbiBcdFx0XHRcdFx0XHRkZWZhdWx0X2xhYmVsOiBsYWJlbCxcbiBcdFx0XHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG4gXHRcdFx0XHRcdFx0bG5nOiBsYXRsbmcubG5nXG4gXHRcdFx0XHRcdH0sIFxuIFx0XHRcdFx0XHRtb2RlbDtcblxuIFx0XHRcdFx0aWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblxuIFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5tYXAuZml0Qm91bmRzKCBlLmdlb2NvZGUuYmJveCApO1xuXG4gXHRcdFx0XHR9XG4gXHRcdFx0XHRpZiAoIGNvdW50X21hcmtlcnMgPCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyApIHtcblxuIFx0XHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmFkZCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fSBlbHNlIGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IDEgKSB7XG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYXQoMCkuc2V0KCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9XG5cbiBcdFx0XHRcdHNlbGYubWFwLnNldFZpZXcoIGxhdGxuZywgc2VsZi5tYXAuZ2V0Wm9vbSgpICk7IC8vIGtlZXAgem9vbSwgbWlnaHQgYmUgY29uZnVzaW5nIGVsc2VcblxuIFx0XHRcdH0pXG4gXHRcdFx0LmFkZFRvKCB0aGlzLm1hcCApO1xuXG4gXHRcdH0sXG5cdFx0cmV2ZXJzZUdlb2NvZGU6ZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLCBcblx0XHRcdFx0bGF0bG5nID0geyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9O1xuXHRcdFx0dGhpcy5nZW9jb2Rlci5vcHRpb25zLmdlb2NvZGVyLnJldmVyc2UoIFxuXHRcdFx0XHRsYXRsbmcsIFxuXHRcdFx0XHRzZWxmLm1hcC5nZXRab29tKCksIFxuXHRcdFx0XHRmdW5jdGlvbiggcmVzdWx0cyApIHtcblx0XHRcdFx0XHRtb2RlbC5zZXQoJ2RlZmF1bHRfbGFiZWwnLCBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggcmVzdWx0cywgbGF0bG5nICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9LFxuXHRcdHBhcnNlR2VvY29kZVJlc3VsdDogZnVuY3Rpb24oIHJlc3VsdHMsIGxhdGxuZyApIHtcblx0XHRcdHZhciBsYWJlbCA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoICEgcmVzdWx0cy5sZW5ndGggKSB7XG5cdFx0XHRcdC8vIGh0dHBzOi8veGtjZC5jb20vMjE3MC9cblx0XHRcdFx0bGFiZWwgPSBsYXRsbmcubGF0ICsgJywgJyArIGxhdGxuZy5sbmc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkLmVhY2goIHJlc3VsdHMsIGZ1bmN0aW9uKCBpLCByZXN1bHQgKSB7XG5cdFx0XHRcdFx0aWYgKCAhISByZXN1bHQuaHRtbCApIHtcblx0XHRcdFx0XHRcdGxhYmVsID0gJCgnPHA+JytyZXN1bHQuaHRtbCsnPC9wPicpLnRleHQoKS50cmltKCkucmVwbGFjZSgvKFxccyspL2csJyAnKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGFiZWwgPSByZXN1bHQubmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdC8vIHRyaW1cblx0XHRcdHJldHVybiBsYWJlbDtcblx0XHR9LFxuXG5cblxuXHRcdC8qKlxuXHRcdCAqXHRMYXllcnNcblx0IFx0Ki9cblx0XHRpbml0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IFtdLFxuXHRcdFx0XHRiYXNlTGF5ZXJzID0ge30sXG5cdFx0XHRcdG92ZXJsYXlzID0ge30sXG5cdFx0XHRcdG1hcExheWVycyA9IHt9LFxuXHRcdFx0XHRpc19vbWl0dGVkID0gZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGtleSA9PT0gbnVsbCB8fCAoICEhIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAmJiBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuaW5kZXhPZigga2V5ICkgPT09IC0xICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldHVwTWFwID0gZnVuY3Rpb24oIHZhbCwga2V5ICl7XG5cdFx0XHRcdFx0dmFyIGxheWVyLCBsYXllcl9jb25maWc7XG5cdFx0XHRcdFx0aWYgKCBfLmlzT2JqZWN0KHZhbCkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJC5lYWNoKCB2YWwsIHNldHVwTWFwICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBpc19vbWl0dGVkKGtleSkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggISEgbWFwTGF5ZXJzWyBrZXkgXSApIHtcblx0XHRcdFx0XHRcdGxheWVyID0gbWFwTGF5ZXJzWyBrZXkgXTtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRsYXllciA9IEwudGlsZUxheWVyLnByb3ZpZGVyKCBrZXkgLyosIGxheWVyX2NvbmZpZy5vcHRpb25zKi8gKTtcblx0XHRcdFx0XHRcdH0gY2F0Y2goZXgpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0bGF5ZXIucHJvdmlkZXJLZXkgPSBrZXk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGtleSwgbGF5ZXIgKSApIHtcblx0XHRcdFx0XHRcdG92ZXJsYXlzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0YmFzZUxheWVyc1trZXldID0gbGF5ZXI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxlY3RlZExheWVycy5pbmRleE9mKCBrZXkgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0XHRzZWxmLm1hcC5hZGRMYXllcihsYXllcik7XG4gXHRcdFx0XHRcdH1cbiBcdFx0XHRcdH07XG5cbiBcdFx0XHRzZWxlY3RlZExheWVycyA9IHRoaXMubW9kZWwuZ2V0KCdsYXllcnMnKTsgLy8gc2hvdWxkIGJlIGxheWVyIHN0b3JlIHZhbHVlXG5cbiBcdFx0XHQvLyBmaWx0ZXIgYXZhaWFsYmxlIGxheWVycyBpbiBmaWVsZCB2YWx1ZVxuIFx0XHRcdGlmICggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICE9PSBmYWxzZSAmJiBfLmlzQXJyYXkoIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyApICkge1xuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSBzZWxlY3RlZExheWVycy5maWx0ZXIoIGZ1bmN0aW9uKGVsKSB7XG4gXHRcdFx0XHRcdHJldHVybiBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuaW5kZXhPZiggZWwgKSAhPT0gLTE7XG4gXHRcdFx0XHR9KTtcbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBzZXQgZGVmYXVsdCBsYXllclxuIFx0XHRcdGlmICggISBzZWxlY3RlZExheWVycy5sZW5ndGggKSB7XG5cbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLnNsaWNlKCAwLCAxICk7XG5cbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBlZGl0YWJsZSBsYXllcnMhXG5cblx0XHRcdHRoaXMubWFwLm9uKCAnYmFzZWxheWVyY2hhbmdlIGxheWVyYWRkIGxheWVycmVtb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcblx0XHRcdFx0aWYgKCAhIGUubGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBsYXllcnMgPSBbXTtcblxuXHRcdFx0XHRzZWxmLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHtcblx0XHRcdFx0XHRpZiAoICEgbGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0bGF5ZXJzLnB1c2goIGxheWVyLnByb3ZpZGVyS2V5IClcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGF5ZXJzLnVuc2hpZnQoIGxheWVyLnByb3ZpZGVyS2V5IClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2xheWVycycsIGxheWVycyApO1xuXHRcdFx0fSApO1xuXG4gXHRcdFx0JC5lYWNoKCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMsIHNldHVwTWFwICk7XG5cdFx0XHRcblx0XHRcdHRoaXMubGF5ZXJzQ29udHJvbCA9IEwuY29udHJvbC5sYXllcnMoIGJhc2VMYXllcnMsIG92ZXJsYXlzLCB7XG5cdFx0XHRcdGNvbGxhcHNlZDogdHJ1ZSxcblx0XHRcdFx0aGlkZVNpbmdsZUJhc2U6IHRydWUsXG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG4gXHRcdH0sXG5cdFx0bGF5ZXJfaXNfb3ZlcmxheTogZnVuY3Rpb24oICBrZXksIGxheWVyICkge1xuXHRcdFx0dmFyIHBhdHRlcm5zO1xuXG5cdFx0XHRpZiAoIGxheWVyLm9wdGlvbnMub3BhY2l0eSAmJiBsYXllci5vcHRpb25zLm9wYWNpdHkgPCAxICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHBhdHRlcm5zID0gWydeKE9wZW5XZWF0aGVyTWFwfE9wZW5TZWFNYXApJyxcblx0XHRcdFx0J09wZW5NYXBTdXJmZXIuQWRtaW5Cb3VuZHMnLFxuXHRcdFx0XHQnU3RhbWVuLlRvbmVyKEh5YnJpZHxMaW5lc3xMYWJlbHMpJyxcblx0XHRcdFx0J0FjZXRhdGUuKGZvcmVncm91bmR8bGFiZWxzfHJvYWRzKScsXG5cdFx0XHRcdCdIaWxsU2hhZGluZycsXG5cdFx0XHRcdCdIeWRkYS5Sb2Fkc0FuZExhYmVscycsXG5cdFx0XHRcdCdeSnVzdGljZU1hcCcsXG5cdFx0XHRcdCdPcGVuSW5mcmFNYXAuKFBvd2VyfFRlbGVjb218UGV0cm9sZXVtfFdhdGVyKScsXG5cdFx0XHRcdCdPcGVuUHRNYXAnLFxuXHRcdFx0XHQnT3BlblJhaWx3YXlNYXAnLFxuXHRcdFx0XHQnT3BlbkZpcmVNYXAnLFxuXHRcdFx0XHQnU2FmZUNhc3QnLFxuXHRcdFx0XHQnQ2FydG9EQi5EYXJrTWF0dGVyT25seUxhYmVscycsXG5cdFx0XHRcdCdDYXJ0b0RCLlBvc2l0cm9uT25seUxhYmVscydcblx0XHRcdF07XG5cdFx0XHRyZXR1cm4ga2V5Lm1hdGNoKCcoJyArIHBhdHRlcm5zLmpvaW4oJ3wnKSArICcpJykgIT09IG51bGw7XG5cdFx0fSxcblx0XHRyZXNldExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgbWFwIGxheWVyc1xuXHRcdFx0dGhpcy5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKXtcblx0XHRcdFx0aWYgKCBsYXllci5jb25zdHJ1Y3RvciA9PT0gTC5UaWxlTGF5ZXIuUHJvdmlkZXIgKSB7XG5cdFx0XHRcdFx0bGF5ZXIucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdC8vIHJlbW92ZSBsYXllciBjb250cm9sXG5cdFx0XHQhISB0aGlzLmxheWVyc0NvbnRyb2wgJiYgdGhpcy5sYXllcnNDb250cm9sLnJlbW92ZSgpXG5cdFx0fSxcblx0XHR1cGRhdGVfdmlzaWJsZTogZnVuY3Rpb24oKSB7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlID09PSB0aGlzLiRlbC5pcygnOnZpc2libGUnKSApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudmlzaWJsZSA9IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpO1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSApIHtcblx0XHRcdFx0dGhpcy5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW5pdF9hY2Y6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHR0b2dnbGVfY2IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBubyBjaGFuZ2Vcblx0XHRcdFx0XHRzZWxmLnVwZGF0ZV92aXNpYmxlKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdC8vIGV4cGFuZC9jb2xsYXBzZSBhY2Ygc2V0dGluZ1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ3Nob3cnLCB0b2dnbGVfY2IgKTtcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdoaWRlJywgdG9nZ2xlX2NiICk7XG5cblx0XHRcdC8vIGV4cGFuZCB3cCBtZXRhYm94XG5cdFx0XHQkKGRvY3VtZW50KS5vbigncG9zdGJveC10b2dnbGVkJywgdG9nZ2xlX2NiICk7XG5cdFx0XHQkKGRvY3VtZW50KS5vbignY2xpY2snLCcud2lkZ2V0LXRvcCAqJywgdG9nZ2xlX2NiICk7XG5cblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXA6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0geyBsYXQ6IHRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiB0aGlzLm1vZGVsLmdldCgnbG5nJykgfVxuXHRcdFx0dGhpcy5tYXAuc2V0VmlldyggXG5cdFx0XHRcdGxhdGxuZyxcblx0XHRcdFx0dGhpcy5tb2RlbC5nZXQoJ3pvb20nKSBcblx0XHRcdCk7XG5cdFx0fVxuXHR9KTtcblxuXG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHQvLyBkb24ndCBpbml0IGluIHJlcGVhdGVyIHRlbXBsYXRlc1xuXHRcdFx0aWYgKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCdbZGF0YS1pZD1cImFjZmNsb25laW5kZXhcIl0nKS5sZW5ndGggKSB7XG5cdFx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdH0pXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtaW5pdCcsIGZ1bmN0aW9uKCBlLCBtYXAgKSB7XG5cdFx0XHR2YXIgZWRpdG9yO1xuXG5cdFx0XHQvLyB3cmFwIG9zbS5GaWVsZCBiYWNrYm9uZSB2aWV3IGFyb3VuZCBlZGl0b3JzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmlzKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpICkge1xuXHRcdFx0XHQvLyBlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0KGZ1bmN0aW9uIGNoZWNrVmlzKCl7XG5cdFx0XHRcdFx0aWYgKCAhICQoZS50YXJnZXQpLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHNldFRpbWVvdXQoIGNoZWNrVmlzLCAyNTAgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0bWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHRcdH0pKCk7XG5cdFx0XHRcdGVkaXRvciA9IG5ldyBvc20uRmllbGQoIHsgZWw6IGUudGFyZ2V0LCBtYXA6IG1hcCwgZmllbGQ6IGFjZi5nZXRGaWVsZCggJChlLnRhcmdldCkuY2xvc2VzdCgnLmFjZi1maWVsZCcpICkgfSApO1xuXHRcdFx0XHQkKGUudGFyZ2V0KS5kYXRhKCAnX21hcF9lZGl0b3InLCBlZGl0b3IgKTtcblx0XHRcdH1cblx0XHR9KTtcbi8vXHRhY2YuYWRkQWN0aW9uKCAnbmV3X2ZpZWxkJywgZnVuY3Rpb24oZmllbGQpe2NvbnNvbGUubG9nKGZpZWxkKX0gKTtcblx0Ly8gaW5pdCB3aGVuIGZpZWxkcyBnZXQgbG9hZGVkIC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnYXBwZW5kJywgZnVuY3Rpb24oKXtcblx0XHQkLmFjZl9sZWFmbGV0KCk7XG5cdH0pO1xuXHQvLyBpbml0IHdoZW4gZmllbGRzIHNodyAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ3Nob3dfZmllbGQnLCBmdW5jdGlvbiggZmllbGQgKSB7XG5cblx0XHRpZiAoICdvcGVuX3N0cmVldF9tYXAnICE9PSBmaWVsZC50eXBlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0ICAgIHZhciBlZGl0b3IgPSBmaWVsZC4kZWwuZmluZCgnW2RhdGEtZWRpdG9yLWNvbmZpZ10nKS5kYXRhKCAnX21hcF9lZGl0b3InICk7XG5cdCAgICBlZGl0b3IudXBkYXRlX3Zpc2libGUoKTtcblx0fSk7XG5cblx0XG5cbn0pKCBqUXVlcnksIGFjZl9vc21fYWRtaW4sIHdpbmRvdyApO1xuIl19
