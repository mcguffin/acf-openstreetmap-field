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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFjZi1maWVsZC1ncm91cC1vc20uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhY2YtZmllbGQtZ3JvdXAtb3NtLmpzIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCAkLCBhcmcsIGV4cG9ydHMgKXtcblx0dmFyIG9zbSA9IGV4cG9ydHMub3NtO1xuXG5cblx0dmFyIG9zbUZpZWxkID0gb3NtLkZpZWxkO1xuXHRvc20uRmllbGQgPSBvc21GaWVsZC5leHRlbmQoe1xuXHRcdCRsYXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHRoaXMuJGVsLmNsb3Nlc3QoJy5hY2YtZmllbGQtc2V0dGluZ3MnKS5maW5kKCdpbnB1dFtpZCQ9XCItY2VudGVyX2xhdFwiXScpO1xuXHRcdH0sXG5cdFx0JGxuZzogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncycpLmZpbmQoJ2lucHV0W2lkJD1cIi1jZW50ZXJfbG5nXCJdJyk7XG5cdFx0fSxcblx0XHQkem9vbTogZnVuY3Rpb24oKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy4kZWwuY2xvc2VzdCgnLmFjZi1maWVsZC1zZXR0aW5ncycpLmZpbmQoJ2lucHV0W2lkJD1cIi16b29tXCJdJyk7XG5cdFx0fSxcblx0XHQkcmV0dXJuRm9ybWF0OiBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiB0aGlzLiRlbC5jbG9zZXN0KCcuYWNmLWZpZWxkLXNldHRpbmdzJykuZmluZCgnW2RhdGEtbmFtZT1cInJldHVybl9mb3JtYXRcIl0nKTtcblx0XHR9LFxuXHRcdGdldE1hcERhdGE6ZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdFx0bGF0OiBwYXJzZUZsb2F0KHRoaXMuJGxhdCgpLnZhbCgpIHx8IHRoaXMuJGVsLmRhdGEoKS5tYXBMYXQgKSxcblx0XHRcdFx0bG5nOiBwYXJzZUZsb2F0KHRoaXMuJGxuZygpLnZhbCgpIHx8IHRoaXMuJGVsLmRhdGEoKS5tYXBMbmcgKSxcblx0XHRcdFx0em9vbTogcGFyc2VJbnQodGhpcy4kem9vbSgpLnZhbCgpIHx8IHRoaXMuJGVsLmRhdGEoKS5tYXBab29tICksXG5cdFx0XHRcdGxheWVyczogdGhpcy4kZWwuZGF0YSgpLm1hcExheWVycyxcblx0XHRcdH07XG5cdFx0XHRyZXR1cm4gZGF0YTtcblx0XHR9LFxuXHRcdGluaXRpYWxpemU6ZnVuY3Rpb24oY29uZikge1xuXG5cdFx0XHRvc21GaWVsZC5wcm90b3R5cGUuaW5pdGlhbGl6ZS5hcHBseSggdGhpcywgWyBjb25mIF0gKTtcblx0XHRcdHRoaXMuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR0aGlzLmJpbmRMaXN0ZW5lcigpO1xuXHRcdH0sXG5cdFx0dXBkYXRlSW5wdXQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy4kbGF0KCkudmFsKCB0aGlzLm1vZGVsLmdldCgnbGF0JykgKS50cmlnZ2VyKCdjaGFuZ2UnKTtcblx0XHRcdHRoaXMuJGxuZygpLnZhbCggdGhpcy5tb2RlbC5nZXQoJ2xuZycpICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0XHR0aGlzLiR6b29tKCkudmFsKCB0aGlzLm1vZGVsLmdldCgnem9vbScpICkudHJpZ2dlcignY2hhbmdlJyk7XG5cdFx0fSxcblx0XHRpbml0TGF5ZXJzOmZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGxheWVycyA9IHRoaXMubW9kZWwuZ2V0KCdsYXllcnMnKTtcblxuXHRcdFx0dGhpcy5jb25maWcucmVzdHJpY3RfcHJvdmlkZXJzID0gdGhpcy4kcmV0dXJuRm9ybWF0KCkuZmluZCgnOmNoZWNrZWQnKS52YWwoKSA9PT0gJ29zbScgXG5cdFx0XHRcdD8gT2JqZWN0LnZhbHVlcyggYXJnLm9wdGlvbnMub3NtX2xheWVycyApXG5cdFx0XHRcdDogT2JqZWN0LnZhbHVlcyggYXJnLm9wdGlvbnMubGVhZmxldF9sYXllcnMgKTtcblxuXHRcdFx0b3NtRmllbGQucHJvdG90eXBlLmluaXRMYXllcnMuYXBwbHkodGhpcyxhcmd1bWVudHMpO1xuXG5cdFx0XHR2YXIgJGxheWVycyA9ICQoIHRoaXMubGF5ZXJzQ29udHJvbC5nZXRDb250YWluZXIoKSApLmZpbmQoJ1t0eXBlPVwicmFkaW9cIl0sW3R5cGU9XCJjaGVja2JveFwiXScpLFxuXHRcdFx0XHRuYW1lID0gdGhpcy4kem9vbSgpLmF0dHIoJ25hbWUnKS5yZXBsYWNlKCdbem9vbV0nLCdbbGF5ZXJzXVtdJyk7XG5cblx0XHRcdCRsYXllcnMuZWFjaChmdW5jdGlvbihpLGVsKXtcblx0XHRcdFx0dmFyICRlbCA9ICQoZWwpO1xuXHRcdFx0XHQkKGVsKVxuXHRcdFx0XHRcdC5hdHRyKCAnbmFtZScsIG5hbWUgKVxuXHRcdFx0XHRcdC5hdHRyKCAndmFsdWUnLCAkZWwubmV4dCgpLnRleHQoKS50cmltKCkgKTtcblx0XHRcdH0pO1xuXHRcdFx0Ly8gaWYgKCAhICRsYXllcnMuZmluZCgnOmNoZWNrZWQnKS5sZW5ndGggKSB7XG5cdFx0XHQvLyBcdHRoaXMubW9kZWwuc2V0KCdsYXllcnMnLFsgJGxheWVycy5maXJzdCgpLmF0dHIoJ3ZhbHVlJykgXSk7XG5cdFx0XHQvLyB9XG5cblx0XHRcdC8vIHNlbGVjdCBkZWZhdWx0IGxheWVyIGlmIG5vbiBpcyBzZWxlY3RlZFxuXHRcdFx0cmV0dXJuIHRoaXM7XG5cdFx0fSxcblx0XHRiaW5kSW5wdXRMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cblx0XHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdFx0dGhpcy4kbGF0KCkub24oJ2NoYW5nZScsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnbGF0JywgJChlLnRhcmdldCkudmFsKCkgKTtcblx0XHRcdFx0c2VsZi51cGRhdGVfbWFwKCk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdmb2N1cycsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYudW5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdH0pXG5cdFx0XHQub24oJ2JsdXInLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLmJpbmRNYXBMaXN0ZW5lcigpO1xuXHRcdFx0fSk7XG5cblx0XHRcdHRoaXMuJGxuZygpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLm1vZGVsLnNldCggJ2xuZycsICQoZS50YXJnZXQpLnZhbCgpICk7XG5cdFx0XHRcdHNlbGYudXBkYXRlX21hcCgpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLnVuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdH0pO1xuXG5cdFx0XHR0aGlzLiR6b29tKCkub24oJ2NoYW5nZScsZnVuY3Rpb24oZSl7XG5cdFx0XHRcdHNlbGYubW9kZWwuc2V0KCAnem9vbScsICQoZS50YXJnZXQpLnZhbCgpICk7XG5cdFx0XHRcdHNlbGYudXBkYXRlX21hcCgpO1xuXHRcdFx0fSlcblx0XHRcdC5vbignZm9jdXMnLGZ1bmN0aW9uKGUpe1xuXHRcdFx0XHRzZWxmLnVuYmluZE1hcExpc3RlbmVyKCk7XG5cdFx0XHR9KVxuXHRcdFx0Lm9uKCdibHVyJyxmdW5jdGlvbihlKXtcblx0XHRcdFx0c2VsZi5iaW5kTWFwTGlzdGVuZXIoKTtcblx0XHRcdH0pO1xuXHRcdH0sXG5cdFx0YmluZE1hcExpc3RlbmVyOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMubGlzdGVuVG8oIHRoaXMubW9kZWwsICdjaGFuZ2U6bGF0JywgdGhpcy51cGRhdGVJbnB1dCApO1xuXHRcdFx0dGhpcy5saXN0ZW5UbyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsbmcnLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cdFx0XHR0aGlzLmxpc3RlblRvKCB0aGlzLm1vZGVsLCAnY2hhbmdlOnpvb20nLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cblx0XHR9LFxuXHRcdGJpbmRMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cblx0XHRcdHRoaXMuJHJldHVybkZvcm1hdCgpLm9uKCdjaGFuZ2UnLGZ1bmN0aW9uKGUpIHtcblx0XHRcdFx0dmFyIGxheWVycyA9IHNlbGYubW9kZWwuZ2V0KCdsYXllcnMnKTtcblx0XHRcdFx0Ly8gbWFwXG5cdFx0XHRcdHNlbGYucmVzZXRMYXllcnMoKTtcblx0XHRcdFx0c2VsZi5tb2RlbC5zZXQoJ2xheWVycycsbGF5ZXJzKTtcblx0XHRcdFx0c2VsZi5pbml0TGF5ZXJzKCk7XG5cdFx0XHR9KTtcblxuXHRcdH0sXG5cdFx0dW5iaW5kSW5wdXRMaXN0ZW5lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLiRsYXQoKS5vZmYoJ2NoYW5nZScpLm9mZignZm9jdXMnKS5vZmYoJ2JsdXInKTtcblx0XHRcdHRoaXMuJGxuZygpLm9mZignY2hhbmdlJykub2ZmKCdmb2N1cycpLm9mZignYmx1cicpO1xuXHRcdFx0dGhpcy4kem9vbSgpLm9mZignY2hhbmdlJykub2ZmKCdmb2N1cycpLm9mZignYmx1cicpO1xuXHRcdH0sXG5cdFx0dW5iaW5kTWFwTGlzdGVuZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5zdG9wTGlzdGVuaW5nKCB0aGlzLm1vZGVsLCAnY2hhbmdlOmxhdCcsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHRcdHRoaXMuc3RvcExpc3RlbmluZyggdGhpcy5tb2RlbCwgJ2NoYW5nZTpsbmcnLCB0aGlzLnVwZGF0ZUlucHV0ICk7XG5cdFx0XHR0aGlzLnN0b3BMaXN0ZW5pbmcoIHRoaXMubW9kZWwsICdjaGFuZ2U6em9vbScsIHRoaXMudXBkYXRlSW5wdXQgKTtcblx0XHR9LFxuXHRcdHVwZGF0ZV92aXNpYmxlOiBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBwcmV2ID0gdGhpcy52aXNpYmxlO1xuXHRcdFx0b3NtRmllbGQucHJvdG90eXBlLnVwZGF0ZV92aXNpYmxlLmFwcGx5KCB0aGlzLCBhcmd1bWVudHMgKTtcblx0XHRcdGlmICggcHJldiAhPT0gdGhpcy52aXNpYmxlICkge1xuXHRcdFx0XHRpZiAoIHRoaXMudmlzaWJsZSApIHtcblx0XHRcdFx0XHR0aGlzLmJpbmRJbnB1dExpc3RlbmVyKClcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aGlzLnVuYmluZElucHV0TGlzdGVuZXIoKVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblx0Ly8gYWNmLmFkZEFjdGlvbigncmVuZGVyX2ZpZWxkX29iamVjdCcsIGZ1bmN0aW9uKGZpZWxkKXtcblx0Ly8gXHRpZiAoICdvcGVuX3N0cmVldF9tYXAnID09PSBmaWVsZC5kYXRhLnR5cGUgKSB7XG5cdC8vIFxuXHQvLyBcdFx0Ly8kLmFjZl9sZWFmbGV0KCk7XG5cdC8vIFx0fVxuXHQvLyB9KTtcblxufSkoIGpRdWVyeSwgYWNmX29zbV9hZG1pbiwgd2luZG93ICk7XG4iXX0=
