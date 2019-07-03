/*
Builds a github release from current version number
*/

const wp = require('./lib/wp-release.js');
const fs = require('fs');
const glob = require('glob');
const git = require('simple-git')('.');
const exec = require('child_process');
const https = require('https');

const package = require('../../package.json');

let branch;
let repo;
let token;

const make_remote_release = (url,data,token) => {

	return new Promise( resolve => {

		let resp_data = '';
		let req = https.request( url, {
			// host: 'api.github.com',
			// port: 443,
			// path: `repos/${repo}/releases`,
			method: 'POST',
			headers: {
//				'Authorization' : 'token ${token}',
				'User-Agent' : 'Nodejs'
			}
		}, resp => {
			resp.setEncoding('utf8');
			resp.on('data',data => {
				resp_data += data;
			});
			resp.on('end',() => {
				resolve( JSON.parse(resp_data) );
			})
		});
		req.write( JSON.stringify( data, null ) )
		req.end()

	}, err => {
		throw(err);
	} )
}

git
	.listRemote(['--get-url'], (err,res) => {
		repo = res.match(/^git@github\.com:(.+)\.git/s)[1];
	})
	.branch( (err,res) => {
		branch = res.current;
	})
	.exec( () => {
		//
		let whoami = exec.execSync('whoami',{encoding:'utf8'}).replace(/\n$/,'');
		token = exec.execSync(`security find-generic-password -a ${whoami} -s GithubAccessToken -w`,{encoding:'utf8'}).replace(/\n$/,'');
	} )
	.push()
	.exec(() => {
		const data = {
			version:		package.version,
			branch:			branch,
			require_wp:		wp.read_header_tag('readme.txt', 'Requires at least' ),
			max_wp:			wp.read_header_tag('readme.txt', 'Tested up to' ),
			require_php:	wp.read_header_tag('readme.txt', 'Requires PHP' ),
		}

		const req_data = {
			tag_name:			package.version,
			target_commitish:	branch,
			name:				package.version,
			body:				`Release ${data.version} from ${data.branch}

Requires at least: ${data.require_wp}
Tested up to: ${data.max_wp}
Requires PHP: ${data.require_php}`,
			draft:				false,
			prerelease:			false
		}
		const username = repo.split('/')[0];
		const api_url = `https://${username}:${token}@api.github.com/repos/${repo}/releases`
		console.log(api_url)
		let resp_data = make_remote_release( api_url, req_data, token )
			.then(console.log)
	})

/*
Release pipeline:

A. Sources (Always)
`npm run release [major|minor|patch]`
 - [x] Build i18n => npm run i18n
 - [ ] Increment versions (readme.txt, package.json, style.css, src/scss/style.scss, main plugin file, languages/xxx.pot)
 - [ ] Build assets => $ gulp build
 - [ ] commit -m "release x.y.z"
 - [ ] push
 - [ ] create release via http api

B. Release to wp.org
 - clone svn to tmp/
 - download to trunk/
 - copy assets from .wordpress.org/ > tmp/svn-repo/assets/
 - add/rm/...
 - svn cp trunk/ tags/x.y.z/
 - svn ci -m "release x.y.z"
 - rm -rf tmp/

*/
