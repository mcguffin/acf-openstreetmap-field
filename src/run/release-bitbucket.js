
const git = require('simple-git')('.');
const package = require('../../package.json');


// shell( 'git tag %s' % new_version, check = True )
// shell( 'git push origin --tags', check = True )

git.addTag(package.version).pushTags('origin')
