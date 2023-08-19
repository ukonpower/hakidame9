import { Component, ComponentUpdateEvent } from "..";
import { Matrix } from "../../../Math/Matrix";
import { Vector } from "../../../Math/Vector";

export type CameraType = 'perspective' | 'orthographic'
export interface CameraParam {
	cameraType?: CameraType;
	fov?: number;
	near?: number;
	far?: number;
	orthWidth?: number;
	orthHeight?: number;
}

export class Camera extends Component {

	public cameraType: CameraType;

	public fov: number;
	public aspect: number;
	public near: number;
	public far: number;

	public orthWidth: number;
	public orthHeight: number;

	public projectionMatrix: Matrix;
	public viewMatrix: Matrix;
	public projectionViewMatrix: Matrix;

	public frustum: Vector[];

	constructor( param: CameraParam ) {

		super();

		param = param || {};

		this.cameraType = param.cameraType || 'perspective';

		this.viewMatrix = new Matrix();
		this.projectionMatrix = new Matrix();
		this.projectionViewMatrix = new Matrix();

		this.fov = param.fov || 50;
		this.near = param.near || 0.01;
		this.far = param.far || 1000;
		this.aspect = 1.0;

		this.orthWidth = param.orthWidth || 1;
		this.orthHeight = param.orthHeight || 1;



		this.frustum = [
			new Vector(),
			new Vector(),
			new Vector(),
			new Vector(),
			new Vector(),
			new Vector(),
			new Vector(),
		];

		this.updateProjectionMatrix();

	}

	public updateProjectionMatrix() {

		if ( this.cameraType == 'perspective' ) {

			this.projectionMatrix.perspective( this.fov, this.aspect, this.near, this.far );

		} else {

			this.projectionMatrix.orthographic( this.orthWidth, this.orthHeight, this.near, this.far );

		}

	}

	protected updateImpl( event: ComponentUpdateEvent ): void {

		this.viewMatrix.copy( event.entity.matrixWorld ).inverse();
		this.projectionViewMatrix.copy( this.viewMatrix ).multiply( this.projectionMatrix );

		this.frustum[ 0 ].set( this.projectionMatrix.elm[ 0 ] + this.projectionMatrix.elm[ 0 ], this.projectionMatrix.elm[ 1 ] + this.projectionMatrix.elm[ 1 ], this.projectionMatrix.elm[ 2 ] + this.projectionMatrix.elm[ 2 ], this.projectionMatrix.elm[ 3 ] + this.projectionMatrix.elm[ 3 ] );
		this.frustum[ 1 ].set( this.projectionMatrix.elm[ 0 ] + this.projectionMatrix.elm[ 0 ], this.projectionMatrix.elm[ 1 ] + this.projectionMatrix.elm[ 1 ], this.projectionMatrix.elm[ 2 ] + this.projectionMatrix.elm[ 2 ], this.projectionMatrix.elm[ 3 ] + this.projectionMatrix.elm[ 3 ] );
		this.frustum[ 2 ].set( this.projectionMatrix.elm[ 4 ] + this.projectionMatrix.elm[ 0 ], this.projectionMatrix.elm[ 5 ] + this.projectionMatrix.elm[ 1 ], this.projectionMatrix.elm[ 6 ] + this.projectionMatrix.elm[ 2 ], this.projectionMatrix.elm[ 7 ] + this.projectionMatrix.elm[ 3 ] );
		this.frustum[ 3 ].set( this.projectionMatrix.elm[ 4 ] + this.projectionMatrix.elm[ 0 ], this.projectionMatrix.elm[ 5 ] + this.projectionMatrix.elm[ 1 ], this.projectionMatrix.elm[ 6 ] + this.projectionMatrix.elm[ 2 ], this.projectionMatrix.elm[ 7 ] + this.projectionMatrix.elm[ 3 ] );
		this.frustum[ 4 ].set( this.projectionMatrix.elm[ 8 ] + this.projectionMatrix.elm[ 0 ], this.projectionMatrix.elm[ 9 ] + this.projectionMatrix.elm[ 1 ], this.projectionMatrix.elm[ 10 ] + this.projectionMatrix.elm[ 2 ], this.projectionMatrix.elm[ 11 ] + this.projectionMatrix.elm[ 3 ] );
		this.frustum[ 5 ].set( this.projectionMatrix.elm[ 12 ] + this.projectionMatrix.elm[ 0 ], this.projectionMatrix.elm[ 13 ] + this.projectionMatrix.elm[ 1 ], this.projectionMatrix.elm[ 14 ] + this.projectionMatrix.elm[ 2 ], this.projectionMatrix.elm[ 15 ] + this.projectionMatrix.elm[ 3 ] );

	}

}
