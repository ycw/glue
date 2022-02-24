import { posix } from 'path';
import { insert_new_prop } from './utils.js';

const path = posix;

const docs_list = [ 
  // in subdir shadows/
  'lights/shadows/DirectionalLightShadow.html',
  'lights/shadows/SpotLightShadow.html',
  'lights/shadows/PointLightShadow.html',

  'animation/AnimationObjectGroup.html',
  'cameras/ArrayCamera.html',
  'cameras/Camera.html',
  'cameras/OrthographicCamera.html',
  'cameras/PerspectiveCamera.html',
  'core/BufferAttribute.html',
  'core/BufferGeometry.html',
  'core/InstancedBufferGeometry.html',
  'core/InterleavedBufferAttribute.html',
  'core/Object3D.html',
  'helpers/SkeletonHelper.html',
  'lights/AmbientLight.html',
  'lights/AmbientLightProbe.html',
  'lights/DirectionalLight.html',
  'lights/HemisphereLight.html',
  'lights/HemisphereLightProbe.html',
  'lights/Light.html',
  'lights/LightProbe.html',
  'lights/RectAreaLight.html',
  'lights/SpotLight.html',
  'loaders/ImageBitmapLoader.html',
  'materials/LineDashedMaterial.html',
  'materials/Material.html',
  'materials/MeshStandardMaterial.html',
  'materials/ShaderMaterial.html',
  'materials/SpriteMaterial.html',
  'math/Box3.html',
  'math/Color.html',
  'math/Euler.html',
  'math/Plane.html',
  'math/Quaternion.html',
  'math/SphericalHarmonics3.html',
  'math/Vector2.html',
  'math/Vector3.html',
  'math/Vector4.html',
  'objects/Bone.html',
  'objects/Group.html',
  'objects/InstancedMesh.html',
  'objects/Line.html',
  'objects/LineLoop.html',
  'objects/LineSegments.html',
  'objects/LOD.html',
  'objects/Mesh.html',
  'objects/Points.html',
  'objects/SkinnedMesh.html',
  'objects/Sprite.html',
  'renderers/WebGL1Renderer.html',
  'renderers/WebGLMultipleRenderTargets.html',
  'renderers/WebGLRenderTarget.html',
  'scenes/Fog.html',
  'scenes/FogExp2.html',
  'scenes/Scene.html',
  'textures/CanvasTexture.html',
  'textures/CompressedTexture.html',
  'textures/CubeTexture.html',
  'textures/DataTexture.html',
  'textures/DepthTexture.html',
  'textures/FramebufferTexture.html',
  'textures/Texture.html',
  'textures/VideoTexture.html'
];

const new_prop_name_fn = ({ relpath_to_docs }) =>
  'is' + path.basename(relpath_to_docs, '.html');

const new_full_text_fn = ({ new_prop_name }) => `\n
\t\t<h3>[property:Boolean ${new_prop_name}]</h3>
\t\t<p>
\t\t\tRead-only flag to check if a given object is of type [name].
\t\t</p>`;

insert_new_prop({ 
  docs_list, 
  new_prop_name_fn, 
  new_full_text_fn, 
  is_replace: true
});
