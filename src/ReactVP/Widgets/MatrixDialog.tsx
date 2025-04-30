import { useState, useEffect, useCallback } from 'react';
import * as ReactDOM from 'react-dom/client';
import { type WidgetProps } from './Widget';
import { createPortal } from 'react-dom';
import { NumberInput } from './Input';

interface IMatrixDialogProps extends WidgetProps {
  onClose: () => void;
}

// Function to open the matrix dialog from anywhere in the application
export function openMatrixDialog(editorContext: any): void {
  // Verify that the editor has a graph
  if (!editorContext || !editorContext.graph) {
    // Show a warning message if no graph exists
    alert('No workflow exists. Please create a workflow first.');
    return;
  }

  // Create a container element
  const container = document.createElement('div');
  container.id = 'matrix-dialog-container';
  document.body.appendChild(container);

  // Create a root
  const root = ReactDOM.createRoot(container);

  // Create an identifier
  const identifier = {
    nodeID: 'matrix',
    id: `matrix_${Date.now()}`,
    type: 'matrix'
  };

  // Function to close the dialog and clean up
  const handleClose = () => {
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  };

  // Render the MatrixDialog directly into the container
  root.render(
    <MatrixDialog
      forWhom={identifier}
      editorContext={editorContext}
      onClose={handleClose}
      setValue={(id, val) => {
        if (editorContext?.graph) {
          editorContext.updateGraph(editorContext.graph);
        }
      }}
    />
  );
}

const MatrixDialogPortal = ({
  children,
  onClose
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) => {
  return createPortal(
    <div
      className="matrix-dialog-overlay"
      onClick={e => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export default function MatrixDialog({
  value,
  setValue,
  forWhom,
  onClose,
  editorContext
}: IMatrixDialogProps) {
  const [nodeParameters, setNodeParameters] = useState<
    Array<{
      nodeId: string;
      nodeLabel: string;
      parameters: Array<{
        id: string;
        name: string;
        value: number;
        type: string;
      }>;
    }>
  >([]);

  const [loading, setLoading] = useState(true);

  // Collect all node parameters except images
  useEffect(() => {
    if (!editorContext || !editorContext.graph) {
      setLoading(false);
      return;
    }

    // Get only the nodes from a working workflow
    let workflowNodes = editorContext.graph.nodes;

    // Check if the workflow is valid
    const isWorkflowValid = editorContext.checkExecutionReadiness();

    if (isWorkflowValid) {
      // If workflow is valid, get the executable graph
      const executableGraph = editorContext.getGraphToBeExecuted(false);
      if (executableGraph) {
        // Use only nodes from the executable graph
        workflowNodes = executableGraph.nodes;
      }
    } else {
      // If no valid workflow, still show parameters but indicate workflow is not ready
      setNodeParameters([
        {
          nodeId: 'info',
          nodeLabel: 'Note: Workflow is not ready for execution',
          parameters: []
        }
      ]);
      setLoading(false);
      return;
    }

    const nodesWithParams: Array<{
      nodeId: string;
      nodeLabel: string;
      parameters: Array<{
        id: string;
        name: string;
        value: number;
        type: string;
      }>;
    }> = [];

    workflowNodes.forEach(node => {
      // Skip "read image" nodes
      if (node.data.displayLabel?.toLowerCase().includes('read image')) {
        return;
      }

      const params: Array<{
        id: string;
        name: string;
        value: number;
        type: string;
      }> = [];

      // Process inputs
      if (node.data.inputs) {
        node.data.inputs.forEach((input: any) => {
          // Skip image inputs
          if (
            input.type &&
            typeof input.type === 'string' &&
            !input.type.toLowerCase().includes('image')
          ) {
            params.push({
              id: `${node.id}_input_${input.id}`,
              name: input.name || input.id,
              value: input.value || 0,
              type: input.type
            });
          }
        });
      }

      // Process properties if any
      if (node.data.properties) {
        Object.entries(node.data.properties).forEach(
          ([key, prop]: [string, any]) => {
            // Skip image properties
            if (
              prop.type &&
              typeof prop.type === 'string' &&
              !prop.type.toLowerCase().includes('image')
            ) {
              params.push({
                id: `${node.id}_property_${key}`,
                name: prop.name || key,
                value: prop.value || 0,
                type: prop.type
              });
            }
          }
        );
      }

      if (params.length > 0) {
        nodesWithParams.push({
          nodeId: node.id,
          nodeLabel: node.data.displayLabel || `Node ${node.id}`,
          parameters: params
        });
      }
    });

    setNodeParameters(nodesWithParams);
    setLoading(false);
  }, [editorContext]);

  const handleValueChange = useCallback(
    (nodeId: string, paramId: string, newValue: number) => {
      setNodeParameters(prevNodes =>
        prevNodes.map(node => {
          if (node.nodeId === nodeId) {
            return {
              ...node,
              parameters: node.parameters.map(param => {
                if (param.id === paramId) {
                  return { ...param, value: newValue };
                }
                return param;
              })
            };
          }
          return node;
        })
      );
    },
    []
  );

  const handleApply = useCallback(() => {
    // Create a matrix of all parameters
    const paramMatrix = nodeParameters.reduce(
      (matrix: Record<string, Record<string, number>>, node) => {
        matrix[node.nodeId] = {};
        node.parameters.forEach(param => {
          matrix[node.nodeId][param.id] = param.value;
        });
        return matrix;
      },
      {}
    );

    // Update the output value which will trigger backend processing
    setValue?.(forWhom, paramMatrix);
    onClose();
  }, [nodeParameters, forWhom, onClose, setValue]);

  return (
    <MatrixDialogPortal onClose={onClose}>
      <div className="matrix-dialog">
        <div className="matrix-dialog-content">
          <h2>Parameter Matrix</h2>

          {loading ? (
            <div className="loading">Loading parameters...</div>
          ) : (
            <>
              {nodeParameters.length === 0 ? (
                <div className="no-parameters">
                  No numeric parameters found in the workflow.
                </div>
              ) : (
                <div className="matrix-parameters">
                  {nodeParameters.map(node => (
                    <div key={node.nodeId} className="node-parameters">
                      <h3>{node.nodeLabel}</h3>
                      <div className="parameters-list">
                        {node.parameters.map(param => (
                          <div key={param.id} className="parameter-item">
                            <label>{param.name}</label>
                            <NumberInput
                              forWhom={{
                                nodeID: node.nodeId,
                                id: param.id,
                                type: 'target'
                              }}
                              value={param.value}
                              setValue={(_, val) => {
                                handleValueChange(node.nodeId, param.id, val);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="matrix-dialog-buttons">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="apply-button"
              onClick={handleApply}
              disabled={loading || nodeParameters.length === 0}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </MatrixDialogPortal>
  );
}
