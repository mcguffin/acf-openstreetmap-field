<?php

if ( ! isset( $proxy_config ) ) {
	die('No proxy config');
}
if ( ! preg_match( '/\/([a-z0-9\.]+)\/(\d+)\/(\d+)\/(\d+)(@2x)?$/i', $_SERVER['REQUEST_URI'], $matches ) ) {
	return;
}

@list($garbage, $provider, $z, $x, $y, $r ) = $matches;

if ( ! isset( $proxy_config[$provider] ) ) {
	http_response_code(404);
	exit();
}

// read from config
$base_url   = $proxy_config[ $provider ][ 'base_url' ];
$subdomains = $proxy_config[ $provider ][ 'subdomains' ];

$s = $subdomains[ rand( 0, strlen( $subdomains ) - 1 ) ];

$url = str_replace(
	[ '{z}', '{x}', '{y}', '{s}', '{r}' ],
	[ $z, $x, $y, $s, $r ],
	$base_url
);

// response headers to forward
$send_response_headers = [
	'Expires',
	'Cache-Control',
	'ETag',
	'Date',
	'Content-Type',
];
$request_headers = [];

// get http headers from user
foreach ( [
	'User-Agent',
	'Accept',
	'Accept-Language',
	'Accept-Encoding',
	'Referer',
	'Sec-GPC',
	'Sec-Fetch-Dest',
	'Sec-Fetch-Mode',
	'Sec-Fetch-Site',
	'Priority',
	'Pragma',
	'Cache-Control',
] as $header ) {
	$hdr = 'HTTP_'.str_replace( '-', '_', strtoupper( $header ) );
	if ( isset( $_SERVER[ $hdr ] ) ) {
		$request_headers[] = "{$header}: ".$_SERVER[ $hdr ];
	}
}

// var_dump($_SERVER);exit();
$ctx = stream_context_create(['http' => [
	'method'        => 'GET',
	'header'        => implode("\r\n", $request_headers ),
]]);

$response_reg = '/(' . implode( '|', $send_response_headers ) . '):/';

$contents = file_get_contents( $url, false, $ctx );

foreach ( $http_response_header as $response_header ) {
	// TODO: handling response errors
	if ( preg_match( $response_reg, $response_header ) ) {
		header( $response_header );
	}
}
echo $contents;
