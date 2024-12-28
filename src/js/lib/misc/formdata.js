const splitKey = key => key.split('[').map( s => s.replace(/\]$/, ''))

const formToObject = form => {

	const object = {}
	const formData = new FormData(form)

	formData.entries().forEach( ([key,value]) => {
		const parts = splitKey(key)
		let current = object, previous, previousPart
		parts.map( (part,i) => {
			// endpoint
			if ( i === parts.length - 1 ) {
				if ( '' === part ) {
					if ( Array !== current.constructor ) {
						console.log(Array !== current.constructor)
						previous[previousPart] = []
					}
					previous[previousPart].push(value)
				} else {
					current[part] = value
				}
				return
			}
			if ( ! current[part] ) {
				current[part] = {}
			}
			previous = current
			previousPart = part
			current  = current[part]
		})
	})
	return object
}

export { formToObject }
