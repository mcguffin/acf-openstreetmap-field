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
		},
		pling:function() {
			$(this.marker._icon).html('').append('<span class="pling"></span>');
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

			this.plingMarker = false;

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


			// kb navigation might interfere with other kb listeners
			this.map.keyboard.disable();

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
			this.updateMarkerState();
		},
		updateMarkerState:function() {
			var len = this.model.get('markers').length;
			this.$el.attr('data-has-markers', !!len ? 'true' : 'false');
			this.$el.attr('data-can-add-marker', ( false === this.config.max_markers || len < this.config.max_markers) ? 'true' : 'false');	
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
			if ( this.plingMarker ) {
				entry.pling();
			}

		},
		initMarkers:function(){

			var self = this;

			this.initGeocode();
			this.$el.attr('data-has-markers', 'false');
			this.$el.attr('data-can-add-marker', 'false');
			
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

			// dbltap is not firing on mobile
			if ( L.Browser.touch && L.Browser.mobile ) {
				this._add_marker_on_hold();
			} else {
				this._add_marker_on_dblclick();
			}

			this.updateMarkerState();

		},
		_add_marker_on_dblclick: function() {
			var self = this;
			this.map.on('dblclick', function(e){
				var latlng = e.latlng;
				
				L.DomEvent.preventDefault(e);
				L.DomEvent.stopPropagation(e);
				
				self.addMarkerByLatLng( latlng );
			})
			.doubleClickZoom.disable(); 
			this.$el.addClass('add-marker-on-dblclick')
		},
		_add_marker_on_hold: function() {
			if ( L.Browser.pointer ) {
				// use pointer events
				this._add_marker_on_hold_pointer();
			} else {
				// use touch events
				this._add_marker_on_hold_touch();
			}
			this.$el.addClass('add-marker-on-taphold')
		},
		_add_marker_on_hold_pointer: function() {
			var self = this,
				_hold_timeout = 750,
				_hold_wait_to = {};
			L.DomEvent
				.on(this.map.getContainer(),'pointerdown',function(e){
					_hold_wait_to[ 'p'+e.pointerId ] = setTimeout(function(){
						var cp = self.map.mouseEventToContainerPoint(e);
						var lp = self.map.containerPointToLayerPoint(cp)

						self.addMarkerByLatLng( self.map.layerPointToLatLng(lp) )

						_hold_wait_to[ 'p'+e.pointerId ] = false;
					}, _hold_timeout );
				})
				.on(this.map.getContainer(), 'pointerup pointermove', function(e){
					!! _hold_wait_to[ 'p'+e.pointerId ] && clearTimeout( _hold_wait_to[ 'p'+e.pointerId ] );
				});
		},
		_add_marker_on_hold_touch:function() {
			var self = this,
				_hold_timeout = 750,
				_hold_wait_to = false;
			L.DomEvent
				.on(this.map.getContainer(),'touchstart',function(e){
					if ( e.touches.length !== 1 ) {
						return;
					}
					_hold_wait_to = setTimeout(function(){

						var cp = self.map.mouseEventToContainerPoint(e.touches[0]);
						var lp = self.map.containerPointToLayerPoint(cp)

						self.addMarkerByLatLng( self.map.layerPointToLatLng(lp) )

						_hold_wait_to = false;
					}, _hold_timeout );
				})
				.on(this.map.getContainer(), 'touchend touchmove', function(e){
					!! _hold_wait_to && clearTimeout( _hold_wait_to[ 'p'+e.pointerId ] );
				});
		},
		addMarkerByLatLng:function(latlng) {
			var collection = this.model.get('markers'),
				model;
			// no more markers
			if ( this.config.max_markers !== false && collection.length >= this.config.max_markers ) {
				return;
			}
			model = new osm.MarkerData({
				label: '',
				default_label: '',
				lat: latlng.lat,
				lng: latlng.lng,
			});
			this.plingMarker = true;
			collection.add( model );
			this.reverseGeocode( model );
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

				// getting rid of the modal – #35
				self.geocoder._clearResults();
				self.geocoder._input.value = '';

				// no markers - just adapt map view
 				if ( self.config.max_markers === 0 ) {

 					return self.map.fitBounds( e.geocode.bbox );

 				}

				
 				if ( self.config.max_markers === false || count_markers < self.config.max_markers ) {
					// infinite markers or markers still in range
 					self.model.get('markers').add( marker_data );

 				} else if ( self.config.max_markers === 1 ) {
					// one marker only
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
						var html = result.html.replace(/(\s+)</g,'<').replace(/<br\/>/g,'<br/>, ');
						// add missing spaces
						label = $('<p>'+html+'</p>').text().trim().replace(/(\s+)/g,' ');
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWlucHV0LW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvcHRpb25zID0gYXJnLm9wdGlvbnMsXG5cdFx0aTE4biA9IGFyZy5pMThuLFxuXHRcdHJlc3VsdF90cGwgPSAnPGRpdiB0YWJpbmRleD1cIjwlPSBkYXRhLmkgJT5cIiBjbGFzcz1cIm9zbS1yZXN1bHRcIj4nXG5cdFx0XHQrICc8JT0gZGF0YS5yZXN1bHRfdGV4dCAlPidcblx0XHRcdCsgJzxiciAvPjxzbWFsbD48JT0gZGF0YS5wcm9wZXJ0aWVzLm9zbV92YWx1ZSAlPjwvc21hbGw+J1xuXHRcdFx0KyAnPC9kaXY+JztcblxuXHR2YXIgb3NtID0gZXhwb3J0cy5vc20gPSB7XG5cdH07XG5cdFxuXHR2YXIgZml4ZWRGbG9hdEdldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBmaXhlZEZsb2F0U2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KHBhcnNlRmxvYXQodmFsdWUpLnRvRml4ZWQoZml4KSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50R2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGludFNldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcblx0XHRcdHJldHVybiBwYXJzZUludCggdmFsdWUgKTtcblx0XHR9XG5cdH1cblxuXHR2YXIgR1NNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCh7XG5cblx0XHRnZXQ6IGZ1bmN0aW9uKGF0dHIpIHtcblx0XHRcdC8vIENhbGwgdGhlIGdldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5nZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcy5nZXR0ZXJzW2F0dHJdLmNhbGwodGhpcyk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuZ2V0LmNhbGwodGhpcywgYXR0cik7XG5cdFx0fSxcblxuXHRcdHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSwgb3B0aW9ucykge1xuXHRcdFx0dmFyIGF0dHJzLCBhdHRyO1xuXG5cdFx0XHQvLyBOb3JtYWxpemUgdGhlIGtleS12YWx1ZSBpbnRvIGFuIG9iamVjdFxuXHRcdFx0aWYgKF8uaXNPYmplY3Qoa2V5KSB8fCBrZXkgPT0gbnVsbCkge1xuXHRcdFx0XHRhdHRycyA9IGtleTtcblx0XHRcdFx0b3B0aW9ucyA9IHZhbHVlO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0YXR0cnMgPSB7fTtcblx0XHRcdFx0YXR0cnNba2V5XSA9IHZhbHVlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBhbHdheXMgcGFzcyBhbiBvcHRpb25zIGhhc2ggYXJvdW5kLiBUaGlzIGFsbG93cyBtb2RpZnlpbmdcblx0XHRcdC8vIHRoZSBvcHRpb25zIGluc2lkZSB0aGUgc2V0dGVyXG5cdFx0XHRvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcblxuXHRcdFx0Ly8gR28gb3ZlciBhbGwgdGhlIHNldCBhdHRyaWJ1dGVzIGFuZCBjYWxsIHRoZSBzZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRmb3IgKGF0dHIgaW4gYXR0cnMpIHtcblx0XHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLnNldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdFx0YXR0cnNbYXR0cl0gPSB0aGlzLnNldHRlcnNbYXR0cl0uY2FsbCh0aGlzLCBhdHRyc1thdHRyXSwgb3B0aW9ucyk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5zZXQuY2FsbCh0aGlzLCBhdHRycywgb3B0aW9ucyk7XG5cdFx0fSxcblxuXHRcdGdldHRlcnM6IHt9LFxuXG5cdFx0c2V0dGVyczoge31cblxuXHR9KTtcblxuXHRvc20uTWFya2VyRGF0YSA9IEdTTW9kZWwuZXh0ZW5kKHtcblx0XHRnZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRTZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdFNldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHR9LFxuXHRcdGlzRGVmYXVsdExhYmVsOmZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuZ2V0KCdsYWJlbCcpID09PSB0aGlzLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJDb2xsZWN0aW9uID0gQmFja2JvbmUuQ29sbGVjdGlvbi5leHRlbmQoe1xuXHRcdG1vZGVsOm9zbS5NYXJrZXJEYXRhXG5cdH0pO1xuXHRcblx0XG5cdG9zbS5NYXBEYXRhID0gR1NNb2RlbC5leHRlbmQoe1xuXHRcdGdldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0R2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRHZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHR6b29tOmludEdldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0c2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRTZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdFNldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdHpvb206aW50U2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKG8pIHtcblx0XHRcdHRoaXMuc2V0KCAnbWFya2VycycsIG5ldyBvc20uTWFya2VyQ29sbGVjdGlvbihvLm1hcmtlcnMpICk7XG5cdFx0XHRHU01vZGVsLnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKVxuXHRcdH1cblx0fSk7XG5cdG9zbS5NYXJrZXJFbnRyeSA9IHdwLkJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblx0XHR0YWdOYW1lOiAnZGl2Jyxcblx0XHRjbGFzc05hbWU6J29zbS1tYXJrZXInLFxuXHRcdHRlbXBsYXRlOndwLnRlbXBsYXRlKCdvc20tbWFya2VyLWlucHV0JyksXG5cdFx0ZXZlbnRzOiB7XG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cImxvY2F0ZS1tYXJrZXJcIl0nIDogJ2xvY2F0ZV9tYXJrZXInLFxuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJyZW1vdmUtbWFya2VyXCJdJyA6ICdyZW1vdmVfbWFya2VyJyxcblx0XHRcdCdjaGFuZ2UgW2RhdGEtbmFtZT1cImxhYmVsXCJdJ1x0XHQ6ICd1cGRhdGVfbWFya2VyX2xhYmVsJyxcbi8vXHRcdFx0J2ZvY3VzIFt0eXBlPVwidGV4dFwiXSdcdFx0XHRcdDogJ2hpbGl0ZV9tYXJrZXInXG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKG9wdCl7XG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5pbml0aWFsaXplLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHRoaXMubWFya2VyID0gb3B0Lm1hcmtlcjsgLy8gbGVhZmxldCBtYXJrZXJcblx0XHRcdHRoaXMubWFya2VyLm9zbV9jb250cm9sbGVyID0gdGhpcztcblx0XHRcdHRoaXMubW9kZWwgPSBvcHQubW9kZWw7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhYmVsJywgdGhpcy5jaGFuZ2VkTGFiZWwgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6ZGVmYXVsdF9sYWJlbCcsIHRoaXMuY2hhbmdlZERlZmF1bHRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYXQnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bG5nJywgdGhpcy5jaGFuZ2VkbGF0TG5nICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnZGVzdHJveScsIHRoaXMucmVtb3ZlICk7XG5cdFx0XHRyZXR1cm4gdGhpcy5yZW5kZXIoKTtcblx0XHR9LFxuXHRcdGNoYW5nZWRMYWJlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKTtcblx0XHRcdHRoaXMuJCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJykudmFsKCBsYWJlbCApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG5cdFx0XHR0aGlzLm1hcmtlci51bmJpbmRUb29sdGlwKCk7XG5cdFx0XHR0aGlzLm1hcmtlci5iaW5kVG9vbHRpcChsYWJlbCk7XG5cblx0XHRcdHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgPSBsYWJlbDtcblxuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hdHRyKCAndGl0bGUnLCBsYWJlbCApO1xuXG5cdFx0fSxcblx0XHRjaGFuZ2VkRGVmYXVsdExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdC8vIHVwZGF0ZSBsYWJlbCB0b28sIGlmXG5cdFx0XHRpZiAoIHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpID09PSB0aGlzLm1vZGVsLnByZXZpb3VzKCdkZWZhdWx0X2xhYmVsJykgKSB7XG5cdFx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIHRoaXMubW9kZWwuZ2V0KCdkZWZhdWx0X2xhYmVsJykgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdGNoYW5nZWRsYXRMbmc6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5tYXJrZXIuc2V0TGF0TG5nKCB7IGxhdDp0aGlzLm1vZGVsLmdldCgnbGF0JyksIGxuZzp0aGlzLm1vZGVsLmdldCgnbG5nJykgfSApXG5cdFx0fSxcblx0XHRyZW5kZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLnJlbmRlci5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tkYXRhLW5hbWU9XCJsYWJlbFwiXScpXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmhpbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5sb2xpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC52YWwoIHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHQkKHRoaXMubWFya2VyLl9pY29uKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRzZWxmLmhpbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlX21hcmtlcl9sYWJlbDpmdW5jdGlvbihlKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSAkKGUudGFyZ2V0KS52YWwoKTtcblx0XHRcdGlmICggJycgPT09IGxhYmVsICkge1xuXHRcdFx0XHRsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdkZWZhdWx0X2xhYmVsJyk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm1vZGVsLnNldCgnbGFiZWwnLCBsYWJlbCApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2dlb2NvZGU6ZnVuY3Rpb24oIGxhYmVsICkge1xuXG5cdFx0XHRpZiAoIHRoaXMubW9kZWwuaXNEZWZhdWx0TGFiZWwoKSApIHtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbHNcblx0XHRcdFx0dGhpcy5zZXRfbWFya2VyX2xhYmVsKCBsYWJlbCApO1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsIGlucHV0XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWdlb2NvZGVcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMuX3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXIoKTtcblxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRfdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcjogZnVuY3Rpb24oICkge1xuXHRcdFx0dmFyIGxhdGxuZyA9IHRoaXMubWFya2VyLmdldExhdExuZygpO1xuXHRcdFx0Lypcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhdFwiXScpLnZhbCggbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbG5nXCJdJykudmFsKCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYWJlbFwiXScpLnZhbCggdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0LyovXG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhdCcsIGxhdGxuZy5sYXQgKTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbG5nJywgbGF0bG5nLmxuZyApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsYWJlbCcsIHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdC8vKi9cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aGlsaXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5hZGRDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkuYWRkQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvbGl0ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dGhpcy4kZWwucmVtb3ZlQ2xhc3MoJ2ZvY3VzJyk7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLnJlbW92ZUNsYXNzKCdmb2N1cycpXG5cdFx0fSxcblx0XHRsb2NhdGVfbWFya2VyOmZ1bmN0aW9uKCl7XG5cdFx0XHR0aGlzLm1hcmtlci5fbWFwLmZseVRvKCB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKSApO1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRyZW1vdmVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdC8vIGNsaWNrIHJlbW92ZVxuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0dGhpcy5tb2RlbC5kZXN0cm95KCk7IC8vIFxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRwbGluZzpmdW5jdGlvbigpIHtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pLmh0bWwoJycpLmFwcGVuZCgnPHNwYW4gY2xhc3M9XCJwbGluZ1wiPjwvc3Bhbj4nKTtcblx0XHR9XG5cdH0pO1xuXG5cdG9zbS5GaWVsZCA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKHtcblxuXHRcdG1hcDogbnVsbCxcblx0XHRmaWVsZDogbnVsbCxcblx0XHRnZW9jb2RlcjogbnVsbCxcblx0XHR2aXNpYmxlOiBudWxsLFxuXHRcdCRwYXJlbnQ6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzLC5hY2YtZmllbGQtb3Blbi1zdHJlZXQtbWFwJylcblx0XHR9LFxuXHRcdCR2YWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXQub3NtLWpzb24nKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZ2V0TWFwRGF0YSgpO1xuXG5cdFx0XHR0aGlzLmNvbmZpZ1x0XHQ9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWc7XG5cblx0XHRcdHRoaXMubWFwXHRcdD0gY29uZi5tYXA7XG5cblx0XHRcdHRoaXMuZmllbGRcdFx0PSBjb25mLmZpZWxkO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gZmFsc2U7XG5cblx0XHRcdHRoaXMuaW5pdF9hY2YoKTtcblxuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5hbGxvd19wcm92aWRlcnMgKSB7XG5cdFx0XHRcdC8vIHByZXZlbnQgZGVmYXVsdCBsYXllciBjcmVhdGlvblxuXHRcdFx0XHR0aGlzLiRlbC5vbiggJ2FjZi1vc20tbWFwLWNyZWF0ZS1sYXllcnMnLCB0aGlzLnByZXZlbnREZWZhdWx0ICk7XG5cdFx0XHRcdHRoaXMuaW5pdExheWVycygpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRlbC5vbiggJ2FjZi1vc20tbWFwLWNyZWF0ZS1tYXJrZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApO1xuXG5cdFx0XHR0aGlzLmluaXRNYXJrZXJzKCk7XG5cblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2UnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnYWRkJywgdGhpcy5hZGRNYXJrZXIgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAncmVtb3ZlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdC8vdGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYXllcnMnLCBjb25zb2xlLnRyYWNlICk7XG5cblx0XHRcdC8vIHVwZGF0ZSBvbiBtYXAgdmlldyBjaGFuZ2Vcblx0XHRcdHRoaXMubWFwLm9uKCd6b29tZW5kJyxmdW5jdGlvbigpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnem9vbScsc2VsZi5tYXAuZ2V0Wm9vbSgpKTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5tYXAub24oJ21vdmVlbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBzZWxmLm1hcC5nZXRDZW50ZXIoKTtcblx0XHRcdFx0XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsYXQnLGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xuZycsbGF0bG5nLmxuZyApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMudXBkYXRlX3Zpc2libGUoKTtcblxuXHRcdFx0dGhpcy51cGRhdGVfbWFwKCk7XG5cblxuXHRcdFx0Ly8ga2IgbmF2aWdhdGlvbiBtaWdodCBpbnRlcmZlcmUgd2l0aCBvdGhlciBrYiBsaXN0ZW5lcnNcblx0XHRcdHRoaXMubWFwLmtleWJvYXJkLmRpc2FibGUoKTtcblxuXHRcdFx0YWNmLmFkZEFjdGlvbigncmVtb3VudF9maWVsZC90eXBlPW9wZW5fc3RyZWV0X21hcCcsIGZ1bmN0aW9uKGZpZWxkKXtcblx0XHRcdFx0aWYgKCBzZWxmLmZpZWxkID09PSBmaWVsZCApIHtcblx0XHRcdFx0XHRzZWxmLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRnZXRNYXBEYXRhOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSBKU09OLnBhcnNlKCB0aGlzLiR2YWx1ZSgpLnZhbCgpICk7XG5cdFx0XHRkYXRhLmxhdCA9IGRhdGEubGF0IHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxhdCcpO1xuXHRcdFx0ZGF0YS5sbmcgPSBkYXRhLmxuZyB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC1sbmcnKTtcblx0XHRcdGRhdGEuem9vbSA9IGRhdGEuem9vbSB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC16b29tJyk7XG5cdFx0XHRyZXR1cm4gZGF0YTtcblx0XHR9LFxuXHRcdHVwZGF0ZVZhbHVlOmZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kdmFsdWUoKS52YWwoIEpTT04uc3RyaW5naWZ5KCB0aGlzLm1vZGVsLnRvSlNPTigpICkgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdC8vdGhpcy4kZWwudHJpZ2dlcignY2hhbmdlJylcblx0XHRcdHRoaXMudXBkYXRlTWFya2VyU3RhdGUoKTtcblx0XHR9LFxuXHRcdHVwZGF0ZU1hcmtlclN0YXRlOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxlbiA9IHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJykubGVuZ3RoO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oYXMtbWFya2VycycsICEhbGVuID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWNhbi1hZGQtbWFya2VyJywgKCBmYWxzZSA9PT0gdGhpcy5jb25maWcubWF4X21hcmtlcnMgfHwgbGVuIDwgdGhpcy5jb25maWcubWF4X21hcmtlcnMpID8gJ3RydWUnIDogJ2ZhbHNlJyk7XHRcblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqXHRNYXJrZXJzXG5cdFx0ICovXG5cdFx0YWRkTWFya2VyOmZ1bmN0aW9uKCBtb2RlbCwgY29sbGVjdGlvbiApIHtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHQvLyBhZGQgbWFya2VyIHRvIG1hcFxuXHRcdFx0dmFyIG1hcmtlciA9IEwubWFya2VyKCB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH0sIHtcblx0XHRcdFx0XHR0aXRsZTogbW9kZWwuZ2V0KCdsYWJlbCcpLFxuXHRcdFx0XHRcdGljb246IHRoaXMuaWNvbixcblx0XHRcdFx0fSlcblx0XHRcdFx0LmJpbmRUb29sdGlwKCBtb2RlbC5nZXQoJ2xhYmVsJykgKTtcblxuXHRcdFx0Ly8gXG5cdFx0XHR2YXIgZW50cnkgPSBuZXcgb3NtLk1hcmtlckVudHJ5KHtcblx0XHRcdFx0Y29udHJvbGxlcjogdGhpcyxcblx0XHRcdFx0bWFya2VyOiBtYXJrZXIsXG5cdFx0XHRcdG1vZGVsOiBtb2RlbFxuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubWFwLm9uY2UoJ2xheWVyYWRkJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0bWFya2VyXG5cdFx0XHRcdFx0Lm9uKCdjbGljaycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHRtb2RlbC5kZXN0cm95KCk7XG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQub24oJ2RyYWdlbmQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0Ly8gdXBkYXRlIG1vZGVsIGxuZ2xhdFxuXHRcdFx0XHRcdFx0dmFyIGxhdGxuZyA9IHRoaXMuZ2V0TGF0TG5nKCk7XG5cdFx0XHRcdFx0XHRtb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHRcdFx0XHRtb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHRcdFx0XHRzZWxmLnJldmVyc2VHZW9jb2RlKCBtb2RlbCApO1xuXHRcdFx0XHRcdFx0Ly8gZ2VvY29kZSwgZ2V0IGxhYmVsLCBzZXQgbW9kZWwgbGFiZWwuLi5cblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5kcmFnZ2luZy5lbmFibGUoKTtcblx0XHRcdFx0ZW50cnkuJGVsLmFwcGVuZFRvKCBzZWxmLiRtYXJrZXJzKCkgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtb2RlbC5vbignZGVzdHJveScsZnVuY3Rpb24oKXtcblx0XHRcdFx0bWFya2VyLnJlbW92ZSgpO1xuXHRcdFx0fSk7XG5cblx0XHRcdG1hcmtlci5hZGRUbyggdGhpcy5tYXAgKTtcblx0XHRcdGlmICggdGhpcy5wbGluZ01hcmtlciApIHtcblx0XHRcdFx0ZW50cnkucGxpbmcoKTtcblx0XHRcdH1cblxuXHRcdH0sXG5cdFx0aW5pdE1hcmtlcnM6ZnVuY3Rpb24oKXtcblxuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLmluaXRHZW9jb2RlKCk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhhcy1tYXJrZXJzJywgJ2ZhbHNlJyk7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWNhbi1hZGQtbWFya2VyJywgJ2ZhbHNlJyk7XG5cdFx0XHRcblx0XHRcdC8vIG5vIG1hcmtlcnMgYWxsb3dlZCFcblx0XHRcdGlmICggdGhpcy5jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy5pY29uID0gbmV3IEwuRGl2SWNvbih7XG5cdFx0XHRcdGh0bWw6ICcnLFxuXHRcdFx0XHRjbGFzc05hbWU6J29zbS1tYXJrZXItaWNvbidcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLmZvckVhY2goIGZ1bmN0aW9uKCBtb2RlbCApIHtcblx0XHRcdFx0c2VsZi5hZGRNYXJrZXIoIG1vZGVsICk7XG5cdFx0XHR9ICk7XG5cblx0XHRcdC8vIGRibHRhcCBpcyBub3QgZmlyaW5nIG9uIG1vYmlsZVxuXHRcdFx0aWYgKCBMLkJyb3dzZXIudG91Y2ggJiYgTC5Ccm93c2VyLm1vYmlsZSApIHtcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9ob2xkKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2RibGNsaWNrKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudXBkYXRlTWFya2VyU3RhdGUoKTtcblxuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25fZGJsY2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdFx0dGhpcy5tYXAub24oJ2RibGNsaWNrJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBlLmxhdGxuZztcblx0XHRcdFx0XG5cdFx0XHRcdEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQoZSk7XG5cdFx0XHRcdEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKGUpO1xuXHRcdFx0XHRcblx0XHRcdFx0c2VsZi5hZGRNYXJrZXJCeUxhdExuZyggbGF0bG5nICk7XG5cdFx0XHR9KVxuXHRcdFx0LmRvdWJsZUNsaWNrWm9vbS5kaXNhYmxlKCk7IFxuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2FkZC1tYXJrZXItb24tZGJsY2xpY2snKVxuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25faG9sZDogZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIEwuQnJvd3Nlci5wb2ludGVyICkge1xuXHRcdFx0XHQvLyB1c2UgcG9pbnRlciBldmVudHNcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9ob2xkX3BvaW50ZXIoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIHVzZSB0b3VjaCBldmVudHNcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9ob2xkX3RvdWNoKCk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLiRlbC5hZGRDbGFzcygnYWRkLW1hcmtlci1vbi10YXBob2xkJylcblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2hvbGRfcG9pbnRlcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdF9ob2xkX3RpbWVvdXQgPSA3NTAsXG5cdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSB7fTtcblx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCdwb2ludGVyZG93bicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0X2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHR2YXIgY3AgPSBzZWxmLm1hcC5tb3VzZUV2ZW50VG9Db250YWluZXJQb2ludChlKTtcblx0XHRcdFx0XHRcdHZhciBscCA9IHNlbGYubWFwLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KGNwKVxuXG5cdFx0XHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBzZWxmLm1hcC5sYXllclBvaW50VG9MYXRMbmcobHApIClcblxuXHRcdFx0XHRcdFx0X2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gPSBmYWxzZTtcblx0XHRcdFx0XHR9LCBfaG9sZF90aW1lb3V0ICk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwgJ3BvaW50ZXJ1cCBwb2ludGVybW92ZScsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdCEhIF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdICYmIGNsZWFyVGltZW91dCggX2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gKTtcblx0XHRcdFx0fSk7XG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9ob2xkX3RvdWNoOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRfaG9sZF90aW1lb3V0ID0gNzUwLFxuXHRcdFx0XHRfaG9sZF93YWl0X3RvID0gZmFsc2U7XG5cdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwndG91Y2hzdGFydCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0aWYgKCBlLnRvdWNoZXMubGVuZ3RoICE9PSAxICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRfaG9sZF93YWl0X3RvID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXG5cdFx0XHRcdFx0XHR2YXIgY3AgPSBzZWxmLm1hcC5tb3VzZUV2ZW50VG9Db250YWluZXJQb2ludChlLnRvdWNoZXNbMF0pO1xuXHRcdFx0XHRcdFx0dmFyIGxwID0gc2VsZi5tYXAuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQoY3ApXG5cblx0XHRcdFx0XHRcdHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIHNlbGYubWFwLmxheWVyUG9pbnRUb0xhdExuZyhscCkgKVxuXG5cdFx0XHRcdFx0XHRfaG9sZF93YWl0X3RvID0gZmFsc2U7XG5cdFx0XHRcdFx0fSwgX2hvbGRfdGltZW91dCApO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksICd0b3VjaGVuZCB0b3VjaG1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHQhISBfaG9sZF93YWl0X3RvICYmIGNsZWFyVGltZW91dCggX2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gKTtcblx0XHRcdFx0fSk7XG5cdFx0fSxcblx0XHRhZGRNYXJrZXJCeUxhdExuZzpmdW5jdGlvbihsYXRsbmcpIHtcblx0XHRcdHZhciBjb2xsZWN0aW9uID0gdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSxcblx0XHRcdFx0bW9kZWw7XG5cdFx0XHQvLyBubyBtb3JlIG1hcmtlcnNcblx0XHRcdGlmICggdGhpcy5jb25maWcubWF4X21hcmtlcnMgIT09IGZhbHNlICYmIGNvbGxlY3Rpb24ubGVuZ3RoID49IHRoaXMuY29uZmlnLm1heF9tYXJrZXJzICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHRtb2RlbCA9IG5ldyBvc20uTWFya2VyRGF0YSh7XG5cdFx0XHRcdGxhYmVsOiAnJyxcblx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogJycsXG5cdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcblx0XHRcdFx0bG5nOiBsYXRsbmcubG5nLFxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gdHJ1ZTtcblx0XHRcdGNvbGxlY3Rpb24uYWRkKCBtb2RlbCApO1xuXHRcdFx0dGhpcy5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblx0XHR9LFxuXHRcdC8qKlxuXHRcdCAqXHRHZW9jb2Rpbmdcblx0XHQgKlxuXHRcdCAqXHRAb24gbWFwLmxheWVyYWRkLCBsYXllci5kcmFnZW5kXG5cdFx0ICovXG5cdFx0IGluaXRHZW9jb2RlOmZ1bmN0aW9uKCkge1xuXG4gXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHQkYWJvdmUgPSB0aGlzLiRlbC5wcmV2KCk7XG5cdFx0XHRpZiAoICEgJGFib3ZlLmlzKCAnLmFjZi1vc20tYWJvdmUnICkgKSB7XG5cdFx0XHRcdCRhYm92ZSA9ICQoJzxkaXYgY2xhc3M9XCJhY2Ytb3NtLWFib3ZlXCI+PC9kaXY+JykuaW5zZXJ0QmVmb3JlKCB0aGlzLiRlbCApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JGFib3ZlLmh0bWwoJycpO1x0XHRcdFx0XG5cdFx0XHR9XG5cdFx0XHQvLyBhZGQgYW4gZXh0cmEgY29udHJvbCBwYW5lbCByZWdpb24gZm9yIG91dCBzZWFyY2hcbiBcdFx0XHR0aGlzLm1hcC5fY29udHJvbENvcm5lcnNbJ2Fib3ZlJ10gPSAkYWJvdmUuZ2V0KDApO1xuXG4gXHRcdFx0dGhpcy5nZW9jb2RlciA9IEwuQ29udHJvbC5nZW9jb2Rlcih7XG4gXHRcdFx0XHRjb2xsYXBzZWQ6IGZhbHNlLFxuIFx0XHRcdFx0cG9zaXRpb246J2Fib3ZlJyxcbiBcdFx0XHRcdHBsYWNlaG9sZGVyOmkxOG4uc2VhcmNoLFxuIFx0XHRcdFx0ZXJyb3JNZXNzYWdlOmkxOG4ubm90aGluZ19mb3VuZCxcbiBcdFx0XHRcdHNob3dSZXN1bHRJY29uczp0cnVlLFxuIFx0XHRcdFx0c3VnZ2VzdE1pbkxlbmd0aDozLFxuIFx0XHRcdFx0c3VnZ2VzdFRpbWVvdXQ6MjUwLFxuIFx0XHRcdFx0cXVlcnlNaW5MZW5ndGg6MyxcbiBcdFx0XHRcdGRlZmF1bHRNYXJrR2VvY29kZTpmYWxzZSxcbiBcdFx0XHR9KVxuIFx0XHRcdC5vbignbWFya2dlb2NvZGUnLGZ1bmN0aW9uKGUpe1xuIFx0XHRcdFx0Ly8gc2VhcmNoIHJlc3VsdCBjbGlja1xuIFx0XHRcdFx0dmFyIGxhdGxuZyA9ICBlLmdlb2NvZGUuY2VudGVyLFxuIFx0XHRcdFx0XHRjb3VudF9tYXJrZXJzID0gc2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGgsXG4gXHRcdFx0XHRcdGxhYmVsID0gc2VsZi5wYXJzZUdlb2NvZGVSZXN1bHQoIFsgZS5nZW9jb2RlIF0sIGxhdGxuZyApLFxuIFx0XHRcdFx0XHRtYXJrZXJfZGF0YSA9IHtcbiBcdFx0XHRcdFx0XHRsYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuIFx0XHRcdFx0XHRcdGxuZzogbGF0bG5nLmxuZ1xuIFx0XHRcdFx0XHR9LCBcbiBcdFx0XHRcdFx0bW9kZWw7XG5cblx0XHRcdFx0Ly8gZ2V0dGluZyByaWQgb2YgdGhlIG1vZGFsIOKAkyAjMzVcblx0XHRcdFx0c2VsZi5nZW9jb2Rlci5fY2xlYXJSZXN1bHRzKCk7XG5cdFx0XHRcdHNlbGYuZ2VvY29kZXIuX2lucHV0LnZhbHVlID0gJyc7XG5cblx0XHRcdFx0Ly8gbm8gbWFya2VycyAtIGp1c3QgYWRhcHQgbWFwIHZpZXdcbiBcdFx0XHRcdGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYubWFwLmZpdEJvdW5kcyggZS5nZW9jb2RlLmJib3ggKTtcblxuIFx0XHRcdFx0fVxuXG5cdFx0XHRcdFxuIFx0XHRcdFx0aWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gZmFsc2UgfHwgY291bnRfbWFya2VycyA8IHNlbGYuY29uZmlnLm1heF9tYXJrZXJzICkge1xuXHRcdFx0XHRcdC8vIGluZmluaXRlIG1hcmtlcnMgb3IgbWFya2VycyBzdGlsbCBpbiByYW5nZVxuIFx0XHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmFkZCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fSBlbHNlIGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IDEgKSB7XG5cdFx0XHRcdFx0Ly8gb25lIG1hcmtlciBvbmx5XG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYXQoMCkuc2V0KCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9XG5cbiBcdFx0XHRcdHNlbGYubWFwLnNldFZpZXcoIGxhdGxuZywgc2VsZi5tYXAuZ2V0Wm9vbSgpICk7IC8vIGtlZXAgem9vbSwgbWlnaHQgYmUgY29uZnVzaW5nIGVsc2VcblxuIFx0XHRcdH0pXG4gXHRcdFx0LmFkZFRvKCB0aGlzLm1hcCApO1xuXG4gXHRcdH0sXG5cdFx0cmV2ZXJzZUdlb2NvZGU6ZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLCBcblx0XHRcdFx0bGF0bG5nID0geyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9O1xuXHRcdFx0dGhpcy5nZW9jb2Rlci5vcHRpb25zLmdlb2NvZGVyLnJldmVyc2UoIFxuXHRcdFx0XHRsYXRsbmcsIFxuXHRcdFx0XHRzZWxmLm1hcC5nZXRab29tKCksIFxuXHRcdFx0XHRmdW5jdGlvbiggcmVzdWx0cyApIHtcblx0XHRcdFx0XHRtb2RlbC5zZXQoJ2RlZmF1bHRfbGFiZWwnLCBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggcmVzdWx0cywgbGF0bG5nICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9LFxuXHRcdHBhcnNlR2VvY29kZVJlc3VsdDogZnVuY3Rpb24oIHJlc3VsdHMsIGxhdGxuZyApIHtcblx0XHRcdHZhciBsYWJlbCA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoICEgcmVzdWx0cy5sZW5ndGggKSB7XG5cdFx0XHRcdC8vIGh0dHBzOi8veGtjZC5jb20vMjE3MC9cblx0XHRcdFx0bGFiZWwgPSBsYXRsbmcubGF0ICsgJywgJyArIGxhdGxuZy5sbmc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkLmVhY2goIHJlc3VsdHMsIGZ1bmN0aW9uKCBpLCByZXN1bHQgKSB7XG5cdFx0XHRcdFx0aWYgKCAhISByZXN1bHQuaHRtbCApIHtcblx0XHRcdFx0XHRcdHZhciBodG1sID0gcmVzdWx0Lmh0bWwucmVwbGFjZSgvKFxccyspPC9nLCc8JykucmVwbGFjZSgvPGJyXFwvPi9nLCc8YnIvPiwgJyk7XG5cdFx0XHRcdFx0XHQvLyBhZGQgbWlzc2luZyBzcGFjZXNcblx0XHRcdFx0XHRcdGxhYmVsID0gJCgnPHA+JytodG1sKyc8L3A+JykudGV4dCgpLnRyaW0oKS5yZXBsYWNlKC8oXFxzKykvZywnICcpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYWJlbCA9IHJlc3VsdC5uYW1lO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdHJpbVxuXHRcdFx0cmV0dXJuIGxhYmVsO1xuXHRcdH0sXG5cblxuXG5cdFx0LyoqXG5cdFx0ICpcdExheWVyc1xuXHQgXHQqL1xuXHRcdGluaXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gW10sXG5cdFx0XHRcdGJhc2VMYXllcnMgPSB7fSxcblx0XHRcdFx0b3ZlcmxheXMgPSB7fSxcblx0XHRcdFx0bWFwTGF5ZXJzID0ge30sXG5cdFx0XHRcdGlzX29taXR0ZWQgPSBmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4ga2V5ID09PSBudWxsIHx8ICggISEgc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICYmIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBrZXkgKSA9PT0gLTEgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0dXBNYXAgPSBmdW5jdGlvbiggdmFsLCBrZXkgKXtcblx0XHRcdFx0XHR2YXIgbGF5ZXIsIGxheWVyX2NvbmZpZztcblx0XHRcdFx0XHRpZiAoIF8uaXNPYmplY3QodmFsKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiAkLmVhY2goIHZhbCwgc2V0dXBNYXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGlzX29taXR0ZWQoa2V5KSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAhISBtYXBMYXllcnNbIGtleSBdICkge1xuXHRcdFx0XHRcdFx0bGF5ZXIgPSBtYXBMYXllcnNbIGtleSBdO1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGxheWVyID0gTC50aWxlTGF5ZXIucHJvdmlkZXIoIGtleSAvKiwgbGF5ZXJfY29uZmlnLm9wdGlvbnMqLyApO1xuXHRcdFx0XHRcdFx0fSBjYXRjaChleCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRsYXllci5wcm92aWRlcktleSA9IGtleTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSgga2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0b3ZlcmxheXNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiYXNlTGF5ZXJzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGVjdGVkTGF5ZXJzLmluZGV4T2YoIGtleSApICE9PSAtMSApIHtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKTtcbiBcdFx0XHRcdFx0fVxuIFx0XHRcdFx0fTtcblxuIFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy5tb2RlbC5nZXQoJ2xheWVycycpOyAvLyBzaG91bGQgYmUgbGF5ZXIgc3RvcmUgdmFsdWVcblxuIFx0XHRcdC8vIGZpbHRlciBhdmFpYWxibGUgbGF5ZXJzIGluIGZpZWxkIHZhbHVlXG4gXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgIT09IGZhbHNlICYmIF8uaXNBcnJheSggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICkgKSB7XG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHNlbGVjdGVkTGF5ZXJzLmZpbHRlciggZnVuY3Rpb24oZWwpIHtcbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBlbCApICE9PSAtMTtcbiBcdFx0XHRcdH0pO1xuIFx0XHRcdH1cblxuIFx0XHRcdC8vIHNldCBkZWZhdWx0IGxheWVyXG4gXHRcdFx0aWYgKCAhIHNlbGVjdGVkTGF5ZXJzLmxlbmd0aCApIHtcblxuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuc2xpY2UoIDAsIDEgKTtcblxuIFx0XHRcdH1cblxuIFx0XHRcdC8vIGVkaXRhYmxlIGxheWVycyFcblxuXHRcdFx0dGhpcy5tYXAub24oICdiYXNlbGF5ZXJjaGFuZ2UgbGF5ZXJhZGQgbGF5ZXJyZW1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFxuXHRcdFx0XHRpZiAoICEgZS5sYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGxheWVycyA9IFtdO1xuXG5cdFx0XHRcdHNlbGYubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikge1xuXHRcdFx0XHRcdGlmICggISBsYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSggbGF5ZXIucHJvdmlkZXJLZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRsYXllcnMucHVzaCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYXllcnMudW5zaGlmdCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnbGF5ZXJzJywgbGF5ZXJzICk7XG5cdFx0XHR9ICk7XG5cbiBcdFx0XHQkLmVhY2goIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycywgc2V0dXBNYXAgKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5sYXllcnNDb250cm9sID0gTC5jb250cm9sLmxheWVycyggYmFzZUxheWVycywgb3ZlcmxheXMsIHtcblx0XHRcdFx0Y29sbGFwc2VkOiB0cnVlLFxuXHRcdFx0XHRoaWRlU2luZ2xlQmFzZTogdHJ1ZSxcblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcbiBcdFx0fSxcblx0XHRsYXllcl9pc19vdmVybGF5OiBmdW5jdGlvbiggIGtleSwgbGF5ZXIgKSB7XG5cdFx0XHR2YXIgcGF0dGVybnM7XG5cblx0XHRcdGlmICggbGF5ZXIub3B0aW9ucy5vcGFjaXR5ICYmIGxheWVyLm9wdGlvbnMub3BhY2l0eSA8IDEgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cGF0dGVybnMgPSBbJ14oT3BlbldlYXRoZXJNYXB8T3BlblNlYU1hcCknLFxuXHRcdFx0XHQnT3Blbk1hcFN1cmZlci5BZG1pbkJvdW5kcycsXG5cdFx0XHRcdCdTdGFtZW4uVG9uZXIoSHlicmlkfExpbmVzfExhYmVscyknLFxuXHRcdFx0XHQnQWNldGF0ZS4oZm9yZWdyb3VuZHxsYWJlbHN8cm9hZHMpJyxcblx0XHRcdFx0J0hpbGxTaGFkaW5nJyxcblx0XHRcdFx0J0h5ZGRhLlJvYWRzQW5kTGFiZWxzJyxcblx0XHRcdFx0J15KdXN0aWNlTWFwJyxcblx0XHRcdFx0J09wZW5JbmZyYU1hcC4oUG93ZXJ8VGVsZWNvbXxQZXRyb2xldW18V2F0ZXIpJyxcblx0XHRcdFx0J09wZW5QdE1hcCcsXG5cdFx0XHRcdCdPcGVuUmFpbHdheU1hcCcsXG5cdFx0XHRcdCdPcGVuRmlyZU1hcCcsXG5cdFx0XHRcdCdTYWZlQ2FzdCcsXG5cdFx0XHRcdCdDYXJ0b0RCLkRhcmtNYXR0ZXJPbmx5TGFiZWxzJyxcblx0XHRcdFx0J0NhcnRvREIuUG9zaXRyb25Pbmx5TGFiZWxzJ1xuXHRcdFx0XTtcblx0XHRcdHJldHVybiBrZXkubWF0Y2goJygnICsgcGF0dGVybnMuam9pbignfCcpICsgJyknKSAhPT0gbnVsbDtcblx0XHR9LFxuXHRcdHJlc2V0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCBtYXAgbGF5ZXJzXG5cdFx0XHR0aGlzLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpe1xuXHRcdFx0XHRpZiAoIGxheWVyLmNvbnN0cnVjdG9yID09PSBMLlRpbGVMYXllci5Qcm92aWRlciApIHtcblx0XHRcdFx0XHRsYXllci5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0Ly8gcmVtb3ZlIGxheWVyIGNvbnRyb2xcblx0XHRcdCEhIHRoaXMubGF5ZXJzQ29udHJvbCAmJiB0aGlzLmxheWVyc0NvbnRyb2wucmVtb3ZlKClcblx0XHR9LFxuXHRcdHVwZGF0ZV92aXNpYmxlOiBmdW5jdGlvbigpIHtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgPT09IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy52aXNpYmxlID0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJyk7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHR0aGlzLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2FjZjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHRvZ2dsZV9jYiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIG5vIGNoYW5nZVxuXHRcdFx0XHRcdHNlbGYudXBkYXRlX3Zpc2libGUoKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0Ly8gZXhwYW5kL2NvbGxhcHNlIGFjZiBzZXR0aW5nXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnc2hvdycsIHRvZ2dsZV9jYiApO1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ2hpZGUnLCB0b2dnbGVfY2IgKTtcblxuXHRcdFx0Ly8gZXhwYW5kIHdwIG1ldGFib3hcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdwb3N0Ym94LXRvZ2dsZWQnLCB0b2dnbGVfY2IgKTtcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdjbGljaycsJy53aWRnZXQtdG9wIConLCB0b2dnbGVfY2IgKTtcblxuXHRcdH0sXG5cdFx0dXBkYXRlX21hcDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYXRsbmcgPSB7IGxhdDogdGhpcy5tb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IHRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9XG5cdFx0XHR0aGlzLm1hcC5zZXRWaWV3KCBcblx0XHRcdFx0bGF0bG5nLFxuXHRcdFx0XHR0aGlzLm1vZGVsLmdldCgnem9vbScpIFxuXHRcdFx0KTtcblx0XHR9XG5cdH0pO1xuXG5cblx0JChkb2N1bWVudClcblx0XHQub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdC8vIGRvbid0IGluaXQgaW4gcmVwZWF0ZXIgdGVtcGxhdGVzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmNsb3Nlc3QoJ1tkYXRhLWlkPVwiYWNmY2xvbmVpbmRleFwiXScpLmxlbmd0aCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQub24oICdhY2Ytb3NtLW1hcC1pbml0JywgZnVuY3Rpb24oIGUsIG1hcCApIHtcblx0XHRcdHZhciBlZGl0b3I7XG5cblx0XHRcdC8vIHdyYXAgb3NtLkZpZWxkIGJhY2tib25lIHZpZXcgYXJvdW5kIGVkaXRvcnNcblx0XHRcdGlmICggJChlLnRhcmdldCkuaXMoJ1tkYXRhLWVkaXRvci1jb25maWddJykgKSB7XG5cdFx0XHRcdC8vIGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHQoZnVuY3Rpb24gY2hlY2tWaXMoKXtcblx0XHRcdFx0XHRpZiAoICEgJChlLnRhcmdldCkuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dCggY2hlY2tWaXMsIDI1MCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fSkoKTtcblx0XHRcdFx0ZWRpdG9yID0gbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwLCBmaWVsZDogYWNmLmdldEZpZWxkKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuYWNmLWZpZWxkJykgKSB9ICk7XG5cdFx0XHRcdCQoZS50YXJnZXQpLmRhdGEoICdfbWFwX2VkaXRvcicsIGVkaXRvciApO1xuXHRcdFx0fVxuXHRcdH0pO1xuLy9cdGFjZi5hZGRBY3Rpb24oICduZXdfZmllbGQnLCBmdW5jdGlvbihmaWVsZCl7Y29uc29sZS5sb2coZmllbGQpfSApO1xuXHQvLyBpbml0IHdoZW4gZmllbGRzIGdldCBsb2FkZWQgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdhcHBlbmQnLCBmdW5jdGlvbigpe1xuXHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2h3IC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnc2hvd19maWVsZCcsIGZ1bmN0aW9uKCBmaWVsZCApIHtcblxuXHRcdGlmICggJ29wZW5fc3RyZWV0X21hcCcgIT09IGZpZWxkLnR5cGUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHQgICAgdmFyIGVkaXRvciA9IGZpZWxkLiRlbC5maW5kKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpLmRhdGEoICdfbWFwX2VkaXRvcicgKTtcblx0ICAgIGVkaXRvci51cGRhdGVfdmlzaWJsZSgpO1xuXHR9KTtcblxuXHRcblxufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=
