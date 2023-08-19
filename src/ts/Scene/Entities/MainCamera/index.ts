import * as GLP from 'glpower';

import { blidge, canvas, gl, globalUniforms, power } from "~/ts/Globals";
import { LookAt } from '../../Components/LookAt';

import fxaaFrag from './shaders/fxaa.fs';
import bloomBlurFrag from './shaders/bloomBlur.fs';
import bloomBrightFrag from './shaders/bloomBright.fs';
import lightShaftFrag from './shaders/lightShaft.fs';
import ssrFrag from './shaders/ssr.fs';
import ssaoFrag from './shaders/ssao.fs';
import dofCoc from './shaders/dofCoc.fs';
import dofComposite from './shaders/dofComposite.fs';
import dofBokeh from './shaders/dofBokeh.fs';
import ssCompositeFrag from './shaders/ssComposite.fs';
import compositeFrag from './shaders/composite.fs';
import { OrbitControls } from '../../Components/OrbitControls';
import { ShakeViewer } from '../../Components/ShakeViewer';

export class MainCamera extends GLP.Entity {

	private commonUniforms: GLP.Uniforms;

	private cameraComponent: GLP.RenderCamera;

	private baseFov: number;

	// common rendertarget

	private rt1: GLP.GLPowerFrameBuffer;
	private rt2: GLP.GLPowerFrameBuffer;
	private rt3: GLP.GLPowerFrameBuffer;

	// fxaa

	private fxaa: GLP.PostProcessPass;

	// bloom

	private bloomRenderCount: number;
	private bloomBright: GLP.PostProcessPass;
	private bloomBlur: GLP.PostProcessPass[];
	private rtBloomVertical: GLP.GLPowerFrameBuffer[];
	private rtBloomHorizonal: GLP.GLPowerFrameBuffer[];

	// light shaft

	private lightShaft: GLP.PostProcessPass;
	public rtLightShaft1: GLP.GLPowerFrameBuffer;
	public rtLightShaft2: GLP.GLPowerFrameBuffer;

	// ssr

	private ssr: GLP.PostProcessPass;
	public rtSSR1: GLP.GLPowerFrameBuffer;
	public rtSSR2: GLP.GLPowerFrameBuffer;

	// ssao

	private ssao: GLP.PostProcessPass;
	public rtSSAO1: GLP.GLPowerFrameBuffer;
	public rtSSAO2: GLP.GLPowerFrameBuffer;

	// ss composite

	private ssComposite: GLP.PostProcessPass;

	// dof

	private dofParams: GLP.Vector;
	private dofTarget: GLP.Entity | null;

	public dofCoc: GLP.PostProcessPass;
	public dofBokeh: GLP.PostProcessPass;
	public dofComposite: GLP.PostProcessPass;
	public rtDofCoc: GLP.GLPowerFrameBuffer;
	public rtDofBokeh: GLP.GLPowerFrameBuffer;
	public rtDofComposite: GLP.GLPowerFrameBuffer;

	// composite

	private composite: GLP.PostProcessPass;

	// resolutions

	private resolution: GLP.Vector;
	private resolutionInv: GLP.Vector;
	private resolutionBloom: GLP.Vector[];

	// curves

	private stateCurve?: GLP.FCurveGroup;

	// tmps

	private tmpVector1: GLP.Vector;
	private tmpVector2: GLP.Vector;

