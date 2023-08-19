import * as GLP from 'glpower';

import { Tree } from '../Entities/Tree';

import { Cave } from '../Entities/Cave';
import { Floor } from '../Entities/Floor';
import { EBorder } from '../Entities/Effects/EBorder';
import { EGridDots } from '../Entities/Effects/EGridDots';
import { ERing } from '../Entities/Effects/ERing';
import { ECross } from '../Entities/Effects/ECross';
import { EArea } from '../Entities/Effects/EArea';
import { EGridLine } from '../Entities/Effects/EGridLine';
import { Trails } from '../Entities/Trails';
import { Content as Content9 } from '../Entities/Custom/Content9';
import { Skybox } from '../Entities/Skybox';

export const router = ( node: GLP.BLidgeNode ) => {

	// class

	if ( node.class == "Tree" ) {

		return new Tree();

	} else if ( node.class == "Cave" ) {

		return new Cave();

	} else if ( node.class == "Floor" ) {

		return new Floor();

	} else if ( node.class == 'EGridDots' ) {

		return new EGridDots();

	} else if ( node.class == "EBorder" ) {

		return new EBorder();

	} else if ( node.class == "ERing" ) {

		return new ERing();

	} else if ( node.class == "ECross" ) {

		return new ECross();

	} else if ( node.class == "EGridLine" ) {

		return new EGridLine();

	} else if ( node.class == 'EArea' ) {

		return new EArea();

	} else if ( node.class == "Skybox" ) {

		return new Skybox();

	}

	// custom

	if ( node.class == "Content9" ) {

		return new Content9();

	}

	const baseEntity = new GLP.Entity();

	return baseEntity;

};
