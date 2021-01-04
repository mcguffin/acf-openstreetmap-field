const layerTypes = {}

const registerLayerType = ( type, constructor ) => {
	layerTypes[type] = constructor
}

class LayerType {
	#config;
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
		this.#config = config
	}
	
	/**
	 *	Runs when a map has been assigned to this layer
	 */
	setupMap() {}
}

export { LayerType, layerTypes, registerLayerType }