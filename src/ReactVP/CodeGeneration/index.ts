import CodeGeneratorRegistry from './CodeGeneratorRegistry';
import PWDGenerator from './PWDGenerator';
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
const pwdGenerator = new PWDGenerator();

registerCodeGenerator('PWD', pwdGenerator);
registerCodeGenerator('Python', pythonCodeGenerator);
