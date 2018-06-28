## v7.1.0

- Adding `afterAttrs`.

## v7.0.0

- Refactored code internally so that `buildMany` and `createMany` call `build` and `create` respectively. Also, attrs
  and buildOptions are shallow copied so that each call to `attrs` gets it's own copy.

## v6.1.0

- Added a `beforeCreate` method that is called before the model is saved.
  This is not called when calling `build`.

## v6.0.0

- Updated create to work synchronously in case you are building associations
where a single model may be associated with several other models.

## v4.0.0

Total rewrite. Should preserve backwards compatibility except as noted below.

- `assocBuild` is now `assocAttr`
- `assocBuildMany`
- `FactoryGirl.setAdapter` now takes an array of `factoryNames` for convenience

## v3.0.0

- `afterBuild` now takes `attrs` as the second parameter. If you need the `options` they can be
  accessed from the receiver in `this.options`.
