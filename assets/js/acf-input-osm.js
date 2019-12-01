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
		init_locator:function() {
			var self = this,
				currentLocation = false;

			
			this.locatorAdd = new L.Control.AddLocationMarker({
				position: 'bottomleft',
				callback: function() {
					currentLocation && self.addMarkerByLatLng( currentLocation );
					self.locator.stop();
				}
			}).addTo(this.map);

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

				currentLocation = e.latlng;

				setTimeout(function(){
					self.locator.stopFollowing();
					$(self.locator._icon).removeClass('dashicons-warning');
					//self.locatorAdd.addTo(self.map)
				},1);
			})
			this.map.on('locationerror',function(e){
				currentLocation = false;
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
		.ready(function(){
		})
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1pbnB1dC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWlucHV0LW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvcHRpb25zID0gYXJnLm9wdGlvbnMsXG5cdFx0aTE4biA9IGFyZy5pMThuLFxuXHRcdHJlc3VsdF90cGwgPSAnPGRpdiB0YWJpbmRleD1cIjwlPSBkYXRhLmkgJT5cIiBjbGFzcz1cIm9zbS1yZXN1bHRcIj4nXG5cdFx0XHQrICc8JT0gZGF0YS5yZXN1bHRfdGV4dCAlPidcblx0XHRcdCsgJzxiciAvPjxzbWFsbD48JT0gZGF0YS5wcm9wZXJ0aWVzLm9zbV92YWx1ZSAlPjwvc21hbGw+J1xuXHRcdFx0KyAnPC9kaXY+JztcblxuXHR2YXIgb3NtID0gZXhwb3J0cy5vc20gPSB7XG5cdH07XG5cdFxuXHR2YXIgbG9jYXRvckFkZENvbnRyb2wgPSBudWxsO1xuXHRcblx0dmFyIGZpeGVkRmxvYXRHZXR0ZXIgPSBmdW5jdGlvbiggcHJvcCwgZml4ICkge1xuXHRcdHJldHVybiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwYXJzZUZsb2F0KCB0aGlzLmF0dHJpYnV0ZXNbIHByb3AgXSApO1xuXHRcdH1cblx0fVxuXHR2YXIgZml4ZWRGbG9hdFNldHRlciA9IGZ1bmN0aW9uKCBwcm9wLCBmaXggKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VGbG9hdChwYXJzZUZsb2F0KHZhbHVlKS50b0ZpeGVkKGZpeCkgKTtcblx0XHR9XG5cdH1cblx0dmFyIGludEdldHRlciA9IGZ1bmN0aW9uKHByb3ApIHtcblx0XHRyZXR1cm4gZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHRoaXMuYXR0cmlidXRlc1sgcHJvcCBdICk7XG5cdFx0fVxuXHR9XG5cdHZhciBpbnRTZXR0ZXIgPSBmdW5jdGlvbihwcm9wKSB7XG5cdFx0cmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHRyZXR1cm4gcGFyc2VJbnQoIHZhbHVlICk7XG5cdFx0fVxuXHR9XG5cblx0dmFyIEdTTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xuXG5cdFx0Z2V0OiBmdW5jdGlvbihhdHRyKSB7XG5cdFx0XHQvLyBDYWxsIHRoZSBnZXR0ZXIgaWYgYXZhaWxhYmxlXG5cdFx0XHRpZiAoXy5pc0Z1bmN0aW9uKHRoaXMuZ2V0dGVyc1thdHRyXSkpIHtcblx0XHRcdFx0cmV0dXJuIHRoaXMuZ2V0dGVyc1thdHRyXS5jYWxsKHRoaXMpO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gQmFja2JvbmUuTW9kZWwucHJvdG90eXBlLmdldC5jYWxsKHRoaXMsIGF0dHIpO1xuXHRcdH0sXG5cblx0XHRzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUsIG9wdGlvbnMpIHtcblx0XHRcdHZhciBhdHRycywgYXR0cjtcblxuXHRcdFx0Ly8gTm9ybWFsaXplIHRoZSBrZXktdmFsdWUgaW50byBhbiBvYmplY3Rcblx0XHRcdGlmIChfLmlzT2JqZWN0KGtleSkgfHwga2V5ID09IG51bGwpIHtcblx0XHRcdFx0YXR0cnMgPSBrZXk7XG5cdFx0XHRcdG9wdGlvbnMgPSB2YWx1ZTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGF0dHJzID0ge307XG5cdFx0XHRcdGF0dHJzW2tleV0gPSB2YWx1ZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYWx3YXlzIHBhc3MgYW4gb3B0aW9ucyBoYXNoIGFyb3VuZC4gVGhpcyBhbGxvd3MgbW9kaWZ5aW5nXG5cdFx0XHQvLyB0aGUgb3B0aW9ucyBpbnNpZGUgdGhlIHNldHRlclxuXHRcdFx0b3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG5cblx0XHRcdC8vIEdvIG92ZXIgYWxsIHRoZSBzZXQgYXR0cmlidXRlcyBhbmQgY2FsbCB0aGUgc2V0dGVyIGlmIGF2YWlsYWJsZVxuXHRcdFx0Zm9yIChhdHRyIGluIGF0dHJzKSB7XG5cdFx0XHRcdGlmIChfLmlzRnVuY3Rpb24odGhpcy5zZXR0ZXJzW2F0dHJdKSkge1xuXHRcdFx0XHRcdGF0dHJzW2F0dHJdID0gdGhpcy5zZXR0ZXJzW2F0dHJdLmNhbGwodGhpcywgYXR0cnNbYXR0cl0sIG9wdGlvbnMpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBCYWNrYm9uZS5Nb2RlbC5wcm90b3R5cGUuc2V0LmNhbGwodGhpcywgYXR0cnMsIG9wdGlvbnMpO1xuXHRcdH0sXG5cblx0XHRnZXR0ZXJzOiB7fSxcblxuXHRcdHNldHRlcnM6IHt9XG5cblx0fSk7XG5cblx0b3NtLk1hcmtlckRhdGEgPSBHU01vZGVsLmV4dGVuZCh7XG5cdFx0Z2V0dGVyczoge1xuXHRcdFx0bGF0OmZpeGVkRmxvYXRHZXR0ZXIoICdsYXQnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHRsbmc6Zml4ZWRGbG9hdEdldHRlciggJ2xuZycsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0U2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRTZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0fSxcblx0XHRpc0RlZmF1bHRMYWJlbDpmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLmdldCgnbGFiZWwnKSA9PT0gdGhpcy5nZXQoJ2RlZmF1bHRfbGFiZWwnKTtcblx0XHR9XG5cdH0pO1xuXHRvc20uTWFya2VyQ29sbGVjdGlvbiA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcblx0XHRtb2RlbDpvc20uTWFya2VyRGF0YVxuXHR9KTtcblx0XG5cdFxuXHRvc20uTWFwRGF0YSA9IEdTTW9kZWwuZXh0ZW5kKHtcblx0XHRnZXR0ZXJzOiB7XG5cdFx0XHRsYXQ6Zml4ZWRGbG9hdEdldHRlciggJ2xhdCcsIG9wdGlvbnMuYWNjdXJhY3kgKSxcblx0XHRcdGxuZzpmaXhlZEZsb2F0R2V0dGVyKCAnbG5nJywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0em9vbTppbnRHZXR0ZXIoJ3pvb20nKSxcblx0XHR9LFxuXHRcdHNldHRlcnM6IHtcblx0XHRcdGxhdDpmaXhlZEZsb2F0U2V0dGVyKCAnbGF0Jywgb3B0aW9ucy5hY2N1cmFjeSApLFxuXHRcdFx0bG5nOmZpeGVkRmxvYXRTZXR0ZXIoICdsbmcnLCBvcHRpb25zLmFjY3VyYWN5ICksXG5cdFx0XHR6b29tOmludFNldHRlcignem9vbScpLFxuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvKSB7XG5cdFx0XHR0aGlzLnNldCggJ21hcmtlcnMnLCBuZXcgb3NtLk1hcmtlckNvbGxlY3Rpb24oby5tYXJrZXJzKSApO1xuXHRcdFx0R1NNb2RlbC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cylcblx0XHR9XG5cdH0pO1xuXHRvc20uTWFya2VyRW50cnkgPSB3cC5CYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cdFx0dGFnTmFtZTogJ2RpdicsXG5cdFx0Y2xhc3NOYW1lOidvc20tbWFya2VyJyxcblx0XHR0ZW1wbGF0ZTp3cC50ZW1wbGF0ZSgnb3NtLW1hcmtlci1pbnB1dCcpLFxuXHRcdGV2ZW50czoge1xuXHRcdFx0J2NsaWNrIFtkYXRhLW5hbWU9XCJsb2NhdGUtbWFya2VyXCJdJyA6ICdsb2NhdGVfbWFya2VyJyxcblx0XHRcdCdjbGljayBbZGF0YS1uYW1lPVwicmVtb3ZlLW1hcmtlclwiXScgOiAncmVtb3ZlX21hcmtlcicsXG5cdFx0XHQnY2hhbmdlIFtkYXRhLW5hbWU9XCJsYWJlbFwiXSdcdFx0OiAndXBkYXRlX21hcmtlcl9sYWJlbCcsXG4vL1x0XHRcdCdmb2N1cyBbdHlwZT1cInRleHRcIl0nXHRcdFx0XHQ6ICdoaWxpdGVfbWFya2VyJ1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihvcHQpe1xuXHRcdFx0d3AubWVkaWEuVmlldy5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR0aGlzLm1hcmtlciA9IG9wdC5tYXJrZXI7IC8vIGxlYWZsZXQgbWFya2VyXG5cdFx0XHR0aGlzLm1hcmtlci5vc21fY29udHJvbGxlciA9IHRoaXM7XG5cdFx0XHR0aGlzLm1vZGVsID0gb3B0Lm1vZGVsO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYWJlbCcsIHRoaXMuY2hhbmdlZExhYmVsICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmRlZmF1bHRfbGFiZWwnLCB0aGlzLmNoYW5nZWREZWZhdWx0TGFiZWwgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF0JywgdGhpcy5jaGFuZ2VkbGF0TG5nICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxuZycsIHRoaXMuY2hhbmdlZGxhdExuZyApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2Rlc3Ryb3knLCB0aGlzLnJlbW92ZSApO1xuXHRcdFx0cmV0dXJuIHRoaXMucmVuZGVyKCk7XG5cdFx0fSxcblx0XHRjaGFuZ2VkTGFiZWw6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxhYmVsID0gdGhpcy5tb2RlbC5nZXQoJ2xhYmVsJyk7XG5cdFx0XHR0aGlzLiQoJ1tkYXRhLW5hbWU9XCJsYWJlbFwiXScpLnZhbCggbGFiZWwgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuXHRcdFx0dGhpcy5tYXJrZXIudW5iaW5kVG9vbHRpcCgpO1xuXHRcdFx0dGhpcy5tYXJrZXIuYmluZFRvb2x0aXAobGFiZWwpO1xuXG5cdFx0XHR0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlID0gbGFiZWw7XG5cblx0XHRcdCQoIHRoaXMubWFya2VyLl9pY29uICkuYXR0ciggJ3RpdGxlJywgbGFiZWwgKTtcblxuXHRcdH0sXG5cdFx0Y2hhbmdlZERlZmF1bHRMYWJlbDogZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyB1cGRhdGUgbGFiZWwgdG9vLCBpZlxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSA9PT0gdGhpcy5tb2RlbC5wcmV2aW91cygnZGVmYXVsdF9sYWJlbCcpICkge1xuXHRcdFx0XHR0aGlzLm1vZGVsLnNldCgnbGFiZWwnLCB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpICk7XG5cdFx0XHR9XG5cdFx0fSxcblx0XHRjaGFuZ2VkbGF0TG5nOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMubWFya2VyLnNldExhdExuZyggeyBsYXQ6dGhpcy5tb2RlbC5nZXQoJ2xhdCcpLCBsbmc6dGhpcy5tb2RlbC5nZXQoJ2xuZycpIH0gKVxuXHRcdH0sXG5cdFx0cmVuZGVyOmZ1bmN0aW9uKCl7XG5cdFx0XHR3cC5tZWRpYS5WaWV3LnByb3RvdHlwZS5yZW5kZXIuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbZGF0YS1uYW1lPVwibGFiZWxcIl0nKVxuXHRcdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSkge1xuXHRcdFx0XHRcdHNlbGYubG9saXRlX21hcmtlcigpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQudmFsKCB0aGlzLm1vZGVsLmdldCgnbGFiZWwnKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0JCh0aGlzLm1hcmtlci5faWNvbilcblx0XHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5oaWxpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0c2VsZi5sb2xpdGVfbWFya2VyKCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdHVwZGF0ZV9tYXJrZXJfbGFiZWw6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dmFyIGxhYmVsID0gJChlLnRhcmdldCkudmFsKCk7XG5cdFx0XHRpZiAoICcnID09PSBsYWJlbCApIHtcblx0XHRcdFx0bGFiZWwgPSB0aGlzLm1vZGVsLmdldCgnZGVmYXVsdF9sYWJlbCcpO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5tb2RlbC5zZXQoJ2xhYmVsJywgbGFiZWwgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0dXBkYXRlX21hcmtlcl9nZW9jb2RlOmZ1bmN0aW9uKCBsYWJlbCApIHtcblxuXHRcdFx0aWYgKCB0aGlzLm1vZGVsLmlzRGVmYXVsdExhYmVsKCkgKSB7XG5cdFx0XHRcdC8vIHVwZGF0ZSBtYXJrZXIgbGFiZWxzXG5cdFx0XHRcdHRoaXMuc2V0X21hcmtlcl9sYWJlbCggbGFiZWwgKTtcblx0XHRcdFx0Ly8gdXBkYXRlIG1hcmtlciBsYWJlbCBpbnB1dFxuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1nZW9jb2RlXCJdJykudmFsKCBsYWJlbCApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG5cdFx0XHR0aGlzLl91cGRhdGVfdmFsdWVzX2Zyb21fbWFya2VyKCk7XG5cblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0X3VwZGF0ZV92YWx1ZXNfZnJvbV9tYXJrZXI6IGZ1bmN0aW9uKCApIHtcblx0XHRcdHZhciBsYXRsbmcgPSB0aGlzLm1hcmtlci5nZXRMYXRMbmcoKTtcblx0XHRcdC8qXG5cdFx0XHR0aGlzLiRlbC5maW5kKCdbaWQkPVwiLW1hcmtlci1sYXRcIl0nKS52YWwoIGxhdGxuZy5sYXQgKTtcblx0XHRcdHRoaXMuJGVsLmZpbmQoJ1tpZCQ9XCItbWFya2VyLWxuZ1wiXScpLnZhbCggbGF0bG5nLmxuZyApO1xuXHRcdFx0dGhpcy4kZWwuZmluZCgnW2lkJD1cIi1tYXJrZXItbGFiZWxcIl0nKS52YWwoIHRoaXMubWFya2VyLm9wdGlvbnMudGl0bGUgKTtcblx0XHRcdC8qL1xuXHRcdFx0dGhpcy5tb2RlbC5zZXQoICdsYXQnLCBsYXRsbmcubGF0ICk7XG5cdFx0XHR0aGlzLm1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdHRoaXMubW9kZWwuc2V0KCAnbGFiZWwnLCB0aGlzLm1hcmtlci5vcHRpb25zLnRpdGxlICk7XG5cdFx0XHQvLyovXG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGhpbGl0ZV9tYXJrZXI6ZnVuY3Rpb24oZSkge1xuXHRcdFx0dGhpcy4kZWwuYWRkQ2xhc3MoJ2ZvY3VzJyk7XG5cdFx0XHQkKCB0aGlzLm1hcmtlci5faWNvbiApLmFkZENsYXNzKCdmb2N1cycpXG5cdFx0fSxcblx0XHRsb2xpdGVfbWFya2VyOmZ1bmN0aW9uKGUpIHtcblx0XHRcdHRoaXMuJGVsLnJlbW92ZUNsYXNzKCdmb2N1cycpO1xuXHRcdFx0JCggdGhpcy5tYXJrZXIuX2ljb24gKS5yZW1vdmVDbGFzcygnZm9jdXMnKVxuXHRcdH0sXG5cdFx0bG9jYXRlX21hcmtlcjpmdW5jdGlvbigpe1xuXHRcdFx0dGhpcy5tYXJrZXIuX21hcC5mbHlUbyggdGhpcy5tYXJrZXIuZ2V0TGF0TG5nKCkgKTtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cmVtb3ZlX21hcmtlcjpmdW5jdGlvbihlKSB7XG5cdFx0XHQvLyBjbGljayByZW1vdmVcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHRoaXMubW9kZWwuZGVzdHJveSgpOyAvLyBcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0cGxpbmc6ZnVuY3Rpb24oKSB7XG5cdFx0XHQkKHRoaXMubWFya2VyLl9pY29uKS5odG1sKCcnKS5hcHBlbmQoJzxzcGFuIGNsYXNzPVwicGxpbmdcIj48L3NwYW4+Jyk7XG5cdFx0fVxuXHR9KTtcblxuXHRvc20uRmllbGQgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XG5cblx0XHRtYXA6IG51bGwsXG5cdFx0ZmllbGQ6IG51bGwsXG5cdFx0Z2VvY29kZXI6IG51bGwsXG5cdFx0bG9jYXRvcjogbnVsbCxcblx0XHR2aXNpYmxlOiBudWxsLFxuXHRcdCRwYXJlbnQ6ZnVuY3Rpb24oKXtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzLC5hY2YtZmllbGQtb3Blbi1zdHJlZXQtbWFwJylcblx0XHR9LFxuXHRcdCR2YWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnaW5wdXQub3NtLWpzb24nKTtcblx0XHR9LFxuXHRcdCRyZXN1bHRzIDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kcGFyZW50KCkuZmluZCgnLm9zbS1yZXN1bHRzJyk7XG5cdFx0fSxcblx0XHQkbWFya2VyczpmdW5jdGlvbigpe1xuXHRcdFx0cmV0dXJuIHRoaXMuJHBhcmVudCgpLmZpbmQoJy5vc20tbWFya2VycycpO1xuXHRcdH0sXG5cdFx0cHJldmVudERlZmF1bHQ6IGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0ZGF0YSA9IHRoaXMuZ2V0TWFwRGF0YSgpO1xuXG5cdFx0XHR0aGlzLmNvbmZpZ1x0XHQ9IHRoaXMuJGVsLmRhdGEoKS5lZGl0b3JDb25maWc7XG5cblx0XHRcdHRoaXMubWFwXHRcdD0gY29uZi5tYXA7XG5cblx0XHRcdHRoaXMuZmllbGRcdFx0PSBjb25mLmZpZWxkO1xuXG5cdFx0XHR0aGlzLm1vZGVsXHRcdD0gbmV3IG9zbS5NYXBEYXRhKGRhdGEpO1xuXG5cdFx0XHR0aGlzLnBsaW5nTWFya2VyID0gZmFsc2U7XG5cblx0XHRcdHRoaXMuaW5pdF9sb2NhdG9yKCk7XG5cblx0XHRcdHRoaXMuaW5pdF9hY2YoKTtcblxuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5hbGxvd19wcm92aWRlcnMgKSB7XG5cdFx0XHRcdC8vIHByZXZlbnQgZGVmYXVsdCBsYXllciBjcmVhdGlvblxuXHRcdFx0XHR0aGlzLiRlbC5vbiggJ2FjZi1vc20tbWFwLWNyZWF0ZS1sYXllcnMnLCB0aGlzLnByZXZlbnREZWZhdWx0ICk7XG5cdFx0XHRcdHRoaXMuaW5pdExheWVycygpO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRlbC5vbiggJ2FjZi1vc20tbWFwLWNyZWF0ZS1tYXJrZXJzJywgdGhpcy5wcmV2ZW50RGVmYXVsdCApO1xuXG5cdFx0XHR0aGlzLmluaXRNYXJrZXJzKCk7XG5cblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2UnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAnYWRkJywgdGhpcy5hZGRNYXJrZXIgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJyksICdhZGQnLCB0aGlzLnVwZGF0ZVZhbHVlICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLCAncmVtb3ZlJywgdGhpcy51cGRhdGVWYWx1ZSApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKSwgJ2NoYW5nZScsIHRoaXMudXBkYXRlVmFsdWUgKTtcblx0XHRcdC8vdGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYXllcnMnLCBjb25zb2xlLnRyYWNlICk7XG5cblx0XHRcdC8vIHVwZGF0ZSBvbiBtYXAgdmlldyBjaGFuZ2Vcblx0XHRcdHRoaXMubWFwLm9uKCd6b29tZW5kJyxmdW5jdGlvbigpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCgnem9vbScsc2VsZi5tYXAuZ2V0Wm9vbSgpKTtcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5tYXAub24oJ21vdmVlbmQnLGZ1bmN0aW9uKCl7XG5cdFx0XHRcdHZhciBsYXRsbmcgPSBzZWxmLm1hcC5nZXRDZW50ZXIoKTtcblx0XHRcdFx0XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsYXQnLGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xuZycsbGF0bG5nLmxuZyApO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMudXBkYXRlX3Zpc2libGUoKTtcblxuXHRcdFx0dGhpcy51cGRhdGVfbWFwKCk7XG5cblxuXHRcdFx0Ly8ga2IgbmF2aWdhdGlvbiBtaWdodCBpbnRlcmZlcmUgd2l0aCBvdGhlciBrYiBsaXN0ZW5lcnNcblx0XHRcdHRoaXMubWFwLmtleWJvYXJkLmRpc2FibGUoKTtcblxuXHRcdFx0YWNmLmFkZEFjdGlvbigncmVtb3VudF9maWVsZC90eXBlPW9wZW5fc3RyZWV0X21hcCcsIGZ1bmN0aW9uKGZpZWxkKXtcblx0XHRcdFx0aWYgKCBzZWxmLmZpZWxkID09PSBmaWVsZCApIHtcblx0XHRcdFx0XHRzZWxmLm1hcC5pbnZhbGlkYXRlU2l6ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRpbml0X2xvY2F0b3I6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdGN1cnJlbnRMb2NhdGlvbiA9IGZhbHNlO1xuXG5cdFx0XHRcblx0XHRcdHRoaXMubG9jYXRvckFkZCA9IG5ldyBMLkNvbnRyb2wuQWRkTG9jYXRpb25NYXJrZXIoe1xuXHRcdFx0XHRwb3NpdGlvbjogJ2JvdHRvbWxlZnQnLFxuXHRcdFx0XHRjYWxsYmFjazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Y3VycmVudExvY2F0aW9uICYmIHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIGN1cnJlbnRMb2NhdGlvbiApO1xuXHRcdFx0XHRcdHNlbGYubG9jYXRvci5zdG9wKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0pLmFkZFRvKHRoaXMubWFwKTtcblxuXHRcdFx0dGhpcy5sb2NhdG9yID0gbmV3IEwuY29udHJvbC5sb2NhdGUoe1xuXHRcdFx0ICAgIHBvc2l0aW9uOiAnYm90dG9tbGVmdCcsXG5cdFx0XHRcdGljb246ICdkYXNoaWNvbnMgZGFzaGljb25zLWxvY2F0aW9uLWFsdCcsXG5cdFx0XHRcdGljb25Mb2FkaW5nOidzcGlubmVyIGlzLWFjdGl2ZScsXG5cdFx0XHRcdGZseVRvOnRydWUsXG5cdFx0XHQgICAgc3RyaW5nczoge1xuXHRcdFx0ICAgICAgICB0aXRsZTogaTE4bi5teV9sb2NhdGlvblxuXHRcdFx0ICAgIH0sXG5cdFx0XHRcdG9uTG9jYXRpb25FcnJvcjpmdW5jdGlvbihlcnIpIHt9XG5cdFx0XHR9KS5hZGRUbyh0aGlzLm1hcCk7XG5cblxuXHRcdFx0dGhpcy5tYXAub24oJ2xvY2F0aW9uZm91bmQnLGZ1bmN0aW9uKGUpe1xuXG5cdFx0XHRcdGN1cnJlbnRMb2NhdGlvbiA9IGUubGF0bG5nO1xuXG5cdFx0XHRcdHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRzZWxmLmxvY2F0b3Iuc3RvcEZvbGxvd2luZygpO1xuXHRcdFx0XHRcdCQoc2VsZi5sb2NhdG9yLl9pY29uKS5yZW1vdmVDbGFzcygnZGFzaGljb25zLXdhcm5pbmcnKTtcblx0XHRcdFx0XHQvL3NlbGYubG9jYXRvckFkZC5hZGRUbyhzZWxmLm1hcClcblx0XHRcdFx0fSwxKTtcblx0XHRcdH0pXG5cdFx0XHR0aGlzLm1hcC5vbignbG9jYXRpb25lcnJvcicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdGN1cnJlbnRMb2NhdGlvbiA9IGZhbHNlO1xuXHRcdFx0XHRzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0JChzZWxmLmxvY2F0b3IuX2ljb24pLmFkZENsYXNzKCdkYXNoaWNvbnMtd2FybmluZycpO1xuXHRcdFx0XHR9LDEpO1xuXHRcdFx0fSlcblx0XHR9LFxuXHRcdGdldE1hcERhdGE6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IEpTT04ucGFyc2UoIHRoaXMuJHZhbHVlKCkudmFsKCkgKTtcblx0XHRcdGRhdGEubGF0ID0gZGF0YS5sYXQgfHwgdGhpcy4kZWwuYXR0cignZGF0YS1tYXAtbGF0Jyk7XG5cdFx0XHRkYXRhLmxuZyA9IGRhdGEubG5nIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLWxuZycpO1xuXHRcdFx0ZGF0YS56b29tID0gZGF0YS56b29tIHx8IHRoaXMuJGVsLmF0dHIoJ2RhdGEtbWFwLXpvb20nKTtcblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdFx0dXBkYXRlVmFsdWU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiR2YWx1ZSgpLnZhbCggSlNPTi5zdHJpbmdpZnkoIHRoaXMubW9kZWwudG9KU09OKCkgKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0Ly90aGlzLiRlbC50cmlnZ2VyKCdjaGFuZ2UnKVxuXHRcdFx0dGhpcy51cGRhdGVNYXJrZXJTdGF0ZSgpO1xuXHRcdH0sXG5cdFx0dXBkYXRlTWFya2VyU3RhdGU6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbGVuID0gdGhpcy5tb2RlbC5nZXQoJ21hcmtlcnMnKS5sZW5ndGg7XG5cdFx0XHR0aGlzLiRlbC5hdHRyKCdkYXRhLWhhcy1tYXJrZXJzJywgISFsZW4gPyAndHJ1ZScgOiAnZmFsc2UnKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInLCAoIGZhbHNlID09PSB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyB8fCBsZW4gPCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycykgPyAndHJ1ZScgOiAnZmFsc2UnKTtcdFxuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICpcdE1hcmtlcnNcblx0XHQgKi9cblx0XHRhZGRNYXJrZXI6ZnVuY3Rpb24oIG1vZGVsLCBjb2xsZWN0aW9uICkge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdC8vIGFkZCBtYXJrZXIgdG8gbWFwXG5cdFx0XHR2YXIgbWFya2VyID0gTC5tYXJrZXIoIHsgbGF0OiBtb2RlbC5nZXQoJ2xhdCcpLCBsbmc6IG1vZGVsLmdldCgnbG5nJykgfSwge1xuXHRcdFx0XHRcdHRpdGxlOiBtb2RlbC5nZXQoJ2xhYmVsJyksXG5cdFx0XHRcdFx0aWNvbjogdGhpcy5pY29uLFxuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYmluZFRvb2x0aXAoIG1vZGVsLmdldCgnbGFiZWwnKSApO1xuXG5cdFx0XHQvLyBcblx0XHRcdHZhciBlbnRyeSA9IG5ldyBvc20uTWFya2VyRW50cnkoe1xuXHRcdFx0XHRjb250cm9sbGVyOiB0aGlzLFxuXHRcdFx0XHRtYXJrZXI6IG1hcmtlcixcblx0XHRcdFx0bW9kZWw6IG1vZGVsXG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy5tYXAub25jZSgnbGF5ZXJhZGQnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRtYXJrZXJcblx0XHRcdFx0XHQub24oJ2NsaWNrJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRcdG1vZGVsLmRlc3Ryb3koKTtcblx0XHRcdFx0XHR9KVxuXHRcdFx0XHRcdC5vbignZHJhZ2VuZCcsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0XHQvLyB1cGRhdGUgbW9kZWwgbG5nbGF0XG5cdFx0XHRcdFx0XHR2YXIgbGF0bG5nID0gdGhpcy5nZXRMYXRMbmcoKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xhdCcsIGxhdGxuZy5sYXQgKTtcblx0XHRcdFx0XHRcdG1vZGVsLnNldCggJ2xuZycsIGxhdGxuZy5sbmcgKTtcblx0XHRcdFx0XHRcdHNlbGYucmV2ZXJzZUdlb2NvZGUoIG1vZGVsICk7XG5cdFx0XHRcdFx0XHQvLyBnZW9jb2RlLCBnZXQgbGFiZWwsIHNldCBtb2RlbCBsYWJlbC4uLlxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdFx0LmRyYWdnaW5nLmVuYWJsZSgpO1xuXHRcdFx0XHRlbnRyeS4kZWwuYXBwZW5kVG8oIHNlbGYuJG1hcmtlcnMoKSApO1xuXHRcdFx0fSk7XG5cblx0XHRcdG1vZGVsLm9uKCdkZXN0cm95JyxmdW5jdGlvbigpe1xuXHRcdFx0XHRtYXJrZXIucmVtb3ZlKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0bWFya2VyLmFkZFRvKCB0aGlzLm1hcCApO1xuXHRcdFx0aWYgKCB0aGlzLnBsaW5nTWFya2VyICkge1xuXHRcdFx0XHRlbnRyeS5wbGluZygpO1xuXHRcdFx0fVxuXG5cdFx0fSxcblx0XHRpbml0TWFya2VyczpmdW5jdGlvbigpe1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuaW5pdEdlb2NvZGUoKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtaGFzLW1hcmtlcnMnLCAnZmFsc2UnKTtcblx0XHRcdHRoaXMuJGVsLmF0dHIoJ2RhdGEtY2FuLWFkZC1tYXJrZXInLCAnZmFsc2UnKTtcblx0XHRcdFxuXHRcdFx0Ly8gbm8gbWFya2VycyBhbGxvd2VkIVxuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLmljb24gPSBuZXcgTC5EaXZJY29uKHtcblx0XHRcdFx0aHRtbDogJycsXG5cdFx0XHRcdGNsYXNzTmFtZTonb3NtLW1hcmtlci1pY29uJ1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMubW9kZWwuZ2V0KCdtYXJrZXJzJykuZm9yRWFjaCggZnVuY3Rpb24oIG1vZGVsICkge1xuXHRcdFx0XHRzZWxmLmFkZE1hcmtlciggbW9kZWwgKTtcblx0XHRcdH0gKTtcblxuXHRcdFx0Ly8gZGJsdGFwIGlzIG5vdCBmaXJpbmcgb24gbW9iaWxlXG5cdFx0XHRpZiAoIEwuQnJvd3Nlci50b3VjaCAmJiBMLkJyb3dzZXIubW9iaWxlICkge1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGQoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRoaXMuX2FkZF9tYXJrZXJfb25fZGJsY2xpY2soKTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy51cGRhdGVNYXJrZXJTdGF0ZSgpO1xuXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9kYmxjbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0XHR0aGlzLm1hcC5vbignZGJsY2xpY2snLCBmdW5jdGlvbihlKXtcblx0XHRcdFx0dmFyIGxhdGxuZyA9IGUubGF0bG5nO1xuXHRcdFx0XHRcblx0XHRcdFx0TC5Eb21FdmVudC5wcmV2ZW50RGVmYXVsdChlKTtcblx0XHRcdFx0TC5Eb21FdmVudC5zdG9wUHJvcGFnYXRpb24oZSk7XG5cdFx0XHRcdFxuXHRcdFx0XHRzZWxmLmFkZE1hcmtlckJ5TGF0TG5nKCBsYXRsbmcgKTtcblx0XHRcdH0pXG5cdFx0XHQuZG91YmxlQ2xpY2tab29tLmRpc2FibGUoKTsgXG5cdFx0XHR0aGlzLiRlbC5hZGRDbGFzcygnYWRkLW1hcmtlci1vbi1kYmxjbGljaycpXG5cdFx0fSxcblx0XHRfYWRkX21hcmtlcl9vbl9ob2xkOiBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggTC5Ccm93c2VyLnBvaW50ZXIgKSB7XG5cdFx0XHRcdC8vIHVzZSBwb2ludGVyIGV2ZW50c1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGRfcG9pbnRlcigpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gdXNlIHRvdWNoIGV2ZW50c1xuXHRcdFx0XHR0aGlzLl9hZGRfbWFya2VyX29uX2hvbGRfdG91Y2goKTtcblx0XHRcdH1cblx0XHRcdHRoaXMuJGVsLmFkZENsYXNzKCdhZGQtbWFya2VyLW9uLXRhcGhvbGQnKVxuXHRcdH0sXG5cdFx0X2FkZF9tYXJrZXJfb25faG9sZF9wb2ludGVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0X2hvbGRfdGltZW91dCA9IDc1MCxcblx0XHRcdFx0X2hvbGRfd2FpdF90byA9IHt9O1xuXHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHQub24odGhpcy5tYXAuZ2V0Q29udGFpbmVyKCksJ3BvaW50ZXJkb3duJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdHZhciBjcCA9IHNlbGYubWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUpO1xuXHRcdFx0XHRcdFx0dmFyIGxwID0gc2VsZi5tYXAuY29udGFpbmVyUG9pbnRUb0xheWVyUG9pbnQoY3ApXG5cblx0XHRcdFx0XHRcdHNlbGYuYWRkTWFya2VyQnlMYXRMbmcoIHNlbGYubWFwLmxheWVyUG9pbnRUb0xhdExuZyhscCkgKVxuXG5cdFx0XHRcdFx0XHRfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSA9IGZhbHNlO1xuXHRcdFx0XHRcdH0sIF9ob2xkX3RpbWVvdXQgKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCAncG9pbnRlcnVwIHBvaW50ZXJtb3ZlJywgZnVuY3Rpb24oZSl7XG5cdFx0XHRcdFx0ISEgX2hvbGRfd2FpdF90b1sgJ3AnK2UucG9pbnRlcklkIF0gJiYgY2xlYXJUaW1lb3V0KCBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSApO1xuXHRcdFx0XHR9KTtcblx0XHR9LFxuXHRcdF9hZGRfbWFya2VyX29uX2hvbGRfdG91Y2g6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdF9ob2xkX3RpbWVvdXQgPSA3NTAsXG5cdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBmYWxzZTtcblx0XHRcdEwuRG9tRXZlbnRcblx0XHRcdFx0Lm9uKHRoaXMubWFwLmdldENvbnRhaW5lcigpLCd0b3VjaHN0YXJ0JyxmdW5jdGlvbihlKXtcblx0XHRcdFx0XHRpZiAoIGUudG91Y2hlcy5sZW5ndGggIT09IDEgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCl7XG5cblx0XHRcdFx0XHRcdHZhciBjcCA9IHNlbGYubWFwLm1vdXNlRXZlbnRUb0NvbnRhaW5lclBvaW50KGUudG91Y2hlc1swXSk7XG5cdFx0XHRcdFx0XHR2YXIgbHAgPSBzZWxmLm1hcC5jb250YWluZXJQb2ludFRvTGF5ZXJQb2ludChjcClcblxuXHRcdFx0XHRcdFx0c2VsZi5hZGRNYXJrZXJCeUxhdExuZyggc2VsZi5tYXAubGF5ZXJQb2ludFRvTGF0TG5nKGxwKSApXG5cblx0XHRcdFx0XHRcdF9ob2xkX3dhaXRfdG8gPSBmYWxzZTtcblx0XHRcdFx0XHR9LCBfaG9sZF90aW1lb3V0ICk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbih0aGlzLm1hcC5nZXRDb250YWluZXIoKSwgJ3RvdWNoZW5kIHRvdWNobW92ZScsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRcdCEhIF9ob2xkX3dhaXRfdG8gJiYgY2xlYXJUaW1lb3V0KCBfaG9sZF93YWl0X3RvWyAncCcrZS5wb2ludGVySWQgXSApO1xuXHRcdFx0XHR9KTtcblx0XHR9LFxuXHRcdGFkZE1hcmtlckJ5TGF0TG5nOmZ1bmN0aW9uKGxhdGxuZykge1xuXHRcdFx0dmFyIGNvbGxlY3Rpb24gPSB0aGlzLm1vZGVsLmdldCgnbWFya2VycycpLFxuXHRcdFx0XHRtb2RlbDtcblx0XHRcdC8vIG5vIG1vcmUgbWFya2Vyc1xuXHRcdFx0aWYgKCB0aGlzLmNvbmZpZy5tYXhfbWFya2VycyAhPT0gZmFsc2UgJiYgY29sbGVjdGlvbi5sZW5ndGggPj0gdGhpcy5jb25maWcubWF4X21hcmtlcnMgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdG1vZGVsID0gbmV3IG9zbS5NYXJrZXJEYXRhKHtcblx0XHRcdFx0bGFiZWw6ICcnLFxuXHRcdFx0XHRkZWZhdWx0X2xhYmVsOiAnJyxcblx0XHRcdFx0bGF0OiBsYXRsbmcubGF0LFxuXHRcdFx0XHRsbmc6IGxhdGxuZy5sbmcsXG5cdFx0XHR9KTtcblx0XHRcdHRoaXMucGxpbmdNYXJrZXIgPSB0cnVlO1xuXHRcdFx0Y29sbGVjdGlvbi5hZGQoIG1vZGVsICk7XG5cdFx0XHR0aGlzLnJldmVyc2VHZW9jb2RlKCBtb2RlbCApO1xuXHRcdH0sXG5cdFx0LyoqXG5cdFx0ICpcdEdlb2NvZGluZ1xuXHRcdCAqXG5cdFx0ICpcdEBvbiBtYXAubGF5ZXJhZGQsIGxheWVyLmRyYWdlbmRcblx0XHQgKi9cblx0XHQgaW5pdEdlb2NvZGU6ZnVuY3Rpb24oKSB7XG5cbiBcdFx0XHR2YXIgc2VsZiA9IHRoaXMsXG5cdFx0XHRcdCRhYm92ZSA9IHRoaXMuJGVsLnByZXYoKTtcblx0XHRcdGlmICggISAkYWJvdmUuaXMoICcuYWNmLW9zbS1hYm92ZScgKSApIHtcblx0XHRcdFx0JGFib3ZlID0gJCgnPGRpdiBjbGFzcz1cImFjZi1vc20tYWJvdmVcIj48L2Rpdj4nKS5pbnNlcnRCZWZvcmUoIHRoaXMuJGVsICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkYWJvdmUuaHRtbCgnJyk7XHRcdFx0XHRcblx0XHRcdH1cblx0XHRcdC8vIGFkZCBhbiBleHRyYSBjb250cm9sIHBhbmVsIHJlZ2lvbiBmb3Igb3V0IHNlYXJjaFxuIFx0XHRcdHRoaXMubWFwLl9jb250cm9sQ29ybmVyc1snYWJvdmUnXSA9ICRhYm92ZS5nZXQoMCk7XG5cbiBcdFx0XHR0aGlzLmdlb2NvZGVyID0gTC5Db250cm9sLmdlb2NvZGVyKHtcbiBcdFx0XHRcdGNvbGxhcHNlZDogZmFsc2UsXG4gXHRcdFx0XHRwb3NpdGlvbjonYWJvdmUnLFxuIFx0XHRcdFx0cGxhY2Vob2xkZXI6aTE4bi5zZWFyY2gsXG4gXHRcdFx0XHRlcnJvck1lc3NhZ2U6aTE4bi5ub3RoaW5nX2ZvdW5kLFxuIFx0XHRcdFx0c2hvd1Jlc3VsdEljb25zOnRydWUsXG4gXHRcdFx0XHRzdWdnZXN0TWluTGVuZ3RoOjMsXG4gXHRcdFx0XHRzdWdnZXN0VGltZW91dDoyNTAsXG4gXHRcdFx0XHRxdWVyeU1pbkxlbmd0aDozLFxuIFx0XHRcdFx0ZGVmYXVsdE1hcmtHZW9jb2RlOmZhbHNlLFxuIFx0XHRcdH0pXG4gXHRcdFx0Lm9uKCdtYXJrZ2VvY29kZScsZnVuY3Rpb24oZSl7XG4gXHRcdFx0XHQvLyBzZWFyY2ggcmVzdWx0IGNsaWNrXG4gXHRcdFx0XHR2YXIgbGF0bG5nID0gIGUuZ2VvY29kZS5jZW50ZXIsXG4gXHRcdFx0XHRcdGNvdW50X21hcmtlcnMgPSBzZWxmLm1vZGVsLmdldCgnbWFya2VycycpLmxlbmd0aCxcbiBcdFx0XHRcdFx0bGFiZWwgPSBzZWxmLnBhcnNlR2VvY29kZVJlc3VsdCggWyBlLmdlb2NvZGUgXSwgbGF0bG5nICksXG4gXHRcdFx0XHRcdG1hcmtlcl9kYXRhID0ge1xuIFx0XHRcdFx0XHRcdGxhYmVsOiBsYWJlbCxcbiBcdFx0XHRcdFx0XHRkZWZhdWx0X2xhYmVsOiBsYWJlbCxcbiBcdFx0XHRcdFx0XHRsYXQ6IGxhdGxuZy5sYXQsXG4gXHRcdFx0XHRcdFx0bG5nOiBsYXRsbmcubG5nXG4gXHRcdFx0XHRcdH0sIFxuIFx0XHRcdFx0XHRtb2RlbDtcblxuXHRcdFx0XHQvLyBnZXR0aW5nIHJpZCBvZiB0aGUgbW9kYWwg4oCTICMzNVxuXHRcdFx0XHRzZWxmLmdlb2NvZGVyLl9jbGVhclJlc3VsdHMoKTtcblx0XHRcdFx0c2VsZi5nZW9jb2Rlci5faW5wdXQudmFsdWUgPSAnJztcblxuXHRcdFx0XHQvLyBubyBtYXJrZXJzIC0ganVzdCBhZGFwdCBtYXAgdmlld1xuIFx0XHRcdFx0aWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMCApIHtcblxuIFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5tYXAuZml0Qm91bmRzKCBlLmdlb2NvZGUuYmJveCApO1xuXG4gXHRcdFx0XHR9XG5cblx0XHRcdFx0XG4gXHRcdFx0XHRpZiAoIHNlbGYuY29uZmlnLm1heF9tYXJrZXJzID09PSBmYWxzZSB8fCBjb3VudF9tYXJrZXJzIDwgc2VsZi5jb25maWcubWF4X21hcmtlcnMgKSB7XG5cdFx0XHRcdFx0Ly8gaW5maW5pdGUgbWFya2VycyBvciBtYXJrZXJzIHN0aWxsIGluIHJhbmdlXG4gXHRcdFx0XHRcdHNlbGYubW9kZWwuZ2V0KCdtYXJrZXJzJykuYWRkKCBtYXJrZXJfZGF0YSApO1xuXG4gXHRcdFx0XHR9IGVsc2UgaWYgKCBzZWxmLmNvbmZpZy5tYXhfbWFya2VycyA9PT0gMSApIHtcblx0XHRcdFx0XHQvLyBvbmUgbWFya2VyIG9ubHlcbiBcdFx0XHRcdFx0c2VsZi5tb2RlbC5nZXQoJ21hcmtlcnMnKS5hdCgwKS5zZXQoIG1hcmtlcl9kYXRhICk7XG5cbiBcdFx0XHRcdH1cblxuIFx0XHRcdFx0c2VsZi5tYXAuc2V0VmlldyggbGF0bG5nLCBzZWxmLm1hcC5nZXRab29tKCkgKTsgLy8ga2VlcCB6b29tLCBtaWdodCBiZSBjb25mdXNpbmcgZWxzZVxuXG4gXHRcdFx0fSlcbiBcdFx0XHQuYWRkVG8oIHRoaXMubWFwICk7XG5cbiBcdFx0fSxcblx0XHRyZXZlcnNlR2VvY29kZTpmdW5jdGlvbiggbW9kZWwgKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXMsIFxuXHRcdFx0XHRsYXRsbmcgPSB7IGxhdDogbW9kZWwuZ2V0KCdsYXQnKSwgbG5nOiBtb2RlbC5nZXQoJ2xuZycpIH07XG5cdFx0XHR0aGlzLmdlb2NvZGVyLm9wdGlvbnMuZ2VvY29kZXIucmV2ZXJzZSggXG5cdFx0XHRcdGxhdGxuZywgXG5cdFx0XHRcdHNlbGYubWFwLmdldFpvb20oKSwgXG5cdFx0XHRcdGZ1bmN0aW9uKCByZXN1bHRzICkge1xuXHRcdFx0XHRcdG1vZGVsLnNldCgnZGVmYXVsdF9sYWJlbCcsIHNlbGYucGFyc2VHZW9jb2RlUmVzdWx0KCByZXN1bHRzLCBsYXRsbmcgKSApO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH0sXG5cdFx0cGFyc2VHZW9jb2RlUmVzdWx0OiBmdW5jdGlvbiggcmVzdWx0cywgbGF0bG5nICkge1xuXHRcdFx0dmFyIGxhYmVsID0gZmFsc2U7XG5cblx0XHRcdGlmICggISByZXN1bHRzLmxlbmd0aCApIHtcblx0XHRcdFx0Ly8gaHR0cHM6Ly94a2NkLmNvbS8yMTcwL1xuXHRcdFx0XHRsYWJlbCA9IGxhdGxuZy5sYXQgKyAnLCAnICsgbGF0bG5nLmxuZztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQuZWFjaCggcmVzdWx0cywgZnVuY3Rpb24oIGksIHJlc3VsdCApIHtcblx0XHRcdFx0XHRpZiAoICEhIHJlc3VsdC5odG1sICkge1xuXHRcdFx0XHRcdFx0dmFyIGh0bWwgPSByZXN1bHQuaHRtbC5yZXBsYWNlKC8oXFxzKyk8L2csJzwnKS5yZXBsYWNlKC88YnJcXC8+L2csJzxici8+LCAnKTtcblx0XHRcdFx0XHRcdC8vIGFkZCBtaXNzaW5nIHNwYWNlc1xuXHRcdFx0XHRcdFx0bGFiZWwgPSAkKCc8cD4nK2h0bWwrJzwvcD4nKS50ZXh0KCkudHJpbSgpLnJlcGxhY2UoLyhcXHMrKS9nLCcgJyk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGxhYmVsID0gcmVzdWx0Lm5hbWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBmYWxzZTtcblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0XHQvLyB0cmltXG5cdFx0XHRyZXR1cm4gbGFiZWw7XG5cdFx0fSxcblxuXG5cblx0XHQvKipcblx0XHQgKlx0TGF5ZXJzXG5cdCBcdCovXG5cdFx0aW5pdExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0c2VsZWN0ZWRMYXllcnMgPSBbXSxcblx0XHRcdFx0YmFzZUxheWVycyA9IHt9LFxuXHRcdFx0XHRvdmVybGF5cyA9IHt9LFxuXHRcdFx0XHRtYXBMYXllcnMgPSB7fSxcblx0XHRcdFx0aXNfb21pdHRlZCA9IGZ1bmN0aW9uKGtleSkge1xuXHRcdFx0XHRcdHJldHVybiBrZXkgPT09IG51bGwgfHwgKCAhISBzZWxmLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgJiYgc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGtleSApID09PSAtMSApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzZXR1cE1hcCA9IGZ1bmN0aW9uKCB2YWwsIGtleSApe1xuXHRcdFx0XHRcdHZhciBsYXllciwgbGF5ZXJfY29uZmlnO1xuXHRcdFx0XHRcdGlmICggXy5pc09iamVjdCh2YWwpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICQuZWFjaCggdmFsLCBzZXR1cE1hcCApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggaXNfb21pdHRlZChrZXkpICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoICEhIG1hcExheWVyc1sga2V5IF0gKSB7XG5cdFx0XHRcdFx0XHRsYXllciA9IG1hcExheWVyc1sga2V5IF07XG5cdFx0XHRcdFx0XHRzZWxmLm1hcC5hZGRMYXllcihsYXllcilcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRcdFx0bGF5ZXIgPSBMLnRpbGVMYXllci5wcm92aWRlcigga2V5IC8qLCBsYXllcl9jb25maWcub3B0aW9ucyovICk7XG5cdFx0XHRcdFx0XHR9IGNhdGNoKGV4KSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGxheWVyLnByb3ZpZGVyS2V5ID0ga2V5O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBrZXksIGxheWVyICkgKSB7XG5cdFx0XHRcdFx0XHRvdmVybGF5c1trZXldID0gbGF5ZXI7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGJhc2VMYXllcnNba2V5XSA9IGxheWVyO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZWN0ZWRMYXllcnMuaW5kZXhPZigga2V5ICkgIT09IC0xICkge1xuXHRcdFx0XHRcdFx0c2VsZi5tYXAuYWRkTGF5ZXIobGF5ZXIpO1xuIFx0XHRcdFx0XHR9XG4gXHRcdFx0XHR9O1xuXG4gXHRcdFx0c2VsZWN0ZWRMYXllcnMgPSB0aGlzLm1vZGVsLmdldCgnbGF5ZXJzJyk7IC8vIHNob3VsZCBiZSBsYXllciBzdG9yZSB2YWx1ZVxuXG4gXHRcdFx0Ly8gZmlsdGVyIGF2YWlhbGJsZSBsYXllcnMgaW4gZmllbGQgdmFsdWVcbiBcdFx0XHRpZiAoIHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyAhPT0gZmFsc2UgJiYgXy5pc0FycmF5KCB0aGlzLmNvbmZpZy5yZXN0cmljdF9wcm92aWRlcnMgKSApIHtcbiBcdFx0XHRcdHNlbGVjdGVkTGF5ZXJzID0gc2VsZWN0ZWRMYXllcnMuZmlsdGVyKCBmdW5jdGlvbihlbCkge1xuIFx0XHRcdFx0XHRyZXR1cm4gc2VsZi5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLmluZGV4T2YoIGVsICkgIT09IC0xO1xuIFx0XHRcdFx0fSk7XG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gc2V0IGRlZmF1bHQgbGF5ZXJcbiBcdFx0XHRpZiAoICEgc2VsZWN0ZWRMYXllcnMubGVuZ3RoICkge1xuXG4gXHRcdFx0XHRzZWxlY3RlZExheWVycyA9IHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycy5zbGljZSggMCwgMSApO1xuXG4gXHRcdFx0fVxuXG4gXHRcdFx0Ly8gZWRpdGFibGUgbGF5ZXJzIVxuXG5cdFx0XHR0aGlzLm1hcC5vbiggJ2Jhc2VsYXllcmNoYW5nZSBsYXllcmFkZCBsYXllcnJlbW92ZScsIGZ1bmN0aW9uKGUpe1xuXHRcdFx0XG5cdFx0XHRcdGlmICggISBlLmxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgbGF5ZXJzID0gW107XG5cblx0XHRcdFx0c2VsZi5tYXAuZWFjaExheWVyKGZ1bmN0aW9uKGxheWVyKSB7XG5cdFx0XHRcdFx0aWYgKCAhIGxheWVyLnByb3ZpZGVyS2V5ICkge1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggc2VsZi5sYXllcl9pc19vdmVybGF5KCBsYXllci5wcm92aWRlcktleSwgbGF5ZXIgKSApIHtcblx0XHRcdFx0XHRcdGxheWVycy5wdXNoKCBsYXllci5wcm92aWRlcktleSApXG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGxheWVycy51bnNoaWZ0KCBsYXllci5wcm92aWRlcktleSApXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoICdsYXllcnMnLCBsYXllcnMgKTtcblx0XHRcdH0gKTtcblxuIFx0XHRcdCQuZWFjaCggdGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzLCBzZXR1cE1hcCApO1xuXHRcdFx0XG5cdFx0XHR0aGlzLmxheWVyc0NvbnRyb2wgPSBMLmNvbnRyb2wubGF5ZXJzKCBiYXNlTGF5ZXJzLCBvdmVybGF5cywge1xuXHRcdFx0XHRjb2xsYXBzZWQ6IHRydWUsXG5cdFx0XHRcdGhpZGVTaW5nbGVCYXNlOiB0cnVlLFxuXHRcdFx0fSkuYWRkVG8odGhpcy5tYXApO1xuIFx0XHR9LFxuXHRcdGxheWVyX2lzX292ZXJsYXk6IGZ1bmN0aW9uKCAga2V5LCBsYXllciApIHtcblx0XHRcdHZhciBwYXR0ZXJucztcblxuXHRcdFx0aWYgKCBsYXllci5vcHRpb25zLm9wYWNpdHkgJiYgbGF5ZXIub3B0aW9ucy5vcGFjaXR5IDwgMSApIHtcblx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHR9XG5cdFx0XHRwYXR0ZXJucyA9IFsnXihPcGVuV2VhdGhlck1hcHxPcGVuU2VhTWFwKScsXG5cdFx0XHRcdCdPcGVuTWFwU3VyZmVyLkFkbWluQm91bmRzJyxcblx0XHRcdFx0J1N0YW1lbi5Ub25lcihIeWJyaWR8TGluZXN8TGFiZWxzKScsXG5cdFx0XHRcdCdBY2V0YXRlLihmb3JlZ3JvdW5kfGxhYmVsc3xyb2FkcyknLFxuXHRcdFx0XHQnSGlsbFNoYWRpbmcnLFxuXHRcdFx0XHQnSHlkZGEuUm9hZHNBbmRMYWJlbHMnLFxuXHRcdFx0XHQnXkp1c3RpY2VNYXAnLFxuXHRcdFx0XHQnT3BlbkluZnJhTWFwLihQb3dlcnxUZWxlY29tfFBldHJvbGV1bXxXYXRlciknLFxuXHRcdFx0XHQnT3BlblB0TWFwJyxcblx0XHRcdFx0J09wZW5SYWlsd2F5TWFwJyxcblx0XHRcdFx0J09wZW5GaXJlTWFwJyxcblx0XHRcdFx0J1NhZmVDYXN0Jyxcblx0XHRcdFx0J0NhcnRvREIuRGFya01hdHRlck9ubHlMYWJlbHMnLFxuXHRcdFx0XHQnQ2FydG9EQi5Qb3NpdHJvbk9ubHlMYWJlbHMnXG5cdFx0XHRdO1xuXHRcdFx0cmV0dXJuIGtleS5tYXRjaCgnKCcgKyBwYXR0ZXJucy5qb2luKCd8JykgKyAnKScpICE9PSBudWxsO1xuXHRcdH0sXG5cdFx0cmVzZXRMYXllcnM6ZnVuY3Rpb24oKSB7XG5cdFx0XHQvLyByZW1vdmUgYWxsIG1hcCBsYXllcnNcblx0XHRcdHRoaXMubWFwLmVhY2hMYXllcihmdW5jdGlvbihsYXllcil7XG5cdFx0XHRcdGlmICggbGF5ZXIuY29uc3RydWN0b3IgPT09IEwuVGlsZUxheWVyLlByb3ZpZGVyICkge1xuXHRcdFx0XHRcdGxheWVyLnJlbW92ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9KVxuXG5cdFx0XHQvLyByZW1vdmUgbGF5ZXIgY29udHJvbFxuXHRcdFx0ISEgdGhpcy5sYXllcnNDb250cm9sICYmIHRoaXMubGF5ZXJzQ29udHJvbC5yZW1vdmUoKVxuXHRcdH0sXG5cdFx0dXBkYXRlX3Zpc2libGU6IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHRpZiAoIHRoaXMudmlzaWJsZSA9PT0gdGhpcy4kZWwuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdHJldHVybiB0aGlzO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnZpc2libGUgPSB0aGlzLiRlbC5pcygnOnZpc2libGUnKTtcblxuXHRcdFx0aWYgKCB0aGlzLnZpc2libGUgKSB7XG5cdFx0XHRcdHRoaXMubWFwLmludmFsaWRhdGVTaXplKCk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gdGhpcztcblx0XHR9LFxuXHRcdGluaXRfYWNmOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBzZWxmID0gdGhpcyxcblx0XHRcdFx0dG9nZ2xlX2NiID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0Ly8gbm8gY2hhbmdlXG5cdFx0XHRcdFx0c2VsZi51cGRhdGVfdmlzaWJsZSgpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHQvLyBleHBhbmQvY29sbGFwc2UgYWNmIHNldHRpbmdcblx0XHRcdGFjZi5hZGRBY3Rpb24oICdzaG93JywgdG9nZ2xlX2NiICk7XG5cdFx0XHRhY2YuYWRkQWN0aW9uKCAnaGlkZScsIHRvZ2dsZV9jYiApO1xuXG5cdFx0XHQvLyBleHBhbmQgd3AgbWV0YWJveFxuXHRcdFx0JChkb2N1bWVudCkub24oJ3Bvc3Rib3gtdG9nZ2xlZCcsIHRvZ2dsZV9jYiApO1xuXHRcdFx0JChkb2N1bWVudCkub24oJ2NsaWNrJywnLndpZGdldC10b3AgKicsIHRvZ2dsZV9jYiApO1xuXG5cdFx0fSxcblx0XHR1cGRhdGVfbWFwOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxhdGxuZyA9IHsgbGF0OiB0aGlzLm1vZGVsLmdldCgnbGF0JyksIGxuZzogdGhpcy5tb2RlbC5nZXQoJ2xuZycpIH1cblx0XHRcdHRoaXMubWFwLnNldFZpZXcoIFxuXHRcdFx0XHRsYXRsbmcsXG5cdFx0XHRcdHRoaXMubW9kZWwuZ2V0KCd6b29tJykgXG5cdFx0XHQpO1xuXHRcdH1cblx0fSk7XG5cblxuXHQkKGRvY3VtZW50KVxuXHRcdC5yZWFkeShmdW5jdGlvbigpe1xuXHRcdH0pXG5cdFx0Lm9uKCAnYWNmLW9zbS1tYXAtY3JlYXRlJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRpZiAoICEgTC5Db250cm9sLkFkZExvY2F0aW9uTWFya2VyICkge1xuXHRcdFx0XHRMLkNvbnRyb2wuQWRkTG9jYXRpb25NYXJrZXIgPSBMLkNvbnRyb2wuZXh0ZW5kKHtcblx0XHRcdFx0XHRvbkFkZDpmdW5jdGlvbigpIHtcblxuXHRcdFx0XHRcdFx0dGhpcy5fY29udGFpbmVyID0gTC5Eb21VdGlsLmNyZWF0ZSgnZGl2Jyxcblx0XHRcdFx0XHRcdFx0J2xlYWZsZXQtY29udHJvbC1hZGQtbG9jYXRpb24tbWFya2VyIGxlYWZsZXQtYmFyIGxlYWZsZXQtY29udHJvbCcpO1xuXG5cdFx0XHRcdFx0XHR0aGlzLl9saW5rID0gTC5Eb21VdGlsLmNyZWF0ZSgnYScsICdsZWFmbGV0LWJhci1wYXJ0IGxlYWZsZXQtYmFyLXBhcnQtc2luZ2xlJywgdGhpcy5fY29udGFpbmVyKTtcblx0XHQgICAgICAgICAgICAgICAgdGhpcy5fbGluay50aXRsZSA9IGkxOG4uYWRkX21hcmtlcl9hdF9sb2NhdGlvbjtcblx0XHQgICAgICAgICAgICAgICAgdGhpcy5faWNvbiA9IEwuRG9tVXRpbC5jcmVhdGUoJ3NwYW4nLCAnZGFzaGljb25zIGRhc2hpY29ucy1sb2NhdGlvbicsIHRoaXMuX2xpbmspO1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQucHJldmVudERlZmF1bHQpXG5cdFx0XHRcdFx0XHRcdC5vbiggdGhpcy5fbGluaywgJ2NsaWNrJywgdGhpcy5vcHRpb25zLmNhbGxiYWNrLCB0aGlzKVxuXHRcdFx0XHRcdFx0XHQub24oIHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uKTtcblxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRhaW5lcjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdG9uUmVtb3ZlOmZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0TC5Eb21FdmVudFxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uIClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCBMLkRvbUV2ZW50LnByZXZlbnREZWZhdWx0IClcblx0XHRcdFx0XHRcdFx0Lm9mZih0aGlzLl9saW5rLCAnY2xpY2snLCB0aGlzLm9wdGlvbnMuY2FsbGJhY2ssIHRoaXMgKVxuXHRcdFx0XHRcdFx0XHQub2ZmKHRoaXMuX2xpbmssICdkYmxjbGljaycsIEwuRG9tRXZlbnQuc3RvcFByb3BhZ2F0aW9uICk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSlcdFx0XHRcdFxuXHRcdFx0fVxuXG5cblx0XHRcdC8vIGRvbid0IGluaXQgaW4gcmVwZWF0ZXIgdGVtcGxhdGVzXG5cdFx0XHRpZiAoICQoZS50YXJnZXQpLmNsb3Nlc3QoJ1tkYXRhLWlkPVwiYWNmY2xvbmVpbmRleFwiXScpLmxlbmd0aCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0fSlcblx0XHQub24oICdhY2Ytb3NtLW1hcC1pbml0JywgZnVuY3Rpb24oIGUsIG1hcCApIHtcblx0XHRcdHZhciBlZGl0b3I7XG5cblx0XHRcdC8vIHdyYXAgb3NtLkZpZWxkIGJhY2tib25lIHZpZXcgYXJvdW5kIGVkaXRvcnNcblx0XHRcdGlmICggJChlLnRhcmdldCkuaXMoJ1tkYXRhLWVkaXRvci1jb25maWddJykgKSB7XG5cdFx0XHRcdC8vIGUucHJldmVudERlZmF1bHQoKTtcblxuXHRcdFx0XHQoZnVuY3Rpb24gY2hlY2tWaXMoKXtcblx0XHRcdFx0XHRpZiAoICEgJChlLnRhcmdldCkuaXMoJzp2aXNpYmxlJykgKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gc2V0VGltZW91dCggY2hlY2tWaXMsIDI1MCApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRtYXAuaW52YWxpZGF0ZVNpemUoKTtcblx0XHRcdFx0fSkoKTtcblx0XHRcdFx0ZWRpdG9yID0gbmV3IG9zbS5GaWVsZCggeyBlbDogZS50YXJnZXQsIG1hcDogbWFwLCBmaWVsZDogYWNmLmdldEZpZWxkKCAkKGUudGFyZ2V0KS5jbG9zZXN0KCcuYWNmLWZpZWxkJykgKSB9ICk7XG5cdFx0XHRcdCQoZS50YXJnZXQpLmRhdGEoICdfbWFwX2VkaXRvcicsIGVkaXRvciApO1xuXHRcdFx0fVxuXHRcdH0pO1xuLy9cdGFjZi5hZGRBY3Rpb24oICduZXdfZmllbGQnLCBmdW5jdGlvbihmaWVsZCl7Y29uc29sZS5sb2coZmllbGQpfSApO1xuXHQvLyBpbml0IHdoZW4gZmllbGRzIGdldCBsb2FkZWQgLi4uXG5cdGFjZi5hZGRBY3Rpb24oICdhcHBlbmQnLCBmdW5jdGlvbigpe1xuXHRcdCQuYWNmX2xlYWZsZXQoKTtcblx0fSk7XG5cdC8vIGluaXQgd2hlbiBmaWVsZHMgc2h3IC4uLlxuXHRhY2YuYWRkQWN0aW9uKCAnc2hvd19maWVsZCcsIGZ1bmN0aW9uKCBmaWVsZCApIHtcblxuXHRcdGlmICggJ29wZW5fc3RyZWV0X21hcCcgIT09IGZpZWxkLnR5cGUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHQgICAgdmFyIGVkaXRvciA9IGZpZWxkLiRlbC5maW5kKCdbZGF0YS1lZGl0b3ItY29uZmlnXScpLmRhdGEoICdfbWFwX2VkaXRvcicgKTtcblx0ICAgIGVkaXRvci51cGRhdGVfdmlzaWJsZSgpO1xuXHR9KTtcblxuXHRcblxufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=
