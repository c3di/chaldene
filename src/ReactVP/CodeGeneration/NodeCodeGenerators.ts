export type Language = string;

export type NodeCodeGeenerator = (
  inputs: Record<string, any>,
  outputs: Record<string, any>
) => string;

type NodeCodeGenerators = Record<Language, NodeCodeGeenerator>;

export default NodeCodeGenerators;
