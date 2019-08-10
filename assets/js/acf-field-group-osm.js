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

			osmField.prototype.initialize.apply( this, [ conf ] );
			this.bindMapListener();
			this.bindListener();
		},
		updateInput: function() {
			this.$lat().val( this.model.get('lat') ).trigger('change');
			this.$lng().val( this.model.get('lng') ).trigger('change');
			this.$zoom().val( this.model.get('zoom') ).trigger('change');
		},
		initLayers:function() {
			var layers = this.model.get('layers');

			this.config.restrict_providers = this.$returnFormat().find(':checked').val() === 'osm' 
				? Object.values( arg.options.osm_layers )
				: Object.values( arg.options.leaflet_layers );

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
				var layers = self.model.get('layers');
				// map
				self.resetLayers();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1maWVsZC1ncm91cC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2YtZmllbGQtZ3JvdXAtb3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCAkLCBhcmcsIGV4cG9ydHMgKXtcblx0dmFyIG9zbSA9IGV4cG9ydHMub3NtO1xuXG5cblx0dmFyIG9zbUZpZWxkID0gb3NtLkZpZWxkO1xuXHRvc20uRmllbGQgPSBvc21GaWVsZC5leHRlbmQoe1xuXHRcdCRsYXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MnKS5maW5kKCdpbnB1dFtpZCQ9XCItbGF0XCJdJyk7XG5cdFx0fSxcblx0XHQkbG5nOiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzJykuZmluZCgnaW5wdXRbaWQkPVwiLWxuZ1wiXScpO1xuXHRcdH0sXG5cdFx0JHpvb206IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MnKS5maW5kKCdpbnB1dFtpZCQ9XCItem9vbVwiXScpO1xuXHRcdH0sXG5cdFx0JHJldHVybkZvcm1hdDogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncycpLmZpbmQoJ1tkYXRhLW5hbWU9XCJyZXR1cm5fZm9ybWF0XCJdJyk7XG5cdFx0fSxcblx0XHRnZXRNYXBEYXRhOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGRhdGEgPSB7XG5cdFx0XHRcdGxhdDogcGFyc2VGbG9hdCh0aGlzLiRsYXQoKS52YWwoKSB8fCB0aGlzLiRlbC5kYXRhKCkubWFwTGF0ICksXG5cdFx0XHRcdGxuZzogcGFyc2VGbG9hdCh0aGlzLiRsbmcoKS52YWwoKSB8fCB0aGlzLiRlbC5kYXRhKCkubWFwTG5nICksXG5cdFx0XHRcdHpvb206IHBhcnNlSW50KHRoaXMuJHpvb20oKS52YWwoKSB8fCB0aGlzLiRlbC5kYXRhKCkubWFwWm9vbSApLFxuXHRcdFx0XHRsYXllcnM6IHRoaXMuJGVsLmRhdGEoKS5tYXBMYXllcnMsXG5cdFx0XHR9O1xuXHRcdFx0cmV0dXJuIGRhdGE7XG5cdFx0fSxcblx0XHRpbml0aWFsaXplOmZ1bmN0aW9uKGNvbmYpIHtcblxuXHRcdFx0b3NtRmllbGQucHJvdG90eXBlLmluaXRpYWxpemUuYXBwbHkoIHRoaXMsIFsgY29uZiBdICk7XG5cdFx0XHR0aGlzLmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0dGhpcy5iaW5kTGlzdGVuZXIoKTtcblx0XHR9LFxuXHRcdHVwZGF0ZUlucHV0OiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuJGxhdCgpLnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xhdCcpICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHR0aGlzLiRsbmcoKS52YWwoIHRoaXMubW9kZWwuZ2V0KCdsbmcnKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdFx0dGhpcy4kem9vbSgpLnZhbCggdGhpcy5tb2RlbC5nZXQoJ3pvb20nKSApLnRyaWdnZXIoJ2NoYW5nZScpO1xuXHRcdH0sXG5cdFx0aW5pdExheWVyczpmdW5jdGlvbigpIHtcblx0XHRcdHZhciBsYXllcnMgPSB0aGlzLm1vZGVsLmdldCgnbGF5ZXJzJyk7XG5cblx0XHRcdHRoaXMuY29uZmlnLnJlc3RyaWN0X3Byb3ZpZGVycyA9IHRoaXMuJHJldHVybkZvcm1hdCgpLmZpbmQoJzpjaGVja2VkJykudmFsKCkgPT09ICdvc20nIFxuXHRcdFx0XHQ/IE9iamVjdC52YWx1ZXMoIGFyZy5vcHRpb25zLm9zbV9sYXllcnMgKVxuXHRcdFx0XHQ6IE9iamVjdC52YWx1ZXMoIGFyZy5vcHRpb25zLmxlYWZsZXRfbGF5ZXJzICk7XG5cblx0XHRcdG9zbUZpZWxkLnByb3RvdHlwZS5pbml0TGF5ZXJzLmFwcGx5KHRoaXMsYXJndW1lbnRzKTtcblxuXHRcdFx0dmFyICRsYXllcnMgPSAkKCB0aGlzLmxheWVyc0NvbnRyb2wuZ2V0Q29udGFpbmVyKCkgKS5maW5kKCdbdHlwZT1cInJhZGlvXCJdLFt0eXBlPVwiY2hlY2tib3hcIl0nKSxcblx0XHRcdFx0bmFtZSA9IHRoaXMuJHpvb20oKS5hdHRyKCduYW1lJykucmVwbGFjZSgnW3pvb21dJywnW2xheWVyc11bXScpO1xuXG5cdFx0XHQkbGF5ZXJzLmVhY2goZnVuY3Rpb24oaSxlbCl7XG5cdFx0XHRcdHZhciAkZWwgPSAkKGVsKTtcblx0XHRcdFx0JChlbClcblx0XHRcdFx0XHQuYXR0ciggJ25hbWUnLCBuYW1lIClcblx0XHRcdFx0XHQuYXR0ciggJ3ZhbHVlJywgJGVsLm5leHQoKS50ZXh0KCkudHJpbSgpICk7XG5cdFx0XHR9KTtcblx0XHRcdC8vIGlmICggISAkbGF5ZXJzLmZpbmQoJzpjaGVja2VkJykubGVuZ3RoICkge1xuXHRcdFx0Ly8gXHR0aGlzLm1vZGVsLnNldCgnbGF5ZXJzJyxbICRsYXllcnMuZmlyc3QoKS5hdHRyKCd2YWx1ZScpIF0pO1xuXHRcdFx0Ly8gfVxuXG5cdFx0XHQvLyBzZWxlY3QgZGVmYXVsdCBsYXllciBpZiBub24gaXMgc2VsZWN0ZWRcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH0sXG5cdFx0YmluZElucHV0TGlzdGVuZXI6IGZ1bmN0aW9uKCkge1xuXG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuJGxhdCgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2xhdCcsICQoZS50YXJnZXQpLnZhbCgpICk7XG5cdFx0XHRcdHNlbGYudXBkYXRlX21hcCgpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLnVuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLiRsbmcoKS5vbignY2hhbmdlJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoICdsbmcnLCAkKGUudGFyZ2V0KS52YWwoKSApO1xuXHRcdFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0XHRcdH0pXG5cdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51bmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KTtcblxuXHRcdFx0dGhpcy4kem9vbSgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ3pvb20nLCAkKGUudGFyZ2V0KS52YWwoKSApO1xuXHRcdFx0XHRzZWxmLnVwZGF0ZV9tYXAoKTtcblx0XHRcdH0pXG5cdFx0XHQub24oJ2ZvY3VzJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi51bmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignYmx1cicsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KTtcblx0XHR9LFxuXHRcdGJpbmRNYXBMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bG5nJywgdGhpcy51cGRhdGVJbnB1dCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTp6b29tJywgdGhpcy51cGRhdGVJbnB1dCApO1xuXG5cdFx0fSxcblx0XHRiaW5kTGlzdGVuZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0XHR0aGlzLiRyZXR1cm5Gb3JtYXQoKS5vbignY2hhbmdlJyxmdW5jdGlvbihlKSB7XG5cdFx0XHRcdHZhciBsYXllcnMgPSBzZWxmLm1vZGVsLmdldCgnbGF5ZXJzJyk7XG5cdFx0XHRcdC8vIG1hcFxuXHRcdFx0XHRzZWxmLnJlc2V0TGF5ZXJzKCk7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCdsYXllcnMnLGxheWVycyk7XG5cdFx0XHRcdHNlbGYuaW5pdExheWVycygpO1xuXHRcdFx0fSk7XG5cblx0XHR9LFxuXHRcdHVuYmluZElucHV0TGlzdGVuZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kbGF0KCkub2ZmKCdjaGFuZ2UnKS5vZmYoJ2ZvY3VzJykub2ZmKCdibHVyJyk7XG5cdFx0XHR0aGlzLiRsbmcoKS5vZmYoJ2NoYW5nZScpLm9mZignZm9jdXMnKS5vZmYoJ2JsdXInKTtcblx0XHRcdHRoaXMuJHpvb20oKS5vZmYoJ2NoYW5nZScpLm9mZignZm9jdXMnKS5vZmYoJ2JsdXInKTtcblx0XHR9LFxuXHRcdHVuYmluZE1hcExpc3RlbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuc3RvcExpc3RlbmluZyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsYXQnLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cdFx0XHR0aGlzLnN0b3BMaXN0ZW5pbmcoIHRoaXMubW9kZWwsICdjaGFuZ2U6bG5nJywgdGhpcy51cGRhdGVJbnB1dCApO1xuXHRcdFx0dGhpcy5zdG9wTGlzdGVuaW5nKCB0aGlzLm1vZGVsLCAnY2hhbmdlOnpvb20nLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cdFx0fSxcblx0XHR1cGRhdGVfdmlzaWJsZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcHJldiA9IHRoaXMudmlzaWJsZTtcblx0XHRcdG9zbUZpZWxkLnByb3RvdHlwZS51cGRhdGVfdmlzaWJsZS5hcHBseSggdGhpcywgYXJndW1lbnRzICk7XG5cdFx0XHRpZiAoIHByZXYgIT09IHRoaXMudmlzaWJsZSApIHtcblx0XHRcdFx0aWYgKCB0aGlzLnZpc2libGUgKSB7XG5cdFx0XHRcdFx0dGhpcy5iaW5kSW5wdXRMaXN0ZW5lcigpXG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy51bmJpbmRJbnB1dExpc3RlbmVyKClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cdC8vIGFjZi5hZGRBY3Rpb24oJ3JlbmRlcl9maWVsZF9vYmplY3QnLCBmdW5jdGlvbihmaWVsZCl7XG5cdC8vIFx0aWYgKCAnb3Blbl9zdHJlZXRfbWFwJyA9PT0gZmllbGQuZGF0YS50eXBlICkge1xuXHQvLyBcblx0Ly8gXHRcdC8vJC5hY2ZfbGVhZmxldCgpO1xuXHQvLyBcdH1cblx0Ly8gfSk7XG5cbn0pKCBqUXVlcnksIGFjZl9vc21fYWRtaW4sIHdpbmRvdyApO1xuIl19
