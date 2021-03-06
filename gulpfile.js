
const gulp        = require( 'gulp' );
const runSequence = require( 'run-sequence' );

const child   = require( 'child_process' );
const path    = require( 'path' );
const fs      = require( 'fs' );
const Promise = require( 'bluebird' );
const rimraf  = require( 'rimraf-promise' );
const mkdirp  = Promise.promisify( require( 'mkdirp' ) );
const replace = require( 'replace' );


const libphonenumberVersion =
	fs.readFileSync( 'libphonenumber.version', 'utf8' ).toString( ).trim( );

const buildRoot = './build';
const libphonenumberUrl = 'https://github.com/googlei18n/libphonenumber/';
const closureLibraryUrl = 'https://github.com/google/closure-library/';
const closureLinterUrl = 'https://github.com/google/closure-linter';
const pythonGflagsUrl = 'https://github.com/google/python-gflags.git';

const isDebug = process.env.DEBUG && process.env.DEBUG !== '0';

gulp.task( 'clean', ( ) =>
	rimraf( buildRoot )
);

gulp.task( 'make-build-dir', ( ) =>
	mkdirp( buildRoot )
);

gulp.task( 'clone-libphonenumber', [ 'make-build-dir' ], ( ) =>
	gitClone( libphonenumberUrl, 'libphonenumber', libphonenumberVersion )
);

gulp.task( 'clone-closure-library', [ 'make-build-dir' ], ( ) =>
	gitClone( closureLibraryUrl, 'closure-library' )
);

gulp.task( 'checkout-closure-linter', [ 'make-build-dir' ], ( ) =>
	gitClone( closureLinterUrl, 'closure-linter' )
);

gulp.task( 'checkout-python-gflags', [ 'make-build-dir' ], ( ) =>
	gitClone( pythonGflagsUrl, 'python-gflags' )
);

gulp.task( 'download-deps', [
	'clone-libphonenumber',
	'clone-closure-library',
	'checkout-closure-linter',
	'checkout-python-gflags'
] );

gulp.task( 'build-deps', [ 'download-deps' ] );

gulp.task( 'build-libphonenumber', ( ) => {
	var args = [ '-f', 'build.xml', 'compile-exports' ];
	return runCommand( 'ant', args, { cwd: '.' } );
} );

gulp.task( 'build', cb =>
	runSequence(
		'build-deps',
		'build-libphonenumber',
		cb
	)
);

gulp.task( 'update-readme', ( ) =>
	updateReadme( )
);

gulp.task( 'default', [ 'clean' ], cb =>
	runSequence(
		'build',
		'update-readme',
		cb
	)
);

function updateReadme( )
{
	replace( {
		regex: 'Uses libphonenumber ([A-Za-z.0-9]+)',
		replacement: `Uses libphonenumber ${libphonenumberVersion}`,
		paths: [ 'README.md' ],
		silent: true,
	} );
}

function gitClone( url, name, branch )
{
	const args = [ '--depth=1' ];
	if ( branch )
		args.push( '--branch=' + branch );

	return runCommand( 'git', [ 'clone', ...args, url, name ] );
}

function runCommand( cmd, args, opts )
{
	opts = opts || {
		cwd   : './build',
		stdio : [ null, null, isDebug ? process.stderr : null ]
	};

	return new Promise( function( resolve, reject ) {
		var cp = child.spawn( cmd, args, opts );
		cp.stdout.on( 'data', data => {
			if ( isDebug )
				console.log( data.toString( ) );
		} );
		cp.on( 'close', code => {
			if ( code === 0 )
				return resolve( );
			reject( new Error(
				`${cmd} exited with exitcode ${code}. Args: ${args}` ) );
		} );
		cp.on( 'error', err => reject( err ) );
	} );
}
