class FabricImage {
  static fromURL() {
    return Promise.resolve(new FabricImage());
  }
}

class Canvas {
  constructor() {}
  dispose() {}
  add() {}
  remove() {}
  renderAll() {}
  setDimensions() {}
  on() {}
  off() {}
}

module.exports = { FabricImage, Canvas };
