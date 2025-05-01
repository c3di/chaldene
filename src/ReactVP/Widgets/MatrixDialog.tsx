import { useState, useEffect, useCallback } from 'react';
import * as ReactDOM from 'react-dom/client';
import { type WidgetProps } from './Widget';
import { createPortal } from 'react-dom';
import { NumberInput } from './Input';
import { CloseIcon } from '../Style';
import RangeSlider from 'react-range-slider-input';
import 'react-range-slider-input/dist/style.css';

interface IMatrixDialogProps extends WidgetProps {
  onClose: () => void;
}

// Parameter types and configurations
interface IParamConfig {
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

// Enhanced parameter data structure
interface IParameter {
  id: string;
  name: string;
  value: number | string | string[];
  type: string;
  readOnly?: boolean;
  config: IParamConfig;
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

// Component for numeric inputs with range slider
function NumericParameterInput({
  param,
  onChange
}: {
  param: IParameter;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState<number>(param.value as number);
  const [isEditing, setIsEditing] = useState(false);

  // Check if min and max are both defined
  const hasDefinedRange =
    param.config.min !== undefined && param.config.max !== undefined;

  // Default range values if specified
  const min = param.config.min;
  const max = param.config.max;
  const step = param.config.step !== undefined ? param.config.step : 1;

  // Validate and constrain value when min/max change
  useEffect(() => {
    let newValue = value;

    // Apply constraints if they exist
    if (min !== undefined && newValue < min) {
      newValue = min;
    }
    if (max !== undefined && newValue > max) {
      newValue = max;
    }

    // Update if constraints changed the value
    if (newValue !== value) {
      setValue(newValue);
      onChange(newValue);
    }
  }, [min, max, value, onChange]);

  const handleRangeChange = (newValue: number[]) => {
    if (newValue.length > 0) {
      setValue(newValue[0]);
      onChange(newValue[0]);
    }
  };

  const handleInputChange = (_: any, newValue: number) => {
    let constrainedValue = newValue;

    // Apply constraints if they exist
    if (min !== undefined && constrainedValue < min) {
      constrainedValue = min;
    }
    if (max !== undefined && constrainedValue > max) {
      constrainedValue = max;
    }

    setValue(constrainedValue);
    onChange(constrainedValue);
  };

  // Toggle between slider and input configuration when range is defined
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  // These are the range configuration controls shared between modes
  const rangeConfigControls = (
    <>
      <div className="range-config-row">
        <label>Min:</label>
        <NumberInput
          forWhom={{
            id: `${param.id}_min`,
            type: 'config',
            nodeID: 'matrix'
          }}
          value={min !== undefined ? min : 0}
          setValue={(_, val) => {
            // Ensure min ≤ max if max is defined
            if (max !== undefined && val > max) {
              param.config.min = max;
            } else {
              param.config.min = val;
            }

            // Force re-render with updated range
            if (val > value) {
              setValue(val);
              onChange(val);
            }
          }}
        />
      </div>
      <div className="range-config-row">
        <label>Max:</label>
        <NumberInput
          forWhom={{
            id: `${param.id}_max`,
            type: 'config',
            nodeID: 'matrix'
          }}
          value={max !== undefined ? max : 100}
          setValue={(_, val) => {
            // Ensure max ≥ min if min is defined
            if (min !== undefined && val < min) {
              param.config.max = min;
            } else {
              param.config.max = val;
            }

            // Force re-render with updated range
            if (val < value) {
              setValue(val);
              onChange(val);
            }
          }}
        />
      </div>
      <div className="range-config-row">
        <label>Step:</label>
        <NumberInput
          forWhom={{
            id: `${param.id}_step`,
            type: 'config',
            nodeID: 'matrix'
          }}
          value={step}
          setValue={(_, val) => {
            param.config.step = val > 0 ? val : 0.01;
          }}
        />
      </div>
    </>
  );

  return (
    <div className="parameter-input-container">
      {hasDefinedRange ? (
        // When min and max are defined, show slider with toggle for range config
        isEditing ? (
          <div className="range-config">
            {rangeConfigControls}
            <button className="config-done-button" onClick={toggleEditMode}>
              Done
            </button>
          </div>
        ) : (
          <div className="parameter-value-controls">
            {hasDefinedRange && min !== undefined && max !== undefined && (
              <div className="slider-container">
                <RangeSlider
                  className="matrix-range-slider"
                  value={[value]}
                  min={min}
                  max={max}
                  step={step}
                  onInput={handleRangeChange}
                />
              </div>
            )}
            <div className="input-with-config">
              <NumberInput
                forWhom={{ id: param.id, type: 'value', nodeID: 'matrix' }}
                value={value}
                setValue={handleInputChange}
                min={min}
                max={max}
                step={step}
              />
              <button
                className="config-button"
                onClick={toggleEditMode}
                title="Configure range"
              >
                ⚙️
              </button>
            </div>
          </div>
        )
      ) : (
        // When either min or max is not defined, directly show range config
        <div className="range-config no-toggle">{rangeConfigControls}</div>
      )}
    </div>
  );
}

// Component for enum/option inputs
function EnumParameterInput({
  param,
  onChange
}: {
  param: IParameter;
  onChange: (value: string[]) => void;
}) {
  const options = param.config.options || [];
  // Initialize selected values as an array
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    // Convert existing value to array if it's a string, or use empty array
    if (typeof param.value === 'string') {
      return param.value ? [param.value] : [];
    }
    // If it's already an array, use it
    return Array.isArray(param.value) ? param.value : [];
  });

