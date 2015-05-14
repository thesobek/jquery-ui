(function() {

	// Find the script element
	var scripts = document.getElementsByTagName( "script" );
	var script = scripts[ scripts.length - 1 ];

	// Read the modules
	var modules = script.getAttribute( "data-modules" );
	var demoScripts = script.getAttribute( "data-modules" );
	var path = window.location.pathname;
	var pathParts = path.split( "/" );
	var pathLength = pathParts.length;
	if ( modules ) {
		modules = modules
			.replace( /^\s+|\s+$/g, "" )
			.split( /\s+/ );
	} else {
		modules = [];
	}
	modules.push( pathParts[ pathLength - 2 ] );
	require( modules, function() {
		$( "body" ).css( "visibility", "visible" );
		eval( $( script ).html() );
	} );
})();
