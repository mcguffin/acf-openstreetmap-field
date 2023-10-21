import { GSModel, intGetter, intSetter, fixedFloatGetter, fixedFloatSetter, accuracy } from 'media/models/gs-model'
import MarkerCollection from 'media/models/marker-collection'

const MapData = GSModel.extend({
	getters: {
		lat: fixedFloatGetter( 'lat', accuracy ),
		lng: fixedFloatGetter( 'lng', accuracy ),
		zoom: intGetter('zoom'),
	},
	setters: {
		lat: fixedFloatSetter( 'lat', accuracy ),
		lng: fixedFloatSetter( 'lng', accuracy ),
		zoom: intSetter('zoom'),
	},
	initialize:function(o) {
		this.set( 'markers', new MarkerCollection(o.markers) );
		GSModel.prototype.initialize.apply( this, arguments )
	}
});

module.exports = MapData
