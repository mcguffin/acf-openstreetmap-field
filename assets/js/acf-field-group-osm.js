(function( $, arg, exports ){
	var osm = exports.osm;


	var osmField = osm.Field;
	osm.Field = osmField.extend({
		$lat: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-lat"]');
		},
		$lng: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-lng"]');
		},
		$zoom: function() {
			return this.$el.closest('.acf-field-settings').find('input[id$="-zoom"]');
		},
		$returnFormat: function() {
			return this.$el.closest('.acf-field-settings').find('[data-name="return_format"]');
		},
		getMapData:function() {
			var data = {
				lat: parseFloat(this.$lat().val() || this.$el.data().mapLat ),
				lng: parseFloat(this.$lng().val() || this.$el.data().mapLng ),
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
			this.$lat().val( this.model.get('lat') );
			this.$lng().val( this.model.get('lng') );
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
				self.model.set( 'lat', $(e.target).val() );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			});

			this.$lng().on('change',function(e){
				self.model.set( 'lng', $(e.target).val() );
				self.update_map();
			})
			.on('focus',function(e){
				self.unbindMapListener();
			})
			.on('blur',function(e){
				self.bindMapListener();
			});

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
			this.listenTo( this.model, 'change:lat', this.updateInput );
			this.listenTo( this.model, 'change:lng', this.updateInput );
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
			this.stopListening( this.model, 'change:lat', this.updateInput );
			this.stopListening( this.model, 'change:lng', this.updateInput );
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
	// acf.addAction('render_field_object', function(field){
	// 	if ( 'open_street_map' === field.data.type ) {
	// 
	// 		//$.acf_leaflet();
	// 	}
	// });

})( jQuery, acf_osm_admin, window );

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1maWVsZC1ncm91cC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiYWNmLWZpZWxkLWdyb3VwLW9zbS5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiggJCwgYXJnLCBleHBvcnRzICl7XG5cdHZhciBvc20gPSBleHBvcnRzLm9zbTtcblxuXG5cdHZhciBvc21GaWVsZCA9IG9zbS5GaWVsZDtcblx0b3NtLkZpZWxkID0gb3NtRmllbGQuZXh0ZW5kKHtcblx0XHQkbGF0OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzJykuZmluZCgnaW5wdXRbaWQkPVwiLWxhdFwiXScpO1xuXHRcdH0sXG5cdFx0JGxuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncycpLmZpbmQoJ2lucHV0W2lkJD1cIi1sbmdcIl0nKTtcblx0XHR9LFxuXHRcdCR6b29tOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzJykuZmluZCgnaW5wdXRbaWQkPVwiLXpvb21cIl0nKTtcblx0XHR9LFxuXHRcdCRyZXR1cm5Gb3JtYXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MnKS5maW5kKCdbZGF0YS1uYW1lPVwicmV0dXJuX2Zvcm1hdFwiXScpO1xuXHRcdH0sXG5cdFx0Z2V0TWFwRGF0YTpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRsYXQ6IHBhcnNlRmxvYXQodGhpcy4kbGF0KCkudmFsKCkgfHwgdGhpcy4kZWwuZGF0YSgpLm1hcExhdCApLFxuXHRcdFx0XHRsbmc6IHBhcnNlRmxvYXQodGhpcy4kbG5nKCkudmFsKCkgfHwgdGhpcy4kZWwuZGF0YSgpLm1hcExuZyApLFxuXHRcdFx0XHR6b29tOiBwYXJzZUludCh0aGlzLiR6b29tKCkudmFsKCkgfHwgdGhpcy4kZWwuZGF0YSgpLm1hcFpvb20gKSxcblx0XHRcdFx0bGF5ZXJzOiB0aGlzLiRlbC5kYXRhKCkubWFwTGF5ZXJzLFxuXHRcdFx0fTtcblx0XHRcdHJldHVybiBkYXRhO1xuXHRcdH0sXG5cdFx0aW5pdGlhbGl6ZTpmdW5jdGlvbihjb25mKSB7XG5cdFx0XHRvc21GaWVsZC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHR0aGlzLmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0dGhpcy5iaW5kTGlzdGVuZXIoKTtcblx0XHR9LFxuXHRcdHVwZGF0ZUlucHV0OiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJGxhdCgpLnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xhdCcpICk7XG5cdFx0XHR0aGlzLiRsbmcoKS52YWwoIHRoaXMubW9kZWwuZ2V0KCdsbmcnKSApO1xuXHRcdFx0dGhpcy4kem9vbSgpLnZhbCggdGhpcy5tb2RlbC5nZXQoJ3pvb20nKSApO1xuXHRcdH0sXG5cdFx0aW5pdExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYXllcnMgPSB0aGlzLm1vZGVsLmdldCgnbGF5ZXJzJyk7XG5cdFx0XHRvc21GaWVsZC5wcm90b3R5cGUuaW5pdExheWVycy5hcHBseSh0aGlzLGFyZ3VtZW50cyk7XG5cdFx0XHR2YXIgJGxheWVycyA9ICQoIHRoaXMubGF5ZXJzQ29udHJvbC5nZXRDb250YWluZXIoKSApLmZpbmQoJ1t0eXBlPVwicmFkaW9cIl0sW3R5cGU9XCJjaGVja2JveFwiXScpLFxuXHRcdFx0XHRuYW1lID0gdGhpcy4kem9vbSgpLmF0dHIoJ25hbWUnKS5yZXBsYWNlKCdbem9vbV0nLCdbbGF5ZXJzXVtdJyk7XG5cdFx0XHQkbGF5ZXJzLmVhY2goZnVuY3Rpb24oaSxlbCl7XG5cdFx0XHRcdHZhciAkZWwgPSAkKGVsKTtcblx0XHRcdFx0JChlbClcblx0XHRcdFx0XHQuYXR0ciggJ25hbWUnLCBuYW1lIClcblx0XHRcdFx0XHQuYXR0ciggJ3ZhbHVlJywgJGVsLm5leHQoKS50ZXh0KCkudHJpbSgpICk7XG5cdFx0XHR9KTtcblx0XHRcdC8vIGlmICggISAkbGF5ZXJzLmZpbmQoJzpjaGVja2VkJykubGVuZ3RoICkge1xuXHRcdFx0Ly8gXHR0aGlzLm1vZGVsLnNldCgnbGF5ZXJzJyxbICRsYXllcnMuZmlyc3QoKS5hdHRyKCd2YWx1ZScpIF0pO1xuXHRcdFx0Ly8gfVxuXG5cdFx0XHQvLyBzZWxlY3QgZGVmYXVsdCBsYXllciBpZiBub24gaXMgc2VsZWN0ZWRcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0YmluZElucHV0TGlzdGVuZXI6IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuJGxhdCgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2xhdCcsICQoZS50YXJnZXQpLnZhbCgpICk7XG5cdFx0XHRcdHNlbGYudXBkYXRlX21hcCgpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLnVuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLiRsbmcoKS5vbignY2hhbmdlJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoICdsbmcnLCAkKGUudGFyZ2V0KS52YWwoKSApO1xuXHRcdFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0XHRcdH0pXG5cdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51bmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy4kem9vbSgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ3pvb20nLCAkKGUudGFyZ2V0KS52YWwoKSApO1xuXHRcdFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0XHRcdH0pXG5cdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51bmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdGJpbmRNYXBMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bG5nJywgdGhpcy51cGRhdGVJbnB1dCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTp6b29tJywgdGhpcy51cGRhdGVJbnB1dCApO1xuXG5cdFx0fSxcblx0XHRiaW5kTGlzdGVuZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLiRyZXR1cm5Gb3JtYXQoKS5vbignY2hhbmdlJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciBjb25mID0gc2VsZi4kZWwuZGF0YSgnZWRpdG9yLWNvbmZpZycpLFxuXHRcdFx0XHRcdGxheWVycyA9IHNlbGYubW9kZWwuZ2V0KCdsYXllcnMnKTtcblx0XHRcdFx0Ly8gbWFwXG5cdFx0XHRcdHNlbGYucmVzZXRMYXllcnMoKTtcblx0XHRcdFx0aWYgKCAkKGUudGFyZ2V0KS52YWwoKSA9PT0gJ29zbScgKSB7XG5cdFx0XHRcdFx0Ly8gc2V0IHByb3ZpZGVyIHJlc3RyaWN0aW9uIHRvIG9zbSBwcm92aWRlcnNcblx0XHRcdFx0XHRjb25mLnJlc3RyaWN0X3Byb3ZpZGVycyA9IE9iamVjdC52YWx1ZXMoIGFyZy5vcHRpb25zLm9zbV9sYXllcnMgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyBzZXQgcHJvdmlkZXIgcmVzdHJpY3Rpb24gdG8gb3NtIHByb3ZpZGVyc1xuXHRcdFx0XHRcdGNvbmYucmVzdHJpY3RfcHJvdmlkZXJzID0gT2JqZWN0LnZhbHVlcyggYXJnLm9wdGlvbnMubGVhZmxldF9sYXllcnMgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRzZWxmLiRlbC5kYXRhKCAnZWRpdG9yLWNvbmZpZycsIGNvbmYgKTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xheWVycycsbGF5ZXJzKTtcblx0XHRcdFx0c2VsZi5pbml0TGF5ZXJzKCk7XG5cdFx0XHR9KTtcblxuXG5cdFx0fSxcblx0XHR1bmJpbmRJbnB1dExpc3RlbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJGxhdCgpLm9mZignY2hhbmdlJykub2ZmKCdmb2N1cycpLm9mZignYmx1cicpO1xuXHRcdFx0dGhpcy4kbG5nKCkub2ZmKCdjaGFuZ2UnKS5vZmYoJ2ZvY3VzJykub2ZmKCdibHVyJyk7XG5cdFx0XHR0aGlzLiR6b29tKCkub2ZmKCdjaGFuZ2UnKS5vZmYoJ2ZvY3VzJykub2ZmKCdibHVyJyk7XG5cdFx0fSxcblx0XHR1bmJpbmRNYXBMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnN0b3BMaXN0ZW5pbmcoIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF0JywgdGhpcy51cGRhdGVJbnB1dCApO1xuXHRcdFx0dGhpcy5zdG9wTGlzdGVuaW5nKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxuZycsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHRcdHRoaXMuc3RvcExpc3RlbmluZyggdGhpcy5tb2RlbCwgJ2NoYW5nZTp6b29tJywgdGhpcy51cGRhdGVJbnB1dCApO1xuXHRcdH0sXG5cdFx0dXBkYXRlX3Zpc2libGU6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHByZXYgPSB0aGlzLnZpc2libGU7XG5cdFx0XHRvc21GaWVsZC5wcm90b3R5cGUudXBkYXRlX3Zpc2libGUuYXBwbHkoIHRoaXMsIGFyZ3VtZW50cyApO1xuXHRcdFx0aWYgKCBwcmV2ICE9PSB0aGlzLnZpc2libGUgKSB7XG5cdFx0XHRcdGlmICggdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHRcdHRoaXMuYmluZElucHV0TGlzdGVuZXIoKVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMudW5iaW5kSW5wdXRMaXN0ZW5lcigpXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXHQvLyBhY2YuYWRkQWN0aW9uKCdyZW5kZXJfZmllbGRfb2JqZWN0JywgZnVuY3Rpb24oZmllbGQpe1xuXHQvLyBcdGlmICggJ29wZW5fc3RyZWV0X21hcCcgPT09IGZpZWxkLmRhdGEudHlwZSApIHtcblx0Ly8gXG5cdC8vIFx0XHQvLyQuYWNmX2xlYWZsZXQoKTtcblx0Ly8gXHR9XG5cdC8vIH0pO1xuXG59KSggalF1ZXJ5LCBhY2Zfb3NtX2FkbWluLCB3aW5kb3cgKTtcbiJdfQ==
