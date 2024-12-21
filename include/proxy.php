<?php

if ( ! isset( $proxy_config ) ) {
	die('No proxy config');
}
// match pattern /<provider>/<z>/<x>/<y><r>
if ( ! preg_match( '/\/([a-z0-9\.]+)\/(\d+)\/(\d+)\/(\d+)(@2x)?$/i', $_SERVER['REQUEST_URI'], $matches ) ) {
	http_response_code( 400 );
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

// fill vars
$url = str_replace(
	[ '{z}', '{x}', '{y}', '{s}', '{r}' ],
	[ $z, $x, $y, $s, $r ],
	$base_url
);

// response headers being forwarded
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

/** @var int $http_status assume success */
$http_status    = 200;

/** @var int $request_status 1: host resolved, 2: remote connected, 3: got filesize, 4: got mime type */
$request_status = 0;

$ctx = stream_context_create(['http' => [
		'method'        => 'GET',
		'header'        => implode("\r\n", $request_headers ),
	]],
	[
	'notification'  => function( $notification_code, $severity, $message, $message_code, $bytes_transferred, $bytes_max ) use ( &$http_status, &$request_status ) {
		// debugging
		// $notification_codes = [
		// 	STREAM_NOTIFY_RESOLVE       => 'STREAM_NOTIFY_RESOLVE',
		// 	STREAM_NOTIFY_CONNECT       => 'STREAM_NOTIFY_CONNECT',
		// 	STREAM_NOTIFY_AUTH_REQUIRED => 'STREAM_NOTIFY_AUTH_REQUIRED',
		// 	STREAM_NOTIFY_MIME_TYPE_IS  => 'STREAM_NOTIFY_MIME_TYPE_IS',
		// 	STREAM_NOTIFY_FILE_SIZE_IS  => 'STREAM_NOTIFY_FILE_SIZE_IS',
		// 	STREAM_NOTIFY_REDIRECTED    => 'STREAM_NOTIFY_REDIRECTED',
		// 	STREAM_NOTIFY_PROGRESS      => 'STREAM_NOTIFY_PROGRESS',
		// 	STREAM_NOTIFY_COMPLETED     => 'STREAM_NOTIFY_COMPLETED',
		// 	STREAM_NOTIFY_FAILURE       => 'STREAM_NOTIFY_FAILURE',
		// 	STREAM_NOTIFY_FAILURE       => 'STREAM_NOTIFY_FAILURE',
		// ];

		switch ( $notification_code ) {
			case STREAM_NOTIFY_RESOLVE:
				$request_status = 1;
				break;
			case STREAM_NOTIFY_CONNECT:
				$request_status = 2;
				break;
			case STREAM_NOTIFY_FILE_SIZE_IS:
				$request_status = 3;
				break;
			case STREAM_NOTIFY_MIME_TYPE_IS:
				$request_status = 4;
				break;
			case STREAM_NOTIFY_PROGRESS:
				$request_status = 5;
				break;
			case STREAM_NOTIFY_FAILURE: // 404
				$http_status = $message_code;
				break;
		}
	},
]);

$response_reg = '/^(' . implode( '|', $send_response_headers ) . '):/';

$contents = file_get_contents( $url, false, $ctx );

if ( ! $request_status ) {
	$http_status = 502;
}

http_response_code( $http_status );

if ( isset( $http_response_header ) ) {
	foreach ( $http_response_header as $response_header ) {
		if ( preg_match( $response_reg, $response_header ) ) {
			header( $response_header );
		}
	}
	if ( 200 === $http_status ) {
		echo $contents;
	}
}