	constructor( param: GLP.RenderCameraParam ) {

		super();

		this.baseFov = 50.0;

		// components

		this.cameraComponent = this.addComponent( "camera", new GLP.RenderCamera( param ) );
		this.addComponent( 'orbitControls', new OrbitControls( canvas ) );

		const lookAt = this.addComponent( 'lookAt', new LookAt() );

		this.addComponent( 'shakeViewer', new ShakeViewer( 0.3, 1.0 ) );
		// this.addComponent( 'rotateViewer', new RotateViewer( 2.0 ) );

		// resolution

		this.resolution = new GLP.Vector();
		this.resolutionInv = new GLP.Vector();
		this.resolutionBloom = [];

		// rt

		this.rt1 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [ power.createTexture() ] );
		this.rt2 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [ power.createTexture() ] );
		this.rt3 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [ power.createTexture() ] );

		// uniforms

		this.commonUniforms = GLP.UniformsUtils.merge( {
			uResolution: {
				type: "2f",
				value: this.resolution
			},
			uResolutionInv: {
				type: "2f",
				value: this.resolutionInv
			}
		} );

		// light shaft

		this.rtLightShaft1 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
		] );
		this.rtLightShaft2 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
		] );

		this.lightShaft = new GLP.PostProcessPass( {
			name: 'lightShaft',
			input: [],
			frag: lightShaftFrag,
			renderTarget: this.rtLightShaft1,
			uniforms: GLP.UniformsUtils.merge( globalUniforms.time, {
				uLightShaftBackBuffer: {
					value: this.rtLightShaft2.textures[ 0 ],
					type: '1i'
				},
				uDepthTexture: {
					value: param.renderTarget.gBuffer.depthTexture,
					type: '1i'
				},
			} ),
		} );

		// ssr

		this.rtSSR1 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
		] );

		this.rtSSR2 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
		] );

		this.ssr = new GLP.PostProcessPass( {
			name: 'ssr',
			input: [ param.renderTarget.gBuffer.textures[ 0 ], param.renderTarget.gBuffer.textures[ 1 ] ],
			frag: ssrFrag,
			renderTarget: this.rtSSR1,
			uniforms: GLP.UniformsUtils.merge( globalUniforms.time, {
				uResolution: {
					value: this.resolution,
					type: '2fv',
				},
				uResolutionInv: {
					value: this.resolutionInv,
					type: '2fv',
				},
				uSceneTex: {
					value: param.renderTarget.forwardBuffer.textures[ 0 ],
					type: '1i'
				},
				uSSRBackBuffer: {
					value: this.rtSSR2.textures[ 0 ],
					type: '1i'
				},
				uDepthTexture: {
					value: param.renderTarget.gBuffer.depthTexture,
					type: '1i'
				},
			} ),
		} );

		// ssao

		this.rtSSAO1 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
		] );

		this.rtSSAO2 = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
		] );

		this.ssao = new GLP.PostProcessPass( {
			name: 'ssao',
			input: [ param.renderTarget.gBuffer.textures[ 0 ], param.renderTarget.gBuffer.textures[ 1 ] ],
			frag: ssaoFrag,
			renderTarget: this.rtSSAO1,
			uniforms: GLP.UniformsUtils.merge( globalUniforms.time, {
				uResolution: {
					value: this.resolution,
					type: '2fv',
				},
				uResolutionInv: {
					value: this.resolutionInv,
					type: '2fv',
				},
				uSceneTex: {
					value: param.renderTarget.forwardBuffer.textures[ 0 ],
					type: '1i'
				},
				uSSAOBackBuffer: {
					value: this.rtSSR2.textures[ 0 ],
					type: '1i'
				},
				uDepthTexture: {
					value: param.renderTarget.gBuffer.depthTexture,
					type: '1i'
				},
			} ),
		} );

		// ss-composite

		this.ssComposite = new GLP.PostProcessPass( {
			name: 'ssComposite',
			input: [ param.renderTarget.gBuffer.textures[ 0 ], param.renderTarget.gBuffer.textures[ 1 ], param.renderTarget.forwardBuffer.textures[ 0 ] ],
			frag: ssCompositeFrag,
			uniforms: GLP.UniformsUtils.merge( this.commonUniforms, {
				uLightShaftTexture: {
					value: this.rtLightShaft2.textures[ 0 ],
					type: '1i'
				},
				uSSRTexture: {
					value: this.rtSSR2.textures[ 0 ],
					type: '1i'
				},
				uSSAOTexture: {
					value: this.rtSSAO2.textures[ 0 ],
					type: '1i'
				},
			} ),
			renderTarget: this.rt1
		} );

		// dof

		this.rtDofCoc = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR, internalFormat: gl.RGBA16F, type: gl.HALF_FLOAT, format: gl.RGBA } ),
		] );

		this.rtDofComposite = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR, internalFormat: gl.RGBA16F, type: gl.HALF_FLOAT, format: gl.RGBA } ),
		] );

		this.rtDofBokeh = new GLP.GLPowerFrameBuffer( gl ).setTexture( [
			power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
		] );

		this.dofTarget = null;
		this.dofParams = new GLP.Vector( 10, 0.05, 20, 0.05 );

		this.dofCoc = new GLP.PostProcessPass( {
			name: 'dof/coc',
			input: [ this.rt1.textures[ 0 ], param.renderTarget.gBuffer.depthTexture ],
			frag: dofCoc,
			uniforms: GLP.UniformsUtils.merge( globalUniforms.time, {
				uParams: {
					value: this.dofParams,
					type: '4f'
				},
			} ),
			renderTarget: this.rtDofCoc,
		} );

		this.dofBokeh = new GLP.PostProcessPass( {
			name: 'dof/bokeh',
			input: [ this.rtDofCoc.textures[ 0 ] ],
			frag: dofBokeh,
			uniforms: GLP.UniformsUtils.merge( globalUniforms.time, {
				uParams: {
					value: this.dofParams,
					type: '4f'
				}
			} ),
			renderTarget: this.rtDofBokeh
		} );

		this.dofComposite = new GLP.PostProcessPass( {
			name: 'dof/composite',
			input: [ this.rt1.textures[ 0 ], this.rtDofBokeh.textures[ 0 ] ],
			frag: dofComposite,
			uniforms: GLP.UniformsUtils.merge( {} ),
			renderTarget: this.rtDofComposite
		} );

		// fxaa

		this.fxaa = new GLP.PostProcessPass( {
			name: 'fxaa',
			input: [ this.rtDofComposite.textures[ 0 ] ],
			frag: fxaaFrag,
			uniforms: this.commonUniforms,
			renderTarget: this.rt1
		} );

		// bloom

		this.bloomRenderCount = 4;

		this.rtBloomVertical = [];
		this.rtBloomHorizonal = [];

		for ( let i = 0; i < this.bloomRenderCount; i ++ ) {

			this.rtBloomVertical.push( new GLP.GLPowerFrameBuffer( gl ).setTexture( [
				power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
			] ) );

			this.rtBloomHorizonal.push( new GLP.GLPowerFrameBuffer( gl ).setTexture( [
				power.createTexture().setting( { magFilter: gl.LINEAR, minFilter: gl.LINEAR } ),
			] ) );

		}

		this.bloomBright = new GLP.PostProcessPass( {
			name: 'bloom/bright/',
			input: this.rt1.textures,
			frag: bloomBrightFrag,
			uniforms: GLP.UniformsUtils.merge( globalUniforms.time, {
				threshold: {
					type: '1f',
					value: 0.5,
				},
			} ),
			renderTarget: this.rt2
		} );

		this.bloomBlur = [];

		// bloom blur

		let bloomInput: GLP.GLPowerTexture[] = this.rt2.textures;

		for ( let i = 0; i < this.bloomRenderCount; i ++ ) {

			const rtVertical = this.rtBloomVertical[ i ];
			const rtHorizonal = this.rtBloomHorizonal[ i ];

			const resolution = new GLP.Vector();
			this.resolutionBloom.push( resolution );

			this.bloomBlur.push( new GLP.PostProcessPass( {
				name: 'bloom/blur/' + i + '/v',
				input: bloomInput,
				renderTarget: rtVertical,
				frag: bloomBlurFrag,
				uniforms: {
					uIsVertical: {
						type: '1i',
						value: true
					},
					uWeights: {
						type: '1fv',
						value: this.guassWeight( this.bloomRenderCount )
					},
					uResolution: {
						type: '2fv',
						value: resolution,
					}
				},
				defines: {
					GAUSS_WEIGHTS: this.bloomRenderCount.toString()
				}
			} ) );

			this.bloomBlur.push( new GLP.PostProcessPass( {
				name: 'bloom/blur/' + i + '/w',
				input: rtVertical.textures,
				renderTarget: rtHorizonal,
				frag: bloomBlurFrag,
				uniforms: {
					uIsVertical: {
						type: '1i',
						value: false
					},
					uWeights: {
						type: '1fv',
						value: this.guassWeight( this.bloomRenderCount )
					},
					uResolution: {
						type: '2fv',
						value: resolution,
					}
				},
				defines: {
					GAUSS_WEIGHTS: this.bloomRenderCount.toString()
				} } ) );

			bloomInput = rtHorizonal.textures;

		}

		// composite

		this.composite = new GLP.PostProcessPass( {
			name: 'dof/bokeh',
			input: [ this.rt1.textures[ 0 ] ],
			frag: compositeFrag,
			uniforms: GLP.UniformsUtils.merge( this.commonUniforms, {
				uBloomTexture: {
					value: this.rtBloomHorizonal.map( rt => rt.textures[ 0 ] ),
					type: '1iv'
				},
			} ),
			defines: {
				BLOOM_COUNT: this.bloomRenderCount.toString()
			},
			renderTarget: null
		} );

		// DEBUG
		// this.composite.input = [ param.renderTarget.deferredBuffer.textures[ 0 ] ];

		this.addComponent( "postprocess", new GLP.PostProcess( {
			input: param.renderTarget.gBuffer.textures,
			passes: [
				this.lightShaft,
				this.ssr,
				this.ssao,
				this.ssComposite,
				this.dofCoc,
				this.dofBokeh,
				this.dofComposite,
				this.fxaa,
				this.bloomBright,
				...this.bloomBlur,
				this.composite,
			] } )
		);

		// events

		this.on( 'notice/sceneCreated', ( root: GLP.Entity ) => {

			lookAt.setTarget( root.getEntityByName( "CameraTarget" ) || null );
			this.dofTarget = root.getEntityByName( 'CameraTargetDof' ) || null;

			this.baseFov = this.cameraComponent.fov;
			this.updateCameraParams( this.resolution );

		} );


		// tmps

		this.tmpVector1 = new GLP.Vector();
		this.tmpVector2 = new GLP.Vector();

	}

	private guassWeight( num: number ) {

		const weight = new Array( num );

		// https://wgld.org/d/webgl/w057.html

		let t = 0.0;
		const d = 100;

		for ( let i = 0; i < weight.length; i ++ ) {

			const r = 1.0 + 2.0 * i;
			let w = Math.exp( - 0.5 * ( r * r ) / d );
			weight[ i ] = w;

			if ( i > 0 ) {

				w *= 2.0;

			}

			t += w;

		}

		for ( let i = 0; i < weight.length; i ++ ) {

			weight[ i ] /= t;

		}

		return weight;

	}

	protected updateImpl( event: GLP.ComponentUpdateEvent ): void {

		// fov

		if ( this.stateCurve ) {

			const focalLength = this.stateCurve.setFrame( blidge.frame.current ).value.x;

			const ff = 2 * Math.atan( 12 / ( 2 * focalLength ) ) / Math.PI * 180;
			this.baseFov = ff;

			this.updateCameraParams( this.resolution );

		}

		// dof params

		this.matrixWorld.decompose( this.tmpVector1 );

		if ( this.dofTarget ) {

			this.dofTarget.matrixWorld.decompose( this.tmpVector2 );

		}

		const fov = this.cameraComponent.fov;
		const focusDistance = this.tmpVector1.sub( this.tmpVector2 ).length();
		const kFilmHeight = 0.012;
		const flocalLength = 0.5 * kFilmHeight / Math.tan( 0.5 * ( fov / 180 * Math.PI ) );
		const maxCoc = 1 / this.rtDofBokeh.size.y * 4;
		const rcpMaxCoC = 1.0 / maxCoc;
		const coeff = flocalLength * flocalLength / ( 0.3 * ( focusDistance - flocalLength ) * kFilmHeight * 2.0 );

		this.dofParams.set( focusDistance, maxCoc, rcpMaxCoC, coeff );

		// light shaft swap

		let tmp = this.rtLightShaft1;
		this.rtLightShaft1 = this.rtLightShaft2;
		this.rtLightShaft2 = tmp;

		this.lightShaft.renderTarget = this.rtLightShaft1;
		this.ssComposite.uniforms.uLightShaftTexture.value = this.rtLightShaft1.textures[ 0 ];
		this.lightShaft.uniforms.uLightShaftBackBuffer.value = this.rtLightShaft2.textures[ 0 ];

		// ssr swap

		tmp = this.rtSSR1;
		this.rtSSR1 = this.rtSSR2;
		this.rtSSR2 = tmp;

		this.ssr.renderTarget = this.rtSSR1;
		this.ssComposite.uniforms.uSSRTexture.value = this.rtSSR1.textures[ 0 ];
		this.ssr.uniforms.uSSRBackBuffer.value = this.rtSSR2.textures[ 0 ];

		// ssao swap

		tmp = this.rtSSAO1;
		this.rtSSAO1 = this.rtSSAO2;
		this.rtSSAO2 = tmp;

		this.ssao.renderTarget = this.rtSSAO1;
		this.ssComposite.uniforms.uSSAOTexture.value = this.rtSSAO1.textures[ 0 ];
		this.ssao.uniforms.uSSAOBackBuffer.value = this.rtSSAO2.textures[ 0 ];

	}

	protected resizeImpl( e: GLP.ComponentResizeEvent ): void {

		this.resolution.copy( e.resolution );
		this.resolutionInv.set( 1.0 / e.resolution.x, 1.0 / e.resolution.y, 0.0, 0.0 );

		const resolutionHalf = this.resolution.clone().divide( 2 );
		resolutionHalf.x = Math.max( Math.floor( resolutionHalf.x ), 1.0 );
		resolutionHalf.y = Math.max( Math.floor( resolutionHalf.y ), 1.0 );

		this.rt1.setSize( e.resolution );
		this.rt2.setSize( e.resolution );
		this.rt3.setSize( e.resolution );

		this.updateCameraParams( this.resolution );

		let scale = 2;

		for ( let i = 0; i < this.bloomRenderCount; i ++ ) {

			this.resolutionBloom[ i ].copy( e.resolution ).multiply( 1.0 / scale );

			this.rtBloomHorizonal[ i ].setSize( this.resolutionBloom[ i ] );
			this.rtBloomVertical[ i ].setSize( this.resolutionBloom[ i ] );

			scale *= 2.0;

		}

		this.rtLightShaft1.setSize( e.resolution );
		this.rtLightShaft2.setSize( e.resolution );

		this.rtSSR1.setSize( resolutionHalf );
		this.rtSSR2.setSize( resolutionHalf );

		this.rtSSAO1.setSize( resolutionHalf.sub( 32 ) );
		this.rtSSAO2.setSize( resolutionHalf.sub( 32 ) );

		this.rtDofCoc.setSize( resolutionHalf );
		this.rtDofBokeh.setSize( resolutionHalf );
		this.rtDofComposite.setSize( this.resolution );

	}

	protected addBlidgerImpl( blidger: GLP.BLidger ): void {

		const node = blidger.node;

		this.stateCurve = blidge.getCurveGroup( node.animation.state )!;

	}

	private updateCameraParams( resolution: GLP.Vector ) {

		this.cameraComponent.near = 0.01;
		this.cameraComponent.far = 1000;
		this.cameraComponent.aspect = resolution.x / resolution.y;
		this.cameraComponent.fov = this.baseFov + Math.max( 0, 1 / this.cameraComponent.aspect - 1 ) * 50.0;
		this.cameraComponent.updateProjectionMatrix();

	}

}
