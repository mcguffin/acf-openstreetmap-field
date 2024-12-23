import {MarkerData} from 'media/models/marker-data'

const MarkerCollection = Backbone.Collection.extend({
	model: MarkerData
});

export { MarkerCollection }
