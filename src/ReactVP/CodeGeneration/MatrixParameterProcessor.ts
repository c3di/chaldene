const matrixProcessorFunctionName: string = 'process_matrix_parameters';

export const MatrixParameterDependencies = `
import io as PythonIO
import base64
import numpy as np
import json
import traceback
import sys
import itertools
from PIL import Image
from comm import create_comm
from im2im import im2im, Image as IM

matrix_comm = create_comm(target_name='inspection')

def capture_image_as_base64(image_var):
    buf = PythonIO.BytesIO()
    image_var.save(buf, format="PNG")
    buf.seek(0)
    
    image_base64 = base64.b64encode(buf.read()).decode("utf-8")
    buf.close()
    
    return f"data:image/png;base64,{image_base64}"

def ${matrixProcessorFunctionName}(parameter_matrix, workflow_stages):
    """
    Process a matrix of parameters through workflow stages
    
    Args:
        parameter_matrix: Dictionary of node parameters
        workflow_stages: List of (input_var, operation_func, output_var, node_id) tuples representing the workflow
    """
    try:    
        # Extract parameter combinations
        param_keys = []
        param_values = []
        
        # Organize parameters by node ID
        for node_id, params in parameter_matrix.items():
            for param_id, param_value in params.items():
                if isinstance(param_value, list):
                    # Handle multi-value parameters
                    param_keys.append((node_id, param_id))
                    param_values.append(param_value)
                else:
                    # Single values become single-item lists for consistent processing
                    param_keys.append((node_id, param_id))
                    param_values.append([param_value])
        
        # Generate all parameter combinations
        combinations = list(itertools.product(*param_values))
        total_combinations = len(combinations)
        
        # Process each combination
        results = []
        
        for i, combination in enumerate(combinations):
            try:
                # Create parameter dictionary for this combination
                params = {}
                param_info = {}
                for (node_id, param_id), value in zip(param_keys, combination):
                    input_name = param_id.split('_')[-1]  # Extract input name from param_id
                    
                    if node_id not in params:
                        params[node_id] = {}
                        param_info[node_id] = {}
                    
                    params[node_id][input_name] = value
                    param_info[node_id][param_id] = value
                
                # Execute each stage of the workflow
                current_vars = {}
                
                for stage_idx, (input_var, operation_func, output_var, node_id) in enumerate(workflow_stages):
                    # Get input value from previous stage result or from original variable
                    stage_input = current_vars.get(input_var, globals().get(input_var))
                    
                    # If this node has parameters for this combination
                    if node_id in params:
                        # Run operation with these parameters
                        stage_result = operation_func(stage_input, params[node_id])
                    else:
                        # Run operation with default parameters
                        stage_result = operation_func(stage_input, {})
                    
                    # Store result for next stage
                    current_vars[output_var] = stage_result
                
                # Get the final result - last stage's output
                if workflow_stages:
                    final_output = current_vars.get(workflow_stages[-1][2])
                    
                    if final_output is not None:
                        # Convert to base64 and add to results
                        base64_image = capture_image_as_base64(final_output)
                        
                        # Add to results
                        results.append({
                            'imageUrl': base64_image,
                            'params': param_info,
                            'index': i
                        })
            
            except Exception as e:
                print(f"[MATRIX] Error processing combination {i+1}: {str(e)}", flush=True)
                traceback.print_exc()
                
                # Add error to results
                results.append({
                    'error': str(e),
                    'params': param_info if 'param_info' in locals() else {},
                    'index': i
                })
        
        # Send all results at once
        matrix_comm.send({
            'handle_id': 'matrix_results',
            'type': 'matrix_results',
            'results': results,
            'total_combinations': total_combinations
        })
        
        return results
        
    except Exception as e:
        traceback.print_exc()
        
        return []
`;

/**
 * Generate code to process a matrix of parameters
 * @param parameterMatrix The matrix of parameters to process
 * @param workflowStages Array of workflow stage objects
 * @returns Python code string
 */
export function generateMatrixParameterCode(
  parameterMatrix: Record<string, Record<string, any>>,
  workflowStages: string
): string {
  // Helper function to convert JavaScript values to Python string representation
  const valueToPythonStr = (value: any): string => {
    if (Array.isArray(value)) {
      // Convert array to Python list
      return `[${value.map(item => valueToPythonStr(item)).join(', ')}]`;
    } else if (typeof value === 'string') {
      // Strings need to be quoted with single quotes
      return `'${value.replace(/'/g, "\\'")}'`;
    } else if (value === null || value === undefined) {
      // Null or undefined becomes None
      return 'None';
    } else if (typeof value === 'boolean') {
      // Boolean to Python boolean (uppercase first letter)
      return value ? 'True' : 'False';
    } else {
      // Numbers and other types
      return String(value);
    }
  };

  // Generate Python dictionary string manually to ensure correct format
  let pythonMatrix = '{\n';

  Object.entries(parameterMatrix).forEach(([nodeId, params], nodeIdx) => {
    pythonMatrix += `  '${nodeId}': {\n`;

    Object.entries(params).forEach(([paramId, value], paramIdx) => {
      pythonMatrix += `    '${paramId}': ${valueToPythonStr(value)}`;

      // Add comma if not the last parameter
      if (paramIdx < Object.keys(params).length - 1) {
        pythonMatrix += ',';
      }

      pythonMatrix += '\n';
    });

    pythonMatrix += '  }';

    // Add comma if not the last node
    if (nodeIdx < Object.keys(parameterMatrix).length - 1) {
      pythonMatrix += ',';
    }

    pythonMatrix += '\n';
  });

  pythonMatrix += '}';

  return `
parameter_matrix = ${pythonMatrix}

# Execute the matrix parameter processor with the workflow stages
${matrixProcessorFunctionName}(parameter_matrix, ${workflowStages})
`;
}
