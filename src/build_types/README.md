## Build

```
# Clone three.js and types to 'datafile/' dir
> mkdir datafile
> cd datafile
> git clone --depth=1 https://github.com/mrdoob/three.js.git
> git clone https://github.com/three-types/three-ts-types.git

# Checkout desired branch
> cd three.js
> git checkout dev
> cd ../three-ts-types
> git checkout dev
> cd ../..

# Build types 
# - all tmp dts are written to 'artifacts/tmp_dts/'
# - bundled dts is written to 'artifacts/three.d.ts'
> npm run build:types

# Browse types
> npm run serve
```