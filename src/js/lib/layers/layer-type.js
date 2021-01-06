const layerTypes = {}

const registerLayerType = ( type, constructor ) => {
	layerTypes[type] = constructor
}

class LayerType {
	default = {}
	#config = {};
	#map;

	get map() {
		return this.#map
	}
	set map( map ) {
		this.#map = map
		this.setupMap()
	}

	get config() {
		return this.#config
	}


	constructor(config) {
		this.#config = Object.assign( this.default, config )
		// like php magic getter
		Object.keys(this.#config).forEach( k => Object.defineProperty( this, k, {
    		get : function () {
        		return this.#config[k];
    		}
		}) );
	}
	
	/**
	 *	Runs when a map has been assigned to this layer
	 */
	setupMap() {}
}

export { LayerType, layerTypes, registerLayerType }