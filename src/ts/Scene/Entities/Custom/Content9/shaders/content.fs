#include <common>
#include <packing>
#include <frag_h>

#include <sdf>
#include <noise4D>
#include <rotate>

uniform vec3 cameraPosition;
uniform mat4 modelMatrixInverse;
uniform float uTime;
uniform float uTimeSeq;

vec2 D( vec3 p ) {

	vec3 pp = p;
	vec2 d = vec2( 99999.0, 0.0 );

	float t = uTime * 0.1;

	for( int i = 0; i < 6; i++ ) {

		pp.x = abs( pp.x ) - 0.07;

		pp.xy *= rotate( t * PI  / 4.0);
		pp.xz *= rotate( t * 0.1);
		pp.yz *= rotate( t * 1.2 );

	}

	pp.y = abs( pp.y );
	pp.y -= 0.05;

	d = add( d, vec2( sdBox( pp, vec3( 0.2, 0.02, 0.02 ) ), 1.0 ) );
	d = add( d, vec2( sdSphere( pp, 0.05 ), 1.0 ) );

	return d;

}

vec3 N( vec3 pos, float delta ){

    return normalize( vec3(
		D( pos ).x - D( vec3( pos.x - delta, pos.y, pos.z ) ).x,
		D( pos ).x - D( vec3( pos.x, pos.y - delta, pos.z ) ).x,
		D( pos ).x - D( vec3( pos.x, pos.y, pos.z - delta ) ).x
	) );
	
}

void main( void ) {

	#include <frag_in>

	vec3 rayPos = ( modelMatrixInverse * vec4( vPos, 1.0 ) ).xyz;
	vec3 rayDir = normalize( ( modelMatrixInverse * vec4( normalize( vPos - cameraPosition ), 0.0 ) ).xyz );
	vec2 dist = vec2( 0.0 );
	bool hit = false;

	vec3 normal;
	
	for( int i = 0; i < 32; i++ ) { 

		dist = D( rayPos );		
		rayPos += dist.x * rayDir;

		if( dist.x < 0.01 ) {

			normal = N( rayPos, 0.0001 );

			hit = true;
			break;

		}
		
	}

	if( dist.y == 1.0 ) {
		
		outRoughness = 1.0;
		outMetalic = 0.0;
		outColor.xyz = vec3( 1.0, 1.0, 1.0 );
		
	} else if( dist.y == 0.0 ) {

		outEmission =  vec3( 1.0, 0.7, 0.7 ) * smoothstep( 0.0, 1.0, dot( normal, -rayDir ) );
		
	} 
		
	outNormal = normalize(modelMatrix * vec4( normal, 0.0 )).xyz;

	if( !hit ) discard;

	outPos = ( modelMatrix * vec4( rayPos, 1.0 ) ).xyz;

	#include <frag_out>

}