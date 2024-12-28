// translate map zoom level
const mapZoomLevel = zoom => {
	/*
	Map Nominatim detail levels vs. Plugin Detail levels
	|                 NOMINATIM                     |  ACF OpenStreetMap Field |
	|-----------------------------------------------|--------------------------|
	|  zoom | Detail level (DE) | Detail level (US) |    zoom | Detail level   |
	|-------|-------------------|-------------------|---------|----------------|
	|     0 | country           | country           |       0 | country        |
	|     1 | country           | country           |       1 | country        |
	|     2 | country           | country           |       2 | country        |
	|     3 | country           | country           |       3 | country        |
	|     4 | country           | country           |       4 | country        |
	|     5 | state             | state             |       5 | state          |
	|     6 | state             | state             |       6 | state          |
	|     7 | state             | state             |       8 | county         |
	|     8 | county            | city              |       8 | county         |
	|     9 | county            | city              |       9 | county         |
	|    10 | village           | city              |      10 | village/suburb |
	|    11 | village           | city              |      11 | village/suburb |
	|    12 | village           | city              |      12 | village/suburb |
	|    13 | village           | suburb            |      13 | village/suburb |
	|    14 | postcode          | neighbourhood     |      16 | village/suburb |
	|    15 | postcode          | neighbourhood     |      16 | village/suburb |
	|    16 | road (major)      | road (major)      |      18 | building       |
	|    17 | road (+minor)     | road (+minor)     |      18 | building       |
	|    18 | building          | building          |      18 | building       |
	*/
	const maping = {
		7:  8, // state => country
		14: 16, // postcode/neighbourhood => major road
		15: 16, // postcode/neighbourhood => major road
		16: 18, // major road => building
		17: 18, // minor road => building
	}
	return maping[zoom] ?? zoom
}

export { mapZoomLevel }
