import Promise from 'bluebird';
import asyncPopulate from './utils/asyncPopulate';

export default class Factory {
  name = null;
  Model = null;
  initializer = null;
  options = {};

  constructor(Model, initializer, options = {}) {
    if (!Model) {
      throw new Error('Invalid Model constructor passed to the factory');
    }
    if ((typeof initializer !== 'object' && typeof initializer !== 'function') ||
        !initializer) {
      throw new Error('Invalid initializer passed to the factory');
    }

    this.Model = Model;
    this.initializer = initializer;
    this.options = { ...this.options, ...options };
  }

  getFactoryAttrs(buildOptions = {}) {
    let attrs;
    if (typeof this.initializer === 'function') {
      attrs = this.initializer(buildOptions);
    } else {
      attrs = { ...this.initializer };
    }
    return Promise.resolve(attrs);
  }

  async attrs(extraAttrs = {}, buildOptions = {}) {
    const factoryAttrs = await this.getFactoryAttrs(buildOptions);
    const modelAttrs = {};

    const filteredAttrs = Object.keys(factoryAttrs).reduce((attrs, name) => {
      if (!extraAttrs.hasOwnProperty(name)) attrs[name] = factoryAttrs[name];
      return attrs;
    }, {});

    await asyncPopulate(modelAttrs, filteredAttrs);
    await asyncPopulate(modelAttrs, extraAttrs);

    return modelAttrs;
  }

  async build(adapter, extraAttrs = {}, buildOptions = {}, buildCallbacks = true) {
    const modelAttrs = await this.attrs(extraAttrs, buildOptions);
    const model = adapter.build(this.Model, modelAttrs);
    if (!this.options.afterBuild || !buildCallbacks) {
      return Promise.resolve(model);
    }
    return this.options.afterBuild(model, extraAttrs, buildOptions);
  }

  async create(adapter, attrs = {}, buildOptions = {}, buildCallbacks = true) {
    const buildModel = await this.build(adapter, attrs, buildOptions, buildCallbacks);

    const beforeCreate = this.options.beforeCreate ?
      this.options.beforeCreate(buildModel, attrs, buildOptions) : buildModel;
    return Promise.resolve(beforeCreate)
      .then(model => adapter.save(model, this.Model))
      .then(savedModel => (this.options.afterCreate ?
          this.options.afterCreate(savedModel, attrs, buildOptions) :
          savedModel
      ));
  }

  async attrsMany(numArg, attrsArrayArg = [], buildOptionsArrayArg = []) {
    const {
      num,
      attrsArray,
      buildOptionsArray,
    } = await parseAndValidateManyArgs(numArg, attrsArrayArg, buildOptionsArrayArg);

    const models = [];
    for (let i = 0; i < num; i++) {
      models.push(await this.attrs(attrsArray[i], buildOptionsArray[i]));
    }
    return models;
  }

  async buildMany(adapter, numArg, attrsArrayArg = [], buildOptionsArrayArg = [],
      buildCallbacks = true) {
    const {
      num,
      attrsArray,
      buildOptionsArray,
    } = await parseAndValidateManyArgs(numArg, attrsArrayArg, buildOptionsArrayArg);

    const models = [];
    for (let i = 0; i < num; ++i) {
      models.push(
        await this.build(adapter, attrsArray[i], buildOptionsArray[i], buildCallbacks),
      );
    }
    return models;
  }

  async createMany(adapter, numArg, attrsArrayArg = [], buildOptionsArrayArg = [],
                   buildCallbacks = true) {
    const {
      num,
      attrsArray,
      buildOptionsArray,
    } = await parseAndValidateManyArgs(numArg, attrsArrayArg, buildOptionsArrayArg);

    const models = [];
    for (let i = 0; i < num; ++i) {
      models.push(
        await this.create(adapter, attrsArray[i], buildOptionsArray[i],
          buildCallbacks),
      );
    }
    return models;
  }
}

async function parseAndValidateManyArgs(num, attrsArray = {}, buildOptionsArray = {}) {
  if (Array.isArray(num)) {
    buildOptionsArray = attrsArray;
    attrsArray = num;
    num = attrsArray.length;
  }
  if (!attrsArray || attrsArray.length === 0) {
    attrsArray = {};
  }
  if ((typeof attrsArray === 'object' && !Array.isArray(attrsArray))) {
    attrsArray = createArrayOfObjects(num, attrsArray || {});
  }
  if (attrsArray.length !== num) {
    throw new Error('attrs argument should be an object or an array equal to the ' +
      'amount of objects being built or created. You passed  ' +
      `attrs.length = ${attrsArray.length}. It should be ${num}`);
  }
  if (!buildOptionsArray || buildOptionsArray.length === 0) {
    buildOptionsArray = {};
  }
  if ((typeof buildOptionsArray === 'object' && !Array.isArray(buildOptionsArray))) {
    buildOptionsArray = createArrayOfObjects(num, buildOptionsArray || {});
  }
  if (buildOptionsArray.length !== num) {
    throw new Error('buildOptions argument should be an object or an array equal to ' +
      'the amount of objects being built or created. You passed  ' +
      `buildOptions.length = ${buildOptionsArray.length}. It should be ${num}`);
  }
  if (typeof num !== 'number' || num < 1) {
    throw new Error('Invalid number of objects requested');
  }
  if (!Array.isArray(attrsArray)) {
    throw new Error('Invalid attrsArray passed');
  }
  if (!Array.isArray(buildOptionsArray)) {
    throw new Error('Invalid buildOptionsArray passed');
  }
  return { num, attrsArray, buildOptionsArray };
}

function createArrayOfObjects(num, obj) {
  const arr = [];
  for (let i = 0; i < num; ++i) {
    arr.push(Object.assign({}, obj));
  }
  return arr;
}
