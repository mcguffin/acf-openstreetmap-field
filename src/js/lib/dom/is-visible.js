
const isVisible = el => {
	return !!( el.offsetWidth || el.offsetHeight || el.getClientRects().length );
}

module.exports = { isVisible }