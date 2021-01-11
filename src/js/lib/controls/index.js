
import { ControlType, controlTypes } from 'controls/control-type';
import ControlTypeZoompan from 'controls/control-type-zoompan';
import ControlTypeProviders from 'controls/control-type-providers';
import ControlTypeMarkers from 'controls/control-type-markers';
import ControlTypeLocator from 'controls/control-type-locator';
import ControlTypeResetLayers from 'controls/control-type-reset-layers';





module.exports = { 
	factory: ( { type, config, map, cb } ) => {
		const constr = !! controlTypes[type] ? controlTypes[type] : ControlType
		return Object.assign( new constr( config, map, cb ), { type } )
	}
}