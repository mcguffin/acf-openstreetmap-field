const controlTypes = {}

const registerControlType = ( type, constructor ) => {
	controlTypes[type] = constructor
}

class ControlType {
	#config;
	#map;
	#cb;

	get cb() {
		return this.#cb
	}
	get map() {
		return this.#map
	}

	get config() {
		return this.#config
	}

	get value() {
		return {}
	}
	
	mutateMap( mapData ) {
		return mapData
	}
	
	// update() {
	// 	Object.assign( this.mapData, this.value )
	// }
	// arg: mapData 
	constructor( config, map, cb ) {
		this.#config = config
		this.#map = map
		this.#cb = cb
		this.setupControl()
	}

	setupControl() {}

	resetControl() {}

}

export { ControlType, controlTypes, registerControlType }