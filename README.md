## Snapshot

<https://ycw.github.io/glue/www/>

## Build 

```
# Clone threejs and types into datafile dir
> mkdir datafile
> cd datafile
> git clone --depth=1 https://github.com/mrdoob/three.js.git
> git clone https://github.com/three-types/three-ts-types.git
> cd three-ts-types
> git checkout dev
> cd ../..

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

### Wrongly parsed docs items:

```
# exotic docs
core/InterleavedBuffer   ("updateRange.count")
renderers/WebGLRenderer  ("shadowMap.type")
textures/DepthTexture    (".format")

# included unrelated items due to wrong html tags
core/BufferGeometry          #solved
core/Object3D                #solved
materials/Material           #solved
renderers/WebGLRenderTarget  #solved
textures/Texture             #solved

# included non-override heritages
cameras/Camera    ("layers") should not be an docs item
```

---
### Wrongly parsed dts items:

```
# export specifier is ignored in namespcae
renderers/shaders/UniformsUtils   #solved

# static items & instance items w/ same name creates doubles
math/Triangle     ("getUV")   #solved
math/Quaternion   ("slerp")   #solved
```

---
### Missing .d.ts is ignored:

(should track three-ts-types "Issue" instead)

---
### Some overrided items are undocumented in docs:

(three.js) should docs override items which changed default values.

```
# materials/ShadowMaterial
color 

# materials/SpriteMaterial
transparent

# textures/CubeTexture
flipY

# textures/DataTexture
flipY
generateMipmaps
unpackAlignment

# textures/VideoTexture
generateMipmaps
```

(three.js) shouldn't docs override items which changed impl only:

```
# extras/core/CurvePath
getPoint
```