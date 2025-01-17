/* eslint-disable max-classes-per-file */

const WILDCARD = '*';

class Node {
  /**
   * @param {String} name
   * @param {Node} [parent]
   * @private
   */
  constructor(name, parent) {
    this.name = name;
    this.children = new Map();
    this.parent = parent;
    this.listeners = [];
  }

  /**
   * @param {String} name
   * @return {Node}
   */
  createChild(name) {
    const node = new Node(name, this);
    this.children.set(name, node);
    return node;
  }

  /**
   * @param {String} name
   * @return {Node}
   */
  getChild(name) {
    return this.children.get(name);
  }

  /**
   * @param {String} name
   * @return {Node}
   */
  createOrGetChild(name) {
    const node = this.getChild(name);
    return node !== undefined ? node : this.createChild(name);
  }

  /**
   * @param {Array} listeners
   */
  addListeners(listeners) {
    this.listeners = this.listeners.concat(listeners);
  }

  /**
   * @return {Boolean}
   */
  hasListeners() {
    return this.listeners.length > 0;
  }

  /**
   * @param {String|Buffer} data
   */
  callListeners(data) {
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i](data);
    }
  }

  /**
   * @return {Array}
   */
  getPath() {
    const path = [];
    let node = this;
    while (node.parent !== undefined) {
      path.unshift(node.name);
      node = node.parent;
    }
    return path;
  }

  /**
   * @return {Node}
   */
  clone() {
    const clone = new Node(this.name);
    clone.listeners = this.listeners.slice();
    this.children.forEach((child) => {
      const childClone = child.clone();
      clone.children.set(child.name, childClone);
      childClone.parent = clone;
    });
    return clone;
  }
}

class Tree {
  /**
   * @param {Node|String} root
   * @private
   */
  constructor(root) {
    this.root = typeof root === 'string' ? new Node(root) : root;
  }

  /**
   * @param {Array} path
   * @param {Function} listener
   */
  add(path, listener) {
    let node = this.root;
    for (let i = 0; i < path.length; i++) {
      node = node.createOrGetChild(path[i]);
    }
    node.addListeners(listener);
  }

  /**
   * @param {Array} path
   * @return {Node}
   */
  get(path) {
    let node = this.root;
    for (let i = 0; i < path.length && node !== undefined; i++) {
      node = node.getChild(path[i]);
    }
    return node;
  }

  /**
   * @return {String}
   */
  toString() {
    const ret = [];
    function _it(node, level) {
      const pad = (new Array(level)).join('-');
      ret.push(`${pad} ${node.name} l:${node.listeners.length}`);

      node.children.forEach((child) => {
        _it(child, level + 2);
      });
    }

    _it(this.root, 2);
    return ret.join('\n');
  }

  /**
   * @return {Tree}
   */
  getCloneExpanded() {
    const clone = new Tree(this.root.clone());
    this._expandWildcards(clone.root);
    return clone;
  }

  /**
   * @param {Node} node
   */
  _expandWildcards(node) {
    const wildNode = node.getChild(WILDCARD);
    if (wildNode !== undefined) {
      node.children.forEach((child) => {
        if (child.name !== WILDCARD) {
          child.addListeners(wildNode.listeners);
          this._mergeNodes(child, wildNode);
        }
      });
    }

    node.children.forEach((child) => this._expandWildcards(child));
  }

  /**
   * @param {Node} target
   * @param {Node} source
   */
  _mergeNodes(target, source) {
    source.children.forEach((sourceChild) => {
      const targetChild = target.createOrGetChild(sourceChild.name);
      targetChild.addListeners(sourceChild.listeners);
      this._mergeNodes(targetChild, sourceChild);
    });
  }
}

class EventTree {
  /**
   * @param {String} rootName
   * @param {String} [customPathSeparator='']
   * @private
   */
  constructor(rootName, customPathSeparator = '') {
    this.tree = new Tree(rootName);
    this.customPathSeparator = customPathSeparator;

    this.expandedTree = this.tree.getCloneExpanded();
    this.node = this.expandedTree.root;
  }

  /**
   * @param {String}
   */
  down(name) {
    if (name !== this.expandedTree.root.name) {
      this.node = this.node.getChild(name) || this.node.getChild(WILDCARD);
    }
  }

  up() {
    if (this.node.parent !== undefined) {
      this.node = this.node.parent;
    }
  }

  /**
   * @param {String} name
   * @return {Boolean}
   */
  hasNode(name) {
    if (name === this.expandedTree.root.name) {
      return true;
    }

    return this.node.getChild(name) !== undefined
      || this.node.getChild(WILDCARD) !== undefined;
  }

  /**
   * @return {Boolean}
   */
  hasListener() {
    return this.node.hasListeners();
  }

  /**
   * @param {String|Buffer} data
   */
  emit(data) {
    this.node.callListeners(data);
  }

  /**
   * @param {Array|String} path
   * @param {Function} listener
   */
  on(path, listener) {
    const pathArr = this._parsePath(path);
    this.tree.add(pathArr, listener);

    const nodePath = this.node.getPath();
    this.expandedTree = this.tree.getCloneExpanded();
    this.node = this.expandedTree.get(nodePath);
  }

  reset() {
    this.node = this.expandedTree.root;
  }

  /**
   * @param {Array|String} origPath
   * @returns {Array}
   */
  _parsePath(origPath) {
    if (Array.isArray(origPath)) {
      return origPath;
    }

    if (origPath.length === 0) {
      return [];
    }

    if (this.customPathSeparator) {
      return origPath.split(this.customPathSeparator);
    }

    const sep = '.';
    let path = origPath.replace(/[.[]/g, sep);
    path = path.replace(/\]/g, '');
    path = path.startsWith(sep) ? path.substring(sep.length) : path;
    return path.split(sep);
  }
}

module.exports = {
  EventTree,
  Tree,
  Node,
};
