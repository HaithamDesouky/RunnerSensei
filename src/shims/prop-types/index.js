function createTypeChecker() {
  const fn = function () {
    return null;
  };
  fn.isRequired = fn;
  return fn;
}

const PropTypes = {
  any: createTypeChecker(),
  array: createTypeChecker(),
  bool: createTypeChecker(),
  func: createTypeChecker(),
  number: createTypeChecker(),
  object: createTypeChecker(),
  string: createTypeChecker(),
  symbol: createTypeChecker(),
  node: createTypeChecker(),
  element: createTypeChecker(),
  instanceOf: () => createTypeChecker(),
  oneOf: () => createTypeChecker(),
  oneOfType: () => createTypeChecker(),
  arrayOf: () => createTypeChecker(),
  objectOf: () => createTypeChecker(),
  shape: () => createTypeChecker(),
  exact: () => createTypeChecker(),
  checkPropTypes: () => {},
};

module.exports = PropTypes;
exports.default = PropTypes;

