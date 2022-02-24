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
> npm run build:report

# Browse report
> npm run serve
```



## Excluded Files

(see `EXCLUDED_DTS` in [report_config.js](https://github.com/ycw/glue/blob/main/src/build_report/report_config.js))



## Known Issues 

- Missing .d.ts are Ignored
  - track three-ts-types issues instead
- Exotic docs - non-override heritages
  - cameras/Camera `layers` etc
- Type tags are undoc 
  - `is*` [#23527](https://github.com/mrdoob/three.js/issues/23527)
  - `type` (?)



## Solved Issues

- unrelated items are included 
  [#23522](https://github.com/mrdoob/three.js/pull/23522)
- override items are undoc
  [#23536](https://github.com/mrdoob/three.js/issues/23536)
- Exotic docs - sparse [#23532](https://github.com/mrdoob/three.js/pull/23532)
  - core/InterleavedBuffer `updateRange.count` etc
  - renderers/WebGLRenderer  `shadowMap.type` etc
- Exotic docs - dot prefix [#23529](https://github.com/mrdoob/three.js/pull/23529) 
  - textures/DepthTexture `.format` etc
- statics and insts are indistinguishable
  - math/Triangle `getUV` etc
  - math/Quaternion `slerp`
- named export specifiers are ignored
  - renderers/shaders/UniformsUtils
