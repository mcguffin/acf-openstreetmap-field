(function( $, arg, exports ){
	var osm = exports.osm;


	function getGeo( view ) {
		var inp = getInput( view );
		return {
			center_lat:parseFloat(inp.$lat.val()),
			center_lng:parseFloat(inp.$lng.val()),
			zoom:parseInt(inp.$zoom.val()),
		};
		
	}
	var osmField = osm.Field;
	osm.Field = osmField.extend({
		$lat: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-center_lat"]');
		},
		$lng: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-center_lng"]');
		},
		$zoom: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-zoom"]');
		},
		$returnFormat: function() {
			return this.$el.closest('.acf-field-settings').find('[data-name="return_format"]');
		},
		getMapData:function() {
			return {
				center_lat: parseFloat(this.$lat().val()) || this.$el.data().mapLat,
				center_lng: parseFloat(this.$lng().val()) || this.$el.data().mapLng,
				zoom: parseInt(this.$zoom().val()) || this.$el.data().mapZoom,
				layers: this.$el.data().mapLayers,
			};
		},
		initialize:function(conf) {
			osmField.prototype.initialize.apply( this, arguments );
			this.bindMapListener();
			this.bindListener();
		},
		updateInput: function() {
			this.$lat().val( this.model.get('center_lat').toFixed(6) );
			this.$lng().val( this.model.get('center_lng').toFixed(6) );
			this.$zoom().val( this.model.get('zoom') );
		},
		initLayers:function() {
			var layers = this.model.get('layers');
			osmField.prototype.initLayers.apply(this,arguments);
			var $layers = $( this.layersControl.getContainer() ).find('[type="radio"],[type="checkbox"]'),
				name = this.$zoom().attr('name').replace('[zoom]','[layers][]');
			$layers.each(function(i,el){
				var $el = $(el);
				$(el)
					.attr( 'name', name )
					.attr( 'value', $el.next().text().trim() );
			});
			// if ( ! $layers.find(':checked').length ) {
			// 	this.model.set('layers',[ $layers.first().attr('value') ]);
			// }
			
			// select default layer if non is selected
			return this;
		},
		bindInputListener: function() {
			var self = this;
			this.$lat().on('change',function(e){
				self.model.set( 'center_lat', parseFloat( $(e.target).val() ) );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			})
			;
			this.$lng().on('change',function(e){
				self.model.set( 'center_lng', parseFloat( $(e.target).val() ) );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			})
			;
			this.$zoom().on('change',function(e){
				self.model.set( 'zoom', parseInt( $(e.target).val() ) );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			});
		},
		bindMapListener: function() {
			this.listenTo( this.model, 'change:center_lat', this.updateInput );
			this.listenTo( this.model, 'change:center_lng', this.updateInput );
			this.listenTo( this.model, 'change:zoom', this.updateInput );

		},
		bindListener: function() {
			var self = this;

			this.$returnFormat().on('change',function(e) {
				var conf = self.$el.data('editor-config'),
					layers = self.model.get('layers');
				// map
				self.resetLayers();
				if ( $(e.target).val() === 'osm' ) {
					// set provider restriction to osm providers
					conf.restrict_providers = Object.values( arg.options.osm_layers );
				} else {
					// set provider restriction to osm providers
					conf.restrict_providers = Object.values( arg.options.leaflet_layers );
				}
				self.$el.data( 'editor-config', conf );
				self.model.set('layers',layers);
				self.initLayers();
			});


		},
		unbindInputListener: function() {
			this.$lat().off('change').off('focus').off('blur');
			this.$lng().off('change').off('focus').off('blur');
			this.$zoom().off('change').off('focus').off('blur');
		},
		unbindMapListener: function() {
			this.stopListening( this.model, 'change:center_lat', this.updateInput );
			this.stopListening( this.model, 'change:center_lng', this.updateInput );
			this.stopListening( this.model, 'change:zoom', this.updateInput );
		},
		update_visible: function() {
			var prev = this.visible;
			osmField.prototype.update_visible.apply( this, arguments );
			if ( prev !== this.visible ) {
				if ( this.visible ) {
					this.bindInputListener()
				} else {
					this.unbindInputListener()
				}
			}
		}
	})

	// unbind_events:function() {
	// 	var self = this;
	// 	self.$lat().off('blur');
	// 	self.$lng().off('blur');
	// 	self.$zoom().off('blur');
	// 	self.$zoom().off('keyup focus');
	// 
	// 	this.map.off('zoomend', this.map_zoomed, this );
	// 	this.map.off('moveend', this.map_moved, this );
	// },
	// bind_events: function() {
	// 	var self = this;
	// 
	// 	self.$lat().on('blur',function(e){
	// 		self.update_map();
	// 	});
	// 	self.$lng().on('blur',function(e){
	// 		self.update_map();
	// 	});
	// 	self.$zoom().on('blur',function(e){
	// 		self.update_map();
	// 	});
	// 
	// 	this.map.on('zoomend', this.map_zoomed, this );
	// 	this.map.on('moveend', this.map_moved, this );
	// },


})( jQuery, acf_osm_admin, window );
