import * as THREE from 'three';

// deprecated 
THREE.MathUtils.random16

// default
new THREE.Vector3().x

// undocumented -> internal
THREE.Euler.DefaultOrder

// undocumented -> internal
new THREE.PerspectiveCamera().type;
// documented
new THREE.PerspectiveCamera().isPerspectiveCamera;

// false internal due to missing `@override`
// should contribute to 'three-types/three-ts-types'
new THREE.PerspectiveCamera().updateMatrixWorld

// test others...
