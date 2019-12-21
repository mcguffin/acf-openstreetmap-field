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
				geocoder:L.Control.Geocoder.nominatim({ 
					htmlTemplate: function(result) {
						var parts = [],
							templateConfig = {
								interpolate: /\{(.+?)\}/g
							},
							addr = _.defaults( result.address, {
								building:'',
								road:'',
								house_number:'',
								
								postcode:'',
								city:'',
								town:'',
								village:'',
								hamlet:'',
								
								state:'',
								country:'',
							} );

						parts.push( _.template( i18n.address_format.street, templateConfig )( addr ) );

						parts.push( _.template( i18n.address_format.city, templateConfig )( addr ) );

						parts.push( _.template( i18n.address_format.country, templateConfig )( addr ) );

						return parts
							.map( function(el) { return el.replace(/\s+/g,' ').trim() } )
							.filter( function(el) { return el !== '' } )
							.join(', ')
					}
				})
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

					label = result.html;

					// if ( !! result.html ) {
					// 	var html = result.html.replace(/(\s+)</g,'<').replace(/<br\/>/g,'<br/>, ');
					// 	// add missing spaces
					// 	label = $('<p>'+html+'</p>').text().trim().replace(/(\s+)/g,' ');
					// } else {
					// 	label = result.name;
					// }
					// return false;
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWlucHV0LW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvcHRpb25zID0gYXJnLm9wdGlvbnMsXG5cdFx0aTE4biA9IGFyZy5pMThuLFxuXHRcdHJlc3VsdF90cGwgPSAnPGRpdiB0YWJpbmRleD1cIjwlPSBkYXRhLmkgJT5cIiBjbGFzcz1cIm9zbS1yZXN1bHRcIj4nXG5cdFx0XHQrICc8JT0gZGF0YS5yZXN1bHRfdGV4dCAlPidcblx0XHRcdCsgJzxiciAvPjxzbWFsbD48JT0gZGF0YS5wcm9wZXJ0aWVzLm9zbV92YWx1ZSAlPjwvc21hbGw+J1xuXHRcdFx0KyAnPC9kaXY+JztcblxuXHR2YXIgb3NtID0gZXhwb3J0cy5vc20gPSB7XG5cdH07XG5cdFxuXHR2YXIgbG9jYXRvckFkZENvbnRyb2wgPSBudWxsO1xuXHRcblx0dmFyIGZpeGVkRmxvYXRHZXR0ZXIgPSBmdW5jdGlvbiggcHJvcCwgZml4ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KCB0aGlzLmF0dHJpYnV0ZXNbIHByb3AgXSApO1xuXHRcdH1cblx0fVxuXHR2YXIgZml4ZWRGbG9hdFNldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChwYXJzZUZsb2F0KHZhbHVlKS50b0ZpeGVkKGZpeCkgKTtcblx0XHR9XG5cdH1cblx0dmFyIGludEdldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBpbnRTZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHZhbHVlICk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIEdTTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG5cdFx0Z2V0OiBmdW5jdGlvbihhdHRyKSB7XG5cdFx0XHQvLyBDYWxsIHRoZSBnZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuZ2V0dGVyc1thdHRyXSkpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0dGVyc1thdHRyXS5jYWxsKHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGF0dHIpO1xuXHRcdH0sXG5cblx0XHRzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHtcblx0XHRcdHZhciBhdHRycywgYXR0cjtcblxuXHRcdFx0Ly8gTm9ybWFsaXplIHRoZSBrZXktdmFsdWUgaW50byBhbiBvYmplY3Rcblx0XHRcdGlmIChfLmlzT2JqZWN0KGtleSkgfHwga2V5ID09IG51bGwpIHtcblx0XHRcdFx0YXR0cnMgPSBrZXk7XG5cdFx0XHRcdG9wdGlvbnMgPSB2YWx1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF0dHJzID0ge307XG5cdFx0XHRcdGF0dHJzW2tleV0gPSB2YWx1ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYWx3YXlzIHBhc3MgYW4gb3B0aW9ucyBoYXNoIGFyb3VuZC4gVGhpcyBhbGxvd3MgbW9kaWZ5aW5nXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyBpbnNpZGUgdGhlIHNldHRlclxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHRcdC8vIEdvIG92ZXIgYWxsIHRoZSBzZXQgYXR0cmlidXRlcyBhbmQgY2FsbCB0aGUgc2V0dGVyIGlmIGF2YWlsYWJsZVxuXHRcdFx0Zm9yIChhdHRyIGluIGF0dHJzKSB7XG5cdFx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5zZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRcdGF0dHJzW2F0dHJdID0gdGhpcy5zZXR0ZXJzW2F0dHJdLmNhbGwodGhpcywgYXR0cnNbYXR0cl0sIG9wdGlvbnMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgYXR0cnMsIG9wdGlvbnMpO1xuXHRcdH0sXG5cblx0XHRnZXR0ZXJzOiB7fSxcblxuXHRcdHNldHRlcnM6IHt9XG5cblx0fSk7XG5cblx0b3NtLk1hcmtlckRhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRHZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0U2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRTZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0fSxcblx0XHRpc0RlZmF1bHRMYWJlbDpmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLmdldCgnbGFiZWwnKSA9PT0gdGhpcy5nZXQoJ2RlZmF1bHRfbGFiZWwnKTtcblx0XHR9XG5cdH0pO1xuXHRvc20uTWFya2VyQ29sbGVjdGlvbiA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblx0XHRtb2RlbDpvc20uTWFya2VyRGF0YVxuXHR9KTtcblx0XG5cdFxuXHRvc20uTWFwRGF0YSA9IEdTTW9kZWwuZXh0ZW5kKHtcblx0XHRnZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRHZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0U2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRTZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHR6b29tOmludFNldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvKSB7XG5cdFx0XHR0aGlzLnNldCggJ21hcmtlcnMnLCBuZXcgb3NtLk1hcmtlckNvbGxlY3Rpb24oby5tYXJrZXJzKSApO1xuXHRcdFx0R1NNb2RlbC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cylcblx0XHR9XG5cdH0pO1xuXHRvc20uTWFya2VyRW50cnkgPSB3cC5CYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdFx0dGFnTmFtZTogJ2RpdicsXG5cdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyJyxcblx0XHR0ZW1wbGF0ZTp3cC50ZW1wbGF0ZSgnb3NtLW1hcmtlci1pbnB1dCcpLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJsb2NhdGUtbWFya2VyXCJdJyA6ICdsb2NhdGVfbWFya2VyJyxcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwicmVtb3ZlLW1hcmtlclwiXScgOiAncmVtb3ZlX21hcmtlcicsXG5cdFx0XHQnY2hhbmdlIFtkYXRhLW5hbWU9XCJsYWJlbFwiXSdcdFx0OiAndXBkYXRlX21hcmtlcl9sYWJlbCcsXG4vL1x0XHRcdCdmb2N1cyBbdHlwZT1cInRleHRcIl0nXHRcdFx0XHQ6ICdoaWxpdGVfbWFya2VyJ1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvcHQpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLm1hcmtlciA9IG9wdC5tYXJrZXI7IC8vIGxlYWZsZXQgbWFya2VyXG5cdFx0XHR0aGlzLm1hcmtlci5vc21fY29udHJvbGxlciA9IHRoaXM7XG5cdFx0XHR0aGlzLm1vZGVsID0gb3B0Lm1vZGVsO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYWJlbCcsIHRoaXMuY2hhbmdlZExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmRlZmF1bHRfbGFiZWwnLCB0aGlzLmNoYW5nZWREZWZhdWx0TGFiZWwgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF0JywgdGhpcy5jaGFuZ2VkbGF0TG5nICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxuZycsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2Rlc3Ryb3knLCB0aGlzLnJlbW92ZSApO1xuXHRcdFx0cmV0dXJuIHRoaXMucmVuZGVyKCk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkTGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJyk7XG5cdFx0XHR0aGlzLiQoJ1tkYXRhLW5hbWU9XCJsYWJlbFwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIudW5iaW5kVG9vbHRpcCgpO1xuXHRcdFx0dGhpcy5tYXJrZXIuYmluZFRvb2x0aXAobGFiZWwpO1xuXG5cdFx0XHR0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlID0gbGFiZWw7XG5cblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkuYXR0ciggJ3RpdGxlJywgbGFiZWwgKTtcblxuXHRcdH0sXG5cdFx0Y2hhbmdlZERlZmF1bHRMYWJlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyB1cGRhdGUgbGFiZWwgdG9vLCBpZlxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSA9PT0gdGhpcy5tb2RlbC5wcmV2aW91cygnZGVmYXVsdF9sYWJlbCcpICkge1xuXHRcdFx0XHR0aGlzLm1vZGVsLnNldCgnbGFiZWwnLCB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjaGFuZ2VkbGF0TG5nOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMubWFya2VyLnNldExhdExuZyggeyBsYXQ6dGhpcy5tb2RlbC5nZXQoJ2xhdCcpLCBsbmc6dGhpcy5tb2RlbC5nZXQoJ2xuZycpIH0gKVxuXHRcdH0sXG5cdFx0cmVuZGVyOmZ1bmN0aW9uKCl7XG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQudmFsKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0JCh0aGlzLm1hcmtlci5faWNvbilcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5sb2xpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfbGFiZWw6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIGxhYmVsID0gJChlLnRhcmdldCkudmFsKCk7XG5cdFx0XHRpZiAoICcnID09PSBsYWJlbCApIHtcblx0XHRcdFx0bGFiZWwgPSB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgbGFiZWwgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlX21hcmtlcl9nZW9jb2RlOmZ1bmN0aW9uKCBsYWJlbCApIHtcblxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmlzRGVmYXVsdExhYmVsKCkgKSB7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWxzXG5cdFx0XHRcdHRoaXMuc2V0X21hcmtlcl9sYWJlbCggbGFiZWwgKTtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbCBpbnB1dFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1nZW9jb2RlXCJdJykudmFsKCBsYWJlbCApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG5cdFx0XHR0aGlzLl91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyKCk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0X3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXI6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKTtcblx0XHRcdC8qXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYXRcIl0nKS52YWwoIGxhdGxuZy5sYXQgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxuZ1wiXScpLnZhbCggbGF0bG5nLmxuZyApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGFiZWxcIl0nKS52YWwoIHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdC8qL1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGFiZWwnLCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvLyovXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGhpbGl0ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2ZvY3VzJyk7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmFkZENsYXNzKCdmb2N1cycpXG5cdFx0fSxcblx0XHRsb2xpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5yZW1vdmVDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9jYXRlX21hcmtlcjpmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5tYXJrZXIuX21hcC5mbHlUbyggdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCkgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cmVtb3ZlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHQvLyBjbGljayByZW1vdmVcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMubW9kZWwuZGVzdHJveSgpOyAvLyBcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cGxpbmc6ZnVuY3Rpb24oKSB7XG5cdFx0XHQkKHRoaXMubWFya2VyLl9pY29uKS5odG1sKCcnKS5hcHBlbmQoJzxzcGFuIGNsYXNzPVwicGxpbmdcIj48L3NwYW4+Jyk7XG5cdFx0fVxuXHR9KTtcblxuXHRvc20uRmllbGQgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cblx0XHRtYXA6IG51bGwsXG5cdFx0ZmllbGQ6IG51bGwsXG5cdFx0Z2VvY29kZXI6IG51bGwsXG5cdFx0bG9jYXRvcjogbnVsbCxcblx0XHR2aXNpYmxlOiBudWxsLFxuXHRcdCRwYXJlbnQ6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzLC5hY2YtZmllbGQtb3Blbi1zdHJlZXQtbWFwJylcblx0XHR9LFxuXHRcdCR2YWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXQub3NtLWpzb24nKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZ2V0TWFwRGF0YSgpO1xuXG5cdFx0XHR0aGlzLmNvbmZpZ1x0XHQ9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWc7XG5cblx0XHRcdHRoaXMubWFwXHRcdD0gY29uZi5tYXA7XG5cblx0XHRcdHRoaXMuZmllbGRcdFx0PSBjb25mLmZpZWxkO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gZmFsc2U7XG5cblx0XHRcdHRoaXMuaW5pdF9sb2NhdG9yX2FkZCgpO1xuXG5cdFx0XHR0aGlzLmluaXRfbG9jYXRvcigpO1xuXG5cdFx0XHR0aGlzLmluaXRfYWNmKCk7XG5cblx0XHRcdGlmICggdGhpcy5jb25maWcuYWxsb3dfcHJvdmlkZXJzICkge1xuXHRcdFx0XHQvLyBwcmV2ZW50IGRlZmF1bHQgbGF5ZXIgY3JlYXRpb25cblx0XHRcdFx0dGhpcy4kZWwub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUtbGF5ZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApO1xuXHRcdFx0XHR0aGlzLmluaXRMYXllcnMoKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy4kZWwub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUtbWFya2VycycsIHRoaXMucHJldmVudERlZmF1bHQgKTtcblxuXHRcdFx0dGhpcy5pbml0TWFya2VycygpO1xuXG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2FkZCcsIHRoaXMuYWRkTWFya2VyICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnYWRkJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ3JlbW92ZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdjaGFuZ2UnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHQvL3RoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF5ZXJzJywgY29uc29sZS50cmFjZSApO1xuXG5cdFx0XHQvLyB1cGRhdGUgb24gbWFwIHZpZXcgY2hhbmdlXG5cdFx0XHR0aGlzLm1hcC5vbignem9vbWVuZCcsZnVuY3Rpb24oKXtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ3pvb20nLHNlbGYubWFwLmdldFpvb20oKSk7XG5cdFx0XHR9KTtcblx0XHRcdHRoaXMubWFwLm9uKCdtb3ZlZW5kJyxmdW5jdGlvbigpe1xuXHRcdFx0XHR2YXIgbGF0bG5nID0gc2VsZi5tYXAuZ2V0Q2VudGVyKCk7XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnbGF0JyxsYXRsbmcubGF0ICk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsbmcnLGxhdGxuZy5sbmcgKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLnVwZGF0ZV92aXNpYmxlKCk7XG5cblx0XHRcdHRoaXMudXBkYXRlX21hcCgpO1xuXG5cblx0XHRcdC8vIGtiIG5hdmlnYXRpb24gbWlnaHQgaW50ZXJmZXJlIHdpdGggb3RoZXIga2IgbGlzdGVuZXJzXG5cdFx0XHR0aGlzLm1hcC5rZXlib2FyZC5kaXNhYmxlKCk7XG5cblx0XHRcdGFjZi5hZGRBY3Rpb24oJ3JlbW91bnRfZmllbGQvdHlwZT1vcGVuX3N0cmVldF9tYXAnLCBmdW5jdGlvbihmaWVsZCl7XG5cdFx0XHRcdGlmICggc2VsZi5maWVsZCA9PT0gZmllbGQgKSB7XG5cdFx0XHRcdFx0c2VsZi5tYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0aW5pdF9sb2NhdG9yX2FkZDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpc1xuXHRcdFx0XG5cdFx0XHR0aGlzLmxvY2F0b3JBZGQgPSBuZXcgTC5Db250cm9sLkFkZExvY2F0aW9uTWFya2VyKHtcblx0XHRcdFx0cG9zaXRpb246ICdib3R0b21sZWZ0Jyxcblx0XHRcdFx0Y2FsbGJhY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHNlbGYuY3VycmVudExvY2F0aW9uICYmIHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIHNlbGYuY3VycmVudExvY2F0aW9uICk7XG5cdFx0XHRcdFx0c2VsZi5sb2NhdG9yLnN0b3AoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuXHRcblx0XHR9LFxuXHRcdGluaXRfbG9jYXRvcjpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMuY3VycmVudExvY2F0aW9uID0gZmFsc2U7XG5cblx0XHRcdHRoaXMubG9jYXRvciA9IG5ldyBMLmNvbnRyb2wubG9jYXRlKHtcblx0XHRcdCAgICBwb3NpdGlvbjogJ2JvdHRvbWxlZnQnLFxuXHRcdFx0XHRpY29uOiAnZGFzaGljb25zIGRhc2hpY29ucy1sb2NhdGlvbi1hbHQnLFxuXHRcdFx0XHRpY29uTG9hZGluZzonc3Bpbm5lciBpcy1hY3RpdmUnLFxuXHRcdFx0XHRmbHlUbzp0cnVlLFxuXHRcdFx0ICAgIHN0cmluZ3M6IHtcblx0XHRcdCAgICAgICAgdGl0bGU6IGkxOG4ubXlfbG9jYXRpb25cblx0XHRcdCAgICB9LFxuXHRcdFx0XHRvbkxvY2F0aW9uRXJyb3I6ZnVuY3Rpb24oZXJyKSB7fVxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuXG5cblx0XHRcdHRoaXMubWFwLm9uKCdsb2NhdGlvbmZvdW5kJyxmdW5jdGlvbihlKXtcblxuXHRcdFx0XHRzZWxmLmN1cnJlbnRMb2NhdGlvbiA9IGUubGF0bG5nO1xuXG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzZWxmLmxvY2F0b3Iuc3RvcEZvbGxvd2luZygpO1xuXHRcdFx0XHRcdCQoc2VsZi5sb2NhdG9yLl9pY29uKS5yZW1vdmVDbGFzcygnZGFzaGljb25zLXdhcm5pbmcnKTtcblx0XHRcdFx0XHQvL3NlbGYubG9jYXRvckFkZC5hZGRUbyhzZWxmLm1hcClcblx0XHRcdFx0fSwxKTtcblx0XHRcdH0pXG5cdFx0XHR0aGlzLm1hcC5vbignbG9jYXRpb25lcnJvcicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuY3VycmVudExvY2F0aW9uID0gZmFsc2U7XG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHQkKHNlbGYubG9jYXRvci5faWNvbikuYWRkQ2xhc3MoJ2Rhc2hpY29ucy13YXJuaW5nJyk7XG5cdFx0XHRcdH0sMSk7XG5cdFx0XHR9KVxuXHRcdH0sXG5cdFx0Z2V0TWFwRGF0YTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0gSlNPTi5wYXJzZSggdGhpcy4kdmFsdWUoKS52YWwoKSApO1xuXHRcdFx0ZGF0YS5sYXQgPSBkYXRhLmxhdCB8fCB0aGlzLiRlbC5hdHRyKCdkYXRhLW1hcC1sYXQnKTtcblx0XHRcdGRhdGEubG5nID0gZGF0YS5sbmcgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbG5nJyk7XG5cdFx0XHRkYXRhLnpvb20gPSBkYXRhLnpvb20gfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtem9vbScpO1xuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblx0XHR1cGRhdGVWYWx1ZTpmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJHZhbHVlKCkudmFsKCBKU09OLnN0cmluZ2lmeSggdGhpcy5tb2RlbC50b0pTT04oKSApICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHQvL3RoaXMuJGVsLnRyaWdnZXIoJ2NoYW5nZScpXG5cdFx0XHR0aGlzLnVwZGF0ZU1hcmtlclN0YXRlKCk7XG5cdFx0fSxcblx0XHR1cGRhdGVNYXJrZXJTdGF0ZTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsZW4gPSB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLmxlbmd0aDtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGFzLW1hcmtlcnMnLCAhIWxlbiA/ICd0cnVlJyA6ICdmYWxzZScpO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1jYW4tYWRkLW1hcmtlcicsICggZmFsc2UgPT09IHRoaXMuY29uZmlnLm1heF9tYXJrZXJzIHx8IGxlbiA8IHRoaXMuY29uZmlnLm1heF9tYXJrZXJzKSA/ICd0cnVlJyA6ICdmYWxzZScpO1x0XG5cdFx0fSxcblx0XHQvKipcblx0XHQgKlx0TWFya2Vyc1xuXHRcdCAqL1xuXHRcdGFkZE1hcmtlcjpmdW5jdGlvbiggbW9kZWwsIGNvbGxlY3Rpb24gKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0Ly8gYWRkIG1hcmtlciB0byBtYXBcblx0XHRcdHZhciBtYXJrZXIgPSBMLm1hcmtlciggeyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9LCB7XG5cdFx0XHRcdFx0dGl0bGU6IG1vZGVsLmdldCgnbGFiZWwnKSxcblx0XHRcdFx0XHRpY29uOiB0aGlzLmljb24sXG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5iaW5kVG9vbHRpcCggbW9kZWwuZ2V0KCdsYWJlbCcpICk7XG5cblx0XHRcdC8vIFxuXHRcdFx0dmFyIGVudHJ5ID0gbmV3IG9zbS5NYXJrZXJFbnRyeSh7XG5cdFx0XHRcdGNvbnRyb2xsZXI6IHRoaXMsXG5cdFx0XHRcdG1hcmtlcjogbWFya2VyLFxuXHRcdFx0XHRtb2RlbDogbW9kZWxcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLm1hcC5vbmNlKCdsYXllcmFkZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdG1hcmtlclxuXHRcdFx0XHRcdC5vbignY2xpY2snLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdFx0bW9kZWwuZGVzdHJveSgpO1xuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0Lm9uKCdkcmFnZW5kJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdC8vIHVwZGF0ZSBtb2RlbCBsbmdsYXRcblx0XHRcdFx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLmdldExhdExuZygpO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbGF0JywgbGF0bG5nLmxhdCApO1xuXHRcdFx0XHRcdFx0bW9kZWwuc2V0KCAnbG5nJywgbGF0bG5nLmxuZyApO1xuXHRcdFx0XHRcdFx0c2VsZi5yZXZlcnNlR2VvY29kZSggbW9kZWwgKTtcblx0XHRcdFx0XHRcdC8vIGdlb2NvZGUsIGdldCBsYWJlbCwgc2V0IG1vZGVsIGxhYmVsLi4uXG5cdFx0XHRcdFx0fSlcblx0XHRcdFx0XHQuZHJhZ2dpbmcuZW5hYmxlKCk7XG5cdFx0XHRcdGVudHJ5LiRlbC5hcHBlbmRUbyggc2VsZi4kbWFya2VycygpICk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bW9kZWwub24oJ2Rlc3Ryb3knLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdG1hcmtlci5yZW1vdmUoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRtYXJrZXIuYWRkVG8oIHRoaXMubWFwICk7XG5cdFx0XHRpZiAoIHRoaXMucGxpbmdNYXJrZXIgKSB7XG5cdFx0XHRcdGVudHJ5LnBsaW5nKCk7XG5cdFx0XHR9XG5cblx0XHR9LFxuXHRcdGluaXRNYXJrZXJzOmZ1bmN0aW9uKCl7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy5pbml0R2VvY29kZSgpO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1oYXMtbWFya2VycycsICdmYWxzZScpO1xuXHRcdFx0dGhpcy4kZWwuYXR0cignZGF0YS1jYW4tYWRkLW1hcmtlcicsICdmYWxzZScpO1xuXHRcdFx0XG5cdFx0XHQvLyBubyBtYXJrZXJzIGFsbG93ZWQhXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLm1heF9tYXJrZXJzID09PSAwICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuaWNvbiA9IG5ldyBMLkRpdkljb24oe1xuXHRcdFx0XHRodG1sOiAnJyxcblx0XHRcdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyLWljb24nXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5mb3JFYWNoKCBmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHRcdHNlbGYuYWRkTWFya2VyKCBtb2RlbCApO1xuXHRcdFx0fSApO1xuXG5cdFx0XHQvLyBkYmx0YXAgaXMgbm90IGZpcmluZyBvbiBtb2JpbGVcblx0XHRcdGlmICggTC5Ccm93c2VyLnRvdWNoICYmIEwuQnJvd3Nlci5tb2JpbGUgKSB7XG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25faG9sZCgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy5fYWRkX21hcmtlcl9vbl9kYmxjbGljaygpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnVwZGF0ZU1hcmtlclN0YXRlKCk7XG5cblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2RibGNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcztcblx0XHRcdHRoaXMubWFwLm9uKCdkYmxjbGljaycsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHR2YXIgbGF0bG5nID0gZS5sYXRsbmc7XG5cdFx0XHRcdFxuXHRcdFx0XHRMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0KGUpO1xuXHRcdFx0XHRMLkRvbUV2ZW50LnN0b3BQcm9wYWdhdGlvbihlKTtcblx0XHRcdFx0XG5cdFx0XHRcdHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIGxhdGxuZyApO1xuXHRcdFx0fSlcblx0XHRcdC5kb3VibGVDbGlja1pvb20uZGlzYWJsZSgpOyBcblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdhZGQtbWFya2VyLW9uLWRibGNsaWNrJylcblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2hvbGQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBMLkJyb3dzZXIucG9pbnRlciApIHtcblx0XHRcdFx0Ly8gdXNlIHBvaW50ZXIgZXZlbnRzXG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25faG9sZF9wb2ludGVyKCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyB1c2UgdG91Y2ggZXZlbnRzXG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25faG9sZF90b3VjaCgpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2FkZC1tYXJrZXItb24tdGFwaG9sZCcpXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9ob2xkX3BvaW50ZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLFxuXHRcdFx0XHRfaG9sZF90aW1lb3V0ID0gNzUwLFxuXHRcdFx0XHRfaG9sZF93YWl0X3RvID0ge307XG5cdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwncG9pbnRlcmRvd24nLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdID0gc2V0VGltZW91dChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0dmFyIGNwID0gc2VsZi5tYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZSk7XG5cdFx0XHRcdFx0XHR2YXIgbHAgPSBzZWxmLm1hcC5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChjcClcblxuXHRcdFx0XHRcdFx0c2VsZi5hZGRNYXJrZXJCeUxhdExuZyggc2VsZi5tYXAubGF5ZXJQb2ludFRvTGF0TG5nKGxwKSApXG5cblx0XHRcdFx0XHRcdF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdID0gZmFsc2U7XG5cdFx0XHRcdFx0fSwgX2hvbGRfdGltZW91dCApO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksICdwb2ludGVydXAgcG9pbnRlcm1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0XHQhISBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSAmJiBjbGVhclRpbWVvdXQoIF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdICk7XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25faG9sZF90b3VjaDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0X2hvbGRfdGltZW91dCA9IDc1MCxcblx0XHRcdFx0X2hvbGRfd2FpdF90byA9IGZhbHNlO1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksJ3RvdWNoc3RhcnQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdGlmICggZS50b3VjaGVzLmxlbmd0aCAhPT0gMSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0X2hvbGRfd2FpdF90byA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblxuXHRcdFx0XHRcdFx0dmFyIGNwID0gc2VsZi5tYXAubW91c2VFdmVudFRvQ29udGFpbmVyUG9pbnQoZS50b3VjaGVzWzBdKTtcblx0XHRcdFx0XHRcdHZhciBscCA9IHNlbGYubWFwLmNvbnRhaW5lclBvaW50VG9MYXllclBvaW50KGNwKVxuXG5cdFx0XHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBzZWxmLm1hcC5sYXllclBvaW50VG9MYXRMbmcobHApIClcblxuXHRcdFx0XHRcdFx0X2hvbGRfd2FpdF90byA9IGZhbHNlO1xuXHRcdFx0XHRcdH0sIF9ob2xkX3RpbWVvdXQgKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCAndG91Y2hlbmQgdG91Y2htb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0ISEgX2hvbGRfd2FpdF90byAmJiBjbGVhclRpbWVvdXQoIF9ob2xkX3dhaXRfdG9bICdwJytlLnBvaW50ZXJJZCBdICk7XG5cdFx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0YWRkTWFya2VyQnlMYXRMbmc6ZnVuY3Rpb24obGF0bG5nKSB7XG5cdFx0XHR2YXIgY29sbGVjdGlvbiA9IHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksXG5cdFx0XHRcdG1vZGVsO1xuXHRcdFx0Ly8gbm8gbW9yZSBtYXJrZXJzXG5cdFx0XHRpZiAoIHRoaXMuY29uZmlnLm1heF9tYXJrZXJzICE9PSBmYWxzZSAmJiBjb2xsZWN0aW9uLmxlbmd0aCA+PSB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0bW9kZWwgPSBuZXcgb3NtLk1hcmtlckRhdGEoe1xuXHRcdFx0XHRsYWJlbDogJycsXG5cdFx0XHRcdGRlZmF1bHRfbGFiZWw6ICcnLFxuXHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG5cdFx0XHRcdGxuZzogbGF0bG5nLmxuZyxcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5wbGluZ01hcmtlciA9IHRydWU7XG5cdFx0XHRjb2xsZWN0aW9uLmFkZCggbW9kZWwgKTtcblx0XHRcdHRoaXMucmV2ZXJzZUdlb2NvZGUoIG1vZGVsICk7XG5cdFx0fSxcblx0XHQvKipcblx0XHQgKlx0R2VvY29kaW5nXG5cdFx0ICpcblx0XHQgKlx0QG9uIG1hcC5sYXllcmFkZCwgbGF5ZXIuZHJhZ2VuZFxuXHRcdCAqL1xuXHRcdCBpbml0R2VvY29kZTpmdW5jdGlvbigpIHtcblxuIFx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0JGFib3ZlID0gdGhpcy4kZWwucHJldigpO1xuXHRcdFx0aWYgKCAhICRhYm92ZS5pcyggJy5hY2Ytb3NtLWFib3ZlJyApICkge1xuXHRcdFx0XHQkYWJvdmUgPSAkKCc8ZGl2IGNsYXNzPVwiYWNmLW9zbS1hYm92ZVwiPjwvZGl2PicpLmluc2VydEJlZm9yZSggdGhpcy4kZWwgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRhYm92ZS5odG1sKCcnKTtcdFx0XHRcdFxuXHRcdFx0fVxuXHRcdFx0Ly8gYWRkIGFuIGV4dHJhIGNvbnRyb2wgcGFuZWwgcmVnaW9uIGZvciBvdXQgc2VhcmNoXG4gXHRcdFx0dGhpcy5tYXAuX2NvbnRyb2xDb3JuZXJzWydhYm92ZSddID0gJGFib3ZlLmdldCgwKTtcblxuIFx0XHRcdHRoaXMuZ2VvY29kZXIgPSBMLkNvbnRyb2wuZ2VvY29kZXIoe1xuIFx0XHRcdFx0Y29sbGFwc2VkOiBmYWxzZSxcbiBcdFx0XHRcdHBvc2l0aW9uOidhYm92ZScsXG4gXHRcdFx0XHRwbGFjZWhvbGRlcjppMThuLnNlYXJjaCxcbiBcdFx0XHRcdGVycm9yTWVzc2FnZTppMThuLm5vdGhpbmdfZm91bmQsXG4gXHRcdFx0XHRzaG93UmVzdWx0SWNvbnM6dHJ1ZSxcbiBcdFx0XHRcdHN1Z2dlc3RNaW5MZW5ndGg6MyxcbiBcdFx0XHRcdHN1Z2dlc3RUaW1lb3V0OjI1MCxcbiBcdFx0XHRcdHF1ZXJ5TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRkZWZhdWx0TWFya0dlb2NvZGU6ZmFsc2UsXG5cdFx0XHRcdGdlb2NvZGVyOkwuQ29udHJvbC5HZW9jb2Rlci5ub21pbmF0aW0oeyBcblx0XHRcdFx0XHRodG1sVGVtcGxhdGU6IGZ1bmN0aW9uKHJlc3VsdCkge1xuXHRcdFx0XHRcdFx0dmFyIHBhcnRzID0gW10sXG5cdFx0XHRcdFx0XHRcdHRlbXBsYXRlQ29uZmlnID0ge1xuXHRcdFx0XHRcdFx0XHRcdGludGVycG9sYXRlOiAvXFx7KC4rPylcXH0vZ1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRhZGRyID0gXy5kZWZhdWx0cyggcmVzdWx0LmFkZHJlc3MsIHtcblx0XHRcdFx0XHRcdFx0XHRidWlsZGluZzonJyxcblx0XHRcdFx0XHRcdFx0XHRyb2FkOicnLFxuXHRcdFx0XHRcdFx0XHRcdGhvdXNlX251bWJlcjonJyxcblx0XHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdFx0XHRwb3N0Y29kZTonJyxcblx0XHRcdFx0XHRcdFx0XHRjaXR5OicnLFxuXHRcdFx0XHRcdFx0XHRcdHRvd246JycsXG5cdFx0XHRcdFx0XHRcdFx0dmlsbGFnZTonJyxcblx0XHRcdFx0XHRcdFx0XHRoYW1sZXQ6JycsXG5cdFx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRcdFx0c3RhdGU6JycsXG5cdFx0XHRcdFx0XHRcdFx0Y291bnRyeTonJyxcblx0XHRcdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdFx0XHRwYXJ0cy5wdXNoKCBfLnRlbXBsYXRlKCBpMThuLmFkZHJlc3NfZm9ybWF0LnN0cmVldCwgdGVtcGxhdGVDb25maWcgKSggYWRkciApICk7XG5cblx0XHRcdFx0XHRcdHBhcnRzLnB1c2goIF8udGVtcGxhdGUoIGkxOG4uYWRkcmVzc19mb3JtYXQuY2l0eSwgdGVtcGxhdGVDb25maWcgKSggYWRkciApICk7XG5cblx0XHRcdFx0XHRcdHBhcnRzLnB1c2goIF8udGVtcGxhdGUoIGkxOG4uYWRkcmVzc19mb3JtYXQuY291bnRyeSwgdGVtcGxhdGVDb25maWcgKSggYWRkciApICk7XG5cblx0XHRcdFx0XHRcdHJldHVybiBwYXJ0c1xuXHRcdFx0XHRcdFx0XHQubWFwKCBmdW5jdGlvbihlbCkgeyByZXR1cm4gZWwucmVwbGFjZSgvXFxzKy9nLCcgJykudHJpbSgpIH0gKVxuXHRcdFx0XHRcdFx0XHQuZmlsdGVyKCBmdW5jdGlvbihlbCkgeyByZXR1cm4gZWwgIT09ICcnIH0gKVxuXHRcdFx0XHRcdFx0XHQuam9pbignLCAnKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcbiBcdFx0XHR9KVxuIFx0XHRcdC5vbignbWFya2dlb2NvZGUnLGZ1bmN0aW9uKGUpe1xuIFx0XHRcdFx0Ly8gc2VhcmNoIHJlc3VsdCBjbGlja1xuIFx0XHRcdFx0dmFyIGxhdGxuZyA9ICBlLmdlb2NvZGUuY2VudGVyLFxuIFx0XHRcdFx0XHRjb3VudF9tYXJrZXJzID0gc2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGgsXG4gXHRcdFx0XHRcdGxhYmVsID0gc2VsZi5wYXJzZUdlb2NvZGVSZXN1bHQoIFsgZS5nZW9jb2RlIF0sIGxhdGxuZyApLFxuIFx0XHRcdFx0XHRtYXJrZXJfZGF0YSA9IHtcbiBcdFx0XHRcdFx0XHRsYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0ZGVmYXVsdF9sYWJlbDogbGFiZWwsXG4gXHRcdFx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuIFx0XHRcdFx0XHRcdGxuZzogbGF0bG5nLmxuZ1xuIFx0XHRcdFx0XHR9LCBcbiBcdFx0XHRcdFx0bW9kZWw7XG5cblx0XHRcdFx0Ly8gZ2V0dGluZyByaWQgb2YgdGhlIG1vZGFsIOKAkyAjMzVcblx0XHRcdFx0c2VsZi5nZW9jb2Rlci5fY2xlYXJSZXN1bHRzKCk7XG5cdFx0XHRcdHNlbGYuZ2VvY29kZXIuX2lucHV0LnZhbHVlID0gJyc7XG5cblx0XHRcdFx0Ly8gbm8gbWFya2VycyAtIGp1c3QgYWRhcHQgbWFwIHZpZXdcbiBcdFx0XHRcdGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IDAgKSB7XG5cbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYubWFwLmZpdEJvdW5kcyggZS5nZW9jb2RlLmJib3ggKTtcblxuIFx0XHRcdFx0fVxuXG5cdFx0XHRcdFxuIFx0XHRcdFx0aWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gZmFsc2UgfHwgY291bnRfbWFya2VycyA8IHNlbGYuY29uZmlnLm1heF9tYXJrZXJzICkge1xuXHRcdFx0XHRcdC8vIGluZmluaXRlIG1hcmtlcnMgb3IgbWFya2VycyBzdGlsbCBpbiByYW5nZVxuIFx0XHRcdFx0XHRzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmFkZCggbWFya2VyX2RhdGEgKTtcblxuIFx0XHRcdFx0fSBlbHNlIGlmICggc2VsZi5jb25maWcubWF4X21hcmtlcnMgPT09IDEgKSB7XG5cdFx0XHRcdFx0Ly8gb25lIG1hcmtlciBvbmx5XG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYXQoMCkuc2V0KCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9XG5cbiBcdFx0XHRcdHNlbGYubWFwLnNldFZpZXcoIGxhdGxuZywgc2VsZi5tYXAuZ2V0Wm9vbSgpICk7IC8vIGtlZXAgem9vbSwgbWlnaHQgYmUgY29uZnVzaW5nIGVsc2VcblxuIFx0XHRcdH0pXG4gXHRcdFx0LmFkZFRvKCB0aGlzLm1hcCApO1xuXG4gXHRcdH0sXG5cdFx0cmV2ZXJzZUdlb2NvZGU6ZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzLCBcblx0XHRcdFx0bGF0bG5nID0geyBsYXQ6IG1vZGVsLmdldCgnbGF0JyksIGxuZzogbW9kZWwuZ2V0KCdsbmcnKSB9O1xuXHRcdFx0dGhpcy5nZW9jb2Rlci5vcHRpb25zLmdlb2NvZGVyLnJldmVyc2UoIFxuXHRcdFx0XHRsYXRsbmcsIFxuXHRcdFx0XHRzZWxmLm1hcC5nZXRab29tKCksIFxuXHRcdFx0XHRmdW5jdGlvbiggcmVzdWx0cyApIHtcblx0XHRcdFx0XHRtb2RlbC5zZXQoJ2RlZmF1bHRfbGFiZWwnLCBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggcmVzdWx0cywgbGF0bG5nICkgKTtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9LFxuXHRcdHBhcnNlR2VvY29kZVJlc3VsdDogZnVuY3Rpb24oIHJlc3VsdHMsIGxhdGxuZyApIHtcblx0XHRcdHZhciBsYWJlbCA9IGZhbHNlO1xuXG5cdFx0XHRpZiAoICEgcmVzdWx0cy5sZW5ndGggKSB7XG5cdFx0XHRcdC8vIGh0dHBzOi8veGtjZC5jb20vMjE3MC9cblx0XHRcdFx0bGFiZWwgPSBsYXRsbmcubGF0ICsgJywgJyArIGxhdGxuZy5sbmc7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkLmVhY2goIHJlc3VsdHMsIGZ1bmN0aW9uKCBpLCByZXN1bHQgKSB7XG5cblx0XHRcdFx0XHRsYWJlbCA9IHJlc3VsdC5odG1sO1xuXG5cdFx0XHRcdFx0Ly8gaWYgKCAhISByZXN1bHQuaHRtbCApIHtcblx0XHRcdFx0XHQvLyBcdHZhciBodG1sID0gcmVzdWx0Lmh0bWwucmVwbGFjZSgvKFxccyspPC9nLCc8JykucmVwbGFjZSgvPGJyXFwvPi9nLCc8YnIvPiwgJyk7XG5cdFx0XHRcdFx0Ly8gXHQvLyBhZGQgbWlzc2luZyBzcGFjZXNcblx0XHRcdFx0XHQvLyBcdGxhYmVsID0gJCgnPHA+JytodG1sKyc8L3A+JykudGV4dCgpLnRyaW0oKS5yZXBsYWNlKC8oXFxzKykvZywnICcpO1xuXHRcdFx0XHRcdC8vIH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gXHRsYWJlbCA9IHJlc3VsdC5uYW1lO1xuXHRcdFx0XHRcdC8vIH1cblx0XHRcdFx0XHQvLyByZXR1cm4gZmFsc2U7XG5cdFx0XHRcdH0pO1xuXHRcdFx0fVxuXHRcdFx0Ly8gdHJpbVxuXHRcdFx0cmV0dXJuIGxhYmVsO1xuXHRcdH0sXG5cblxuXG5cdFx0LyoqXG5cdFx0ICpcdExheWVyc1xuXHQgXHQqL1xuXHRcdGluaXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gW10sXG5cdFx0XHRcdGJhc2VMYXllcnMgPSB7fSxcblx0XHRcdFx0b3ZlcmxheXMgPSB7fSxcblx0XHRcdFx0bWFwTGF5ZXJzID0ge30sXG5cdFx0XHRcdGlzX29taXR0ZWQgPSBmdW5jdGlvbihrZXkpIHtcblx0XHRcdFx0XHRyZXR1cm4ga2V5ID09PSBudWxsIHx8ICggISEgc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICYmIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBrZXkgKSA9PT0gLTEgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c2V0dXBNYXAgPSBmdW5jdGlvbiggdmFsLCBrZXkgKXtcblx0XHRcdFx0XHR2YXIgbGF5ZXIsIGxheWVyX2NvbmZpZztcblx0XHRcdFx0XHRpZiAoIF8uaXNPYmplY3QodmFsKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiAkLmVhY2goIHZhbCwgc2V0dXBNYXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIGlzX29taXR0ZWQoa2V5KSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCAhISBtYXBMYXllcnNbIGtleSBdICkge1xuXHRcdFx0XHRcdFx0bGF5ZXIgPSBtYXBMYXllcnNbIGtleSBdO1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0XHRcdGxheWVyID0gTC50aWxlTGF5ZXIucHJvdmlkZXIoIGtleSAvKiwgbGF5ZXJfY29uZmlnLm9wdGlvbnMqLyApO1xuXHRcdFx0XHRcdFx0fSBjYXRjaChleCkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRsYXllci5wcm92aWRlcktleSA9IGtleTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSgga2V5LCBsYXllciApICkge1xuXHRcdFx0XHRcdFx0b3ZlcmxheXNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRiYXNlTGF5ZXJzW2tleV0gPSBsYXllcjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGVjdGVkTGF5ZXJzLmluZGV4T2YoIGtleSApICE9PSAtMSApIHtcblx0XHRcdFx0XHRcdHNlbGYubWFwLmFkZExheWVyKGxheWVyKTtcbiBcdFx0XHRcdFx0fVxuIFx0XHRcdFx0fTtcblxuIFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gdGhpcy5tb2RlbC5nZXQoJ2xheWVycycpOyAvLyBzaG91bGQgYmUgbGF5ZXIgc3RvcmUgdmFsdWVcblxuIFx0XHRcdC8vIGZpbHRlciBhdmFpYWxibGUgbGF5ZXJzIGluIGZpZWxkIHZhbHVlXG4gXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgIT09IGZhbHNlICYmIF8uaXNBcnJheSggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzICkgKSB7XG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHNlbGVjdGVkTGF5ZXJzLmZpbHRlciggZnVuY3Rpb24oZWwpIHtcbiBcdFx0XHRcdFx0cmV0dXJuIHNlbGYuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5pbmRleE9mKCBlbCApICE9PSAtMTtcbiBcdFx0XHRcdH0pO1xuIFx0XHRcdH1cblxuIFx0XHRcdC8vIHNldCBkZWZhdWx0IGxheWVyXG4gXHRcdFx0aWYgKCAhIHNlbGVjdGVkTGF5ZXJzLmxlbmd0aCApIHtcblxuIFx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMuc2xpY2UoIDAsIDEgKTtcblxuIFx0XHRcdH1cblxuIFx0XHRcdC8vIGVkaXRhYmxlIGxheWVycyFcblxuXHRcdFx0dGhpcy5tYXAub24oICdiYXNlbGF5ZXJjaGFuZ2UgbGF5ZXJhZGQgbGF5ZXJyZW1vdmUnLCBmdW5jdGlvbihlKXtcblx0XHRcdFxuXHRcdFx0XHRpZiAoICEgZS5sYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGxheWVycyA9IFtdO1xuXG5cdFx0XHRcdHNlbGYubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcikge1xuXHRcdFx0XHRcdGlmICggISBsYXllci5wcm92aWRlcktleSApIHtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoIHNlbGYubGF5ZXJfaXNfb3ZlcmxheSggbGF5ZXIucHJvdmlkZXJLZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRsYXllcnMucHVzaCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRsYXllcnMudW5zaGlmdCggbGF5ZXIucHJvdmlkZXJLZXkgKVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnbGF5ZXJzJywgbGF5ZXJzICk7XG5cdFx0XHR9ICk7XG5cbiBcdFx0XHQkLmVhY2goIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycywgc2V0dXBNYXAgKTtcblx0XHRcdFxuXHRcdFx0dGhpcy5sYXllcnNDb250cm9sID0gTC5jb250cm9sLmxheWVycyggYmFzZUxheWVycywgb3ZlcmxheXMsIHtcblx0XHRcdFx0Y29sbGFwc2VkOiB0cnVlLFxuXHRcdFx0XHRoaWRlU2luZ2xlQmFzZTogdHJ1ZSxcblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcbiBcdFx0fSxcblx0XHRsYXllcl9pc19vdmVybGF5OiBmdW5jdGlvbiggIGtleSwgbGF5ZXIgKSB7XG5cdFx0XHR2YXIgcGF0dGVybnM7XG5cblx0XHRcdGlmICggbGF5ZXIub3B0aW9ucy5vcGFjaXR5ICYmIGxheWVyLm9wdGlvbnMub3BhY2l0eSA8IDEgKSB7XG5cdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cGF0dGVybnMgPSBbJ14oT3BlbldlYXRoZXJNYXB8T3BlblNlYU1hcCknLFxuXHRcdFx0XHQnT3Blbk1hcFN1cmZlci5BZG1pbkJvdW5kcycsXG5cdFx0XHRcdCdTdGFtZW4uVG9uZXIoSHlicmlkfExpbmVzfExhYmVscyknLFxuXHRcdFx0XHQnQWNldGF0ZS4oZm9yZWdyb3VuZHxsYWJlbHN8cm9hZHMpJyxcblx0XHRcdFx0J0hpbGxTaGFkaW5nJyxcblx0XHRcdFx0J0h5ZGRhLlJvYWRzQW5kTGFiZWxzJyxcblx0XHRcdFx0J15KdXN0aWNlTWFwJyxcblx0XHRcdFx0J09wZW5JbmZyYU1hcC4oUG93ZXJ8VGVsZWNvbXxQZXRyb2xldW18V2F0ZXIpJyxcblx0XHRcdFx0J09wZW5QdE1hcCcsXG5cdFx0XHRcdCdPcGVuUmFpbHdheU1hcCcsXG5cdFx0XHRcdCdPcGVuRmlyZU1hcCcsXG5cdFx0XHRcdCdTYWZlQ2FzdCcsXG5cdFx0XHRcdCdDYXJ0b0RCLkRhcmtNYXR0ZXJPbmx5TGFiZWxzJyxcblx0XHRcdFx0J0NhcnRvREIuUG9zaXRyb25Pbmx5TGFiZWxzJ1xuXHRcdFx0XTtcblx0XHRcdHJldHVybiBrZXkubWF0Y2goJygnICsgcGF0dGVybnMuam9pbignfCcpICsgJyknKSAhPT0gbnVsbDtcblx0XHR9LFxuXHRcdHJlc2V0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0Ly8gcmVtb3ZlIGFsbCBtYXAgbGF5ZXJzXG5cdFx0XHR0aGlzLm1hcC5lYWNoTGF5ZXIoZnVuY3Rpb24obGF5ZXIpe1xuXHRcdFx0XHRpZiAoIGxheWVyLmNvbnN0cnVjdG9yID09PSBMLlRpbGVMYXllci5Qcm92aWRlciApIHtcblx0XHRcdFx0XHRsYXllci5yZW1vdmUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSlcblxuXHRcdFx0Ly8gcmVtb3ZlIGxheWVyIGNvbnRyb2xcblx0XHRcdCEhIHRoaXMubGF5ZXJzQ29udHJvbCAmJiB0aGlzLmxheWVyc0NvbnRyb2wucmVtb3ZlKClcblx0XHR9LFxuXHRcdHVwZGF0ZV92aXNpYmxlOiBmdW5jdGlvbigpIHtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgPT09IHRoaXMuJGVsLmlzKCc6dmlzaWJsZScpICkge1xuXHRcdFx0XHRyZXR1cm4gdGhpcztcblx0XHRcdH1cblxuXHRcdFx0dGhpcy52aXNpYmxlID0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJyk7XG5cblx0XHRcdGlmICggdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHR0aGlzLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2FjZjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdHRvZ2dsZV9jYiA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdC8vIG5vIGNoYW5nZVxuXHRcdFx0XHRcdHNlbGYudXBkYXRlX3Zpc2libGUoKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0Ly8gZXhwYW5kL2NvbGxhcHNlIGFjZiBzZXR0aW5nXG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnc2hvdycsIHRvZ2dsZV9jYiApO1xuXHRcdFx0YWNmLmFkZEFjdGlvbiggJ2hpZGUnLCB0b2dnbGVfY2IgKTtcblxuXHRcdFx0Ly8gZXhwYW5kIHdwIG1ldGFib3hcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdwb3N0Ym94LXRvZ2dsZWQnLCB0b2dnbGVfY2IgKTtcblx0XHRcdCQoZG9jdW1lbnQpLm9uKCdjbGljaycsJy53aWRnZXQtdG9wIConLCB0b2dnbGVfY2IgKTtcblxuXHRcdH0sXG5cdFx0dXBkYXRlX21hcDpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYXRsbmcgPSB7IGxhdDogdGhpcy5tb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IHRoaXMubW9kZWwuZ2V0KCdsbmcnKSB9XG5cdFx0XHR0aGlzLm1hcC5zZXRWaWV3KCBcblx0XHRcdFx0bGF0bG5nLFxuXHRcdFx0XHR0aGlzLm1vZGVsLmdldCgnem9vbScpIFxuXHRcdFx0KTtcblx0XHR9XG5cdH0pO1xuXG5cblx0JChkb2N1bWVudClcblx0XHQub24oICdhY2Ytb3NtLW1hcC1jcmVhdGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGlmICggISBMLkNvbnRyb2wuQWRkTG9jYXRpb25NYXJrZXIgKSB7XG5cdFx0XHRcdEwuQ29udHJvbC5BZGRMb2NhdGlvbk1hcmtlciA9IEwuQ29udHJvbC5leHRlbmQoe1xuXHRcdFx0XHRcdG9uQWRkOmZ1bmN0aW9uKCkge1xuXG5cdFx0XHRcdFx0XHR0aGlzLl9jb250YWluZXIgPSBMLkRvbVV0aWwuY3JlYXRlKCdkaXYnLFxuXHRcdFx0XHRcdFx0XHQnbGVhZmxldC1jb250cm9sLWFkZC1sb2NhdGlvbi1tYXJrZXIgbGVhZmxldC1iYXIgbGVhZmxldC1jb250cm9sJyk7XG5cblx0XHRcdFx0XHRcdHRoaXMuX2xpbmsgPSBMLkRvbVV0aWwuY3JlYXRlKCdhJywgJ2xlYWZsZXQtYmFyLXBhcnQgbGVhZmxldC1iYXItcGFydC1zaW5nbGUnLCB0aGlzLl9jb250YWluZXIpO1xuXHRcdCAgICAgICAgICAgICAgICB0aGlzLl9saW5rLnRpdGxlID0gaTE4bi5hZGRfbWFya2VyX2F0X2xvY2F0aW9uO1xuXHRcdCAgICAgICAgICAgICAgICB0aGlzLl9pY29uID0gTC5Eb21VdGlsLmNyZWF0ZSgnc3BhbicsICdkYXNoaWNvbnMgZGFzaGljb25zLWxvY2F0aW9uJywgdGhpcy5fbGluayk7XG5cdFx0XHRcdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdClcblx0XHRcdFx0XHRcdFx0Lm9uKCB0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLm9wdGlvbnMuY2FsbGJhY2ssIHRoaXMpXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2RibGNsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24pO1xuXG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5fY29udGFpbmVyO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0b25SZW1vdmU6ZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRMLkRvbUV2ZW50XG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2NsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24gKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQgKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIHRoaXMub3B0aW9ucy5jYWxsYmFjaywgdGhpcyApXG5cdFx0XHRcdFx0XHRcdC5vZmYodGhpcy5fbGluaywgJ2RibGNsaWNrJywgTC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24gKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9KVx0XHRcdFx0XG5cdFx0XHR9XG5cblxuXHRcdFx0Ly8gZG9uJ3QgaW5pdCBpbiByZXBlYXRlciB0ZW1wbGF0ZXNcblx0XHRcdGlmICggJChlLnRhcmdldCkuY2xvc2VzdCgnW2RhdGEtaWQ9XCJhY2ZjbG9uZWluZGV4XCJdJykubGVuZ3RoICkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5vbiggJ2FjZi1vc20tbWFwLWluaXQnLCBmdW5jdGlvbiggZSwgbWFwICkge1xuXHRcdFx0dmFyIGVkaXRvcjtcblxuXHRcdFx0Ly8gd3JhcCBvc20uRmllbGQgYmFja2JvbmUgdmlldyBhcm91bmQgZWRpdG9yc1xuXHRcdFx0aWYgKCAkKGUudGFyZ2V0KS5pcygnW2RhdGEtZWRpdG9yLWNvbmZpZ10nKSApIHtcblx0XHRcdFx0Ly8gZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdChmdW5jdGlvbiBjaGVja1Zpcygpe1xuXHRcdFx0XHRcdGlmICggISAkKGUudGFyZ2V0KS5pcygnOnZpc2libGUnKSApIHtcblx0XHRcdFx0XHRcdHJldHVybiBzZXRUaW1lb3V0KCBjaGVja1ZpcywgMjUwICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdG1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0XHR9KSgpO1xuXHRcdFx0XHRlZGl0b3IgPSBuZXcgb3NtLkZpZWxkKCB7IGVsOiBlLnRhcmdldCwgbWFwOiBtYXAsIGZpZWxkOiBhY2YuZ2V0RmllbGQoICQoZS50YXJnZXQpLmNsb3Nlc3QoJy5hY2YtZmllbGQnKSApIH0gKTtcblx0XHRcdFx0JChlLnRhcmdldCkuZGF0YSggJ19tYXBfZWRpdG9yJywgZWRpdG9yICk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cblx0Ly8gaW5pdCB3aGVuIGZpZWxkcyBnZXQgbG9hZGVkIC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnYXBwZW5kJywgZnVuY3Rpb24oKXtcblx0XHQkLmFjZl9sZWFmbGV0KCk7XG5cdH0pO1xuXHQvLyBpbml0IHdoZW4gZmllbGRzIHNodyAuLi5cblx0YWNmLmFkZEFjdGlvbiggJ3Nob3dfZmllbGQnLCBmdW5jdGlvbiggZmllbGQgKSB7XG5cblx0XHRpZiAoICdvcGVuX3N0cmVldF9tYXAnICE9PSBmaWVsZC50eXBlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0ICAgIHZhciBlZGl0b3IgPSBmaWVsZC4kZWwuZmluZCgnW2RhdGEtZWRpdG9yLWNvbmZpZ10nKS5kYXRhKCAnX21hcF9lZGl0b3InICk7XG5cdCAgICBlZGl0b3IudXBkYXRlX3Zpc2libGUoKTtcblx0fSk7XG5cblx0XG5cbn0pKCBqUXVlcnksIGFjZl9vc21fYWRtaW4sIHdpbmRvdyApO1xuIl19
