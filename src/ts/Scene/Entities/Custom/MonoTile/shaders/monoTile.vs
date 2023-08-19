#include <common>
#include <vert_h>
#include <rotate>

uniform float uTime;
uniform float uMove;

void main( void ) {

	#include <vert_in>

	// custom -------

	outUv.y += -uMove * 1.2;
	outUv.xy *= rotate( HPI / 2.0 );

	// --------------
	
	#include <vert_out>
	
}