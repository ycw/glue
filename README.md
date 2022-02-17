## Build 

```
# Clone threejs and types into datafile dir
> mkdir datafile
> cd datafile
> git clone --depth=1 https://github.com/mrdoob/three.js.git
> git clone https://github.com/three-types/three-ts-types.git
> cd ..

# Install deps
> npm i

# Build report
> npm run build

# Browse report
> npm run serve
```


## Excluded Files

```
constants.d.ts
Three.d.ts
Three.Legacy.d.ts
utils.d.ts

# index
Curves.d.ts
Geometries.d.ts
Materials.d.ts

# missing .html
WebGLMultisampleRenderTarget.d.ts
WebXR.d.ts
WebXRController.d.ts
renderers/webgl/*.d.ts # except WebGLProgram.d.ts

# empty .html
ShaderChunk.d.ts
```



## Known Issues 

Wrongly parsed docs items:

```
# exotic docs
core/InterleavedBuffer   ("updateRange.count")
renderers/WebGLRenderer  ("shadowMap.type")
textures/DepthTexture    (".format")

# included unrelated items due to wrong html tags
core/BufferGeometry
core/Object3D
materials/Material
renderers/WebGLRenderTarget
textures/Texture

# included heritages
cameras/Camera                ("layers")
materials/MeshNormalMaterial  ("fog" defaults)
```

Wrongly parsed dts items:

```
# alias is ignored in renamed exports
renderers/shaders/UniformsUtils

# static items & instance items w/ same name creates doubles
math/Triangle     ("getUV")
math/Quaternion   ("slerp")

# included heritages which should not be
textures/*
```