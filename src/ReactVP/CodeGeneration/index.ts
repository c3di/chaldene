import CodeGeneratorRegistry from './CodeGeneratorRegistry';
import PythonCodeGenerator from './PythonCodeGenerator';

export type {
  default as NodeCodeGenerators,
  NodeCodeGeenerator
} from './NodeCodeGenerators';
export type { default as CodeGeneratorRegistry } from './CodeGeneratorRegistry';
export const codeGeneratorRegistry = new CodeGeneratorRegistry();

export function registerCodeGenerator(
  language: string,
  codeGenerator: any
): void {
  codeGeneratorRegistry.register(language, codeGenerator);
}

const pythonCodeGenerator = new PythonCodeGenerator();
registerCodeGenerator('Python', pythonCodeGenerator);