  useEffect(() => {
    // When options change, ensure at least one option is selected if none already
    if (options.length > 0 && selectedValues.length === 0) {
      setSelectedValues([options[0]]);
      onChange([options[0]]);
    }
  }, [options, selectedValues, onChange]);

  const handleOptionClick = (option: string) => {
    let newSelectedValues: string[];

    if (selectedValues.includes(option)) {
      // If already selected, remove it (unless it's the last one)
      if (selectedValues.length > 1) {
        newSelectedValues = selectedValues.filter(val => val !== option);
      } else {
        // Don't allow deselecting the last option
        return;
      }
    } else {
      // If not selected, add it
      newSelectedValues = [...selectedValues, option];
    }

    setSelectedValues(newSelectedValues);
    onChange(newSelectedValues);
  };

  return (
    <div className="enum-input-container">
      {options.length > 0 ? (
        <div className="options-list">
          {options.map(option => (
            <button
              key={option}
              className={`option-button ${selectedValues.includes(option) ? 'selected' : ''}`}
              onClick={() => handleOptionClick(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="no-options">No options available</div>
      )}
    </div>
  );
}

// Component for read-only value display
function ReadOnlyInput({ param }: { param: IParameter }) {
  return (
    <div className="readonly-input-container">
      <div className="readonly-value">
        {typeof param.value === 'object'
          ? JSON.stringify(param.value)
          : String(param.value)}
      </div>
    </div>
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
}: IMatrixDialogProps): JSX.Element {
  const [nodeParameters, setNodeParameters] = useState<
    Array<{
      nodeId: string;
      nodeLabel: string;
      parameters: Array<IParameter>;
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
      parameters: Array<IParameter>;
    }> = [];

    workflowNodes.forEach(node => {
      const params: Array<IParameter> = [];

      // Process inputs
      if (node.data.inputs) {
        node.data.inputs.forEach((input: any) => {
          // Skip image inputs
          if (
            input.type &&
            typeof input.type === 'string' &&
            !input.type.toLowerCase().includes('image')
          ) {
            if (input.type === 'number') {
              // Add numeric parameter
              params.push({
                id: `${node.id}_input_${input.id}`,
                name: input.name || input.id,
                value:
                  input.defaultValue !== undefined ? input.defaultValue : 0,
                type: 'number',
                config: {
                  min:
                    input.widget?.min !== undefined
                      ? input.widget.min
                      : undefined,
                  max:
                    input.widget?.max !== undefined
                      ? input.widget.max
                      : undefined,
                  step:
                    input.widget?.step !== undefined ? input.widget.step : 1,
                  options: undefined
                }
              });
            } else if (input.type === 'enum') {
              // Add enum parameter
              params.push({
                id: `${node.id}_input_${input.id}`,
                name: input.name || input.id,
                value:
                  input.defaultValue !== undefined ? input.defaultValue : '',
                type: 'enum',
                config: {
                  options: input.widget?.options || []
                }
              });
            } else {
              // Add other types as read-only parameters
              params.push({
                id: `${node.id}_input_${input.id}`,
                name: input.name || input.id,
                value:
                  input.defaultValue !== undefined ? input.defaultValue : '',
                type: input.type,
                readOnly: true,
                config: {}
              });
            }
          }
        });
      }

      if (params.length > 0) {
        nodesWithParams.push({
          nodeId: node.id,
          nodeLabel: node.data.displayLabel || `Node ${node.id}`,
          parameters: params
        });
        console.log(
          `Added node ${node.data.displayLabel} with ${params.length} parameters`
        );
      } else {
        console.log(`No parameters found for node ${node.data.displayLabel}`);
      }
    });

    console.log(`Total nodes with parameters: ${nodesWithParams.length}`);
    setNodeParameters(nodesWithParams);
    setLoading(false);
  }, [editorContext]);

  const handleValueChange = useCallback(
    (nodeId: string, paramId: string, newValue: number | string | string[]) => {
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
      (
        matrix: Record<string, Record<string, number | string | string[]>>,
        node
      ) => {
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
          <div className="matrix-dialog-header">
            <h2>Parameter Matrix</h2>
            <button
              className="close-icon-button"
              onClick={onClose}
              title="Close"
              aria-label="Close dialog"
            >
              <CloseIcon />
            </button>
          </div>

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
                          <div
                            key={param.id}
                            className={`parameter-item ${param.readOnly ? 'parameter-readonly' : ''}`}
                          >
                            <label>{param.name}</label>
                            {param.type === 'number' ? (
                              <NumericParameterInput
                                param={param}
                                onChange={val =>
                                  handleValueChange(node.nodeId, param.id, val)
                                }
                              />
                            ) : param.type === 'enum' ? (
                              <EnumParameterInput
                                param={param}
                                onChange={val =>
                                  handleValueChange(node.nodeId, param.id, val)
                                }
                              />
                            ) : param.readOnly ? (
                              <ReadOnlyInput param={param} />
                            ) : (
                              <NumberInput
                                forWhom={{
                                  nodeID: node.nodeId,
                                  id: param.id,
                                  type: 'target'
                                }}
                                value={param.value as number}
                                setValue={(_, val) => {
                                  handleValueChange(node.nodeId, param.id, val);
                                }}
                              />
                            )}
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
            <button
              className="run-button"
              onClick={() => {
                handleApply();
                if (editorContext && editorContext.code) {
                  const code = editorContext.code(false, false);
                  if (code) {
                    // Execute the code if available
                    editorContext.onLiveExecution?.();
                  }
                }
                onClose();
              }}
              disabled={loading || nodeParameters.length === 0}
            >
              Run
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
