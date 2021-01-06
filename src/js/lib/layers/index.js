
import { LayerType, layerTypes } from 'layers/layer-type';
import LayerTypeProvider from 'layers/layer-type-provider';
import LayerTypeMarkers from 'layers/layer-type-markers';




module.exports = { 
	factory: ( config ) => {
		const { type } = config
		const constr = !! layerTypes[type] ? layerTypes[type] : LayerType
		return new constr( config )
	}
}