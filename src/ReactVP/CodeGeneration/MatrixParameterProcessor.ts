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

# Set up communication channels
try:
    matrix_comm = create_comm(target_name='inspection')
except Exception as e:
    print(f"[MATRIX] ERROR creating comm channels: {str(e)}\\n{traceback.format_exc()}", flush=True)


def capture_image_as_base64(image_var):
    try:
        buf = PythonIO.BytesIO()
        
        # Handle different image types
        if hasattr(image_var, 'raw_image'):
            # Convert im2im.Image to PIL Image
            from PIL import Image as PILImage
            import numpy as np
            
            img_array = image_var.raw_image
            if img_array.dtype.kind == 'f':
                img_array = (img_array * 255).astype(np.uint8)
            
            PILImage.fromarray(img_array).save(buf, format="PNG")
        else:
            # Direct save for PIL images
            image_var.save(buf, format="PNG")
            
        buf.seek(0)
        image_base64 = base64.b64encode(buf.read()).decode("utf-8")
        buf.close()
        
        return f"data:image/png;base64,{image_base64}"
    except Exception as e:
        print(f"[MATRIX] Error capturing image: {str(e)}", flush=True)
        return None

def ${matrixProcessorFunctionName}(parameter_matrix, workflow_stages):
    """Process a matrix of parameters through workflow stages"""
    try:    
        # Extract parameter combinations
        param_keys = []
        param_values = []
        
        # Organize parameters by node ID
        for node_id, params in parameter_matrix.items():
            for param_id, param_value in params.items():
                param_keys.append((node_id, param_id))
                param_values.append([param_value] if not isinstance(param_value, list) else param_value)
        
        # Generate parameter combinations
        combinations = list(itertools.product(*param_values))
        
        # Process each combination
        results = []
        
        for i, combination in enumerate(combinations):
            try:
                # Create parameter dictionary for this combination
                params = {}
                param_info = {}
                for (node_id, param_id), value in zip(param_keys, combination):
                    if node_id not in params:
                        params[node_id] = {}
                        param_info[node_id] = {}
                    
                    params[node_id][param_id] = value
                    param_info[node_id][param_id] = value
                
                # Execute each stage of the workflow
                current_vars = {}
                
                for input_var, operation_func, output_var, node_id in workflow_stages:
                    # Get input value from previous stage or original variable
                    stage_input = current_vars.get(input_var, globals().get(input_var))
                    
                    # If this node has parameters for this combination
                    node_params = {}
                    if node_id in params:
                        node_params = params[node_id]
                        stage_result = operation_func(stage_input, node_params)
                    else:
                        stage_result = operation_func(stage_input, {})
                    
                    # Store result for next stage
                    current_vars[output_var] = stage_result
                
                # Get the final result
                if workflow_stages:
                    final_output = current_vars.get(workflow_stages[-1][2])
                    
                    if final_output is not None:
                        # Convert to base64 and add to results
                        base64_image = capture_image_as_base64(final_output)
                        
                        if base64_image:
                            results.append({
                                'imageUrl': base64_image,
                                'params': param_info,
                                'index': i
                            })
                        else:
                            results.append({
                                'error': "Failed to capture image",
                                'params': param_info,
                                'index': i
                            })
                    else:
                        results.append({
                            'error': "No output produced",
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
        try:
            matrix_comm.send({
                'handle_id': 'matrix_results',
                'type': 'matrix_results',
                'results': results,
                'total_combinations': len(combinations)
            })
        except Exception as e:
            print(f"[MATRIX] Error sending results: {str(e)}", flush=True)
        
        return results
        
    except Exception as e:
        print(f"[MATRIX] Error in matrix processing: {str(e)}", flush=True)
        
        # Also send error via matrix_comm
        try:
            matrix_comm.send({
                'handle_id': 'matrix_error',
                'type': 'error',
                'error': str(e),
                'traceback': traceback.format_exc()
            })
        except Exception as e2:
            print(f"[MATRIX] Could not send error via comm: {str(e2)}", flush=True)
            
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
  workflowStagesVar: string
): string {
  // Helper function to convert JavaScript values to Python string representation
  const valueToPythonStr = (value: any): string => {
    if (Array.isArray(value)) {
      return `[${value.map(item => valueToPythonStr(item)).join(', ')}]`;
    } else if (typeof value === 'string') {
      return `'${value.replace(/'/g, "\\'")}'`;
    } else if (value === null || value === undefined) {
      return 'None';
    } else if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    } else {
      return String(value);
    }
  };

  // Generate Python dictionary string
  let pythonMatrix = '{\n';

  Object.entries(parameterMatrix).forEach(([nodeId, params], nodeIdx) => {
    pythonMatrix += `  '${nodeId}': {\n`;

    Object.entries(params).forEach(([paramId, value], paramIdx) => {
      const simpleParamId = paramId.split('_').pop() || paramId;
      pythonMatrix += `    '${simpleParamId}': ${valueToPythonStr(value)}`;
      if (paramIdx < Object.keys(params).length - 1) {
        pythonMatrix += ',';
      }
      pythonMatrix += '\n';
    });

    pythonMatrix += '  }';
    if (nodeIdx < Object.keys(parameterMatrix).length - 1) {
      pythonMatrix += ',';
    }
    pythonMatrix += '\n';
  });

  pythonMatrix += '}';

  return `
parameter_matrix = ${pythonMatrix}
result = ${matrixProcessorFunctionName}(parameter_matrix, ${workflowStagesVar})
`;
}
