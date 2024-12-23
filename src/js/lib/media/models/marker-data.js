import { GSModel, intGetter, intSetter, fixedFloatGetter, fixedFloatSetter, accuracy } from 'media/models/gs-model'

const MarkerData = GSModel.extend({
	getters: {
		lat: fixedFloatGetter( 'lat', accuracy ),
		lng: fixedFloatGetter( 'lng', accuracy ),
	},
	setters: {
		lat: fixedFloatSetter( 'lat', accuracy ),
		lng: fixedFloatSetter( 'lng', accuracy ),
	},
	isDefaultLabel:function() {
		return this.get('label') === this.get('default_label');
	}
});

export { MarkerData }
