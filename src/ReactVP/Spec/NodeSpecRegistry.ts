import { Registry } from '../Type';
import { type NodeTypes } from '../Components';
import { type INodeSpecConfig } from './NodeSpec';

export class NodeSpecConfigRegistry extends Registry<INodeSpecConfig> {
  private readonly visualNodetypes: NodeTypes = {};

  get allVisualNodeTypes(): NodeTypes {
    return this.visualNodetypes;
  }

  get allNodeSpecs(): any[] {
    return this.values().map(v => v.spec);
  }

  public register(
    name: string,
    { spec, spec2Node, visualNodeType }: INodeSpecConfig
  ): string {
    const typeID = this.registVisualNodeType(name, visualNodeType);
    const config = {
      spec,
      spec2Node,
      visualNodeType: typeID
    };
    return super.register(name, config);
  }

  private registVisualNodeType(name: string, node: any): string {
    for (const key in this.visualNodetypes) {
      if (this.visualNodetypes[key] === node) {
        return key;
      }
    }
    // todo: give unique name and type id, keep consistent with extension

    this.visualNodetypes[name] = node;
    return name;
  }
}
