(function( $, arg, exports ){
	var osm = exports.osm;


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
			var data = {
				center_lat: parseFloat(this.$lat().val() || this.$el.data().mapLat ),
				center_lng: parseFloat(this.$lng().val() || this.$el.data().mapLng ),
				zoom: parseInt(this.$zoom().val() || this.$el.data().mapZoom ),
				layers: this.$el.data().mapLayers,
			};
			return data;
		},
		initialize:function(conf) {
			osmField.prototype.initialize.apply( this, arguments );
			this.bindMapListener();
			this.bindListener();
			
		},
		updateInput: function() {
			this.$lat().val( this.model.get('center_lat') );
			this.$lng().val( this.model.get('center_lng') );
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
				self.model.set( 'center_lat', $(e.target).val() );
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
				self.model.set( 'center_lng', $(e.target).val() );
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
				self.model.set( 'zoom', $(e.target).val() );
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
	});
	acf.addAction('render_field_object', function(field){
		if ( 'open_street_map' === field.data.type ) {
			$.acf_leaflet();
		}
	});

})( jQuery, acf_osm_admin, window );
