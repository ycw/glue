## Insert Missing API Docs

```
# clone three.js folk in 'origins/' dir
> mkdir origins/
> cd origins
> git clone {uri to three.js folk}

# new branch
> cd three.js
> git checkout -b {new branch name}
> cd ../..

# insert ( will write to origins/three.js/ )
npm run insert:prop_is
```

## Available Inserters

```
prop_is
```