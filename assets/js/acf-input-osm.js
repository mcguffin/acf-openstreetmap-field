(function( $, arg, exports ){
	var options = arg.options,
		i18n = arg.i18n,
		result_tpl = '<div tabindex="<%= data.i %>" class="osm-result">'
			+ '<%= data.result_text %>'
			+ '<br /><small><%= data.properties.osm_value %></small>'
			+ '</div>';

	var osm = exports.osm = {
	};
	
	var locatorAddControl = null;
	
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
		locator: null,
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

			this.init_locator_add();

			this.init_locator();

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
		init_locator_add:function() {
			var self = this
			
			this.locatorAdd = new L.Control.AddLocationMarker({
				position: 'bottomleft',
				callback: function() {
					self.currentLocation && self.addMarkerByLatLng( self.currentLocation );
					self.locator.stop();
				}
			}).addTo(this.map);
	
		},
		init_locator:function() {
			var self = this;
			this.currentLocation = false;

			this.locator = new L.control.locate({
			    position: 'bottomleft',
				icon: 'dashicons dashicons-location-alt',
				iconLoading:'spinner is-active',
				flyTo:true,
			    strings: {
			        title: i18n.my_location
			    },
				onLocationError:function(err) {}
			}).addTo(this.map);


			this.map.on('locationfound',function(e){

				self.currentLocation = e.latlng;

				setTimeout(function(){
					self.locator.stopFollowing();
					$(self.locator._icon).removeClass('dashicons-warning');
					//self.locatorAdd.addTo(self.map)
				},1);
			})
			this.map.on('locationerror',function(e){
				self.currentLocation = false;
				setTimeout(function(){
					$(self.locator._icon).addClass('dashicons-warning');
				},1);
			})
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
			console.log(options,key)
			return !! layer.isOverlay;
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
			if ( ! L.Control.AddLocationMarker ) {
				L.Control.AddLocationMarker = L.Control.extend({
					onAdd:function() {

						this._container = L.DomUtil.create('div',
							'leaflet-control-add-location-marker leaflet-bar leaflet-control');

						this._link = L.DomUtil.create('a', 'leaflet-bar-part leaflet-bar-part-single', this._container);
		                this._link.title = i18n.add_marker_at_location;
		                this._icon = L.DomUtil.create('span', 'dashicons dashicons-location', this._link);
						L.DomEvent
							.on( this._link, 'click', L.DomEvent.stopPropagation)
							.on( this._link, 'click', L.DomEvent.preventDefault)
							.on( this._link, 'click', this.options.callback, this)
							.on( this._link, 'dblclick', L.DomEvent.stopPropagation);

						return this._container;
					},
					onRemove:function() {
						L.DomEvent
							.off(this._link, 'click', L.DomEvent.stopPropagation )
							.off(this._link, 'click', L.DomEvent.preventDefault )
							.off(this._link, 'click', this.options.callback, this )
							.off(this._link, 'dblclick', L.DomEvent.stopPropagation );
					},
				})				
			}


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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFjZi1pbnB1dC1vc20uanMiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oICQsIGFyZywgZXhwb3J0cyApe1xuXHR2YXIgb3B0aW9ucyA9IGFyZy5vcHRpb25zLFxuXHRcdGkxOG4gPSBhcmcuaTE4bixcblx0XHRyZXN1bHRfdHBsID0gJzxkaXYgdGFiaW5kZXg9XCI8JT0gZGF0YS5pICU+XCIgY2xhc3M9XCJvc20tcmVzdWx0XCI+J1xuXHRcdFx0KyAnPCU9IGRhdGEucmVzdWx0X3RleHQgJT4nXG5cdFx0XHQrICc8YnIgLz48c21hbGw+PCU9IGRhdGEucHJvcGVydGllcy5vc21fdmFsdWUgJT48L3NtYWxsPidcblx0XHRcdCsgJzwvZGl2Pic7XG5cblx0dmFyIG9zbSA9IGV4cG9ydHMub3NtID0ge1xuXHR9O1xuXHRcblx0dmFyIGxvY2F0b3JBZGRDb250cm9sID0gbnVsbDtcblx0XG5cdHZhciBmaXhlZEZsb2F0R2V0dGVyID0gZnVuY3Rpb24oIHByb3AsIGZpeCApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdCggdGhpcy5hdHRyaWJ1dGVzWyBwcm9wIF0gKTtcblx0XHR9XG5cdH1cblx0dmFyIGZpeGVkRmxvYXRTZXR0ZXIgPSBmdW5jdGlvbiggcHJvcCwgZml4ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHBhcnNlRmxvYXQocGFyc2VGbG9hdCh2YWx1ZSkudG9GaXhlZChmaXgpICk7XG5cdFx0fVxuXHR9XG5cdHZhciBpbnRHZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KCB0aGlzLmF0dHJpYnV0ZXNbIHByb3AgXSApO1xuXHRcdH1cblx0fVxuXHR2YXIgaW50U2V0dGVyID0gZnVuY3Rpb24ocHJvcCkge1xuXHRcdHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHBhcnNlSW50KCB2YWx1ZSApO1xuXHRcdH1cblx0fVxuXG5cdHZhciBHU01vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKHtcblxuXHRcdGdldDogZnVuY3Rpb24oYXR0cikge1xuXHRcdFx0Ly8gQ2FsbCB0aGUgZ2V0dGVyIGlmIGF2YWlsYWJsZVxuXHRcdFx0aWYgKF8uaXNGdW5jdGlvbih0aGlzLmdldHRlcnNbYXR0cl0pKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzLmdldHRlcnNbYXR0cl0uY2FsbCh0aGlzKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5nZXQuY2FsbCh0aGlzLCBhdHRyKTtcblx0XHR9LFxuXG5cdFx0c2V0OiBmdW5jdGlvbihrZXksIHZhbHVlLCBvcHRpb25zKSB7XG5cdFx0XHR2YXIgYXR0cnMsIGF0dHI7XG5cblx0XHRcdC8vIE5vcm1hbGl6ZSB0aGUga2V5LXZhbHVlIGludG8gYW4gb2JqZWN0XG5cdFx0XHRpZiAoXy5pc09iamVjdChrZXkpIHx8IGtleSA9PSBudWxsKSB7XG5cdFx0XHRcdGF0dHJzID0ga2V5O1xuXHRcdFx0XHRvcHRpb25zID0gdmFsdWU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRhdHRycyA9IHt9O1xuXHRcdFx0XHRhdHRyc1trZXldID0gdmFsdWU7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGFsd2F5cyBwYXNzIGFuIG9wdGlvbnMgaGFzaCBhcm91bmQuIFRoaXMgYWxsb3dzIG1vZGlmeWluZ1xuXHRcdFx0Ly8gdGhlIG9wdGlvbnMgaW5zaWRlIHRoZSBzZXR0ZXJcblx0XHRcdG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuXG5cdFx0XHQvLyBHbyBvdmVyIGFsbCB0aGUgc2V0IGF0dHJpYnV0ZXMgYW5kIGNhbGwgdGhlIHNldHRlciBpZiBhdmFpbGFibGVcblx0XHRcdGZvciAoYXR0ciBpbiBhdHRycykge1xuXHRcdFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuc2V0dGVyc1thdHRyXSkpIHtcblx0XHRcdFx0XHRhdHRyc1thdHRyXSA9IHRoaXMuc2V0dGVyc1thdHRyXS5jYWxsKHRoaXMsIGF0dHJzW2F0dHJdLCBvcHRpb25zKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLnNldC5jYWxsKHRoaXMsIGF0dHJzLCBvcHRpb25zKTtcblx0XHR9LFxuXG5cdFx0Z2V0dGVyczoge30sXG5cblx0XHRzZXR0ZXJzOiB7fVxuXG5cdH0pO1xuXG5cdG9zbS5NYXJrZXJEYXRhID0gR1NNb2RlbC5leHRlbmQoe1xuXHRcdGdldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0R2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRHZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdFNldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdH0sXG5cdFx0aXNEZWZhdWx0TGFiZWw6ZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5nZXQoJ2xhYmVsJykgPT09IHRoaXMuZ2V0KCdkZWZhdWx0X2xhYmVsJyk7XG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckNvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XG5cdFx0bW9kZWw6b3NtLk1hcmtlckRhdGFcblx0fSk7XG5cdFxuXHRcblx0b3NtLk1hcERhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRHZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdHpvb206aW50R2V0dGVyKCd6b29tJyksXG5cdFx0fSxcblx0XHRzZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdFNldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0U2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRTZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24obykge1xuXHRcdFx0dGhpcy5zZXQoICdtYXJrZXJzJywgbmV3IG9zbS5NYXJrZXJDb2xsZWN0aW9uKG8ubWFya2VycykgKTtcblx0XHRcdEdTTW9kZWwucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpXG5cdFx0fVxuXHR9KTtcblx0b3NtLk1hcmtlckVudHJ5ID0gd3AuQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXHRcdHRhZ05hbWU6ICdkaXYnLFxuXHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlcicsXG5cdFx0dGVtcGxhdGU6d3AudGVtcGxhdGUoJ29zbS1tYXJrZXItaW5wdXQnKSxcblx0XHRldmVudHM6IHtcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwibG9jYXRlLW1hcmtlclwiXScgOiAnbG9jYXRlX21hcmtlcicsXG5cdFx0XHQnY2xpY2sgW2RhdGEtbmFtZT1cInJlbW92ZS1tYXJrZXJcIl0nIDogJ3JlbW92ZV9tYXJrZXInLFxuXHRcdFx0J2NoYW5nZSBbZGF0YS1uYW1lPVwibGFiZWxcIl0nXHRcdDogJ3VwZGF0ZV9tYXJrZXJfbGFiZWwnLFxuLy9cdFx0XHQnZm9jdXMgW3R5cGU9XCJ0ZXh0XCJdJ1x0XHRcdFx0OiAnaGlsaXRlX21hcmtlcidcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24ob3B0KXtcblx0XHRcdHdwLm1lZGlhLlZpZXcucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dGhpcy5tYXJrZXIgPSBvcHQubWFya2VyOyAvLyBsZWFmbGV0IG1hcmtlclxuXHRcdFx0dGhpcy5tYXJrZXIub3NtX2NvbnRyb2xsZXIgPSB0aGlzO1xuXHRcdFx0dGhpcy5tb2RlbCA9IG9wdC5tb2RlbDtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGFiZWwnLCB0aGlzLmNoYW5nZWRMYWJlbCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpkZWZhdWx0X2xhYmVsJywgdGhpcy5jaGFuZ2VkRGVmYXVsdExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsbmcnLCB0aGlzLmNoYW5nZWRsYXRMbmcgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdkZXN0cm95JywgdGhpcy5yZW1vdmUgKTtcblx0XHRcdHJldHVybiB0aGlzLnJlbmRlcigpO1xuXHRcdH0sXG5cdFx0Y2hhbmdlZExhYmVsOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYWJlbCA9IHRoaXMubW9kZWwuZ2V0KCdsYWJlbCcpO1xuXHRcdFx0dGhpcy4kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKS52YWwoIGxhYmVsICkudHJpZ2dlcignY2hhbmdlJyk7XG5cblx0XHRcdHRoaXMubWFya2VyLnVuYmluZFRvb2x0aXAoKTtcblx0XHRcdHRoaXMubWFya2VyLmJpbmRUb29sdGlwKGxhYmVsKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSA9IGxhYmVsO1xuXG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmF0dHIoICd0aXRsZScsIGxhYmVsICk7XG5cblx0XHR9LFxuXHRcdGNoYW5nZWREZWZhdWx0TGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gdXBkYXRlIGxhYmVsIHRvbywgaWZcblx0XHRcdGlmICggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgPT09IHRoaXMubW9kZWwucHJldmlvdXMoJ2RlZmF1bHRfbGFiZWwnKSApIHtcblx0XHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKSApO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Y2hhbmdlZGxhdExuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLm1hcmtlci5zZXRMYXRMbmcoIHsgbGF0OnRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOnRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9IClcblx0XHR9LFxuXHRcdHJlbmRlcjpmdW5jdGlvbigpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUucmVuZGVyLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2RhdGEtbmFtZT1cImxhYmVsXCJdJylcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0XHRzZWxmLmxvbGl0ZV9tYXJrZXIoKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJykgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdCQodGhpcy5tYXJrZXIuX2ljb24pXG5cdFx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYuaGlsaXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHR1cGRhdGVfbWFya2VyX2xhYmVsOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHZhciBsYWJlbCA9ICQoZS50YXJnZXQpLnZhbCgpO1xuXHRcdFx0aWYgKCAnJyA9PT0gbGFiZWwgKSB7XG5cdFx0XHRcdGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2RlZmF1bHRfbGFiZWwnKTtcblx0XHRcdH1cblx0XHRcdHRoaXMubW9kZWwuc2V0KCdsYWJlbCcsIGxhYmVsICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfZ2VvY29kZTpmdW5jdGlvbiggbGFiZWwgKSB7XG5cblx0XHRcdGlmICggdGhpcy5tb2RlbC5pc0RlZmF1bHRMYWJlbCgpICkge1xuXHRcdFx0XHQvLyB1cGRhdGUgbWFya2VyIGxhYmVsc1xuXHRcdFx0XHR0aGlzLnNldF9tYXJrZXJfbGFiZWwoIGxhYmVsICk7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWwgaW5wdXRcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItZ2VvY29kZVwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5fdXBkYXRlX3ZhbHVlc19mcm9tX21hcmtlcigpO1xuXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdF91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyOiBmdW5jdGlvbiggKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCk7XG5cdFx0XHQvKlxuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGF0XCJdJykudmFsKCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sbmdcIl0nKS52YWwoIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxhYmVsXCJdJykudmFsKCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvKi9cblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsbmcnLCBsYXRsbmcubG5nICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xhYmVsJywgdGhpcy5tYXJrZXIub3B0aW9ucy50aXRsZSApO1xuXHRcdFx0Ly8qL1xuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRoaWxpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5hZGRDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9saXRlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmVDbGFzcygnZm9jdXMnKTtcblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkucmVtb3ZlQ2xhc3MoJ2ZvY3VzJylcblx0XHR9LFxuXHRcdGxvY2F0ZV9tYXJrZXI6ZnVuY3Rpb24oKXtcblx0XHRcdHRoaXMubWFya2VyLl9tYXAuZmx5VG8oIHRoaXMubWFya2VyLmdldExhdExuZygpICk7XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHJlbW92ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0Ly8gY2xpY2sgcmVtb3ZlXG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR0aGlzLm1vZGVsLmRlc3Ryb3koKTsgLy8gXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHBsaW5nOmZ1bmN0aW9uKCkge1xuXHRcdFx0JCh0aGlzLm1hcmtlci5faWNvbikuaHRtbCgnJykuYXBwZW5kKCc8c3BhbiBjbGFzcz1cInBsaW5nXCI+PC9zcGFuPicpO1xuXHRcdH1cblx0fSk7XG5cblx0b3NtLkZpZWxkID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xuXG5cdFx0bWFwOiBudWxsLFxuXHRcdGZpZWxkOiBudWxsLFxuXHRcdGdlb2NvZGVyOiBudWxsLFxuXHRcdGxvY2F0b3I6IG51bGwsXG5cdFx0dmlzaWJsZTogbnVsbCxcblx0XHQkcGFyZW50OmZ1bmN0aW9uKCl7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncywuYWNmLWZpZWxkLW9wZW4tc3RyZWV0LW1hcCcpXG5cdFx0fSxcblx0XHQkdmFsdWU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJ2lucHV0Lm9zbS1qc29uJyk7XG5cdFx0fSxcblx0XHQkcmVzdWx0cyA6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tcmVzdWx0cycpO1xuXHRcdH0sXG5cdFx0JG1hcmtlcnM6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRwYXJlbnQoKS5maW5kKCcub3NtLW1hcmtlcnMnKTtcblx0XHR9LFxuXHRcdHByZXZlbnREZWZhdWx0OiBmdW5jdGlvbiggZSApIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24oY29uZikge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGRhdGEgPSB0aGlzLmdldE1hcERhdGEoKTtcblxuXHRcdFx0dGhpcy5jb25maWdcdFx0PSB0aGlzLiRlbC5kYXRhKCkuZWRpdG9yQ29uZmlnO1xuXG5cdFx0XHR0aGlzLm1hcFx0XHQ9IGNvbmYubWFwO1xuXG5cdFx0XHR0aGlzLmZpZWxkXHRcdD0gY29uZi5maWVsZDtcblxuXHRcdFx0dGhpcy5tb2RlbFx0XHQ9IG5ldyBvc20uTWFwRGF0YShkYXRhKTtcblxuXHRcdFx0dGhpcy5wbGluZ01hcmtlciA9IGZhbHNlO1xuXG5cdFx0XHR0aGlzLmluaXRfbG9jYXRvcl9hZGQoKTtcblxuXHRcdFx0dGhpcy5pbml0X2xvY2F0b3IoKTtcblxuXHRcdFx0dGhpcy5pbml0X2FjZigpO1xuXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLmFsbG93X3Byb3ZpZGVycyApIHtcblx0XHRcdFx0Ly8gcHJldmVudCBkZWZhdWx0IGxheWVyIGNyZWF0aW9uXG5cdFx0XHRcdHRoaXMuJGVsLm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlLWxheWVycycsIHRoaXMucHJldmVudERlZmF1bHQgKTtcblx0XHRcdFx0dGhpcy5pbml0TGF5ZXJzKCk7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuJGVsLm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlLW1hcmtlcnMnLCB0aGlzLnByZXZlbnREZWZhdWx0ICk7XG5cblx0XHRcdHRoaXMuaW5pdE1hcmtlcnMoKTtcblxuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLmFkZE1hcmtlciApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdyZW1vdmUnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0Ly90aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxheWVycycsIGNvbnNvbGUudHJhY2UgKTtcblxuXHRcdFx0Ly8gdXBkYXRlIG9uIG1hcCB2aWV3IGNoYW5nZVxuXHRcdFx0dGhpcy5tYXAub24oJ3pvb21lbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCd6b29tJyxzZWxmLm1hcC5nZXRab29tKCkpO1xuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLm1hcC5vbignbW92ZWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IHNlbGYubWFwLmdldENlbnRlcigpO1xuXHRcdFx0XHRcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xhdCcsbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnbG5nJyxsYXRsbmcubG5nICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy51cGRhdGVfdmlzaWJsZSgpO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV9tYXAoKTtcblxuXG5cdFx0XHQvLyBrYiBuYXZpZ2F0aW9uIG1pZ2h0IGludGVyZmVyZSB3aXRoIG90aGVyIGtiIGxpc3RlbmVyc1xuXHRcdFx0dGhpcy5tYXAua2V5Ym9hcmQuZGlzYWJsZSgpO1xuXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCdyZW1vdW50X2ZpZWxkL3R5cGU9b3Blbl9zdHJlZXRfbWFwJywgZnVuY3Rpb24oZmllbGQpe1xuXHRcdFx0XHRpZiAoIHNlbGYuZmllbGQgPT09IGZpZWxkICkge1xuXHRcdFx0XHRcdHNlbGYubWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGluaXRfbG9jYXRvcl9hZGQ6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXNcblx0XHRcdFxuXHRcdFx0dGhpcy5sb2NhdG9yQWRkID0gbmV3IEwuQ29udHJvbC5BZGRMb2NhdGlvbk1hcmtlcih7XG5cdFx0XHRcdHBvc2l0aW9uOiAnYm90dG9tbGVmdCcsXG5cdFx0XHRcdGNhbGxiYWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLmN1cnJlbnRMb2NhdGlvbiAmJiBzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBzZWxmLmN1cnJlbnRMb2NhdGlvbiApO1xuXHRcdFx0XHRcdHNlbGYubG9jYXRvci5zdG9wKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcblx0XG5cdFx0fSxcblx0XHRpbml0X2xvY2F0b3I6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLmN1cnJlbnRMb2NhdGlvbiA9IGZhbHNlO1xuXG5cdFx0XHR0aGlzLmxvY2F0b3IgPSBuZXcgTC5jb250cm9sLmxvY2F0ZSh7XG5cdFx0XHQgICAgcG9zaXRpb246ICdib3R0b21sZWZ0Jyxcblx0XHRcdFx0aWNvbjogJ2Rhc2hpY29ucyBkYXNoaWNvbnMtbG9jYXRpb24tYWx0Jyxcblx0XHRcdFx0aWNvbkxvYWRpbmc6J3NwaW5uZXIgaXMtYWN0aXZlJyxcblx0XHRcdFx0Zmx5VG86dHJ1ZSxcblx0XHRcdCAgICBzdHJpbmdzOiB7XG5cdFx0XHQgICAgICAgIHRpdGxlOiBpMThuLm15X2xvY2F0aW9uXG5cdFx0XHQgICAgfSxcblx0XHRcdFx0b25Mb2NhdGlvbkVycm9yOmZ1bmN0aW9uKGVycikge31cblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcblxuXG5cdFx0XHR0aGlzLm1hcC5vbignbG9jYXRpb25mb3VuZCcsZnVuY3Rpb24oZSl7XG5cblx0XHRcdFx0c2VsZi5jdXJyZW50TG9jYXRpb24gPSBlLmxhdGxuZztcblxuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0c2VsZi5sb2NhdG9yLnN0b3BGb2xsb3dpbmcoKTtcblx0XHRcdFx0XHQkKHNlbGYubG9jYXRvci5faWNvbikucmVtb3ZlQ2xhc3MoJ2Rhc2hpY29ucy13YXJuaW5nJyk7XG5cdFx0XHRcdFx0Ly9zZWxmLmxvY2F0b3JBZGQuYWRkVG8oc2VsZi5tYXApXG5cdFx0XHRcdH0sMSk7XG5cdFx0XHR9KVxuXHRcdFx0dGhpcy5tYXAub24oJ2xvY2F0aW9uZXJyb3InLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLmN1cnJlbnRMb2NhdGlvbiA9IGZhbHNlO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0JChzZWxmLmxvY2F0b3IuX2ljb24pLmFkZENsYXNzKCdkYXNoaWNvbnMtd2FybmluZycpO1xuXHRcdFx0XHR9LDEpO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGdldE1hcERhdGE6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IEpTT04ucGFyc2UoIHRoaXMuJHZhbHVlKCkudmFsKCkgKTtcblx0XHRcdGRhdGEubGF0ID0gZGF0YS5sYXQgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbGF0Jyk7XG5cdFx0XHRkYXRhLmxuZyA9IGRhdGEubG5nIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxuZycpO1xuXHRcdFx0ZGF0YS56b29tID0gZGF0YS56b29tIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLXpvb20nKTtcblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdFx0dXBkYXRlVmFsdWU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiR2YWx1ZSgpLnZhbCggSlNPTi5zdHJpbmdpZnkoIHRoaXMubW9kZWwudG9KU09OKCkgKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0Ly90aGlzLiRlbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXHRcdFx0dGhpcy51cGRhdGVNYXJrZXJTdGF0ZSgpO1xuXHRcdH0sXG5cdFx0dXBkYXRlTWFya2VyU3RhdGU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGVuID0gdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGg7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhhcy1tYXJrZXJzJywgISFsZW4gPyAndHJ1ZScgOiAnZmFsc2UnKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInLCAoIGZhbHNlID09PSB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyB8fCBsZW4gPCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycykgPyAndHJ1ZScgOiAnZmFsc2UnKTtcdFxuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICpcdE1hcmtlcnNcblx0XHQgKi9cblx0XHRhZGRNYXJrZXI6ZnVuY3Rpb24oIG1vZGVsLCBjb2xsZWN0aW9uICkge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdC8vIGFkZCBtYXJrZXIgdG8gbWFwXG5cdFx0XHR2YXIgbWFya2VyID0gTC5tYXJrZXIoIHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfSwge1xuXHRcdFx0XHRcdHRpdGxlOiBtb2RlbC5nZXQoJ2xhYmVsJyksXG5cdFx0XHRcdFx0aWNvbjogdGhpcy5pY29uLFxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYmluZFRvb2x0aXAoIG1vZGVsLmdldCgnbGFiZWwnKSApO1xuXG5cdFx0XHQvLyBcblx0XHRcdHZhciBlbnRyeSA9IG5ldyBvc20uTWFya2VyRW50cnkoe1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLFxuXHRcdFx0XHRtYXJrZXI6IG1hcmtlcixcblx0XHRcdFx0bW9kZWw6IG1vZGVsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tYXAub25jZSgnbGF5ZXJhZGQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRtYXJrZXJcblx0XHRcdFx0XHQub24oJ2NsaWNrJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdG1vZGVsLmRlc3Ryb3koKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5vbignZHJhZ2VuZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHQvLyB1cGRhdGUgbW9kZWwgbG5nbGF0XG5cdFx0XHRcdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5nZXRMYXRMbmcoKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xhdCcsIGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdFx0XHRcdHNlbGYucmV2ZXJzZUdlb2NvZGUoIG1vZGVsICk7XG5cdFx0XHRcdFx0XHQvLyBnZW9jb2RlLCBnZXQgbGFiZWwsIHNldCBtb2RlbCBsYWJlbC4uLlxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmRyYWdnaW5nLmVuYWJsZSgpO1xuXHRcdFx0XHRlbnRyeS4kZWwuYXBwZW5kVG8oIHNlbGYuJG1hcmtlcnMoKSApO1xuXHRcdFx0fSk7XG5cblx0XHRcdG1vZGVsLm9uKCdkZXN0cm95JyxmdW5jdGlvbigpe1xuXHRcdFx0XHRtYXJrZXIucmVtb3ZlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bWFya2VyLmFkZFRvKCB0aGlzLm1hcCApO1xuXHRcdFx0aWYgKCB0aGlzLnBsaW5nTWFya2VyICkge1xuXHRcdFx0XHRlbnRyeS5wbGluZygpO1xuXHRcdFx0fVxuXG5cdFx0fSxcblx0XHRpbml0TWFya2VyczpmdW5jdGlvbigpe1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuaW5pdEdlb2NvZGUoKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGFzLW1hcmtlcnMnLCAnZmFsc2UnKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInLCAnZmFsc2UnKTtcblx0XHRcdFxuXHRcdFx0Ly8gbm8gbWFya2VycyBhbGxvd2VkIVxuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmljb24gPSBuZXcgTC5EaXZJY29uKHtcblx0XHRcdFx0aHRtbDogJycsXG5cdFx0XHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlci1pY29uJ1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJykuZm9yRWFjaCggZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0XHRzZWxmLmFkZE1hcmtlciggbW9kZWwgKTtcblx0XHRcdH0gKTtcblxuXHRcdFx0Ly8gZGJsdGFwIGlzIG5vdCBmaXJpbmcgb24gbW9iaWxlXG5cdFx0XHRpZiAoIEwuQnJvd3Nlci50b3VjaCAmJiBMLkJyb3dzZXIubW9iaWxlICkge1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGQoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25fZGJsY2xpY2soKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51cGRhdGVNYXJrZXJTdGF0ZSgpO1xuXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9kYmxjbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLm1hcC5vbignZGJsY2xpY2snLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IGUubGF0bG5nO1xuXHRcdFx0XHRcblx0XHRcdFx0TC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdChlKTtcblx0XHRcdFx0TC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24oZSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBsYXRsbmcgKTtcblx0XHRcdH0pXG5cdFx0XHQuZG91YmxlQ2xpY2tab29tLmRpc2FibGUoKTsgXG5cdFx0XHR0aGlzLiRlbC5hZGRDbGFzcygnYWRkLW1hcmtlci1vbi1kYmxjbGljaycpXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9ob2xkOiBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggTC5Ccm93c2VyLnBvaW50ZXIgKSB7XG5cdFx0XHRcdC8vIHVzZSBwb2ludGVyIGV2ZW50c1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGRfcG9pbnRlcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gdXNlIHRvdWNoIGV2ZW50c1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGRfdG91Y2goKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdhZGQtbWFya2VyLW9uLXRhcGhvbGQnKVxuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25faG9sZF9wb2ludGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0X2hvbGRfdGltZW91dCA9IDc1MCxcblx0XHRcdFx0X2hvbGRfd2FpdF90byA9IHt9O1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksJ3BvaW50ZXJkb3duJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdHZhciBjcCA9IHNlbGYubWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUpO1xuXHRcdFx0XHRcdFx0dmFyIGxwID0gc2VsZi5tYXAuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQoY3ApXG5cblx0XHRcdFx0XHRcdHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIHNlbGYubWFwLmxheWVyUG9pbnRUb0xhdExuZyhscCkgKVxuXG5cdFx0XHRcdFx0XHRfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSA9IGZhbHNlO1xuXHRcdFx0XHRcdH0sIF9ob2xkX3RpbWVvdXQgKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCAncG9pbnRlcnVwIHBvaW50ZXJtb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0ISEgX2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gJiYgY2xlYXJUaW1lb3V0KCBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSApO1xuXHRcdFx0XHR9KTtcblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2hvbGRfdG91Y2g6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdF9ob2xkX3RpbWVvdXQgPSA3NTAsXG5cdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBmYWxzZTtcblx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCd0b3VjaHN0YXJ0JyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRpZiAoIGUudG91Y2hlcy5sZW5ndGggIT09IDEgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0XHRcdHZhciBjcCA9IHNlbGYubWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUudG91Y2hlc1swXSk7XG5cdFx0XHRcdFx0XHR2YXIgbHAgPSBzZWxmLm1hcC5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChjcClcblxuXHRcdFx0XHRcdFx0c2VsZi5hZGRNYXJrZXJCeUxhdExuZyggc2VsZi5tYXAubGF5ZXJQb2ludFRvTGF0TG5nKGxwKSApXG5cblx0XHRcdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBmYWxzZTtcblx0XHRcdFx0XHR9LCBfaG9sZF90aW1lb3V0ICk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwgJ3RvdWNoZW5kIHRvdWNobW92ZScsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdCEhIF9ob2xkX3dhaXRfdG8gJiYgY2xlYXJUaW1lb3V0KCBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSApO1xuXHRcdFx0XHR9KTtcblx0XHR9LFxuXHRcdGFkZE1hcmtlckJ5TGF0TG5nOmZ1bmN0aW9uKGxhdGxuZykge1xuXHRcdFx0dmFyIGNvbGxlY3Rpb24gPSB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLFxuXHRcdFx0XHRtb2RlbDtcblx0XHRcdC8vIG5vIG1vcmUgbWFya2Vyc1xuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyAhPT0gZmFsc2UgJiYgY29sbGVjdGlvbi5sZW5ndGggPj0gdGhpcy5jb25maWcubWF4X21hcmtlcnMgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdG1vZGVsID0gbmV3IG9zbS5NYXJrZXJEYXRhKHtcblx0XHRcdFx0bGFiZWw6ICcnLFxuXHRcdFx0XHRkZWZhdWx0X2xhYmVsOiAnJyxcblx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuXHRcdFx0XHRsbmc6IGxhdGxuZy5sbmcsXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMucGxpbmdNYXJrZXIgPSB0cnVlO1xuXHRcdFx0Y29sbGVjdGlvbi5hZGQoIG1vZGVsICk7XG5cdFx0XHR0aGlzLnJldmVyc2VHZW9jb2RlKCBtb2RlbCApO1xuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICpcdEdlb2NvZGluZ1xuXHRcdCAqXG5cdFx0ICpcdEBvbiBtYXAubGF5ZXJhZGQsIGxheWVyLmRyYWdlbmRcblx0XHQgKi9cblx0XHRpbml0R2VvY29kZTpmdW5jdGlvbigpIHtcblxuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JGFib3ZlID0gdGhpcy4kZWwucHJldigpO1xuXHRcdFx0aWYgKCAhICRhYm92ZS5pcyggJy5hY2Ytb3NtLWFib3ZlJyApICkge1xuXHRcdFx0XHQkYWJvdmUgPSAkKCc8ZGl2IGNsYXNzPVwiYWNmLW9zbS1hYm92ZVwiPjwvZGl2PicpLmluc2VydEJlZm9yZSggdGhpcy4kZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRhYm92ZS5odG1sKCcnKTtcdFx0XHRcdFxuXHRcdFx0fVxuXHRcdFx0Ly8gYWRkIGFuIGV4dHJhIGNvbnRyb2wgcGFuZWwgcmVnaW9uIGZvciBvdXQgc2VhcmNoXG4gXHRcdFx0dGhpcy5tYXAuX2NvbnRyb2xDb3JuZXJzWydhYm92ZSddID0gJGFib3ZlLmdldCgwKTtcblxuIFx0XHRcdHRoaXMuZ2VvY29kZXIgPSBMLkNvbnRyb2wuZ2VvY29kZXIoe1xuIFx0XHRcdFx0Y29sbGFwc2VkOiBmYWxzZSxcbiBcdFx0XHRcdHBvc2l0aW9uOidhYm92ZScsXG4gXHRcdFx0XHRwbGFjZWhvbGRlcjppMThuLnNlYXJjaCxcbiBcdFx0XHRcdGVycm9yTWVzc2FnZTppMThuLm5vdGhpbmdfZm91bmQsXG4gXHRcdFx0XHRzaG93UmVzdWx0SWNvbnM6dHJ1ZSxcbiBcdFx0XHRcdHN1Z2dlc3RNaW5MZW5ndGg6MyxcbiBcdFx0XHRcdHN1Z2dlc3RUaW1lb3V0OjI1MCxcbiBcdFx0XHRcdHF1ZXJ5TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRkZWZhdWx0TWFya0dlb2NvZGU6ZmFsc2UsXG4gXHRcdFx0fSlcbiBcdFx0XHQub24oJ21hcmtnZW9jb2RlJyxmdW5jdGlvbihlKXtcbiBcdFx0XHRcdC8vIHNlYXJjaCByZXN1bHQgY2xpY2tcbiBcdFx0XHRcdHZhciBsYXRsbmcgPSAgZS5nZW9jb2RlLmNlbnRlcixcbiBcdFx0XHRcdFx0Y291bnRfbWFya2VycyA9IHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykubGVuZ3RoLFxuIFx0XHRcdFx0XHRsYWJlbCA9IHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCBbIGUuZ2VvY29kZSBdLCBsYXRsbmcgKSxcbiBcdFx0XHRcdFx0bWFya2VyX2RhdGEgPSB7XG4gXHRcdFx0XHRcdFx0bGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGRlZmF1bHRfbGFiZWw6IGxhYmVsLFxuIFx0XHRcdFx0XHRcdGxhdDogbGF0bG5nLmxhdCxcbiBcdFx0XHRcdFx0XHRsbmc6IGxhdGxuZy5sbmdcbiBcdFx0XHRcdFx0fSwgXG4gXHRcdFx0XHRcdG1vZGVsO1xuXG5cdFx0XHRcdC8vIGdldHRpbmcgcmlkIG9mIHRoZSBtb2RhbCDigJMgIzM1XG5cdFx0XHRcdHNlbGYuZ2VvY29kZXIuX2NsZWFyUmVzdWx0cygpO1xuXHRcdFx0XHRzZWxmLmdlb2NvZGVyLl9pbnB1dC52YWx1ZSA9ICcnO1xuXG5cdFx0XHRcdC8vIG5vIG1hcmtlcnMgLSBqdXN0IGFkYXB0IG1hcCB2aWV3XG4gXHRcdFx0XHRpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXG4gXHRcdFx0XHRcdHJldHVybiBzZWxmLm1hcC5maXRCb3VuZHMoIGUuZ2VvY29kZS5iYm94ICk7XG5cbiBcdFx0XHRcdH1cblxuXHRcdFx0XHRcbiBcdFx0XHRcdGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IGZhbHNlIHx8IGNvdW50X21hcmtlcnMgPCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyApIHtcblx0XHRcdFx0XHQvLyBpbmZpbml0ZSBtYXJrZXJzIG9yIG1hcmtlcnMgc3RpbGwgaW4gcmFuZ2VcbiBcdFx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hZGQoIG1hcmtlcl9kYXRhICk7XG5cbiBcdFx0XHRcdH0gZWxzZSBpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzID09PSAxICkge1xuXHRcdFx0XHRcdC8vIG9uZSBtYXJrZXIgb25seVxuIFx0XHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmF0KDApLnNldCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fVxuXG4gXHRcdFx0XHRzZWxmLm1hcC5zZXRWaWV3KCBsYXRsbmcsIHNlbGYubWFwLmdldFpvb20oKSApOyAvLyBrZWVwIHpvb20sIG1pZ2h0IGJlIGNvbmZ1c2luZyBlbHNlXG5cbiBcdFx0XHR9KVxuIFx0XHRcdC5hZGRUbyggdGhpcy5tYXAgKTtcblxuIFx0XHR9LFxuXHRcdHJldmVyc2VHZW9jb2RlOmZ1bmN0aW9uKCBtb2RlbCApIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcywgXG5cdFx0XHRcdGxhdGxuZyA9IHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfTtcblx0XHRcdHRoaXMuZ2VvY29kZXIub3B0aW9ucy5nZW9jb2Rlci5yZXZlcnNlKCBcblx0XHRcdFx0bGF0bG5nLCBcblx0XHRcdFx0c2VsZi5tYXAuZ2V0Wm9vbSgpLCBcblx0XHRcdFx0ZnVuY3Rpb24oIHJlc3VsdHMgKSB7XG5cdFx0XHRcdFx0bW9kZWwuc2V0KCdkZWZhdWx0X2xhYmVsJywgc2VsZi5wYXJzZUdlb2NvZGVSZXN1bHQoIHJlc3VsdHMsIGxhdGxuZyApICk7XG5cdFx0XHRcdH1cblx0XHRcdCk7XG5cdFx0fSxcblx0XHRwYXJzZUdlb2NvZGVSZXN1bHQ6IGZ1bmN0aW9uKCByZXN1bHRzLCBsYXRsbmcgKSB7XG5cdFx0XHR2YXIgbGFiZWwgPSBmYWxzZTtcblxuXHRcdFx0aWYgKCAhIHJlc3VsdHMubGVuZ3RoICkge1xuXHRcdFx0XHQvLyBodHRwczovL3hrY2QuY29tLzIxNzAvXG5cdFx0XHRcdGxhYmVsID0gbGF0bG5nLmxhdCArICcsICcgKyBsYXRsbmcubG5nO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JC5lYWNoKCByZXN1bHRzLCBmdW5jdGlvbiggaSwgcmVzdWx0ICkge1xuXHRcdFx0XHRcdGlmICggISEgcmVzdWx0Lmh0bWwgKSB7XG5cdFx0XHRcdFx0XHR2YXIgaHRtbCA9IHJlc3VsdC5odG1sLnJlcGxhY2UoLyhcXHMrKTwvZywnPCcpLnJlcGxhY2UoLzxiclxcLz4vZywnPGJyLz4sICcpO1xuXHRcdFx0XHRcdFx0Ly8gYWRkIG1pc3Npbmcgc3BhY2VzXG5cdFx0XHRcdFx0XHRsYWJlbCA9ICQoJzxwPicraHRtbCsnPC9wPicpLnRleHQoKS50cmltKCkucmVwbGFjZSgvKFxccyspL2csJyAnKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGFiZWwgPSByZXN1bHQubmFtZTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdC8vIHRyaW1cblx0XHRcdHJldHVybiBsYWJlbDtcblx0XHR9LFxuXG5cblxuXHRcdC8qKlxuXHRcdCAqXHRMYXllcnNcblx0IFx0Ki9cblx0XHRpbml0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IFtdLFxuXHRcdFx0XHRiYXNlTGF5ZXJzID0ge30sXG5cdFx0XHRcdG92ZXJsYXlzID0ge30sXG5cdFx0XHRcdG1hcExheWVycyA9IHt9LFxuXHRcdFx0XHRpc19vbWl0dGVkID0gZnVuY3Rpb24oa2V5KSB7XG5cdFx0XHRcdFx0cmV0dXJuIGtleSA9PT0gbnVsbCB8fCAoICEhIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAmJiBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuaW5kZXhPZigga2V5ICkgPT09IC0xICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHNldHVwTWFwID0gZnVuY3Rpb24oIHZhbCwga2V5ICl7XG5cdFx0XHRcdFx0dmFyIGxheWVyLCBsYXllcl9jb25maWc7XG5cdFx0XHRcdFx0aWYgKCBfLmlzT2JqZWN0KHZhbCkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJC5lYWNoKCB2YWwsIHNldHVwTWFwICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBpc19vbWl0dGVkKGtleSkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggISEgbWFwTGF5ZXJzWyBrZXkgXSApIHtcblx0XHRcdFx0XHRcdGxheWVyID0gbWFwTGF5ZXJzWyBrZXkgXTtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdFx0XHRsYXllciA9IEwudGlsZUxheWVyLnByb3ZpZGVyKCBrZXkgLyosIGxheWVyX2NvbmZpZy5vcHRpb25zKi8gKTtcblx0XHRcdFx0XHRcdH0gY2F0Y2goZXgpIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0bGF5ZXIucHJvdmlkZXJLZXkgPSBrZXk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGtleSwgbGF5ZXIgKSApIHtcblx0XHRcdFx0XHRcdG92ZXJsYXlzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0YmFzZUxheWVyc1trZXldID0gbGF5ZXI7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxlY3RlZExheWVycy5pbmRleE9mKCBrZXkgKSAhPT0gLTEgKSB7XG5cdFx0XHRcdFx0XHRzZWxmLm1hcC5hZGRMYXllcihsYXllcik7XG4gXHRcdFx0XHRcdH1cbiBcdFx0XHRcdH07XG5cbiBcdFx0XHRzZWxlY3RlZExheWVycyA9IHRoaXMubW9kZWwuZ2V0KCdsYXllcnMnKTsgLy8gc2hvdWxkIGJlIGxheWVyIHN0b3JlIHZhbHVlXG5cbiBcdFx0XHQvLyBmaWx0ZXIgYXZhaWFsYmxlIGxheWVycyBpbiBmaWVsZCB2YWx1ZVxuIFx0XHRcdGlmICggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICE9PSBmYWxzZSAmJiBfLmlzQXJyYXkoIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyApICkge1xuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSBzZWxlY3RlZExheWVycy5maWx0ZXIoIGZ1bmN0aW9uKGVsKSB7XG4gXHRcdFx0XHRcdHJldHVybiBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuaW5kZXhPZiggZWwgKSAhPT0gLTE7XG4gXHRcdFx0XHR9KTtcbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBzZXQgZGVmYXVsdCBsYXllclxuIFx0XHRcdGlmICggISBzZWxlY3RlZExheWVycy5sZW5ndGggKSB7XG5cbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLnNsaWNlKCAwLCAxICk7XG5cbiBcdFx0XHR9XG5cbiBcdFx0XHQvLyBlZGl0YWJsZSBsYXllcnMhXG5cblx0XHRcdHRoaXMubWFwLm9uKCAnYmFzZWxheWVyY2hhbmdlIGxheWVyYWRkIGxheWVycmVtb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcblx0XHRcdFx0aWYgKCAhIGUubGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBsYXllcnMgPSBbXTtcblxuXHRcdFx0XHRzZWxmLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpIHtcblx0XHRcdFx0XHRpZiAoICEgbGF5ZXIucHJvdmlkZXJLZXkgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKCBzZWxmLmxheWVyX2lzX292ZXJsYXkoIGxheWVyLnByb3ZpZGVyS2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0bGF5ZXJzLnB1c2goIGxheWVyLnByb3ZpZGVyS2V5IClcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0bGF5ZXJzLnVuc2hpZnQoIGxheWVyLnByb3ZpZGVyS2V5IClcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2xheWVycycsIGxheWVycyApO1xuXHRcdFx0fSApO1xuXG4gXHRcdFx0JC5lYWNoKCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMsIHNldHVwTWFwICk7XG5cdFx0XHRcblx0XHRcdHRoaXMubGF5ZXJzQ29udHJvbCA9IEwuY29udHJvbC5sYXllcnMoIGJhc2VMYXllcnMsIG92ZXJsYXlzLCB7XG5cdFx0XHRcdGNvbGxhcHNlZDogdHJ1ZSxcblx0XHRcdFx0aGlkZVNpbmdsZUJhc2U6IHRydWUsXG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG4gXHRcdH0sXG5cdFx0bGF5ZXJfaXNfb3ZlcmxheTogZnVuY3Rpb24oICBrZXksIGxheWVyICkge1xuXHRcdFx0Y29uc29sZS5sb2cob3B0aW9ucyxrZXkpXG5cdFx0XHRyZXR1cm4gISEgbGF5ZXIuaXNPdmVybGF5O1xuXHRcdFx0dmFyIHBhdHRlcm5zO1xuXG5cdFx0XHRpZiAoIGxheWVyLm9wdGlvbnMub3BhY2l0eSAmJiBsYXllci5vcHRpb25zLm9wYWNpdHkgPCAxICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHBhdHRlcm5zID0gWydeKE9wZW5XZWF0aGVyTWFwfE9wZW5TZWFNYXApJyxcblx0XHRcdFx0J09wZW5NYXBTdXJmZXIuQWRtaW5Cb3VuZHMnLFxuXHRcdFx0XHQnU3RhbWVuLlRvbmVyKEh5YnJpZHxMaW5lc3xMYWJlbHMpJyxcblx0XHRcdFx0J0FjZXRhdGUuKGZvcmVncm91bmR8bGFiZWxzfHJvYWRzKScsXG5cdFx0XHRcdCdIaWxsU2hhZGluZycsXG5cdFx0XHRcdCdIeWRkYS5Sb2Fkc0FuZExhYmVscycsXG5cdFx0XHRcdCdeSnVzdGljZU1hcCcsXG5cdFx0XHRcdCdPcGVuSW5mcmFNYXAuKFBvd2VyfFRlbGVjb218UGV0cm9sZXVtfFdhdGVyKScsXG5cdFx0XHRcdCdPcGVuUHRNYXAnLFxuXHRcdFx0XHQnT3BlblJhaWx3YXlNYXAnLFxuXHRcdFx0XHQnT3BlbkZpcmVNYXAnLFxuXHRcdFx0XHQnU2FmZUNhc3QnLFxuXHRcdFx0XHQnQ2FydG9EQi5EYXJrTWF0dGVyT25seUxhYmVscycsXG5cdFx0XHRcdCdDYXJ0b0RCLlBvc2l0cm9uT25seUxhYmVscydcblx0XHRcdF07XG5cdFx0XHRyZXR1cm4ga2V5Lm1hdGNoKCcoJyArIHBhdHRlcm5zLmpvaW4oJ3wnKSArICcpJykgIT09IG51bGw7XG5cdFx0fSxcblx0XHRyZXNldExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdC8vIHJlbW92ZSBhbGwgbWFwIGxheWVyc1xuXHRcdFx0dGhpcy5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKXtcblx0XHRcdFx0aWYgKCBsYXllci5jb25zdHJ1Y3RvciA9PT0gTC5UaWxlTGF5ZXIuUHJvdmlkZXIgKSB7XG5cdFx0XHRcdFx0bGF5ZXIucmVtb3ZlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pXG5cblx0XHRcdC8vIHJlbW92ZSBsYXllciBjb250cm9sXG5cdFx0XHQhISB0aGlzLmxheWVyc0NvbnRyb2wgJiYgdGhpcy5sYXllcnNDb250cm9sLnJlbW92ZSgpXG5cdFx0fSxcblx0XHR1cGRhdGVfdmlzaWJsZTogZnVuY3Rpb24oKSB7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlID09PSB0aGlzLiRlbC5pcygnOnZpc2libGUnKSApIHtcblx0XHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMudmlzaWJsZSA9IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpO1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSApIHtcblx0XHRcdFx0dGhpcy5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW5pdF9hY2Y6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHR0b2dnbGVfY2IgPSBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHQvLyBubyBjaGFuZ2Vcblx0XHRcdFx0XHRzZWxmLnVwZGF0ZV92aXNpYmxlKCk7XG5cdFx0XHRcdH07XG5cblx0XHRcdC8vIGV4cGFuZC9jb2xsYXBzZSBhY2Ygc2V0dGluZ1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ3Nob3cnLCB0b2dnbGVfY2IgKTtcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdoaWRlJywgdG9nZ2xlX2NiICk7XG5cblx0XHRcdC8vIGV4cGFuZCB3cCBtZXRhYm94XG5cdFx0XHQkKGRvY3VtZW50KS5vbigncG9zdGJveC10b2dnbGVkJywgdG9nZ2xlX2NiICk7XG5cdFx0XHQkKGRvY3VtZW50KS5vbignY2xpY2snLCcud2lkZ2V0LXRvcCAqJywgdG9nZ2xlX2NiICk7XG5cblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXA6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGF0bG5nID0geyBsYXQ6IHRoaXMubW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiB0aGlzLm1vZGVsLmdldCgnbG5nJykgfVxuXHRcdFx0dGhpcy5tYXAuc2V0VmlldyggXG5cdFx0XHRcdGxhdGxuZyxcblx0XHRcdFx0dGhpcy5tb2RlbC5nZXQoJ3pvb20nKSBcblx0XHRcdCk7XG5cdFx0fVxuXHR9KTtcblxuXG5cdCQoZG9jdW1lbnQpXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRpZiAoICEgTC5Db250cm9sLkFkZExvY2F0aW9uTWFya2VyICkge1xuXHRcdFx0XHRMLkNvbnRyb2wuQWRkTG9jYXRpb25NYXJrZXIgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRcdFx0XHRvbkFkZDpmdW5jdGlvbigpIHtcblxuXHRcdFx0XHRcdFx0dGhpcy5fY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2Jyxcblx0XHRcdFx0XHRcdFx0J2xlYWZsZXQtY29udHJvbC1hZGQtbG9jYXRpb24tbWFya2VyIGxlYWZsZXQtYmFyIGxlYWZsZXQtY29udHJvbCcpO1xuXG5cdFx0XHRcdFx0XHR0aGlzLl9saW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICdsZWFmbGV0LWJhci1wYXJ0IGxlYWZsZXQtYmFyLXBhcnQtc2luZ2xlJywgdGhpcy5fY29udGFpbmVyKTtcblx0XHQgICAgICAgICAgICAgICAgdGhpcy5fbGluay50aXRsZSA9IGkxOG4uYWRkX21hcmtlcl9hdF9sb2NhdGlvbjtcblx0XHQgICAgICAgICAgICAgICAgdGhpcy5faWNvbiA9IEwuRG9tVXRpbC5jcmVhdGUoJ3NwYW4nLCAnZGFzaGljb25zIGRhc2hpY29ucy1sb2NhdGlvbicsIHRoaXMuX2xpbmspO1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQpXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKTtcblxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uUmVtb3ZlOmZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uIClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0IClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLm9wdGlvbnMuY2FsbGJhY2ssIHRoaXMgKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uICk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSlcdFx0XHRcdFxuXHRcdFx0fVxuXG5cblx0XHRcdC8vIGRvbid0IGluaXQgaW4gcmVwZWF0ZXIgdGVtcGxhdGVzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmNsb3Nlc3QoJ1tkYXRhLWlkPVwiYWNmY2xvbmVpbmRleFwiXScpLmxlbmd0aCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQub24oICdhY2Ytb3NtLW1hcC1pbml0JywgZnVuY3Rpb24oIGUsIG1hcCApIHtcblx0XHRcdHZhciBlZGl0b3I7XG5cblx0XHRcdC8vIHdyYXAgb3NtLkZpZWxkIGJhY2tib25lIHZpZXcgYXJvdW5kIGVkaXRvcnNcblx0XHRcdGlmICggJChlLnRhcmdldCkuaXMoJ1tkYXRhLWVkaXRvci1jb25maWddJykgKSB7XG5cdFx0XHRcdC8vIGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHQoZnVuY3Rpb24gY2hlY2tWaXMoKXtcblx0XHRcdFx0XHRpZiAoICEgJChlLnRhcmdldCkuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dCggY2hlY2tWaXMsIDI1MCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fSkoKTtcblx0XHRcdFx0ZWRpdG9yID0gbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwLCBmaWVsZDogYWNmLmdldEZpZWxkKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuYWNmLWZpZWxkJykgKSB9ICk7XG5cdFx0XHRcdCQoZS50YXJnZXQpLmRhdGEoICdfbWFwX2VkaXRvcicsIGVkaXRvciApO1xuXHRcdFx0fVxuXHRcdH0pO1xuLy9cdGFjZi5hZGRBY3Rpb24oICduZXdfZmllbGQnLCBmdW5jdGlvbihmaWVsZCl7Y29uc29sZS5sb2coZmllbGQpfSApO1xuXHQvLyBpbml0IHdoZW4gZmllbGRzIGdldCBsb2FkZWQgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdhcHBlbmQnLCBmdW5jdGlvbigpe1xuXHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2h3IC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnc2hvd19maWVsZCcsIGZ1bmN0aW9uKCBmaWVsZCApIHtcblxuXHRcdGlmICggJ29wZW5fc3RyZWV0X21hcCcgIT09IGZpZWxkLnR5cGUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHQgICAgdmFyIGVkaXRvciA9IGZpZWxkLiRlbC5maW5kKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpLmRhdGEoICdfbWFwX2VkaXRvcicgKTtcblx0ICAgIGVkaXRvci51cGRhdGVfdmlzaWJsZSgpO1xuXHR9KTtcblxuXHRcblxufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=
